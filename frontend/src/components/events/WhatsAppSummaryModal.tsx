import React, { useState, useEffect } from 'react';
import {
  MessageSquareShare,
  Copy,
  Check,
  Send,
  Calendar,
  Filter,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { EventItem } from '../../types/index';
import {
  generateWhatsAppWeeklySummary,
  SummaryFormatOptions,
} from '../../utils/whatsappSummaryHelper';
import { useToast } from '../../context/ToastContext';

interface WeekDayInfo {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthShort: string;
  isToday: boolean;
}

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  daysOfWeek: WeekDayInfo[];
}

export const WhatsAppSummaryModal: React.FC<WhatsAppSummaryModalProps> = ({
  isOpen,
  onClose,
  events,
  daysOfWeek,
}) => {
  const { success, error: toastError } = useToast();

  const [scope, setScope] = useState<'week' | 'today' | 'custom_day'>('week');
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const today = daysOfWeek.find((d) => d.isToday);
    return today ? today.dateStr : daysOfWeek[0]?.dateStr || '';
  });
  const [includeTentative, setIncludeTentative] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Auto-regenerate whenever options change
  useEffect(() => {
    if (isOpen) {
      const formatted = generateWhatsAppWeeklySummary(events, daysOfWeek, {
        scope,
        selectedDateStr: selectedDayStr,
        includeTentative,
        customNote,
      });
      setMessageText(formatted);
      setIsCopied(false);
    }
  }, [isOpen, events, daysOfWeek, scope, selectedDayStr, includeTentative, customNote]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setIsCopied(true);
      success('Format pesan WhatsApp berhasil disalin ke clipboard! Silakan paste di grup WhatsApp kampus.', 'Tersalin');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      toastError('Gagal menyalin teks ke clipboard.');
    }
  };

  const handleOpenWhatsApp = () => {
    try {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      success('Membuka WhatsApp untuk mengirim pesan...');
    } catch {
      toastError('Gagal membuka WhatsApp.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Format Jadwal untuk Grup WhatsApp"
      description="Buat dan salin ringkasan agenda kampus otomatis dengan format rapi untuk dibagikan ke WhatsApp grup dosen, pimpinan, atau staf."
      maxWidth="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Tutup
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopy}
              className="flex-1 sm:flex-none"
            >
              {isCopied ? 'Tersalin!' : 'Salin Teks'}
            </Button>

            <Button
              type="button"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
            >
              Kirim ke WA
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Scope Selector Pills */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-clay-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Pilih Rentang Agenda:</span>
            </label>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScope('week')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  scope === 'week'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari Mingguan
              </button>
              <button
                type="button"
                onClick={() => setScope('today')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  scope === 'today'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hanya Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setScope('custom_day')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  scope === 'custom_day'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pilih Hari
              </button>
            </div>
          </div>

          {scope === 'custom_day' && (
            <div className="pt-2 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">Hari:</span>
              {daysOfWeek.map((d) => (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDayStr(d.dateStr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${
                    selectedDayStr === d.dateStr
                      ? 'bg-utd-navy-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.dayName.slice(0, 3)} ({d.dayNumber})
                </button>
              ))}
            </div>
          )}

          {/* Toggle Tentative */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTentative}
                onChange={(e) => setIncludeTentative(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Sertakan juga kegiatan yang masih berstatus <strong>Tentatif</strong></span>
            </label>
          </div>
        </div>

        {/* Custom Note Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Tambahan untuk Grup (Opsional):
          </label>
          <input
            type="text"
            placeholder="Contoh: Seluruh panitia harap hadir 30 menit lebih awal..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Live Preview Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquareShare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pratinjau Pesan WhatsApp:</span>
            </label>
            <span className="text-[11px] text-slate-400">
              (Dapat diedit langsung sebelum disalin)
            </span>
          </div>

          <textarea
            rows={10}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-clay border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all leading-relaxed resize-y selection:bg-emerald-600 selection:text-white"
          />
        </div>

        {/* Helpful Tip */}
        <div className="p-2.5 rounded-clay-sm bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="leading-snug">
            <strong>Tips:</strong> Klik <strong>Salin Teks</strong> lalu buka WhatsApp Web/HP Anda dan tekan <code>Ctrl + V</code> pada obrolan grup kampus Anda. Format bintang <code>*tebal*</code> akan otomatis tercetak tebal di WhatsApp.
          </p>
        </div>
      </div>
    </Modal>
  );
};
