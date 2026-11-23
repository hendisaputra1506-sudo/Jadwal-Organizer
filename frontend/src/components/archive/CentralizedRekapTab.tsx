import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderSync,
  ExternalLink,
  Search,
  Calendar,
  MapPin,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { EmptyState } from '../feedback/EmptyState';
import { CardSkeleton } from '../feedback/Skeleton';
import { api } from '../../services/api';
import { CategoryDocumentSlot } from '../../types/index';
import { useToast } from '../../context/ToastContext';

interface RekapFile {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  drive_file_id: string | null;
  drive_view_url: string;
  drive_download_url: string | null;
  created_at: string;
}

interface RekapEventItem {
  id: string;
  name: string;
  status: string;
  event_date: string | null;
  estimated_month: string | null;
  location_name: string | null;
  hasUploaded: boolean;
  files: RekapFile[];
}

interface CentralizedCategoryOption {
  id: string;
  name: string;
  color: string;
  centralizedSlots: CategoryDocumentSlot[];
}

interface CentralizedRekapResponse {
  centralizedCategories: CentralizedCategoryOption[];
  activeCategory: { id: string; name: string; color: string } | null;
  activeSlot: CategoryDocumentSlot | null;
  centralFolderPath?: string;
  driveFolderUrl: string | null;
  summary: {
    totalEvents: number;
    uploadedEvents: number;
    missingEvents: number;
    totalFiles: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  items: RekapEventItem[];
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

function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const origin = getBackendOrigin();
    return origin ? `${origin}${url}` : url;
  }
  return url;
}

function getDirectDownloadHref(file: RekapFile): string {
  if (file.drive_file_id) {
    return `https://drive.google.com/uc?id=${file.drive_file_id}&export=download`;
  }
  if (file.drive_download_url) return resolveFileUrl(file.drive_download_url);
  return resolveFileUrl(file.drive_view_url);
}

