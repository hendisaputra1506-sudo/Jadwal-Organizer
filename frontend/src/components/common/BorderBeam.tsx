import React from 'react';

interface BorderBeamProps {
  /** Kecepatan putaran cahaya dalam detik (default 7s) */
  duration?: number;
  /** Warna utama cahaya */
  colorFrom?: string;
  /** Warna sekunder cahaya */
  colorTo?: string;
  /** Ketebalan border beam dalam px */
  borderWidth?: number;
  className?: string;
}

/**
 * Efek Magic UI "Border Beam" murni berbasis CSS (GPU-accelerated, 0 JS per frame).
 * Menampilkan berkas cahaya lembut yang meluncur mengelilingi tepi kartu.
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({
  duration = 7,
  colorFrom = '#38BDF8',
  colorTo = '#FFFFFF',
  borderWidth = 2,
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      style={{
        ['--beam-duration' as any]: `${duration}s`,
        ['--beam-from' as any]: colorFrom,
        ['--beam-to' as any]: colorTo,
        ['--beam-width' as any]: `${borderWidth}px`,
      }}
      className={`border-beam-wrapper pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
    />
  );
};
