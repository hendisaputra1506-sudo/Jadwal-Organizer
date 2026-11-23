import React, { useState } from 'react';
import { Menu, Plus, KeyRound, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  subtitle,
  action,
}) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const openGlobalSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-search'));
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
        <div className="utd-brand-bar" />
        <div className="px-3.5 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              aria-label="Buka Menu"
              className="lg:hidden p-2 rounded-clay-sm bg-white border border-slate-200 shadow-clay-sm text-slate-700 hover:text-slate-900 active:scale-95 transition-transform flex-shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] sm:text-sm text-slate-500 truncate font-normal mt-0.5 leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Global Command Search Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={openGlobalSearch}
              title="Pencarian Kilat Jadwal & Sekolah (Ctrl+K)"
              className="group p-2 sm:px-3 sm:py-1.5 rounded-clay-sm bg-slate-50 hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 text-slate-500 hover:text-blue-700 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2 text-xs font-medium"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="hidden md:inline text-slate-500 group-hover:text-blue-700">
                Cari cepat...
              </span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 group-hover:text-blue-600 bg-white border border-slate-200 group-hover:border-blue-200 rounded">
                Ctrl K
              </kbd>
            </button>

            {action}

            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Quick Change Password Button */}
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              title="Ubah Kata Sandi Akun"
              className="group p-2 sm:px-3 sm:py-1.5 rounded-clay-sm bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="hidden xl:inline">Ganti Sandi</span>
            </button>

            {!action && (
              <Link to="/events/new">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Tambah Kegiatan</span>
                  <span className="sm:hidden">Tambah</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
