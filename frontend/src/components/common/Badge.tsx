import React from 'react';
import { EventStatus, DatePrecision, ConflictLevel } from '../../types/index';
import { AlertTriangle, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface CategoryBadgeProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name,
  color = '#3B82F6',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      style={{
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}30`,
      }}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${sizeClasses}`}
    >
      <span
        style={{ backgroundColor: color }}
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      />
      <span className="truncate">{name}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: EventStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shadow-sm ${sizeClasses}`}
        >
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Terjadwal
        </span>
      );
    case 'WAITING_CONFIRMATION':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-full shadow-sm ${sizeClasses}`}
        >
          <Clock className="w-3 h-3 text-amber-600" />
          Menunggu Konfirmasi
        </span>
      );
    case 'DRAFT':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-full shadow-sm ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Tentatif
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full shadow-sm ${sizeClasses}`}
        >
          <CheckCircle className="w-3 h-3 text-blue-600" />
          Selesai
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-full shadow-sm ${sizeClasses}`}
        >
          <XCircle className="w-3 h-3 text-rose-600" />
          Dibatalkan
        </span>
      );
    default:
      return null;
  }
};

interface PrecisionBadgeProps {
  precision: DatePrecision;
  size?: 'sm' | 'md';
}

export const PrecisionBadge: React.FC<PrecisionBadgeProps> = ({ precision, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (precision) {
    case 'EXACT':
      return (
        <span className={`inline-flex items-center font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-full ${sizeClasses}`}>
          Tanggal Pasti
        </span>
      );
    case 'CANDIDATES':
      return (
        <span className={`inline-flex items-center font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full ${sizeClasses}`}>
          Kandidat Tanggal
        </span>
      );
    case 'WEEK':
      return (
        <span className={`inline-flex items-center font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-full ${sizeClasses}`}>
          Perkiraan Minggu
        </span>
      );
    case 'MONTH':
      return (
        <span className={`inline-flex items-center font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full ${sizeClasses}`}>
          Perkiraan Bulan
        </span>
      );
    case 'UNKNOWN':
      return (
        <span className={`inline-flex items-center font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-full ${sizeClasses}`}>
          Belum Tahu
        </span>
      );
    default:
      return null;
  }
};

interface ConflictBadgeProps {
  level: ConflictLevel;
  size?: 'sm' | 'md';
}

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({ level, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  if (level === 'DEFINITE') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-full shadow-sm animate-pulse ${sizeClasses}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
        Konflik Pasti
      </span>
    );
  }

  if (level === 'POTENTIAL') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold bg-amber-100 text-amber-800 border border-amber-300 rounded-full shadow-sm ${sizeClasses}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        Potensi Konflik
      </span>
    );
  }

  return null;
};
