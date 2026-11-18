import React, { useMemo } from 'react';

interface MeteorsProps {
  number?: number;
  className?: string;
}

/**
 * Efek Magic UI "Meteors" (berkas cahaya bintang jatuh diagonal) berbasis CSS murni.
 * Sangat ringan (0 JS per frame) dan langsung terlihat hidup di Hero Banner & halaman Login.
 */
export const Meteors: React.FC<MeteorsProps> = ({ number = 10, className = '' }) => {
  const meteors = useMemo(
    () =>
      Array.from({ length: number }).map((_, i) => ({
        id: i,
        left: `${(i * 100) / number + (i % 3) * 4}%`,
        top: `${-15 - (i % 4) * 12}%`,
        delay: `${(i * 0.7) % 5}s`,
        duration: `${3.2 + (i % 4) * 1.1}s`,
      })),
    [number]
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {meteors.map((m) => (
        <span
          key={m.id}
          style={{
            top: m.top,
            left: m.left,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
          className="meteor-streak"
        />
      ))}
    </div>
  );
};
