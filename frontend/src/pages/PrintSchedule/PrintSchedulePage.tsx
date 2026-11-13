import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { Printer, Calendar, Filter, FileText, CheckCircle2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { CategoryBadge, StatusBadge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { EventItem, Category } from '../../types/index';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const PrintSchedulePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { onToggleSidebar } = useOutletContext<OutletContextType>();

  const initialMode = searchParams.get('mode') || 'table'; // 'table' | 'detail'
  const initialEventId = searchParams.get('eventId') || '';

  const [printMode, setPrintMode] = useState<'table' | 'detail'>(initialMode as any);
  const [scope, setScope] = useState<string>('this_week'); // this_week, next_week, this_month, tentative, custom
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [singleEvent, setSingleEvent] = useState<EventItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Set default dates for scopes
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (scope === 'this_week') {
      const sun = new Date(monday);
      sun.setDate(monday.getDate() + 6);
      setStartDate(toYMD(monday));
      setEndDate(toYMD(sun));
    } else if (scope === 'next_week') {
      const nextMon = new Date(monday);
      nextMon.setDate(monday.getDate() + 7);
      const nextSun = new Date(nextMon);
      nextSun.setDate(nextMon.getDate() + 6);
      setStartDate(toYMD(nextMon));
      setEndDate(toYMD(nextSun));
    } else if (scope === 'this_month') {
      const y = new Date().getFullYear();
      const m = new Date().getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setStartDate(toYMD(first));
      setEndDate(toYMD(last));
    }
  }, [scope]);

  // Load categories for print legend
  useEffect(() => {
    api.get('/categories').then((res: any) => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  // Fetch events based on current print options
  const fetchPrintData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (printMode === 'detail' && selectedEventId) {
        const res: any = await api.get(`/events/${selectedEventId}`);
        if (res.success) setSingleEvent(res.data);
      } else {
        let endpoint = '/events';
        const params = new URLSearchParams();

        if (scope === 'tentative') {
          endpoint = '/events/tentative';
        } else if (startDate && endDate) {
          params.append('startDate', startDate);
          params.append('endDate', endDate);
          params.append('datePrecision', 'EXACT');
        }

        const res: any = await api.get(`${endpoint}?${params.toString()}`);
        if (res.success) {
          setEvents(res.data);
          if (res.data.length > 0 && !selectedEventId) {
            setSelectedEventId(res.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load print data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [printMode, scope, startDate, endDate, selectedEventId]);

  useEffect(() => {
    fetchPrintData();
  }, [fetchPrintData]);

  const handleTriggerPrint = () => {
    window.print();
  };

  const formatDateDisplay = (ev: EventItem) => {
    if (ev.date_precision === 'EXACT' && ev.event_date) {
      const d = new Date(ev.event_date);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (ev.date_precision === 'WEEK') return ev.estimated_week_label || 'Perkiraan Minggu';
    if (ev.date_precision === 'MONTH') return `Perkiraan Bulan ${ev.estimated_month || '—'}`;
    if (ev.date_precision === 'CANDIDATES') return `${ev.candidate_dates?.length || 0} Kandidat Tanggal`;
    return 'Belum Ditentukan';
  };

  const groupedEvents = useMemo(() => {
    const groups: {
      dateKey: string;
      dateLabel: string;
      events: EventItem[];
    }[] = [];
    const groupMap = new Map<string, { dateKey: string; dateLabel: string; events: EventItem[] }>();

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    events.forEach((ev) => {
      let key = '';
      let label = '';

      if (ev.date_precision === 'EXACT' && ev.event_date) {
        const dateStr = typeof ev.event_date === 'string'
          ? ev.event_date.split('T')[0]
          : new Date(ev.event_date).toISOString().split('T')[0];
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        key = `EXACT_${dateStr}`;
        label = `${days[dateObj.getDay()]}, ${d} ${months[m - 1]} ${y}`;
      } else if (ev.date_precision === 'WEEK') {
        key = `WEEK_${ev.estimated_week_label || ev.id}`;
        label = ev.estimated_week_label || 'Perkiraan Minggu';
      } else if (ev.date_precision === 'MONTH') {
        key = `MONTH_${ev.estimated_month || ev.id}`;
        label = `Perkiraan Bulan ${ev.estimated_month || '—'}`;
      } else if (ev.date_precision === 'CANDIDATES') {
        key = `CANDIDATES_${ev.id}`;
        label = `${ev.candidate_dates?.length || 0} Kandidat Tanggal`;
      } else {
        key = `UNKNOWN_${ev.id}`;
        label = 'Belum Ditentukan';
      }

      if (!groupMap.has(key)) {
        const newGroup = { dateKey: key, dateLabel: label, events: [ev] };
        groupMap.set(key, newGroup);
        groups.push(newGroup);
      } else {
        groupMap.get(key)!.events.push(ev);
      }
    });

    return groups;
  }, [events]);

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Cetak Jadwal Kegiatan"
        subtitle="Format cetak standar A4 Landscape yang rapi dan profesional untuk laporan atau rapat"
      />

      {/* Screen Controls (Hidden during print via .no-print) */}
      <div className="p-3.5 sm:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 no-print">
        <div className="bg-white rounded-clay p-4 sm:p-5 border border-white/90 shadow-clay-card space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-3.5 sm:pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Pengaturan Dokumen Cetak</h3>
              <p className="text-xs text-slate-500">
                Pilih format tabel ringkas jadwal atau cetak detail lengkap kegiatan
              </p>
            </div>

            <Button
              onClick={handleTriggerPrint}
              variant="primary"
              size="lg"
              leftIcon={<Printer className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Cetak Sekarang (Print / PDF)
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Select
              label="Mode Dokumen"
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as any)}
            >
              <option value="table">Tabel Jadwal Kegiatan (A4 Landscape)</option>
              <option value="detail">Detail Lengkap Kegiatan (Kebutuhan & Catatan)</option>
            </Select>

            {printMode === 'table' ? (
              <>
                <Select
                  label="Rentang Waktu"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="this_week">Minggu Ini</option>
                  <option value="next_week">Minggu Depan</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="tentative">Hanya Kegiatan Tentatif</option>
                  <option value="custom">Rentang Tanggal Khusus</option>
                </Select>

                {scope === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Dari Tanggal"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      label="Sampai Tanggal"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              <Select
                label="Pilih Kegiatan untuk Dicetak"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({formatDateDisplay(ev)})
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* PRINTABLE CANVAS (What gets printed and previewed) */}
      <div className="p-3.5 sm:p-8 max-w-6xl mx-auto">
        <div className="bg-white p-4 sm:p-10 rounded-clay border border-slate-200 shadow-clay-card print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo-utd.png" alt="Logo UTD" className="w-10 sm:w-12 h-10 sm:h-12 object-contain" />
              <div>
                <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                  JADWAL KEGIATAN KAMPUS UTD
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  Universitas Teknologi Digital &bull; Sistem Terpadu Jadwal Bersama
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500">
              <div>
                <strong>Periode:</strong>{' '}
                {printMode === 'table'
                  ? scope === 'tentative'
                    ? 'Kegiatan Tentatif'
                    : `${startDate} s/d ${endDate}`
                  : 'Detail Kegiatan Spesifik'}
              </div>
              <div className="text-[11px] text-slate-400">Dicetak: {currentDateStr}</div>
            </div>
          </div>

          {/* MODE 1: TABEL JADWAL (A4 LANDSCAPE) */}
          {printMode === 'table' && (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="schedule-print-table w-full text-left border-collapse text-xs min-w-[550px] print:min-w-0">
                <thead>
                  <tr className="bg-slate-100 border border-slate-400 font-bold uppercase text-slate-800">
                    <th className="p-2 border border-slate-400 w-36">Hari / Tanggal</th>
                    <th className="p-2 border border-slate-400 w-28">Waktu</th>
                    <th className="p-2 border border-slate-400">Nama Kegiatan</th>
                    <th className="p-2 border border-slate-400 w-40">Lokasi</th>
                    <th className="p-2 border border-slate-400 w-28">Kategori</th>
                    <th className="p-2 border border-slate-400 w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        Tidak ada kegiatan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    groupedEvents.map((group) =>
                      group.events.map((ev, evIdx) => (
                        <tr key={ev.id} className="border border-slate-300">
                          {evIdx === 0 && (
                            <td
                              rowSpan={group.events.length}
                              className="p-2 border border-slate-300 font-semibold text-slate-900 align-top whitespace-nowrap bg-slate-50/50"
                            >
                              <div>{group.dateLabel}</div>
                              {group.events.length > 1 && (
                                <div className="text-[10px] text-blue-800 font-bold mt-0.5 print:text-black">
                                  ({group.events.length} Kegiatan)
                                </div>
                              )}
                            </td>
                          )}
                          <td className="p-2 border border-slate-300 text-slate-700 whitespace-nowrap">
                            {ev.is_all_day
                              ? 'Sepanjang Hari'
                              : ev.start_time && ev.end_time
                              ? `${ev.start_time} - ${ev.end_time}`
                              : '—'}
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-900">
                            {ev.name}
                            {ev.contact_info && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                Kontak: {ev.contact_info}
                              </div>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-700">
                            {ev.location_name || ev.location?.name || '—'}
                          </td>
                          <td className="p-2 border border-slate-300">
                            <span
                              style={{
                                color: ev.category.color,
                                borderColor: `${ev.category.color}50`,
                              }}
                              className="font-semibold text-[11px] px-1.5 py-0.5 border rounded"
                            >
                              {ev.category.name}
                            </span>
                          </td>
                          <td className="p-2 border border-slate-300">
                            <StatusBadge status={ev.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>

              {/* Print Legends */}
              <div className="mt-5 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-[11px] text-slate-600">
                <div>
                  <strong className="block mb-1 text-slate-800">Kategori:</strong>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1">
                        <span
                          style={{ backgroundColor: c.color }}
                          className="w-2 h-2 rounded-full inline-block"
                        />
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <strong className="block mb-1 text-slate-800">Catatan Dokumen:</strong>
                  <p className="text-[10px] text-slate-500">
                    Jadwal dapat berubah sewaktu-waktu. Selalu periksa sistem digital untuk
                    pembaruan status terkini.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: DETAIL KEGIATAN & KEBUTUHAN KEGIATAN */}
          {printMode === 'detail' && (
            <div className="space-y-6">
              {singleEvent ? (
                <div className="space-y-5 text-sm">
                  <div className="border border-slate-300 rounded p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-black text-slate-900">{singleEvent.name}</h3>
                      <StatusBadge status={singleEvent.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200">
                      <div>
                        <strong className="block text-slate-500">Kategori:</strong>
                        <span>{singleEvent.category.name}</span>
                      </div>
                      <div>
                        <strong className="block text-slate-500">Tanggal:</strong>
                        <span>{formatDateDisplay(singleEvent)}</span>
                      </div>
                      <div>
                        <strong className="block text-slate-500">Waktu:</strong>
                        <span>
                          {singleEvent.is_all_day
                            ? 'Sepanjang Hari'
                            : singleEvent.start_time
                            ? `${singleEvent.start_time} - ${singleEvent.end_time}`
                            : 'Belum ditentukan'}
                        </span>
                      </div>
                      <div>
                        <strong className="block text-slate-500">Lokasi:</strong>
                        <span>{singleEvent.location_name || singleEvent.location?.name || '—'}</span>
                      </div>
                    </div>

                    {singleEvent.contact_info && (
                      <div className="text-xs pt-2">
                        <strong className="text-slate-500">Kontak Narahubung:</strong>{' '}
                        <span>{singleEvent.contact_info}</span>
                      </div>
                    )}
                  </div>

                  {/* Deskripsi */}
                  <div className="border border-slate-300 rounded p-4 space-y-1">
                    <strong className="text-xs uppercase text-slate-700 block">
                      Deskripsi Kegiatan
                    </strong>
                    <div className="text-xs text-slate-800 whitespace-pre-wrap">
                      {singleEvent.description || 'Tidak ada deskripsi tambahan.'}
                    </div>
                  </div>

                  {/* KEBUTUHAN KEGIATAN CETAK */}
                  <div className="border border-slate-300 rounded p-4 space-y-2 bg-slate-50/50">
                    <strong className="text-xs uppercase text-slate-900 block font-bold">
                      Kebutuhan Kegiatan (Barang / Alat / Konsumsi)
                    </strong>
                    {singleEvent.requirements_notes ? (
                      <div className="text-xs text-slate-900 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 border border-slate-200 rounded">
                        {singleEvent.requirements_notes}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Belum ada kebutuhan kegiatan yang dicatat.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Silakan pilih kegiatan terlebih dahulu untuk melihat preview cetak detail.
                </div>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-8 pt-2 border-t border-slate-300 text-center text-[10px] text-slate-400">
            Dicetak melalui Sistem Jadwal Kegiatan Kampus &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
};
