import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  FolderSync,
  FileText,
  Camera,
  X,
  RotateCcw,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Category, CategoryDocumentSlot, SlotAcceptType } from '../../types/index';
import { useToast } from '../../context/ToastContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#0284C7', // Sky Blue
  '#DC2626', // Red
  '#DB2777', // Pink
  '#4B5563', // Gray
];

const QUICK_SLOT_PRESETS: Array<Omit<CategoryDocumentSlot, 'key'> & { chip: string }> = [
  {
    chip: '+ Scan Daftar Hadir (1 Folder)',
    label: 'Scan Daftar Hadir Siswa (PDF)',
    accept: 'PDF',
    centralized: true,
    centralFolderName: '00 - Daftar Hadir (Semua Sekolah)',
    required: true,
  },
  {
    chip: '+ Berita Acara / Notulensi',
    label: 'Berita Acara / Notulensi',
    accept: 'DOC',
    centralized: false,
    required: true,
  },
  {
    chip: '+ Daftar Hadir Peserta',
    label: 'Daftar Hadir Peserta',
    accept: 'PDF',
    centralized: false,
    required: false,
  },
  {
    chip: '+ Surat / SK / Materi',
    label: 'Surat / SK / Materi',
    accept: 'ANY',
    centralized: false,
    required: false,
  },
  {
    chip: '+ Laporan Kegiatan',
    label: 'Laporan Kegiatan',
    accept: 'PDF',
    centralized: false,
    required: false,
  },
];

function slugifyKey(label: string): string {
  const cleaned = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return cleaned || `slot_${Date.now()}`;
}

