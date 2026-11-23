import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Archive,
  Search,
  Calendar,
  MapPin,
  Image as ImageIcon,
  FileText,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Camera,
  FolderCheck,
  FolderSync,
  Video,
  Clock,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { CategoryBadge, StatusBadge } from '../../components/common/Badge';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { CentralizedRekapTab } from '../../components/archive/CentralizedRekapTab';
import { api } from '../../services/api';
import { Category } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { fireMicroConfetti } from '../../utils/confetti';

interface OutletContextType {
  onToggleSidebar: () => void;
}

interface ArchiveEventItem {
  id: string;
  name: string;
  status: 'DRAFT' | 'WAITING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  date_precision: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  location_name: string | null;
  contact_info: string | null;
  category: {
    id: string;
    name: string;
    color: string;
  };
  location?: {
    id: string;
    name: string;
  } | null;
  docSummary: {
    mediaCount: number;
    pdfCount: number;
    docCount?: number;
    docLabels?: string[];
    totalAttachments: number;
    coverThumb: {
      file_name: string;
      mime_type: string | null;
      drive_file_id: string | null;
      drive_view_url: string;
    } | null;
  };
}

interface ArchiveResponse {
  items: ArchiveEventItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    totalArchived: number;
    withMediaCount: number;
    withPdfCount: number;
    missingDocCount: number;
  };
}

function getBackendOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw || raw.startsWith('/')) return '';
  try {
    const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
    return new URL(withProto).origin;
  } catch {
    return '';
  }
}

