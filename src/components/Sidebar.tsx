import React from 'react';
import {
  Cloud,
  CloudOff,
  Hash,
  Layers,
  Pin,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { NoteFilter, StudioThemeConfig, SyncState } from '../types/notes';
import { TagCount, formatRelativeTimeEs } from '../utils/notesLogic';

interface SidebarProps {
  theme: StudioThemeConfig;
  totalCount: number;
  pinnedCount: number;
  untaggedCount: number;
  tagCounts: TagCount[];
  filter: NoteFilter;
  onChangeFilter: (patch: Partial<NoteFilter>) => void;
  onOpenCustomize: () => void;
  onOpenSync: () => void;
  syncState: SyncState;
  lastSyncedAt: number;
  userEmail: string | null;
  e2eeActive?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theme,
  totalCount,
  pinnedCount,
  untaggedCount,
  tagCounts,
  filter,
  onChangeFilter,
  onOpenCustomize,
  onOpenSync,
  syncState,
  lastSyncedAt,
  userEmail,
  e2eeActive = false,
  mobileOpen,
  onCloseMobile,
}) => {
  const syncLabel =
    syncState === 'syncing'
      ? 'Sincronizando...'
      : syncState === 'synced'
      ? e2eeActive
        ? 'Nube cifrada (E2EE)'
        : 'Nube sincronizada'
      : syncState === 'offline'
      ? 'Sin conexión (local)'
      : syncState === 'error'
      ? 'Error de sincronización'
      : 'Guardado cifrado local';

  const content = (
    <div className="flex flex-col h-full gap-6">
      {/* Search input */}
      <div>
        <label htmlFor="studio-search" className="sr-only">
          Buscar notas por título, texto o etiqueta
        </label>
        <div
          className="relative flex items-center rounded-xl border transition-colors"
          style={{
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
          }}
        >
          <Search
            className="w-4 h-4 ml-3.5 shrink-0"
            style={{ color: theme.textMuted }}
            aria-hidden="true"
          />
          <input
            id="studio-search"
            type="search"
            value={filter.query}
            onChange={(e) => onChangeFilter({ query: e.target.value })}
            placeholder="Buscar notas o #etiquetas..."
            className="w-full bg-transparent px-3 py-2.5 text-sm placeholder:opacity-65 focus:outline-none"
            style={{ color: theme.textPrimary }}
          />
          {filter.query && (
            <button
              type="button"
              onClick={() => onChangeFilter({ query: '' })}
              aria-label="Limpiar búsqueda"
              className="p-2 mr-1 rounded-lg hover:opacity-80"
              style={{ color: theme.textMuted }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Views */}
      <div className="space-y-1">
        <p
          className="px-2.5 pb-1 text-xs font-medium tracking-wide"
          style={{ color: theme.textMuted }}
        >
          Colección
        </p>

        <button
          type="button"
          onClick={() => {
            onChangeFilter({ view: 'all', activeTag: null });
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            backgroundColor:
              filter.view === 'all' && !filter.activeTag ? theme.bgElevated : 'transparent',
            color:
              filter.view === 'all' && !filter.activeTag ? theme.textPrimary : theme.textMuted,
            fontWeight: filter.view === 'all' && !filter.activeTag ? 600 : 400,
          }}
        >
          <span className="flex items-center gap-2.5 truncate">
            <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Todas las notas</span>
          </span>
          <span className="tabular-nums text-xs opacity-80">{totalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeFilter({ view: 'pinned', activeTag: null });
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            backgroundColor:
              filter.view === 'pinned' && !filter.activeTag ? theme.bgElevated : 'transparent',
            color:
              filter.view === 'pinned' && !filter.activeTag ? theme.textPrimary : theme.textMuted,
            fontWeight: filter.view === 'pinned' && !filter.activeTag ? 600 : 400,
          }}
        >
          <span className="flex items-center gap-2.5 truncate">
            <Pin className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Fijadas</span>
          </span>
          <span className="tabular-nums text-xs opacity-80">{pinnedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeFilter({ view: 'untagged', activeTag: null });
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            backgroundColor:
              filter.view === 'untagged' && !filter.activeTag ? theme.bgElevated : 'transparent',
            color:
              filter.view === 'untagged' && !filter.activeTag ? theme.textPrimary : theme.textMuted,
            fontWeight: filter.view === 'untagged' && !filter.activeTag ? 600 : 400,
          }}
        >
          <span className="flex items-center gap-2.5 truncate">
            <Tag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sin etiqueta</span>
          </span>
          <span className="tabular-nums text-xs opacity-80">{untaggedCount}</span>
        </button>
      </div>

      {/* Tags Directory */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <p className="text-xs font-medium tracking-wide" style={{ color: theme.textMuted }}>
            Etiquetas
          </p>
          {filter.activeTag && (
            <button
              type="button"
              onClick={() => onChangeFilter({ activeTag: null })}
              className="text-xs underline underline-offset-2 hover:opacity-80 cursor-pointer"
              style={{ color: theme.textMuted }}
            >
              Ver todas
            </button>
          )}
        </div>

        <div className="overflow-y-auto pr-1 space-y-0.5">
          {tagCounts.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Añade etiquetas a tus notas para agrupar ideas por tema.
            </p>
          ) : (
            tagCounts.map(({ tag, count }) => {
              const active = filter.activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onChangeFilter({
                      view: 'all',
                      activeTag: active ? null : tag,
                    });
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? theme.bgElevated : 'transparent',
                    color: active ? theme.textPrimary : theme.textMuted,
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Hash className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                    <span className="truncate">{tag}</span>
                  </span>
                  <span className="tabular-nums text-xs opacity-75">{count}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Studio Quick Actions & Auto-Sync Status */}
      <div
        className="pt-4 border-t space-y-2.5"
        style={{ borderColor: theme.borderSubtle }}
      >
        <button
          type="button"
          onClick={() => {
            onOpenCustomize();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors hover:opacity-90 cursor-pointer"
          style={{
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            color: theme.textPrimary,
          }}
        >
          <Sparkles className="w-4 h-4 shrink-0" style={{ color: theme.accentBg }} />
          <span>Fondos y fuentes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenSync();
            onCloseMobile();
          }}
          className="w-full text-left px-3 py-2.5 rounded-lg border transition-colors hover:opacity-95 cursor-pointer space-y-1"
          style={{
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            color: theme.textPrimary,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-medium">
              {syncState === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: theme.accentBg }} />
              ) : syncState === 'offline' ? (
                <CloudOff className="w-3.5 h-3.5" style={{ color: theme.textMuted }} />
              ) : (
                <Cloud className="w-3.5 h-3.5" style={{ color: theme.accentBg }} />
              )}
              <span>{syncLabel}</span>
            </span>
          </div>
          <p className="text-[11px] truncate tabular-nums" style={{ color: theme.textMuted }}>
            {userEmail
              ? userEmail
              : `Conectar Google · ${formatRelativeTimeEs(lastSyncedAt)}`}
          </p>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="sticky top-24 max-h-[calc(100vh-7.5rem)] flex flex-col">
          {content}
        </div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Panel de navegación y etiquetas"
            className="relative w-[290px] max-w-[85vw] h-full p-5 overflow-y-auto border-r shadow-xl"
            style={{
              backgroundColor: theme.bgCanvas,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="font-studio-display text-xl font-semibold">Organizar estudio</span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar panel lateral"
                className="p-2 rounded-lg hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
