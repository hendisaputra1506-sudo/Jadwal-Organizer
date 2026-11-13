import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tags, Plus, Edit, Trash2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Category } from '../../types/index';
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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name, color });
        success('Kategori berhasil diperbarui.');
      } else {
        await api.post('/categories', { name, color });
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
        subtitle="Master data label kategori dan palet warna visual kegiatan"
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            <span className="hidden sm:inline">Tambah Kategori</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        }
      />

      <div className="p-3.5 sm:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white rounded-clay border border-white/90 shadow-clay-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[360px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-5">Warna & Nama Kategori</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span
                          style={{ backgroundColor: cat.color }}
                          className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                        />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {cat._count?.events || 0} keg.
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Ubah Kategori' : 'Tambah Kategori Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
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
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full shadow-sm transition-transform cursor-pointer ${
                    color.toUpperCase() === c.toUpperCase()
                      ? 'scale-125 ring-2 ring-offset-2 ring-slate-400'
                      : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
              />
              <span className="text-xs font-mono font-semibold text-slate-600 uppercase">
                {color}
              </span>
            </div>
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
              Simpan
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
