import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  HelpCircle,
  Calendar,
  Clock,
  MapPin,
  Plus,
  AlertTriangle,
  ChevronRight,
  Filter,
  MessageCircle,
  Copy,
} from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { CategoryBadge, StatusBadge, PrecisionBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { Tabs } from '../../components/common/Tabs';
import { WhatsAppFollowUpModal } from '../../components/events/WhatsAppFollowUpModal';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const TentativeEventsPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const [gridRef] = useAutoAnimate();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [followUpEvent, setFollowUpEvent] = useState<EventItem | null>(null);

  const fetchTentativeEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/events/tentative');
      if (res.success && res.data) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load tentative events:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTentativeEvents();
  }, [fetchTentativeEvents]);

  // Tab filtering
  const filteredEvents = events.filter((ev) => {
    if (activeTab === 'candidates') return ev.date_precision === 'CANDIDATES';
    if (activeTab === 'month_week')
      return ev.date_precision === 'MONTH' || ev.date_precision === 'WEEK';
    if (activeTab === 'overdue') return Boolean(ev.isOverdue);
    return true; // 'all'
  });

  const candidatesCount = events.filter((e) => e.date_precision === 'CANDIDATES').length;
  const monthWeekCount = events.filter(
    (e) => e.date_precision === 'MONTH' || e.date_precision === 'WEEK'
  ).length;
  const overdueCount = events.filter((e) => e.isOverdue).length;

  const tabItems = [
    { id: 'all', label: 'Semua Tentatif', count: events.length },
    { id: 'candidates', label: 'Kandidat Tanggal', count: candidatesCount },
    { id: 'month_week', label: 'Perkiraan Bulan / Minggu', count: monthWeekCount },
    ...(overdueCount > 0
      ? [{ id: 'overdue', label: '⏰ Perlu Update', count: overdueCount }]
      : []),
  ];

  const getCertaintyDisplay = (ev: EventItem) => {
    if (ev.date_precision === 'CANDIDATES') {
      return (
        <span className="font-semibold text-purple-700">
          {ev.candidate_dates?.length || 0} Opsi Kandidat Tanggal
        </span>
      );
    }
    if (ev.date_precision === 'WEEK') {
      return (
        <span className="font-semibold text-sky-700">
          {ev.estimated_week_label || 'Minggu Belum Ditentukan'}
        </span>
      );
    }
    if (ev.date_precision === 'MONTH') {
      return (
        <span className="font-semibold text-indigo-700">
          Perkiraan Bulan {ev.estimated_month || '—'}
        </span>
      );
    }
    return <span className="text-slate-500">Belum ada perkiraan tanggal</span>;
  };

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Kegiatan Tentatif"
        subtitle="Daftar kegiatan dengan tanggal belum pasti yang memerlukan pemantauan & kepastian"
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/events/new')}
          >
            <span className="hidden sm:inline">Tambah Kegiatan</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Info Box */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-clay p-3.5 sm:p-4 text-xs text-amber-900 flex items-start gap-2.5 sm:gap-3 shadow-clay-sm">
          <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Prinsip Kegiatan Tentatif</p>
            <p className="text-amber-800 leading-relaxed">
              Kegiatan pada halaman ini belum memiliki tanggal pasti atau masih menunggu
              konfirmasi dari pihak sekolah/mitra luar. Kegiatan tentatif sengaja tidak
              ditempatkan sembarangan ke sel kalender tanggal tertentu untuk mencegah salah paham
              jadwal.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pb-1">
          <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* List of Tentative Events */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Belum Ada Kegiatan Tentatif"
            description="Semua kegiatan saat ini telah terkonfirmasi dengan tanggal pasti."
            actionText="Buat Kegiatan Baru"
            onAction={() => navigate('/events/new')}
          />
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredEvents.map((event, idx) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                style={{ ['--stagger-i' as any]: Math.min(idx, 10) }}
                className="bg-white rounded-clay p-4 sm:p-5 border border-white/90 shadow-clay-card interactive-card animate-card-reveal cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 group"
              >
                <div>
                  {/* Top Bar: Badges & Overdue Alert */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryBadge
                        name={event.category.name}
                        color={event.category.color}
                        size="sm"
                      />
                      <StatusBadge status={event.status} size="sm" />
                      <PrecisionBadge precision={event.date_precision} size="sm" />
                    </div>

                    {event.isOverdue && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Lewat Perkiraan
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                    {event.name}
                  </h3>

                  {/* Schedule Certainty Info */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-clay-sm flex items-center gap-2.5 text-xs">
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Kepastian Jadwal
                      </span>
                      {getCertaintyDisplay(event)}
                    </div>
                  </div>

                  {/* Location & External Contact */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {(event.location_name || event.location) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{event.location_name || event.location?.name}</span>
                      </div>
                    )}
                    {event.contact_info && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-semibold text-[11px] text-slate-400">Kontak:</span>
                        <span className="truncate">{event.contact_info}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {event.candidate_dates?.length
                      ? `${event.candidate_dates.length} opsi tanggal`
                      : 'Menunggu konfirmasi'}
                  </span>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Quick Duplicate Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/new?duplicateFrom=${event.id}`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-clay-sm bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                      title="Duplikat Kegiatan Ini"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplikat</span>
                    </button>

                    {/* Quick WhatsApp Follow-up Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFollowUpEvent(event);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-clay-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Follow-up WhatsApp Narahubung"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Follow-up WA</span>
                    </button>

                    <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Detail</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WhatsAppFollowUpModal
        isOpen={Boolean(followUpEvent)}
        onClose={() => setFollowUpEvent(null)}
        event={followUpEvent}
      />
    </div>
  );
};
