export type ThemeId =
  | 'pizarra-nocturna'
  | 'miel-canela'
  | 'caramelo-tostado'
  | 'gameboy-clasica'
  | 'atardecer-otono'
  | 'noche-estrellada'
  | 'pipboy-verde';

export type TextureId = 'plain' | 'dots' | 'lined' | 'grid' | 'grain';

export type FontId = 'editorial' | 'moderna' | 'manuscrita' | 'maquina';

export type NoteFontChoice = 'studio' | FontId;

export type FontSizeId = 'sm' | 'md' | 'lg';

export type PaperColorId =
  | 'default'
  | 'crema'
  | 'salvia'
  | 'lavanda'
  | 'melocoton'
  | 'cielo';

export interface PlacedSticker {
  id: string;
  stickerKey: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  scale: number; // 0.6..1.8
  rotation: number; // degrees -35..35
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  stickers: PlacedSticker[];
  paperColor: PaperColorId;
  fontFamily: NoteFontChoice;
  pinned: boolean;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface StudioPreferences {
  themeId: ThemeId;
  textureId: TextureId;
  fontId: FontId;
  fontSize: FontSizeId;
  unlockedThemes: ThemeId[];
}

export type SyncState = 'local-only' | 'syncing' | 'synced' | 'offline' | 'error';

export interface NoteFilter {
  query: string;
  activeTag: string | null;
  view: 'all' | 'pinned' | 'untagged';
}

export interface StudioThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  isDark: boolean;
  lockedByGame?: boolean;
  unlockRequirement?: string;
  bgCanvas: string;
  bgSurface: string;
  bgElevated: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  textureInk: string;
  swatchColors: [string, string, string];
}

export interface PaperTintConfig {
  id: PaperColorId;
  name: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
  darkMuted: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  lightMuted: string;
  swatchHex: string;
}
