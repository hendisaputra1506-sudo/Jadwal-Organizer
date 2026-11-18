/**
 * Efek micro-confetti ringan tanpa library eksternal (zero bundle overhead).
 * Memberikan umpan balik selebrasi lembut saat berhasil menyimpan jadwal baru / menandai selesai.
 */
export function fireMicroConfetti(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const colors = ['#2563EB', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const count = 28;
  const originX = window.innerWidth / 2;
  const originY = Math.min(window.innerHeight * 0.28, 220);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 6;
    const isCircle = Math.random() > 0.55;
    piece.style.position = 'absolute';
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${isCircle ? size : size * 0.55}px`;
    piece.style.borderRadius = isCircle ? '9999px' : '2px';
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.opacity = '1';

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const velocity = 90 + Math.random() * 140;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 50;
    const rotate = (Math.random() - 0.5) * 540;

    piece.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) rotate(0deg) scale(0.6)',
          opacity: 1,
        },
        {
          transform: `translate3d(${dx * 0.65}px, ${dy * 0.7}px, 0) rotate(${rotate * 0.6}deg) scale(1)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate3d(${dx}px, ${dy + 130}px, 0) rotate(${rotate}deg) scale(0.75)`,
          opacity: 0,
        },
      ],
      {
        duration: 750 + Math.random() * 350,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );

    container.appendChild(piece);
  }

  window.setTimeout(() => {
    container.remove();
  }, 1250);
}
