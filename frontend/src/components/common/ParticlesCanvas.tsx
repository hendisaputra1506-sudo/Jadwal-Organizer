import React, { useEffect, useRef } from 'react';

interface ParticlesCanvasProps {
  /** Jumlah partikel (default 32 agar tetap sangat ringan) */
  count?: number;
  /** Warna partikel (RGB tanpa alpha, misal "147, 197, 253") */
  color?: string;
  /** Apakah menampilkan garis penghubung antar partikel dekat */
  connectLines?: boolean;
  className?: string;
}

/**
 * Interactive Constellation / Floating Particles Canvas (React Bits style).
 * Super ringan (<3 KB), 60fps, bereaksi halus terhadap kursor mouse, dan otomatis jeda saat tab tidak aktif.
 */
export const ParticlesCanvas: React.FC<ParticlesCanvasProps> = ({
  count = 32,
  color = '186, 230, 253',
  connectLines = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 400),
      vx: (Math.random() - 0.5) * 0.65,
      vy: (Math.random() - 0.5) * 0.65,
      radius: 1.5 + Math.random() * 2.3,
      alpha: 0.35 + Math.random() * 0.55,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active =
        mouse.x >= 0 && mouse.x <= rect.width && mouse.y >= 0 && mouse.y <= rect.height;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      if (document.hidden) {
        animationId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle cursor attraction / ripple interaction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130 && dist > 1) {
            const force = (130 - dist) / 130;
            p.x -= (dx / dist) * force * 1.4;
            p.y -= (dy / dist) * force * 1.4;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle with soft glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
        ctx.fill();

        // Draw connecting constellation lines
        if (connectLines) {
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 12500) {
              const lineAlpha = (1 - Math.sqrt(distSq) / 112) * 0.25;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
              ctx.lineWidth = 0.9;
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [count, color, connectLines]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
};
