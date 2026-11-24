import React, { useEffect } from 'react';
import { Check, Gamepad2, Grid, Lock, Moon, Sun, Type, X } from 'lucide-react';
import {
  FONT_PRESETS,
  FONT_SIZE_OPTIONS,
  STUDIO_THEMES,
  SURFACE_TEXTURES,
} from '../data/presets';
import {
  FontId,
  FontSizeId,
  StudioPreferences,
  StudioThemeConfig,
  TextureId,
  ThemeId,
} from '../types/notes';

interface CustomizationDrawerProps {
  open: boolean;
  theme: StudioThemeConfig;
  preferences: StudioPreferences;
  onUpdatePreferences: (patch: Partial<StudioPreferences>) => void;
  onSwitchColorMode: (mode: 'light' | 'dark') => void;
  onOpenRetroGame: () => void;
  onClose: () => void;
}

export const CustomizationDrawer: React.FC<CustomizationDrawerProps> = ({
  open,
  theme,
  preferences,
  onUpdatePreferences,
  onSwitchColorMode,
  onOpenRetroGame,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const unlockedSet = new Set(preferences.unlockedThemes ?? []);
  const allThemes = Object.values(STUDIO_THEMES);
  const lightThemes = allThemes.filter((t) => !t.isDark);
  const darkThemes = allThemes.filter((t) => t.isDark);

  const renderThemeButton = (t: StudioThemeConfig) => {
    const isLocked = Boolean(t.lockedByGame && !unlockedSet.has(t.id));
    const active = preferences.themeId === t.id;

    if (isLocked) {
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            onClose();
            onOpenRetroGame();
          }}
          className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed text-left transition-colors hover:opacity-95 cursor-pointer"
          style={{
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            opacity: 0.85,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.textMuted,
              }}
              aria-hidden="true"
            >
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Tema oculto · {t.isDark ? 'Modo oscuro' : 'Modo claro'}
              </p>
              <p className="text-xs truncate" style={{ color: theme.textMuted }}>
                {t.unlockRequirement || 'Juega al minijuego secreto'}
              </p>
            </div>
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-1 rounded-md shrink-0"
            style={{
              backgroundColor: theme.bgElevated,
              color: theme.accentBg,
            }}
          >
            Jugar
          </span>
        </button>
      );
    }

    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onUpdatePreferences({ themeId: t.id as ThemeId })}
        aria-pressed={active}
        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer"
        style={{
          backgroundColor: active ? theme.bgElevated : theme.bgSurface,
          borderColor: active ? theme.accentBg : theme.borderSubtle,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center -space-x-1.5 shrink-0" aria-hidden="true">
            {t.swatchColors.map((hex, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded-full border border-black/20"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{t.name}</p>
            <p className="text-xs truncate" style={{ color: theme.textMuted }}>
              {t.subtitle}
            </p>
          </div>
        </div>
        {active && (
          <Check className="w-4 h-4 shrink-0" style={{ color: theme.accentBg }} />
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-title"
        className="w-full max-w-md h-full overflow-y-auto border-l p-6 sm:p-7 space-y-8 shadow-2xl"
        style={{
          backgroundColor: theme.bgCanvas,
          borderColor: theme.borderSubtle,
          color: theme.textPrimary,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="customize-title" className="font-studio-display text-2xl font-semibold">
              Personalizar estudio
            </h2>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Tus ajustes se guardan y sincronizan automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de personalización"
            className="p-2 rounded-lg hover:bg-black/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <section className="space-y-2.5" aria-label="Modo de iluminación">
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border"
            style={{
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            }}
          >
            <button
              type="button"
              onClick={() => onSwitchColorMode('light')}
              aria-pressed={!theme.isDark}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: !theme.isDark ? theme.accentBg : 'transparent',
                color: !theme.isDark ? theme.accentText : theme.textMuted,
              }}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Modo claro cálido</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchColorMode('dark')}
              aria-pressed={theme.isDark}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: theme.isDark ? theme.accentBg : 'transparent',
                color: theme.isDark ? theme.accentText : theme.textMuted,
              }}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Modo oscuro</span>
            </button>
          </div>
        </section>

        {/* 1. Background Theme: Warm Light & Dark Themes */}
        <section className="space-y-4" aria-labelledby="theme-section-label">
          <div className="space-y-2.5">
            <h3 id="theme-section-label" className="text-xs font-semibold tracking-wide" style={{ color: theme.textMuted }}>
              Modo claro · Tonos cálidos
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {lightThemes.map(renderThemeButton)}
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-semibold tracking-wide" style={{ color: theme.textMuted }}>
              Modo oscuro · Estilo Not-e y nocturno
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {darkThemes.map(renderThemeButton)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRetroGame();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <Gamepad2 className="w-4 h-4" style={{ color: theme.accentBg }} aria-hidden="true" />
            <span>Abrir cartucho secreto</span>
          </button>
        </section>

        {/* 2. Surface Texture */}
        <section className="space-y-3" aria-labelledby="texture-section-label">
          <h3
            id="texture-section-label"
            className="flex items-center gap-2 text-xs font-semibold tracking-wide"
            style={{ color: theme.textMuted }}
          >
            <Grid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Textura del escritorio</span>
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {SURFACE_TEXTURES.map((tex) => {
              const active = preferences.textureId === tex.id;
              return (
                <button
                  key={tex.id}
                  type="button"
                  onClick={() => onUpdatePreferences({ textureId: tex.id as TextureId })}
                  aria-pressed={active}
                  className="p-3 rounded-xl border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? theme.bgElevated : theme.bgSurface,
                    borderColor: active ? theme.accentBg : theme.borderSubtle,
                  }}
                >
                  <p className="text-sm font-semibold">{tex.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                    {tex.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Studio Font */}
        <section className="space-y-3" aria-labelledby="font-section-label">
          <h3
            id="font-section-label"
            className="flex items-center gap-2 text-xs font-semibold tracking-wide"
            style={{ color: theme.textMuted }}
          >
            <Type className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tipografía principal</span>
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {FONT_PRESETS.map((font) => {
              const active = preferences.fontId === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => onUpdatePreferences({ fontId: font.id as FontId })}
                  aria-pressed={active}
                  className="flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? theme.bgElevated : theme.bgSurface,
                    borderColor: active ? theme.accentBg : theme.borderSubtle,
                  }}
                >
                  <div>
                    <p
                      className="text-base font-semibold"
                      style={{ fontFamily: font.displayFont }}
                    >
                      {font.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: theme.textMuted, fontFamily: font.bodyFont }}
                    >
                      {font.sample} — Escribir con calma
                    </p>
                  </div>
                  {active && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: theme.accentBg }} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Reading Size */}
        <section className="space-y-3" aria-labelledby="size-section-label">
          <h3 id="size-section-label" className="text-xs font-semibold tracking-wide" style={{ color: theme.textMuted }}>
            Tamaño de lectura
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZE_OPTIONS.map((opt) => {
              const active = preferences.fontSize === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdatePreferences({ fontSize: opt.id as FontSizeId })}
                  aria-pressed={active}
                  className="py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? theme.accentBg : theme.bgSurface,
                    color: active ? theme.accentText : theme.textPrimary,
                    borderColor: active ? theme.accentBg : theme.borderSubtle,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
