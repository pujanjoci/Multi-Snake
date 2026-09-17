'use client';

import React, { useEffect, useRef } from 'react';
import { GameState, Position, Direction } from '../lib/types';

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

    let prevFoodCount = gameState.foods.length;

    const render = () => {
      const { width: gridW, height: gridH } = gameState.config.gridSize;
      
      // Auto resize canvas to container size
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const cellW = canvas.width / gridW;
      const cellH = canvas.height / gridH;

      // 1. Draw Clean Dark Slate Arena Background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Subtle Arena Grid (Non-neon, modern tactical slate)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridW; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellW, 0);
        ctx.lineTo(x * cellW, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= gridH; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(canvas.width, y * cellH);
        ctx.stroke();
      }

      // Outer Arena Border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

      const now = Date.now();

      // 3. Draw Foods & Power-ups with tactile non-neon shaders
      gameState.foods.forEach((food) => {
        const cx = food.x * cellW + cellW / 2;
        const cy = food.y * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.38;

        ctx.save();
        if (food.type === 'GOLDEN') {
          // Golden Orb with gentle pulse
          const pulse = Math.sin(now / 150) * 2;
          const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius + pulse);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.7, '#eab308');
          grad.addColorStop(1, '#a16207');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (food.type === 'SPEED') {
          // Speed Chili / Power Orb
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
          // Ghost Mushroom
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
          // Magnet Gem
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
          // Regular Clean Apple / Berry
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

      // 4. Draw Boost Particle Trails
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

      // 5. Draw Snakes
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
          const cx = seg.x * cellW + cellW / 2;
          const cy = seg.y * cellH + cellH / 2;
          const radius = Math.min(cellW, cellH) * (i === 0 ? 0.46 : 0.4);

          // Add particles if boosting
          if (player.isBoosting && i === player.body.length - 1 && Math.random() < 0.4) {
            particlesRef.current.push({
              x: cx + (Math.random() - 0.5) * 8,
              y: cy + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: skin.accentColor,
              size: 4,
              alpha: 0.8,
              life: 1,
            });
          }

          // Shading gradient along the snake length
          const t = i / Math.max(1, player.body.length);
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
            const ncx = nextSeg.x * cellW + cellW / 2;
            const ncy = nextSeg.y * cellH + cellH / 2;

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
        const headX = headSeg.x * cellW + cellW / 2;
        const headY = headSeg.y * cellH + cellH / 2;
        const headRadius = Math.min(cellW, cellH) * 0.46;

        drawSnakeFace(ctx, headX, headY, headRadius, player.direction, skin.accentColor, isMe);

        // Highlight ring for local player
        if (isMe) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(headX, headY, headRadius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Floating Player Name Tag
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        const nameWidth = ctx.measureText(player.name).width;
        ctx.fillRect(headX - nameWidth / 2 - 4, headY - headRadius - 16, nameWidth + 8, 14);

        ctx.fillStyle = isMe ? '#67e8f9' : '#e2e8f0';
        ctx.fillText(player.name, headX, headY - headRadius - 6);

        // Floating Emote Bubble (if active)
        if (player.emote && player.emote.expiresAt > now) {
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(player.emote.symbol, headX, headY - headRadius - 22);
        }

        ctx.restore();
      });

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
    <div className="relative h-full w-full overflow-hidden bg-slate-950 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="h-full w-full object-contain cursor-crosshair"
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
