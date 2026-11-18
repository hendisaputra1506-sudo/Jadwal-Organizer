import React from 'react';

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
  return (
    <div className={`inline-flex max-w-full overflow-x-auto no-scrollbar bg-slate-200/70 p-1.5 rounded-clay-sm shadow-clay-inset ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex flex-shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-white text-blue-700 shadow-clay-sm font-bold scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'
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
