import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  KeyRound,
  Users,
  UserCheck,
  X,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { api } from '../../services/api';
import logoUtd from '../../Logo UTD.png';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const location = useLocation();

  // Dynamic Badges
  const [tentativeCount, setTentativeCount] = useState<number>(0);
  const [myDutiesCount, setMyDutiesCount] = useState<number>(0);

  // Accordion collapsible groups state
  const isDocActive =
    location.pathname.startsWith('/print') || location.pathname.startsWith('/letters');
  const isAdminActive = location.pathname.startsWith('/admin');

  const [isDocGroupOpen, setIsDocGroupOpen] = useState<boolean>(isDocActive);
  const [isAdminGroupOpen, setIsAdminGroupOpen] = useState<boolean>(isAdminActive);

  // Sync accordion expansion when navigating
  useEffect(() => {
    if (isDocActive) setIsDocGroupOpen(true);
    if (isAdminActive) setIsAdminGroupOpen(true);
  }, [isDocActive, isAdminActive]);

  // Load live counts for badges
  useEffect(() => {
    async function loadBadges() {
      try {
        const [tentRes, myRes]: [any, any] = await Promise.all([
          api.get('/events/tentative').catch(() => ({ success: false })),
          user
            ? api.get(`/events?officerUserId=${user.id}`).catch(() => ({ success: false }))
            : Promise.resolve({ success: false }),
        ]);

        if (tentRes.success && Array.isArray(tentRes.data)) {
          setTentativeCount(tentRes.data.length);
        }

        if (myRes.success && Array.isArray(myRes.data)) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcoming = myRes.data.filter((e: any) => {
            if (e.status === 'COMPLETED' || e.status === 'CANCELLED') return false;
            if (!e.event_date) return true;
            const d = new Date(e.event_date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() >= today.getTime();
          });
          setMyDutiesCount(upcoming.length);
        }
      } catch (err) {
        console.error('Failed to load sidebar badges:', err);
      }
    }
    loadBadges();
  }, [user, location.pathname]);

  // Group 1: Agenda Utama (Fokus Harian)
  const mainAgendaItems: NavItemConfig[] = [
    {
      to: '/weekly',
      label: 'Jadwal Minggu Ini',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      to: '/calendar',
      label: 'Kalender Kampus',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      to: '/my-duties',
      label: 'Jadwal Tugas Saya',
      icon: <UserCheck className="w-5 h-5" />,
      badge: myDutiesCount > 0 ? myDutiesCount : undefined,
      badgeColor: 'bg-purple-500 text-white',
    },
  ];

  // Group 2: Kegiatan & Berkas
  const eventItems: NavItemConfig[] = [
    {
      to: '/events',
      label: 'Semua Kegiatan',
      icon: <ListFilter className="w-5 h-5" />,
    },
    {
      to: '/tentative',
      label: 'Kegiatan Tentatif',
      icon: <HelpCircle className="w-5 h-5" />,
      badge: tentativeCount > 0 ? tentativeCount : undefined,
      badgeColor: 'bg-amber-400 text-slate-900',
    },
    {
      to: '/archive',
      label: 'Arsip & Berkas',
      icon: <Archive className="w-5 h-5" />,
    },
  ];

  // Group 3: Dokumen & Cetak (Sub-items)
  const docSubItems: NavItemConfig[] = [
    {
      to: '/print',
      label: 'Cetak Jadwal',
      icon: <Printer className="w-4 h-4" />,
    },
    {
      to: '/letters',
      label: 'Template Surat',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  // Group 4: Admin Panel (Sub-items)
  const adminSubItems: NavItemConfig[] = [
    {
      to: '/admin/users',
      label: 'Pengguna',
      icon: <Users className="w-4 h-4" />,
    },
    {
      to: '/admin/categories',
      label: 'Kategori Kegiatan',
      icon: <Tags className="w-4 h-4" />,
    },
    {
      to: '/admin/locations',
      label: 'Lokasi & Ruangan',
      icon: <MapPin className="w-4 h-4" />,
    },
  ];

  const renderSingleNavItem = (item: NavItemConfig, isSubItem: boolean = false) => {
    const isActive =
      location.pathname === item.to ||
      (item.to !== '/weekly' && location.pathname.startsWith(`${item.to}/`));

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onClose}
        title={isCollapsed ? item.label : undefined}
        className={`group relative flex items-center transition-all duration-200 cursor-pointer select-none rounded-xl ${
          isCollapsed
            ? 'justify-center w-12 h-12 mx-auto my-1'
            : isSubItem
            ? 'gap-2.5 px-3 py-2 text-xs font-semibold'
            : 'gap-3 px-3.5 py-2.5 text-sm font-semibold'
        } ${
          isActive
            ? 'text-white font-bold'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
      >
        {/* Active Pill with Spring Animation */}
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-950/40 ${
              isCollapsed
                ? 'ring-2 ring-sky-300/60'
                : 'border-l-4 border-sky-300'
            }`}
          />
        )}

        {/* Icon with Micro-Interaction */}
        <motion.span
          whileHover={{ x: isCollapsed ? 0 : 2, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="relative z-10 flex items-center justify-center flex-shrink-0"
        >
          {item.icon}
        </motion.span>

        {/* Text Label & Badge (when expanded) */}
        {!isCollapsed && (
          <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
            <span className="truncate leading-tight">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`ml-2 px-1.5 py-0.5 text-[10px] font-black rounded-full shadow-xs leading-none ${
                  item.badgeColor || 'bg-blue-500 text-white'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}

        {/* Animated Tooltip on Hover (When Collapsed) */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none border border-slate-700/80 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 flex items-center gap-2">
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                  item.badgeColor || 'bg-blue-500 text-white'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Main Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 utd-navy-gradient border-r border-utd-navy-700 shadow-2xl flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20' : 'w-64'} no-print`}
      >
        {/* Top Header & Brand */}
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className={`p-3.5 flex items-center justify-between bg-utd-navy-900/80 ${
              isCollapsed ? 'flex-col gap-2' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md p-1.5 border border-white/80 flex-shrink-0">
                <img
                  src={logoUtd}
                  alt="Logo UTD"
                  className="w-full h-full object-contain"
                />
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight truncate">
                    Jadwal Kampus UTD
                  </h1>
                  <p className="text-[10px] text-blue-200/80 font-medium truncate mt-0.5">
                    Sistem Terpadu Kegiatan
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button */}
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title={isCollapsed ? 'Buka Menu Lengkap' : 'Ciutkan Menu (Mini Sidebar)'}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4 text-sky-300" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup Menu"
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* UTD Identity Strip Accent */}
          <div className="utd-brand-bar" />

          {/* Scrollable Navigation Area */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1 no-scrollbar">
            {/* GROUP 1: AGENDA UTAMA */}
            <div>
              {!isCollapsed ? (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 px-3 mb-1.5">
                  Agenda Utama
                </div>
              ) : (
                <div className="w-8 h-[1px] bg-white/10 mx-auto my-2" />
              )}
              <nav className="space-y-1">
                {mainAgendaItems.map((item) => renderSingleNavItem(item))}
              </nav>
            </div>

            {/* GROUP 2: KEGIATAN & BERKAS */}
            <div>
              {!isCollapsed ? (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 px-3 mb-1.5">
                  Kegiatan &amp; Arsip
                </div>
              ) : (
                <div className="w-8 h-[1px] bg-white/10 mx-auto my-2" />
              )}
              <nav className="space-y-1">
                {eventItems.map((item) => renderSingleNavItem(item))}
              </nav>
            </div>

            {/* GROUP 3: DOKUMEN & CETAK (COLLAPSIBLE ACCORDION) */}
            <div>
              {!isCollapsed ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsDocGroupOpen(!isDocGroupOpen)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors rounded-lg cursor-pointer ${
                      isDocActive
                        ? 'text-sky-300'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Cetak &amp; Dokumen</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isDocGroupOpen ? 'rotate-180 text-sky-300' : 'text-slate-500'
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isDocGroupOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden pl-1 space-y-1"
                      >
                        {docSubItems.map((item) => renderSingleNavItem(item, true))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <div className="w-8 h-[1px] bg-white/10 mx-auto my-2" />
                  <nav className="space-y-1">
                    {docSubItems.map((item) => renderSingleNavItem(item))}
                  </nav>
                </>
              )}
            </div>

            {/* GROUP 4: ADMIN PANEL (KHUSUS ADMIN - COLLAPSIBLE) */}
            {isAdmin && (
              <div>
                {!isCollapsed ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setIsAdminGroupOpen(!isAdminGroupOpen)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors rounded-lg cursor-pointer ${
                        isAdminActive
                          ? 'text-rose-300'
                          : 'text-rose-400/90 hover:text-rose-200 hover:bg-rose-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Kelola Master</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isAdminGroupOpen ? 'rotate-180 text-rose-300' : 'text-rose-400/60'
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isAdminGroupOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden pl-1 space-y-1"
                        >
                          {adminSubItems.map((item) => renderSingleNavItem(item, true))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-[1px] bg-rose-500/20 mx-auto my-2" />
                    <nav className="space-y-1">
                      {adminSubItems.map((item) => renderSingleNavItem(item))}
                    </nav>
                  </>
                )}
              </div>
            )}

            {/* GROUP 5: PANDUAN */}
            <div>
              {!isCollapsed && (
                <div className="w-full h-[1px] bg-white/5 my-2" />
              )}
              {renderSingleNavItem({
                to: '/guide',
                label: 'Panduan Fitur',
                icon: <BookOpen className="w-5 h-5 text-sky-300" />,
              })}
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-[#112B58] bg-[#050E1F]/90">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                  {/* Status dot */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#050E1F]" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || 'Pengguna'}
                  </p>
                  <span
                    className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                      isAdmin
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Ubah Kata Sandi"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  title="Keluar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative group cursor-pointer"
                title={`${user?.name || 'Pengguna'} (${isAdmin ? 'Admin' : 'Staff'})`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#050E1F]" />
              </div>

              <button
                type="button"
                onClick={logout}
                title="Keluar Sistem"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
