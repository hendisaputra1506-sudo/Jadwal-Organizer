import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getDriveStatus,
  getEventAttachments,
  uploadEventAttachment,
  uploadEventAttachmentsBatch,
  addExternalDriveLink,
  deleteEventAttachment,
} from '../controllers/attachmentController.js';

const router = express.Router();

// Gunakan DiskStorage di os.tmpdir() agar upload video besar (hingga 150 MB) tidak membebani RAM server
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `utd-upload-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = /\.(pdf|png|jpg|jpeg|webp|gif|heic|heif|mp4|mov|webm|mkv|avi|m4v|3gp|doc|docx|xls|xlsx|ppt|pptx)$/i;

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // Maksimal 150 MB per berkas (aman untuk dokumentasi video HP!)
    files: 15, // Maksimal 15 file sekaligus dalam 1 batch upload
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isAllowedMime =
      mime === 'application/pdf' ||
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('powerpoint') ||
      mime.includes('presentation');

    if (isAllowedMime || ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Format berkas tidak didukung. Unggah Foto (JPG/PNG/WEBP/HEIC), Video (MP4/MOV/WEBM), atau PDF Daftar Hadir.'
        )
      );
    }
  },
});

// Status konfigurasi Google Drive
router.get('/status', authenticateToken, getDriveStatus);

// List attachments kegiatan
router.get('/event/:eventId', authenticateToken, getEventAttachments);
router.get('/events/:eventId/attachments', authenticateToken, getEventAttachments);

// Upload 1 file (ADMIN & STAFF)
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

// Upload banyak file sekaligus — hingga 15 Foto/Video/PDF (ADMIN & STAFF)
router.post(
  '/event/:eventId/batch',
  authenticateToken,
  upload.array('files', 15),
  uploadEventAttachmentsBatch
);

// Tambah tautan Google Drive eksternal (misal folder foto atau video > 150 MB)
router.post('/event/:eventId/link', authenticateToken, addExternalDriveLink);

// Hapus attachment kegiatan (Khusus ADMIN)
router.delete('/:id', authenticateToken, requireAdmin, deleteEventAttachment);
router.delete(
  '/events/:eventId/attachments/:attachmentId',
  authenticateToken,
  requireAdmin,
  deleteEventAttachment
);

export default router;
