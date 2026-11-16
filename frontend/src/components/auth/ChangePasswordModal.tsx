import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setFormError(null);
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentPassword) {
      setFormError('Kata sandi saat ini wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (currentPassword === newPassword) {
      setFormError('Kata sandi baru harus berbeda dari kata sandi lama.');
      return;
    }

    setIsLoading(true);

    try {
      const res: any = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        success(
          res.message || 'Kata sandi berhasil diperbarui. Silakan gunakan kata sandi baru untuk login berikutnya.',
          'Sukses'
        );
        handleClose();
      } else {
        setFormError(res.message || 'Gagal mengubah kata sandi.');
      }
    } catch (err: any) {
      console.error('Error changing password:', err);
      const msg = err.message || 'Terjadi kesalahan saat menghubungi server.';
      setFormError(msg);
      toastError(msg, 'Gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ubah Kata Sandi Akun"
      description="Perbarui kata sandi akun Anda untuk meningkatkan keamanan akses jadwal kampus."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            isLoading={isLoading}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            Simpan Kata Sandi
          </Button>
        </div>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* User Info Card */}
        <div className="flex items-center gap-3 p-3 rounded-clay-sm bg-slate-50 border border-slate-200">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Pengguna'}</p>
            <p className="text-xs text-slate-500 font-mono">
              Username: <span className="font-semibold text-slate-700">{user?.username}</span> • Role:{' '}
              <span className="font-semibold text-blue-600">{user?.role}</span>
            </p>
          </div>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="p-3 rounded-clay-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{formError}</span>
          </div>
        )}

        {/* Current Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kata Sandi Saat Ini <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan kata sandi lama Anda"
              disabled={isLoading}
              className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              tabIndex={-1}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kata Sandi Baru <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              disabled={isLoading}
              className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword && newPassword.length < 6 && (
            <p className="text-[11px] text-amber-600 mt-1">Kata sandi harus memiliki minimal 6 karakter.</p>
          )}
        </div>

        {/* Confirm New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ulangi Kata Sandi Baru <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              disabled={isLoading}
              className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-rose-500 mt-1">Konfirmasi kata sandi belum cocok.</p>
          )}
        </div>
      </form>
    </Modal>
  );
};
