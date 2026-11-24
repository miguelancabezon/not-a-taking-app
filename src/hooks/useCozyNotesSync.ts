import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { createSeedNotes, DEFAULT_PREFERENCES } from '../data/presets';
import { Note, StudioPreferences, SyncState } from '../types/notes';
import {
  mergeSyncedNotes,
  sanitizeNotePayload,
  sanitizePreferencesPayload,
} from '../utils/notesLogic';
import {
  decryptLocalJson,
  decryptNoteFromCloud,
  encryptLocalJson,
  encryptNoteForCloud,
  isEncryptedCloudContent,
} from '../utils/cryptoVault';
import {
  safeJsonParse,
  sanitizeNoteRecord,
  sanitizePlainText,
  sanitizeStudioPreferences,
  validateBroadcastMessage,
} from '../utils/security';

const STORAGE_NOTES_ENC_KEY = 'notas-del-dia:notes:enc:v1';
const STORAGE_DELETED_ENC_KEY = 'notas-del-dia:deleted:enc:v1';
const LEGACY_NOTES_KEY = 'notas-del-dia:notes:v1';
const LEGACY_DELETED_KEY = 'notas-del-dia:deleted:v1';
const STORAGE_PREFS_KEY = 'notas-del-dia:prefs:v1';
const BROADCAST_CHANNEL_NAME = 'notas-del-dia-autosync-v1';

function readInitialNotesSync(): Note[] {
  try {
    // If encrypted vault exists, start empty/safe until async WebCrypto hydration completes
    const hasEncrypted = Boolean(localStorage.getItem(STORAGE_NOTES_ENC_KEY));
    if (hasEncrypted) return [];

    const legacyRaw = localStorage.getItem(LEGACY_NOTES_KEY);
    if (!legacyRaw) {
      return createSeedNotes();
    }
    const parsed = safeJsonParse<unknown[]>(legacyRaw);
    if (!Array.isArray(parsed)) return createSeedNotes();
    const cleaned = parsed.map(sanitizeNoteRecord).filter((n): n is Note => Boolean(n));
    return cleaned.length > 0 ? cleaned : createSeedNotes();
  } catch {
    return createSeedNotes();
  }
}

function readInitialDeletedSync(): string[] {
  try {
    if (localStorage.getItem(STORAGE_DELETED_ENC_KEY)) return [];
    const raw = localStorage.getItem(LEGACY_DELETED_KEY);
    const parsed = raw ? safeJsonParse<unknown[]>(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => sanitizePlainText(id, 128))
      .filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));
  } catch {
    return [];
  }
}

