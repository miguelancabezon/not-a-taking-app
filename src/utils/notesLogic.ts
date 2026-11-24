import {
  Note,
  NoteFilter,
  NoteFontChoice,
  PaperColorId,
  PlacedSticker,
  StudioPreferences,
} from '../types/notes';

export const MAX_TITLE_LEN = 160;
export const MAX_CONTENT_LEN = 20000;
export const MAX_TAGS_PER_NOTE = 10;
export const MAX_TAG_LEN = 32;
export const MAX_STICKERS_PER_NOTE = 20;

export function generateSafeId(prefix = 'nota'): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(6);
    globalThis.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${Date.now()}-${hex}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function normalizeTag(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ_-]/g, '')
    .toLowerCase();
  return cleaned.slice(0, MAX_TAG_LEN);
}

export function addTagToList(tags: string[], rawTag: string): string[] {
  const normalized = normalizeTag(rawTag);
  if (!normalized) return tags;
  if (tags.includes(normalized)) return tags;
  if (tags.length >= MAX_TAGS_PER_NOTE) return tags;
  return [...tags, normalized];
}

export function removeTagFromList(tags: string[], tagToRemove: string): string[] {
  return tags.filter((t) => t !== tagToRemove);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampStickerPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(clampNumber(x, 6, 94) * 10) / 10,
    y: Math.round(clampNumber(y, 8, 92) * 10) / 10,
  };
}

export function addStickerToNote(
  stickers: PlacedSticker[],
  stickerKey: string,
  position?: { x: number; y: number }
): PlacedSticker[] {
  if (stickers.length >= MAX_STICKERS_PER_NOTE) return stickers;
  const indexOffset = stickers.length;
  const fallbackX = 82 - (indexOffset % 3) * 14;
  const fallbackY = 18 + Math.floor(indexOffset / 3) * 18;
  const coords = clampStickerPosition(
    position?.x ?? fallbackX,
    position?.y ?? fallbackY
  );
  const rotation = ((indexOffset % 2 === 0 ? 1 : -1) * (4 + (indexOffset * 3) % 10));
  const next: PlacedSticker = {
    id: generateSafeId('stk'),
    stickerKey: stickerKey.slice(0, 40),
    x: coords.x,
    y: coords.y,
    scale: 1,
    rotation,
  };
  return [...stickers, next];
}

export function updateStickerInList(
  stickers: PlacedSticker[],
  stickerId: string,
  patch: Partial<Pick<PlacedSticker, 'x' | 'y' | 'scale' | 'rotation'>>
): PlacedSticker[] {
  return stickers.map((s) => {
    if (s.id !== stickerId) return s;
    const coords = clampStickerPosition(patch.x ?? s.x, patch.y ?? s.y);
    return {
      ...s,
      x: coords.x,
      y: coords.y,
      scale: Math.round(clampNumber(patch.scale ?? s.scale, 0.6, 1.8) * 100) / 100,
      rotation: Math.round(clampNumber(patch.rotation ?? s.rotation, -35, 35)),
    };
  });
}

export function removeStickerFromList(stickers: PlacedSticker[], stickerId: string): PlacedSticker[] {
  return stickers.filter((s) => s.id !== stickerId);
}

export interface CreateNoteInput {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  stickers?: PlacedSticker[];
  paperColor?: PaperColorId;
  fontFamily?: NoteFontChoice;
  pinned?: boolean;
  now?: number;
}

export function createNoteRecord(input: CreateNoteInput): Note {
  const now = input.now ?? Date.now();
  const cleanTags: string[] = [];
  for (const t of input.tags ?? []) {
    const norm = normalizeTag(t);
    if (norm && !cleanTags.includes(norm) && cleanTags.length < MAX_TAGS_PER_NOTE) {
      cleanTags.push(norm);
    }
  }
  return {
    id: input.id && /^[a-zA-Z0-9_-]+$/.test(input.id) ? input.id : generateSafeId('nota'),
    title: input.title.trim().slice(0, MAX_TITLE_LEN),
    content: input.content.slice(0, MAX_CONTENT_LEN),
    tags: cleanTags,
    stickers: (input.stickers ?? []).slice(0, MAX_STICKERS_PER_NOTE),
    paperColor: input.paperColor ?? 'default',
    fontFamily: input.fontFamily ?? 'studio',
    pinned: Boolean(input.pinned),
    createdAt: now,
    updatedAt: now,
  };
}

function foldAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filterAndSortNotes(notes: Note[], filter: NoteFilter): Note[] {
  const q = foldAccents(filter.query.trim());

  const filtered = notes.filter((note) => {
    if (filter.view === 'pinned' && !note.pinned) return false;
    if (filter.view === 'untagged' && note.tags.length > 0) return false;
    if (filter.activeTag && !note.tags.includes(filter.activeTag)) return false;

    if (!q) return true;
    const haystack = foldAccents(
      `${note.title} ${note.content} ${note.tags.join(' ')}`
    );
    return haystack.includes(q);
  });

  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export interface TagCount {
  tag: string;
  count: number;
}

export function extractTagCounts(notes: Note[]): TagCount[] {
  const map = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag, 'es');
    });
}

/**
 * Merges two sets of notes (e.g., local + remote or cross-tab) keeping the
 * newest version of each note by updatedAt, excluding explicitly deleted IDs.
 */
export function mergeSyncedNotes(
  localNotes: Note[],
  remoteNotes: Note[],
  deletedIds: string[] = []
): Note[] {
  const deletedSet = new Set(deletedIds);
  const byId = new Map<string, Note>();

  for (const note of localNotes) {
    if (!deletedSet.has(note.id)) {
      byId.set(note.id, note);
    }
  }

  for (const remote of remoteNotes) {
    if (deletedSet.has(remote.id)) continue;
    const existing = byId.get(remote.id);
    if (!existing || remote.updatedAt >= existing.updatedAt) {
      byId.set(remote.id, remote);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

/**
 * Prepares a strictly bounded Firestore payload matching firebase-blueprint.json
 * and firestore.rules volumetric limits.
 */
export function sanitizeNotePayload(note: Note, ownerId: string) {
  const cleanTags = note.tags
    .map(normalizeTag)
    .filter(Boolean)
    .slice(0, MAX_TAGS_PER_NOTE);

  const cleanStickers = note.stickers.slice(0, MAX_STICKERS_PER_NOTE).map((s) => {
    const coords = clampStickerPosition(s.x, s.y);
    return {
      id: String(s.id).slice(0, 64),
      stickerKey: String(s.stickerKey).slice(0, 40),
      x: coords.x,
      y: coords.y,
      scale: clampNumber(Number(s.scale) || 1, 0.6, 1.8),
      rotation: Math.round(clampNumber(Number(s.rotation) || 0, -35, 35)),
    };
  });

  return {
    ownerId: ownerId.slice(0, 128),
    title: note.title.slice(0, MAX_TITLE_LEN),
    content: note.content.slice(0, MAX_CONTENT_LEN),
    tags: cleanTags,
    stickers: cleanStickers,
    paperColor: String(note.paperColor || 'default').slice(0, 32),
    fontFamily: String(note.fontFamily || 'studio').slice(0, 32),
    pinned: Boolean(note.pinned),
  };
}

export function sanitizePreferencesPayload(prefs: StudioPreferences, ownerId: string) {
  const validSize = prefs.fontSize === 'sm' || prefs.fontSize === 'lg' ? prefs.fontSize : 'md';
  const cleanUnlocked = Array.from(
    new Set((prefs.unlockedThemes ?? []).map((id) => String(id).slice(0, 32)).filter(Boolean))
  ).slice(0, 10);
  return {
    ownerId: ownerId.slice(0, 128),
    themeId: String(prefs.themeId).slice(0, 32),
    textureId: String(prefs.textureId).slice(0, 32),
    fontId: String(prefs.fontId).slice(0, 32),
    fontSize: validSize,
    unlockedThemes: cleanUnlocked,
  };
}

export function resolveModeSwitchTheme(
  targetMode: 'light' | 'dark',
  lastLightThemeId: string,
  lastDarkThemeId: string
): string {
  return targetMode === 'light' ? lastLightThemeId : lastDarkThemeId;
}

export function formatRelativeTimeEs(timestampMs: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 15) return 'ahora mismo';
  if (diffSec < 60) return `hace ${diffSec} s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour} h`;
  const date = new Date(timestampMs);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
