import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import {
  uploadAttachment,
  deleteAttachmentFile,
  isGoogleDriveConfigured,
} from '../services/googleDriveService.js';

export async function getDriveStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const configured = isGoogleDriveConfigured();
    res.json({
      success: true,
      data: {
        isConfigured: configured,
        storage: configured ? 'GOOGLE_DRIVE' : 'LOCAL',
        message: configured
          ? 'Google Drive API terhubung (Google Service Account aktif).'
          : 'Google Drive API belum dikonfigurasi. Menggunakan penyimpanan lokal sementara.',
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

    // Pastikan event ada
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Kegiatan tidak ditemukan.',
      });
      return;
    }

    // Upload ke Google Drive atau Local
    const uploadResult = await uploadAttachment(req.file);

    // Simpan metadata ke database
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
      message: `Berkas berhasil diunggah (${uploadResult.storage_type === 'GOOGLE_DRIVE' ? 'Tersimpan di Google Drive' : 'Tersimpan di Server Lokal'}).`,
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
      where: eventId
        ? { id: attachmentId, event_id: eventId }
        : { id: attachmentId },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        message: 'Berkas lampiran tidak ditemukan.',
      });
      return;
    }

    // Hapus dari Google Drive atau Local Storage
    await deleteAttachmentFile(attachment.drive_file_id, attachment.drive_view_url);

    // Hapus dari database
    await prisma.eventAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({
      success: true,
      message: 'Berkas lampiran berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
}
