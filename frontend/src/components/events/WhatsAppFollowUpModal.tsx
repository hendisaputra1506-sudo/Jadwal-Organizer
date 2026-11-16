import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Phone,
  Send,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { EventItem } from '../../types/index';
import {
  extractPhoneNumber,
  formatToWhatsAppNumber,
  generateFollowUpMessage,
  getWhatsAppUrl,
} from '../../utils/whatsappHelper';
import { useToast } from '../../context/ToastContext';

interface WhatsAppFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export const WhatsAppFollowUpModal: React.FC<WhatsAppFollowUpModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { success, error: toastError } = useToast();

  const [phone, setPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (event) {
      const extracted = extractPhoneNumber(event.contact_info);
      setPhone(extracted || '');
      setMessage(generateFollowUpMessage(event));
      setIsCopied(false);
    }
  }, [event]);

  if (!event) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      success('Teks pesan berhasil disalin ke clipboard!');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      toastError('Gagal menyalin teks.');
    }
  };

  const handleSendWhatsApp = () => {
    if (!phone.trim()) {
      toastError('Silakan masukkan nomor telepon/WhatsApp tujuan terlebih dahulu.');
      return;
    }

    const clean = formatToWhatsAppNumber(phone);
    if (clean.length < 9) {
      toastError('Nomor WhatsApp tidak valid (terlalu pendek).');
      return;
    }

    const url = getWhatsAppUrl(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick WhatsApp Follow-up"
      description="Kirim pesan konfirmasi resmi ke pihak narahubung sekolah atau mitra luar kampus."
      maxWidth="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopy}
            className="w-full sm:w-auto"
          >
            {isCopied ? 'Tersalin' : 'Salin Pesan'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
            >
              Kirim via WhatsApp
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Event Context Card */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-clay-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Kegiatan yang Dikonfirmasi
            </p>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{event.name}</p>
            {event.contact_info && (
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-semibold text-slate-500">Catatan Kontak:</span>{' '}
                {event.contact_info}
              </p>
            )}
          </div>
        </div>

        {/* Phone Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nomor WhatsApp Tujuan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890 atau 6281234567890"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {phone
              ? `Format WhatsApp: +${formatToWhatsAppNumber(phone)}`
              : 'Nomor otomatis dideteksi dari data kontak kegiatan.'}
          </p>
        </div>

        {/* Message Template Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Draf Pesan WhatsApp (Siap Dikirim / Dapat Diedit)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {message.length} karakter
            </span>
          </div>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans leading-relaxed"
          />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>
              Saat mengklik <strong>Kirim via WhatsApp</strong>, browser akan langsung membuka WhatsApp Web atau aplikasi WhatsApp di perangkat Anda.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
