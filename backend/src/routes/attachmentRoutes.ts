import express from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getDriveStatus,
  getEventAttachments,
  uploadEventAttachment,
  deleteEventAttachment,
} from '../controllers/attachmentController.js';

const router = express.Router();

// Setup Multer dengan MemoryStorage (file buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Maksimal 25MB per berkas
  },
  fileFilter: (req, file, cb) => {
    // Izinkan PDF, Word, Excel, PowerPoint, Text, dan Gambar
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];

    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Format berkas tidak didukung. Harap unggah dokumen PDF, Word, Excel, PPT, atau Gambar.'));
    }
  },
});

// Status konfigurasi Google Drive
router.get('/status', authenticateToken, getDriveStatus);

// List attachments kegiatan
router.get('/event/:eventId', authenticateToken, getEventAttachments);
router.get('/events/:eventId/attachments', authenticateToken, getEventAttachments);

// Upload attachment kegiatan
router.post(
  '/event/:eventId',
  authenticateToken,
  upload.single('file'),
  uploadEventAttachment
);
router.post(
  '/events/:eventId/attachments',
  authenticateToken,
  upload.single('file'),
  uploadEventAttachment
);

// Hapus attachment kegiatan
router.delete('/:id', authenticateToken, deleteEventAttachment);
router.delete(
  '/events/:eventId/attachments/:attachmentId',
  authenticateToken,
  deleteEventAttachment
);

export default router;
