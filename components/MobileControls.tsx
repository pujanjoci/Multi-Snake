'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Direction } from '../lib/types';
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, 
  Gamepad2, Disc, Hand, Smile, Sparkles, X 
} from 'lucide-react';
import { soundManager } from '../lib/audio';

interface MobileControlsProps {
  onDirectionChange: (dir: Direction) => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
  onSendEmote: (symbol: string) => void;
  boostFuel?: number;
}

type ControlMode = 'joystick' | 'dpad' | 'swipe';
const EMOTE_LIST = ['👑', '🔥', '🐍', '⚡', '💀', '💎', '🍎', '🚀'];

export const MobileControls: React.FC<MobileControlsProps> = ({
  onDirectionChange,
  onBoostStart,
  onBoostEnd,
  onSendEmote,
  boostFuel = 100,
}) => {
  const [mode, setMode] = useState<ControlMode>('dpad');
  const [showEmotes, setShowEmotes] = useState(false);
  const [activeDir, setActiveDir] = useState<Direction | null>(null);

  // Joystick touch state
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const lastJoystickDirRef = useRef<Direction | null>(null);

  // Full screen swipe detection
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleDir = useCallback((dir: Direction) => {
    setActiveDir(dir);
    onDirectionChange(dir);
    setTimeout(() => setActiveDir(null), 150);
  }, [onDirectionChange]);

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    joystickTouchIdRef.current = touch.identifier;
    setIsDraggingJoystick(true);
    updateJoystickPos(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!isDraggingJoystick) return;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchIdRef.current) {
        updateJoystickPos(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingJoystick(false);
    setKnobPos({ x: 0, y: 0 });
    joystickTouchIdRef.current = null;
    lastJoystickDirRef.current = null;
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 38;

    let clampedX = dx;
    let clampedY = dy;
    if (distance > maxRadius) {
      clampedX = (dx / distance) * maxRadius;
      clampedY = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Determine Direction with threshold
    if (distance > 12) {
      let dir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        dir = dy > 0 ? 'DOWN' : 'UP';
      }

      if (dir !== lastJoystickDirRef.current) {
        lastJoystickDirRef.current = dir;
        handleDir(dir);
      }
    }
  };

  // Swipe on window
  useEffect(() => {
    if (mode !== 'swipe') return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      swipeStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - swipeStartRef.current.x;
      const dy = touch.clientY - swipeStartRef.current.y;
      const dt = Date.now() - swipeStartRef.current.time;

      const minDistance = 25;
      if (Math.sqrt(dx * dx + dy * dy) > minDistance && dt < 600) {
        if (Math.abs(dx) > Math.abs(dy)) {
          handleDir(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          handleDir(dy > 0 ? 'DOWN' : 'UP');
        }
      }
      swipeStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, handleDir]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col p-3 sm:hidden">
      {/* Mobile Top Controls Toolbar (Emote Drawer + Mode Switcher) */}
      <div className="flex items-center justify-between pb-2 px-1">
        {/* Control Mode Toggle */}
        <div className="pointer-events-auto flex items-center rounded-xl bg-slate-900/85 border border-slate-700/80 p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setMode('dpad')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === 'dpad'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5" /> D-Pad
          </button>
          <button
            onClick={() => setMode('joystick')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === 'joystick'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Disc className="h-3.5 w-3.5" /> Stick
          </button>
          <button
            onClick={() => setMode('swipe')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === 'swipe'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hand className="h-3.5 w-3.5" /> Swipe
          </button>
        </div>

        {/* Mobile Emote Opener */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowEmotes(!showEmotes)}
            className="flex items-center gap-1 rounded-xl bg-slate-900/85 border border-slate-700/80 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-lg backdrop-blur-md active:scale-95"
          >
            <Smile className="h-4 w-4 text-amber-400" />
            <span>Emotes</span>
          </button>
        </div>
      </div>

      {/* Floating Emote Drawer Popup */}
      {showEmotes && (
        <div className="pointer-events-auto mb-2 flex items-center justify-between gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {EMOTE_LIST.map((emote) => (
              <button
                key={emote}
                onClick={() => {
                  onSendEmote(emote);
                  soundManager.playBoost();
                  setShowEmotes(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl active:scale-125 transition"
              >
                {emote}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowEmotes(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Touch Controls Bar */}
      <div className="flex items-end justify-between px-2 pb-2">
        {/* Left Side: D-Pad or Joystick */}
        <div className="pointer-events-auto">
          {mode === 'dpad' && (
            <div className="grid grid-cols-3 gap-1 rounded-3xl border border-slate-700/80 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-md">
              <div />
              <button
                onTouchStart={() => handleDir('UP')}
                onClick={() => handleDir('UP')}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white transition active:bg-emerald-500 active:text-slate-950 ${
                  activeDir === 'UP' ? 'bg-emerald-500 text-slate-950' : ''
                }`}
              >
                <ArrowUp className="h-6 w-6" />
              </button>
              <div />

              <button
                onTouchStart={() => handleDir('LEFT')}
                onClick={() => handleDir('LEFT')}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white transition active:bg-emerald-500 active:text-slate-950 ${
                  activeDir === 'LEFT' ? 'bg-emerald-500 text-slate-950' : ''
                }`}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/60 text-slate-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <button
                onTouchStart={() => handleDir('RIGHT')}
                onClick={() => handleDir('RIGHT')}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white transition active:bg-emerald-500 active:text-slate-950 ${
                  activeDir === 'RIGHT' ? 'bg-emerald-500 text-slate-950' : ''
                }`}
              >
                <ArrowRight className="h-6 w-6" />
              </button>

              <div />
              <button
                onTouchStart={() => handleDir('DOWN')}
                onClick={() => handleDir('DOWN')}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white transition active:bg-emerald-500 active:text-slate-950 ${
                  activeDir === 'DOWN' ? 'bg-emerald-500 text-slate-950' : ''
                }`}
              >
                <ArrowDown className="h-6 w-6" />
              </button>
              <div />
            </div>
          )}

          {mode === 'joystick' && (
            <div
              ref={joystickBaseRef}
              onTouchStart={handleJoystickTouchStart}
              onTouchMove={handleJoystickTouchMove}
              onTouchEnd={handleJoystickTouchEnd}
              className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-slate-700/80 bg-slate-900/85 shadow-2xl backdrop-blur-md touch-none"
            >
              {/* Center Crosshairs */}
              <div className="absolute h-1 w-8 bg-slate-700/50 rounded-full" />
              <div className="absolute h-8 w-1 bg-slate-700/50 rounded-full" />

              {/* Joystick Knob */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-xl transition-transform duration-75"
                style={{
                  transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                }}
              >
                <Disc className="h-6 w-6 fill-slate-950 opacity-40" />
              </div>
            </div>
          )}

          {mode === 'swipe' && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-4 py-3 text-xs font-semibold text-slate-300 shadow-xl backdrop-blur-md">
              <Hand className="h-5 w-5 text-emerald-400 animate-pulse" />
              <span>Swipe anywhere on screen to steer</span>
            </div>
          )}
        </div>

        {/* Right Side: Turbo Boost Button with Fuel Glow */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onBoostStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onBoostEnd();
            }}
            onMouseDown={onBoostStart}
            onMouseUp={onBoostEnd}
            className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 font-black shadow-2xl shadow-amber-950/80 active:scale-90 transition select-none"
          >
            {/* Boost Fuel Ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="rgba(15, 23, 42, 0.4)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="#10b981"
                strokeWidth="4"
                fill="none"
                strokeDasharray="226"
                strokeDashoffset={226 - (226 * Math.max(0, boostFuel)) / 100}
                className="transition-all duration-150"
              />
            </svg>

            <Zap className="h-8 w-8 fill-slate-950 group-active:scale-125 transition" />
          </button>
          <span className="mt-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300 drop-shadow-md">
            BOOST ({Math.round(boostFuel)}%)
          </span>
        </div>
      </div>
    </div>
  );
};
