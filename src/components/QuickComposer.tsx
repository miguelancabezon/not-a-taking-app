import React, { useState } from 'react';
import { Hash, Palette, Pin, Plus, Smile, X } from 'lucide-react';
import { PAPER_TINTS, SUGGESTED_TAGS } from '../data/presets';
import { PaperColorId, PlacedSticker, StudioThemeConfig } from '../types/notes';
import {
  addStickerToNote,
  addTagToList,
  CreateNoteInput,
  removeStickerFromList,
  removeTagFromList,
} from '../utils/notesLogic';
import { COZY_STICKERS, getStickerByKey } from './Stickers';

interface QuickComposerProps {
  theme: StudioThemeConfig;
  onCreateNote: (input: CreateNoteInput) => void;
}

export const QuickComposer: React.FC<QuickComposerProps> = ({ theme, onCreateNote }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [paperColor, setPaperColor] = useState<PaperColorId>('default');
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [pinned, setPinned] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPapers, setShowPapers] = useState(false);

  const tint = PAPER_TINTS[paperColor];
  const cardBg =
    paperColor === 'default'
      ? theme.bgSurface
      : theme.isDark
      ? tint.darkBg
      : tint.lightBg;
  const cardBorder =
    paperColor === 'default'
      ? theme.borderSubtle
      : theme.isDark
      ? tint.darkBorder
      : tint.lightBorder;
  const cardText =
    paperColor === 'default'
      ? theme.textPrimary
      : theme.isDark
      ? tint.darkText
      : tint.lightText;
  const cardMuted =
    paperColor === 'default'
      ? theme.textMuted
      : theme.isDark
      ? tint.darkMuted
      : tint.lightMuted;

  const handleAddTag = (raw: string) => {
    const next = addTagToList(tags, raw);
    if (next !== tags) {
      setTags(next);
      setTagDraft('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    const finalTags = tagDraft.trim() ? addTagToList(tags, tagDraft) : tags;
    onCreateNote({
      title: title.trim() || 'Nota sin título',
      content: content.trim(),
      tags: finalTags,
      stickers,
      paperColor,
      pinned,
    });
    setTitle('');
    setContent('');
    setTags([]);
    setTagDraft('');
    setStickers([]);
    setPaperColor('default');
    setPinned(false);
    setShowStickers(false);
    setShowPapers(false);
    setExpanded(false);
  };

  return (
    <section aria-label="Crear nueva nota">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border p-5 sm:p-6 transition-colors duration-200"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: cardText,
        }}
      >
        {/* Preview of attached stickers on the composer */}
        {stickers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {stickers.map((stk) => {
              const def = getStickerByKey(stk.stickerKey);
              return (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => setStickers((prev) => removeStickerFromList(prev, stk.id))}
                  title={`Quitar sticker ${def.label}`}
                  aria-label={`Quitar sticker ${def.label}`}
                  className="group relative p-1 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                >
                  {def.render('w-9 h-9')}
                  <span className="sr-only">Quitar</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <input
            type="text"
            value={title}
            onFocus={() => setExpanded(true)}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la nota..."
            aria-label="Título de la nota"
            maxLength={160}
            className="w-full bg-transparent font-studio-display text-xl sm:text-2xl font-semibold placeholder:opacity-55 focus:outline-none"
            style={{ color: cardText }}
          />
          {expanded && (
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              aria-label={pinned ? 'Desfijar nota nueva' : 'Fijar nota nueva'}
              aria-pressed={pinned}
              className="p-2 rounded-lg transition-colors shrink-0 cursor-pointer"
              style={{
                color: pinned ? theme.accentBg : cardMuted,
                backgroundColor: pinned ? 'rgba(0,0,0,0.12)' : 'transparent',
              }}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
        </div>

        <textarea
          value={content}
          onFocus={() => setExpanded(true)}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe una idea, lista o pensamiento..."
          aria-label="Contenido de la nota"
          rows={expanded ? 4 : 2}
          maxLength={20000}
          className="mt-2.5 w-full resize-y bg-transparent font-studio-body text-[15px] sm:text-base leading-relaxed placeholder:opacity-55 focus:outline-none"
          style={{ color: cardText }}
        />

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: cardBorder }}>
            {/* Tag Composer */}
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((prev) => removeTagFromList(prev, tag))}
                  aria-label={`Quitar etiqueta ${tag}`}
                  className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-75 cursor-pointer"
                  style={{ color: cardMuted }}
                >
                  <span>#{tag}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}

              <div className="inline-flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 opacity-60" style={{ color: cardMuted }} aria-hidden="true" />
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
                  aria-label="Añadir etiqueta"
                  maxLength={32}
                  className="w-32 bg-transparent text-xs placeholder:opacity-55 focus:outline-none"
                  style={{ color: cardText }}
                />
                {tagDraft.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagDraft)}
                    className="text-xs font-medium underline underline-offset-2 cursor-pointer"
                    style={{ color: theme.accentBg }}
                  >
                    Añadir
                  </button>
                )}
              </div>
            </div>

            {/* Suggested quick tags */}
            {tags.length < 4 && (
              <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: cardMuted }}>
                <span>Sugeridas:</span>
                {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleAddTag(t)}
                    className="hover:underline underline-offset-2 cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Paper color selector */}
            {showPapers && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="text-xs mr-1" style={{ color: cardMuted }}>
                  Papel:
                </span>
                {(Object.keys(PAPER_TINTS) as PaperColorId[]).map((id) => {
                  const item = PAPER_TINTS[id];
                  const selected = paperColor === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaperColor(id)}
                      aria-label={`Papel ${item.name}`}
                      aria-pressed={selected}
                      title={item.name}
                      className="w-6 h-6 rounded-full border transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        backgroundColor:
                          id === 'default' ? theme.bgSurface : item.swatchHex,
                        borderColor: selected ? theme.accentBg : cardBorder,
                        boxShadow: selected ? `0 0 0 2px ${theme.accentBg}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Sticker tray */}
            {showStickers && (
              <div
                className="pt-2 border-t grid grid-cols-6 sm:grid-cols-9 gap-1.5"
                style={{ borderColor: cardBorder }}
              >
                {COZY_STICKERS.map((sticker) => (
                  <button
                    key={sticker.key}
                    type="button"
                    onClick={() =>
                      setStickers((prev) => addStickerToNote(prev, sticker.key))
                    }
                    title={sticker.label}
                    aria-label={`Añadir sticker ${sticker.label}`}
                    className="flex items-center justify-center p-1.5 rounded-lg hover:bg-black/10 transition-transform hover:scale-110 cursor-pointer"
                  >
                    {sticker.render('w-8 h-8')}
                  </button>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPapers((v) => !v);
                    setShowStickers(false);
                  }}
                  aria-expanded={showPapers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors cursor-pointer"
                  style={{ color: cardMuted }}
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Papel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowStickers((v) => !v);
                    setShowPapers(false);
                  }}
                  aria-expanded={showStickers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors cursor-pointer"
                  style={{ color: cardMuted }}
                >
                  <Smile className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Stickers</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors cursor-pointer"
                  style={{ color: cardMuted }}
                >
                  Contraer
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() && !content.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-45 cursor-pointer"
                  style={{
                    backgroundColor: theme.accentBg,
                    color: theme.accentText,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Añadir nota</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  );
};
