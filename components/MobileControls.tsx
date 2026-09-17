'use client';

import React from 'react';
import { Direction } from '../lib/types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap } from 'lucide-react';

interface MobileControlsProps {
  onDirectionChange: (dir: Direction) => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onDirectionChange,
  onBoostStart,
  onBoostEnd,
}) => {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex items-center justify-between px-6 sm:hidden">
      {/* Virtual D-Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-1.5 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-md">
        <div />
        <button
          onTouchStart={() => onDirectionChange('UP')}
          onClick={() => onDirectionChange('UP')}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white active:bg-emerald-600 transition"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <div />

        <button
          onTouchStart={() => onDirectionChange('LEFT')}
          onClick={() => onDirectionChange('LEFT')}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white active:bg-emerald-600 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-11 w-11 rounded-xl bg-slate-950/50" />
        <button
          onTouchStart={() => onDirectionChange('RIGHT')}
          onClick={() => onDirectionChange('RIGHT')}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white active:bg-emerald-600 transition"
        >
          <ArrowRight className="h-5 w-5" />
        </button>

        <div />
        <button
          onTouchStart={() => onDirectionChange('DOWN')}
          onClick={() => onDirectionChange('DOWN')}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white active:bg-emerald-600 transition"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
        <div />
      </div>

      {/* Boost Button */}
      <div className="pointer-events-auto flex flex-col items-center">
        <button
          onTouchStart={onBoostStart}
          onTouchEnd={onBoostEnd}
          onMouseDown={onBoostStart}
          onMouseUp={onBoostEnd}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-950/80 active:scale-90 transition"
        >
          <Zap className="h-7 w-7 fill-slate-950" />
        </button>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Boost
        </span>
      </div>
    </div>
  );
};
