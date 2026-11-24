import { DEFAULT_PREFERENCES, PAPER_TINTS, STUDIO_THEMES, SURFACE_TEXTURES, FONT_PRESETS } from '../data/presets';
import { COZY_STICKERS } from '../components/Stickers';
import {
  FontId,
  FontSizeId,
  Note,
  NoteFontChoice,
  PaperColorId,
  PlacedSticker,
  StudioPreferences,
  TextureId,
  ThemeId,
} from '../types/notes';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BIDI_SPOOF_RE = /[\u202A-\u202E\u2066-\u2069]/g;

const VALID_THEME_IDS = new Set<string>(Object.keys(STUDIO_THEMES));
const VALID_TEXTURE_IDS = new Set<string>(SURFACE_TEXTURES.map((t) => t.id));
const VALID_FONT_IDS = new Set<string>(FONT_PRESETS.map((f) => f.id));
const VALID_PAPER_COLORS = new Set<string>(Object.keys(PAPER_TINTS));
const VALID_STICKER_KEYS = new Set<string>(COZY_STICKERS.map((s) => s.key));
const VALID_SECRET_THEMES = new Set<string>(['gameboy-clasica', 'pipboy-verde']);

/**
 * Strips invisible control characters and Unicode BiDi override characters
 * used for spoofing and text-injection attacks.
 */
export function sanitizePlainText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS_RE, '')
    .replace(BIDI_SPOOF_RE, '')
    .slice(0, maxLength);
}

function stripDangerousKeys(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripDangerousKeys(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    out[key] = stripDangerousKeys(val, depth + 1);
  }
  return out;
}

/**
 * Parses JSON safely and strips prototype-pollution keys (`__proto__`, `constructor`, `prototype`).
 */
export function safeJsonParse<T = unknown>(raw: string): T | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2_500_000) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return stripDangerousKeys(parsed) as T;
  } catch {
    return null;
  }
}

/**
 * Blocks `javascript:`, `data:`, `vbscript:`, and unencrypted `http:` URLs.
 */
export function isSafeHttpsUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function sanitizePlacedSticker(raw: unknown): PlacedSticker | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = sanitizePlainText(obj.id, 64);
  const stickerKey = sanitizePlainText(obj.stickerKey, 40);
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  if (!VALID_STICKER_KEYS.has(stickerKey)) return null;

  return {
    id,
    stickerKey,
    x: Math.round(clamp(Number(obj.x ?? 50), 6, 94) * 10) / 10,
    y: Math.round(clamp(Number(obj.y ?? 50), 8, 92) * 10) / 10,
    scale: Math.round(clamp(Number(obj.scale ?? 1), 0.6, 1.8) * 100) / 100,
    rotation: Math.round(clamp(Number(obj.rotation ?? 0), -35, 35)),
  };
}

export function sanitizeNoteRecord(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = sanitizePlainText(obj.id, 128);
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;

  const rawPaper = sanitizePlainText(obj.paperColor, 32);
  const paperColor: PaperColorId = VALID_PAPER_COLORS.has(rawPaper)
    ? (rawPaper as PaperColorId)
    : 'default';

  const rawFont = sanitizePlainText(obj.fontFamily, 32);
  const fontFamily: NoteFontChoice =
    rawFont === 'studio' || VALID_FONT_IDS.has(rawFont)
      ? (rawFont as NoteFontChoice)
      : 'studio';

  const cleanTags: string[] = [];
  if (Array.isArray(obj.tags)) {
    for (const item of obj.tags) {
      const cleaned = sanitizePlainText(item, 32)
        .trim()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ_-]/g, '')
        .toLowerCase();
      if (cleaned && !cleanTags.includes(cleaned) && cleanTags.length < 10) {
        cleanTags.push(cleaned);
      }
    }
  }

  const cleanStickers: PlacedSticker[] = [];
  if (Array.isArray(obj.stickers)) {
    for (const s of obj.stickers) {
      if (cleanStickers.length >= 20) break;
      const valid = sanitizePlacedSticker(s);
      if (valid) cleanStickers.push(valid);
    }
  }

  const now = Date.now();
  const createdAt =
    typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt) && obj.createdAt > 0
      ? obj.createdAt
      : now;
  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) && obj.updatedAt > 0
      ? obj.updatedAt
      : createdAt;

  return {
    id,
    title: sanitizePlainText(obj.title, 160),
    content: sanitizePlainText(obj.content, 20000),
    tags: cleanTags,
    stickers: cleanStickers,
    paperColor,
    fontFamily,
    pinned: Boolean(obj.pinned),
    createdAt,
    updatedAt,
  };
}

