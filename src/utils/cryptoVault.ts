import { Note, PlacedSticker } from '../types/notes';

const KEYSTORE_DB_NAME = 'not-a-taking-app-keystore';
const KEYSTORE_STORE_NAME = 'keys';
const LOCAL_KEY_ID = 'local-aes-gcm-v1';
const LOCAL_AAD = 'not-a-taking-app:local-vault:v1';
const E2EE_PREFIX = '__E2EE_V1__:';
const PBKDF2_ITERATIONS = 210000;

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  ct: string;
}

interface E2EEPlainPayload {
  title: string;
  content: string;
  tags: string[];
  stickers: PlacedSticker[];
}

function getSubtle(): SubtleCrypto | null {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    return null;
  }
  return globalThis.crypto.subtle;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openKeystoreDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(KEYSTORE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEYSTORE_STORE_NAME)) {
        db.createObjectStore(KEYSTORE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open keystore'));
  });
}

async function readStoredLocalKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE_NAME, 'readonly');
    const store = tx.objectStore(KEYSTORE_STORE_NAME);
    const req = store.get(LOCAL_KEY_ID);
    req.onsuccess = () => resolve((req.result as CryptoKey | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error('Failed to read local key'));
  });
}

async function writeStoredLocalKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEYSTORE_STORE_NAME);
    const req = store.put(key, LOCAL_KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to store local key'));
  });
}

let cachedLocalKeyPromise: Promise<CryptoKey | null> | null = null;

/**
 * Obtains or generates a non-extractable AES-256-GCM CryptoKey stored in IndexedDB.
 * Raw key bytes are never exposed to JavaScript or localStorage.
 */
export async function getOrCreateLocalVaultKey(): Promise<CryptoKey | null> {
  if (cachedLocalKeyPromise) return cachedLocalKeyPromise;
  cachedLocalKeyPromise = (async () => {
    const subtle = getSubtle();
    if (!subtle) return null;
    try {
      const db = await openKeystoreDb();
      const existing = await readStoredLocalKey(db);
      if (existing) return existing;
      const created = await subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable
        ['encrypt', 'decrypt']
      );
      await writeStoredLocalKey(db, created);
      return created;
    } catch {
      return null;
    }
  })();
  return cachedLocalKeyPromise;
}

export async function encryptLocalJson(value: unknown): Promise<string | null> {
  const subtle = getSubtle();
  const key = await getOrCreateLocalVaultKey();
  if (!subtle || !key) return null;

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const aad = new TextEncoder().encode(LOCAL_AAD);
  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoded
  );
  const envelope: EncryptedEnvelope = {
    v: 1,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
  return JSON.stringify(envelope);
}

export async function decryptLocalJson(rawEnvelope: string): Promise<unknown | null> {
  const subtle = getSubtle();
  const key = await getOrCreateLocalVaultKey();
  if (!subtle || !key) return null;

  try {
    const parsed = JSON.parse(rawEnvelope) as Partial<EncryptedEnvelope>;
    if (!parsed || parsed.v !== 1 || typeof parsed.iv !== 'string' || typeof parsed.ct !== 'string') {
      return null;
    }
    const iv = base64ToBytes(parsed.iv);
    const ct = base64ToBytes(parsed.ct);
    const aad = new TextEncoder().encode(LOCAL_AAD);
    const plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      key,
      ct
    );
    const text = new TextDecoder().decode(plainBuffer);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isEncryptedCloudContent(content: string): boolean {
  return typeof content === 'string' && content.startsWith(E2EE_PREFIX);
}

/**
 * Derives a non-extractable AES-256-GCM key in memory using PBKDF2-HMAC-SHA256.
 */
export async function deriveVaultKeyFromPassphrase(
  passphrase: string,
  saltBytes: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API no disponible en este navegador.');
  }
  const normalizedPass = passphrase.normalize('NFKC');
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizedPass),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts sensitive note fields (title, content, tags, stickers) using AES-256-GCM
 * bound with AAD (`ownerId:noteId`) to prevent tampering and cross-record replay.
 */
export async function encryptNoteForCloud(
  note: Note,
  ownerId: string,
  passphrase: string
): Promise<{ title: string; content: string; tags: string[]; stickers: PlacedSticker[] }> {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error('Cifrado Web Crypto no disponible.');
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKeyFromPassphrase(passphrase, salt);

  const payload: E2EEPlainPayload = {
    title: note.title,
    content: note.content,
    tags: note.tags,
    stickers: note.stickers,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const aad = new TextEncoder().encode(`${ownerId}:${note.id}`);

  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoded
  );
  const packed = `${E2EE_PREFIX}${bytesToBase64(salt)}:${bytesToBase64(iv)}:${bytesToBase64(
    new Uint8Array(cipherBuffer)
  )}`;

  return {
    title: 'Nota cifrada (E2EE)',
    content: packed,
    tags: [],
    stickers: [],
  };
}

/**
 * Decrypts an E2EE cloud note payload, verifying the AES-GCM tag and AAD binding.
 */
export async function decryptNoteFromCloud(
  encryptedContent: string,
  noteId: string,
  ownerId: string,
  passphrase: string
): Promise<E2EEPlainPayload> {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API no disponible.');
  }
  if (!isEncryptedCloudContent(encryptedContent)) {
    throw new Error('Formato cifrado no reconocido.');
  }
  const parts = encryptedContent.slice(E2EE_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Carga cifrada corrupta.');
  }
  const [saltB64, ivB64, ctB64] = parts;
  const salt = base64ToBytes(saltB64);
  const iv = base64ToBytes(ivB64);
  const ct = base64ToBytes(ctB64);

  const key = await deriveVaultKeyFromPassphrase(passphrase, salt);
  const aad = new TextEncoder().encode(`${ownerId}:${noteId}`);
  const plainBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    ct
  );
  const parsed = JSON.parse(new TextDecoder().decode(plainBuffer)) as Partial<E2EEPlainPayload>;
  return {
    title: typeof parsed.title === 'string' ? parsed.title : '',
    content: typeof parsed.content === 'string' ? parsed.content : '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
  };
}
