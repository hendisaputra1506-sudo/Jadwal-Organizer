import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  Calendar,
  ListFilter,
  HelpCircle,
  Printer,
  FileText,
  Tags,
  MapPin,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoUtd from '../../Logo UTD.png';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    {
      to: '/weekly',
      label: 'Jadwal Minggu Ini',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      to: '/calendar',
      label: 'Kalender',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      to: '/events',
      label: 'Semua Kegiatan',
      icon: <ListFilter className="w-5 h-5" />,
    },
    {
      to: '/tentative',
      label: 'Kegiatan Tentatif',
      icon: <HelpCircle className="w-5 h-5" />,
    },
    {
      to: '/print',
      label: 'Cetak Jadwal',
      icon: <Printer className="w-5 h-5" />,
    },
    {
      to: '/letters',
      label: 'Template Surat',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const adminNavItems = [
    {
      to: '/admin/categories',
      label: 'Kelola Kategori',
      icon: <Tags className="w-5 h-5" />,
    },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-clay-sm text-sm transition-all duration-150 ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold border-l-4 border-sky-300 shadow-md shadow-blue-950/20 pl-3'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 utd-navy-gradient border-r border-utd-navy-700 shadow-2xl flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Top App Brand */}
        <div>
          <div className="p-4 flex items-center justify-between bg-utd-navy-900/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-clay bg-white flex items-center justify-center shadow-md p-1.5 border border-white/80 flex-shrink-0">
                <img src={logoUtd} alt="Logo UTD" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold text-white tracking-tight leading-tight truncate">
                  Jadwal Kampus UTD
                </h1>
                <p className="text-[11px] text-blue-200/75 font-medium truncate">
                  Sistem Terpadu Kegiatan
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              aria-label="Tutup Menu"
              className="lg:hidden p-1.5 rounded-clay-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* UTD Identity Accent Strip */}
          <div className="utd-brand-bar" />

          {/* Main Navigation */}
          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-190px)]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 mb-2">
                Menu Utama
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={linkClass}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Admin-only Navigation */}
            {isAdmin && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-3.5 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Admin Panel</span>
                </div>
                <nav className="space-y-1">
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={linkClass}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-4 border-t border-[#112B58] bg-[#050E1F]">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#12448F] border border-blue-400/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.name || 'Pengguna'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                      isAdmin
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Keluar"
              className="p-1.5 rounded-clay-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
