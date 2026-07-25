'use client';

import { useEffect, useRef } from 'react';

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
    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 6 + 4,
      d: Math.random() * height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
    }));

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle, index) => {
        particle.tiltAngle += particle.tiltAngleIncremental;
        particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2;
        particle.tilt = Math.sin(particle.tiltAngle - index / 3) * 15;

        context.beginPath();
        context.lineWidth = particle.r;
        context.strokeStyle = particle.color;
        context.moveTo(particle.x + particle.tilt + particle.r / 2, particle.y);
        context.lineTo(
          particle.x + particle.tilt,
          particle.y + particle.tilt + particle.r / 2,
        );
        context.stroke();

        if (particle.y > height) {
          particles[index] = {
            ...particle,
            x: Math.random() * width,
            y: -20,
            tilt: Math.random() * 10 - 5,
            tiltAngle: 0,
          };
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    draw();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}
