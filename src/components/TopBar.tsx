import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { StudioThemeConfig } from '../types/notes';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  theme: StudioThemeConfig;
  activeNav: 'all' | 'pinned' | 'customize' | 'sync';
  onSelectNav: (nav: 'all' | 'pinned' | 'customize' | 'sync') => void;
  onNewNote: () => void;
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  activeNav,
  onSelectNav,
  onNewNote,
  onOpenMobileMenu,
}) => {
  const navItems: { id: 'all' | 'pinned' | 'customize' | 'sync'; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'pinned', label: 'Fijadas' },
    { id: 'customize', label: 'Personalizar' },
    { id: 'sync', label: 'Sincronización' },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200"
      style={{
        borderColor: theme.borderSubtle,
        backgroundColor: `color-mix(in srgb, ${theme.bgCanvas} 88%, transparent)`,
        color: theme.textPrimary,
      }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir panel de etiquetas y búsqueda"
            className="lg:hidden p-2 -ml-2 rounded-lg transition-opacity hover:opacity-80"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              onSelectNav('all');
            }}
            className="font-studio-display text-2xl sm:text-[26px] font-semibold tracking-tight whitespace-nowrap shrink-0"
          >
            Not-a taking app
          </a>
        </div>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                className="relative py-1 whitespace-nowrap shrink-0 transition-opacity hover:opacity-100 cursor-pointer"
                style={{
                  color: isActive ? theme.textPrimary : theme.textMuted,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full"
                    style={{ backgroundColor: theme.accentBg }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: PWA install + 1 primary CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton theme={theme} />
          <button
            type="button"
            onClick={onNewNote}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: theme.accentBg,
              color: theme.accentText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva nota</span>
          </button>
        </div>
      </div>
    </header>
  );
};
