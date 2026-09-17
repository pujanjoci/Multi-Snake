'use client';

import React, { useEffect } from 'react';
import { GameState, SnakePlayer } from '../lib/types';
import { Trophy, Medal, Award, RotateCcw, Home, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/audio';

interface GameOverModalProps {
  gameState: GameState;
  myPlayerId: string;
  isHost: boolean;
  onRestart: () => void;
  onReturnToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  myPlayerId,
  isHost,
  onRestart,
  onReturnToLobby,
}) => {
  const sortedPlayers = Object.values(gameState.players).sort(
    (a, b) => b.score - a.score || b.kills - a.kills
  );

  const winner = sortedPlayers[0] as SnakePlayer | undefined;
  const isWinner = winner?.id === myPlayerId;

  useEffect(() => {
    soundManager.playVictory();

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#fbbf24', '#3b82f6', '#f43f5e'],
      });
    } catch {
      // Ignore if canvas-confetti is not loaded
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1.5 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
          <Trophy className="h-4 w-4 text-amber-400" /> Session Concluded
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center text-white mb-1">
          {isWinner ? '🏆 VICTORY IS YOURS!' : 'MATCH COMPLETED'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 text-center mb-6">
          {winner
            ? `${winner.name} dominated the arena with a top score of ${winner.score}!`
            : 'The session has ended.'}
        </p>

        {/* Podium View (Top 3) */}
        <div className="flex items-end justify-center gap-3 sm:gap-4 w-full mb-6">
          {/* 2nd Place */}
          {sortedPlayers[1] && (
            <div className="flex flex-1 flex-col items-center">
              <div
                className="h-8 w-8 rounded-full border-2 border-slate-300 shadow-md flex items-center justify-center text-xs font-bold text-slate-900 mb-1"
                style={{ backgroundColor: sortedPlayers[1].color }}
              >
                2
              </div>
              <span className="text-xs font-bold text-slate-300 truncate max-w-[80px]">
                {sortedPlayers[1].name}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {sortedPlayers[1].score} pts
              </span>
              <div className="h-20 w-full rounded-t-xl bg-gradient-to-t from-slate-800 to-slate-700/80 border-t border-slate-400 flex items-center justify-center mt-2">
                <Medal className="h-6 w-6 text-slate-300" />
              </div>
            </div>
          )}

          {/* 1st Place (Center / Tallest) */}
          {winner && (
            <div className="flex flex-1.2 flex-col items-center">
              <div className="text-2xl mb-1 animate-bounce">👑</div>
              <div
                className="h-10 w-10 rounded-full border-2 border-amber-400 shadow-lg flex items-center justify-center text-sm font-black text-slate-950 mb-1"
                style={{ backgroundColor: winner.color }}
              >
                1
              </div>
              <span className="text-sm font-black text-amber-300 truncate max-w-[100px]">
                {winner.name}
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {winner.score} pts
              </span>
              <div className="h-28 w-full rounded-t-xl bg-gradient-to-t from-amber-600/60 to-amber-500/40 border-t border-amber-400 flex items-center justify-center mt-2 shadow-lg shadow-amber-950/40">
                <Trophy className="h-8 w-8 text-amber-300" />
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {sortedPlayers[2] && (
            <div className="flex flex-1 flex-col items-center">
              <div
                className="h-8 w-8 rounded-full border-2 border-amber-700 shadow-md flex items-center justify-center text-xs font-bold text-slate-900 mb-1"
                style={{ backgroundColor: sortedPlayers[2].color }}
              >
                3
              </div>
              <span className="text-xs font-bold text-slate-300 truncate max-w-[80px]">
                {sortedPlayers[2].name}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {sortedPlayers[2].score} pts
              </span>
              <div className="h-14 w-full rounded-t-xl bg-gradient-to-t from-amber-950/80 to-amber-900/60 border-t border-amber-700 flex items-center justify-center mt-2">
                <Medal className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          )}
        </div>

        {/* Full Leaderboard Table */}
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-3 max-h-36 overflow-y-auto mb-6">
          <div className="flex flex-col gap-1.5 text-xs">
            {sortedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/40"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-semibold text-slate-200">{player.name}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-300 font-mono">
                  <span>🍎 {player.score}</span>
                  <span className="text-red-400">⚔️ {player.kills}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {isHost ? (
            <button
              onClick={onRestart}
              className="flex-1 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 shadow-xl shadow-emerald-950 transition hover:from-emerald-400 hover:to-teal-300 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> Start Next Round
            </button>
          ) : (
            <div className="text-xs text-slate-400 italic text-center w-full sm:w-auto">
              Waiting for host to start next round...
            </div>
          )}
          <button
            onClick={onReturnToLobby}
            className="flex-1 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700 active:scale-95"
          >
            <Home className="h-4 w-4" /> Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
