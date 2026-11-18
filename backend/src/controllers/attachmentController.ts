import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import {
  uploadAttachment,
  deleteAttachmentFile,
  isGoogleDriveConfigured,
  getGoogleDriveAuthMode,
} from '../services/googleDriveService.js';

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

    const uploadResult = await uploadAttachment(req.file, {
      categoryName: event.category?.name || 'Kegiatan Kampus',
      eventName: event.name,
    });

    const attachment = await prisma.eventAttachment.create({
      data: {
        event_id: eventId,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
        mime_type: uploadResult.mime_type,
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

    const context = {
      categoryName: event.category?.name || 'Kegiatan Kampus',
      eventName: event.name,
    };

    const createdAttachments = [];
    let lastStorageType: 'GOOGLE_DRIVE' | 'LOCAL' = 'LOCAL';

    // Upload berurutan agar stabil dan folder otomatis terbentuk dengan rapi tanpa timeout
    for (const file of files) {
      const uploadResult = await uploadAttachment(file, context);
      lastStorageType = uploadResult.storage_type;

      const record = await prisma.eventAttachment.create({
        data: {
          event_id: eventId,
          file_name: uploadResult.file_name,
          file_size: uploadResult.file_size,
          mime_type: uploadResult.mime_type,
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
    const { title, url, linkType = 'DOCUMENTATION' } = req.body;

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

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan.' });
      return;
    }

    const mimeType =
      linkType === 'ATTENDANCE_PDF'
        ? 'application/pdf'
        : linkType === 'VIDEO'
        ? 'video/external-link'
        : 'application/vnd.google-apps.folder';

    const attachment = await prisma.eventAttachment.create({
      data: {
        event_id: eventId,
        file_name: title.trim(),
        file_size: null,
        mime_type: mimeType,
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

    await deleteAttachmentFile(attachment.drive_file_id, attachment.drive_view_url);

    await prisma.eventAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({
      success: true,
      message: 'Berkas berhasil dihapus (dipindahkan ke Sampah Google Drive).',
    });
  } catch (error) {
    next(error);
  }
}