function getSmallCoverUrl(cover: ArchiveEventItem['docSummary']['coverThumb']): string | null {
  if (!cover) return null;

  let driveId = cover.drive_file_id;
  if (!driveId && cover.drive_view_url) {
    const m = cover.drive_view_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m?.[1]) driveId = m[1];
  }

  // Resolusi hemat (w320 ~15KB) khusus untuk kartu daftar arsip agar super cepat & hemat kuota!
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w320`;
  }

  if ((cover.mime_type || '').startsWith('image/') && cover.drive_view_url) {
    if (cover.drive_view_url.startsWith('http')) return cover.drive_view_url;
    const origin = getBackendOrigin();
    return origin ? `${origin}${cover.drive_view_url}` : cover.drive_view_url;
  }

  return null;
}

function formatDateID(dateStr?: string | null): string {
  if (!dateStr) return 'Tanggal tidak tercatat';
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const ArchivePage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'ARCHIVE' | 'REKAP'>('ARCHIVE');

  // Data state
  const [data, setData] = useState<ArchiveResponse>({
    items: [],
    pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 1 },
    summary: { totalArchived: 0, withMediaCount: 0, withPdfCount: 0, missingDocCount: 0 },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});

  // Server-side Filter, Sort, & Pagination State
  const [page, setPage] = useState<number>(1);
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [docFilter, setDocFilter] = useState<'all' | 'has_media' | 'has_pdf' | 'complete' | 'missing'>('all');

  // Debounce search 350ms agar tidak membebani server per ketikan
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch categories once
  useEffect(() => {
    api
      .get('/categories')
      .then((res: any) => {
        if (res.success && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const buildQueryString = useCallback(
    (overrideLimit?: number, overridePage?: number) => {
      const params = new URLSearchParams();
      params.append('page', String(overridePage ?? page));
      params.append('limit', String(overrideLimit ?? 12));
      params.append('sort', sort);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (categoryId) params.append('categoryId', categoryId);
      if (monthFilter) {
        params.append('month', monthFilter);
      } else {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      if (docFilter !== 'all') params.append('docFilter', docFilter);
      return params.toString();
    },
    [page, sort, debouncedSearch, categoryId, monthFilter, startDate, endDate, docFilter]
  );

  const fetchArchive = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/events/archive?${buildQueryString()}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat arsip kegiatan.');
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, toastError]);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const handleMarkCompleted = async (e: React.MouseEvent, ev: ArchiveEventItem) => {
    e.stopPropagation();
    setCompletingId(ev.id);
    try {
      const res: any = await api.patch(`/events/${ev.id}/complete`, {});
      if (res.success) {
        fireMicroConfetti();
        success(`"${ev.name}" ditandai Selesai.`);
        setData((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === ev.id ? { ...item, status: 'COMPLETED' } : item
          ),
        }));
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memperbarui status kegiatan.');
    } finally {
      setCompletingId(null);
    }
  };

  const handleUnmarkCompleted = async (e: React.MouseEvent, ev: ArchiveEventItem) => {
    e.stopPropagation();
    setCompletingId(ev.id);
    try {
      const res: any = await api.patch(`/events/${ev.id}/uncomplete`, {});
      if (res.success) {
        success(`Status "${ev.name}" berhasil dikembalikan.`);
        setData((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === ev.id ? { ...item, status: 'CONFIRMED' } : item
          ),
        }));
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal mengembalikan status kegiatan.');
    } finally {
      setCompletingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryId('');
    setMonthFilter('');
    setStartDate('');
    setEndDate('');
    setDocFilter('all');
    setSort('desc');
    setPage(1);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res: any = await api.get(`/events/archive?${buildQueryString(200, 1)}`);
      const rows: ArchiveEventItem[] = res.data?.items || [];
      if (rows.length === 0) {
        toastError('Tidak ada data arsip untuk diekspor.');
        return;
      }

      const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
      const header = [
        'No',
        'Tanggal',
        'Waktu',
        'Nama Kegiatan',
        'Kategori',
        'Lokasi',
        'Status',
        'Jumlah Foto/Video',
        'Jumlah PDF Daftar Hadir',
        'Kontak',
      ];

      const csvLines = [
        header.join(','),
        ...rows.map((ev, idx) => {
          const tgl = ev.event_date ? ev.event_date.split('T')[0] : '-';
          const waktu = ev.is_all_day
            ? 'Sepanjang Hari'
            : ev.start_time && ev.end_time
            ? `${ev.start_time} - ${ev.end_time}`
            : '-';
          const statusLabel = ev.status === 'COMPLETED' ? 'Selesai' : 'Terlaksana (Lewat Tanggal)';
          return [
            idx + 1,
            escapeCsv(tgl),
            escapeCsv(waktu),
            escapeCsv(ev.name),
            escapeCsv(ev.category?.name || ''),
            escapeCsv(ev.location_name || ev.location?.name || '-'),
            escapeCsv(statusLabel),
            ev.docSummary.mediaCount,
            ev.docSummary.pdfCount,
            escapeCsv(ev.contact_info || '-'),
          ].join(',');
        }),
      ];

      // UTF-8 BOM agar Excel di Windows membaca teks dengan sempurna
      const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const todayStamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `Rekap-Arsip-Kegiatan-UTD-${todayStamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(`Rekap ${rows.length} kegiatan berhasil diunduh (.CSV untuk Excel)!`);
    } catch (err: any) {
      toastError(err.message || 'Gagal mengekspor rekap.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    search || categoryId || monthFilter || startDate || endDate || docFilter !== 'all'
  );

  return (
    <div className="min-h-screen pb-16 bg-[#F3F6FA]">
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Arsip & Dokumentasi"
        subtitle="Riwayat kegiatan terlaksana, pencarian cepat berdasarkan tanggal, dan cek kelengkapan dokumentasi"
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCsv}
            isLoading={isExporting}
          >
            <span className="hidden sm:inline">Unduh Rekap Excel (.CSV)</span>
            <span className="sm:hidden">Rekap</span>
          </Button>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-7xl mx-auto space-y-5">
        {/* Top Tab Switcher: Arsip Kegiatan vs Rekap Daftar Hadir Semua Sekolah */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-white rounded-clay border border-slate-200/80 shadow-clay-sm">
          <button
            type="button"
            onClick={() => setActiveTab('ARCHIVE')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ARCHIVE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Arsip Kegiatan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REKAP')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'REKAP'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>Rekap Daftar Hadir (Semua Sekolah)</span>
          </button>
        </div>

        {activeTab === 'REKAP' ? (
          <CentralizedRekapTab />
        ) : (
          <>
            {/* 1. Ringkasan Statistik Arsip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setDocFilter('all');
              setPage(1);
            }}
            className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
              docFilter === 'all' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Terlaksana
              </span>
              <Archive className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">
              <AnimatedCounter value={data.summary.totalArchived} />
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Kegiatan sudah berlalu</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocFilter('has_media');
              setPage(1);
            }}
            className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
              docFilter === 'has_media'
                ? 'border-purple-400 ring-2 ring-purple-100'
                : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ada Foto / Video
              </span>
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700">
              <AnimatedCounter value={data.summary.withMediaCount} />
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Siap untuk Press Release</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocFilter('has_pdf');
              setPage(1);
            }}
            className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
              docFilter === 'has_pdf'
                ? 'border-rose-400 ring-2 ring-rose-100'
                : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ada Daftar Hadir
              </span>
              <FolderCheck className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-700">
              <AnimatedCounter value={data.summary.withPdfCount} />
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Scan PDF terunggah</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocFilter('missing');
              setPage(1);
            }}
            className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
              docFilter === 'missing'
                ? 'border-amber-400 ring-2 ring-amber-100'
                : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Belum Upload
              </span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600">
              <AnimatedCounter value={data.summary.missingDocCount} />
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Perlu lengkapi berkas</p>
          </button>
        </div>

        {/* 2. Panel Filter, Rentang Tanggal, & Pengurutan (Server-Side) */}
        <div className="bg-white p-4 sm:p-5 rounded-clay border border-slate-200/80 shadow-clay-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-5">
              <Input
                placeholder="Cari nama sekolah, kegiatan, atau lokasi lama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <Select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Sort by Date */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as 'desc' | 'asc');
                      setPage(1);
                    }}
                  >
                    <option value="desc">Urutkan: Terbaru &rarr; Terlama</option>
                    <option value="asc">Urutkan: Terlama &rarr; Terbaru</option>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                    setPage(1);
                  }}
                  title="Balik Urutan Tanggal"
                  className="p-2.5 rounded-clay-sm border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer flex-shrink-0"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Filter Bulan & Rentang Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Filter Cepat per Bulan
              </label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-clay-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMonthFilter('');
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-clay-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMonthFilter('');
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-clay-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Quick Documentation Completeness Filter + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'has_media', label: 'Ada Foto/Video' },
                { id: 'has_pdf', label: 'Ada Daftar Hadir PDF' },
                { id: 'complete', label: 'Lengkap (Foto/Video + PDF)' },
                { id: 'missing', label: 'Belum Upload Berkas' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setDocFilter(pill.id as any);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    docFilter === pill.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* 3. Daftar Kartu Arsip (Hanya 12 kartu per halaman, Lazy Thumbnail w320) */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            type={hasActiveFilters ? 'search' : 'calendar'}
            title={
              hasActiveFilters
                ? 'Tidak Ada Arsip yang Cocok'
                : 'Belum Ada Kegiatan yang Terlaksana / Berlalu'
            }
            description={
              hasActiveFilters
                ? 'Coba ubah rentang tanggal, kategori, atau kata kunci pencarian Anda.'
                : 'Kegiatan yang tanggalnya sudah lewat atau ditandai Selesai akan otomatis terkumpul rapi di halaman Arsip ini.'
            }
            actionText={hasActiveFilters ? 'Reset Semua Filter' : undefined}
            onAction={hasActiveFilters ? handleResetFilters : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((ev, idx) => {
                const coverUrl = getSmallCoverUrl(ev.docSummary.coverThumb);
                const thumbFailed = Boolean(failedThumbIds[ev.id]);
                const isCoverVideo = (ev.docSummary.coverThumb?.mime_type || '').startsWith(
                  'video/'
                );
                const needsMarkComplete = ev.status !== 'COMPLETED';

                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    style={{ ['--stagger-i' as any]: Math.min(idx, 11) }}
                    className="bg-white rounded-clay border border-slate-200/90 shadow-clay-card interactive-card animate-card-reveal overflow-hidden flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Mini Cover Thumbnail (w320 lazy, 0 video streaming!) */}
                      <div className="relative h-36 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {coverUrl && !thumbFailed ? (
                          <img
                            src={coverUrl}
                            alt={ev.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedThumbIds((prev) => ({ ...prev, [ev.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${ev.category.color}18 0%, #F8FAFC 100%)`,
                            }}
                            className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 px-4 text-center"
                          >
                            {isCoverVideo ? (
                              <Video className="w-7 h-7 text-indigo-400" />
                            ) : (
                              <Camera className="w-7 h-7 opacity-40" />
                            )}
                            <span className="text-[11px] font-medium text-slate-400">
                              {ev.docSummary.mediaCount > 0
                                ? `${ev.docSummary.mediaCount} dokumentasi tersimpan`
                                : 'Belum ada foto sampul'}
                            </span>
                          </div>
                        )}

                        {/* Date Pill Overlay */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3 h-3 text-sky-300" />
                          <span>{formatDateID(ev.event_date)}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <StatusBadge status={ev.status} size="sm" />
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2.5">
                        <CategoryBadge
                          name={ev.category.name}
                          color={ev.category.color}
                          size="sm"
                        />

                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-2 transition-colors">
                          {ev.name}
                        </h3>

                        <div className="space-y-1 text-xs text-slate-500">
                          {(ev.location_name || ev.location?.name) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">
                                {ev.location_name || ev.location?.name}
                              </span>
                            </div>
                          )}
                          {(ev.start_time || ev.is_all_day) && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>
                                {ev.is_all_day
                                  ? 'Sepanjang Hari'
                                  : ev.start_time && ev.end_time
                                  ? `${ev.start_time} – ${ev.end_time} WIB`
                                  : ev.start_time}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Kelengkapan Dokumentasi Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {ev.docSummary.mediaCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                              <ImageIcon className="w-3 h-3" />
                              {ev.docSummary.mediaCount} Foto/Video
                            </span>
                          )}
                          {(ev.docSummary.docCount ?? ev.docSummary.pdfCount) > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold"
                              title={ev.docSummary.docLabels?.join(', ') || 'Dokumen Kegiatan'}
                            >
                              <FileText className="w-3 h-3" />
                              {ev.docSummary.docCount ?? ev.docSummary.pdfCount}{' '}
                              {ev.docSummary.docLabels && ev.docSummary.docLabels.length === 1
                                ? ev.docSummary.docLabels[0].replace(/\s*\(pdf\)\s*/i, '')
                                : 'Dokumen'}
                            </span>
                          )}
                          {ev.docSummary.totalAttachments === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Belum Upload Dokumentasi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      {needsMarkComplete ? (
                        <button
                          type="button"
                          disabled={completingId === ev.id}
                          onClick={(e) => handleMarkCompleted(e, ev)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{completingId === ev.id ? 'Menyimpan...' : 'Tandai Selesai'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Terarsip Selesai
                          </span>
                          <button
                            type="button"
                            disabled={completingId === ev.id}
                            onClick={(e) => handleUnmarkCompleted(e, ev)}
                            title="Kembalikan status kegiatan"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span className="font-bold text-blue-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>Buka Galeri</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. Server-Side Pagination Controls */}
            {data.pagination.totalPages > 1 && (
              <div className="bg-white p-3.5 rounded-clay border border-slate-200/80 shadow-clay-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Menampilkan halaman{' '}
                  <strong className="text-slate-800">{data.pagination.page}</strong> dari{' '}
                  <strong className="text-slate-800">{data.pagination.totalPages}</strong> (
                  <strong className="text-slate-800">{data.pagination.totalItems}</strong> kegiatan
                  terlaksana)
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => {
                      setPage((p) => Math.min(data.pagination.totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArchivePage;
