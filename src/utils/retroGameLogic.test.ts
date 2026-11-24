import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialRetroGame,
  GAME_WIDTH,
  getNewlyUnlockedThemes,
  PADDLE_WIDTH,
  PADDLE_Y,
  stepRetroGame,
} from './retroGameLogic';

test('getNewlyUnlockedThemes unlocks Game Boy at 5 pts and Pip-Boy at 10 pts', () => {
  assert.deepEqual(getNewlyUnlockedThemes(4, []), []);
  assert.deepEqual(getNewlyUnlockedThemes(5, []), ['gameboy-clasica']);
  assert.deepEqual(getNewlyUnlockedThemes(10, ['gameboy-clasica']), ['pipboy-verde']);
  assert.deepEqual(getNewlyUnlockedThemes(12, []), ['gameboy-clasica', 'pipboy-verde']);
  assert.deepEqual(
    getNewlyUnlockedThemes(12, ['gameboy-clasica', 'pipboy-verde']),
    []
  );
});

test('stepRetroGame clamps paddle within screen bounds and catches items', () => {
  let state = createInitialRetroGame('playing');
  for (let i = 0; i < 40; i++) {
    state = stepRetroGame(state, { left: true, right: false }, 0.05, () => 0.9);
  }
  assert.equal(state.paddleX, 8);

  for (let i = 0; i < 60; i++) {
    state = stepRetroGame(state, { left: false, right: true }, 0.05, () => 0.9);
  }
  assert.equal(state.paddleX, GAME_WIDTH - PADDLE_WIDTH - 8);

  // Place a cartridge right above paddle
  const catchBase = createInitialRetroGame('playing');
  state = {
    ...catchBase,
    items: [{ id: 99, kind: 'cartridge', x: catchBase.paddleX + 10, y: PADDLE_Y - 2, size: 14, vy: 120 }],
  };
  const afterCatch = stepRetroGame(
    state,
    { left: false, right: false },
    0.05,
    () => 0.9
  );
  assert.equal(afterCatch.score, 2);
});

test('stepRetroGame triggers gameover when 3 glitches hit paddle', () => {
  const base = createInitialRetroGame('playing');
  const withGlitches = {
    ...base,
    lives: 1,
    items: [{ id: 1, kind: 'glitch' as const, x: base.paddleX + 10, y: PADDLE_Y - 2, size: 12, vy: 120 }],
  };
  const ended = stepRetroGame(withGlitches, { left: false, right: false }, 0.05, () => 0.9);
  assert.equal(ended.lives, 0);
  assert.equal(ended.phase, 'gameover');
});