export const ManageCategoriesPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState<string>('');
  const [color, setColor] = useState<string>('#2563EB');
  const [slots, setSlots] = useState<CategoryDocumentSlot[]>([]);
  const [resetToAuto, setResetToAuto] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/categories');
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setColor('#2563EB');
    setSlots([
      {
        key: 'dokumen_kegiatan',
        label: 'Dokumen / Laporan Kegiatan',
        accept: 'ANY',
        centralized: false,
        required: false,
      },
    ]);
    setResetToAuto(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    const currentSlots = cat.effective_document_slots || cat.document_slots || [];
    setSlots(currentSlots.map((s) => ({ ...s })));
    setResetToAuto(false);
    setIsModalOpen(true);
  };

  const addPresetSlot = (preset: (typeof QUICK_SLOT_PRESETS)[number]) => {
    setResetToAuto(false);
    const key = slugifyKey(preset.label);
    setSlots((prev) => [
      ...prev,
      {
        key: prev.some((s) => s.key === key) ? `${key}_${prev.length + 1}` : key,
        label: preset.label,
        accept: preset.accept,
        centralized: preset.centralized,
        centralFolderName: preset.centralFolderName,
        required: preset.required,
      },
    ]);
  };

  const addEmptySlot = () => {
    setResetToAuto(false);
    setSlots((prev) => [
      ...prev,
      {
        key: `dokumen_${prev.length + 1}`,
        label: '',
        accept: 'ANY',
        centralized: false,
        required: false,
      },
    ]);
  };

  const updateSlot = (index: number, patch: Partial<CategoryDocumentSlot>) => {
    setResetToAuto(false);
    setSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== index) return slot;
        const next = { ...slot, ...patch };
        if (patch.centralized && !next.centralFolderName) {
          next.centralFolderName = `00 - ${next.label || 'Rekap Dokumen'}`;
        }
        return next;
      })
    );
  };

  const removeSlot = (index: number) => {
    setResetToAuto(false);
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanedSlots = resetToAuto
      ? null
      : slots
          .filter((s) => s.label.trim())
          .map((s) => ({
            ...s,
            key: s.key && !s.key.startsWith('dokumen_') ? s.key : slugifyKey(s.label),
            label: s.label.trim(),
            centralFolderName: s.centralized
              ? (s.centralFolderName || '').trim() || `00 - ${s.label.trim()}`
              : undefined,
          }));

    setIsSaving(true);
    try {
      const payload = {
        name,
        color,
        document_slots: cleanedSlots,
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        success('Kategori & aturan dokumen berhasil diperbarui.');
      } else {
        await api.post('/categories', payload);
        success('Kategori baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toastError(err.message || 'Gagal menyimpan kategori.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      success('Kategori berhasil dihapus.');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus kategori.', 'Gagal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Kelola Kategori"
        subtitle="Atur kategori kegiatan, warna label, serta slot dokumen & folder Google Drive per kategori"
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            <span className="hidden sm:inline">Tambah Kategori</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-clay-sm px-4 py-3 flex items-start gap-2.5 text-xs text-blue-900">
          <Camera className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Dokumentasi Foto &amp; Video</strong> otomatis tersedia di setiap kategori. Di bawah ini
            Anda dapat mengatur <strong>slot dokumen khusus</strong> (misalnya <em>Scan Daftar Hadir</em>{' '}
            yang disatukan ke 1 folder Google Drive untuk <strong>Sosialisasi PMB</strong>, atau{' '}
            <em>Berita Acara / SK</em> untuk <strong>Akademik</strong>).
          </p>
        </div>

        <div className="bg-white rounded-clay border border-white/90 shadow-clay-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[540px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-5">Warna &amp; Nama Kategori</th>
                  <th className="py-3.5 px-3 sm:px-4">Slot Dokumen Kegiatan</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      Memuat kategori...
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => {
                    const effectiveSlots = cat.effective_document_slots || [];
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 align-top">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <span
                              style={{ backgroundColor: cat.color }}
                              className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                            />
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {cat.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 align-top">
                          {effectiveSlots.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">
                              Hanya Foto &amp; Video
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {effectiveSlots.map((slot) => (
                                <span
                                  key={slot.key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    slot.centralized
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title={
                                    slot.centralized
                                      ? `Disatukan di 1 folder Drive: ${cat.name} / ${slot.centralFolderName || slot.label}`
                                      : `Disimpan per kegiatan di ${cat.name} / [Nama Kegiatan]`
                                  }
                                >
                                  {slot.centralized ? (
                                    <FolderSync className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                  ) : (
                                    <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  )}
                                  <span>{slot.label}</span>
                                  {slot.centralized && (
                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">
                                      1 Folder
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center text-xs font-semibold text-slate-600 whitespace-nowrap align-top">
                          {cat._count?.events || 0} keg.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap align-top">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => handleOpenEdit(cat)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Ubah kategori & slot dokumen"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(cat)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus kategori"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Atur Kategori: ${editingCategory.name}` : 'Tambah Kategori Baru'}
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Kategori"
              placeholder="Contoh: Sosialisasi PMB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pilihan Warna
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full shadow-sm transition-transform cursor-pointer ${
                      color.toUpperCase() === c.toUpperCase()
                        ? 'scale-125 ring-2 ring-offset-2 ring-slate-400'
                        : 'hover:scale-110'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 p-0.5 rounded-lg border border-slate-200 cursor-pointer ml-1"
                  title="Pilih warna kustom"
                />
              </div>
            </div>
          </div>

          {/* Slot Dokumen Khusus Kategori */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Slot Dokumen Khusus Kategori Ini
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Foto &amp; Video otomatis selalu ada. Atur dokumen lain yang dihasilkan kategori ini:
                </p>
              </div>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => setResetToAuto(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                  title="Kembalikan ke bawaan otomatis sistem"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Bawaan
                </button>
              )}
            </div>

            {resetToAuto && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Saat disimpan, slot dokumen kategori ini akan dikembalikan ke aturan bawaan otomatis.
              </div>
            )}

            {/* Quick-Add Presets */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SLOT_PRESETS.map((preset) => (
                <button
                  key={preset.chip}
                  type="button"
                  onClick={() => addPresetSlot(preset)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                >
                  {preset.chip}
                </button>
              ))}
            </div>

            {/* Editable Slots List */}
            {slots.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500">
                Tidak ada slot dokumen tambahan — kategori ini hanya menampilkan Galeri Foto &amp; Video.
              </div>
            ) : (
              <div className="space-y-2.5">
                {slots.map((slot, idx) => (
                  <div
                    key={`${slot.key}-${idx}`}
                    className={`p-3 rounded-xl border space-y-2.5 ${
                      slot.centralized
                        ? 'bg-indigo-50/40 border-indigo-200/80'
                        : 'bg-slate-50/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-7">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Nama Slot Dokumen
                          </label>
                          <input
                            type="text"
                            value={slot.label}
                            onChange={(e) => updateSlot(idx, { label: e.target.value })}
                            placeholder="Contoh: Scan Daftar Hadir Siswa (PDF)"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <Select
                            label="Format Berkas"
                            value={slot.accept}
                            onChange={(e) =>
                              updateSlot(idx, { accept: e.target.value as SlotAcceptType })
                            }
                          >
                            <option value="PDF">Khusus PDF</option>
                            <option value="DOC">Dokumen (PDF / Word / Excel / PPT)</option>
                            <option value="ANY">Semua Berkas</option>
                          </Select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="p-1.5 mt-5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus slot ini"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Toggle Satukan ke 1 Folder Google Drive */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(slot.centralized)}
                          onChange={(e) => updateSlot(idx, { centralized: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <FolderSync className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Satukan semua kegiatan kategori ini ke 1 Folder Google Drive</span>
                      </label>
                    </div>

                    {slot.centralized && (
                      <div className="pl-5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                          Nama Folder Gabungan di Drive ({name || 'Kategori'} / ...)
                        </label>
                        <input
                          type="text"
                          value={slot.centralFolderName || ''}
                          onChange={(e) => updateSlot(idx, { centralFolderName: e.target.value })}
                          placeholder="00 - Daftar Hadir (Semua Sekolah)"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-indigo-600/90 mt-1">
                          File tetap muncul di halaman detail tiap kegiatan, sekaligus berkumpul otomatis
                          di 1 folder Drive ini dengan nama file berformat <em>Tanggal - Nama Kegiatan</em>.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addEmptySlot}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Slot Dokumen Kustom
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message="Apakah Anda yakin ingin menghapus kategori ini?"
        itemName={deleteTarget?.name}
        confirmText="Hapus"
        isLoading={isDeleting}
      />
    </div>
  );
};
