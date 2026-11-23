import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Users,
  AlertCircle,
  Tag,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CategoryBadge, StatusBadge, PrecisionBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

type DutyTab = 'UPCOMING' | 'ALL' | 'COMPLETED';

export const MyDutiesPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [listRef] = useAutoAnimate();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DutyTab>('UPCOMING');

  const fetchMyDuties = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res: any = await api.get(`/events?officerUserId=${user.id}`);
      if (res.success && res.data) {
        setEvents(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat jadwal tugas Anda.', 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [user, toastError]);

  useEffect(() => {
    fetchMyDuties();
  }, [fetchMyDuties]);

  // Helper date checker
  const isEventUpcomingOrToday = (ev: EventItem) => {
    if (ev.status === 'COMPLETED' || ev.status === 'CANCELLED') return false;
    if (!ev.event_date) return true; // Tentative is upcoming
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evDate = new Date(ev.event_date);
    evDate.setHours(0, 0, 0, 0);
    return evDate.getTime() >= today.getTime();
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Tab filter
      if (activeTab === 'UPCOMING') {
        if (!isEventUpcomingOrToday(ev)) return false;
      } else if (activeTab === 'COMPLETED') {
        if (ev.status !== 'COMPLETED') return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const myRole = (ev.officers?.find((o) => o.user_id === user?.id)?.role || '').toLowerCase();
        const nameMatch = ev.name.toLowerCase().includes(query);
        const catMatch = ev.category?.name.toLowerCase().includes(query);
        const locMatch = (ev.location_name || ev.location?.name || '').toLowerCase().includes(query);
        const roleMatch = myRole.includes(query);

        if (!nameMatch && !catMatch && !locMatch && !roleMatch) {
          return false;
        }
      }

      return true;
    });
  }, [events, activeTab, search, user?.id]);

  // Statistics
  const stats = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter(isEventUpcomingOrToday).length;
    const completed = events.filter((ev) => ev.status === 'COMPLETED').length;
    return { total, upcoming, completed };
  }, [events]);

  const formatDateDisplay = (ev: EventItem) => {
    if (ev.event_date) {
      const d = new Date(ev.event_date);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (ev.date_precision === 'WEEK') {
      return ev.estimated_week_label || 'Perkiraan Minggu';
    }
    if (ev.date_precision === 'MONTH') {
      return `Bulan ${ev.estimated_month || 'Perkiraan'}`;
    }
    return 'Tanggal Belum Pasti';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Jadwal Tugas Saya"
        subtitle={`Daftar seluruh kegiatan kampus di mana Anda (${user?.name || 'Staf'}) ditugaskan sebagai personil/petugas`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMyDuties}
            isLoading={isLoading}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Segarkan Data</span>
            <span className="sm:hidden">Segarkan</span>
          </Button>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-clay bg-white border border-slate-200/80 shadow-clay-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Tugas Saya</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
            </div>
          </div>

          <div className="p-4 rounded-clay bg-white border border-slate-200/80 shadow-clay-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Tugas Mendatang / Aktif</p>
              <h3 className="text-2xl font-extrabold text-blue-600 mt-0.5">{stats.upcoming}</h3>
            </div>
          </div>

          <div className="p-4 rounded-clay bg-white border border-slate-200/80 shadow-clay-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Tugas Telah Selesai</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.completed}</h3>
            </div>
          </div>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="p-4 rounded-clay bg-white border border-slate-200/80 shadow-clay-sm space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-clay-sm border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'UPCOMING'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mendatang ({stats.upcoming})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Tugas ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({stats.completed})
              </button>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <Input
                placeholder="Cari kegiatan, peran, atau tempat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>
        </div>

        {/* Duty Cards List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-clay bg-white border border-slate-200 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-clay bg-white border border-slate-200 shadow-clay-sm space-y-3">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">
              {search.trim()
                ? 'Tidak ada tugas yang cocok dengan pencarian'
                : activeTab === 'UPCOMING'
                ? 'Tidak ada jadwal tugas mendatang saat ini'
                : 'Belum ada jadwal tugas'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Saat Anda ditugaskan pada suatu kegiatan oleh koordinator atau pembuat jadwal, kegiatan tersebut akan otomatis tampil di halaman ini.
            </p>
          </div>
        ) : (
          <div ref={listRef} className="space-y-3.5">
            {filteredEvents.map((ev) => {
              const myOfficerInfo = ev.officers?.find((o) => o.user_id === user?.id);
              const otherOfficers = ev.officers?.filter((o) => o.user_id !== user?.id) || [];
              const isCompleted = ev.status === 'COMPLETED';

              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className={`p-4 sm:p-5 rounded-clay border transition-all cursor-pointer hover:shadow-clay-md group ${
                    isCompleted
                      ? 'bg-slate-50/70 border-slate-200 opacity-90'
                      : 'bg-white border-purple-100 hover:border-purple-300 shadow-clay-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <CategoryBadge name={ev.category?.name || 'Umum'} color={ev.category?.color} />
                      <StatusBadge status={ev.status} />
                      <PrecisionBadge precision={ev.date_precision} />
                    </div>

                    {/* Role Tag (Prominent) */}
                    {myOfficerInfo && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs shadow-xs">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>Peran Anda: {myOfficerInfo.role}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight mb-2.5">
                    {ev.name}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs text-slate-600 mb-3.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-800">{formatDateDisplay(ev)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>
                        {ev.is_all_day
                          ? 'Sepanjang Hari'
                          : ev.start_time && ev.end_time
                          ? `${ev.start_time} – ${ev.end_time} WIB`
                          : 'Jam menyesuaikan'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        {ev.location_name || ev.location?.name || 'Lokasi belum ditentukan'}
                      </span>
                    </div>
                  </div>

                  {/* Other Officers Tagged */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500 font-medium">Tim Petugas:</span>
                      {otherOfficers.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {otherOfficers.slice(0, 3).map((oo) => (
                            <span
                              key={oo.id || oo.user_id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {oo.user?.name || 'Staf'} ({oo.role})
                            </span>
                          ))}
                          {otherOfficers.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{otherOfficers.length - 3} lainnya
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Hanya Anda yang ditugaskan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-purple-600 group-hover:text-purple-800 font-bold text-xs ml-auto">
                      <span>Buka Rincian Kegiatan</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
