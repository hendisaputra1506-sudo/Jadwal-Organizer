import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  isDestructive = true,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isDestructive ? (
            <Trash2 className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>

        <h4 className="text-base font-bold text-slate-900 mb-1">{title}</h4>

        <p className="text-sm text-slate-600 mb-2">{message}</p>

        {itemName && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-clay-sm py-2 px-3 mb-4 text-xs font-semibold text-slate-800 break-words">
            "{itemName}"
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-3 mt-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
