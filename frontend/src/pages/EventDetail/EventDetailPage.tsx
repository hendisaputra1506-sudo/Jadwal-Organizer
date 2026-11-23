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
  RotateCcw,
  Users,
  UserCheck,
  Tag,
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
import { fireMicroConfetti } from '../../utils/confetti';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const myDuty = event?.officers?.find((o) => o.user_id === user?.id);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState<boolean>(false);
  const [showRevertDialog, setShowRevertDialog] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
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

  const handleMarkComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      const res: any = await api.patch(`/events/${id}/complete`);
      if (res.success) {
        fireMicroConfetti();
        success('Kegiatan berhasil ditandai Selesai dan dicatat dalam arsip.');
        fetchEvent();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menandai kegiatan selesai.', 'Gagal');
    } finally {
      setIsCompleting(false);
      setShowCompleteDialog(false);
    }
  };

  const handleRevertComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      const res: any = await api.patch(`/events/${id}/uncomplete`);
      if (res.success) {
        success('Status kegiatan berhasil dikembalikan menjadi aktif.');
        fetchEvent();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal mengembalikan status kegiatan.', 'Gagal');
    } finally {
      setIsCompleting(false);
      setShowRevertDialog(false);
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
            {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4 text-white" />}
                onClick={() => setShowCompleteDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold shadow-sm"
              >
                <span className="hidden sm:inline">Tandai Selesai</span>
                <span className="sm:hidden">Selesai</span>
              </Button>
            ) : event.status === 'COMPLETED' ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-4 h-4 text-slate-600" />}
                onClick={() => setShowRevertDialog(true)}
                title="Kembalikan status kegiatan menjadi aktif / terjadwal"
              >
                <span className="hidden sm:inline">Batal Selesai</span>
                <span className="sm:hidden">Batal</span>
              </Button>
            ) : null}
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

      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer no-print transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        {/* Top Notification Banners */}
        {/* Banner Kegiatan Selesai */}
        {event.status === 'COMPLETED' && (
          <div className="p-4 rounded-clay bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 shadow-clay-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 animate-card-reveal">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                  <span>Kegiatan Ini Telah Selesai Dilaksanakan</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Selesai
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kegiatan ini tersimpan dalam arsip kegiatan kampus. Anda tetap dapat mengunggah atau melihat berkas dokumentasi kegiatan.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
              onClick={() => setShowRevertDialog(true)}
              className="text-xs bg-white hover:bg-slate-50 border-slate-200 flex-shrink-0 w-full sm:w-auto"
            >
              Kembalikan Status
            </Button>
          </div>
        )}

        {/* Banner Penugasan Staf (Personal Duty Alert) */}
        {myDuty && (
          <div className="p-4 rounded-clay bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/90 shadow-clay-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 animate-card-reveal">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-purple-950 flex flex-wrap items-center gap-2">
                  <span>Anda Ditugaskan pada Kegiatan Ini</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Peran: {myDuty.role}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Jadwal ini tercatat dalam daftar tugas pribadi Anda. Mohon koordinasi dan persiapkan tugas sesuai peran yang diamanatkan.
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Event Details, Officers & Requirements (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Primary Event Information Card */}
            <Card>
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2.5">
                  <CategoryBadge name={event.category.name} color={event.category.color} />
                  <StatusBadge status={event.status} />
                  <PrecisionBadge precision={event.date_precision} />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {event.name}
                </h1>
              </div>

              {/* Execution Info Grid */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-sm bg-slate-50/50">
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
            </Card>

            {/* PETUGAS PELAKSANA (TAGGED OFFICERS) */}
            <Card>
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-bold tracking-tight">Petugas Pelaksana (Staf Ditugaskan)</h3>
                </div>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  {event.officers?.length || 0} Petugas
                </span>
              </div>

              <div className="p-4 sm:p-6">
                {event.officers && event.officers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {event.officers.map((officer) => {
                      const isMe = officer.user_id === user?.id;
                      return (
                        <div
                          key={officer.id || officer.user_id}
                          className={`p-3 rounded-clay-sm border flex items-center gap-3 transition-all ${
                            isMe
                              ? 'bg-purple-50/70 border-purple-200 shadow-xs ring-1 ring-purple-300'
                              : 'bg-white border-slate-200/90 shadow-xs'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isMe
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 border border-slate-200 text-slate-700'
                            }`}
                          >
                            {(officer.user?.name || 'S').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {officer.user?.name || 'Staf Kampus'}
                              </p>
                              {isMe && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {officer.user?.username && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  @{officer.user.username}
                                </span>
                              )}
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 truncate">
                                {officer.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/50 border border-dashed border-slate-300 rounded-clay-sm text-xs text-slate-400 italic text-center">
                    Belum ada petugas pelaksana yang di-tag untuk kegiatan ini.
                  </div>
                )}
              </div>
            </Card>

            {/* KEBUTUHAN KEGIATAN (Barang / Alat / Konsumsi) */}
            <Card>
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2 text-slate-800">
                <PackageCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold tracking-tight">Kebutuhan Kegiatan</h3>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Barang, Alat, Konsumsi)
                </span>
              </div>

              <div className="p-4 sm:p-6">
                {event.requirements_notes && event.requirements_notes.trim() ? (
                  <div className="bg-slate-50/60 p-4 rounded-clay-sm border border-slate-200/90 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                    {event.requirements_notes}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/50 border border-dashed border-slate-300 rounded-clay-sm text-xs text-slate-400 italic text-center">
                    Belum ada catatan logistik / perlengkapan untuk kegiatan ini.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Actions, Drive Attachments & Metadata (4 cols) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            {/* Action Card */}
            <Card className="overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Panel Aksi & Status
                </h3>
                <StatusBadge status={event.status} size="sm" />
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                {/* Primary Complete / Revert Action Button */}
                {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' ? (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<CheckCircle2 className="w-5 h-5 text-white" />}
                    onClick={() => setShowCompleteDialog(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold shadow-sm py-2.5"
                  >
                    Tandai Selesai
                  </Button>
                ) : event.status === 'COMPLETED' ? (
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<RotateCcw className="w-4 h-4 text-slate-600" />}
                    onClick={() => setShowRevertDialog(true)}
                    className="w-full text-slate-700 hover:bg-slate-100 font-semibold py-2.5"
                    title="Kembalikan status kegiatan menjadi aktif / terjadwal"
                  >
                    Kembalikan Status
                  </Button>
                ) : null}

                {/* Secondary Action Buttons */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit className="w-4 h-4 text-blue-600" />}
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                    className="w-full justify-start text-xs font-semibold"
                  >
                    Ubah Kegiatan (Edit)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Copy className="w-4 h-4 text-indigo-600" />}
                    onClick={() => navigate(`/events/new?duplicateFrom=${event.id}`)}
                    className="w-full justify-start text-xs font-semibold"
                    title="Duplikat isi kegiatan ini untuk jadwal baru"
                  >
                    Duplikat Kegiatan Baru
                  </Button>

                  <Link to={`/print?mode=detail&eventId=${event.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
                      className="w-full justify-start text-xs font-semibold"
                    >
                      Cetak Lembar Kegiatan
                    </Button>
                  </Link>

                  {event.contact_info && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<MessageCircle className="w-4 h-4 text-[#25D366]" />}
                      onClick={() => setIsWhatsAppOpen(true)}
                      className="w-full justify-start text-xs font-semibold hover:border-emerald-300 hover:bg-emerald-50/50"
                    >
                      Hubungi Narahubung WA
                    </Button>
                  )}
                </div>

                {/* Admin Danger Zone */}
                {isAdmin && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Akses Khusus Admin
                    </span>
                    <div className="flex items-center gap-2">
                      {event.status !== 'CANCELLED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<XCircle className="w-3.5 h-3.5 text-amber-600" />}
                          onClick={() => setShowCancelDialog(true)}
                          className="flex-1 text-xs text-amber-700 hover:bg-amber-50 border-amber-200"
                        >
                          Batalkan
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => setShowDeleteDialog(true)}
                        className="flex-1 text-xs"
                      >
                        Hapus
                      </Button>
                    </div>
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

            {/* Metadata & Creator Tracking (Sync Info) */}
            <div className="p-4 bg-white rounded-clay border border-slate-200/80 shadow-clay-card text-xs text-slate-500 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Riwayat Data
              </span>
              <div className="flex items-center justify-between">
                <span>Dibuat oleh:</span>
                <span className="font-semibold text-slate-800">
                  {event.created_by?.name || 'Sistem Kampus'}
                </span>
              </div>
              {event.updated_by && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Terakhir diubah:</span>
                  <span className="font-semibold text-slate-800">
                    {event.updated_by.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Mark Complete Dialog */}
      <ConfirmDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={handleMarkComplete}
        title="Tandai Kegiatan Selesai"
        message="Apakah kegiatan ini telah selesai dilaksanakan? Status kegiatan akan diubah menjadi 'Selesai' dan dimasukkan ke dalam arsip kegiatan."
        itemName={event.name}
        confirmText="Ya, Tandai Selesai"
        isDestructive={false}
        isLoading={isCompleting}
      />

      {/* Confirm Revert Complete Dialog */}
      <ConfirmDialog
        isOpen={showRevertDialog}
        onClose={() => setShowRevertDialog(false)}
        onConfirm={handleRevertComplete}
        title="Kembalikan Status Kegiatan"
        message="Apakah Anda yakin ingin mengembalikan status kegiatan ini menjadi aktif / terjadwal kembali?"
        itemName={event.name}
        confirmText="Kembalikan Status"
        isDestructive={false}
        isLoading={isCompleting}
      />

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
