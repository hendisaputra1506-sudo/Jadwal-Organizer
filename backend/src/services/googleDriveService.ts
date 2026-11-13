import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { drive as googleDrive, auth as googleAuth } from '@googleapis/drive';
import { ENV } from '../config/env.js';

// Pastikan folder uploads lokal selalu ada untuk mode fallback
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Cek apakah kredensial Google Drive Service Account sudah dikonfigurasi
 */
export function isGoogleDriveConfigured(): boolean {
  if (ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.isAbsolute(ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
      ? ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
      : path.join(process.cwd(), ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    if (fs.existsSync(keyPath)) {
      return true;
    }
  }

  if (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return true;
  }

  return false;
}

/**
 * Mendapatkan instance Google Drive client dengan Service Account auth
 */
function getDriveClient() {
  let authClient: any;

  if (ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.isAbsolute(ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
      ? ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
      : path.join(process.cwd(), ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);

    if (fs.existsSync(keyPath)) {
      authClient = new googleAuth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    }
  }

  if (!authClient && ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const privateKey = ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
    authClient = new googleAuth.JWT({
      email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  if (!authClient) {
    throw new Error('Kredensial Google Drive Service Account belum dikonfigurasi.');
  }

  return googleDrive({ version: 'v3', auth: authClient });
}

export interface UploadResult {
  file_name: string;
  file_size: number;
  mime_type: string;
  drive_file_id: string | null;
  drive_view_url: string;
  drive_download_url: string | null;
  storage_type: 'GOOGLE_DRIVE' | 'LOCAL';
}

/**
 * Upload file ke Google Drive (atau fallback ke Local Storage jika kredensial belum ada)
 */
export async function uploadAttachment(file: Express.Multer.File): Promise<UploadResult> {
  const useDrive = isGoogleDriveConfigured();

  if (useDrive) {
    try {
      const drive = getDriveClient();

      const folderId = ENV.GOOGLE_DRIVE_FOLDER_ID || undefined;
      const fileMetadata: any = {
        name: file.originalname,
        parents: folderId ? [folderId] : undefined,
      };

      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      };

      // 1. Upload file ke Google Drive
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size, mimeType',
      });

      const fileId = response.data.id;
      if (!fileId) {
        throw new Error('Gagal mendapatkan ID file dari Google Drive.');
      }

      // 2. Set permission agar dapat dilihat publik via link (read-only)
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permError) {
        console.warn('Peringatan saat mengubah permission file Drive:', permError);
      }

      // 3. Ambil link preview terkini
      const fileDetails = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, webViewLink, webContentLink, size',
      });

      return {
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        drive_file_id: fileId,
        drive_view_url: fileDetails.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        drive_download_url: fileDetails.data.webContentLink || `https://drive.google.com/uc?id=${fileId}&export=download`,
        storage_type: 'GOOGLE_DRIVE',
      };
    } catch (err: any) {
      console.error('❌ Gagal upload ke Google Drive API, beralih ke penyimpanan lokal:', err.message);
      // Lanjut ke fallback local storage di bawah
    }
  }

  // --- FALLBACK KE LOCAL STORAGE ---
  const timestamp = Date.now();
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${timestamp}_${safeOriginalName}`;
  const localFilePath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(localFilePath, file.buffer);

  const localUrl = `/uploads/${filename}`;

  return {
    file_name: file.originalname,
    file_size: file.size,
    mime_type: file.mimetype,
    drive_file_id: null,
    drive_view_url: localUrl,
    drive_download_url: localUrl,
    storage_type: 'LOCAL',
  };
}

/**
 * Hapus file dari Google Drive atau Local Storage
 */
export async function deleteAttachmentFile(
  drive_file_id: string | null,
  drive_view_url: string
): Promise<void> {
  if (drive_file_id && isGoogleDriveConfigured()) {
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId: drive_file_id });
      return;
    } catch (err: any) {
      console.warn(`Gagal menghapus file di Google Drive (${drive_file_id}):`, err.message);
    }
  }

  // Jika file lokal
  if (drive_view_url.startsWith('/uploads/')) {
    const filename = drive_view_url.replace('/uploads/', '');
    const localFilePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err: any) {
        console.warn(`Gagal menghapus file lokal (${localFilePath}):`, err.message);
      }
    }
  }
}
