import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { Note, StudioThemeConfig, SyncState } from '../types/notes';
import { formatRelativeTimeEs } from '../utils/notesLogic';
import { isSafeHttpsUrl } from '../utils/security';

interface SyncPanelModalProps {
  open: boolean;
  theme: StudioThemeConfig;
  user: User | null;
  authPending: boolean;
  syncState: SyncState;
  lastSyncedAt: number;
  syncError: string | null;
  localEncryptedActive: boolean;
  e2eeActive: boolean;
  e2eeError: string | null;
  lockedNotesCount: number;
  notes: Note[];
  onClose: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onUnlockOrEnableE2EE: (passphrase: string) => Promise<boolean>;
  onLockE2EE: () => void;
}

export const SyncPanelModal: React.FC<SyncPanelModalProps> = ({
  open,
  theme,
  user,
  authPending,
  syncState,
  lastSyncedAt,
  syncError,
  localEncryptedActive,
  e2eeActive,
  e2eeError,
  lockedNotesCount,
  notes,
  onClose,
  onSignIn,
  onSignOut,
  onSyncNow,
  onUnlockOrEnableE2EE,
  onLockE2EE,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [e2eeBusy, setE2eeBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `not-a-taking-app-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleE2EESubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim() || e2eeBusy) return;
    setE2eeBusy(true);
    try {
      const ok = await onUnlockOrEnableE2EE(passphrase);
      if (ok) setPassphrase('');
    } finally {
      setE2eeBusy(false);
    }
  };

  const safeAvatar = user && isSafeHttpsUrl(user.photoURL) ? user.photoURL : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border p-6 sm:p-7 shadow-2xl space-y-5"
        style={{
          backgroundColor: theme.bgSurface,
          borderColor: theme.borderSubtle,
          color: theme.textPrimary,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="sync-modal-title" className="font-studio-display text-2xl font-semibold">
              Sincronización y seguridad
            </h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
              Tus notas se cifran localmente (AES-256-GCM) y se sincronizan bajo conexión segura.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de sincronización"
            className="p-2 rounded-lg hover:bg-black/15 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Sync Status Summary */}
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {syncState === 'syncing' ? (
                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: theme.accentBg }} />
              ) : syncState === 'offline' ? (
                <CloudOff className="w-4 h-4" style={{ color: theme.textMuted }} />
              ) : (
                <CheckCircle2 className="w-4 h-4" style={{ color: theme.accentBg }} />
              )}
              <span>
                {syncState === 'syncing'
                  ? 'Sincronizando cambios...'
                  : syncState === 'synced'
                  ? 'Sincronizado en la nube'
                  : syncState === 'offline'
                  ? 'Modo sin conexión (auto-guardado local)'
                  : 'Auto-guardado local y multipestaña activo'}
              </span>
            </span>
          </div>

          <p className="text-xs tabular-nums" style={{ color: theme.textMuted }}>
            {notes.length} {notes.length === 1 ? 'nota protegida' : 'notas protegidas'} · Última actualización{' '}
            {formatRelativeTimeEs(lastSyncedAt)}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px]" style={{ color: theme.textMuted }}>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme.accentBg }} aria-hidden="true" />
              <span>{localEncryptedActive ? 'Bóveda local AES-256 activa' : 'Protección local activa'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Transporte HTTPS + CSP</span>
          </div>

          {syncError && (
            <p className="text-xs text-red-400 pt-1" role="alert">
              {syncError}
            </p>
          )}
        </div>

        {/* Google Auth Section */}
        <div className="space-y-3">
          {user ? (
            <div
              className="rounded-xl border p-3.5 flex items-center justify-between gap-3"
              style={{ borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {safeAvatar ? (
                  <img
                    src={safeAvatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border shrink-0"
                    style={{ borderColor: theme.borderSubtle }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{
                      backgroundColor: theme.accentBg,
                      color: theme.accentText,
                    }}
                  >
                    {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user.displayName || 'Cuenta de Google'}
                  </p>
                  <p className="text-xs truncate" style={{ color: theme.textMuted }}>
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/10 shrink-0 cursor-pointer"
                style={{ borderColor: theme.borderSubtle }}
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                Inicia sesión con tu cuenta de Google para sincronizar de forma segura tus notas, stickers y estilos en todos tus dispositivos.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                disabled={authPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
                style={{
                  backgroundColor: theme.accentBg,
                  color: theme.accentText,
                }}
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>{authPending ? 'Conectando con Google...' : 'Iniciar sesión con Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* End-to-End Cloud Encryption Vault */}
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {e2eeActive ? (
                  <Unlock className="w-4 h-4" style={{ color: theme.accentBg }} aria-hidden="true" />
                ) : (
                  <Lock className="w-4 h-4" style={{ color: theme.accentBg }} aria-hidden="true" />
                )}
                <span>Cifrado extremo a extremo (E2EE)</span>
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
                {e2eeActive
                  ? 'Activo en memoria: tus notas se cifran con AES-256-GCM antes de salir del navegador.'
                  : lockedNotesCount > 0
                  ? `Tienes ${lockedNotesCount} ${lockedNotesCount === 1 ? 'nota cifrada' : 'notas cifradas'}. Introduce tu clave maestra para leerlas.`
                  : 'Opcional: define una clave maestra (solo en RAM) para cifrar títulos, texto y etiquetas en la nube.'}
              </p>
            </div>
          </div>

          {e2eeActive ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-medium" style={{ color: theme.accentBg }}>
                Clave maestra verificada
              </span>
              <button
                type="button"
                onClick={onLockE2EE}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/10 cursor-pointer"
                style={{ borderColor: theme.borderSubtle }}
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Bloquear clave</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleE2EESubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="e2ee-passphrase-input" className="sr-only">
                  Clave maestra E2EE
                </label>
                <input
                  id="e2ee-passphrase-input"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Clave maestra (mín. 8 caracteres)..."
                  autoComplete="new-password"
                  className="flex-1 min-w-0 rounded-lg border px-3 py-2 text-xs bg-transparent focus:outline-none"
                  style={{
                    borderColor: theme.borderSubtle,
                    color: theme.textPrimary,
                  }}
                />
                <button
                  type="submit"
                  disabled={e2eeBusy || passphrase.trim().length < 8}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 disabled:opacity-45 cursor-pointer"
                  style={{
                    backgroundColor: theme.accentBg,
                    color: theme.accentText,
                  }}
                >
                  <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{lockedNotesCount > 0 ? 'Desbloquear' : 'Activar'}</span>
                </button>
              </div>
              {e2eeError && (
                <p className="text-xs text-red-400" role="alert">
                  {e2eeError}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Actions */}
        <div
          className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: theme.borderSubtle }}
        >
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-black/10 cursor-pointer"
            style={{ borderColor: theme.borderSubtle }}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar copia (.json)</span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium hover:bg-black/10 cursor-pointer"
            style={{ borderColor: theme.borderSubtle }}
          >
            <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sincronizar ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
