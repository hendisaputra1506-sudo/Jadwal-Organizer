import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockBadgeProps {
  userName?: string;
}

/**
 * Sapaan & informasi waktu saat ini tanpa animasi berjalan terus (update ringan tiap 30 detik).
 */
export const LiveClockBadge: React.FC<LiveClockBadgeProps> = ({ userName }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 11
      ? 'Selamat Pagi'
      : hour < 15
      ? 'Selamat Siang'
      : hour < 18
      ? 'Selamat Sore'
      : 'Selamat Malam';

  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white px-4 py-3 rounded-clay border border-blue-100/90 shadow-clay-sm flex flex-wrap items-center justify-between gap-2.5 animate-card-reveal">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg sm:text-xl select-none" aria-hidden="true">
          👋
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
            {greeting},{' '}
            <span className="text-blue-600">{userName || 'Tim Kampus UTD'}</span>
          </p>
          <p className="text-[11px] text-slate-500 font-medium truncate">{dateStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl">
        <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs sm:text-sm font-mono font-bold text-blue-900 tabular-nums">
          {timeStr} WIB
        </span>
      </div>
    </div>
  );
};
