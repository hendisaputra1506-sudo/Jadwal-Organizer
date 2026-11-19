import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import {
  uploadAttachment,
  deleteAttachmentFile,
  isGoogleDriveConfigured,
  getGoogleDriveAuthMode,
  getCentralizedDriveFolderUrl,
  getGoogleDriveDiagnostics,
} from '../services/googleDriveService.js';
import {
  CategoryDocumentSlot,
  getEffectiveDocumentSlots,
  isMediaAttachment,
  resolveAttachmentSlotKey,
} from '../utils/documentSlots.js';

function resolveUploadSlotContext(
  rawSlotKey: string | undefined,
  rawSlotLabel: string | undefined,
  fileName: string,
  mimeType: string | undefined,
  categorySlots: CategoryDocumentSlot[]
): {
  slotKey: string;
  slotLabel: string | null;
  slot: CategoryDocumentSlot | null;
} {
  const cleanKey = (rawSlotKey || '').trim();

  if (cleanKey === 'MEDIA') {
    return { slotKey: 'MEDIA', slotLabel: 'Dokumentasi (Foto & Video)', slot: null };
  }

  if (cleanKey === 'OTHER') {
    return {
      slotKey: 'OTHER',
      slotLabel: rawSlotLabel?.trim() || 'Berkas Lainnya',
      slot: null,
    };
  }

  if (cleanKey) {
    const matched = categorySlots.find((s) => s.key === cleanKey);
    if (matched) {
      return {
        slotKey: matched.key,
        slotLabel: matched.label,
        slot: matched,
      };
    }
    return {
      slotKey: cleanKey,
      slotLabel: rawSlotLabel?.trim() || cleanKey,
      slot: null,
    };
  }

  // Fallback otomatis bila slotKey tidak dikirim
  if (isMediaAttachment(fileName, mimeType)) {
    return { slotKey: 'MEDIA', slotLabel: 'Dokumentasi (Foto & Video)', slot: null };
  }

  const inferredKey = resolveAttachmentSlotKey(
    { slot_key: null, file_name: fileName, mime_type: mimeType },
    categorySlots
  );
  const matched = categorySlots.find((s) => s.key === inferredKey) || null;
  return {
    slotKey: inferredKey,
    slotLabel: matched?.label || (inferredKey === 'MEDIA' ? 'Dokumentasi (Foto & Video)' : 'Berkas Lainnya'),
    slot: matched,
  };
}

export async function getDriveStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = getGoogleDriveAuthMode();
    const configured = isGoogleDriveConfigured();
    res.json({
      success: true,
      data: {
        isConfigured: configured,
        authMode: mode,
        storage: configured ? 'GOOGLE_DRIVE' : 'LOCAL',
        message:
          mode === 'OAUTH2'
            ? 'Google Drive terhubung (OAuth2 Aktif — Folder otomatis: Kategori / Kegiatan / Dokumentasi & Daftar Hadir).'
            : mode === 'SERVICE_ACCOUNT'
            ? 'Google Drive API terhubung (Service Account aktif).'
            : 'Google Drive belum dikonfigurasi. Menggunakan penyimpanan sementara server.',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDriveDiagnostics(req: Request, res: Response, next: NextFunction) {
  try {
    const diagnostics = await getGoogleDriveDiagnostics();
    res.json({
      success: true,
      data: diagnostics,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEventAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;

    const attachments = await prisma.eventAttachment.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadEventAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Tidak ada berkas yang diunggah.',
      });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { category: true },
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Kegiatan tidak ditemukan.',
      });
      return;
    }

    const categorySlots = getEffectiveDocumentSlots(event.category);
    const slotInfo = resolveUploadSlotContext(
      req.body?.slotKey,
      req.body?.slotLabel,
      req.file.originalname,
      req.file.mimetype,
      categorySlots
    );

    const uploadResult = await uploadAttachment(req.file, {
      categoryName: event.category?.name || 'Kegiatan Kampus',
      eventName: event.name,
      eventDate: event.event_date,
      slot: slotInfo.slot,
      slotKey: slotInfo.slotKey,
    });

    const attachment = await prisma.eventAttachment.create({
      data: {
        event_id: eventId,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
        mime_type: uploadResult.mime_type,
        slot_key: slotInfo.slotKey,
        slot_label: slotInfo.slotLabel,
        drive_file_id: uploadResult.drive_file_id,
        drive_view_url: uploadResult.drive_view_url,
        drive_download_url: uploadResult.drive_download_url,
      },
    });

    res.status(201).json({
      success: true,
      message:
        uploadResult.storage_type === 'GOOGLE_DRIVE'
          ? `Berhasil disimpan ke Google Drive (${uploadResult.folder_path || 'Folder Kegiatan'}).`
          : 'Berkas berhasil diunggah (Penyimpanan Server Sementara).',
      data: attachment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengunggah berkas.',
    });
  }
}

export async function uploadEventAttachmentsBatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Pilih minimal 1 berkas foto, video, atau PDF untuk diunggah.',
      });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { category: true },
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Kegiatan tidak ditemukan.',
      });
      return;
    }

    const categorySlots = getEffectiveDocumentSlots(event.category);
    const createdAttachments = [];
    let lastStorageType: 'GOOGLE_DRIVE' | 'LOCAL' = 'LOCAL';

    // Upload berurutan agar stabil dan folder otomatis terbentuk dengan rapi tanpa timeout
    for (const file of files) {
      const slotInfo = resolveUploadSlotContext(
        req.body?.slotKey,
        req.body?.slotLabel,
        file.originalname,
        file.mimetype,
        categorySlots
      );

      const uploadResult = await uploadAttachment(file, {
        categoryName: event.category?.name || 'Kegiatan Kampus',
        eventName: event.name,
        eventDate: event.event_date,
        slot: slotInfo.slot,
        slotKey: slotInfo.slotKey,
      });
      lastStorageType = uploadResult.storage_type;

      const record = await prisma.eventAttachment.create({
        data: {
          event_id: eventId,
          file_name: uploadResult.file_name,
          file_size: uploadResult.file_size,
          mime_type: uploadResult.mime_type,
          slot_key: slotInfo.slotKey,
          slot_label: slotInfo.slotLabel,
          drive_file_id: uploadResult.drive_file_id,
          drive_view_url: uploadResult.drive_view_url,
          drive_download_url: uploadResult.drive_download_url,
        },
      });
      createdAttachments.push(record);
    }

    res.status(201).json({
      success: true,
      message:
        lastStorageType === 'GOOGLE_DRIVE'
          ? `${createdAttachments.length} berkas berhasil diunggah dan dirapikan ke Google Drive!`
          : `${createdAttachments.length} berkas berhasil diunggah (Penyimpanan Server Sementara).`,
      data: createdAttachments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengunggah berkas.',
    });
  }
}

