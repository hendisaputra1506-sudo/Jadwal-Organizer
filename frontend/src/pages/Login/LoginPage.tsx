import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import logoUtd from '../../Logo UTD.png';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(username, password);
      success('Selamat datang kembali di Jadwal Kampus', 'Login Berhasil');
      navigate('/weekly');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login. Silakan periksa kembali akun Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1E36] via-[#1E3A8A] to-[#2563EB] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Ambient Soft Blue Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-400/25 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* App Branding */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-clay bg-white p-2.5 sm:p-3.5 shadow-2xl mb-3 sm:mb-4 border-2 border-white/80">
            <img src={logoUtd} alt="Logo UTD" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Jadwal Kegiatan Kampus UTD
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-1 font-medium">
            Universitas Teknologi Digital &bull; Sistem Terpadu Jadwal Bersama
          </p>
        </div>

        {/* Login Clay Card with UTD Brand Bar */}
        <div className="bg-white rounded-clay-lg overflow-hidden shadow-2xl border border-white/90">
          <div className="utd-brand-bar" />
          <div className="p-5 sm:p-8">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mb-5 sm:mb-6">
              Gunakan akun staff atau admin untuk mengakses jadwal bersama UTD.
            </p>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-clay-sm bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<UserIcon className="w-4 h-4" />}
              required
              autoFocus
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Masuk
              </Button>
            </div>
          </form>

          {/* Development Seed Information Notice */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Pengembangan internal: Akun default pengujian tercantum pada dokumentasi development.
            </p>
          </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-blue-200/60 mt-6">
          Sistem Jadwal Kegiatan Kampus UTD &copy; 2026
        </p>
      </div>
    </div>
  );
};
