'use client';

import React, { useEffect, useRef } from 'react';
import { GameState, Direction } from '../lib/types';

interface GameCanvasProps {
  gameState: GameState;
  myPlayerId: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, myPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width: gridW, height: gridH } = gameState.config.gridSize;

      // Ensure canvas pixel dimensions match its displayed bounding rect with devicePixelRatio support
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const displayW = rect.width;
      const displayH = rect.height;

      // 1. Draw Full Screen Deep Dark Slate Backdrop
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, displayW, displayH);

      // Safe margins so controls don't obscure arena on mobile
      const isMobile = displayW <= 640;
      const padTop = isMobile ? 58 : 20;
      const padBottom = isMobile ? 150 : 24;
      const padSide = isMobile ? 10 : 20;

      const availW = Math.max(50, displayW - padSide * 2);
      const availH = Math.max(50, displayH - (padTop + padBottom));

      // UNIFORM SQUARE CELL SIZE (Guarantees perfect squares on all screen aspect ratios)
      const cellSize = Math.min(availW / gridW, availH / gridH);
      const arenaW = cellSize * gridW;
      const arenaH = cellSize * gridH;

      // Center the square grid arena in the available zone
      const offsetX = padSide + (availW - arenaW) / 2;
      const offsetY = padTop + (availH - arenaH) / 2;

      // 2. Arena Floor
      ctx.fillStyle = '#0b111e';
      ctx.fillRect(offsetX, offsetY, arenaW, arenaH);

      // 3. Subtle Grid Lines (Uniform Squares)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= gridW; x++) {
        const gx = offsetX + x * cellSize;
        ctx.beginPath();
        ctx.moveTo(gx, offsetY);
        ctx.lineTo(gx, offsetY + arenaH);
        ctx.stroke();
      }

      for (let y = 0; y <= gridH; y++) {
        const gy = offsetY + y * cellSize;
        ctx.beginPath();
        ctx.moveTo(offsetX, gy);
        ctx.lineTo(offsetX + arenaW, gy);
        ctx.stroke();
      }

      // Outer Arena Border with subtle glow
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(offsetX, offsetY, arenaW, arenaH);

      const now = Date.now();

      // 4. Draw Foods & Power-ups (Tactile non-neon orbs)
      gameState.foods.forEach((food) => {
        const cx = offsetX + food.x * cellSize + cellSize / 2;
        const cy = offsetY + food.y * cellSize + cellSize / 2;
        const radius = cellSize * 0.38;

        ctx.save();
        if (food.type === 'GOLDEN') {
          const pulse = Math.sin(now / 150) * (cellSize * 0.08);
          const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius + pulse);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.7, '#eab308');
          grad.addColorStop(1, '#a16207');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Core shimmer
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (food.type === 'SPEED') {
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.floor(radius * 1.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', cx, cy);
        } else if (food.type === 'GHOST') {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.floor(radius * 1.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👻', cx, cy);
        } else if (food.type === 'MAGNET') {
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.floor(radius * 1.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧲', cx, cy);
        } else {
          // Regular Clean Apple
          const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 1, cx, cy, radius);
          grad.addColorStop(0, '#fca5a5');
          grad.addColorStop(0.6, '#ef4444');
          grad.addColorStop(1, '#991b1b');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          // Leaf
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(cx + radius * 0.3, cy - radius * 0.8, radius * 0.3, 0, Math.PI);
          ctx.fill();
        }
        ctx.restore();
      });

      // 5. Draw Boost Particle Trails
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        p.size = Math.max(0, p.size - 0.1);

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // 6. Draw Snakes
      Object.values(gameState.players).forEach((player) => {
        if (!player.isAlive || player.body.length === 0) return;

        const isMe = player.id === myPlayerId;
        const isGhost = player.activePowerUp?.type === 'GHOST';

        ctx.save();
        if (isGhost) {
          ctx.globalAlpha = 0.55;
        }

        const skin = player.skin;

        // Draw snake body segments from tail to head
        for (let i = player.body.length - 1; i >= 0; i--) {
          const seg = player.body[i];
          const cx = offsetX + seg.x * cellSize + cellSize / 2;
          const cy = offsetY + seg.y * cellSize + cellSize / 2;
          const radius = cellSize * (i === 0 ? 0.46 : 0.4);

          // Add particles if boosting
          if (player.isBoosting && i === player.body.length - 1 && Math.random() < 0.4) {
            particlesRef.current.push({
              x: cx + (Math.random() - 0.5) * 6,
              y: cy + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: skin.accentColor,
              size: cellSize * 0.25,
              alpha: 0.8,
              life: 1,
            });
          }

          // Shading gradient along the snake length
          const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 1, cx, cy, radius);
          grad.addColorStop(0, skin.accentColor);
          grad.addColorStop(0.7, skin.primaryColor);
          grad.addColorStop(1, skin.secondaryColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          // Connect segments smoothly
          if (i > 0) {
            const nextSeg = player.body[i - 1];
            const ncx = offsetX + nextSeg.x * cellSize + cellSize / 2;
            const ncy = offsetY + nextSeg.y * cellSize + cellSize / 2;

            // Only connect if adjacent (handle wrap-around gracefully)
            const dx = Math.abs(nextSeg.x - seg.x);
            const dy = Math.abs(nextSeg.y - seg.y);
            if (dx <= 1 && dy <= 1) {
              ctx.strokeStyle = skin.primaryColor;
              ctx.lineWidth = radius * 1.6;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(ncx, ncy);
              ctx.stroke();
            }
          }
        }

        // Draw Head Features (Eyes, Expressive Face)
        const headSeg = player.body[0];
        const headX = offsetX + headSeg.x * cellSize + cellSize / 2;
        const headY = offsetY + headSeg.y * cellSize + cellSize / 2;
        const headRadius = cellSize * 0.46;

        drawSnakeFace(ctx, headX, headY, headRadius, player.direction, skin.accentColor, isMe);

        // Highlight ring for local player
        if (isMe) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(headX, headY, headRadius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Floating Player Name Tag
        const fontSize = Math.max(9, Math.floor(cellSize * 0.6));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        const nameWidth = ctx.measureText(player.name).width;
        ctx.fillRect(headX - nameWidth / 2 - 4, headY - headRadius - fontSize - 5, nameWidth + 8, fontSize + 3);

        ctx.fillStyle = isMe ? '#67e8f9' : '#e2e8f0';
        ctx.fillText(player.name, headX, headY - headRadius - 5);

        // Floating Emote Bubble (if active)
        if (player.emote && player.emote.expiresAt > now) {
          const emoteSize = Math.max(16, Math.floor(cellSize * 1.1));
          ctx.font = `${emoteSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(player.emote.symbol, headX, headY - headRadius - fontSize - 8);
        }

        ctx.restore();
      });

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, myPlayerId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 flex items-center justify-center touch-none">
      <canvas
        ref={canvasRef}
        className="h-full w-full block cursor-crosshair touch-none"
      />
    </div>
  );
};

// Helper: Draw snake eyes looking in the direction of movement
function drawSnakeFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  dir: Direction,
  accentColor: string,
  isMe: boolean
) {
  let eyeOffsetX1 = 0, eyeOffsetY1 = 0;
  let eyeOffsetX2 = 0, eyeOffsetY2 = 0;
  let pupilOffsetX = 0, pupilOffsetY = 0;

  const eyeSpread = radius * 0.48;
  const eyeForward = radius * 0.28;
  const eyeSize = radius * 0.28;
  const pupilSize = eyeSize * 0.55;

  if (dir === 'UP') {
    eyeOffsetX1 = -eyeSpread; eyeOffsetY1 = -eyeForward;
    eyeOffsetX2 = eyeSpread; eyeOffsetY2 = -eyeForward;
    pupilOffsetY = -pupilSize * 0.5;
  } else if (dir === 'DOWN') {
    eyeOffsetX1 = -eyeSpread; eyeOffsetY1 = eyeForward;
    eyeOffsetX2 = eyeSpread; eyeOffsetY2 = eyeForward;
    pupilOffsetY = pupilSize * 0.5;
  } else if (dir === 'LEFT') {
    eyeOffsetX1 = -eyeForward; eyeOffsetY1 = -eyeSpread;
    eyeOffsetX2 = -eyeForward; eyeOffsetY2 = eyeSpread;
    pupilOffsetX = -pupilSize * 0.5;
  } else if (dir === 'RIGHT') {
    eyeOffsetX1 = eyeForward; eyeOffsetY1 = -eyeSpread;
    eyeOffsetX2 = eyeForward; eyeOffsetY2 = eyeSpread;
    pupilOffsetX = pupilSize * 0.5;
  }

  // Eye Sclera (White)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX1, y + eyeOffsetY1, eyeSize, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX2, y + eyeOffsetY2, eyeSize, 0, Math.PI * 2);
  ctx.fill();

  // Eye Pupils (Dark)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX1 + pupilOffsetX, y + eyeOffsetY1 + pupilOffsetY, pupilSize, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX2 + pupilOffsetX, y + eyeOffsetY2 + pupilOffsetY, pupilSize, 0, Math.PI * 2);
  ctx.fill();

  // Specular Reflection
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX1 + pupilOffsetX - 1, y + eyeOffsetY1 + pupilOffsetY - 1, pupilSize * 0.4, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX2 + pupilOffsetX - 1, y + eyeOffsetY2 + pupilOffsetY - 1, pupilSize * 0.4, 0, Math.PI * 2);
  ctx.fill();
}
