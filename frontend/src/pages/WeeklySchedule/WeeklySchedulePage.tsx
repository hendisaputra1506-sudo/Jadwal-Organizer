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
  CheckCircle,
  ArrowRight,
  Sparkles,
  Building2,
  Layers,
  X,
  Filter,
  MessageSquareShare,
  Users,
  UserCheck,
  Tag,
  LayoutGrid,
  List,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { CategoryBadge, StatusBadge } from '../../components/common/Badge';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { LiveClockBadge } from '../../components/common/LiveClockBadge';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { WhatsAppSummaryModal } from '../../components/events/WhatsAppSummaryModal';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fireMicroConfetti } from '../../utils/confetti';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const WeeklySchedulePage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [focusedGridRef] = useAutoAnimate();

  // Current selected reference date (defaults to today)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isMyDutiesOnly, setIsMyDutiesOnly] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>(() => {
    try {
      return (localStorage.getItem('weekly_layout_mode') as any) || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tentativeCount, setTentativeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
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

  const handleToggleComplete = async (e: React.MouseEvent, ev: EventItem) => {
    e.stopPropagation();
    setCompletingId(ev.id);
    const isCurrentlyCompleted = ev.status === 'COMPLETED';
    const endpoint = isCurrentlyCompleted ? `/events/${ev.id}/uncomplete` : `/events/${ev.id}/complete`;
    const targetStatus = isCurrentlyCompleted
      ? (ev.date_precision === 'EXACT' ? 'CONFIRMED' : 'WAITING_CONFIRMATION')
      : 'COMPLETED';

    // Optimistic UI update
    setEvents((prev) =>
      prev.map((item) => (item.id === ev.id ? { ...item, status: targetStatus } : item))
    );

    try {
      const res: any = await api.patch(endpoint);
      if (res.success) {
        if (!isCurrentlyCompleted) {
          fireMicroConfetti();
          success(`"${ev.name}" berhasil ditandai Selesai.`);
        } else {
          success(`Status "${ev.name}" berhasil dikembalikan.`);
        }
      }
    } catch (err: any) {
      setEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, status: ev.status } : item))
      );
      toastError(err.message || 'Gagal mengubah status kegiatan.', 'Gagal');
    } finally {
      setCompletingId(null);
    }
  };

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
      if (isMyDutiesOnly && !ev.officers?.some((o) => o.user_id === user?.id)) {
        return false;
      }
      if (selectedCategoryFilter !== 'all' && ev.category_id !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ev.name.toLowerCase().includes(q);
        const matchLoc = (ev.location_name || ev.location?.name || '').toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        const matchOfficer = ev.officers?.some(
          (o) =>
            (o.user?.name || '').toLowerCase().includes(q) ||
            (o.role || '').toLowerCase().includes(q)
        );
        return matchName || matchLoc || matchDesc || matchOfficer;
      }
      return true;
    },
    [isMyDutiesOnly, user?.id, selectedCategoryFilter, searchQuery]
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

    // Filter active (uncompleted & uncancelled) events for today's live tracker
    const activeTodayEvents = todayEvents.filter(
      (e) => e.status !== 'CANCELLED' && e.status !== 'COMPLETED'
    );

    if (activeTodayEvents.length > 0) {
      // 1. Ongoing right now?
      const ongoing = activeTodayEvents.find(
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
      const nextUpcoming = activeTodayEvents.find(
        (e) => !e.is_all_day && e.start_time && e.start_time > currentHours
      );
      if (nextUpcoming) {
        return { heroEvent: nextUpcoming, heroEventBadge: 'Agenda Berikutnya', heroCountdownLabel: 'Hari Ini' };
      }

      // 3. Fallback to first active event today
      return { heroEvent: activeTodayEvents[0], heroEventBadge: 'Agenda Hari Ini', heroCountdownLabel: 'Hari Ini' };
    }

    // If no active events today, find nearest upcoming event this week
    const upcomingThisWeek = events.find(
      (e) =>
        e.status !== 'CANCELLED' &&
        e.status !== 'COMPLETED' &&
        e.event_date &&
        e.event_date.split('T')[0] >= todayStr
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

        {/* EXECUTIVE FOCUS STRIP: Ringkasan Hari Ini, Telemetri, & Switcher Layout */}
        <div className="bg-white p-3.5 sm:p-4 rounded-clay border border-slate-200/90 shadow-clay-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Agenda Hari Ini Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  Agenda Hari Ini ({daysOfWeek.find((d) => d.isToday)?.dayName || 'Hari Ini'})
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {(eventsByDay[formatDateYMD(new Date())] || []).length} Kegiatan
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {heroEvent
                  ? `Kegiatan berikutnya: ${heroEvent.name} (${
                      heroEvent.is_all_day
                        ? 'Sepanjang Hari'
                        : `${heroEvent.start_time} WIB`
                    }) • ${heroEvent.location_name || heroEvent.location?.name || 'Lokasi Kampus'}`
                  : 'Tidak ada agenda kegiatan mendesak hari ini. Semua terpantau aman.'}
              </p>
            </div>
          </div>

          {/* Right: Quick Status Pills & Layout Switcher */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-shrink-0">
            {/* Status Pills */}
            {definiteConflictCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>{definiteConflictCount} Bentrok</span>
              </button>
            ) : (
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>0 Bentrok</span>
              </span>
            )}

            {tentativeCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/tentative')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{tentativeCount} Tentatif</span>
              </button>
            )}

            {/* WA Summary Share Button */}
            <button
              type="button"
              onClick={() => setIsWhatsAppSummaryOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Bagikan ringkasan kegiatan ke WhatsApp grup"
            >
              <MessageSquareShare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rangkuman WA</span>
            </button>

            {/* Layout Toggle: Grid vs Compact List */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('grid');
                  try {
                    localStorage.setItem('weekly_layout_mode', 'grid');
                  } catch {}
                }}
                className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kolom Grid 7 Hari"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('compact');
                  try {
                    localStorage.setItem('weekly_layout_mode', 'compact');
                  } catch {}
                }}
                className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'compact'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Mode Ringkas (List Garis Bersih)"
              >
                <List className="w-4 h-4" />
              </button>
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
                onClick={() => setIsMyDutiesOnly(!isMyDutiesOnly)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMyDutiesOnly
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
                title="Tampilkan hanya agenda yang menugaskan Anda"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Tugas Saya {isMyDutiesOnly && '✓'}</span>
              </button>
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
          layoutMode === 'compact' ? (
            /* =========================================================================
               A. COMPACT AGENDA LIST VIEW (Super clean, high-density, no clutter)
               ========================================================================= */
            <div className="bg-white rounded-clay border border-slate-200/90 shadow-clay-card divide-y divide-slate-100 overflow-hidden">
              {daysOfWeek.map((day) => {
                const dayEvs = filteredEventsByDay[day.dateStr] || [];

                return (
                  <div key={day.dateStr} className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          day.isToday ? 'text-blue-600' : 'text-slate-800'
                        }`}
                      >
                        {day.dayName}, {day.dayNumber} {day.monthShort}
                      </span>
                      {day.isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          Hari Ini
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        ({dayEvs.length} Kegiatan)
                      </span>
                    </div>

                    {dayEvs.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1 pl-2">
                        Tidak ada agenda kegiatan
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {dayEvs.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => navigate(`/events/${ev.id}`)}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/40 transition-colors cursor-pointer border border-slate-100 hover:border-blue-200 gap-2 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Category Dot */}
                              <span
                                style={{ backgroundColor: ev.category?.color || '#3B82F6' }}
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                title={ev.category?.name}
                              />

                              {/* Time */}
                              <span className="text-xs font-bold text-slate-700 w-28 flex-shrink-0 font-mono">
                                {ev.is_all_day
                                  ? 'Sepanjang Hari'
                                  : ev.start_time && ev.end_time
                                  ? `${ev.start_time} – ${ev.end_time}`
                                  : 'Jam fleksibel'}
                              </span>

                              {/* Title */}
                              <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                                {ev.name}
                              </span>

                              {/* Location */}
                              {(ev.location_name || ev.location?.name) && (
                                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-xs">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  {ev.location_name || ev.location?.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                              {/* Officers Badge */}
                              {ev.officers && ev.officers.length > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5 text-purple-600" />
                                  {ev.officers.some((o) => o.user_id === user?.id)
                                    ? `Tugas Anda (${ev.officers.find((o) => o.user_id === user?.id)?.role})`
                                    : `${ev.officers.length} Petugas`}
                                </span>
                              )}

                              {/* Status Badge */}
                              <StatusBadge status={ev.status} size="sm" />

                              {/* Complete Button */}
                              {ev.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  disabled={completingId === ev.id}
                                  onClick={(e) => handleToggleComplete(e, ev)}
                                  title={ev.status === 'COMPLETED' ? 'Selesai' : 'Tandai Selesai'}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-600 cursor-pointer"
                                >
                                  {ev.status === 'COMPLETED' ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* =========================================================================
               B. DESKTOP 7-COLUMN BENTO GRID VIEW
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
                        <div
                          key={event.id}
                          onClick={() => navigate(`/events/${event.id}`)}
                          style={{
                            borderLeftColor: event.category?.color || '#3B82F6',
                            ['--stagger-i' as any]: Math.min(evIdx, 8),
                          }}
                          className="bg-white p-3 rounded-clay-sm border border-slate-200/90 border-l-[3.5px] shadow-clay-sm interactive-card animate-card-reveal cursor-pointer space-y-2 group"
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

                          {/* Officers Badge */}
                          {event.officers && event.officers.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50/80 px-1.5 py-0.5 rounded border border-purple-100 truncate">
                              <Users className="w-2.5 h-2.5 text-purple-600 flex-shrink-0" />
                              <span className="truncate">
                                {event.officers.some((o) => o.user_id === user?.id)
                                  ? `Tugas Anda (${event.officers.find((o) => o.user_id === user?.id)?.role})`
                                  : `${event.officers.length} Petugas`}
                              </span>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100/80">
                            <div className="flex flex-wrap items-center gap-1">
                              <CategoryBadge
                                name={event.category.name}
                                color={event.category.color}
                                size="sm"
                              />
                              <StatusBadge status={event.status} size="sm" />
                            </div>
                            {event.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                disabled={completingId === event.id}
                                onClick={(e) => handleToggleComplete(e, event)}
                                title={
                                  event.status === 'COMPLETED'
                                    ? 'Selesai (Klik untuk kembalikan status)'
                                    : 'Tandai Kegiatan Selesai'
                                }
                                className={`p-1 rounded-md transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50 ${
                                  event.status === 'COMPLETED'
                                    ? 'text-emerald-600 hover:text-slate-600 hover:bg-slate-100'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {event.status === 'COMPLETED' ? (
                                  <CheckCircle className="w-3.5 h-3.5 fill-emerald-100" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )) : (
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
                        <div
                          key={event.id}
                          onClick={() => navigate(`/events/${event.id}`)}
                          style={{
                            borderLeftColor: event.category?.color || '#3B82F6',
                            ['--stagger-i' as any]: Math.min(evIdx, 8),
                          }}
                          className="bg-slate-50/80 hover:bg-white p-4 rounded-clay border border-slate-200/90 border-l-[4px] shadow-clay-sm interactive-card animate-card-reveal cursor-pointer flex flex-col justify-between space-y-3 group"
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

                            {/* Officers Badge */}
                            {event.officers && event.officers.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50/80 px-2 py-1 rounded-md border border-purple-100 truncate">
                                <Users className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                <span className="truncate">
                                  {event.officers.some((o) => o.user_id === user?.id) ? (
                                    <strong className="font-bold">
                                      Tugas Anda: {event.officers.find((o) => o.user_id === user?.id)?.role}
                                    </strong>
                                  ) : (
                                    <span>
                                      Petugas: {event.officers.map((o) => `${o.user?.name || 'Staf'} (${o.role})`).join(', ')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <CategoryBadge
                                name={event.category.name}
                                color={event.category.color}
                                size="sm"
                              />
                              <div className="flex items-center gap-2">
                                {event.status !== 'CANCELLED' && (
                                  <button
                                    type="button"
                                    disabled={completingId === event.id}
                                    onClick={(e) => handleToggleComplete(e, event)}
                                    title={
                                      event.status === 'COMPLETED'
                                        ? 'Selesai (Klik untuk kembalikan status)'
                                        : 'Tandai Kegiatan Selesai'
                                    }
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                      event.status === 'COMPLETED'
                                        ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                                        : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'
                                    }`}
                                  >
                                    {event.status === 'COMPLETED' ? (
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    <span>{event.status === 'COMPLETED' ? 'Selesai' : 'Tandai Selesai'}</span>
                                  </button>
                                )}
                                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                                  Detail &rarr;
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* =========================================================================
           C. MOBILE VIEW (Visible on small screens: md:hidden when selectedDayFilter is 'all' and not in compact mode)
           ========================================================================= */}
        {selectedDayFilter === 'all' && layoutMode !== 'compact' && (
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
                            <div className="flex items-center gap-2">
                              {event.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  disabled={completingId === event.id}
                                  onClick={(e) => handleToggleComplete(e, event)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                    event.status === 'COMPLETED'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {event.status === 'COMPLETED' ? (
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>{event.status === 'COMPLETED' ? 'Selesai' : 'Tandai Selesai'}</span>
                                </button>
                              )}
                              <span className="text-[11px] font-semibold text-blue-600">
                                Lihat Detail &rarr;
                              </span>
                            </div>
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
