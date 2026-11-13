import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

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
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="utd-brand-bar" />
      <div className="px-3.5 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4">
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

        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
          {isAdmin && !action && (
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
  );
};
