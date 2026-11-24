import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { StudioThemeConfig } from '../types/notes';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  theme: StudioThemeConfig;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ theme }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Instalar aplicación en el dispositivo"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 hover:bg-black/10 transition-colors cursor-pointer"
        style={{
          borderColor: theme.borderSubtle,
          color: theme.textPrimary,
        }}
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Instalar</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Instalar en iPhone o iPad"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 hover:bg-black/10 transition-colors cursor-pointer"
          style={{
            borderColor: theme.borderSubtle,
            color: theme.textPrimary,
          }}
        >
          <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Instalar</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: theme.bgSurface,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id="ios-install-title" className="font-studio-display text-lg font-semibold">
                  Instalar en iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Cerrar instrucciones de instalación"
                  className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer"
                  style={{ color: theme.textMuted }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-sm leading-relaxed list-decimal list-inside" style={{ color: theme.textMuted }}>
                <li>Pulsa el botón <strong>Compartir</strong> en la barra de Safari.</li>
                <li>Desliza hacia abajo y elige <strong>Añadir a pantalla de inicio</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: theme.accentBg,
                  color: theme.accentText,
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
