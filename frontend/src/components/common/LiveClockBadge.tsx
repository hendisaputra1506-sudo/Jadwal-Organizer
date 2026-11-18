import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockBadgeProps {
  userName?: string;
}

/**
 * Sapaan interaktif dengan ikon tangan melambai + jam digital live (detik berjalan real-time).
 */
export const LiveClockBadge: React.FC<LiveClockBadgeProps> = ({ userName }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-clay border border-blue-100/90 shadow-clay-sm flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl sm:text-2xl inline-block animate-wave-hand select-none" aria-hidden="true">
          👋
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
            {greeting},{' '}
            <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
              {userName || 'Tim Kampus UTD'}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 font-medium truncate">{dateStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 px-3 py-1.5 rounded-xl shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs sm:text-sm font-mono font-black text-blue-900 tracking-wider tabular-nums">
          {timeStr} WIB
        </span>
      </div>
    </div>
  );
};
