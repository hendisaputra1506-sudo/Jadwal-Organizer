import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Edit,
  Trash2,
  XCircle,
  Printer,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  CheckCircle2,
  MessageCircle,
  Copy,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { CategoryBadge, StatusBadge, PrecisionBadge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Skeleton } from '../../components/feedback/Skeleton';
import { WhatsAppFollowUpModal } from '../../components/events/WhatsAppFollowUpModal';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EventAttachments } from '../../components/events/EventAttachments';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res: any = await api.get(`/events/${id}`);
      if (res.success && res.data) {
        setEvent(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat kegiatan.', 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      success('Kegiatan berhasil dihapus.');
      navigate('/events');
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus kegiatan.', 'Gagal');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.patch(`/events/${id}/cancel`);
      success('Kegiatan berhasil ditandai sebagai Dibatalkan.');
      fetchEvent();
    } catch (err: any) {
      toastError(err.message || 'Gagal membatalkan kegiatan.', 'Gagal');
    } finally {
      setIsDeleting(false);
      setShowCancelDialog(false);
    }
  };

  const formatDateDisplay = (ev: EventItem): string => {
    if (ev.date_precision === 'EXACT' && ev.event_date) {
      const d = new Date(ev.event_date);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (ev.date_precision === 'WEEK') {
      return ev.estimated_week_label || 'Perkiraan Minggu';
    }
    if (ev.date_precision === 'MONTH') {
      return `Bulan ${ev.estimated_month || 'belum diisi'}`;
    }
    if (ev.date_precision === 'CANDIDATES') {
      return `${ev.candidate_dates?.length || 0} Pilihan Kandidat Tanggal`;
    }
    return 'Belum Ditentukan';
  };

  if (isLoading) {
    return (
      <div>
        <Header onToggleSidebar={onToggleSidebar} title="Detail Kegiatan" />
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton height={40} width="60%" />
          <Skeleton height={200} className="rounded-clay" />
          <Skeleton height={150} className="rounded-clay" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <Header onToggleSidebar={onToggleSidebar} title="Detail Kegiatan" />
        <div className="p-8 text-center max-w-md mx-auto">
          <p className="text-slate-500 mb-4">Kegiatan tidak ditemukan atau telah dihapus.</p>
          <Button onClick={() => navigate('/events')}>Kembali ke Semua Kegiatan</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Detail Kegiatan"
        subtitle={event.name}
        action={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to={`/print?mode=detail&eventId=${event.id}`}>
              <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                <span className="hidden sm:inline">Cetak Detail</span>
                <span className="sm:hidden">Cetak</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate(`/events/new?duplicateFrom=${event.id}`)}
              title="Duplikat isi kegiatan ini untuk jadwal atau lokasi baru"
            >
              <span className="hidden sm:inline">Duplikat</span>
              <span className="sm:hidden">Salin</span>
            </Button>
            <Button
              size="sm"
              leftIcon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(`/events/${event.id}/edit`)}
            >
              <span className="hidden sm:inline">Edit Kegiatan</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          </div>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer no-print"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        {/* Conflict Warning Box if any */}
        {event.conflictReport?.hasConflict && (
          <div
            className={`p-3.5 sm:p-4 rounded-clay border shadow-clay-sm flex flex-col gap-2 ${
              event.conflictReport.highestLevel === 'DEFINITE'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {event.conflictReport.highestLevel === 'DEFINITE' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
              <span>
                {event.conflictReport.highestLevel === 'DEFINITE'
                  ? 'Konflik Pasti Terdeteksi!'
                  : 'Potensi Konflik Jadwal'}
              </span>
            </div>
            <ul className="text-xs space-y-1 pl-7 list-disc">
              {event.conflictReport.conflicts.map((conf, idx) => (
                <li key={idx}>{conf.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Event Card */}
        <Card>
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2.5">
              <CategoryBadge name={event.category.name} color={event.category.color} />
              <StatusBadge status={event.status} />
              <PrecisionBadge precision={event.date_precision} />
            </div>

            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {event.name}
            </h1>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-sm bg-slate-50/40">
            {/* Tanggal */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-clay-sm bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Jadwal / Tanggal</span>
                <span className="font-bold text-slate-800">{formatDateDisplay(event)}</span>
              </div>
            </div>

            {/* Waktu */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-clay-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Waktu Pelaksanaan</span>
                <span className="font-bold text-slate-800">
                  {event.is_all_day
                    ? 'Sepanjang Hari'
                    : event.start_time && event.end_time
                    ? `${event.start_time} – ${event.end_time}`
                    : 'Belum ditentukan'}
                </span>
              </div>
            </div>

            {/* Lokasi */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-clay-sm bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Lokasi Kegiatan</span>
                <span className="font-bold text-slate-800">
                  {event.location_name || event.location?.name || 'Belum ditentukan'}
                </span>
              </div>
            </div>

            {/* Kontak / Narahubung */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-clay-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Kontak / Narahubung Luar
                  </span>
                  <span className="font-bold text-slate-800 break-words">
                    {event.contact_info || '—'}
                  </span>
                </div>
              </div>

              {event.contact_info && (
                <button
                  type="button"
                  onClick={() => setIsWhatsAppOpen(true)}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-clay-sm bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                  title="Kirim pesan konfirmasi jadwal via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi WA</span>
                </button>
              )}
            </div>
          </div>

          {/* Candidate Dates List if precision is CANDIDATES */}
          {event.date_precision === 'CANDIDATES' &&
            event.candidate_dates &&
            event.candidate_dates.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Pilihan Kandidat Tanggal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {event.candidate_dates.map((cand, idx) => {
                    const cDate = new Date(cand.candidate_date);
                    const formatted = `${cDate.getDate()} ${
                      [
                        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
                      ][cDate.getMonth()]
                    } ${cDate.getFullYear()}`;

                    return (
                      <div
                        key={cand.id || idx}
                        className="p-3 bg-purple-50/70 border border-purple-200 rounded-clay-sm flex items-center gap-2.5 text-xs font-bold text-purple-900 shadow-sm"
                      >
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>Opsi {idx + 1}: {formatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Deskripsi Kegiatan */}
          <div className="p-4 sm:p-6 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Deskripsi Kegiatan
            </h4>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {event.description || 'Tidak ada keterangan tambahan.'}
            </div>
          </div>

          {/* KEBUTUHAN KEGIATAN (Barang / Alat / Konsumsi) */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/60 rounded-b-clay space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <PackageCheck className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-bold tracking-tight">Kebutuhan Kegiatan</h4>
              <span className="text-[11px] text-slate-400 font-normal">
                (Barang, Alat, Konsumsi)
              </span>
            </div>

            {event.requirements_notes && event.requirements_notes.trim() ? (
              <div className="bg-white p-4 sm:p-5 rounded-clay-sm border border-slate-200 shadow-clay-sm text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {event.requirements_notes}
              </div>
            ) : (
              <div className="p-4 bg-white/60 border border-dashed border-slate-300 rounded-clay-sm text-xs text-slate-400 italic">
                Belum ada kebutuhan yang dicatat.
              </div>
            )}
          </div>

          {/* Metadata & Creator Tracking (Sync Info) */}
          <div className="px-4 py-3 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 rounded-b-clay">
            <div className="flex items-center gap-1.5">
              <span>Dibuat oleh:</span>
              <span className="font-semibold text-slate-700">
                {event.created_by?.name || 'Sistem Kampus'}
              </span>
            </div>
            {event.updated_by && (
              <div className="flex items-center gap-1.5">
                <span>Terakhir diperbarui:</span>
                <span className="font-semibold text-slate-700">
                  {event.updated_by.name}
                </span>
              </div>
            )}
          </div>
        </Card>
 
        {/* Lampiran & Dokumen Kegiatan (Google Drive) */}
        <EventAttachments
          eventId={event.id}
          eventName={event.name}
          category={event.category}
          initialAttachments={event.attachments}
          onAttachmentChange={fetchEvent}
        />

        {/* Action Buttons: Collaborative Edit for all, Delete strictly Admin */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-2 no-print">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {event.status !== 'CANCELLED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<XCircle className="w-4 h-4 text-amber-600" />}
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Batalkan
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Hapus
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate(`/events/new?duplicateFrom=${event.id}`)}
              className="w-full sm:w-auto"
            >
              Duplikat Kegiatan
            </Button>
            <Button
              size="sm"
              leftIcon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(`/events/${event.id}/edit`)}
              className="w-full sm:w-auto"
            >
              Ubah Kegiatan
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Hapus Kegiatan"
        message="Apakah Anda yakin ingin menghapus kegiatan ini dari jadwal?"
        itemName={event.name}
        confirmText="Hapus Permanen"
        isLoading={isDeleting}
      />

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Batalkan Kegiatan"
        message="Kegiatan akan ditandai dengan status 'Dibatalkan' tetapi tetap disimpan dalam riwayat arsip."
        itemName={event.name}
        confirmText="Batalkan Kegiatan"
        isDestructive={false}
        isLoading={isDeleting}
      />

      {/* WhatsApp Follow-up Modal */}
      <WhatsAppFollowUpModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        event={event}
      />
    </div>
  );
};
