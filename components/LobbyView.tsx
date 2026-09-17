'use client';

import React, { useState } from 'react';
import { RoomConfig, SnakePlayer, AVAILABLE_SKINS, ChatMessage } from '../lib/types';
import { 
  Play, Users, Settings, Clock, Bot, Sparkles, Copy, Check, 
  MessageSquare, Send, ShieldCheck, Gamepad2, LogIn, ArrowRight 
} from 'lucide-react';
import { soundManager } from '../lib/audio';

interface LobbyViewProps {
  roomConfig: RoomConfig;
  players: SnakePlayer[];
  myPlayerId: string;
  isHost: boolean;
  playerName: string;
  selectedSkinId: string;
  chatMessages: ChatMessage[];
  onUpdateName: (name: string) => void;
  onUpdateSkin: (skinId: string) => void;
  onUpdateConfig: (config: Partial<RoomConfig>) => void;
  onStartGame: () => void;
  onSendMessage: (text: string) => void;
  onJoinRoomCode?: (code: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomConfig,
  players,
  myPlayerId,
  isHost,
  playerName,
  selectedSkinId,
  chatMessages,
  onUpdateName,
  onUpdateSkin,
  onUpdateConfig,
  onStartGame,
  onSendMessage,
  onJoinRoomCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomConfig.roomCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode && onJoinRoomCode) {
      onJoinRoomCode(cleanCode);
      setShowJoinModal(false);
      setJoinCodeInput('');
    }
  };

  const currentSkin = AVAILABLE_SKINS.find((s) => s.id === selectedSkinId) || AVAILABLE_SKINS[0];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 text-slate-100 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black -z-10" />

      <div className="w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-950">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  SNAKE ARENA <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-500/30">Multiplayer</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Modern tactical multiplayer snake with long sessions & live room alerts
                </p>
              </div>
            </div>
          </div>

          {/* Room Actions: Current Code, Share Link & Join Other Room */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Room</span>
                <span className="font-mono text-base font-black tracking-widest text-emerald-400">
                  {roomConfig.roomCode}
                </span>
              </div>
              <button
                onClick={copyRoomLink}
                className="ml-2 flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition active:scale-95 border border-slate-700"
                title="Copy Room Link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Join Another Room Button */}
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3.5 py-2 text-xs font-bold text-indigo-200 transition active:scale-95"
            >
              <LogIn className="h-4 w-4 text-indigo-400" />
              <span>Join Another Room</span>
            </button>
          </div>
        </div>

        {/* Modal: Join Room by Code */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-emerald-400" /> Join Existing Game Session
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter the 4-character room code shared by your friend to join their match.
              </p>

              <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="e.g. SNAK"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-lg font-black tracking-widest text-emerald-400 placeholder-slate-600 focus:border-emerald-500 focus:outline-none text-center"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!joinCodeInput.trim()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                  >
                    <span>Connect</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Grid: Left Settings / Right Players & Chat */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Player Customization & Host Room Config (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Player Customization Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Player Profile & Skin
              </h3>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => onUpdateName(e.target.value)}
                  maxLength={14}
                  placeholder="Enter nickname..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Skin Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Select Snake Skin ({currentSkin.name})
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {AVAILABLE_SKINS.map((skin) => {
                    const isSelected = skin.id === selectedSkinId;
                    return (
                      <button
                        key={skin.id}
                        onClick={() => {
                          onUpdateSkin(skin.id);
                          soundManager.playBoost();
                        }}
                        className={`group relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-400 bg-slate-800/90 shadow-md ring-2 ring-emerald-500/40'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                        title={skin.name}
                      >
                        <div
                          className="h-7 w-7 rounded-full shadow-inner flex items-center justify-center transition group-hover:scale-110"
                          style={{
                            background: `linear-gradient(135deg, ${skin.accentColor}, ${skin.primaryColor}, ${skin.secondaryColor})`,
                          }}
                        />
                        <span className="mt-1.5 text-[10px] font-medium text-slate-400 truncate max-w-full">
                          {skin.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Room Settings (Host Only / View Only for Peers) */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-400" /> Match & Session Settings
                </h3>
                {!isHost && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Host controls settings
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Session Duration Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" /> Session Duration
                  </label>
                  <select
                    disabled={!isHost}
                    value={roomConfig.sessionDuration}
                    onChange={(e) =>
                      onUpdateConfig({ sessionDuration: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value={180}>3 Minutes (Blitz Round)</option>
                    <option value={300}>5 Minutes (Standard Match)</option>
                    <option value={600}>10 Minutes (Long Tactical Session)</option>
                    <option value={900}>15 Minutes (Marathon Session)</option>
                  </select>
                </div>

                {/* Bot Filling */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-indigo-400" /> AI Bot Opponents
                  </label>
                  <select
                    disabled={!isHost}
                    value={roomConfig.botCount}
                    onChange={(e) =>
                      onUpdateConfig({
                        fillWithBots: Number(e.target.value) > 0,
                        botCount: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value={0}>No Bots (Humans Only)</option>
                    <option value={2}>2 Smart Bots</option>
                    <option value={4}>4 Smart Bots (Recommended)</option>
                    <option value={6}>6 Smart Bots (Full Arena)</option>
                  </select>
                </div>

                {/* Power-ups Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-400" /> Power-Ups & Items
                  </label>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      onUpdateConfig({ powerUpsEnabled: !roomConfig.powerUpsEnabled })
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      roomConfig.powerUpsEnabled
                        ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    } disabled:opacity-60`}
                  >
                    {roomConfig.powerUpsEnabled ? '✓ Enabled (Ghost, Boost, Magnet, Gold)' : '✕ Classic Apples Only'}
                  </button>
                </div>

                {/* Speed Setting */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" /> Game Pace
                  </label>
                  <select
                    disabled={!isHost}
                    value={roomConfig.speed}
                    onChange={(e) =>
                      onUpdateConfig({ speed: e.target.value as 'slow' | 'normal' | 'fast' })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="slow">Slow (Tactical & Relaxed)</option>
                    <option value="normal">Normal (Classic Arcade)</option>
                    <option value="fast">Fast (High Intensity)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Players Roster & Chat (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Players in Lobby */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-emerald-400" /> Arena Lobby ({players.length} Players)
              </h3>

              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                      p.id === myPlayerId
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3.5 w-3.5 rounded-full shadow-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-semibold">{p.name}</span>
                      {p.id === myPlayerId && (
                        <span className="text-[10px] text-emerald-400 font-bold">(You)</span>
                      )}
                    </div>
                    {p.isHost && (
                      <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                        <ShieldCheck className="h-3 w-3" /> HOST
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lobby Chat */}
            <div className="flex flex-1 flex-col rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                <MessageSquare className="h-3.5 w-3.5" /> Lobby Chat
              </div>

              {/* Chat Message List */}
              <div className="flex-1 min-h-[110px] max-h-[140px] overflow-y-auto flex flex-col gap-1.5 pr-1 text-xs">
                {chatMessages.length === 0 ? (
                  <span className="text-slate-600 italic">No messages yet. Say hello!</span>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-baseline gap-1.5">
                      <span
                        className="font-bold text-[11px]"
                        style={{ color: msg.senderColor }}
                      >
                        {msg.senderName}:
                      </span>
                      <span className="text-slate-300 font-normal break-all">
                        {msg.text}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 px-3 text-slate-200 transition active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-6">
          <div className="text-xs text-slate-400">
            {isHost ? (
              <span>Ready to start? All players will enter the live arena together.</span>
            ) : (
              <span>Waiting for the room host to launch the match...</span>
            )}
          </div>

          {isHost ? (
            <button
              onClick={() => {
                soundManager.playPowerUp();
                onStartGame();
              }}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-4 text-sm font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-emerald-950/60 transition hover:from-emerald-400 hover:to-teal-300 hover:scale-[1.02] active:scale-95"
            >
              <Play className="h-5 w-5 fill-slate-950" /> Start Arena Match
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for Host to Launch</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
