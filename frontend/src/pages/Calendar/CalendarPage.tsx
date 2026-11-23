import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  HelpCircle,
  Plus,
  CheckCircle2,
  CheckCircle,
  Users,
  UserCheck,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Tabs } from '../../components/common/Tabs';
import { CategoryBadge, StatusBadge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fireMicroConfetti } from '../../utils/confetti';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const CalendarPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const getLocalDateStr = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<string>('month'); // 'month' | 'week'
  const [exactEvents, setExactEvents] = useState<EventItem[]>([]);
  const [tentativeEvents, setTentativeEvents] = useState<EventItem[]>([]);
  const [isMyDutiesOnly, setIsMyDutiesOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const formatSelectedDateLabel = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/events/monthly?year=${year}&month=${month}`);
      if (res.success && res.data) {
        setExactEvents(res.data.exactEvents || []);
        setTentativeEvents(res.data.tentativeEvents || []);
      }
    } catch (err) {
      console.error('Failed to load monthly calendar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handleToggleComplete = async (e: React.MouseEvent, ev: EventItem) => {
    e.stopPropagation();
    setCompletingId(ev.id);
    const isCurrentlyCompleted = ev.status === 'COMPLETED';
    const endpoint = isCurrentlyCompleted ? `/events/${ev.id}/uncomplete` : `/events/${ev.id}/complete`;
    const targetStatus = isCurrentlyCompleted
      ? (ev.date_precision === 'EXACT' ? 'CONFIRMED' : 'WAITING_CONFIRMATION')
      : 'COMPLETED';

    setExactEvents((prev) =>
      prev.map((item) => (item.id === ev.id ? { ...item, status: targetStatus } : item))
    );
    setTentativeEvents((prev) =>
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
      setExactEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, status: ev.status } : item))
      );
      setTentativeEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, status: ev.status } : item))
      );
      toastError(err.message || 'Gagal mengubah status kegiatan.', 'Gagal');
    } finally {
      setCompletingId(null);
    }
  };

  // Calendar Grid Calculation for Month View
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  // Day of week: 0=Sun, 1=Mon... Let's align to Mon=0..Sun=6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDays = lastDayOfMonth.getDate();

  // Calendar cells (previous month padding + current days + next month padding)
  const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Prev month padding
  const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dNum = prevMonthLastDate - i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    cells.push({ dateStr, dayNumber: dNum, isCurrentMonth: false, isToday: false });
  }

  // Current month days
  const todayStr = getLocalDateStr(new Date());
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, dayNumber: d, isCurrentMonth: true, isToday: dateStr === todayStr });
  }

  // Next month padding to fill complete weeks (multiple of 7)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, dayNumber: d, isCurrentMonth: false, isToday: false });
  }

  // Map events to date strings
  const filteredExactEvents = isMyDutiesOnly
    ? exactEvents.filter((ev) => ev.officers?.some((o) => o.user_id === user?.id))
    : exactEvents;

  const eventsByDate: Record<string, EventItem[]> = {};
  filteredExactEvents.forEach((ev) => {
    if (ev.event_date) {
      const dStr = ev.event_date.split('T')[0];
      if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
      eventsByDate[dStr].push(ev);
    }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getLocalDateStr(now));
  };

  const dayHeaders = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Kalender Kegiatan"
        subtitle={`${monthNames[month - 1]} ${year}`}
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

      <div className="p-3 sm:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Navigation Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-clay border border-white/80 shadow-clay-card flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Bulan Lalu</span>
              <span className="sm:hidden">Lalu</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCurrentMonth}
              leftIcon={<CalendarIcon className="w-4 h-4 text-blue-600" />}
            >
              <span className="hidden sm:inline">Bulan </span>Ini
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Bulan Depan</span>
              <span className="sm:hidden">Depan</span>
            </Button>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight text-center">
            {monthNames[month - 1]} {year}
          </h3>

          <div className="w-full sm:w-auto flex items-center justify-center sm:justify-end gap-2">
            <Button
              variant={isMyDutiesOnly ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setIsMyDutiesOnly((prev) => !prev)}
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              className={`flex-1 sm:flex-none ${
                isMyDutiesOnly
                  ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                  : 'text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100'
              }`}
              title="Tampilkan hanya kegiatan di mana Anda ditugaskan"
            >
              {isMyDutiesOnly ? 'Tugas Saya Saja ✓' : 'Tugas Saya'}
            </Button>
            <Tabs
              tabs={[
                { id: 'month', label: 'Bulan' },
                { id: 'week', label: 'Minggu' },
              ]}
              activeTab={viewMode}
              onChange={(val) => {
                if (val === 'week') {
                  navigate('/weekly');
                } else {
                  setViewMode(val);
                }
              }}
            />
          </div>
        </div>

        {/* Calendar Grid + Side Tentative Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
          {/* Main Calendar View Area */}
          <div className="lg:col-span-3 bg-white rounded-clay p-3 sm:p-6 border border-white/90 shadow-clay-card space-y-4">
            {/* 1. DESKTOP VIEW: Full 7-column expansive grid (sm:block) */}
            <div className="hidden sm:block">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayHeaders.map((dh) => (
                  <div
                    key={dh}
                    className="text-center py-2 text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    {dh}
                  </div>
                ))}
              </div>

              {/* Desktop Grid cells */}
              <div className="grid grid-cols-7 gap-2">
                {cells.map((cell, idx) => {
                  const dayEvs = eventsByDate[cell.dateStr] || [];
                  const maxVisible = 2;
                  const overflowCount = dayEvs.length - maxVisible;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-2 rounded-clay-sm border flex flex-col transition-all duration-200 ${
                        cell.isToday
                          ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100 shadow-sm'
                          : cell.isCurrentMonth
                          ? 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-blue-200 hover:shadow-clay-sm'
                          : 'bg-slate-100/40 border-slate-100 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-blue-600 text-white'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                      </div>

                      {/* Day Events */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayEvs.slice(0, maxVisible).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => navigate(`/events/${ev.id}`)}
                            style={{
                              backgroundColor: `${ev.category.color}15`,
                              borderLeftColor: ev.category.color,
                            }}
                            className="px-1.5 py-1 text-[11px] font-semibold text-slate-800 rounded border-l-2 truncate cursor-pointer hover:translate-x-0.5 hover:shadow-xs transition-all"
                            title={`${ev.name} (${ev.start_time || 'Sepanjang Hari'})`}
                          >
                            <span className="truncate">{ev.name}</span>
                          </div>
                        ))}

                        {overflowCount > 0 && (
                          <button
                            onClick={() => navigate('/events')}
                            className="text-[10px] font-bold text-blue-600 hover:underline block pt-0.5"
                          >
                            +{overflowCount} lainnya
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. MOBILE VIEW: Interactive Compact Month Calendar + Day Agenda (sm:hidden) */}
            <div className="sm:hidden space-y-4">
              {/* Mobile Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {dayHeaders.map((dh) => (
                  <div key={dh} className="text-[11px] font-bold text-slate-500 py-1">
                    {dh.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Mobile compact date cells */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  const dayEvs = eventsByDate[cell.dateStr] || [];
                  const isSelected = selectedDate === cell.dateStr;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center p-0.5 relative transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-[#12448F] text-white shadow-md ring-2 ring-blue-400 font-extrabold z-10'
                          : cell.isToday
                          ? 'bg-blue-50/80 text-blue-700 font-bold border border-blue-300'
                          : cell.isCurrentMonth
                          ? 'bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                          : 'text-slate-300 opacity-40'
                      }`}
                    >
                      <span className="text-xs leading-none">{cell.dayNumber}</span>

                      {/* Colored Indicator Dots for Events */}
                      {dayEvs.length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-1">
                          {dayEvs.slice(0, 3).map((ev, dIdx) => (
                            <span
                              key={dIdx}
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                isSelected ? 'bg-white' : ''
                              }`}
                              style={{
                                backgroundColor: isSelected ? '#FFFFFF' : ev.category?.color || '#12448F',
                              }}
                            />
                          ))}
                          {dayEvs.length > 3 && (
                            <span
                              className={`text-[8px] leading-none ${
                                isSelected ? 'text-white' : 'text-blue-600'
                              }`}
                            >
                              +
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Mobile Agenda Panel */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {formatSelectedDateLabel(selectedDate)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/events/new')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Tambah
                  </Button>
                </div>

                {/* Events on selected date */}
                {(() => {
                  const currentSelectedEvents = eventsByDate[selectedDate] || [];
                  if (currentSelectedEvents.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/40 rounded-xl border border-dashed border-slate-200">
                        Tidak ada kegiatan terjadwal pada tanggal ini.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {currentSelectedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => navigate(`/events/${ev.id}`)}
                          className="bg-white p-3.5 rounded-clay-sm border border-slate-200 shadow-clay-sm active:bg-slate-50 transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                              <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span>
                                {ev.is_all_day
                                  ? 'Sepanjang Hari'
                                  : ev.start_time && ev.end_time
                                  ? `${ev.start_time} – ${ev.end_time}`
                                  : 'Waktu belum diisi'}
                              </span>
                            </div>
                            <StatusBadge status={ev.status} size="sm" />
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {ev.name}
                          </h4>

                          {(ev.location_name || ev.location) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{ev.location_name || ev.location?.name}</span>
                            </div>
                          )}

                          {ev.officers && ev.officers.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded border border-purple-100">
                              <Users className="w-3 h-3 text-purple-600 flex-shrink-0" />
                              <span className="truncate">
                                {ev.officers.some((o) => o.user_id === user?.id)
                                  ? `Tugas Anda (${ev.officers.find((o) => o.user_id === user?.id)?.role})`
                                  : `${ev.officers.length} Petugas: ${ev.officers.map((o) => o.user?.name).join(', ')}`}
                              </span>
                            </div>
                          )}

                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                            <CategoryBadge
                              name={ev.category.name}
                              color={ev.category.color}
                              size="sm"
                            />
                            <div className="flex items-center gap-2">
                              {ev.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  disabled={completingId === ev.id}
                                  onClick={(e) => handleToggleComplete(e, ev)}
                                  title={
                                    ev.status === 'COMPLETED'
                                      ? 'Selesai (Klik untuk kembalikan status)'
                                      : 'Tandai Kegiatan Selesai'
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                    ev.status === 'COMPLETED'
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'
                                  }`}
                                >
                                  {ev.status === 'COMPLETED' ? (
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>{ev.status === 'COMPLETED' ? 'Selesai' : 'Tandai Selesai'}</span>
                                </button>
                              )}
                              <span className="text-[11px] font-semibold text-blue-600">
                                Lihat Detail &rarr;
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Panel: Kegiatan Tentatif Bulan Ini */}
          <div className="lg:col-span-1 bg-white rounded-clay p-5 border border-white/90 shadow-clay-card space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Kegiatan Belum Pasti</h4>
                <p className="text-[11px] text-slate-500">
                  Perkiraan {monthNames[month - 1]} {year}
                </p>
              </div>
            </div>

            {tentativeEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada kegiatan tentatif yang menunggu kepastian di bulan ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tentativeEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="p-3 rounded-clay-sm bg-slate-50 border border-slate-200/80 shadow-clay-sm hover:shadow-clay-card-hover transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <CategoryBadge
                        name={ev.category.name}
                        color={ev.category.color}
                        size="sm"
                      />
                      <StatusBadge status={ev.status} size="sm" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 line-clamp-2">{ev.name}</h5>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {ev.date_precision === 'CANDIDATES'
                          ? `${ev.candidate_dates?.length || 0} Kandidat Tanggal`
                          : ev.estimated_week_label || 'Perkiraan Bulan'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
