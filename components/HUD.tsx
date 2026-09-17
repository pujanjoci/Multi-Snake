'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameState, SnakePlayer } from '../lib/types';
import { Trophy, Volume2, VolumeX, Zap, Users, ShieldAlert, Sparkles, MapPin, X } from 'lucide-react';
import { soundManager } from '../lib/audio';

interface HUDProps {
  gameState: GameState;
  myPlayerId: string;
  onSendEmote: (symbol: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const EMOTE_LIST = ['👑', '🔥', '🐍', '⚡', '💀', '💎', '🍎', '🚀'];

export const HUD: React.FC<HUDProps> = ({
  gameState,
  myPlayerId,
  onSendEmote,
  isMuted,
  onToggleMute,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileMinimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showMobileStats, setShowMobileStats] = useState(false);

  const myPlayer = gameState.players[myPlayerId] as SnakePlayer | undefined;
  const sortedPlayers = Object.values(gameState.players).sort(
    (a, b) => b.score - a.score || b.kills - a.kills
  );

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = gameState.config.sessionDuration;
  const timeRemaining = gameState.timeRemaining;
  const progress = Math.max(0, Math.min(1, timeRemaining / totalDuration));

  // Determine timer urgency
  const isUrgent = timeRemaining <= 30;
  const isWarning = timeRemaining <= 120 && timeRemaining > 30;

  // Render Minimap
  useEffect(() => {
    const drawMap = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width: gridW, height: gridH } = gameState.config.gridSize;
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // Clear
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Border
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvasW, canvasH);

      const scaleX = canvasW / gridW;
      const scaleY = canvasH / gridH;

      // Draw Foods
      gameState.foods.forEach((food) => {
        ctx.fillStyle =
          food.type === 'GOLDEN'
            ? '#fbbf24'
            : food.type !== 'REGULAR'
            ? '#a855f7'
            : '#ef4444';
        ctx.fillRect(food.x * scaleX, food.y * scaleY, scaleX * 0.9, scaleY * 0.9);
      });

      // Draw Snakes
      Object.values(gameState.players).forEach((player) => {
        if (!player.isAlive) return;
        ctx.fillStyle = player.color;
        player.body.forEach((seg, idx) => {
          const size = idx === 0 ? scaleX * 1.5 : scaleX * 0.9;
          ctx.fillRect(seg.x * scaleX, seg.y * scaleY, size, size);
        });
      });
    };

    drawMap(minimapCanvasRef.current);
    drawMap(mobileMinimapCanvasRef.current);
  }, [gameState]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-6 select-none font-sans">
      {/* Top Bar: Session Timer, Stats, Controls */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Left: Player Status & Score */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {myPlayer && (
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/85 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl backdrop-blur-md">
              <div
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full shadow-md shrink-0"
                style={{ backgroundColor: myPlayer.color }}
              />
              <div className="flex flex-col">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate max-w-[90px] sm:max-w-[120px]">
                  {myPlayer.name}
                </span>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-white">
                  <span>Score: {myPlayer.score}</span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-amber-400 hidden sm:inline">Kills: {myPlayer.kills}</span>
                </div>
              </div>

              {/* Active Power-up Badge */}
              {myPlayer.activePowerUp && (
                <div className="ml-1 sm:ml-2 flex items-center gap-1 rounded-lg bg-indigo-500/20 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-indigo-300 border border-indigo-500/40 animate-pulse">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{myPlayer.activePowerUp.type}</span>
                </div>
              )}
            </div>
          )}

          {/* Desktop Boost Gauge (Hidden on mobile as mobile button has its own gauge) */}
          {myPlayer && (
            <div className="hidden sm:flex pointer-events-auto w-48 flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-2 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" /> Sprint Gauge
                </span>
                <span className="text-slate-400 font-mono">
                  {Math.round(myPlayer.boostFuel)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${myPlayer.boostFuel}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: Session Round Timer */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            className={`flex items-center gap-1.5 sm:gap-2.5 rounded-2xl border px-3 py-1.5 sm:px-5 sm:py-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              isUrgent
                ? 'border-red-500/70 bg-red-950/85 text-red-100 shadow-red-950/80 animate-pulse'
                : isWarning
                ? 'border-amber-500/60 bg-amber-950/80 text-amber-100 shadow-amber-950/60'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-100 shadow-slate-950/50'
            }`}
          >
            {isUrgent ? (
              <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 animate-bounce" />
            ) : (
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest opacity-75">
                Time Left
              </span>
              <span className="font-mono text-base sm:text-xl font-black tracking-wider">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Timer Progress Ring Bar */}
          <div className="mt-1 h-1 w-24 sm:w-32 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-indigo-400'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Right: Sound Control, Mobile Stats Toggle & Kill Feed */}
        <div className="flex flex-col items-end gap-2 sm:gap-3">
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Leaderboard & Map Toggle */}
            <button
              onClick={() => setShowMobileStats(!showMobileStats)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-amber-400 shadow-lg backdrop-blur-md active:scale-95"
              title="Show Scores & Map"
            >
              <Trophy className="h-4 w-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-500 hover:text-white active:scale-95"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>

          {/* Kill Feed */}
          <div className="flex flex-col gap-1">
            {gameState.killFeed.slice(-2).map((kill) => (
              <div
                key={kill.id}
                className="animate-in fade-in slide-in-from-right-3 flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/80 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs backdrop-blur-sm"
              >
                {kill.killerName ? (
                  <>
                    <span
                      className="font-bold truncate max-w-[60px]"
                      style={{ color: kill.killerColor || '#38bdf8' }}
                    >
                      {kill.killerName}
                    </span>
                    <span className="text-slate-400">⚔️</span>
                  </>
                ) : (
                  <span className="text-slate-400">💀</span>
                )}
                <span
                  className="font-bold truncate max-w-[60px]"
                  style={{ color: kill.victimColor || '#f87171' }}
                >
                  {kill.victimName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Stats Drawer Modal (When triggered from top right on mobile) */}
      {showMobileStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sm:hidden pointer-events-auto">
          <div className="w-full max-w-xs rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Arena Leaderboard
              </span>
              <button
                onClick={() => setShowMobileStats(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Leaderboard Table */}
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {sortedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs ${
                    player.id === myPlayerId
                      ? 'bg-indigo-500/20 font-bold text-white border border-indigo-500/30'
                      : 'text-slate-300 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-500">{idx + 1}.</span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="truncate max-w-[100px]">{player.name}</span>
                    {idx === 0 && <span className="text-amber-400">👑</span>}
                  </div>
                  <span className="font-mono font-bold text-slate-200">
                    {player.score} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Minimap in Modal */}
            <div className="flex flex-col items-center bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-400" /> Mini Map
              </span>
              <canvas
                ref={mobileMinimapCanvasRef}
                width={120}
                height={90}
                className="rounded-xl border border-slate-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Bottom Bar (Hidden on mobile to preserve touch area) */}
      <div className="hidden sm:flex items-end justify-between gap-4">
        {/* Emote Quick Wheel */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800/80 bg-slate-950/85 p-2 shadow-xl backdrop-blur-md">
          {EMOTE_LIST.map((emote) => (
            <button
              key={emote}
              onClick={() => {
                onSendEmote(emote);
                soundManager.playBoost();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:scale-125 hover:bg-slate-800 active:scale-95"
              title={`Send emote ${emote}`}
            >
              {emote}
            </button>
          ))}
        </div>

        {/* Center Hint for Controls */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-400 backdrop-blur-sm border border-slate-800/50">
          <span><kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">WASD</kbd> or <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Arrows</kbd> to Move</span>
          <span className="text-slate-600">|</span>
          <span>Hold <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">SPACE</kbd> to Boost</span>
        </div>

        {/* Right: Leaderboard & Minimap */}
        <div className="pointer-events-auto flex items-end gap-3">
          {/* Leaderboard Card */}
          <div className="flex w-52 flex-col rounded-2xl border border-slate-800/80 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Leaderboard</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {sortedPlayers.slice(0, 5).map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                    player.id === myPlayerId
                      ? 'bg-indigo-500/20 font-bold text-white border border-indigo-500/30'
                      : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-500">{idx + 1}.</span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="truncate max-w-[90px]">{player.name}</span>
                    {idx === 0 && <span className="text-amber-400">👑</span>}
                  </div>
                  <span className="font-mono font-bold text-slate-200">
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Minimap */}
          <div className="flex flex-col items-center rounded-2xl border border-slate-800/80 bg-slate-950/85 p-2 shadow-2xl backdrop-blur-md">
            <canvas
              ref={minimapCanvasRef}
              width={90}
              height={70}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
