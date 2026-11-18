import React, { useRef } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Warna spotlight radial (RGBA) */
  spotlightColor?: string;
  children: React.ReactNode;
}

/**
 * Efek React Bits / Magic UI "Spotlight Card" tanpa React re-render.
 * Cahaya radial lembut mengikuti pergerakan kursor mouse menggunakan CSS variables langsung di DOM.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  spotlightColor = 'rgba(59, 130, 246, 0.13)',
  className = '',
  style,
  onMouseMove,
  children,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    }
    onMouseMove?.(e);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      style={{
        ['--spot-color' as any]: spotlightColor,
        ...style,
      }}
      className={`spotlight-card relative overflow-hidden ${className}`}
      {...props}
    >
      <div aria-hidden="true" className="spotlight-overlay pointer-events-none absolute inset-0 rounded-[inherit]" />
      <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
    </div>
  );
};
