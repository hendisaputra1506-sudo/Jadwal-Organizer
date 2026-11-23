import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import * as eventService from '../services/eventService.js';
import { checkScheduleConflicts } from '../services/conflictService.js';
import { deleteAttachmentFile } from '../services/googleDriveService.js';

export async function getWeekly(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Parameter startDate dan endDate wajib diisi.' });
      return;
    }

    const events = await eventService.getWeeklyEvents(startDate, endDate);
    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('Error on getWeekly:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil jadwal mingguan.' });
  }
}

export async function getMonthly(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const data = await eventService.getMonthlyEvents(year, month);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error on getMonthly:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil kalender bulanan.' });
  }
}

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const filters: eventService.EventFilterQuery = {
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      status: req.query.status as string,
      locationId: req.query.locationId as string,
      datePrecision: req.query.datePrecision as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      month: req.query.month as string,
      isTentativeOnly: req.query.isTentativeOnly === 'true',
      officerUserId: req.query.officerUserId as string,
    };

    const events = await eventService.getAllEvents(filters);
    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('Error on getAll:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar kegiatan.' });
  }
}

export async function getTentative(req: Request, res: Response): Promise<void> {
  try {
    const events = await eventService.getTentativeEvents();
    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('Error on getTentative:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil kegiatan tentatif.' });
  }
}

