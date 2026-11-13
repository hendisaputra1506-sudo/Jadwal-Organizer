import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all">
        <main className="flex-1">
          <Outlet context={{ onToggleSidebar: () => setSidebarOpen((prev) => !prev) }} />
        </main>
      </div>
    </div>
  );
};
