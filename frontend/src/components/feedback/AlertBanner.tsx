import React from 'react';
import { AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react';

export interface AlertBannerProps {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  actionText,
  onAction,
  className = '',
}) => {
  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          container: 'bg-rose-50/90 border-rose-200 text-rose-950',
          icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
          action: 'text-rose-700 hover:text-rose-900',
        };
      case 'warning':
        return {
          container: 'bg-amber-50/90 border-amber-200 text-amber-950',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
          action: 'text-amber-800 hover:text-amber-950',
        };
      default:
        return {
          container: 'bg-blue-50/90 border-blue-200 text-blue-950',
          icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
          action: 'text-blue-700 hover:text-blue-900',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-clay-sm border shadow-clay-sm text-sm gap-3 ${style.container} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {style.icon}
        <div>
          <span className="font-semibold">{title}</span>
          {message && <span className="ml-1 text-xs opacity-90 text-slate-700">{message}</span>}
        </div>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className={`text-xs font-bold underline cursor-pointer flex-shrink-0 ${style.action}`}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
