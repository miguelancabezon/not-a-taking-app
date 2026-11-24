import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Gamepad2, RotateCcw, Sparkles, X } from 'lucide-react';
import { StudioThemeConfig, ThemeId } from '../types/notes';
import {
  createInitialRetroGame,
  GAME_HEIGHT,
  GAME_WIDTH,
  GAMEBOY_UNLOCK_SCORE,
  getNewlyUnlockedThemes,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  PIPBOY_UNLOCK_SCORE,
  RetroGamePhase,
  RetroGameState,
  stepRetroGame,
} from '../utils/retroGameLogic';

interface RetroUnlockModalProps {
  open: boolean;
  theme: StudioThemeConfig;
  unlockedThemes: ThemeId[];
  onUnlockThemes: (themes: ThemeId[]) => void;
  onApplyTheme: (themeId: ThemeId) => void;
  onClose: () => void;
}

export const RetroUnlockModal: React.FC<RetroUnlockModalProps> = ({
  open,
  theme,
  unlockedThemes,
  onUnlockThemes,
  onApplyTheme,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RetroGameState>(createInitialRetroGame('title'));
  const inputRef = useRef({ left: false, right: false });
  const unlockedRef = useRef<ThemeId[]>(unlockedThemes);
  unlockedRef.current = unlockedThemes;

  const [hud, setHud] = useState<{
    phase: RetroGamePhase;
    score: number;
    lives: number;
  }>({
    phase: 'title',
    score: 0,
    lives: 3,
  });

  const drawFrame = useCallback((state: RetroGameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Shift palette live from Game Boy DMG-01 olive to Pip-Boy CRT green once >= 5 pts
    const isPipboyStage = state.score >= GAMEBOY_UNLOCK_SCORE;
    const bg = isPipboyStage ? '#061108' : '#9BBC0F';
    const midLight = isPipboyStage ? '#0E2613' : '#8BAC0F';
    const midDark = isPipboyStage ? '#28B44D' : '#306230';
    const ink = isPipboyStage ? '#4AF678' : '#0F380F';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Subtle pixel grid
    ctx.fillStyle = midLight;
    for (let y = 26; y < GAME_HEIGHT; y += 16) {
      ctx.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Top HUD strip inside screen
    ctx.fillStyle = midDark;
    ctx.fillRect(0, 0, GAME_WIDTH, 24);
    ctx.fillStyle = bg;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`PTS:${String(state.score).padStart(2, '0')}`, 10, 12);

    ctx.textAlign = 'center';
    ctx.fillText(isPipboyStage ? 'PIP-BOY CRT' : 'DMG-01 LCD', GAME_WIDTH / 2, 12);

    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(Math.max(0, state.lives)), GAME_WIDTH - 10, 12);

    // Falling items
    for (const item of state.items) {
      const ix = Math.round(item.x);
      const iy = Math.round(item.y);
      const sz = item.size;

      if (item.kind === 'star') {
        ctx.fillStyle = ink;
        ctx.fillRect(ix + 4, iy, 4, sz);
        ctx.fillRect(ix, iy + 4, sz, 4);
        ctx.fillStyle = midDark;
        ctx.fillRect(ix + 2, iy + 2, sz - 4, sz - 4);
      } else if (item.kind === 'cartridge') {
        ctx.fillStyle = ink;
        ctx.fillRect(ix, iy, sz, sz);
        ctx.fillStyle = bg;
        ctx.fillRect(ix + 2, iy + 2, sz - 4, 5);
        ctx.fillStyle = midDark;
        ctx.fillRect(ix + 3, iy + 9, sz - 6, 3);
      } else {
        // Glitch skull/bug
        ctx.fillStyle = midDark;
        ctx.fillRect(ix, iy, sz, sz);
        ctx.fillStyle = bg;
        ctx.fillRect(ix + 2, iy + 2, 3, 3);
        ctx.fillRect(ix + sz - 5, iy + 2, 3, 3);
        ctx.fillRect(ix + 3, iy + sz - 4, sz - 6, 2);
      }
    }

    // Player pixel paddle
    const px = Math.round(state.paddleX);
    ctx.fillStyle = ink;
    ctx.fillRect(px, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = midDark;
    ctx.fillRect(px + 2, PADDLE_Y + 2, PADDLE_WIDTH - 4, 3);
  }, []);

  const startGame = useCallback(() => {
    inputRef.current = { left: false, right: false };
    const next = createInitialRetroGame('playing');
    stateRef.current = next;
    setHud({ phase: 'playing', score: 0, lives: 3 });
    drawFrame(next);
  }, [drawFrame]);

  useEffect(() => {
    if (!open) return;
    stateRef.current = createInitialRetroGame('title');
    inputRef.current = { left: false, right: false };
    setHud({ phase: 'title', score: 0, lives: 3 });
    drawFrame(stateRef.current);

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (stateRef.current.phase === 'playing') {
        const next = stepRetroGame(stateRef.current, inputRef.current, dt);
        const prev = stateRef.current;
        stateRef.current = next;

        if (
          next.score !== prev.score ||
          next.lives !== prev.lives ||
          next.phase !== prev.phase
        ) {
          setHud({
            phase: next.phase,
            score: next.score,
            lives: next.lives,
          });
          const newlyUnlocked = getNewlyUnlockedThemes(
            next.score,
            unlockedRef.current
          );
          if (newlyUnlocked.length > 0) {
            onUnlockThemes(newlyUnlocked);
          }
        }
      }

      drawFrame(stateRef.current);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        stateRef.current.phase !== 'playing'
      ) {
        e.preventDefault();
        startGame();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputRef.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.right = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputRef.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.right = false;
      }
    };

    const clearInputs = () => {
      inputRef.current = { left: false, right: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
    };
  }, [open, drawFrame, onClose, onUnlockThemes, startGame]);

  if (!open) return null;

  const hasGameboy = unlockedThemes.includes('gameboy-clasica');
  const hasPipboy = unlockedThemes.includes('pipboy-verde');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="retro-game-title"
        className="w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4"
        style={{
          backgroundColor: theme.bgSurface,
          borderColor: theme.borderSubtle,
          color: theme.textPrimary,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 shrink-0" style={{ color: theme.accentBg }} aria-hidden="true" />
            <div>
              <h2 id="retro-game-title" className="font-studio-display text-xl sm:text-2xl font-semibold">
                Cartucho secreto · Caza-Bits
              </h2>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                5 pts: Game Boy Clásica · 10 pts: Pip-Boy 3000
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar minijuego secreto"
            className="p-2 rounded-lg hover:bg-black/15 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Handheld Bezel + Canvas */}
        <div
          className="relative rounded-xl p-3 border"
          style={{
            backgroundColor: '#2A2D32',
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <div className="relative rounded-lg overflow-hidden border-2 border-[#17191C]">
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              data-testid="retro-game-canvas"
              className="w-full h-auto block"
              style={{ imageRendering: 'pixelated' }}
            />

            {hud.phase === 'title' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#9BBC0F]/95 text-[#0F380F]">
                <p className="font-mono text-lg font-bold tracking-tight">
                  CAZA-BITS 1989
                </p>
                <p className="font-mono text-[11px] mt-2 max-w-[240px] leading-snug">
                  Atrapa estrellas (+1) y cartuchos (+2). Esquiva los fallos.
                </p>
                <button
                  type="button"
                  data-start="true"
                  onClick={startGame}
                  className="mt-4 px-4 py-2 rounded font-mono text-xs font-bold bg-[#0F380F] text-[#9BBC0F] hover:opacity-90 cursor-pointer"
                >
                  EMPEZAR PARTIDA
                </button>
                <p className="font-mono text-[10px] mt-2 opacity-80">
                  Teclas ← → / A D o botones inferiores
                </p>
              </div>
            )}

            {hud.phase === 'gameover' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#061108]/92 text-[#4AF678]">
                <p className="font-mono text-lg font-bold">FIN DE PARTIDA</p>
                <p className="font-mono text-xs mt-1 tabular-nums">
                  Puntuación final: {hud.score} pts
                </p>
                <button
                  type="button"
                  data-start="true"
                  onClick={startGame}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded font-mono text-xs font-bold bg-[#3DF56E] text-[#041107] hover:opacity-90 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>REINTENTAR</span>
                </button>
              </div>
            )}
          </div>

          {/* Tactile On-Screen D-Pad Controls */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Mover izquierda"
                onPointerDown={() => {
                  inputRef.current.left = true;
                }}
                onPointerUp={() => {
                  inputRef.current.left = false;
                }}
                onPointerLeave={() => {
                  inputRef.current.left = false;
                }}
                onPointerCancel={() => {
                  inputRef.current.left = false;
                }}
                className="w-11 h-10 flex items-center justify-center rounded-lg bg-[#1A1C20] text-[#E5E7EB] border border-white/10 active:translate-y-0.5 cursor-pointer select-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Mover derecha"
                onPointerDown={() => {
                  inputRef.current.right = true;
                }}
                onPointerUp={() => {
                  inputRef.current.right = false;
                }}
                onPointerLeave={() => {
                  inputRef.current.right = false;
                }}
                onPointerCancel={() => {
                  inputRef.current.right = false;
                }}
                className="w-11 h-10 flex items-center justify-center rounded-lg bg-[#1A1C20] text-[#E5E7EB] border border-white/10 active:translate-y-0.5 cursor-pointer select-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-right font-mono text-[11px] text-[#B8C0CC] tabular-nums">
              <span>{hud.score} pts</span>
              <span className="mx-1.5">·</span>
              <span>
                {hud.score >= PIPBOY_UNLOCK_SCORE
                  ? '¡Todo desbloqueado!'
                  : hud.score >= GAMEBOY_UNLOCK_SCORE
                  ? 'Faltan ' + (PIPBOY_UNLOCK_SCORE - hud.score) + ' para Pip-Boy'
                  : 'Faltan ' + (GAMEBOY_UNLOCK_SCORE - hud.score) + ' para Game Boy'}
              </span>
            </div>
          </div>
        </div>

        {/* Unlock Rewards Bar */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              className="rounded-xl border p-3 flex items-center justify-between gap-2"
              style={{
                borderColor: hasGameboy ? '#9BBC0F' : theme.borderSubtle,
                backgroundColor: hasGameboy ? '#9BBC0F' : theme.bgElevated,
                color: hasGameboy ? '#0F380F' : theme.textMuted,
              }}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Game Boy Clásica</p>
                <p className="text-[11px] truncate">
                  {hasGameboy ? 'Desbloqueado' : `Requiere ${GAMEBOY_UNLOCK_SCORE} pts`}
                </p>
              </div>
              {hasGameboy && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyTheme('gameboy-clasica');
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0F380F] text-[#9BBC0F] shrink-0 cursor-pointer"
                >
                  Usar
                </button>
              )}
            </div>

            <div
              className="rounded-xl border p-3 flex items-center justify-between gap-2"
              style={{
                borderColor: hasPipboy ? '#3DF56E' : theme.borderSubtle,
                backgroundColor: hasPipboy ? '#061108' : theme.bgElevated,
                color: hasPipboy ? '#4AF678' : theme.textMuted,
              }}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Pip-Boy 3000</p>
                <p className="text-[11px] truncate">
                  {hasPipboy ? 'Desbloqueado' : `Requiere ${PIPBOY_UNLOCK_SCORE} pts`}
                </p>
              </div>
              {hasPipboy && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyTheme('pipboy-verde');
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#3DF56E] text-[#041107] shrink-0 cursor-pointer"
                >
                  Usar
                </button>
              )}
            </div>
          </div>

          {(hasGameboy || hasPipboy) && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: theme.textMuted }}>
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: theme.accentBg }} aria-hidden="true" />
              <span>Los temas desbloqueados quedan guardados en tu estudio y se sincronizan.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
