import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 4.5s
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none no-print">
        {toasts.map((toast) => {
          const getIcon = () => {
            switch (toast.type) {
              case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
              case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
              case 'error':
                return <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
              default:
                return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
            }
          };

          const getBgStyle = () => {
            switch (toast.type) {
              case 'success':
                return 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-clay-sm';
              case 'warning':
                return 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-clay-sm';
              case 'error':
                return 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-clay-sm';
              default:
                return 'bg-blue-50/95 border-blue-200 text-blue-950 shadow-clay-sm';
            }
          };

          const getProgressColor = () => {
            switch (toast.type) {
              case 'success':
                return 'bg-emerald-500';
              case 'warning':
                return 'bg-amber-500';
              case 'error':
                return 'bg-rose-500';
              default:
                return 'bg-blue-500';
            }
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-clay border backdrop-blur-md animate-toast-in ${getBgStyle()}`}
            >
              <div className="mt-0.5">{getIcon()}</div>
              <div className="flex-1 text-sm">
                {toast.title && <div className="font-semibold">{toast.title}</div>}
                <div className="text-slate-700 leading-snug">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-60 animate-toast-progress ${getProgressColor()}`}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
