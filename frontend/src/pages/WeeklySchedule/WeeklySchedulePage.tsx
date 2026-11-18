import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  Layers,
  X,
  Filter,
  MessageSquareShare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { CategoryBadge, StatusBadge } from '../../components/common/Badge';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { BorderBeam } from '../../components/common/BorderBeam';
import { TiltCard } from '../../components/common/TiltCard';
import { ParticlesCanvas } from '../../components/common/ParticlesCanvas';
import { Meteors } from '../../components/common/Meteors';
import { LiveClockBadge } from '../../components/common/LiveClockBadge';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { WhatsAppSummaryModal } from '../../components/events/WhatsAppSummaryModal';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const WeeklySchedulePage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [focusedGridRef] = useAutoAnimate();

  // Current selected reference date (defaults to today)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tentativeCount, setTentativeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWhatsAppSummaryOpen, setIsWhatsAppSummaryOpen] = useState<boolean>(false);

  // Helper to calculate Monday of the week
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const monday = getMonday(currentDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDateYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDateStr = formatDateYMD(monday);
  const endDateStr = formatDateYMD(sunday);

  // Indonesian date formatter
  const formatRangeLabel = (start: Date, end: Date): string => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  };

  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const daysOfWeek = useMemo(() => {
    const todayStr = formatDateYMD(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateYMD(d);
      const isToday = dateStr === todayStr;

      return {
        date: d,
        dateStr,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        monthShort: monthsShort[d.getMonth()],
        isToday,
      };
    });
  }, [monday]);

  const fetchWeeklyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/events/weekly?startDate=${startDateStr}&endDate=${endDateStr}`);
      if (res.success && res.data) {
        setEvents(res.data);
      }

      // Also get count of pending tentative events for warning banner
      const tentativeRes: any = await api.get('/events/tentative');
      if (tentativeRes.success && tentativeRes.data) {
        setTentativeCount(tentativeRes.data.length);
      }
    } catch (err) {
      console.error('Failed to load weekly schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const newDate = new Date(monday);
    newDate.setDate(monday.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(monday);
    newDate.setDate(monday.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Group events by YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    daysOfWeek.forEach((day) => {
      map[day.dateStr] = [];
    });

    events.forEach((ev) => {
      if (ev.event_date) {
        const dateOnly = ev.event_date.split('T')[0];
        if (map[dateOnly]) {
          map[dateOnly].push(ev);
        }
      }
    });

    // Sort events by start_time
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    });

    return map;
  }, [daysOfWeek, events]);

  // Calculate conflict counts for the week
  const definiteConflictCount = useMemo(() => {
    let count = 0;
    daysOfWeek.forEach((day) => {
      const dayEvs = eventsByDay[day.dateStr] || [];
      const locationMap: Record<string, EventItem[]> = {};
      dayEvs.forEach((e) => {
        if (e.location_id) {
          if (!locationMap[e.location_id]) locationMap[e.location_id] = [];
          locationMap[e.location_id].push(e);
        }
      });
      Object.values(locationMap).forEach((group) => {
        if (group.length > 1) {
          count++;
        }
      });
    });
    return count;
  }, [daysOfWeek, eventsByDay]);

  // Extract unique categories and rooms for telemetry & filters
  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; color: string }>();
    events.forEach((ev) => {
      if (ev.category) {
        catMap.set(ev.category.id, {
          id: ev.category.id,
          name: ev.category.name,
          color: ev.category.color,
        });
      }
    });
    return Array.from(catMap.values());
  }, [events]);

  const uniqueRoomsCount = useMemo(() => {
    const rooms = new Set(
      events
        .map((e) => e.location_name || e.location?.name)
        .filter(Boolean) as string[]
    );
    return rooms.size;
  }, [events]);

  // Filter helper for events
  const filterEvent = useCallback(
    (ev: EventItem) => {
      if (selectedCategoryFilter !== 'all' && ev.category_id !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ev.name.toLowerCase().includes(q);
        const matchLoc = (ev.location_name || ev.location?.name || '').toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        return matchName || matchLoc || matchDesc;
      }
      return true;
    },
    [selectedCategoryFilter, searchQuery]
  );

  // Filtered events by day
  const filteredEventsByDay = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    daysOfWeek.forEach((day) => {
      map[day.dateStr] = (eventsByDay[day.dateStr] || []).filter(filterEvent);
    });
    return map;
  }, [daysOfWeek, eventsByDay, filterEvent]);

  // Derive Hero Event & Live Countdown for Executive Bento Card
  const { heroEvent, heroEventBadge, heroCountdownLabel } = useMemo(() => {
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayStr = formatDateYMD(today);
    const todayEvents = eventsByDay[todayStr] || [];

    const getCountdown = (dateStr?: string | null) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
      if (!y || !m || !d) return '';
      const target = new Date(y, m - 1, d);
      const diff = Math.round((target.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Hari Ini';
      if (diff === 1) return 'Besok (H-1)';
      if (diff === 2) return 'Lusa (H-2)';
      if (diff > 2) return `${diff} Hari Lagi (H-${diff})`;
      return '';
    };

    const currentHours =
      String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');

    if (todayEvents.length > 0) {
      // 1. Ongoing right now?
      const ongoing = todayEvents.find(
        (e) =>
          !e.is_all_day &&
          e.start_time &&
          e.end_time &&
          e.start_time <= currentHours &&
          e.end_time >= currentHours
      );
      if (ongoing) {
        return { heroEvent: ongoing, heroEventBadge: 'Sedang Berlangsung', heroCountdownLabel: 'Live Sekarang' };
      }

      // 2. Next upcoming event today?
      const nextUpcoming = todayEvents.find(
        (e) => !e.is_all_day && e.start_time && e.start_time > currentHours
      );
      if (nextUpcoming) {
        return { heroEvent: nextUpcoming, heroEventBadge: 'Agenda Berikutnya', heroCountdownLabel: 'Hari Ini' };
      }

      // 3. Fallback to first event today
      return { heroEvent: todayEvents[0], heroEventBadge: 'Agenda Hari Ini', heroCountdownLabel: 'Hari Ini' };
    }

    // If no events today, find nearest upcoming event this week
    const upcomingThisWeek = events.find(
      (e) => e.event_date && e.event_date.split('T')[0] >= todayStr
    );
    if (upcomingThisWeek) {
      return {
        heroEvent: upcomingThisWeek,
        heroEventBadge: 'Agenda Terdekat Pekan Ini',
        heroCountdownLabel: getCountdown(upcomingThisWeek.event_date),
      };
    }

    return { heroEvent: null, heroEventBadge: '', heroCountdownLabel: '' };
  }, [eventsByDay, events]);

  const totalFilteredEvents = useMemo(() => {
    return Object.values(filteredEventsByDay).reduce((acc, curr) => acc + curr.length, 0);
  }, [filteredEventsByDay]);

  return (
    <div className="min-h-screen pb-16 bg-[#F3F6FA]">
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Jadwal Minggu Ini"
        subtitle={formatRangeLabel(monday, sunday)}
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/events/new')}
          >
            Tambah Kegiatan
          </Button>
        }
      />

      <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
        {/* LIVE GREETING & REAL-TIME DIGITAL CLOCK */}
        <LiveClockBadge userName={user?.name} />

        {/* TOP CONTROL BAR: Week Navigation & Quick Range */}
        <div className="bg-white p-3 sm:p-4 rounded-clay border border-slate-200/80 shadow-clay-card flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between md:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Minggu Lalu</span>
              <span className="sm:hidden">Lalu</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCurrentWeek}
              leftIcon={<Calendar className="w-4 h-4 text-white" />}
            >
              <span className="hidden sm:inline">Minggu </span>Ini
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Minggu Depan</span>
              <span className="sm:hidden">Depan</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <button
              type="button"
              onClick={() => setIsWhatsAppSummaryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-clay-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Salin dan format ringkasan agenda mingguan untuk WhatsApp grup kampus"
            >
              <MessageSquareShare className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Salin Format WA Grup</span>
              <span className="sm:hidden">Format WA</span>
            </button>

            <div className="text-xs sm:text-sm font-black text-utd-navy-900 tracking-tight bg-blue-50/90 px-3.5 py-1.5 rounded-clay-sm border border-blue-200/70 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="truncate">{formatRangeLabel(monday, sunday)}</span>
            </div>

            {selectedDayFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className="text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-200/80 px-2.5 py-1.5 rounded-clay-sm transition-all"
              >
                Lihat 7 Hari
              </button>
            )}
          </div>
        </div>

        {/* BENTO ROW 1: Interactive 7-Day Week Strip */}
        <div className="bg-white p-2.5 sm:p-3.5 rounded-clay border border-slate-200/80 shadow-clay-card">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Pilih Tinjauan Hari
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                &bull; Klik hari untuk fokus melihat agenda
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayFilter('all')}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                selectedDayFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Hari ({events.length})
            </button>
          </div>

          <div className="flex sm:grid sm:grid-cols-7 gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1.5 snap-x">
            {daysOfWeek.map((day) => {
              const count = (eventsByDay[day.dateStr] || []).length;
              const isSelected = selectedDayFilter === day.dateStr;
              const dayEvs = eventsByDay[day.dateStr] || [];

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDayFilter((prev) => (prev === day.dateStr ? 'all' : day.dateStr))
                  }
                  className={`flex-shrink-0 min-w-[58px] sm:min-w-0 flex-1 flex flex-col items-center justify-center p-2 sm:p-3 rounded-clay-sm transition-all duration-200 active:scale-95 text-center relative group cursor-pointer snap-start ${
                    isSelected
                      ? 'text-white shadow-md'
                      : day.isToday
                      ? 'bg-blue-50/90 text-blue-950 border-2 border-blue-400 shadow-xs hover:bg-blue-100/70'
                      : 'bg-slate-50/90 text-slate-700 border border-slate-200/70 hover:bg-white hover:shadow-xs'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="weekly-day-active"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-clay-sm bg-gradient-to-br from-blue-600 to-indigo-600 ring-2 ring-blue-300 shadow-md"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full">
                  {/* Today Badge */}
                  {day.isToday && (
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold shadow-xs mb-1 whitespace-nowrap leading-none ${
                        isSelected ? 'bg-sky-300 text-slate-900' : 'bg-blue-500 text-white'
                      }`}
                    >
                      Hari Ini
                    </span>
                  )}

                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {day.dayName.slice(0, 3)}
                  </span>
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className="text-base sm:text-2xl font-black tracking-tight leading-none">
                      {day.dayNumber}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {day.monthShort}
                    </span>
                  </div>

                  {/* Event density dots / pills */}
                  <div className="mt-1 flex items-center justify-center gap-1">
                    {count === 0 ? (
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        0
                      </span>
                    ) : (
                      <>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-sky-300 text-slate-900'
                              : day.isToday
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {count}
                        </span>
                        <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
                          {dayEvs.slice(0, 3).map((e, idx) => (
                            <span
                              key={idx}
                              style={{ backgroundColor: e.category?.color || '#3B82F6' }}
                              className="w-1.5 h-1.5 rounded-full inline-block"
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BENTO ROW 2: Executive Focus & Operational Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* HERO CARD (Col Span 7): Agenda Prioritas Hari Ini dengan Border Beam, Partikel Interaktif & Meteors */}
          <div className="lg:col-span-7 bg-gradient-to-br from-[#0F1E3D] via-[#1D4ED8] to-[#2563EB] animate-aurora-bg text-white rounded-clay p-5 sm:p-6 lg:p-7 shadow-clay-card border border-blue-400/35 relative overflow-hidden flex flex-col justify-between group">
            <BorderBeam duration={5.5} colorFrom="#38BDF8" colorTo="#FFFFFF" borderWidth={3} />
            <ParticlesCanvas count={22} color="186, 230, 253" connectLines={true} />
            <Meteors number={8} />
            {/* Subtle Dot Grid Pattern */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none"
            />
            {/* Ambient Animated Background Accents */}
            <div className="absolute -top-12 -right-12 w-52 h-52 bg-sky-300/30 rounded-full blur-2xl pointer-events-none animate-ambient" />
            <div className="absolute -bottom-12 -left-10 w-48 h-48 bg-indigo-300/25 rounded-full blur-2xl pointer-events-none animate-ambient-reverse" />

            {heroEvent ? (
              <div className="relative z-10 space-y-4">
                {/* Top Badge & Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/35 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      {heroEventBadge}
                    </span>
                    {heroCountdownLabel && (
                      <span className="text-[11px] font-extrabold bg-white/15 text-white border border-white/25 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {heroCountdownLabel}
                      </span>
                    )}
                    <span className="text-xs text-blue-200 font-medium">
                      {heroEvent.event_date ? heroEvent.event_date.split('T')[0] : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        backgroundColor: `${heroEvent.category?.color || '#3B82F6'}30`,
                        color: heroEvent.category?.color || '#93C5FD',
                        borderColor: `${heroEvent.category?.color || '#3B82F6'}50`,
                      }}
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                    >
                      {heroEvent.category?.name || 'Kegiatan'}
                    </span>
                  </div>
                </div>

                {/* Event Name */}
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {heroEvent.name}
                  </h3>
                  {heroEvent.description && (
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                      {heroEvent.description}
                    </p>
                  )}
                </div>

                {/* Time & Location Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold bg-white/10 backdrop-blur-xs px-3 py-2 rounded-xl border border-white/10">
                    <Clock className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <span className="truncate">
                      {heroEvent.is_all_day
                        ? 'Sepanjang Hari'
                        : heroEvent.start_time && heroEvent.end_time
                        ? `${heroEvent.start_time} – ${heroEvent.end_time} WIB`
                        : 'Waktu belum diisi'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold bg-white/10 backdrop-blur-xs px-3 py-2 rounded-xl border border-white/10">
                    <MapPin className="w-4 h-4 text-rose-300 flex-shrink-0" />
                    <span className="truncate">
                      {heroEvent.location_name || heroEvent.location?.name || 'Lokasi Belum Ditentukan'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => navigate(`/events/${heroEvent.id}`)}
                    className="inline-flex items-center gap-2 bg-white text-utd-navy-900 hover:bg-blue-50 active:scale-95 text-xs sm:text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <span>Buka Detail Agenda</span>
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </button>

                  {heroEvent.contact_info && (
                    <span className="text-xs text-blue-200 truncate max-w-xs">
                      PIC: {heroEvent.contact_info}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10 py-6 sm:py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-blue-300 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Tidak Ada Agenda Mendesak Hari Ini
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                    Semua jadwal perkuliahan, rapat, dan kegiatan akademik terpantau aman dan terkendali.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/events/new')}
                  leftIcon={<Plus className="w-4 h-4 text-white" />}
                >
                  Jadwalkan Acara Baru
                </Button>
              </div>
            )}
          </div>

          {/* TELEMETRY BENTO TILES (Col Span 5): Konflik, Tentatif, & Keterisian Ruangan */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 sm:gap-3.5">
            {/* Tile 1: Status Konflik & Keamanan Jadwal */}
            {definiteConflictCount > 0 ? (
              <div className="p-4 rounded-clay bg-rose-50 border border-rose-300 text-rose-950 shadow-clay-sm interactive-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0 text-rose-600">
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-rose-900 leading-tight">
                      <AnimatedCounter value={definiteConflictCount} /> Potensi Bentrok Jadwal
                    </h4>
                    <p className="text-[11px] text-rose-700 truncate mt-0.5">
                      Ada jadwal bersamaan di lokasi yang sama
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-black text-rose-700 bg-rose-200/80 hover:bg-rose-300/80 active:scale-95 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer"
                >
                  Cek &rarr;
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-clay bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 shadow-clay-sm interactive-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-emerald-900 leading-tight">
                      Jadwal Aman Terkendali
                    </h4>
                    <p className="text-[11px] text-emerald-700 truncate mt-0.5">
                      Tidak ada bentrok ruangan atau jam minggu ini
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold bg-emerald-200/80 text-emerald-800 px-2.5 py-1 rounded-full flex-shrink-0">
                  0 Konflik
                </span>
              </div>
            )}

            {/* Tile 2: Status Tentatif & Konfirmasi */}
            {tentativeCount > 0 ? (
              <div className="p-4 rounded-clay bg-amber-50/90 border border-amber-200/80 text-amber-950 shadow-clay-sm interactive-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-amber-900 leading-tight">
                      <AnimatedCounter value={tentativeCount} /> Kegiatan Tentatif
                    </h4>
                    <p className="text-[11px] text-amber-700 truncate mt-0.5">
                      Menunggu konfirmasi tanggal/ruangan pasti
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/tentative')}
                  className="text-xs font-black text-amber-800 bg-amber-200/80 hover:bg-amber-300/80 active:scale-95 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer"
                >
                  Tinjau &rarr;
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-clay bg-white border border-slate-200/80 text-slate-800 shadow-clay-sm interactive-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      Semua Terjadwal Pasti
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Tidak ada kegiatan tertunda konfirmasi
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-500">Rapi</span>
              </div>
            )}

            {/* Tile 3: Ringkasan Aktivitas & Ruangan Terpakai */}
            <div className="p-4 rounded-clay bg-white border border-slate-200/80 shadow-clay-sm interactive-card flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Keterisian Kampus</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-utd-navy-900">
                  <AnimatedCounter value={uniqueRoomsCount} />{' '}
                  <span className="text-xs font-semibold text-slate-500">Lokasi Aktif</span>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-slate-200" />

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Total Agenda</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-blue-700">
                  <AnimatedCounter value={events.length} />{' '}
                  <span className="text-xs font-semibold text-slate-500">Kegiatan</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO ROW 3: Schedule Explorer & Filter Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-clay border border-slate-200/80 shadow-clay-card space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama agenda, ruangan, atau deskripsi..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-utd-navy-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Kategori
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryFilter((prev) => (prev === cat.id ? 'all' : cat.id))
                  }
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    style={{ backgroundColor: cat.color }}
                    className="w-1.5 h-1.5 rounded-full inline-block"
                  />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BENTO ROW 4: Main Schedule Content (Full 7-Column Grid or Focused Single Day View) */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : selectedDayFilter === 'all' ? (
          /* =========================================================================
             A. DESKTOP 7-COLUMN BENTO GRID VIEW
             ========================================================================= */
          <div className="hidden md:grid md:grid-cols-7 gap-3.5 items-start">
            {daysOfWeek.map((day) => {
              const dayEvents = filteredEventsByDay[day.dateStr] || [];

              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col rounded-clay border transition-all ${
                    day.isToday
                      ? 'bg-blue-50/30 border-2 border-[#12448F] shadow-clay-card'
                      : 'bg-white/95 border-slate-200/90 shadow-clay-sm'
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3 text-center border-b rounded-t-[16px] flex flex-col items-center justify-center ${
                      day.isToday
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b-2 border-sky-300 shadow-sm'
                        : 'bg-slate-50/90 text-slate-700 border-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider">
                      {day.dayName}
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black tracking-tight leading-none">
                        {day.dayNumber}
                      </span>
                      <span className="text-[11px] opacity-80 font-medium">{day.monthShort}</span>
                    </div>
                    {day.isToday && (
                      <span className="text-[9px] uppercase tracking-wider bg-sky-300 text-slate-900 px-2 py-0.5 rounded-full font-bold shadow-xs mt-1.5">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* Column Event Cards */}
                  <div className="p-2.5 space-y-2.5 min-h-[160px] flex flex-col justify-start">
                    {dayEvents.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
                        <Calendar className="w-5 h-5 mb-1.5 opacity-30" />
                        <p className="text-xs font-medium">Tidak ada kegiatan</p>
                      </div>
                    ) : (
                      dayEvents.map((event, evIdx) => (
                        <TiltCard
                          key={event.id}
                          maxTilt={9}
                          spotlightColor={`${event.category?.color || '#3B82F6'}30`}
                          onClick={() => navigate(`/events/${event.id}`)}
                          style={{
                            borderLeftColor: event.category?.color || '#3B82F6',
                            ['--stagger-i' as any]: Math.min(evIdx, 8),
                          }}
                          className="bg-white p-3 rounded-clay-sm border border-slate-200/90 border-l-[3.5px] shadow-clay-sm hover:shadow-clay-card-hover animate-card-reveal cursor-pointer space-y-2 group"
                        >
                          {/* Time */}
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="truncate">
                              {event.is_all_day
                                ? 'Sepanjang Hari'
                                : event.start_time && event.end_time
                                ? `${event.start_time} – ${event.end_time}`
                                : 'Jam belum ditentukan'}
                            </span>
                          </div>

                          {/* Event Name */}
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
                            {event.name}
                          </h4>

                          {/* Location */}
                          {(event.location_name || event.location) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">
                                {event.location_name || event.location?.name}
                              </span>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100/80">
                            <CategoryBadge
                              name={event.category.name}
                              color={event.category.color}
                              size="sm"
                            />
                            <StatusBadge status={event.status} size="sm" />
                          </div>
                        </TiltCard>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================================
             B. FOCUSED SINGLE DAY BENTO VIEW (When user clicks a specific day)
             ========================================================================= */
          <div className="space-y-4">
            {(() => {
              const activeDay = daysOfWeek.find((d) => d.dateStr === selectedDayFilter);
              const dayEvents = filteredEventsByDay[selectedDayFilter] || [];

              return (
                <div className="bg-white p-5 sm:p-6 rounded-clay border border-slate-200/80 shadow-clay-card space-y-4">
                  {/* Single Day Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                          {activeDay?.dayName.slice(0, 3)}
                        </span>
                        <span className="text-lg font-black leading-none">{activeDay?.dayNumber}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-xl font-black text-slate-900">
                            Agenda Hari {activeDay?.dayName}, {activeDay?.dayNumber}{' '}
                            {activeDay?.monthShort} {activeDay?.date.getFullYear()}
                          </h3>
                          {activeDay?.isToday && (
                            <span className="text-[10px] uppercase tracking-wider bg-sky-400 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ditemukan {dayEvents.length} kegiatan untuk hari ini
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDayFilter('all')}
                    >
                      Tampilkan Semua 7 Hari
                    </Button>
                  </div>

                  {/* Events List in Focused View */}
                  {dayEvents.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Tidak ada kegiatan di hari ini</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Silakan pilih hari lain atau jadwalkan kegiatan baru.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => navigate('/events/new')}
                      >
                        Tambah Kegiatan
                      </Button>
                    </div>
                  ) : (
                    <div
                      ref={focusedGridRef}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
                    >
                      {dayEvents.map((event, evIdx) => (
                        <TiltCard
                          key={event.id}
                          maxTilt={7}
                          onClick={() => navigate(`/events/${event.id}`)}
                          spotlightColor={`${event.category?.color || '#3B82F6'}2c`}
                          style={{
                            borderLeftColor: event.category?.color || '#3B82F6',
                            ['--stagger-i' as any]: Math.min(evIdx, 8),
                          }}
                          className="bg-slate-50/80 hover:bg-white p-4 rounded-clay border border-slate-200/90 border-l-[4px] shadow-clay-sm hover:shadow-clay-card-hover animate-card-reveal cursor-pointer space-y-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                                <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span>
                                  {event.is_all_day
                                    ? 'Sepanjang Hari'
                                    : event.start_time && event.end_time
                                    ? `${event.start_time} – ${event.end_time}`
                                    : 'Waktu belum diisi'}
                                </span>
                              </div>
                              <StatusBadge status={event.status} size="sm" />
                            </div>

                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 leading-snug">
                              {event.name}
                            </h4>

                            {event.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-200/70">
                            {(event.location_name || event.location) && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate">
                                  {event.location_name || event.location?.name}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <CategoryBadge
                                name={event.category.name}
                                color={event.category.color}
                                size="sm"
                              />
                              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                                Detail &rarr;
                              </span>
                            </div>
                          </div>
                        </TiltCard>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* =========================================================================
           C. MOBILE VIEW (Visible on small screens: md:hidden when selectedDayFilter is 'all')
           ========================================================================= */}
        {selectedDayFilter === 'all' && (
          <div className="md:hidden space-y-3">
            {daysOfWeek.map((day) => {
              const dayEvents = filteredEventsByDay[day.dateStr] || [];

              // If viewing all days on mobile and this day is empty, render a compact subtle strip
              if (dayEvents.length === 0) {
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDayFilter(day.dateStr)}
                    className={`p-3 rounded-clay-sm border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      day.isToday
                        ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                        : 'bg-white/70 border-slate-200/80 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {day.dayName}, {day.dayNumber} {day.monthShort}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">Tidak ada kegiatan</span>
                  </div>
                );
              }

              // Day with events or explicitly selected day
              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col rounded-clay border transition-all ${
                    day.isToday
                      ? 'bg-blue-50/40 border-2 border-blue-400 shadow-clay-card'
                      : 'bg-white/95 border-slate-200/90 shadow-clay-sm'
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-3 border-b rounded-t-[16px] flex items-center justify-between ${
                      day.isToday
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b-2 border-sky-300 shadow-sm'
                        : 'bg-slate-50 text-slate-800 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {day.dayName}
                      </span>
                      <span className="text-sm font-extrabold">
                        {day.dayNumber} {day.monthShort}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] uppercase tracking-wider bg-sky-300 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold opacity-75">
                      {dayEvents.length} Kegiatan
                    </span>
                  </div>

                  {/* Day Events */}
                  <div className="p-3 space-y-2.5">
                    {dayEvents.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Tidak ada kegiatan di hari ini.
                      </div>
                    ) : (
                      dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => navigate(`/events/${event.id}`)}
                          style={{
                            borderLeftColor: event.category?.color || '#3B82F6',
                          }}
                          className="bg-white p-3.5 rounded-clay-sm border border-slate-200 border-l-[3.5px] shadow-clay-sm active:bg-slate-50 transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                              <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span>
                                {event.is_all_day
                                  ? 'Sepanjang Hari'
                                  : event.start_time && event.end_time
                                  ? `${event.start_time} – ${event.end_time}`
                                  : 'Waktu belum diisi'}
                              </span>
                            </div>
                            <StatusBadge status={event.status} size="sm" />
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {event.name}
                          </h4>

                          {(event.location_name || event.location) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">
                                {event.location_name || event.location?.name}
                              </span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <CategoryBadge
                              name={event.category.name}
                              color={event.category.color}
                              size="sm"
                            />
                            <span className="text-[11px] font-semibold text-blue-600">
                              Lihat Detail &rarr;
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Format WhatsApp Agenda Mingguan */}
      <WhatsAppSummaryModal
        isOpen={isWhatsAppSummaryOpen}
        onClose={() => setIsWhatsAppSummaryOpen(false)}
        events={events}
        daysOfWeek={daysOfWeek}
      />
    </div>
  );
};
