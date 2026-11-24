import React from 'react';
import { Pin, Trash2 } from 'lucide-react';
import { FONT_PRESETS, PAPER_TINTS } from '../data/presets';
import { Note, StudioThemeConfig } from '../types/notes';
import { formatRelativeTimeEs } from '../utils/notesLogic';
import { getStickerByKey } from './Stickers';

interface NoteCardProps {
  note: Note;
  theme: StudioThemeConfig;
  studioFontClass: string;
  onOpen: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onSelectTag: (tag: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  theme,
  studioFontClass,
  onOpen,
  onTogglePin,
  onDelete,
  onSelectTag,
}) => {
  const tint = PAPER_TINTS[note.paperColor] ?? PAPER_TINTS.default;
  const isDefaultPaper = note.paperColor === 'default';

  const cardBg = isDefaultPaper
    ? theme.bgSurface
    : theme.isDark
    ? tint.darkBg
    : tint.lightBg;
  const cardBorder = isDefaultPaper
    ? theme.borderSubtle
    : theme.isDark
    ? tint.darkBorder
    : tint.lightBorder;
  const cardText = isDefaultPaper
    ? theme.textPrimary
    : theme.isDark
    ? tint.darkText
    : tint.lightText;
  const cardMuted = isDefaultPaper
    ? theme.textMuted
    : theme.isDark
    ? tint.darkMuted
    : tint.lightMuted;

  const fontClass =
    note.fontFamily === 'studio'
      ? studioFontClass
      : FONT_PRESETS.find((f) => f.id === note.fontFamily)?.className ?? studioFontClass;

  return (
    <article
      className={`group relative rounded-2xl border p-5 sm:p-6 flex flex-col justify-between min-h-[210px] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 ${fontClass}`}
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: cardText,
      }}
    >
      {/* Main clickable opening button with dedicated sticker corner */}
      <div className="relative z-10">
        <button
          type="button"
          onClick={() => onOpen(note)}
          className="w-full text-left focus:outline-none cursor-pointer"
          aria-label={`Abrir nota ${note.title || 'sin título'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-studio-display text-xl sm:text-[22px] font-semibold leading-snug line-clamp-2 min-w-0">
              {note.title || 'Nota sin título'}
            </h3>

            {note.stickers.length > 0 && (
              <div
                aria-hidden="true"
                className="flex items-center shrink-0 -space-x-1.5 pt-0.5"
              >
                {note.stickers.slice(0, 3).map((stk, idx) => {
                  const def = getStickerByKey(stk.stickerKey);
                  const tilt = idx % 2 === 0 ? -6 : 6;
                  return (
                    <span
                      key={stk.id}
                      className="inline-flex items-center justify-center drop-shadow-xs"
                      style={{ transform: `rotate(${tilt}deg)` }}
                    >
                      {def.render('w-8 h-8')}
                    </span>
                  );
                })}
                {note.stickers.length > 3 && (
                  <span
                    className="pl-2 text-[11px] font-medium tabular-nums"
                    style={{ color: cardMuted }}
                  >
                    +{note.stickers.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {note.content && (
            <p
              className="mt-2.5 font-studio-body text-[14.5px] leading-relaxed whitespace-pre-line line-clamp-5"
              style={{ color: cardMuted }}
            >
              {note.content.startsWith('__E2EE_V1__:')
                ? 'Nota protegida con cifrado AES-256-GCM. Abre Sincronización para desbloquear con tu clave maestra.'
                : note.content}
            </p>
          )}
        </button>
      </div>

      {/* Footer metadata (unboxed zero-pill typography + quiet actions) */}
      <div
        className="relative z-10 mt-5 pt-3 border-t flex items-center justify-between gap-3 text-xs"
        style={{ borderColor: cardBorder, color: cardMuted }}
      >
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 min-w-0">
          {note.tags.length > 0 ? (
            note.tags.slice(0, 3).map((tag, idx) => (
              <React.Fragment key={tag}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  className="hover:underline underline-offset-2 truncate max-w-[110px] cursor-pointer"
                >
                  #{tag}
                </button>
              </React.Fragment>
            ))
          ) : (
            <span className="tabular-nums">{formatRelativeTimeEs(note.updatedAt)}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onTogglePin(note)}
            aria-label={note.pinned ? `Desfijar ${note.title}` : `Fijar ${note.title}`}
            aria-pressed={note.pinned}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            style={{ color: note.pinned ? theme.accentBg : cardMuted }}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            aria-label={`Eliminar ${note.title || 'nota'}`}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-75 group-hover:opacity-100 cursor-pointer"
            style={{ color: cardMuted }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
