'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  shape: 'rect' | 'circle';
}

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      '#fbbf24', // Gold
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#a855f7', // Purple
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#ffffff', // White
      '#3b82f6', // Blue
    ];

    const particleCount = 120;
    const startTime = performance.now();
    const duration = 4500; // 4.5 seconds

    const particles: Particle[] = Array.from({ length: particleCount }, () => {
      const size = Math.random() * 8 + 6;
      return {
        x: Math.random() * width,
        y: -20 - Math.random() * 80,
        w: size,
        h: size * (Math.random() > 0.4 ? 1.4 : 1),
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2.5,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.3 ? 'rect' : 'circle',
      };
    });

    const draw = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        context.clearRect(0, 0, width, height);
        return; // Auto-stop animation to free CPU/GPU completely
      }

      // Fade out gracefully during the last 1.2s
      const globalFade = elapsed > duration - 1200 ? (duration - elapsed) / 1200 : 1;

      context.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin((elapsed + i * 50) / 300) * 0.8;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.y > height + 20) {
          // If in the first half of animation, recirculate from top for continuous shower
          if (elapsed < duration * 0.55) {
            p.y = -20;
            p.x = Math.random() * width;
            p.vy = Math.random() * 3 + 2.5;
          }
        }

        context.save();
        context.translate(p.x, p.y);
        context.rotate((p.rotation * Math.PI) / 180);
        context.globalAlpha = Math.max(0, globalFade);

        context.fillStyle = p.color;
        if (p.shape === 'rect') {
          context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          context.beginPath();
          context.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          context.fill();
        }

        context.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    animationFrameId = requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[120] w-full h-full select-none"
    />
  );
}
