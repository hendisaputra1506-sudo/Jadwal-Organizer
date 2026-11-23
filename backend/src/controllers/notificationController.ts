import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Mengambil daftar notifikasi untuk pengguna yang sedang login.
 * Sekaligus secara otomatis memeriksa dan membuat pengingat tugas H-1 dan Hari H jika belum ada.
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    // Auto-generate H-1 and Hari H duty reminders for this user
    try {
      const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const todayStr = nowWib.toISOString().split('T')[0];
      const tomorrowWib = new Date(Date.now() + (24 + 7) * 60 * 60 * 1000);
      const tomorrowStr = tomorrowWib.toISOString().split('T')[0];

      const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
      const endOfTomorrow = new Date(`${tomorrowStr}T23:59:59.999Z`);

      const upcomingDuties = await prisma.event.findMany({
        where: {
          is_deleted: false,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
          officers: { some: { user_id: userId } },
          date_precision: 'EXACT',
          event_date: {
            gte: startOfToday,
            lte: endOfTomorrow,
          },
        },
        include: {
          officers: { where: { user_id: userId } },
        },
      });

      for (const ev of upcomingDuties) {
        if (!ev.event_date) continue;
        const evDateStr = ev.event_date.toISOString().split('T')[0];
        const userOfficer = ev.officers[0];
        const roleText = userOfficer?.role ? ` sebagai ${userOfficer.role}` : '';

        if (evDateStr === todayStr) {
          // Check if REMINDER_TODAY notification already exists
          const exists = await prisma.notification.findFirst({
            where: {
              user_id: userId,
              event_id: ev.id,
              type: 'REMINDER_TODAY',
            },
          });
          if (!exists) {
            const timeText = ev.is_all_day ? 'sepanjang hari' : ev.start_time ? `pukul ${ev.start_time} WIB` : '';
            await prisma.notification.create({
              data: {
                user_id: userId,
                event_id: ev.id,
                title: 'Pengingat Tugas Hari Ini',
                message: `Hari ini Anda memiliki jadwal tugas pada agenda "${ev.name}"${roleText}${timeText ? ` (${timeText})` : ''}.`,
                type: 'REMINDER_TODAY',
              },
            });
          }
        } else if (evDateStr === tomorrowStr) {
          // Check if REMINDER_H1 notification already exists
          const exists = await prisma.notification.findFirst({
            where: {
              user_id: userId,
              event_id: ev.id,
              type: 'REMINDER_H1',
            },
          });
          if (!exists) {
            await prisma.notification.create({
              data: {
                user_id: userId,
                event_id: ev.id,
                title: 'Pengingat Tugas Besok (H-1)',
                message: `Besok Anda memiliki jadwal tugas pada agenda "${ev.name}"${roleText}.`,
                type: 'REMINDER_H1',
              },
            });
          }
        }
      }
    } catch (reminderErr) {
      console.error('Error generating duty reminders:', reminderErr);
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 30,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              event_date: true,
              start_time: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('Error on getNotifications:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil notifikasi.' });
  }
}

/**
 * Menandai satu notifikasi sebagai telah dibaca.
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true },
    });

    res.json({ success: true, message: 'Notifikasi ditandai telah dibaca.' });
  } catch (error: any) {
    console.error('Error on markAsRead:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui notifikasi.' });
  }
}

/**
 * Menandai semua notifikasi pengguna sebagai telah dibaca.
 */
export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    res.json({ success: true, message: 'Semua notifikasi telah ditandai dibaca.' });
  } catch (error: any) {
    console.error('Error on markAllAsRead:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui notifikasi.' });
  }
}
