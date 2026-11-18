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
        return <CalendarX className="w-8 h-8 text-blue-500" />;
      case 'search':
        return <SearchX className="w-8 h-8 text-blue-500" />;
      default:
        return <Inbox className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-white/80 border border-dashed border-blue-200/90 rounded-clay my-4 animate-card-reveal ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 flex items-center justify-center shadow-clay-sm mb-3">
        {icon || getDefaultIcon()}
      </div>

      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
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
