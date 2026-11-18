import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandSearchModal } from '../common/CommandSearchModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setSearchOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-search', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-search', handleCustomOpen);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area with smooth page transition */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all">
        <main key={location.pathname} className="flex-1 animate-page-enter">
          <Outlet
            context={{
              onToggleSidebar: () => setSidebarOpen((prev) => !prev),
              onOpenSearch: () => setSearchOpen(true),
            }}
          />
        </main>
      </div>

      {/* Global Command Search Palette (Ctrl+K) */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
