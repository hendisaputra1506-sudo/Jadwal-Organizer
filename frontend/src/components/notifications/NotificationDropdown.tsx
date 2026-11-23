import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem } from '../../types/index';
import { useAuth } from '../../context/AuthContext';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res: any = await api.get('/notifications');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Auto-poll notifications every 45 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);
    if (notif.event_id) {
      navigate(`/events/${notif.event_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ASSIGNED':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case 'REMINDER_TODAY':
        return <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />;
      case 'REMINDER_H1':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatRelativeTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffMin < 1) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} menit lalu`;
      if (diffHour < 24) return `${diffHour} jam lalu`;
      if (diffDays === 1) return 'Kemarin';
      return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifikasi Penugasan"
        className="relative p-2 sm:px-3 sm:py-1.5 rounded-clay-sm bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
      >
        <Bell className="w-4 h-4 text-slate-500 group-hover:text-purple-600" />
        <span className="hidden xl:inline">Notifikasi</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-clay border border-slate-200 shadow-clay-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Popover */}
          <div className="p-3 sm:p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Notifikasi Tugas</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Baca semua</span>
              </button>
            )}
          </div>

          {/* List Notifications */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5 px-4">
                <Bell className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
                <p className="text-xs font-semibold text-slate-600">Belum ada notifikasi tugas</p>
                <p className="text-[11px] text-slate-400">
                  Saat Anda di-tag pada suatu kegiatan atau ada jadwal tugas, pemberitahuan akan tampil di sini.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                    !notif.is_read ? 'bg-purple-50/40' : 'bg-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      !notif.is_read
                        ? 'bg-purple-100 border border-purple-200'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p
                        className={`text-xs leading-snug line-clamp-1 ${
                          !notif.is_read
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                      <span>{formatRelativeTime(notif.created_at)}</span>
                      {notif.event_id && (
                        <span className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-0.5">
                          Lihat Detail <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Popover */}
          <div className="p-2 sm:p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/my-duties');
              }}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>Buka Seluruh Jadwal Tugas Saya</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
