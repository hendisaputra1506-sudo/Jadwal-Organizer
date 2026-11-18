import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Animasi angka naik halus (easeOutExpo) untuk statistik dashboard & ringkasan.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 550,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const previousRef = useRef<number>(0);

  useEffect(() => {
    const startVal = previousRef.current;
    const endVal = Number.isFinite(value) ? value : 0;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    // Respect reduced motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayValue(endVal);
      previousRef.current = endVal;
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        previousRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
};
