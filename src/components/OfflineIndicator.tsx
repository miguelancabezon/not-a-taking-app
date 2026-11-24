import React from 'react';
import { WifiOff } from 'lucide-react';
import { StudioThemeConfig } from '../types/notes';
import { useOnlineStatus } from '../hooks/usePWAInstall';

interface OfflineIndicatorProps {
  theme: StudioThemeConfig;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ theme }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg"
      style={{
        backgroundColor: theme.bgSurface,
        borderColor: theme.borderSubtle,
        color: theme.textPrimary,
      }}
    >
      <WifiOff className="w-3.5 h-3.5" style={{ color: theme.accentBg }} aria-hidden="true" />
      <span>Sin conexión · notas guardadas en caché local</span>
    </div>
  );
};
