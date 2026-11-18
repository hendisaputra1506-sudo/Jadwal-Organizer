import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Calendar,
  MapPin,
  Plus,
  CalendarDays,
  List,
  HelpCircle,
  Printer,
  ArrowRight,
  MessageCircle,
  Sparkles,
  Loader2,
  CornerDownLeft,
  Archive,
  BookOpen,
} from 'lucide-react';
import { api } from '../../services/api';
import { EventItem } from '../../types/index';
import { StatusBadge, CategoryBadge } from './Badge';
import { WhatsAppFollowUpModal } from '../events/WhatsAppFollowUpModal';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  {
    id: 'new-event',
    label: 'Tambah Kegiatan Baru',
    sub: 'Buat jadwal sosialisasi, pelatihan, expo, atau rapat',
    path: '/events/new',
    icon: Plus,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'weekly',
    label: 'Jadwal Minggu Ini',
    sub: 'Pantau agenda fokus minggu berjalan',
    path: '/weekly',
    icon: CalendarDays,
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'calendar',
    label: 'Kalender Bulanan',
    sub: 'Lihat sebaran jadwal per bulan',
    path: '/calendar',
    icon: Calendar,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'tentative',
    label: 'Kegiatan Tentatif',
    sub: 'Daftar sekolah/acara menunggu konfirmasi tanggal',
    path: '/tentative',
    icon: HelpCircle,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'archive',
    label: 'Arsip & Dokumentasi',
    sub: 'Cari kegiatan lama & cek foto/video/PDF daftar hadir',
    path: '/archive',
    icon: Archive,
    color: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'all-events',
    label: 'Semua Kegiatan',
    sub: 'Filter dan kelola seluruh daftar agenda kampus',
    path: '/events',
    icon: List,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'print',
    label: 'Cetak Jadwal',
    sub: 'Format cetak rapi A4 untuk rapat & papan pengumuman',
    path: '/print',
    icon: Printer,
    color: 'bg-slate-100 text-slate-600',
  },
  {
    id: 'guide',
    label: 'Panduan & Dokumentasi Fitur',
    sub: 'Cara pakai jadwal, upload Drive, press release, & FAQ staf',
    path: '/guide',
    icon: BookOpen,
    color: 'bg-sky-100 text-sky-600',
  },
];

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [waEvent, setWaEvent] = useState<EventItem | null>(null);

  // Fetch latest events whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 40);

    let mounted = true;
    setIsLoading(true);
    api
      .get('/events')
      .then((res: any) => {
        if (mounted && res.success && Array.isArray(res.data)) {
          setEvents(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show up to 6 priority/upcoming events first
      const sorted = [...events].sort((a, b) => {
        if (a.event_date && !b.event_date) return -1;
        if (!a.event_date && b.event_date) return 1;
        if (a.event_date && b.event_date) {
          return a.event_date.localeCompare(b.event_date);
        }
        return (a.estimated_month || '9999').localeCompare(b.estimated_month || '9999');
      });
      return sorted.slice(0, 6);
    }

    return events
      .filter((ev) => {
        const haystack = [
          ev.name,
          ev.location_name,
          ev.location?.name,
          ev.contact_info,
          ev.category?.name,
          ev.description,
          ev.estimated_month,
          ev.estimated_week_label,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [events, query]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_ACTIONS.slice(0, 4);
    return QUICK_ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)
    );
  }, [query]);

  // Combined selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    const list: Array<{ type: 'event'; item: EventItem } | { type: 'action'; path: string }> = [];
    filteredEvents.forEach((ev) => list.push({ type: 'event', item: ev }));
    filteredActions.forEach((act) => list.push({ type: 'action', path: act.path }));
    return list;
  }, [filteredEvents, filteredActions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || waEvent) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          selectableItems.length > 0 ? (prev + 1) % selectableItems.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          selectableItems.length > 0
            ? (prev - 1 + selectableItems.length) % selectableItems.length
            : 0
        );
      } else if (e.key === 'Enter' && selectableItems[activeIndex]) {
        e.preventDefault();
        const selected = selectableItems[activeIndex];
        if (selected.type === 'event') {
          navigate(`/events/${selected.item.id}`);
        } else {
          navigate(selected.path);
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, waEvent, selectableItems, activeIndex, navigate, onClose]);

  const formatShortDate = (ev: EventItem): string => {
    if (ev.event_date) {
      const dateStr = ev.event_date.split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (ev.estimated_week_label) return ev.estimated_week_label;
    if (ev.estimated_month) {
      const [y, m] = ev.estimated_month.split('-').map(Number);
      if (y && m) {
        const dt = new Date(y, m - 1, 1);
        return dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      }
      return ev.estimated_month;
    }
    return 'Tentatif';
  };

  if (!isOpen && !waEvent) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4 no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm animate-backdrop-in"
            onClick={onClose}
          />

          {/* Palette Panel */}
          <div
            className="relative w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-clay-lg border border-white/90 shadow-2xl overflow-hidden z-10 animate-modal-spring"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white">
              <Search className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari sekolah, kegiatan, kota, kontak WA, atau menu..."
                className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md hover:text-slate-700 cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[62vh] overflow-y-auto p-2.5 sm:p-3 space-y-4">
              {/* Events Section */}
              <div>
                <div className="flex items-center justify-between px-2.5 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    {query.trim()
                      ? `Hasil Kegiatan (${filteredEvents.length})`
                      : `Jadwal Terdekat & Aktif (${events.length} total)`}
                  </span>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="py-6 px-4 text-center text-xs text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    Tidak ditemukan kegiatan dengan kata kunci &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredEvents.map((ev, idx) => {
                      const isActive = activeIndex === idx;
                      return (
                        <div
                          key={ev.id}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => {
                            navigate(`/events/${ev.id}`);
                            onClose();
                          }}
                          className={`group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? 'bg-blue-50/90 ring-1 ring-blue-200 shadow-xs'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-700">
                                {ev.name}
                              </span>
                              <StatusBadge status={ev.status} size="sm" />
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                              {ev.category && (
                                <CategoryBadge
                                  name={ev.category.name}
                                  color={ev.category.color}
                                  size="sm"
                                />
                              )}
                              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                {formatShortDate(ev)}
                              </span>
                              {(ev.location_name || ev.location?.name) && (
                                <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ev.location_name || ev.location?.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {ev.contact_info && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWaEvent(ev);
                                  onClose();
                                }}
                                title="Hubungi Narahubung via WhatsApp"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-500 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WA</span>
                              </button>
                            )}
                            <ArrowRight
                              className={`w-4 h-4 transition-transform ${
                                isActive
                                  ? 'text-blue-600 translate-x-0.5'
                                  : 'text-slate-300 group-hover:text-slate-500'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Navigation Section */}
              {filteredActions.length > 0 && (
                <div>
                  <div className="px-2.5 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Pintasan Cepat
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredActions.map((act, idx) => {
                      const combinedIdx = filteredEvents.length + idx;
                      const isActive = activeIndex === combinedIdx;
                      const Icon = act.icon;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(combinedIdx)}
                          onClick={() => {
                            navigate(act.path);
                            onClose();
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-50/90 ring-1 ring-blue-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.color}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{act.label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{act.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                    ↑↓
                  </kbd>
                  Navigasi
                </span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600 inline-flex items-center">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </kbd>
                  Buka
                </span>
              </div>
              <span className="font-medium text-blue-600/80">
                Pencarian Kilat Jadwal UTD
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick WhatsApp Modal directly from Command Search */}
      <WhatsAppFollowUpModal
        isOpen={Boolean(waEvent)}
        onClose={() => setWaEvent(null)}
        event={waEvent}
      />
    </>
  );
};
