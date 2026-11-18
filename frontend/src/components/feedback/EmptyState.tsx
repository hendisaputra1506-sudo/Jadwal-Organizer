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
      className={`relative overflow-hidden flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-white/80 bg-dot-grid-light border border-dashed border-blue-200/90 rounded-clay my-4 animate-card-reveal ${className}`}
    >
      {/* Floating Animated Icon + Twinkling Sparkles SVG */}
      <div className="relative mb-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 120 120"
          className="w-24 h-24 absolute -top-4 -left-4 pointer-events-none"
        >
          <circle cx="60" cy="60" r="44" fill="rgba(59, 130, 246, 0.06)" />
          <path
            d="M22 28 L25 22 L28 28 L34 31 L28 34 L25 40 L22 34 L16 31 Z"
            fill="#60A5FA"
            className="animate-twinkle"
          />
          <path
            d="M95 22 L97 18 L99 22 L103 24 L99 26 L97 30 L95 26 L91 24 Z"
            fill="#38BDF8"
            className="animate-twinkle-delay"
          />
          <circle cx="96" cy="88" r="3.5" fill="#93C5FD" className="animate-twinkle" />
        </svg>

        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 flex items-center justify-center shadow-clay-card animate-subtle-bob">
          {icon || getDefaultIcon()}
        </div>
      </div>

      <h4 className="text-base font-bold text-slate-800 mb-1 relative z-10">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed relative z-10">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <div className="relative z-10">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