function readLocalPrefs(): StudioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = safeJsonParse<unknown>(raw);
    return sanitizeStudioPreferences(parsed);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function timestampToMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (
    val &&
    typeof val === 'object' &&
    'toMillis' in val &&
    typeof (val as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function formatGoogleAuthError(err: unknown): string | null {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return null;
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return 'Este dominio aún no está autorizado en Firebase Authentication (Authorized domains).';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
    return 'Sin conexión segura para conectar con Google. Revisa tu red.';
  }
  return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
}

export function useCozyNotesSync() {
  const [notes, setNotes] = useState<Note[]>(() => readInitialNotesSync());
  const [deletedIds, setDeletedIds] = useState<string[]>(() => readInitialDeletedSync());
  const [preferences, setPreferences] = useState<StudioPreferences>(() => readLocalPrefs());
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [vaultHydrated, setVaultHydrated] = useState(false);
  const [localEncryptedActive, setLocalEncryptedActive] = useState(false);

  // Personal E2EE passphrase lives strictly in RAM (never persisted to localStorage or Firestore)
  const [e2eePassphrase, setE2eePassphrase] = useState<string | null>(null);
  const [e2eeError, setE2eeError] = useState<string | null>(null);
  const e2eePassphraseRef = useRef<string | null>(null);
  e2eePassphraseRef.current = e2eePassphrase;

  const [syncState, setSyncState] = useState<SyncState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local-only'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);

  const cloudNoteIdsRef = useRef<Set<string>>(new Set());
  const hasCloudPrefsRef = useRef<boolean>(false);
  const pendingTimersRef = useRef<Map<string, number>>(new Map());
  const prefsTimerRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const notesRef = useRef<Note[]>(notes);
  notesRef.current = notes;
  const deletedIdsRef = useRef<string[]>(deletedIds);
  deletedIdsRef.current = deletedIds;

  // Hydrate AES-256-GCM encrypted local vault on startup & migrate legacy plaintext
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const encNotesRaw = localStorage.getItem(STORAGE_NOTES_ENC_KEY);
        const encDeletedRaw = localStorage.getItem(STORAGE_DELETED_ENC_KEY);

        if (encNotesRaw) {
          const decrypted = await decryptLocalJson(encNotesRaw);
          if (active && Array.isArray(decrypted)) {
            const safeNotes = decrypted
              .map(sanitizeNoteRecord)
              .filter((n): n is Note => Boolean(n));
            setNotes(safeNotes);
            setLocalEncryptedActive(true);
          } else if (active) {
            setNotes(createSeedNotes());
          }
        } else {
          // Migrate legacy plaintext storage into AES-256-GCM encrypted vault
          const initial = readInitialNotesSync();
          const enc = await encryptLocalJson(initial);
          if (enc) {
            localStorage.setItem(STORAGE_NOTES_ENC_KEY, enc);
            localStorage.removeItem(LEGACY_NOTES_KEY);
            if (active) setLocalEncryptedActive(true);
          }
        }

        if (encDeletedRaw) {
          const decryptedDel = await decryptLocalJson(encDeletedRaw);
          if (active && Array.isArray(decryptedDel)) {
            const safeDel = decryptedDel
              .map((id) => sanitizePlainText(id, 128))
              .filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));
            setDeletedIds(safeDel);
          }
        } else if (localStorage.getItem(LEGACY_DELETED_KEY)) {
          const initialDel = readInitialDeletedSync();
          const encDel = await encryptLocalJson(initialDel);
          if (encDel) {
            localStorage.setItem(STORAGE_DELETED_ENC_KEY, encDel);
            localStorage.removeItem(LEGACY_DELETED_KEY);
          }
        }
      } catch {
        // Safe fallback keeps initial notes state
      } finally {
        if (active) setVaultHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist notes & deletedIds encrypted at rest with AES-256-GCM
  useEffect(() => {
    if (!vaultHydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const encNotes = await encryptLocalJson(notes);
        const encDel = await encryptLocalJson(deletedIds);
        if (cancelled) return;
        if (encNotes && encDel) {
          localStorage.setItem(STORAGE_NOTES_ENC_KEY, encNotes);
          localStorage.setItem(STORAGE_DELETED_ENC_KEY, encDel);
          localStorage.removeItem(LEGACY_NOTES_KEY);
          localStorage.removeItem(LEGACY_DELETED_KEY);
          setLocalEncryptedActive(true);
        } else {
          localStorage.setItem(LEGACY_NOTES_KEY, JSON.stringify(notes));
          localStorage.setItem(LEGACY_DELETED_KEY, JSON.stringify(deletedIds));
        }
        setLastSyncedAt(Date.now());
      } catch {
        // Ignore storage quota issues in restricted browsers
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notes, deletedIds, vaultHydrated]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(preferences));
      setLastSyncedAt(Date.now());
    } catch {
      // Ignore
    }
  }, [preferences]);

  // Real-time cross-tab sync with strict schema/anti-injection validation
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const validated = validateBroadcastMessage(event.data);
      if (!validated) return;
      if (validated.type === 'NOTES_UPDATED') {
        setDeletedIds((prev) => Array.from(new Set([...prev, ...validated.deletedIds])));
        setNotes((prev) => mergeSyncedNotes(prev, validated.notes, validated.deletedIds));
        setLastSyncedAt(Date.now());
      } else if (validated.type === 'PREFS_UPDATED') {
        setPreferences((prev) => ({
          ...prev,
          ...validated.preferences,
          unlockedThemes: Array.from(
            new Set([
              ...(prev.unlockedThemes ?? []),
              ...(validated.preferences.unlockedThemes ?? []),
            ])
          ),
        }));
        setLastSyncedAt(Date.now());
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Online / offline listeners
  useEffect(() => {
    const onOnline = () => {
      setSyncState((prev) => (prev === 'offline' ? (user ? 'synced' : 'local-only') : prev));
    };
    const onOffline = () => {
      setSyncState('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [user]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        cloudNoteIdsRef.current.clear();
        hasCloudPrefsRef.current = false;
        setSyncState(navigator.onLine ? 'local-only' : 'offline');
      }
    });
    return () => unsub();
  }, []);

  // Write a single note to Firestore (encrypting with E2EE AES-256-GCM when active)
  const pushNoteToCloud = useCallback(async (note: Note, uid: string) => {
    // Never overwrite an encrypted cloud note while the vault is still locked
    if (isEncryptedCloudContent(note.content) && !e2eePassphraseRef.current) {
      return;
    }

    const path = `notes/${note.id}`;
    const ref = doc(db, 'notes', note.id);
    let noteToSend = note;

    if (e2eePassphraseRef.current) {
      const sealed = await encryptNoteForCloud(note, uid, e2eePassphraseRef.current);
      noteToSend = {
        ...note,
        title: sealed.title,
        content: sealed.content,
        tags: sealed.tags,
        stickers: sealed.stickers,
      };
    }

    const payload = sanitizeNotePayload(noteToSend, uid);
    setSyncState('syncing');
    try {
      if (cloudNoteIdsRef.current.has(note.id)) {
        await updateDoc(ref, {
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          stickers: payload.stickers,
          paperColor: payload.paperColor,
          fontFamily: payload.fontFamily,
          pinned: payload.pinned,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        cloudNoteIdsRef.current.add(note.id);
      }
      setSyncState('synced');
      setLastSyncedAt(Date.now());
      setSyncError(null);
    } catch (err) {
      if (!navigator.onLine) {
        setSyncState('offline');
        return;
      }
      setSyncState('error');
      setSyncError('No se pudo sincronizar la nota con la nube.');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }, []);

  const pushPrefsToCloud = useCallback(async (prefs: StudioPreferences, uid: string) => {
    const path = `studioPreferences/${uid}`;
    const ref = doc(db, 'studioPreferences', uid);
    const payload = sanitizePreferencesPayload(prefs, uid);
    setSyncState('syncing');
    try {
      if (hasCloudPrefsRef.current) {
        await updateDoc(ref, {
          themeId: payload.themeId,
          textureId: payload.textureId,
          fontId: payload.fontId,
          fontSize: payload.fontSize,
          unlockedThemes: payload.unlockedThemes,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        hasCloudPrefsRef.current = true;
      }
      setSyncState('synced');
      setLastSyncedAt(Date.now());
      setSyncError(null);
    } catch (err) {
      if (!navigator.onLine) {
        setSyncState('offline');
        return;
      }
      setSyncState('error');
      setSyncError('No se pudieron sincronizar tus preferencias.');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }, []);

  // Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    setSyncState('syncing');
    const notesQuery = query(collection(db, 'notes'), where('ownerId', '==', user.uid));

    const unsubNotes = onSnapshot(
      notesQuery,
      async (snapshot) => {
        const remoteNotes: Note[] = [];
        const cloudIds = new Set<string>();
        const activePass = e2eePassphraseRef.current;

        for (const docSnap of snapshot.docs) {
          cloudIds.add(docSnap.id);
          const data = docSnap.data();
          let candidate = sanitizeNoteRecord({
            id: docSnap.id,
            title: data.title,
            content: data.content,
            tags: data.tags,
            stickers: data.stickers,
            paperColor: data.paperColor,
            fontFamily: data.fontFamily,
            pinned: data.pinned,
            createdAt: timestampToMs(data.createdAt),
            updatedAt: timestampToMs(data.updatedAt),
          });
          if (!candidate) continue;

          if (isEncryptedCloudContent(candidate.content) && activePass) {
            try {
              const plain = await decryptNoteFromCloud(
                candidate.content,
                candidate.id,
                user.uid,
                activePass
              );
              const decryptedRecord = sanitizeNoteRecord({
                ...candidate,
                title: plain.title,
                content: plain.content,
                tags: plain.tags,
                stickers: plain.stickers,
              });
              if (decryptedRecord) {
                candidate = decryptedRecord;
              }
            } catch {
              // Keep locked ciphertext safely in place if key doesn't match
            }
          }

          remoteNotes.push(candidate);
        }

        cloudNoteIdsRef.current = cloudIds;

        // Upload any local notes that aren't in the cloud yet (unless deleted)
        const localOnlyToPush = notesRef.current.filter(
          (n) => !cloudIds.has(n.id) && !deletedIdsRef.current.includes(n.id)
        );
        for (const localNote of localOnlyToPush) {
          void pushNoteToCloud(localNote, user.uid);
        }

        if (remoteNotes.length > 0) {
          setNotes((prev) => mergeSyncedNotes(prev, remoteNotes, deletedIdsRef.current));
        }

        setSyncState('synced');
        setLastSyncedAt(Date.now());
        setSyncError(null);
      },
      (err) => {
        setSyncState('error');
        setSyncError('Error de conexión con Firestore.');
        handleFirestoreError(err, OperationType.LIST, 'notes');
      }
    );

    const prefsRef = doc(db, 'studioPreferences', user.uid);
    const unsubPrefs = onSnapshot(
      prefsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          hasCloudPrefsRef.current = true;
          const sanitized = sanitizeStudioPreferences(docSnap.data());
          setPreferences((prev) => ({
            ...prev,
            ...sanitized,
            unlockedThemes: Array.from(
              new Set([
                ...(prev.unlockedThemes ?? []),
                ...(sanitized.unlockedThemes ?? []),
              ])
            ),
          }));
        } else {
          hasCloudPrefsRef.current = false;
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `studioPreferences/${user.uid}`);
      }
    );

    return () => {
      unsubNotes();
      unsubPrefs();
    };
  }, [authReady, user, pushNoteToCloud]);

  const broadcastNotes = useCallback((nextNotes: Note[], nextDeleted: string[]) => {
    channelRef.current?.postMessage({
      type: 'NOTES_UPDATED',
      notes: nextNotes,
      deletedIds: nextDeleted,
    });
  }, []);

  const scheduleCloudNoteSync = useCallback(
    (note: Note) => {
      if (!user) return;
      const existingTimer = pendingTimersRef.current.get(note.id);
      if (existingTimer) window.clearTimeout(existingTimer);
      setSyncState('syncing');
      const timer = window.setTimeout(() => {
        pendingTimersRef.current.delete(note.id);
        void pushNoteToCloud(note, user.uid);
      }, 650);
      pendingTimersRef.current.set(note.id, timer);
    },
    [user, pushNoteToCloud]
  );

  const upsertNote = useCallback(
    (note: Note) => {
      if (isEncryptedCloudContent(note.content)) return;
      const updated = { ...note, updatedAt: Date.now() };
      setNotes((prev) => {
        const exists = prev.some((n) => n.id === updated.id);
        const next = exists
          ? prev.map((n) => (n.id === updated.id ? updated : n))
          : [updated, ...prev];
        broadcastNotes(next, deletedIdsRef.current);
        return next;
      });
      scheduleCloudNoteSync(updated);
    },
    [broadcastNotes, scheduleCloudNoteSync]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const existingTimer = pendingTimersRef.current.get(noteId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        pendingTimersRef.current.delete(noteId);
      }

      const nextDeleted = Array.from(new Set([...deletedIdsRef.current, noteId]));
      setDeletedIds(nextDeleted);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        broadcastNotes(next, nextDeleted);
        return next;
      });

      if (user && cloudNoteIdsRef.current.has(noteId)) {
        setSyncState('syncing');
        try {
          await deleteDoc(doc(db, 'notes', noteId));
          cloudNoteIdsRef.current.delete(noteId);
          setSyncState('synced');
          setLastSyncedAt(Date.now());
        } catch (err) {
          setSyncState('error');
          handleFirestoreError(err, OperationType.DELETE, `notes/${noteId}`);
        }
      }
    },
    [user, broadcastNotes]
  );

  const updatePreferences = useCallback(
    (patch: Partial<StudioPreferences>) => {
      setPreferences((prev) => {
        const next = sanitizeStudioPreferences({ ...prev, ...patch });
        channelRef.current?.postMessage({ type: 'PREFS_UPDATED', preferences: next });
        if (user) {
          if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
          setSyncState('syncing');
          prefsTimerRef.current = window.setTimeout(() => {
            void pushPrefsToCloud(next, user.uid);
          }, 500);
        }
        return next;
      });
    },
    [user, pushPrefsToCloud]
  );

  const signInWithGoogle = useCallback(async () => {
    setSyncError(null);
    setAuthPending(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = formatGoogleAuthError(err);
      if (msg) setSyncError(msg);
    } finally {
      setAuthPending(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setE2eePassphrase(null);
    e2eePassphraseRef.current = null;
    await signOut(auth);
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) {
      setLastSyncedAt(Date.now());
      broadcastNotes(notesRef.current, deletedIdsRef.current);
      return;
    }
    setSyncState('syncing');
    for (const note of notesRef.current) {
      await pushNoteToCloud(note, user.uid);
    }
    await pushPrefsToCloud(preferences, user.uid);
    setSyncState('synced');
    setLastSyncedAt(Date.now());
  }, [user, preferences, broadcastNotes, pushNoteToCloud, pushPrefsToCloud]);

  const unlockOrEnableE2EE = useCallback(
    async (passphrase: string): Promise<boolean> => {
      const clean = passphrase.trim();
      if (clean.length < 8) {
        setE2eeError('Usa una clave de al menos 8 caracteres.');
        return false;
      }
      setE2eeError(null);
      const lockedNotes = notesRef.current.filter((n) => isEncryptedCloudContent(n.content));

      if (lockedNotes.length > 0 && user) {
        let decryptedCount = 0;
        const nextList: Note[] = [];
        for (const n of notesRef.current) {
          if (!isEncryptedCloudContent(n.content)) {
            nextList.push(n);
            continue;
          }
          try {
            const plain = await decryptNoteFromCloud(n.content, n.id, user.uid, clean);
            const safe = sanitizeNoteRecord({
              ...n,
              title: plain.title,
              content: plain.content,
              tags: plain.tags,
              stickers: plain.stickers,
            });
            if (safe) {
              nextList.push(safe);
              decryptedCount += 1;
            } else {
              nextList.push(n);
            }
          } catch {
            nextList.push(n);
          }
        }

        if (decryptedCount === 0) {
          setE2eeError('La clave maestra no coincide con las notas cifradas.');
          return false;
        }
        setNotes(nextList);
      }

      e2eePassphraseRef.current = clean;
      setE2eePassphrase(clean);

      if (user) {
        for (const n of notesRef.current) {
          if (!isEncryptedCloudContent(n.content)) {
            await pushNoteToCloud(n, user.uid);
          }
        }
      }
      return true;
    },
    [user, pushNoteToCloud]
  );

  const lockE2EE = useCallback(() => {
    e2eePassphraseRef.current = null;
    setE2eePassphrase(null);
    setE2eeError(null);
  }, []);

  const lockedNotesCount = useMemo(
    () => notes.filter((n) => isEncryptedCloudContent(n.content)).length,
    [notes]
  );

  return {
    notes,
    preferences,
    user,
    authReady,
    authPending,
    syncState,
    lastSyncedAt,
    syncError,
    localEncryptedActive,
    e2eeActive: Boolean(e2eePassphrase),
    e2eeError,
    lockedNotesCount,
    upsertNote,
    deleteNote,
    updatePreferences,
    signInWithGoogle,
    signOutUser,
    syncNow,
    unlockOrEnableE2EE,
    lockE2EE,
  };
}
