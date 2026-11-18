import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { BorderBeam } from '../../components/common/BorderBeam';
import { ParticlesCanvas } from '../../components/common/ParticlesCanvas';
import { Meteors } from '../../components/common/Meteors';
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B172A] via-[#1E3A8A] to-[#2563EB] animate-aurora-bg flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Architectural Dot Grid Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-dot-grid opacity-55 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse at center, black 45%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 45%, transparent 85%)',
        }}
      />

      {/* Interactive Constellation Particles + Shooting Meteors */}
      <ParticlesCanvas count={38} color="186, 230, 253" connectLines={true} />
      <Meteors number={12} />

      {/* Ambient Animated Soft Blue Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-400/30 blur-3xl pointer-events-none animate-ambient" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-400/30 blur-3xl pointer-events-none animate-ambient-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full bg-cyan-400/10 blur-3xl pointer-events-none animate-ambient" />

      <div className="w-full max-w-md relative z-10">
        {/* App Branding */}
        <motion.div
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="text-center mb-5 sm:mb-6"
        >
          <div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-clay bg-white p-2.5 sm:p-3.5 shadow-2xl mb-3 sm:mb-4 border-2 border-white/80 animate-subtle-bob">
            <img src={logoUtd} alt="Logo UTD" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Jadwal Kegiatan Kampus UTD
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/85 mt-1 font-medium">
            Universitas Teknologi Digital &bull; Sistem Terpadu Jadwal Bersama
          </p>
        </motion.div>

        {/* Login Clay Card with Magic Border Beam & UTD Brand Bar */}
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.12 }}
          className="relative bg-white/95 backdrop-blur-md rounded-clay-lg overflow-hidden shadow-2xl border border-white/80"
        >
          <BorderBeam duration={5} colorFrom="#38BDF8" colorTo="#2563EB" borderWidth={3} />
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

          {/* Official Staff Notice */}
          <div className="mt-7 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Hubungi Administrator Kampus apabila lupa kata sandi atau membutuhkan akun staf baru.
            </p>
          </div>
          </div>
        </motion.div>

        {/* Footer Note */}
        <p className="text-center text-xs text-blue-200/60 mt-6">
          Sistem Jadwal Kegiatan Kampus UTD &copy; 2026
        </p>
      </div>
    </div>
  );
};
