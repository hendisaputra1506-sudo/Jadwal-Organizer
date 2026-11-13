import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Location } from '../../types/index';
import { useToast } from '../../context/ToastContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const ManageLocationsPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { success, error: toastError } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/locations');
      if (res.success) setLocations(res.data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setName(loc.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, { name });
        success('Lokasi berhasil diperbarui.');
      } else {
        await api.post('/locations', { name });
        success('Lokasi baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      toastError(err.message || 'Gagal menyimpan lokasi.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/locations/${deleteTarget.id}`);
      success('Lokasi berhasil dihapus.');
      setDeleteTarget(null);
      fetchLocations();
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus lokasi.', 'Gagal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Kelola Lokasi"
        subtitle="Master data lokasi kampus dan sekolah mitra untuk deteksi bentrok jadwal yang akurat"
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            Tambah Lokasi
          </Button>
        }
      />

      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-clay border border-white/90 shadow-clay-card overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Nama Lokasi</th>
                <th className="py-3.5 px-4 text-center">Jumlah Kegiatan</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-clay-sm bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{loc.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600">
                    {loc._count?.events || 0} kegiatan
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(loc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(loc)}
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

      {/* Modal Add/Edit Location */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLocation ? 'Ubah Lokasi' : 'Tambah Lokasi Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nama Lokasi"
            placeholder="Contoh: Aula Utama atau SMK YPE Slawi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

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
        title="Hapus Lokasi"
        message="Apakah Anda yakin ingin menghapus lokasi ini dari master data?"
        itemName={deleteTarget?.name}
        confirmText="Hapus"
        isLoading={isDeleting}
      />
    </div>
  );
};
