import { ThemeId } from '../types/notes';

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 240;
export const PADDLE_WIDTH = 54;
export const PADDLE_HEIGHT = 10;
export const PADDLE_Y = 214;
export const PADDLE_SPEED = 230;
export const GAMEBOY_UNLOCK_SCORE = 5;
export const PIPBOY_UNLOCK_SCORE = 10;

export type FallingItemKind = 'star' | 'cartridge' | 'glitch';

export interface FallingItem {
  id: number;
  kind: FallingItemKind;
  x: number;
  y: number;
  size: number;
  vy: number;
}

export type RetroGamePhase = 'title' | 'playing' | 'gameover';

export interface RetroGameState {
  phase: RetroGamePhase;
  paddleX: number;
  score: number;
  lives: number;
  items: FallingItem[];
  spawnTimer: number;
  nextItemId: number;
  elapsed: number;
}

export interface RetroGameInput {
  left: boolean;
  right: boolean;
}

export function createInitialRetroGame(phase: RetroGamePhase = 'title'): RetroGameState {
  return {
    phase,
    paddleX: (GAME_WIDTH - PADDLE_WIDTH) / 2,
    score: 0,
    lives: 3,
    items: [],
    spawnTimer: 0.25,
    nextItemId: 1,
    elapsed: 0,
  };
}

export function getNewlyUnlockedThemes(
  score: number,
  alreadyUnlocked: ThemeId[]
): ThemeId[] {
  const unlocked: ThemeId[] = [];
  if (score >= GAMEBOY_UNLOCK_SCORE && !alreadyUnlocked.includes('gameboy-clasica')) {
    unlocked.push('gameboy-clasica');
  }
  if (score >= PIPBOY_UNLOCK_SCORE && !alreadyUnlocked.includes('pipboy-verde')) {
    unlocked.push('pipboy-verde');
  }
  return unlocked;
}

export function stepRetroGame(
  state: RetroGameState,
  input: RetroGameInput,
  rawDt: number,
  rng: () => number = Math.random
): RetroGameState {
  if (state.phase !== 'playing') return state;

  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  let paddleX = state.paddleX;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  paddleX += dir * PADDLE_SPEED * dt;
  paddleX = Math.max(8, Math.min(GAME_WIDTH - PADDLE_WIDTH - 8, paddleX));

  let score = state.score;
  let lives = state.lives;
  let nextItemId = state.nextItemId;
  let spawnTimer = state.spawnTimer - dt;
  const elapsed = state.elapsed + dt;

  const items: FallingItem[] = [];
  for (const item of state.items) {
    const nextY = item.y + item.vy * dt;
    const hitVertical =
      nextY + item.size >= PADDLE_Y && nextY <= PADDLE_Y + PADDLE_HEIGHT;
    const hitHorizontal =
      item.x + item.size >= paddleX && item.x <= paddleX + PADDLE_WIDTH;

    if (hitVertical && hitHorizontal) {
      if (item.kind === 'star') {
        score += 1;
      } else if (item.kind === 'cartridge') {
        score += 2;
      } else {
        lives = Math.max(0, lives - 1);
      }
      continue;
    }

    if (nextY > GAME_HEIGHT + 16) {
      continue;
    }

    items.push({ ...item, y: nextY });
  }

  if (spawnTimer <= 0 && lives > 0) {
    const roll = rng();
    const kind: FallingItemKind =
      roll < 0.18 ? 'glitch' : roll < 0.34 ? 'cartridge' : 'star';
    const size = kind === 'cartridge' ? 14 : 12;
    const x = 14 + rng() * (GAME_WIDTH - 28 - size);
    const speedBoost = Math.min(75, elapsed * 2.2);
    const baseSpeed = kind === 'cartridge' ? 128 : kind === 'glitch' ? 118 : 102;

    items.push({
      id: nextItemId++,
      kind,
      x,
      y: -size,
      size,
      vy: baseSpeed + speedBoost,
    });
    spawnTimer = Math.max(0.38, 0.78 - elapsed * 0.012);
  }

  const nextPhase: RetroGamePhase = lives <= 0 ? 'gameover' : 'playing';

  return {
    phase: nextPhase,
    paddleX,
    score,
    lives,
    items,
    spawnTimer,
    nextItemId,
    elapsed,
  };
}