function formatDateID(dateStr?: string | null, estimatedMonth?: string | null): string {
  if (dateStr) {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      return dt.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  if (estimatedMonth && /^\d{4}-\d{2}$/.test(estimatedMonth)) {
    const [yr, mo] = estimatedMonth.split('-').map(Number);
    return `Est. ${new Date(yr, mo - 1, 1).toLocaleDateString('id-ID', {
      month: 'short',
      year: 'numeric',
    })}`;
  }
  return 'Tentatif';
}

export const CentralizedRekapTab: React.FC = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [data, setData] = useState<CentralizedRekapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [categoryId, setCategoryId] = useState<string>('');
  const [slotKey, setSlotKey] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uploaded' | 'missing'>('all');
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRekap = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (categoryId) params.append('categoryId', categoryId);
      if (slotKey) params.append('slotKey', slotKey);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (monthFilter) params.append('month', monthFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res: any = await api.get(`/attachments/centralized-rekap?${params.toString()}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat rekap dokumen gabungan.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, slotKey, debouncedSearch, monthFilter, statusFilter, page, toastError]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  const handleReset = () => {
    setSearch('');
    setDebouncedSearch('');
    setMonthFilter('');
    setStatusFilter('all');
    setPage(1);
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!data || data.centralizedCategories.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Slot Dokumen Gabungan"
        description="Aktifkan opsi 'Satukan 1 Folder Google Drive' pada menu Kelola Kategori agar dokumen seperti Scan Daftar Hadir semua sekolah tampil di sini."
      />
    );
  }

  const activeCategoryObj = data.centralizedCategories.find(
    (c) => c.id === data.activeCategory?.id
  );

  return (
    <div className="space-y-5">
      {/* Top Banner: Folder Gabungan Google Drive */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 text-white rounded-clay p-4 sm:p-6 shadow-clay-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold tracking-wide">
            <FolderSync className="w-3.5 h-3.5" />
            <span>Folder Gabungan Semua Sekolah / Kegiatan</span>
          </div>
          <h3 className="text-base sm:text-xl font-black tracking-tight">
            {data.activeCategory?.name}: {data.activeSlot?.label}
          </h3>
          {data.centralFolderPath && (
            <p className="text-xs text-blue-100 font-mono truncate">
              📁 Google Drive / {data.centralFolderPath}
            </p>
          )}
          <p className="text-xs text-blue-50/90 max-w-2xl">
            Seluruh file tetap tersimpan terpisah per sekolah (tidak digabung menjadi 1 PDF) dan
            otomatis terkumpul rapi di dalam 1 folder Google Drive di atas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {data.driveFolderUrl && (
            <a
              href={data.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Folder Gabungan di Drive</span>
            </a>
          )}
        </div>
      </div>

      {/* Category & Slot Switcher (jika ada >1 kategori dengan slot terpusat) */}
      {(data.centralizedCategories.length > 1 ||
        (activeCategoryObj && activeCategoryObj.centralizedSlots.length > 1)) && (
        <div className="flex flex-wrap items-center gap-2">
          {data.centralizedCategories.map((cat) => {
            const isSelected = cat.id === data.activeCategory?.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryId(cat.id);
                  setSlotKey(cat.centralizedSlots[0]?.key || '');
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span
                  style={{ backgroundColor: isSelected ? '#fff' : cat.color }}
                  className="w-2 h-2 rounded-full"
                />
                <span>{cat.name}</span>
              </button>
            );
          })}

          {activeCategoryObj && activeCategoryObj.centralizedSlots.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto">
              {activeCategoryObj.centralizedSlots.map((sl) => (
                <button
                  key={sl.key}
                  type="button"
                  onClick={() => {
                    setSlotKey(sl.key);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    sl.key === data.activeSlot?.key
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
            statusFilter === 'all' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Sekolah / Kegiatan
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            <AnimatedCounter value={data.summary.totalEvents} />
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('uploaded');
            setPage(1);
          }}
          className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
            statusFilter === 'uploaded'
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sudah Upload
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            <AnimatedCounter value={data.summary.uploadedEvents} />
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('missing');
            setPage(1);
          }}
          className={`text-left bg-white p-4 rounded-clay border shadow-clay-sm interactive-card cursor-pointer ${
            statusFilter === 'missing'
              ? 'border-amber-400 ring-2 ring-amber-100'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Belum Upload
            </span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">
            <AnimatedCounter value={data.summary.missingEvents} />
          </p>
        </button>

        <div className="bg-white p-4 rounded-clay border border-slate-200/80 shadow-clay-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Berkas PDF
            </span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-1">
            <AnimatedCounter value={data.summary.totalFiles} />
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-clay border border-slate-200/80 shadow-clay-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama sekolah / kegiatan..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          title="Filter bulan"
        />

        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="uploaded">Sudah Upload</option>
            <option value="missing">Belum Upload</option>
          </Select>
        </div>

        {(search || monthFilter || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleReset}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Rekap List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data yang Cocok"
          description="Coba ubah filter pencarian, bulan, atau status upload di atas."
        />
      ) : (
        <div className="bg-white rounded-clay border border-slate-200/80 shadow-clay-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[680px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Sekolah / Kegiatan</th>
                  <th className="py-3 px-3 whitespace-nowrap">Tanggal</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4">Berkas {data.activeSlot?.label}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${item.id}`)}
                        className="text-left font-bold text-slate-900 hover:text-blue-600 text-xs sm:text-sm cursor-pointer"
                      >
                        {item.name}
                      </button>
                      {item.location_name && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[240px]">{item.location_name}</span>
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateID(item.event_date, item.estimated_month)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 align-top whitespace-nowrap">
                      {item.hasUploaded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Sudah ({item.files.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" />
                          Belum Upload
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      {item.files.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Belum ada file</span>
                      ) : (
                        <div className="space-y-1.5">
                          {item.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80"
                            >
                              <a
                                href={resolveFileUrl(file.drive_view_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline min-w-0"
                                title={file.file_name}
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                <span className="truncate max-w-[260px]">{file.file_name}</span>
                              </a>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <a
                                  href={resolveFileUrl(file.drive_view_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded"
                                  title="Buka di Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={getDirectDownloadHref(file)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                                  title="Unduh File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant={item.hasUploaded ? 'outline' : 'primary'}
                        leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/events/${item.id}`)}
                      >
                        {item.hasUploaded ? 'Detail' : 'Upload'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
              <span>
                Halaman <strong>{data.pagination.page}</strong> dari{' '}
                <strong>{data.pagination.totalPages}</strong> ({data.pagination.totalItems} data)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
