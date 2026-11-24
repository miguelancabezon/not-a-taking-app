import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Hash,
  Palette,
  PencilLine,
  Pin,
  RotateCcw,
  RotateCw,
  Smile,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FONT_PRESETS, PAPER_TINTS } from '../data/presets';
import {
  Note,
  NoteFontChoice,
  PaperColorId,
  StudioThemeConfig,
  SyncState,
} from '../types/notes';
import {
  addStickerToNote,
  addTagToList,
  formatRelativeTimeEs,
  removeStickerFromList,
  removeTagFromList,
  updateStickerInList,
} from '../utils/notesLogic';
import {
  COZY_STICKERS,
  getStickerByKey,
  STICKER_CATEGORIES,
  StickerCategory,
} from './Stickers';

interface NoteEditorModalProps {
  note: Note | null;
  theme: StudioThemeConfig;
  studioFontClass: string;
  syncState: SyncState;
  onClose: () => void;
  onUpdate: (updated: Note) => void;
  onDelete: (noteId: string) => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  theme,
  studioFontClass,
  syncState,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [tagDraft, setTagDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'none' | 'stickers' | 'style'>('none');
  const [stickerCategory, setStickerCategory] = useState<StickerCategory | 'todos'>('todos');
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [readingMode, setReadingMode] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    stickerId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    setSelectedStickerId(null);
    setConfirmDelete(false);
    setActiveTab('none');
    setTagDraft('');
    setReadingMode(false);
  }, [note?.id]);

  useEffect(() => {
    if (!note) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (readingMode) {
          setReadingMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [note, readingMode, onClose]);

  if (!note) return null;

  const tint = PAPER_TINTS[note.paperColor] ?? PAPER_TINTS.default;
  const isDefault = note.paperColor === 'default';
  const paperBg = isDefault
    ? theme.bgSurface
    : theme.isDark
    ? tint.darkBg
    : tint.lightBg;
  const paperBorder = isDefault
    ? theme.borderSubtle
    : theme.isDark
    ? tint.darkBorder
    : tint.lightBorder;
  const paperText = isDefault
    ? theme.textPrimary
    : theme.isDark
    ? tint.darkText
    : tint.lightText;
  const paperMuted = isDefault
    ? theme.textMuted
    : theme.isDark
    ? tint.darkMuted
    : tint.lightMuted;

  const fontClass =
    note.fontFamily === 'studio'
      ? studioFontClass
      : FONT_PRESETS.find((f) => f.id === note.fontFamily)?.className ?? studioFontClass;

  const selectedSticker = note.stickers.find((s) => s.id === selectedStickerId) ?? null;

  const filteredStickers =
    stickerCategory === 'todos'
      ? COZY_STICKERS
      : COZY_STICKERS.filter((s) => s.category === stickerCategory);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragRef.current.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragRef.current.startClientY) / rect.height) * 100;
    const nextStickers = updateStickerInList(note.stickers, dragRef.current.stickerId, {
      x: dragRef.current.origX + dxPct,
      y: dragRef.current.origY + dyPct,
    });
    onUpdate({ ...note, stickers: nextStickers });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleAddTag = (raw: string) => {
    const next = addTagToList(note.tags, raw);
    if (next !== note.tags) {
      onUpdate({ ...note, tags: next });
      setTagDraft('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-note-title"
        className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${fontClass}`}
        style={{
          backgroundColor: paperBg,
          borderColor: paperBorder,
          color: paperText,
        }}
      >
        {/* Editor Top Controls (hidden in Modo lectura) */}
        {!readingMode && (
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between gap-4 shrink-0"
            style={{ borderColor: paperBorder }}
          >
            <div className="flex items-center gap-2 text-xs tabular-nums" style={{ color: paperMuted }}>
              <Check className="w-3.5 h-3.5" style={{ color: theme.accentBg }} aria-hidden="true" />
              <span>
                {syncState === 'syncing'
                  ? 'Guardando y sincronizando...'
                  : `Guardado · ${formatRelativeTimeEs(note.updatedAt)}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('none');
                  setSelectedStickerId(null);
                  setConfirmDelete(false);
                  setReadingMode(true);
                }}
                aria-pressed={readingMode}
                aria-label="Activar modo lectura"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors cursor-pointer"
                style={{ color: paperText }}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Modo lectura</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdate({ ...note, pinned: !note.pinned })}
                aria-label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
                aria-pressed={note.pinned}
                className="p-2 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                style={{ color: note.pinned ? theme.accentBg : paperMuted }}
              >
                <Pin className="w-4 h-4" />
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(note.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg text-xs hover:bg-black/10 cursor-pointer"
                    style={{ color: paperMuted }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Eliminar nota"
                  className="p-2 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                  style={{ color: paperMuted }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar editor de nota"
                className="p-2 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                style={{ color: paperText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {readingMode ? (
          <div className="relative flex-1 overflow-y-auto px-6 sm:px-14 py-12 sm:py-16 min-h-[65vh]">
            <button
              type="button"
              onClick={() => setReadingMode(false)}
              aria-label="Salir del modo lectura"
              className="fixed sm:absolute top-5 right-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-55 hover:opacity-100 hover:bg-black/10 transition-all cursor-pointer"
              style={{ color: paperMuted }}
            >
              <PencilLine className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Editar</span>
            </button>

            <article className="mx-auto max-w-[58ch] space-y-6 text-left">
              <h2
                id="editor-note-title"
                className="font-studio-display text-3xl sm:text-4xl font-semibold leading-tight"
                style={{ color: paperText }}
              >
                {note.title || 'Nota sin título'}
              </h2>

              <div
                className="font-studio-body text-[17px] sm:text-[18px] leading-[1.85] whitespace-pre-line"
                style={{ color: paperText }}
              >
                {note.content || 'Sin contenido todavía.'}
              </div>

              {note.tags.length > 0 && (
                <div
                  className="pt-6 border-t flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                  style={{ borderColor: paperBorder, color: paperMuted }}
                >
                  {note.tags.map((tag, idx) => (
                    <React.Fragment key={tag}>
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <span>#{tag}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </article>
          </div>
        ) : (
          /* Interactive Sheet Canvas (Title, Content, and Draggable Stickers) */
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedStickerId(null);
            }}
            className="relative flex-1 overflow-y-auto px-6 sm:px-9 py-6 min-h-[320px]"
          >
            {/* Draggable aesthetic stickers layer */}
            {note.stickers.map((stk) => {
              const def = getStickerByKey(stk.stickerKey);
              const isSelected = stk.id === selectedStickerId;
              return (
                <div
                  key={stk.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Sticker ${def.label}. Arrastra para mover o pulsa para editar`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStickerId(stk.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      onUpdate({
                        ...note,
                        stickers: removeStickerFromList(note.stickers, stk.id),
                      });
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedStickerId(stk.id);
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // Ignore capture errors in synthetic tests
                    }
                    dragRef.current = {
                      stickerId: stk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: stk.x,
                      origY: stk.y,
                    };
                  }}
                  className={`absolute z-20 select-none touch-none cursor-grab active:cursor-grabbing rounded-full p-1.5 transition-transform ${
                    isSelected ? 'outline-2 outline-dashed outline-offset-2' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${stk.x}%`,
                    top: `${stk.y}%`,
                    transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale})`,
                    outlineColor: isSelected ? theme.accentBg : 'transparent',
                  }}
                >
                  {def.render('w-12 h-12 sm:w-14 sm:h-14')}
                </div>
              );
            })}

            <div className="relative z-10 max-w-xl pr-8 sm:pr-20">
              <input
                id="editor-note-title"
                type="text"
                value={note.title}
                onChange={(e) => onUpdate({ ...note, title: e.target.value })}
                placeholder="Título de la nota..."
                maxLength={160}
                className="w-full bg-transparent font-studio-display text-2xl sm:text-3xl font-semibold leading-tight placeholder:opacity-50 focus:outline-none"
                style={{ color: paperText }}
              />

              <textarea
                value={note.content}
                onChange={(e) => onUpdate({ ...note, content: e.target.value })}
                placeholder="Escribe libremente tus ideas..."
                aria-label="Cuerpo de la nota"
                rows={10}
                maxLength={20000}
                className="mt-4 w-full resize-none bg-transparent font-studio-body text-base leading-relaxed placeholder:opacity-50 focus:outline-none min-h-[220px]"
                style={{ color: paperText }}
              />

              {/* Tags editor */}
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2.5" style={{ borderColor: paperBorder }}>
                {note.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      onUpdate({ ...note, tags: removeTagFromList(note.tags, tag) })
                    }
                    aria-label={`Eliminar etiqueta ${tag}`}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-75 cursor-pointer"
                    style={{ color: paperMuted }}
                  >
                    <span>#{tag}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}

                <div className="inline-flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 opacity-60" style={{ color: paperMuted }} aria-hidden="true" />
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagDraft);
                      }
                    }}
                    placeholder="añadir etiqueta..."
                    aria-label="Añadir etiqueta a esta nota"
                    maxLength={32}
                    className="w-36 bg-transparent text-xs placeholder:opacity-55 focus:outline-none"
                    style={{ color: paperText }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Sticker Mini-Toolbar */}
        {!readingMode && selectedSticker && (
          <div
            className="px-5 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0"
            style={{
              borderColor: paperBorder,
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <span className="font-medium">
              Sticker: {getStickerByKey(selectedSticker.stickerKey).label} (arrastra en la nota para mover)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Reducir tamaño del sticker"
                onClick={() =>
                  onUpdate({
                    ...note,
                    stickers: updateStickerInList(note.stickers, selectedSticker.id, {
                      scale: selectedSticker.scale - 0.15,
                    }),
                  })
                }
                className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Aumentar tamaño del sticker"
                onClick={() =>
                  onUpdate({
                    ...note,
                    stickers: updateStickerInList(note.stickers, selectedSticker.id, {
                      scale: selectedSticker.scale + 0.15,
                    }),
                  })
                }
                className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Rotar sticker a la izquierda"
                onClick={() =>
                  onUpdate({
                    ...note,
                    stickers: updateStickerInList(note.stickers, selectedSticker.id, {
                      rotation: selectedSticker.rotation - 8,
                    }),
                  })
                }
                className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Rotar sticker a la derecha"
                onClick={() =>
                  onUpdate({
                    ...note,
                    stickers: updateStickerInList(note.stickers, selectedSticker.id, {
                      rotation: selectedSticker.rotation + 8,
                    }),
                  })
                }
                className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Quitar sticker seleccionado"
                onClick={() => {
                  onUpdate({
                    ...note,
                    stickers: removeStickerFromList(note.stickers, selectedSticker.id),
                  });
                  setSelectedStickerId(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600/90 text-white font-medium hover:bg-red-700 cursor-pointer"
              >
                Quitar
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Style or Sticker Tray */}
        {!readingMode && activeTab === 'style' && (
          <div
            className="px-6 py-4 border-t space-y-4 shrink-0"
            style={{ borderColor: paperBorder }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium w-20" style={{ color: paperMuted }}>
                Papel:
              </span>
              {(Object.keys(PAPER_TINTS) as PaperColorId[]).map((id) => {
                const item = PAPER_TINTS[id];
                const selected = note.paperColor === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdate({ ...note, paperColor: id })}
                    aria-label={`Cambiar papel a ${item.name}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs cursor-pointer"
                    style={{
                      borderColor: selected ? theme.accentBg : paperBorder,
                      backgroundColor: selected ? 'rgba(0,0,0,0.08)' : 'transparent',
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border"
                      style={{
                        backgroundColor: id === 'default' ? theme.bgSurface : item.swatchHex,
                        borderColor: paperBorder,
                      }}
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium w-20" style={{ color: paperMuted }}>
                Fuente:
              </span>
              <button
                type="button"
                onClick={() => onUpdate({ ...note, fontFamily: 'studio' })}
                className="px-2.5 py-1 rounded-lg border text-xs cursor-pointer"
                style={{
                  borderColor: note.fontFamily === 'studio' ? theme.accentBg : paperBorder,
                  backgroundColor: note.fontFamily === 'studio' ? 'rgba(0,0,0,0.08)' : 'transparent',
                }}
              >
                Del estudio
              </button>
              {FONT_PRESETS.map((preset) => {
                const active = note.fontFamily === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdate({ ...note, fontFamily: preset.id as NoteFontChoice })
                    }
                    className="px-2.5 py-1 rounded-lg border text-xs cursor-pointer"
                    style={{
                      borderColor: active ? theme.accentBg : paperBorder,
                      backgroundColor: active ? 'rgba(0,0,0,0.08)' : 'transparent',
                      fontFamily: preset.displayFont,
                    }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!readingMode && activeTab === 'stickers' && (
          <div
            className="px-6 py-4 border-t space-y-3 shrink-0"
            style={{ borderColor: paperBorder }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {STICKER_CATEGORIES.map((cat) => {
                  const active = stickerCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setStickerCategory(cat.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      style={{
                        backgroundColor: active ? theme.accentBg : 'transparent',
                        color: active ? theme.accentText : paperMuted,
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: paperMuted }}>
                {note.stickers.length}/20 colocados
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 max-h-36 overflow-y-auto pr-1">
              {filteredStickers.map((stk) => (
                <button
                  key={stk.key}
                  type="button"
                  onClick={() => {
                    const nextStickers = addStickerToNote(note.stickers, stk.key);
                    onUpdate({ ...note, stickers: nextStickers });
                    const last = nextStickers[nextStickers.length - 1];
                    if (last) setSelectedStickerId(last.id);
                  }}
                  title={`Pegar ${stk.label}`}
                  aria-label={`Pegar sticker ${stk.label}`}
                  className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-black/10 transition-transform hover:scale-105 cursor-pointer"
                >
                  {stk.render('w-9 h-9')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Editor Toolbar */}
        {!readingMode && (
          <div
            className="px-6 py-3 border-t flex items-center justify-between gap-4 shrink-0"
            style={{ borderColor: paperBorder }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveTab((prev) => (prev === 'stickers' ? 'none' : 'stickers'))
                }
                aria-expanded={activeTab === 'stickers'}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                style={{
                  borderColor: activeTab === 'stickers' ? theme.accentBg : paperBorder,
                  backgroundColor:
                    activeTab === 'stickers' ? 'rgba(0,0,0,0.08)' : 'transparent',
                }}
              >
                <Smile className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Stickers ({note.stickers.length})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab((prev) => (prev === 'style' ? 'none' : 'style'))
                }
                aria-expanded={activeTab === 'style'}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                style={{
                  borderColor: activeTab === 'style' ? theme.accentBg : paperBorder,
                  backgroundColor:
                    activeTab === 'style' ? 'rgba(0,0,0,0.08)' : 'transparent',
                }}
              >
                <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Papel y fuente</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: theme.accentBg,
                color: theme.accentText,
              }}
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