export async function addExternalDriveLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;
    const { title, url, linkType = 'DOCUMENTATION', slotKey, slotLabel } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: 'Nama/judul tautan wajib diisi.' });
      return;
    }

    if (!url || !url.trim() || !/^https?:\/\//i.test(url.trim())) {
      res.status(400).json({
        success: false,
        message: 'Masukkan tautan URL yang valid (diawali https://...).',
      });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { category: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const mimeType =
      linkType === 'ATTENDANCE_PDF'
        ? 'application/pdf'
        : linkType === 'VIDEO'
        ? 'video/external-link'
        : linkType === 'DOCUMENT'
        ? 'application/pdf'
        : 'application/vnd.google-apps.folder';

    const categorySlots = getEffectiveDocumentSlots(event.category);
    const matchedSlot = slotKey ? categorySlots.find((s) => s.key === slotKey) : null;
    const resolvedSlotKey = slotKey
      ? String(slotKey).trim()
      : linkType === 'ATTENDANCE_PDF'
      ? categorySlots.find((s) => s.key.includes('daftar_hadir'))?.key || 'OTHER'
      : 'MEDIA';
    const resolvedSlotLabel =
      matchedSlot?.label ||
      (slotLabel ? String(slotLabel).trim() : null) ||
      (resolvedSlotKey === 'MEDIA' ? 'Dokumentasi (Foto & Video)' : 'Berkas Lainnya');

    const attachment = await prisma.eventAttachment.create({
      data: {
        event_id: eventId,
        file_name: title.trim(),
        file_size: null,
        mime_type: mimeType,
        slot_key: resolvedSlotKey,
        slot_label: resolvedSlotLabel,
        drive_file_id: null,
        drive_view_url: url.trim(),
        drive_download_url: null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tautan Google Drive berhasil ditambahkan.',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rekap Terpusat (misal: Scan Daftar Hadir Semua Sekolah pada Sosialisasi PMB)
 * Menampilkan seluruh kegiatan pada kategori bersangkutan beserta status & file dokumen slot terpusat,
 * PLUS tautan langsung menuju 1 folder gabungan di Google Drive (tanpa merge PDF).
 */
export async function getCentralizedRekap(req: Request, res: Response, next: NextFunction) {
  try {
    const requestedCategoryId = (req.query.categoryId as string) || '';
    const requestedSlotKey = (req.query.slotKey as string) || '';
    const search = ((req.query.search as string) || '').trim();
    const month = ((req.query.month as string) || '').trim();
    const statusFilter = ((req.query.status as string) || 'all') as 'all' | 'uploaded' | 'missing';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const allCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    const centralizedCategories = allCategories
      .map((cat) => {
        const effectiveSlots = getEffectiveDocumentSlots(cat);
        const centralizedSlots = effectiveSlots.filter((s) => s.centralized);
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          centralizedSlots,
          effectiveSlots,
        };
      })
      .filter((c) => c.centralizedSlots.length > 0);

    if (centralizedCategories.length === 0) {
      res.json({
        success: true,
        data: {
          centralizedCategories: [],
          activeCategory: null,
          activeSlot: null,
          driveFolderUrl: null,
          summary: { totalEvents: 0, uploadedEvents: 0, missingEvents: 0, totalFiles: 0 },
          pagination: { page: 1, limit, totalItems: 0, totalPages: 1 },
          items: [],
        },
      });
      return;
    }

    // Prioritaskan Sosialisasi PMB sebagai default jika categoryId tidak diminta
    const activeCategory =
      centralizedCategories.find((c) => c.id === requestedCategoryId) ||
      centralizedCategories.find((c) => /pmb|sosialisasi/i.test(c.name)) ||
      centralizedCategories[0];

    const activeSlot =
      activeCategory.centralizedSlots.find((s) => s.key === requestedSlotKey) ||
      activeCategory.centralizedSlots[0];

    const whereConditions: any[] = [
      { is_deleted: false },
      { status: { not: 'CANCELLED' } },
      { category_id: activeCategory.id },
    ];

    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { location_name: { contains: search, mode: 'insensitive' } },
          { contact_info: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yr, mo] = month.split('-').map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(`${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);
      whereConditions.push({
        OR: [{ estimated_month: month }, { event_date: { gte: start, lte: end } }],
      });
    }

    const events = await prisma.event.findMany({
      where: { AND: whereConditions },
      select: {
        id: true,
        name: true,
        status: true,
        event_date: true,
        estimated_month: true,
        location_name: true,
        location: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            file_name: true,
            file_size: true,
            mime_type: true,
            slot_key: true,
            slot_label: true,
            drive_file_id: true,
            drive_view_url: true,
            drive_download_url: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: [{ event_date: 'desc' }, { created_at: 'desc' }],
    });

    const mapped = events.map((ev) => {
      const slotFiles = ev.attachments.filter(
        (att) => resolveAttachmentSlotKey(att, activeCategory.effectiveSlots) === activeSlot.key
      );
      return {
        id: ev.id,
        name: ev.name,
        status: ev.status,
        event_date: ev.event_date,
        estimated_month: ev.estimated_month,
        location_name: ev.location?.name || ev.location_name || null,
        hasUploaded: slotFiles.length > 0,
        files: slotFiles,
      };
    });

    const uploadedEvents = mapped.filter((m) => m.hasUploaded).length;
    const missingEvents = mapped.length - uploadedEvents;
    const totalFiles = mapped.reduce((acc, m) => acc + m.files.length, 0);

    const filtered =
      statusFilter === 'uploaded'
        ? mapped.filter((m) => m.hasUploaded)
        : statusFilter === 'missing'
        ? mapped.filter((m) => !m.hasUploaded)
        : mapped;

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const pagedItems = filtered.slice((page - 1) * limit, page * limit);

    const centralFolderName = activeSlot.centralFolderName || `00 - ${activeSlot.label}`;
    const driveFolderUrl = await getCentralizedDriveFolderUrl(
      activeCategory.name,
      centralFolderName
    );

    res.json({
      success: true,
      data: {
        centralizedCategories: centralizedCategories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          centralizedSlots: c.centralizedSlots,
        })),
        activeCategory: {
          id: activeCategory.id,
          name: activeCategory.name,
          color: activeCategory.color,
        },
        activeSlot,
        centralFolderPath: `${activeCategory.name} / ${centralFolderName}`,
        driveFolderUrl,
        summary: {
          totalEvents: mapped.length,
          uploadedEvents,
          missingEvents,
          totalFiles,
        },
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
        items: pagedItems,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEventAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const attachmentId = req.params.attachmentId || req.params.id;
    const { eventId } = req.params;

    const attachment = await prisma.eventAttachment.findFirst({
      where: eventId ? { id: attachmentId, event_id: eventId } : { id: attachmentId },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        message: 'Berkas lampiran tidak ditemukan.',
      });
      return;
    }

    const deleteRes = await deleteAttachmentFile(
      attachment.drive_file_id,
      attachment.drive_view_url
    );

    await prisma.eventAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({
      success: true,
      message: deleteRes.warning
        ? `Berkas dihapus dari aplikasi. Catatan: ${deleteRes.warning}`
        : deleteRes.deletedFromDrive
        ? 'Berkas berhasil dihapus permanen dari aplikasi dan Google Drive.'
        : 'Berkas lampiran berhasil dihapus.',
      deletedFromDrive: deleteRes.deletedFromDrive,
    });
  } catch (error) {
    next(error);
  }
}
