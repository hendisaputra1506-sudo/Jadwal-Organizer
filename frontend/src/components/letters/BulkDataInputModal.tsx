import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  FileSpreadsheet,
  Check,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { RecipientItem, SAMPLE_BULK_RECIPIENTS } from '../../types/letterTemplates';

interface BulkDataInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: RecipientItem[];
  onSaveRecipients: (newRecipients: RecipientItem[]) => void;
  defaultLocation?: string;
  defaultDateRange?: string;
}

export const BulkDataInputModal: React.FC<BulkDataInputModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onSaveRecipients,
  defaultLocation = 'UTD PSDKU Tegal',
  defaultDateRange = '13 Agustus 2026 sampai dengan 27 Agustus 2026',
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'paste'>('table');
  const [items, setItems] = useState<RecipientItem[]>(() =>
    recipients.length > 0 ? recipients : [...SAMPLE_BULK_RECIPIENTS]
  );
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteError, setPasteError] = useState<string>('');

  // Add empty row
  const handleAddRow = () => {
    const newItem: RecipientItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      nim: '',
      studyProgram: 'Manajemen Informatika',
      studyLevel: 'D3',
      location: defaultLocation,
      dateRange: defaultDateRange,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update field of an item
  const handleUpdateField = (id: string, field: keyof RecipientItem, value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Parse pasted Excel / CSV text
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setPasteError('Silakan tempel (paste) data teks dari Excel terlebih dahulu.');
      return;
    }

    const lines = pasteText.trim().split(/\r?\n/);
    const parsed: RecipientItem[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by tab (Excel default) or comma or semicolon
      const cols = trimmed.includes('\t')
        ? trimmed.split('\t')
        : trimmed.includes(';')
        ? trimmed.split(';')
        : trimmed.split(',');

      const name = cols[0]?.trim() || '';
      const nim = cols[1]?.trim() || '';
      const studyProgram = cols[2]?.trim() || 'Manajemen Informatika';
      const studyLevel = cols[3]?.trim() || 'D3';
      const location = cols[4]?.trim() || defaultLocation;
      const dateRange = cols[5]?.trim() || defaultDateRange;

      if (name) {
        parsed.push({
          id: `paste-${Date.now()}-${index}`,
          name,
          nim,
          studyProgram,
          studyLevel,
          location,
          dateRange,
        });
      }
    });

    if (parsed.length === 0) {
      setPasteError('Tidak ada baris data yang berhasil terbaca. Pastikan kolom nama terisi.');
      return;
    }

    setItems(parsed);
    setPasteError('');
    setActiveTab('table');
  };

  const handleApply = () => {
    // Filter out empty rows
    const valid = items.filter((it) => it.name.trim() !== '');
    if (valid.length === 0) {
      alert('Minimal harus ada 1 nama penerima.');
      return;
    }
    onSaveRecipients(valid);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Data Penerima Massal (Bulk Letters)"
      description="Masukkan daftar mahasiswa/penerima untuk mencetak surat resmi sekaligus."
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-slate-600">
            Total Penerima: <strong>{items.filter((i) => i.name.trim()).length} Orang</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleApply}
            >
              Terapkan ke Surat
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tabel Baris ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Paste dari Excel / Spreadsheet
            </button>
          </div>

          <button
            onClick={() => setItems([...SAMPLE_BULK_RECIPIENTS])}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Muat Contoh 3 Mahasiswa</span>
          </button>
        </div>

        {/* TAB 1: TABLE VIEW */}
        {activeTab === 'table' && (
          <div className="space-y-3">
            <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-clay-sm p-1 bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200/80 font-bold text-slate-800">
                    <th className="p-2 w-8">No</th>
                    <th className="p-2 w-48">Nama Lengkap *</th>
                    <th className="p-2 w-28">NIM</th>
                    <th className="p-2 w-36">Program Studi</th>
                    <th className="p-2 w-20">Jenjang</th>
                    <th className="p-2 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-blue-50/30">
                      <td className="p-2 text-slate-400 font-bold text-center">{idx + 1}</td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => handleUpdateField(it.id, 'name', e.target.value)}
                          placeholder="Nama Mahasiswa"
                          className="w-full text-xs font-semibold px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={it.nim || ''}
                          onChange={(e) => handleUpdateField(it.id, 'nim', e.target.value)}
                          placeholder="25303024"
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={it.studyProgram || ''}
                          onChange={(e) => handleUpdateField(it.id, 'studyProgram', e.target.value)}
                          placeholder="Manajemen Informatika"
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-1">
                        <select
                          value={it.studyLevel || 'D3'}
                          onChange={(e) => handleUpdateField(it.id, 'studyLevel', e.target.value)}
                          className="w-full text-xs px-1 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                        >
                          <option value="D3">D3</option>
                          <option value="S1">S1</option>
                          <option value="D4">D4</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleRemoveRow(it.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddRow}
              className="w-full"
            >
              Tambah Baris Mahasiswa Baru
            </Button>
          </div>
        )}

        {/* TAB 2: PASTE EXCEL VIEW */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-clay-sm text-xs text-blue-900 flex items-start gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Salin (Copy) Kolom Langsung dari Excel / Google Sheets</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Urutan kolom yang didukung:{' '}
                  <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">
                    Nama [Tab] NIM [Tab] Program Studi [Tab] Jenjang
                  </code>
                </p>
              </div>
            </div>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteError('');
              }}
              placeholder={`Contoh data yang di-paste dari Excel:\nIsna Nur Asifa\t25303024\tManajemen Informatika\tD3\nMuhammad Rizky Fauzan\t25303018\tTeknik Informatika\tS1\nSiti Sarah Rahmawati\t25303042\tSistem Informasi\tS1`}
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-clay-sm focus:border-blue-500 focus:outline-none bg-slate-50"
            />

            {pasteError && (
              <p className="text-xs text-rose-600 font-semibold">{pasteError}</p>
            )}

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleParsePaste}
              className="w-full"
            >
              Konversi & Terapkan Data
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
