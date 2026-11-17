import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  HelpCircle,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  Save,
  Check,
  PackageCheck,
  Copy,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { api } from '../../services/api';
import {
  Category,
  Location,
  DatePrecision,
  EventStatus,
  ConflictCheckResult,
} from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { EventAttachments } from '../../components/events/EventAttachments';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const EventFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const duplicateFromId = searchParams.get('duplicateFrom');
  const isEditMode = Boolean(id);
  const isDuplicateMode = !isEditMode && Boolean(duplicateFromId);
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { success, error: toastError, warning } = useToast();
  const navigate = useNavigate();

  // Master Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Source name when duplicating
  const [sourceEventName, setSourceEventName] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<EventStatus>('CONFIRMED');
  const [datePrecision, setDatePrecision] = useState<DatePrecision>('EXACT');

  // Precision-dependent fields
  const [eventDate, setEventDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [estimatedMonth, setEstimatedMonth] = useState<string>('');
  const [estimatedWeekLabel, setEstimatedWeekLabel] = useState<string>('');
  const [candidateDates, setCandidateDates] = useState<string[]>([]);

  // Common Fields
  const [locationName, setLocationName] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [requirementsNotes, setRequirementsNotes] = useState<string>('');

  // Conflict Checking State
  const [conflictReport, setConflictReport] = useState<ConflictCheckResult | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState<boolean>(false);

  // Submitting State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Load Categories & Locations
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, locRes]: [any, any] = await Promise.all([
          api.get('/categories'),
          api.get('/locations'),
        ]);
        if (catRes.success) {
          setCategories(catRes.data);
          if (!isEditMode && !isDuplicateMode && catRes.data.length > 0) {
            setCategoryId((prev) => prev || catRes.data[0].id);
          }
        }
        if (locRes.success) setLocations(locRes.data);
      } catch (err) {
        console.error('Failed to load form meta:', err);
      }
    }
    loadMeta();
  }, [isEditMode, isDuplicateMode]);

  // Load Event Data if in Edit Mode OR Duplicate Mode
  useEffect(() => {
    const targetEventId = isEditMode ? id : duplicateFromId;
    if (!targetEventId) return;

    async function loadEvent() {
      setIsLoadingData(true);
      try {
        const res: any = await api.get(`/events/${targetEventId}`);
        if (res.success && res.data) {
          const ev = res.data;
          setSourceEventName(ev.name);
          setName(ev.name);
          setCategoryId(ev.category_id);

          if (isDuplicateMode && (ev.status === 'COMPLETED' || ev.status === 'CANCELLED')) {
            setStatus(ev.date_precision === 'EXACT' ? 'CONFIRMED' : 'WAITING_CONFIRMATION');
          } else {
            setStatus(ev.status);
          }

          setDatePrecision(ev.date_precision);
          if (ev.event_date) setEventDate(ev.event_date.split('T')[0]);
          setStartTime(ev.start_time || '09:00');
          setEndTime(ev.end_time || '12:00');
          setIsAllDay(Boolean(ev.is_all_day));
          setEstimatedMonth(ev.estimated_month || '');
          setEstimatedWeekLabel(ev.estimated_week_label || '');
          if (ev.candidate_dates) {
            setCandidateDates(
              ev.candidate_dates.map((c: any) => c.candidate_date.split('T')[0])
            );
          }
          setLocationName(ev.location_name || ev.location?.name || '');
          setContactInfo(ev.contact_info || '');
          setDescription(ev.description || '');
          setRequirementsNotes(ev.requirements_notes || '');
        }
      } catch (err: any) {
        toastError(err.message || 'Gagal memuat data kegiatan.', 'Error');
      } finally {
        setIsLoadingData(false);
      }
    }

    loadEvent();
  }, [isEditMode, isDuplicateMode, id, duplicateFromId, toastError]);

  // Real-time Conflict Check
  const runConflictCheck = useCallback(async () => {
    const trimmedLoc = locationName.trim();
    if (!trimmedLoc) {
      setConflictReport(null);
      return;
    }

    if (datePrecision === 'EXACT' && !eventDate) {
      setConflictReport(null);
      return;
    }

    if (datePrecision === 'CANDIDATES' && candidateDates.length === 0) {
      setConflictReport(null);
      return;
    }

    setIsCheckingConflict(true);
    try {
      const res: any = await api.post('/conflicts/check', {
        eventIdToExclude: id,
        locationName: trimmedLoc,
        datePrecision,
        eventDate: datePrecision === 'EXACT' ? eventDate : null,
        startTime: isAllDay ? null : startTime,
        endTime: isAllDay ? null : endTime,
        isAllDay,
        candidateDates,
        estimatedMonth,
      });

      if (res.success && res.data) {
        setConflictReport(res.data);
      }
    } catch (err) {
      console.error('Error checking conflict:', err);
    } finally {
      setIsCheckingConflict(false);
    }
  }, [
    id,
    locationName,
    datePrecision,
    eventDate,
    startTime,
    endTime,
    isAllDay,
    candidateDates,
    estimatedMonth,
  ]);

  // Auto check conflicts when relevant fields change
  useEffect(() => {
    const timer = setTimeout(() => {
      runConflictCheck();
    }, 400);
    return () => clearTimeout(timer);
  }, [runConflictCheck]);

  // Candidate Date Handlers
  const addCandidateDate = () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCandidateDates((prev) => [...prev, today]);
  };

  const updateCandidateDate = (index: number, val: string) => {
    setCandidateDates((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const removeCandidateDate = (index: number) => {
    setCandidateDates((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastError('Nama kegiatan wajib diisi.', 'Form Belum Lengkap');
      return;
    }

    if (!categoryId) {
      toastError('Kategori kegiatan wajib dipilih.', 'Form Belum Lengkap');
      return;
    }

    if (datePrecision === 'EXACT' && !eventDate) {
      toastError('Tanggal pelaksanaan wajib diisi untuk kepastian tanggal pasti.', 'Form Belum Lengkap');
      return;
    }

    if (datePrecision === 'CANDIDATES' && candidateDates.length === 0) {
      toastError('Minimal sertakan 1 kandidat tanggal.', 'Form Belum Lengkap');
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      categoryId,
      status,
      datePrecision,
      eventDate: datePrecision === 'EXACT' ? eventDate : null,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
      isAllDay,
      estimatedMonth:
        datePrecision === 'MONTH' || datePrecision === 'WEEK' ? estimatedMonth : null,
      estimatedWeekLabel: datePrecision === 'WEEK' ? estimatedWeekLabel : null,
      candidateDates: datePrecision === 'CANDIDATES' ? candidateDates : [],
      locationName: locationName.trim() || null,
      contactInfo: contactInfo.trim() || null,
      description: description.trim() || null,
      requirementsNotes: requirementsNotes.trim() || null,
    };

    try {
      if (isEditMode) {
        const res: any = await api.put(`/events/${id}`, payload);
        success('Perubahan kegiatan berhasil disimpan.');
        if (res.conflictWarning) {
          warning('Catatan: Masih terdapat potensi atau peringatan bentrok pada kegiatan ini.');
        }
        navigate(`/events/${id}`);
      } else {
        const res: any = await api.post('/events', payload);
        success('Kegiatan baru berhasil ditambahkan.');
        if (res.conflictWarning) {
          warning('Catatan: Peringatan bentrok terdeteksi untuk kegiatan yang baru disimpan.');
        }
        navigate(`/events/${res.data.id}`);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menyimpan kegiatan.', 'Kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title={
          isEditMode
            ? 'Ubah Kegiatan'
            : isDuplicateMode
            ? 'Duplikat Kegiatan'
            : 'Tambah Kegiatan Baru'
        }
        subtitle={
          isEditMode
            ? name
            : isDuplicateMode
            ? `Menyalin rincian dari: ${sourceEventName || name}`
            : 'Kelola jadwal kegiatan kampus dan kebutuhan persiapannya'
        }
      />

      <div className="p-3.5 sm:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        {/* Duplicate Mode Banner */}
        {isDuplicateMode && (
          <div className="p-3.5 sm:p-4 rounded-clay bg-blue-50/90 border border-blue-200 text-blue-950 shadow-clay-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-clay-sm bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <Copy className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-blue-900">
                Mode Duplikat Kegiatan
              </p>
              <p className="text-blue-800 leading-relaxed">
                Seluruh rincian kategori, jam pelaksanaan, deskripsi, dan daftar kebutuhan dari kegiatan{' '}
                <strong className="font-bold">&ldquo;{sourceEventName || name}&rdquo;</strong> telah
                disalin otomatis. Silakan sesuaikan nama kegiatan/sekolah, tanggal, lokasi, atau
                narahubung sebelum menekan tombol <strong>Simpan</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Conflict Warning Notice (Does not block save!) */}
        {conflictReport?.hasConflict && (
          <div
            className={`p-3.5 sm:p-4 rounded-clay border shadow-clay-sm flex flex-col gap-2 ${
              conflictReport.highestLevel === 'DEFINITE'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {conflictReport.highestLevel === 'DEFINITE' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
              <span>
                {conflictReport.highestLevel === 'DEFINITE'
                  ? 'Konflik Pasti Terdeteksi di Lokasi & Waktu yang Sama!'
                  : 'Peringatan: Potensi Konflik Jadwal'}
              </span>
            </div>
            <p className="text-xs text-slate-700">
              Sistem tidak memblokir penyimpanan jika jadwal sengaja dibuat bersamaan. Namun mohon perhatikan detail bentrok berikut:
            </p>
            <ul className="text-xs space-y-1 pl-6 list-disc text-slate-800">
              {conflictReport.conflicts.map((c, i) => (
                <li key={i}>{c.reason}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* SECTION 1: INFORMASI DASAR */}
          <Card>
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">1. Informasi Kegiatan</h3>
              <p className="text-xs text-slate-500">Nama kegiatan dan kelompok kategori</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <Input
                label="Nama Kegiatan"
                placeholder="Contoh: Sosialisasi PMB 2027 di SMK YPE Slawi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Select
                  label="Kategori Kegiatan"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Status Siklus Kegiatan"
                  value={status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as EventStatus;
                    setStatus(nextStatus);
                    if (nextStatus === 'CONFIRMED' && datePrecision !== 'EXACT') {
                      setDatePrecision('EXACT');
                    }
                  }}
                >
                  <option value="DRAFT">Tentatif (Draft)</option>
                  <option value="WAITING_CONFIRMATION">Menunggu Konfirmasi</option>
                  <option value="CONFIRMED">Terjadwal (Pasti)</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="CANCELLED">Dibatalkan</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* SECTION 2: KEPASTIAN JADWAL (DYNAMIC) */}
          <Card>
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">2. Kepastian Jadwal</h3>
              <p className="text-xs text-slate-500">
                Pilih tingkat kepastian tanggal yang diketahui saat ini
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Radio-like Selector for Date Precision */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
                {[
                  { id: 'EXACT', label: 'Tanggal Pasti', desc: 'Sudah ada tanggal' },
                  { id: 'CANDIDATES', label: 'Kandidat Tanggal', desc: 'Beberapa opsi tgl' },
                  { id: 'WEEK', label: 'Perkiraan Minggu', desc: 'Misal: Minggu ke-2' },
                  { id: 'MONTH', label: 'Perkiraan Bulan', desc: 'Misal: Oktober 2026' },
                  { id: 'UNKNOWN', label: 'Belum Tahu', desc: 'Belum ada info' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDatePrecision(item.id as DatePrecision);
                      if (
                        item.id === 'EXACT' &&
                        (status === 'DRAFT' || status === 'WAITING_CONFIRMATION')
                      ) {
                        setStatus('CONFIRMED');
                      } else if (item.id !== 'EXACT' && status === 'CONFIRMED') {
                        setStatus('WAITING_CONFIRMATION');
                      }
                    }}
                    className={`p-2.5 sm:p-3 rounded-clay-sm border text-left transition-all cursor-pointer ${
                      item.id === 'UNKNOWN' ? 'col-span-2 sm:col-span-1' : ''
                    } ${
                      datePrecision === item.id
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-clay-sm font-bold ring-2 ring-blue-100'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Fields for EXACT */}
              {datePrecision === 'EXACT' && (
                <div className="p-3.5 sm:p-4 bg-slate-50/60 rounded-clay border border-slate-200 space-y-3 sm:space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="sm:col-span-1">
                      <Input
                        label="Tanggal Pelaksanaan"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-2 gap-2.5">
                      <Input
                        label="Jam Mulai"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={isAllDay}
                      />

                      <Input
                        label="Jam Selesai"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={isAllDay}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="allDayCheck"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="allDayCheck"
                      className="text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Kegiatan Sepanjang Hari (All Day)
                    </label>
                  </div>
                </div>
              )}

              {/* Dynamic Fields for CANDIDATES */}
              {datePrecision === 'CANDIDATES' && (
                <div className="p-4 bg-slate-50/60 rounded-clay border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Opsi Kandidat Tanggal
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Masukkan 2 atau lebih tanggal yang diajukan oleh mitra/panitia
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={addCandidateDate}
                    >
                      Tambah Tanggal
                    </Button>
                  </div>

                  {candidateDates.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      Belum ada kandidat tanggal. Klik tombol "Tambah Tanggal" di atas.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {candidateDates.map((cDate, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2.5 p-2 bg-white rounded-clay-sm border border-slate-200"
                        >
                          <span className="text-xs font-bold text-purple-700 w-16">
                            Opsi {index + 1}:
                          </span>
                          <input
                            type="date"
                            value={cDate}
                            onChange={(e) => updateCandidateDate(index, e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 shadow-clay-inset"
                          />
                          <button
                            type="button"
                            onClick={() => removeCandidateDate(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Fields for WEEK */}
              {datePrecision === 'WEEK' && (
                <div className="p-4 bg-slate-50/60 rounded-clay border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Bulan Perkiraan"
                      type="month"
                      value={estimatedMonth}
                      onChange={(e) => setEstimatedMonth(e.target.value)}
                      helperText="Pilih bulan perkiraan kegiatan"
                    />
                    <Input
                      label="Keterangan Minggu"
                      placeholder="Contoh: Minggu ke-2 Oktober 2026"
                      value={estimatedWeekLabel}
                      onChange={(e) => setEstimatedWeekLabel(e.target.value)}
                      helperText="Label perkiraan minggu (teks bebas)"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Fields for MONTH */}
              {datePrecision === 'MONTH' && (
                <div className="p-4 bg-slate-50/60 rounded-clay border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <Input
                    label="Bulan Perkiraan"
                    type="month"
                    value={estimatedMonth}
                    onChange={(e) => setEstimatedMonth(e.target.value)}
                    helperText="Contoh: 2026-10"
                  />
                </div>
              )}

              {/* Dynamic Fields for UNKNOWN */}
              {datePrecision === 'UNKNOWN' && (
                <div className="p-3 bg-slate-100/70 rounded-clay text-xs text-slate-500 italic">
                  Tanggal dan waktu sama sekali belum diketahui. Kegiatan akan dicatat sebagai
                  kegiatan tentatif awal.
                </div>
              )}
            </div>
          </Card>

          {/* SECTION 3: WAKTU & LOKASI */}
          <Card>
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">3. Lokasi & Narahubung</h3>
              <p className="text-xs text-slate-500">
                Data tempat pelaksanaan dan kontak luar untuk follow-up
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Lokasi Kegiatan (Tulis Manual)"
                  placeholder="Contoh: Ruang Rapat A, Lab Komputer 1, Aula, dll."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                  helperText="Tuliskan nama tempat pelaksanaan kegiatan secara bebas"
                />

                <Input
                  label="Kontak / Narahubung Luar (Opsional)"
                  placeholder="Contoh: Bpk. Hartono (SMK YPE - 081234567890)"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  helperText="Kontak pihak sekolah/mitra untuk konfirmasi tanggal"
                />
              </div>

              <Textarea
                label="Deskripsi / Catatan Tambahan (Opsional)"
                placeholder="Tuliskan gambaran ringkas kegiatan ini..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </Card>

          {/* SECTION 4: KEBUTUHAN KEGIATAN (PENTING) */}
          <Card>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    4. Kebutuhan Kegiatan
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan bebas persiapan teknis: barang, alat, konsumsi, dsb.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Opsional
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <Textarea
                rows={6}
                placeholder={`Barang:\n• Banner PMB 3x1 m\n• Brosur PMB (300 lembar)\n\nAlat:\n• Laptop\n• Proyektor & kabel HDMI\n• Sound portable\n\nKonsumsi:\n• Air mineral 2 dus\n• Snack 50 box`}
                value={requirementsNotes}
                onChange={(e) => setRequirementsNotes(e.target.value)}
                helperText="Opsional. Gunakan baris baru untuk membuat daftar kebutuhan. Sistem menyimpan dan menampilkan ulang sesuai yang Anda tulis."
              />
            </div>
          </Card>

          {/* Lampiran Dokumen jika dalam mode edit */}
          {isEditMode && id && (
            <div className="pt-2">
              <EventAttachments eventId={id} />
            </div>
          )}

          {/* Submit Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Kegiatan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
