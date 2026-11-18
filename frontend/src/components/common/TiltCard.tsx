import React, { useRef } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maksimal sudut kemiringan 3D dalam derajat (default 7) */
  maxTilt?: number;
  /** Warna spotlight radial */
  spotlightColor?: string;
  children: React.ReactNode;
}

/**
 * Efek React Bits "TiltedCard" + Aceternity "3D Card" + Spotlight Glare.
 * Memiringkan kartu secara 3D mengikuti posisi kursor dengan kilau cahaya (tanpa re-render React!).
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  maxTilt = 7,
  spotlightColor = 'rgba(59, 130, 246, 0.22)',
  className = '',
  style,
  onMouseMove,
  onMouseLeave,
  children,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`;
      el.style.setProperty('--spot-x', `${x}px`);
      el.style.setProperty('--spot-y', `${y}px`);
    }
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (el) {
      el.style.transform =
        'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
    }
    onMouseLeave?.(e);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ['--spot-color' as any]: spotlightColor,
        transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease',
        willChange: 'transform',
        ...style,
      }}
      className={`spotlight-card relative overflow-hidden ${className}`}
      {...props}
    >
      <div
        aria-hidden="true"
        className="spotlight-overlay pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
    </div>
  );
};
