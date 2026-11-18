import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Search,
  Filter,
  RotateCcw,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { CategoryBadge, StatusBadge, PrecisionBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Skeleton } from '../../components/feedback/Skeleton';
import { api } from '../../services/api';
import { EventItem, Category, Location } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

interface EventDateGroup {
  dateKey: string;
  dateLabel: string;
  dayName?: string;
  isExact: boolean;
  events: EventItem[];
}

export const AllEventsPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [mobileCardsRef] = useAutoAnimate();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedPrecision, setSelectedPrecision] = useState<string>('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch categories & locations
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, locRes]: [any, any] = await Promise.all([
          api.get('/categories'),
          api.get('/locations'),
        ]);
        if (catRes.success) setCategories(catRes.data);
        if (locRes.success) setLocations(locRes.data);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedLocation) params.append('locationId', selectedLocation);
      if (selectedPrecision) params.append('datePrecision', selectedPrecision);

      const res: any = await api.get(`/events?${params.toString()}`);
      if (res.success && res.data) {
        setEvents(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat daftar kegiatan.', 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedStatus, selectedLocation, selectedPrecision, toastError]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedLocation('');
    setSelectedPrecision('');
  };

  const hasActiveFilters = Boolean(
    search || selectedCategory || selectedStatus || selectedLocation || selectedPrecision
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/events/${deleteTarget.id}`);
      success('Kegiatan berhasil dihapus.');
      setDeleteTarget(null);
      fetchEvents();
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus kegiatan.', 'Gagal');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateCell = (ev: EventItem) => {
    if (ev.date_precision === 'EXACT' && ev.event_date) {
      const datePart = typeof ev.event_date === 'string'
        ? ev.event_date.split('T')[0]
        : new Date(ev.event_date).toISOString().split('T')[0];
      const [y, m, d] = datePart.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d} ${months[m - 1]} ${y}`;
    }
    if (ev.date_precision === 'WEEK') return ev.estimated_week_label || 'Perkiraan Minggu';
    if (ev.date_precision === 'MONTH') return `Bulan ${ev.estimated_month || '—'}`;
    if (ev.date_precision === 'CANDIDATES') return `${ev.candidate_dates?.length || 0} Kandidat Tgl`;
    return 'Belum Ditentukan';
  };

  const groupedEvents = useMemo(() => {
    const groups: EventDateGroup[] = [];
    const groupMap = new Map<string, EventDateGroup>();

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    events.forEach((ev) => {
      let key = '';
      let label = '';
      let dayName: string | undefined = undefined;
      let isExact = false;

      if (ev.date_precision === 'EXACT' && ev.event_date) {
        const dateStr = typeof ev.event_date === 'string'
          ? ev.event_date.split('T')[0]
          : new Date(ev.event_date).toISOString().split('T')[0];

        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);

        key = `EXACT_${dateStr}`;
        label = `${d} ${months[m - 1]} ${y}`;
        dayName = dayNames[dateObj.getDay()];
        isExact = true;
      } else if (ev.date_precision === 'WEEK') {
        key = `WEEK_${ev.estimated_week_label || ev.id}`;
        label = ev.estimated_week_label || 'Perkiraan Minggu';
      } else if (ev.date_precision === 'MONTH') {
        key = `MONTH_${ev.estimated_month || ev.id}`;
        label = `Bulan ${ev.estimated_month || '—'}`;
      } else if (ev.date_precision === 'CANDIDATES') {
        key = `CANDIDATES_${ev.id}`;
        label = `${ev.candidate_dates?.length || 0} Kandidat Tgl`;
      } else {
        key = `UNKNOWN_${ev.id}`;
        label = 'Belum Ditentukan';
      }

      if (!groupMap.has(key)) {
        const newGroup: EventDateGroup = {
          dateKey: key,
          dateLabel: label,
          dayName,
          isExact,
          events: [ev],
        };
        groupMap.set(key, newGroup);
        groups.push(newGroup);
      } else {
        groupMap.get(key)!.events.push(ev);
      }
    });

    return groups;
  }, [events]);

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Semua Kegiatan"
        subtitle="Daftar seluruh jadwal kegiatan kampus baik terkonfirmasi maupun tentatif"
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

      <div className="p-3.5 sm:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Search and Filters Bar */}
        <div className="bg-white rounded-clay p-3.5 sm:p-5 border border-white/90 shadow-clay-card space-y-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div className="w-full sm:flex-1">
              <Input
                placeholder="Cari kegiatan, lokasi, kontak..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                Reset Filter
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1 border-t border-slate-100">
            <Select
              placeholder="Semua Kategori"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              placeholder="Semua Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="CONFIRMED">Terjadwal</option>
              <option value="WAITING_CONFIRMATION">Menunggu Konfirmasi</option>
              <option value="DRAFT">Tentatif</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </Select>

            <Select
              placeholder="Semua Lokasi"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">Semua Lokasi</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>

            <Select
              placeholder="Kepastian Tanggal"
              value={selectedPrecision}
              onChange={(e) => setSelectedPrecision(e.target.value)}
            >
              <option value="">Semua Kepastian</option>
              <option value="EXACT">Tanggal Pasti</option>
              <option value="CANDIDATES">Kandidat Tanggal</option>
              <option value="WEEK">Perkiraan Minggu</option>
              <option value="MONTH">Perkiraan Bulan</option>
              <option value="UNKNOWN">Belum Tahu</option>
            </Select>
          </div>
        </div>

        {/* Event List Table (Desktop) / Cards (Mobile) */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton height={50} className="rounded-clay-sm" />
            <Skeleton height={50} className="rounded-clay-sm" />
            <Skeleton height={50} className="rounded-clay-sm" />
            <Skeleton height={50} className="rounded-clay-sm" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            type={hasActiveFilters ? 'search' : 'default'}
            title={hasActiveFilters ? 'Tidak Ada Kegiatan yang Sesuai' : 'Belum Ada Kegiatan'}
            description={
              hasActiveFilters
                ? 'Coba sesuaikan kata kunci pencarian atau ubah opsi filter Anda.'
                : 'Mulai dengan menambahkan jadwal kegiatan baru.'
            }
            actionText={hasActiveFilters ? 'Reset Semua Filter' : 'Tambah Kegiatan'}
            onAction={hasActiveFilters ? handleResetFilters : () => navigate('/events/new')}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-clay border border-white/90 shadow-clay-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Waktu</th>
                    <th className="py-3.5 px-5">Nama Kegiatan</th>
                    <th className="py-3.5 px-4">Lokasi</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {groupedEvents.map((group, groupIdx) => (
                    <React.Fragment key={group.dateKey}>
                      {group.events.map((ev, evIdx) => {
                        const isFirstInGroup = evIdx === 0;
                        const isLastInGroup = evIdx === group.events.length - 1;
                        const isLastGroup = groupIdx === groupedEvents.length - 1;

                        return (
                          <tr
                            key={ev.id}
                            onClick={() => navigate(`/events/${ev.id}`)}
                            className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                              isLastInGroup && !isLastGroup
                                ? 'border-b-2 border-slate-200'
                                : 'border-b border-slate-100'
                            }`}
                          >
                            {/* Merged Tanggal Cell using rowSpan */}
                            {isFirstInGroup && (
                              <td
                                rowSpan={group.events.length}
                                className="py-3.5 px-4 bg-slate-50/70 border-r border-slate-200/80 align-top whitespace-nowrap"
                              >
                                <div className="flex flex-col gap-1 sticky top-16">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span>{group.dateLabel}</span>
                                  </div>
                                  {group.dayName && (
                                    <span className="text-xs font-semibold text-slate-500 pl-5.5">
                                      {group.dayName}
                                    </span>
                                  )}
                                  {group.events.length > 1 && (
                                    <div className="pl-5.5 mt-1">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                                        {group.events.length} Kegiatan
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Waktu */}
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {ev.is_all_day
                                    ? 'Sepanjang Hari'
                                    : ev.start_time && ev.end_time
                                    ? `${ev.start_time} – ${ev.end_time}`
                                    : '—'}
                                </span>
                              </div>
                            </td>

                            {/* Nama Kegiatan */}
                            <td className="py-3.5 px-5 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              <div className="line-clamp-1">{ev.name}</div>
                              {ev.contact_info && (
                                <div className="text-[11px] font-normal text-slate-400 truncate mt-0.5">
                                  Kontak: {ev.contact_info}
                                </div>
                              )}
                            </td>

                            {/* Lokasi */}
                            <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                              {ev.location_name || ev.location?.name ? (
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{ev.location_name || ev.location?.name}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>

                            {/* Kategori */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <CategoryBadge
                                name={ev.category.name}
                                color={ev.category.color}
                                size="sm"
                              />
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={ev.status} size="sm" />
                            </td>

                            {/* Aksi */}
                            <td
                              className="py-3.5 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => navigate(`/events/new?duplicateFrom=${ev.id}`)}
                                  title="Duplikat Kegiatan"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => navigate(`/events/${ev.id}/edit`)}
                                  title="Edit Kegiatan"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => setDeleteTarget(ev)}
                                    title="Hapus Kegiatan"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/events/${ev.id}`)}
                                  title="Lihat Detail"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Grouped by Date) */}
            <div ref={mobileCardsRef} className="md:hidden space-y-3.5">
              {groupedEvents.map((group, gIdx) => (
                <div
                  key={group.dateKey}
                  style={{ ['--stagger-i' as any]: Math.min(gIdx, 10) }}
                  className="bg-white rounded-clay border border-slate-200 shadow-clay-sm overflow-hidden animate-card-reveal"
                >
                  {/* Date Header Strip */}
                  <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-bold text-slate-900">{group.dateLabel}</span>
                      {group.dayName && (
                        <span className="text-xs font-semibold text-slate-500">
                          ({group.dayName})
                        </span>
                      )}
                    </div>
                    {group.events.length > 1 && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                        {group.events.length} Kegiatan
                      </span>
                    )}
                  </div>

                  {/* Events in this date */}
                  <div className="divide-y divide-slate-100">
                    {group.events.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {ev.is_all_day
                                ? 'Sepanjang Hari'
                                : ev.start_time && ev.end_time
                                ? `${ev.start_time} – ${ev.end_time}`
                                : 'Waktu belum diatur'}
                            </span>
                          </div>
                          <StatusBadge status={ev.status} size="sm" />
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{ev.name}</h3>

                        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CategoryBadge
                              name={ev.category.name}
                              color={ev.category.color}
                              size="sm"
                            />
                            {(ev.location_name || ev.location?.name) && (
                              <span className="text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[130px]">
                                  {ev.location_name || ev.location?.name}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/new?duplicateFrom=${ev.id}`);
                              }}
                              title="Duplikat Kegiatan"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Modal Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kegiatan"
        message="Apakah Anda yakin ingin menghapus kegiatan ini dari daftar?"
        itemName={deleteTarget?.name}
        confirmText="Hapus"
        isLoading={isDeleting}
      />
    </div>
  );
};
