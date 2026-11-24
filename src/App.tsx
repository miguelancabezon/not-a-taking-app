import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gamepad2, Moon, SlidersHorizontal, Sparkles, Sun, X } from 'lucide-react';
import { CustomizationDrawer } from './components/CustomizationDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { QuickComposer } from './components/QuickComposer';
import { RetroUnlockModal } from './components/RetroUnlockModal';
import { Sidebar } from './components/Sidebar';
import { SyncPanelModal } from './components/SyncPanelModal';
import { TopBar } from './components/TopBar';
import {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  FONT_PRESETS,
  FONT_SIZE_OPTIONS,
  STUDIO_THEMES,
} from './data/presets';
import { useCozyNotesSync } from './hooks/useCozyNotesSync';
import { Note, NoteFilter, ThemeId } from './types/notes';
import {
  createNoteRecord,
  CreateNoteInput,
  extractTagCounts,
  filterAndSortNotes,
  resolveModeSwitchTheme,
} from './utils/notesLogic';

function CozyStudioApp() {
  const {
    notes,
    preferences,
    user,
    authPending,
    syncState,
    lastSyncedAt,
    syncError,
    localEncryptedActive,
    e2eeActive,
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
  } = useCozyNotesSync();

  const [filter, setFilter] = useState<NoteFilter>({
    query: '',
    activeTag: null,
    view: 'all',
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [retroGameOpen, setRetroGameOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unlockedThemes = preferences.unlockedThemes ?? [];
  const rawTheme = STUDIO_THEMES[preferences.themeId] ?? STUDIO_THEMES[DEFAULT_DARK_THEME_ID];
  const theme =
    rawTheme.lockedByGame && !unlockedThemes.includes(rawTheme.id)
      ? STUDIO_THEMES[DEFAULT_DARK_THEME_ID]
      : rawTheme;

  const lastLightThemeRef = useRef<ThemeId>(
    !theme.isDark ? theme.id : DEFAULT_LIGHT_THEME_ID
  );
  const lastDarkThemeRef = useRef<ThemeId>(
    theme.isDark ? theme.id : DEFAULT_DARK_THEME_ID
  );

  useEffect(() => {
    if (theme.isDark) {
      lastDarkThemeRef.current = theme.id;
    } else {
      lastLightThemeRef.current = theme.id;
    }
    document.documentElement.classList.toggle('dark', theme.isDark);
  }, [theme]);

  const handleSwitchColorMode = (mode: 'light' | 'dark') => {
    const nextThemeId = resolveModeSwitchTheme(
      mode,
      lastLightThemeRef.current,
      lastDarkThemeRef.current
    ) as ThemeId;
    updatePreferences({ themeId: nextThemeId });
  };

  const handleUnlockThemes = useCallback(
    (newlyUnlocked: ThemeId[]) => {
      const merged = Array.from(new Set([...(preferences.unlockedThemes ?? []), ...newlyUnlocked]));
      updatePreferences({ unlockedThemes: merged });
    },
    [preferences.unlockedThemes, updatePreferences]
  );

  const fontPreset =
    FONT_PRESETS.find((f) => f.id === preferences.fontId) ?? FONT_PRESETS[0];
  const sizeOption =
    FONT_SIZE_OPTIONS.find((s) => s.id === preferences.fontSize) ?? FONT_SIZE_OPTIONS[1];

  const tagCounts = useMemo(() => extractTagCounts(notes), [notes]);
  const filteredNotes = useMemo(() => filterAndSortNotes(notes, filter), [notes, filter]);
  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const untaggedCount = useMemo(
    () => notes.filter((n) => n.tags.length === 0).length,
    [notes]
  );

  const activeEditingNote = useMemo(
    () => notes.find((n) => n.id === editingNoteId) ?? null,
    [notes, editingNoteId]
  );

  const handleCreateNote = (input: CreateNoteInput) => {
    const newNote = createNoteRecord(input);
    upsertNote(newNote);
    return newNote;
  };

  const handleCreateBlankModal = () => {
    const blank = createNoteRecord({
      title: '',
      content: '',
      tags: filter.activeTag ? [filter.activeTag] : [],
      pinned: filter.view === 'pinned',
    });
    upsertNote(blank);
    setEditingNoteId(blank.id);
  };

  const handleTogglePin = (note: Note) => {
    upsertNote({ ...note, pinned: !note.pinned });
  };

  const activeNav: 'all' | 'pinned' | 'customize' | 'sync' = customizeOpen
    ? 'customize'
    : syncOpen
    ? 'sync'
    : filter.view === 'pinned'
    ? 'pinned'
    : 'all';

  return (
    <div
      className={`relative min-h-screen flex flex-col texture-${preferences.textureId} ${fontPreset.className} ${sizeOption.bodyClass}`}
      style={{
        backgroundColor: theme.bgCanvas,
        color: theme.textPrimary,
        ['--texture-ink' as string]: theme.textureInk,
      }}
    >
      {theme.id === 'pipboy-verde' && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 retro-crt-overlay opacity-75" />
      )}
      {theme.id === 'gameboy-clasica' && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 retro-lcd-overlay opacity-80" />
      )}
      <TopBar
        theme={theme}
        activeNav={activeNav}
        onSelectNav={(nav) => {
          if (nav === 'customize') {
            setCustomizeOpen(true);
            setSyncOpen(false);
          } else if (nav === 'sync') {
            setSyncOpen(true);
            setCustomizeOpen(false);
          } else if (nav === 'pinned') {
            setFilter((prev) => ({ ...prev, view: 'pinned', activeTag: null }));
          } else {
            setFilter((prev) => ({ ...prev, view: 'all', activeTag: null }));
          }
        }}
        onNewNote={handleCreateBlankModal}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-7 sm:py-9 flex gap-8">
        <Sidebar
          theme={theme}
          totalCount={notes.length}
          pinnedCount={pinnedCount}
          untaggedCount={untaggedCount}
          tagCounts={tagCounts}
          filter={filter}
          onChangeFilter={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSync={() => setSyncOpen(true)}
          syncState={syncState}
          lastSyncedAt={lastSyncedAt}
          userEmail={user?.email ?? null}
          e2eeActive={e2eeActive}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 min-w-0 space-y-7">
          {/* Quick Composer matching Not-e heritage */}
          <QuickComposer theme={theme} onCreateNote={handleCreateNote} />

          {/* Active Filter / View Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="font-studio-display text-2xl sm:text-[28px] font-semibold">
                {filter.activeTag
                  ? `#${filter.activeTag}`
                  : filter.view === 'pinned'
                  ? 'Notas fijadas'
                  : filter.view === 'untagged'
                  ? 'Notas sin etiqueta'
                  : 'Tu cuaderno de notas'}
              </h1>
              <span className="text-xs tabular-nums" style={{ color: theme.textMuted }}>
                · {filteredNotes.length}{' '}
                {filteredNotes.length === 1 ? 'nota' : 'notas'}
              </span>

              {(filter.activeTag || filter.query || filter.view !== 'all') && (
                <button
                  type="button"
                  onClick={() => setFilter({ query: '', activeTag: null, view: 'all' })}
                  className="inline-flex items-center gap-1 ml-2 text-xs underline underline-offset-2 hover:opacity-80 cursor-pointer"
                  style={{ color: theme.textMuted }}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                role="group"
                aria-label="Cambiar entre modo claro cálido y modo oscuro"
                className="inline-flex items-center p-1 rounded-lg border"
                style={{
                  backgroundColor: theme.bgSurface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSwitchColorMode('light')}
                  aria-pressed={!theme.isDark}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: !theme.isDark ? theme.accentBg : 'transparent',
                    color: !theme.isDark ? theme.accentText : theme.textMuted,
                  }}
                >
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchColorMode('dark')}
                  aria-pressed={theme.isDark}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: theme.isDark ? theme.accentBg : 'transparent',
                    color: theme.isDark ? theme.accentText : theme.textMuted,
                  }}
                >
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Oscuro</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.bgSurface,
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Estudio</span>
              </button>
            </div>
          </div>

          {/* Notes Grid or Empty State */}
          {filteredNotes.length === 0 ? (
            <div
              className="rounded-2xl border p-10 text-center space-y-3"
              style={{
                backgroundColor: theme.bgSurface,
                borderColor: theme.borderSubtle,
              }}
            >
              <Sparkles
                className="w-7 h-7 mx-auto opacity-80"
                style={{ color: theme.accentBg }}
                aria-hidden="true"
              />
              <h2 className="font-studio-display text-xl font-semibold">
                No hay notas que coincidan todavía
              </h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: theme.textMuted }}>
                {filter.query || filter.activeTag || filter.view !== 'all'
                  ? 'Prueba limpiando la búsqueda o crea una nueva nota en esta vista.'
                  : 'Empieza escribiendo un título y tus primeras ideas arriba.'}
              </p>
              {(filter.query || filter.activeTag || filter.view !== 'all') && (
                <button
                  type="button"
                  onClick={() => setFilter({ query: '', activeTag: null, view: 'all' })}
                  className="mt-2 inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: theme.accentBg,
                    color: theme.accentText,
                  }}
                >
                  Mostrar todas las notas
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  theme={theme}
                  studioFontClass={fontPreset.className}
                  onOpen={(n) => {
                    if (n.content.startsWith('__E2EE_V1__:')) {
                      setSyncOpen(true);
                    } else {
                      setEditingNoteId(n.id);
                    }
                  }}
                  onTogglePin={handleTogglePin}
                  onDelete={(id) => void deleteNote(id)}
                  onSelectTag={(tag) =>
                    setFilter((prev) => ({
                      ...prev,
                      view: 'all',
                      activeTag: prev.activeTag === tag ? null : tag,
                    }))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer
        className="border-t py-5 px-4 sm:px-8 text-xs"
        style={{
          borderColor: theme.borderSubtle,
          color: theme.textMuted,
        }}
      >
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span>© 2026 Miguel Cabezón · Not-a taking app</span>
            <button
              type="button"
              onClick={() => setRetroGameOpen(true)}
              aria-label="Abrir minijuego secreto retro"
              title="Cartucho secreto"
              className="p-1 rounded opacity-45 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="hover:underline underline-offset-2 cursor-pointer"
            >
              Personalizar estudio
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setSyncOpen(true)}
              className="hover:underline underline-offset-2 cursor-pointer"
            >
              Sincronización automática
            </button>
          </div>
        </div>
      </footer>

      <NoteEditorModal
        note={activeEditingNote}
        theme={theme}
        studioFontClass={fontPreset.className}
        syncState={syncState}
        onClose={() => setEditingNoteId(null)}
        onUpdate={upsertNote}
        onDelete={(id) => void deleteNote(id)}
      />

      <CustomizationDrawer
        open={customizeOpen}
        theme={theme}
        preferences={preferences}
        onUpdatePreferences={updatePreferences}
        onSwitchColorMode={handleSwitchColorMode}
        onOpenRetroGame={() => setRetroGameOpen(true)}
        onClose={() => setCustomizeOpen(false)}
      />

      <RetroUnlockModal
        open={retroGameOpen}
        theme={theme}
        unlockedThemes={unlockedThemes}
        onUnlockThemes={handleUnlockThemes}
        onApplyTheme={(themeId) => updatePreferences({ themeId })}
        onClose={() => setRetroGameOpen(false)}
      />

      <SyncPanelModal
        open={syncOpen}
        theme={theme}
        user={user}
        authPending={authPending}
        syncState={syncState}
        lastSyncedAt={lastSyncedAt}
        syncError={syncError}
        localEncryptedActive={localEncryptedActive}
        e2eeActive={e2eeActive}
        e2eeError={e2eeError}
        lockedNotesCount={lockedNotesCount}
        notes={notes}
        onClose={() => setSyncOpen(false)}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
        onSyncNow={() => void syncNow()}
        onUnlockOrEnableE2EE={unlockOrEnableE2EE}
        onLockE2EE={lockE2EE}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CozyStudioApp />
    </ErrorBoundary>
  );
}
