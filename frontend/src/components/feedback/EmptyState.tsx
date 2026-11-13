import React from 'react';
import { CalendarX, SearchX, Inbox } from 'lucide-react';
import { Button } from '../common/Button';

export interface EmptyStateProps {
  type?: 'calendar' | 'search' | 'default';
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  actionText,
  onAction,
  icon,
  className = '',
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'calendar':
        return <CalendarX className="w-8 h-8 text-slate-400" />;
      case 'search':
        return <SearchX className="w-8 h-8 text-slate-400" />;
      default:
        return <Inbox className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white/60 border border-dashed border-slate-300 rounded-clay my-4 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shadow-clay-sm mb-3">
        {icon || getDefaultIcon()}
      </div>
      <h4 className="text-base font-semibold text-slate-800 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">{description}</p>
      )}
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
