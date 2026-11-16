import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Database,
  Download,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface UserItem {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
  _count?: {
    events_created: number;
    letters_created: number;
  };
}

interface OutletContextType {
  onToggleSidebar: () => void;
}

export const ManageUsersPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit / Reset Password Modal State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Backup State
  const [isDownloadingBackup, setIsDownloadingBackup] = useState<boolean>(false);

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await api.download('/backup/download', `backup-jadwal-kampus-utd-${dateStr}.json`);
      success(
        'Berkas cadangan database (.JSON) berhasil diunduh. Simpan berkas ini di tempat aman.',
        'Pencadangan Berhasil'
      );
    } catch (err: any) {
      console.error('Download backup error:', err);
      toastError(err.message || 'Gagal mengunduh cadangan database.', 'Gagal Backup');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/users');
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      toastError(err.message || 'Gagal mengambil daftar pengguna.');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#@';
    let res = 'UTD';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleOpenCreateModal = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('USER');
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      toastError('Nama, username, dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      toastError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSaving(true);
    try {
      const res: any = await api.post('/users', {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        role,
      });

      if (res.success) {
        success(res.message || 'Akun pengguna baru berhasil dibuat!');
        setIsCreateModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal membuat pengguna.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (target: UserItem) => {
    setEditingUser(target);
    setEditName(target.name);
    setEditRole(target.role);
    setResetPassword('');
    setShowResetPassword(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toastError('Nama lengkap wajib diisi.');
      return;
    }

    if (resetPassword && resetPassword.trim().length < 6) {
      toastError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: any = {
        name: editName.trim(),
        role: editRole,
      };
      if (resetPassword.trim()) {
        payload.newPassword = resetPassword.trim();
      }

      const res: any = await api.put(`/users/${editingUser.id}`, payload);
      if (res.success) {
        success(res.message || 'Data pengguna berhasil diperbarui!');
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memperbarui pengguna.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res: any = await api.delete(`/users/${deleteTarget.id}`);
      if (res.success) {
        success(res.message || 'Pengguna berhasil dihapus.');
        setDeleteTarget(null);
        fetchUsers();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const staffCount = users.filter((u) => u.role === 'USER').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Kelola Pengguna & Staf"
        subtitle="Buat akun untuk staf kampus atau sesama administrator"
        onToggleSidebar={onToggleSidebar}
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Buat Akun Baru
          </Button>
        }
      />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-clay border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Akun Terdaftar
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{users.length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-clay border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Staf Kampus (Staff)
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{staffCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-clay border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administrator
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{adminCount}</h3>
            </div>
          </div>
        </div>

        {/* Database Backup & Security Card */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-clay p-4 sm:p-5 border border-blue-400/30 shadow-clay-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 flex-shrink-0 shadow-inner">
              <Database className="w-5 h-5 text-sky-300" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Cadangan Database Kampus (Backup Snapshot)
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Unduh seluruh data jadwal, kegiatan, kategori, ruangan, dan akun staf ke dalam format JSON lokal. Berkas ini dapat digunakan untuk pemulihan data (restore) sewaktu-waktu.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadBackup}
            isLoading={isDownloadingBackup}
            leftIcon={<Download className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold flex-shrink-0 cursor-pointer shadow-md"
          >
            {isDownloadingBackup ? 'Menyiapkan...' : 'Unduh Backup (.JSON)'}
          </Button>
        </div>

        {/* User Table List */}
        <div className="bg-white rounded-clay border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Pengguna Sistem</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staf dapat melihat dan mencetak jadwal, sedangkan Admin memiliki hak mengedit & mengelola kegiatan.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Tambah Staf
            </Button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat data pengguna...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum ada akun pengguna.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Hak Akses (Role)</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">Terdaftar Sejak</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((item) => {
                      const isSelf = currentUser?.username === item.username;
                      const dateFormatted = new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {item.name ? item.name[0].toUpperCase() : 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md">
                                      Akun Anda
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-500 font-mono sm:hidden">
                                  @{item.username}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                            @{item.username}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                item.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              {item.role === 'ADMIN' ? (
                                <>
                                  <Shield className="w-3.5 h-3.5" />
                                  <span>Administrator</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Staf Kampus</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-500 hidden md:table-cell">
                            {dateFormatted}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Ubah Nama & Reset Sandi"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {!isSelf ? (
                                <button
                                  onClick={() => setDeleteTarget(item)}
                                  title="Hapus Akun Pengguna"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span
                                  className="p-1.5 text-slate-300 cursor-not-allowed"
                                  title="Anda tidak dapat menghapus akun Anda sendiri"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (md:hidden) */}
              <div className="md:hidden divide-y divide-slate-100">
                {users.map((item) => {
                  const isSelf = currentUser?.username === item.username;
                  const dateFormatted = new Date(item.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {item.name ? item.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                              <span>{item.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              @{item.username}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
                            item.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {item.role === 'ADMIN' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              <span>Admin</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Staff</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                        <span className="text-[11px]">Terdaftar: {dateFormatted}</span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs active:scale-95 transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            <span>Kelola</span>
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs active:scale-95 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal 1: Buat Akun Pengguna Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSaving && setIsCreateModalOpen(false)}
        title="Buat Akun Staf / Pengguna Baru"
        description="Buat akun baru agar staf dapat login dan mengakses jadwal kegiatan kampus."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="create-user-form"
              isLoading={isSaving}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Simpan & Buat Akun
            </Button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Staf <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bpk. Ahmad Fauzi, M.Kom."
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username Login <span className="text-rose-500">*</span>
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="Contoh: ahmad.fauzi (tanpa spasi)"
              required
              disabled={isSaving}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Digunakan staf untuk masuk ke sistem jadwal.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Kata Sandi Awal <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Acak Sandi</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isSaving}
                className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Hak Akses (Role)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-clay-sm border cursor-pointer transition-all ${
                  role === 'USER'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="USER"
                  checked={role === 'USER'}
                  onChange={() => setRole('USER')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Staf Kampus</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Bisa menambah, mengubah, mencetak jadwal & upload berkas (tanpa akses hapus).
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-clay-sm border cursor-pointer transition-all ${
                  role === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50/50 text-purple-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={role === 'ADMIN'}
                  onChange={() => setRole('ADMIN')}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Administrator</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Akses penuh untuk menambah, mengedit, menghapus kegiatan, dan kelola staf.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Akun & Reset Kata Sandi */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => !isUpdating && setEditingUser(null)}
          title={`Ubah Akun: @${editingUser.username}`}
          description="Perbarui nama tampilan, role, atau reset kata sandi staf jika lupa."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={isUpdating}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="edit-user-form"
                isLoading={isUpdating}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Simpan Perubahan
              </Button>
            </div>
          }
        >
          <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={isUpdating}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reset Kata Sandi Baru (Opsional)
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mereset password"
                  disabled={isUpdating}
                  className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Isi hanya jika staf meminta penggantian kata sandi karena lupa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Hak Akses (Role)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-clay-sm border cursor-pointer transition-all ${
                    editRole === 'USER'
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="editRole"
                    value="USER"
                    checked={editRole === 'USER'}
                    onChange={() => setEditRole('USER')}
                    disabled={currentUser?.username === editingUser.username}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Staf Kampus</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Tambah, ubah & cetak jadwal (tanpa hapus).
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-clay-sm border cursor-pointer transition-all ${
                    editRole === 'ADMIN'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="editRole"
                    value="ADMIN"
                    checked={editRole === 'ADMIN'}
                    onChange={() => setEditRole('ADMIN')}
                     className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Administrator</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Akses penuh manajemen jadwal & staf.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun @${deleteTarget?.username} (${deleteTarget?.name})? Akun ini tidak akan bisa login lagi, namun seluruh jadwal kegiatan yang pernah dibuat tetap tersimpan aman.`}
        confirmText="Hapus Akun"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