export async function getArchive(req: Request, res: Response): Promise<void> {
  try {
    const result = await eventService.getArchivedEvents({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 12,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      month: req.query.month as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      docFilter: (req.query.docFilter as any) || 'all',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error on getArchive:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil arsip kegiatan.' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const event = await eventService.getEventById(id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('Error on getById:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail kegiatan.' });
  }
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    const {
      name,
      categoryId,
      status = 'DRAFT',
      datePrecision = 'UNKNOWN',
      estimatedMonth,
      estimatedWeekLabel,
      eventDate,
      startTime,
      endTime,
      isAllDay = false,
      locationId,
      locationName,
      description,
      contactInfo,
      requirementsNotes,
      candidateDates = [],
      officers = [],
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi.' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ success: false, message: 'Kategori kegiatan wajib dipilih.' });
      return;
    }

    const locName = (locationName || req.body.location_name)?.trim() || null;

    // Run conflict check
    const conflictCheck = await checkScheduleConflicts({
      locationId,
      locationName: locName,
      datePrecision,
      eventDate,
      startTime,
      endTime,
      isAllDay,
      candidateDates,
      estimatedMonth,
    });

    // Parse event_date
    let parsedEventDate: Date | null = null;
    if (eventDate && (datePrecision === 'EXACT' || datePrecision === 'CANDIDATES')) {
      parsedEventDate = new Date(`${eventDate}T00:00:00.000Z`);
    }

    const newEvent = await prisma.event.create({
      data: {
        name: name.trim(),
        category_id: categoryId,
        status,
        date_precision: datePrecision,
        estimated_month: estimatedMonth || null,
        estimated_week_label: estimatedWeekLabel || null,
        event_date: parsedEventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        is_all_day: Boolean(isAllDay),
        location_name: locName,
        location_id: locationId || null,
        description: description || null,
        contact_info: contactInfo || null,
        requirements_notes: requirementsNotes || null,
        created_by_id: userId,
        candidate_dates: {
          create: candidateDates.map((cDate: string) => ({
            candidate_date: new Date(`${cDate}T00:00:00.000Z`),
          })),
        },
        officers: {
          create: (officers || [])
            .filter((o: any) => o && o.userId)
            .map((o: any) => ({
              user_id: o.userId,
              role: o.role ? String(o.role).trim() : null,
              notes: o.notes ? String(o.notes).trim() : null,
            })),
        },
      },
      include: {
        category: true,
        location: true,
        candidate_dates: true,
        officers: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });

    // Create notifications for assigned officers
    const validOfficers = (officers || []).filter((o: any) => o && o.userId);
    if (validOfficers.length > 0) {
      const notifs = validOfficers.map((o: any) => ({
        user_id: o.userId,
        event_id: newEvent.id,
        title: 'Penugasan Agenda Baru',
        message: `Anda ditugaskan pada agenda "${newEvent.name}"${o.role ? ` sebagai ${o.role}` : ''}.`,
        type: 'ASSIGNMENT' as const,
      }));
      await prisma.notification.createMany({ data: notifs }).catch((err) =>
        console.error('Failed to create assignment notification:', err)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Kegiatan berhasil disimpan.',
      data: newEvent,
      conflictWarning: conflictCheck.hasConflict ? conflictCheck : null,
    });
  } catch (error: any) {
    console.error('Error on create event:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat kegiatan baru.' });
  }
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const {
      name,
      categoryId,
      status,
      datePrecision,
      estimatedMonth,
      estimatedWeekLabel,
      eventDate,
      startTime,
      endTime,
      isAllDay,
      locationId,
      locationName,
      description,
      contactInfo,
      requirementsNotes,
      candidateDates,
      officers,
    } = req.body;

    const existing = await prisma.event.findUnique({
      where: { id },
      include: { candidate_dates: true, officers: true },
    });

    if (!existing || existing.is_deleted) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const finalLocationName = locationName !== undefined
      ? (locationName?.trim() || null)
      : req.body.location_name !== undefined
      ? (req.body.location_name?.trim() || null)
      : existing.location_name;

    // Run conflict check
    const conflictCheck = await checkScheduleConflicts({
      eventIdToExclude: id,
      locationId: locationId !== undefined ? locationId : existing.location_id,
      locationName: finalLocationName,
      datePrecision: datePrecision ?? existing.date_precision,
      eventDate: eventDate !== undefined ? eventDate : existing.event_date,
      startTime: startTime !== undefined ? startTime : existing.start_time,
      endTime: endTime !== undefined ? endTime : existing.end_time,
      isAllDay: isAllDay !== undefined ? Boolean(isAllDay) : existing.is_all_day,
      candidateDates: candidateDates || existing.candidate_dates.map((c) => c.candidate_date),
      estimatedMonth: estimatedMonth !== undefined ? estimatedMonth : existing.estimated_month,
    });

    let parsedEventDate: Date | null = null;
    if (eventDate) {
      parsedEventDate = new Date(`${eventDate}T00:00:00.000Z`);
    } else if (eventDate === null) {
      parsedEventDate = null;
    } else {
      parsedEventDate = existing.event_date;
    }

    // Handle candidate dates update
    if (Array.isArray(candidateDates)) {
      await prisma.eventCandidateDate.deleteMany({
        where: { event_id: id },
      });
      if (candidateDates.length > 0) {
        await prisma.eventCandidateDate.createMany({
          data: candidateDates.map((cDate: string) => ({
            event_id: id,
            candidate_date: new Date(`${cDate}T00:00:00.000Z`),
          })),
        });
      }
    }

    // Handle officers update & notifications
    const prevUserIds = new Set((existing.officers || []).map((o: any) => o.user_id));
    if (Array.isArray(officers)) {
      await prisma.eventOfficer.deleteMany({
        where: { event_id: id },
      });
      const validOfficers = officers.filter((o: any) => o && o.userId);
      if (validOfficers.length > 0) {
        await prisma.eventOfficer.createMany({
          data: validOfficers.map((o: any) => ({
            event_id: id,
            user_id: o.userId,
            role: o.role ? String(o.role).trim() : null,
            notes: o.notes ? String(o.notes).trim() : null,
          })),
        });
      }

      // Notify newly assigned officers
      const newlyAssigned = validOfficers.filter((o: any) => !prevUserIds.has(o.userId));
      if (newlyAssigned.length > 0) {
        const notifs = newlyAssigned.map((o: any) => ({
          user_id: o.userId,
          event_id: id,
          title: 'Penugasan Agenda',
          message: `Anda ditugaskan pada agenda "${name?.trim() || existing.name}"${o.role ? ` sebagai ${o.role}` : ''}.`,
          type: 'ASSIGNMENT' as const,
        }));
        await prisma.notification.createMany({ data: notifs }).catch((err) =>
          console.error('Failed to create assignment notification:', err)
        );
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        category_id: categoryId || undefined,
        status: status || undefined,
        date_precision: datePrecision || undefined,
        estimated_month: estimatedMonth !== undefined ? estimatedMonth : undefined,
        estimated_week_label: estimatedWeekLabel !== undefined ? estimatedWeekLabel : undefined,
        event_date: parsedEventDate,
        start_time: startTime !== undefined ? startTime : undefined,
        end_time: endTime !== undefined ? endTime : undefined,
        is_all_day: isAllDay !== undefined ? Boolean(isAllDay) : undefined,
        location_name: finalLocationName,
        location_id: locationId !== undefined ? locationId : undefined,
        description: description !== undefined ? description : undefined,
        contact_info: contactInfo !== undefined ? contactInfo : undefined,
        requirements_notes: requirementsNotes !== undefined ? requirementsNotes : undefined,
        updated_by_id: userId,
      },
      include: {
        category: true,
        location: true,
        candidate_dates: true,
        officers: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Perubahan kegiatan berhasil disimpan.',
      data: updated,
      conflictWarning: conflictCheck.hasConflict ? conflictCheck : null,
    });
  } catch (error: any) {
    console.error('Error on update event:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kegiatan.' });
  }
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.event.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    // Ikut bersihkan semua berkas dokumentasi/PDF milik kegiatan ini dari Google Drive
    if (existing.attachments && existing.attachments.length > 0) {
      for (const att of existing.attachments) {
        await deleteAttachmentFile(att.drive_file_id, att.drive_view_url);
      }
      await prisma.eventAttachment.deleteMany({
        where: { event_id: id },
      });
    }

    // Soft delete event
    await prisma.event.update({
      where: { id },
      data: { is_deleted: true },
    });

    res.json({
      success: true,
      message: 'Kegiatan beserta lampiran dokumentasinya berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error on remove event:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan.' });
  }
}

export async function cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existing = await prisma.event.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updated_by_id: userId,
      },
    });

    res.json({
      success: true,
      message: 'Kegiatan berhasil ditandai sebagai Dibatalkan.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ success: false, message: 'Gagal membatalkan kegiatan.' });
  }
}

export async function markCompleted(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        updated_by_id: userId,
      },
      include: {
        category: true,
        location: true,
        candidate_dates: true,
        officers: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Kegiatan berhasil ditandai Selesai.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error marking event completed:', error);
    res.status(500).json({ success: false, message: 'Gagal menandai kegiatan selesai.' });
  }
}

export async function unmarkCompleted(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const targetStatus = existing.date_precision === 'EXACT' ? 'CONFIRMED' : 'WAITING_CONFIRMATION';

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: targetStatus,
        updated_by_id: userId,
      },
      include: {
        category: true,
        location: true,
        candidate_dates: true,
        officers: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: `Status kegiatan berhasil dikembalikan menjadi ${
        targetStatus === 'CONFIRMED' ? 'Terjadwal' : 'Menunggu Konfirmasi'
      }.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error unmarking event completed:', error);
    res.status(500).json({ success: false, message: 'Gagal mengembalikan status kegiatan.' });
  }
}
