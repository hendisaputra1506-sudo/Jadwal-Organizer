import { EventItem } from '../types/index';

interface WeekDayInfo {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthShort: string;
  isToday: boolean;
}

export interface SummaryFormatOptions {
  scope: 'week' | 'today' | 'custom_day';
  selectedDateStr?: string;
  includeTentative?: boolean;
  customNote?: string;
}

export function generateWhatsAppWeeklySummary(
  events: EventItem[],
  daysOfWeek: WeekDayInfo[],
  options: SummaryFormatOptions
): string {
  const { scope, selectedDateStr, includeTentative = false, customNote = '' } = options;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  let relevantDays: WeekDayInfo[] = [];

  if (scope === 'today') {
    const today = daysOfWeek.find((d) => d.isToday) || daysOfWeek[0];
    relevantDays = today ? [today] : [];
  } else if (scope === 'custom_day' && selectedDateStr) {
    const matched = daysOfWeek.find((d) => d.dateStr === selectedDateStr);
    relevantDays = matched ? [matched] : [];
  } else {
    // Default: Seluruh minggu
    relevantDays = daysOfWeek;
  }

  // Filter events
  let filteredEvents = events.filter((ev) => {
    if (!includeTentative && (ev.status === 'DRAFT' || ev.status === 'WAITING_CONFIRMATION')) {
      return false;
    }
    if (ev.status === 'CANCELLED') {
      return false;
    }
    return true;
  });

  // Map events by date
  const eventsByDate: Record<string, EventItem[]> = {};
  filteredEvents.forEach((ev) => {
    if (ev.event_date) {
      const dStr = ev.event_date.split('T')[0];
      if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
      eventsByDate[dStr].push(ev);
    }
  });

  // Urutkan agenda per hari berdasarkan start_time
  Object.keys(eventsByDate).forEach((dateKey) => {
    eventsByDate[dateKey].sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  });

  let message = '';

  // HEADER
  message += `📅 *JADWAL KEGIATAN KAMPUS UTD*\n`;
  message += `*Universitas Teknologi Digital — PSDKU Tegal*\n`;

  if (scope === 'today' && relevantDays[0]) {
    const d = relevantDays[0];
    message += `Agenda Hari Ini: ${d.dayName}, ${d.dayNumber} ${monthNames[d.date.getMonth()]} ${d.date.getFullYear()}\n`;
  } else if (scope === 'custom_day' && relevantDays[0]) {
    const d = relevantDays[0];
    message += `Agenda: ${d.dayName}, ${d.dayNumber} ${monthNames[d.date.getMonth()]} ${d.date.getFullYear()}\n`;
  } else if (daysOfWeek.length >= 7) {
    const start = daysOfWeek[0];
    const end = daysOfWeek[6];
    message += `Periode: ${start.dayNumber} ${start.monthShort} – ${end.dayNumber} ${end.monthShort} ${end.date.getFullYear()}\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let totalEventsCount = 0;

  // DAYS CONTENT
  relevantDays.forEach((day) => {
    const dayEvents = eventsByDate[day.dateStr] || [];
    totalEventsCount += dayEvents.length;

    message += `🗓️ *${day.dayName.toUpperCase()}, ${day.dayNumber} ${monthNames[day.date.getMonth()].toUpperCase()} ${day.date.getFullYear()}*\n`;

    if (dayEvents.length === 0) {
      message += `_Tidak ada agenda kegiatan terjadwal_\n\n`;
    } else {
      dayEvents.forEach((ev) => {
        const timeLabel = ev.is_all_day
          ? 'Sepanjang Hari'
          : ev.start_time && ev.end_time
          ? `${ev.start_time} – ${ev.end_time} WIB`
          : 'Jam menyesuaikan';

        message += `• *${timeLabel}* | ${ev.name}\n`;

        const locationStr = ev.location_name || ev.location?.name;
        if (locationStr) {
          message += `   📍 Lokasi: ${locationStr}\n`;
        }

        if (ev.contact_info) {
          message += `   👤 PIC: ${ev.contact_info}\n`;
        }

        if (ev.category?.name) {
          message += `   🏷️ ${ev.category.name}\n`;
        }

        if (ev.officers && ev.officers.length > 0) {
          const officerListStr = ev.officers
            .map((o) => `@${o.user?.name || 'Staf'} (${o.role})`)
            .join(', ');
          message += `   👥 Petugas: ${officerListStr}\n`;
        }

        message += `\n`;
      });
    }
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  // CATATAN KHUSUS / FOOTER
  if (customNote.trim()) {
    message += `ℹ️ *Catatan Khusus:*\n${customNote.trim()}\n\n`;
  } else {
    message += `ℹ️ *Catatan:*\nSeluruh personil yang bertugas dimohon hadir tepat waktu dan mempersiapkan perlengkapan sebelum kegiatan dimulai.\n\n`;
  }

  message += `_Sistem Terpadu Jadwal Bersama UTD PSDKU Tegal_\n`;
  message += `_Diperbarui otomatis pada: ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} WIB_`;

  return message;
}
