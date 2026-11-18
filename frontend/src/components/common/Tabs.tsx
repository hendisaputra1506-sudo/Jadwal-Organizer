import React, { useId } from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  const layoutGroupId = useId();

  return (
    <div
      className={`inline-flex max-w-full overflow-x-auto no-scrollbar bg-slate-200/75 p-1.5 rounded-clay-sm shadow-clay-inset gap-0.5 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative inline-flex flex-shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              isActive ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`tab-pill-${layoutGroupId}`}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 bg-white rounded-xl shadow-clay-sm"
              />
            )}
            {tab.icon && <span className="relative z-10">{tab.icon}</span>}
            <span className="relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/80 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