export function sanitizeStudioPreferences(raw: unknown): StudioPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_PREFERENCES;
  }
  const obj = raw as Record<string, unknown>;
  const themeId = VALID_THEME_IDS.has(String(obj.themeId))
    ? (String(obj.themeId) as ThemeId)
    : DEFAULT_PREFERENCES.themeId;
  const textureId = VALID_TEXTURE_IDS.has(String(obj.textureId))
    ? (String(obj.textureId) as TextureId)
    : DEFAULT_PREFERENCES.textureId;
  const fontId = VALID_FONT_IDS.has(String(obj.fontId))
    ? (String(obj.fontId) as FontId)
    : DEFAULT_PREFERENCES.fontId;
  const fontSize: FontSizeId =
    obj.fontSize === 'sm' || obj.fontSize === 'lg' ? obj.fontSize : 'md';

  const unlockedThemes: ThemeId[] = [];
  if (Array.isArray(obj.unlockedThemes)) {
    for (const item of obj.unlockedThemes) {
      const id = String(item);
      if (VALID_SECRET_THEMES.has(id) && !unlockedThemes.includes(id as ThemeId)) {
        unlockedThemes.push(id as ThemeId);
      }
    }
  }

  return {
    themeId,
    textureId,
    fontId,
    fontSize,
    unlockedThemes,
  };
}

export interface ValidatedBroadcastNotesMsg {
  type: 'NOTES_UPDATED';
  notes: Note[];
  deletedIds: string[];
}

export interface ValidatedBroadcastPrefsMsg {
  type: 'PREFS_UPDATED';
  preferences: StudioPreferences;
}

/**
 * Validates cross-tab BroadcastChannel payloads so tampered/injected messages are discarded.
 */
export function validateBroadcastMessage(
  raw: unknown
): ValidatedBroadcastNotesMsg | ValidatedBroadcastPrefsMsg | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const cleaned = stripDangerousKeys(raw) as Record<string, unknown>;

  if (cleaned.type === 'NOTES_UPDATED' && Array.isArray(cleaned.notes)) {
    const notes: Note[] = [];
    for (const item of cleaned.notes.slice(0, 500)) {
      const safe = sanitizeNoteRecord(item);
      if (safe) notes.push(safe);
    }
    const deletedIds = Array.isArray(cleaned.deletedIds)
      ? cleaned.deletedIds
          .map((id) => sanitizePlainText(id, 128))
          .filter((id) => /^[a-zA-Z0-9_-]+$/.test(id))
          .slice(0, 500)
      : [];
    return { type: 'NOTES_UPDATED', notes, deletedIds };
  }

  if (cleaned.type === 'PREFS_UPDATED' && cleaned.preferences) {
    return {
      type: 'PREFS_UPDATED',
      preferences: sanitizeStudioPreferences(cleaned.preferences),
    };
  }

  return null;
}

/**
 * Upgrades unencrypted HTTP connections to HTTPS in production to prevent
 * passive packet sniffing and MITM downgrade attacks (leaves local dev untouched).
 */
export function enforceHttpsTransport(): void {
  if (typeof window === 'undefined') return;
  const { protocol, hostname, href } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';
  if (protocol === 'http:' && !isLocal) {
    window.location.replace(href.replace(/^http:/i, 'https:'));
  }
}
