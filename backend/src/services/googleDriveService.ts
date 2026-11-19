import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { drive as googleDrive, auth as googleAuth } from '@googleapis/drive';
import { ENV } from '../config/env.js';
import { prisma } from '../config/db.js';
import { CategoryDocumentSlot, isMediaAttachment } from '../utils/documentSlots.js';

// Pastikan folder uploads lokal selalu ada untuk mode fallback development
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cache promise pencarian/pembuatan folder agar multi-upload bersamaan tidak membuat folder duplikat
const folderPromiseCache = new Map<string, Promise<string>>();

export type DriveAuthMode = 'OAUTH2' | 'SERVICE_ACCOUNT' | 'LOCAL';

export function getGoogleDriveAuthMode(): DriveAuthMode {
  if (
    ENV.GOOGLE_OAUTH_CLIENT_ID &&
    ENV.GOOGLE_OAUTH_CLIENT_SECRET &&
    ENV.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    return 'OAUTH2';
  }

  if (ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.isAbsolute(ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
      ? ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
      : path.join(process.cwd(), ENV.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    if (fs.existsSync(keyPath)) {
      return 'SERVICE_ACCOUNT';
    }
  }

  if (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return 'SERVICE_ACCOUNT';
  }

  return 'LOCAL';
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveAuthMode() !== 'LOCAL';
}

/**
 * Mendapatkan instance Google Drive client (OAuth2 Refresh Token diprioritaskan agar bekerja di Gmail 15 GB & Workspace)
 */
function getDriveClient() {
  const mode = getGoogleDriveAuthMode();

  if (mode === 'OAUTH2') {
    const oauth2Client = new googleAuth.OAuth2(
      ENV.GOOGLE_OAUTH_CLIENT_ID.trim(),
      ENV.GOOGLE_OAUTH_CLIENT_SECRET.trim()
    );
    oauth2Client.setCredentials({
      refresh_token: ENV.GOOGLE_OAUTH_REFRESH_TOKEN.trim(),
    });
    return googleDrive({ version: 'v3', auth: oauth2Client });
  }

  if (mode === 'SERVICE_ACCOUNT') {
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

    if (authClient) {
      return googleDrive({ version: 'v3', auth: authClient });
    }
  }

  throw new Error('Kredensial Google Drive belum dikonfigurasi.');
}

/**
 * Membersihkan nama folder agar aman untuk Google Drive
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Menghapus awalan nama kategori berulang agar folder di dalam kategori rapi.
 * Contoh: Kategori "Sosialisasi PMB", Event "Sosialisasi PMB - SMA N 1 Pangkah"
 * -> Folder: "SMA N 1 Pangkah"
 */
function cleanEventFolderName(eventName: string, categoryName: string): string {
  const cleanEvent = sanitizeFolderName(eventName);
  const cleanCat = sanitizeFolderName(categoryName);

  const prefixRegex = new RegExp(`^${cleanCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–:]\\s*`, 'i');
  const stripped = cleanEvent.replace(prefixRegex, '').trim();
  return stripped || cleanEvent;
}

/**
 * Menentukan nama sub-folder Level 3 secara otomatis berdasarkan jenis berkas:
 * - Foto & Video -> "Dokumentasi (Foto & Video)"
 * - PDF -> "Daftar Hadir (PDF)"
 * - Lainnya -> "Berkas Lainnya"
 */
export function resolveMediaSubfolderName(fileName: string, mimeType?: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return 'Dokumentasi (Foto & Video)';
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'Daftar Hadir (PDF)';
  }

  return 'Berkas Lainnya';
}

/**
 * Cari atau buat folder di Google Drive di bawah parentId tertentu (concurrency-safe)
 */
async function findOrCreateFolder(
  drive: ReturnType<typeof googleDrive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  const safeName = sanitizeFolderName(folderName);
  const cacheKey = `${parentId || 'root'}::${safeName.toLowerCase()}`;

  const cached = folderPromiseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const task = (async () => {
    const escapedName = safeName.replace(/'/g, "\\'");
    const parentQuery = parentId ? ` and '${parentId}' in parents` : '';
    const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentQuery}`;

    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1,
    });

    const existing = searchRes.data.files?.[0];
    if (existing?.id) {
      return existing.id;
    }

    const createRes = await drive.files.create({
      requestBody: {
        name: safeName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    if (!createRes.data.id) {
      throw new Error(`Gagal membuat folder '${safeName}' di Google Drive.`);
    }

    return createRes.data.id;
  })();

  folderPromiseCache.set(cacheKey, task);

  try {
    return await task;
  } catch (err) {
    folderPromiseCache.delete(cacheKey);
    throw err;
  }
}

/**
 * Memastikan struktur folder 2 tingkat terbentuk rapi di Google Drive:
 * [Folder Induk] / [Kategori] / [Nama Kegiatan / Sekolah]
 * File foto, video, dan dokumen kegiatan langsung berada di folder ini tanpa sub-folder perantara.
 */
async function ensureEventFolder(
  drive: ReturnType<typeof googleDrive>,
  categoryName: string,
  eventName: string
): Promise<{ targetFolderId: string; folderPathLabel: string }> {
  const rootParentId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;

  // Level 1: Folder Kategori (misal: Sosialisasi PMB, Expo Kampus, Pelatihan)
  const cleanCategory = sanitizeFolderName(categoryName || 'Kegiatan Kampus');
  const categoryFolderId = await findOrCreateFolder(drive, cleanCategory, rootParentId);

  // Level 2: Folder Nama Kegiatan / Sekolah (misal: MA Ahmad Dahlan Balapulang)
  const cleanEvent = cleanEventFolderName(eventName || 'Tanpa Nama', cleanCategory);
  const eventFolderId = await findOrCreateFolder(drive, cleanEvent, categoryFolderId);

  return {
    targetFolderId: eventFolderId,
    folderPathLabel: `${cleanCategory} / ${cleanEvent}`,
  };
}

/**
 * Memastikan folder gabungan 2 tingkat di bawah Kategori:
 * [Folder Induk] / [Kategori] / [centralFolderName]
 * Contoh: Sosialisasi PMB / 00 - Daftar Hadir (Semua Sekolah)
 */
async function ensureCentralizedCategoryFolder(
  drive: ReturnType<typeof googleDrive>,
  categoryName: string,
  centralFolderName: string
): Promise<{ targetFolderId: string; folderPathLabel: string }> {
  const rootParentId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;
  const cleanCategory = sanitizeFolderName(categoryName || 'Kegiatan Kampus');
  const categoryFolderId = await findOrCreateFolder(drive, cleanCategory, rootParentId);

  const cleanCentral = sanitizeFolderName(centralFolderName || '00 - Rekap Dokumen');
  const targetFolderId = await findOrCreateFolder(drive, cleanCentral, categoryFolderId);

  return {
    targetFolderId,
    folderPathLabel: `${cleanCategory} / ${cleanCentral}`,
  };
}

/**
 * Lookup read-only untuk mendapatkan URL folder gabungan di Google Drive
 * (tidak membuat folder kosong bila belum pernah ada upload).
 */
export async function getCentralizedDriveFolderUrl(
  categoryName: string,
  centralFolderName: string
): Promise<string | null> {
  if (!isGoogleDriveConfigured()) {
    return ENV.GOOGLE_DRIVE_FOLDER_ID
      ? `https://drive.google.com/drive/folders/${ENV.GOOGLE_DRIVE_FOLDER_ID.trim()}`
      : null;
  }

  const rootParentId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;

  try {
    const drive = getDriveClient();

    const findExistingFolder = async (name: string, parentId?: string): Promise<string | null> => {
      const safeName = sanitizeFolderName(name);
      const escaped = safeName.replace(/'/g, "\\'");
      const parentQ = parentId ? ` and '${parentId}' in parents` : '';
      const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false${parentQ}`,
        fields: 'files(id)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1,
      });
      return res.data.files?.[0]?.id || null;
    };

    const catFolderId = await findExistingFolder(categoryName || 'Kegiatan Kampus', rootParentId);
    if (catFolderId) {
      const centralFolderId = await findExistingFolder(centralFolderName, catFolderId);
      if (centralFolderId) {
        return `https://drive.google.com/drive/folders/${centralFolderId}`;
      }
      return `https://drive.google.com/drive/folders/${catFolderId}`;
    }

    return rootParentId ? `https://drive.google.com/drive/folders/${rootParentId}` : null;
  } catch (err) {
    console.warn('Gagal lookup URL folder gabungan Drive:', err);
    return rootParentId ? `https://drive.google.com/drive/folders/${rootParentId}` : null;
  }
}

/**
 * Lookup read-only untuk mendapatkan URL folder kegiatan di Google Drive
 * [Folder Induk] / [Kategori] / [Nama Kegiatan / Sekolah]
 */
export async function getEventDriveFolderUrl(
  categoryName: string,
  eventName: string
): Promise<string | null> {
  if (!isGoogleDriveConfigured()) {
    return ENV.GOOGLE_DRIVE_FOLDER_ID
      ? `https://drive.google.com/drive/folders/${ENV.GOOGLE_DRIVE_FOLDER_ID.trim()}`
      : null;
  }

  const rootParentId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;

  try {
    const drive = getDriveClient();

    const findExistingFolder = async (name: string, parentId?: string): Promise<string | null> => {
      const safeName = sanitizeFolderName(name);
      const escaped = safeName.replace(/'/g, "\\'");
      const parentQ = parentId ? ` and '${parentId}' in parents` : '';
      const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false${parentQ}`,
        fields: 'files(id)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1,
      });
      return res.data.files?.[0]?.id || null;
    };

    const cleanCategory = sanitizeFolderName(categoryName || 'Kegiatan Kampus');
    const catFolderId = await findExistingFolder(cleanCategory, rootParentId);
    if (catFolderId) {
      const cleanEvent = cleanEventFolderName(eventName || 'Tanpa Nama', cleanCategory);
      const eventFolderId = await findExistingFolder(cleanEvent, catFolderId);
      if (eventFolderId) {
        return `https://drive.google.com/drive/folders/${eventFolderId}`;
      }
      return `https://drive.google.com/drive/folders/${catFolderId}`;
    }

    return rootParentId ? `https://drive.google.com/drive/folders/${rootParentId}` : null;
  } catch (err) {
    console.warn('Gagal lookup URL folder kegiatan Drive:', err);
    return rootParentId ? `https://drive.google.com/drive/folders/${rootParentId}` : null;
  }
}

function formatEventDatePrefix(eventDate?: Date | string | null): string {
  if (!eventDate) return '';
  try {
    if (eventDate instanceof Date) {
      return eventDate.toISOString().split('T')[0];
    }
    const str = String(eventDate).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Merapikan nama file untuk dokumen terpusat (misal Daftar Hadir semua sekolah)
 * agar tidak bentrok antar sekolah dan langsung terbaca:
 * Contoh: "2026-11-18 - SMA N 1 Tegal - Daftar Hadir.pdf"
 */
function buildUploadFileName(originalName: string, context?: UploadContext): string {
  if (!context) return originalName;

  const slot = context.slot;
  const isMedia =
    context.slotKey === 'MEDIA' ||
    (!slot && isMediaAttachment(originalName, undefined));

  if (isMedia || !slot) {
    return originalName;
  }

  const ext = path.extname(originalName);
  const rawBase = path.basename(originalName, ext).trim();

  if (slot.centralized) {
    const cleanCategory = sanitizeFolderName(context.categoryName || '');
    const cleanEvent = cleanEventFolderName(context.eventName || 'Kegiatan', cleanCategory);
    const datePrefix = formatEventDatePrefix(context.eventDate);

    // Jika nama file asli sudah mengandung nama sekolah/kegiatan, pertahankan; jika tidak, tambahkan rapi
    const lowerBase = rawBase.toLowerCase();
    const lowerEvent = cleanEvent.toLowerCase();
    const shortSlot = sanitizeFolderName(slot.label.replace(/\s*\(pdf\)\s*/i, '').trim());

    let coreName: string;
    if (lowerBase.includes(lowerEvent)) {
      coreName = sanitizeFolderName(rawBase);
    } else if (
      /^(scan|camscanner|doc|img|document|pdf|whatsapp|file|untitled)[_\-\s\d]*$/i.test(rawBase) ||
      rawBase.length < 4
    ) {
      coreName = `${cleanEvent} - ${shortSlot}`;
    } else {
      coreName = `${cleanEvent} - ${sanitizeFolderName(rawBase)}`;
    }

    const prefix = datePrefix ? `${datePrefix} - ` : '';
    return `${prefix}${coreName}${ext}`.slice(0, 140);
  }

  // Slot non-terpusat (misal Akademik -> Berita Acara / Notulensi): beri prefix [Label] bila belum ada
  const shortTag = sanitizeFolderName(slot.label.replace(/\s*\(pdf\)\s*/i, '').trim()).slice(0, 35);
  if (rawBase.startsWith('[')) {
    return originalName;
  }
  return `[${shortTag}] ${originalName}`.slice(0, 140);
}

export interface UploadContext {
  categoryName: string;
  eventName: string;
  eventDate?: Date | string | null;
  slot?: CategoryDocumentSlot | null;
  slotKey?: string | null;
}

export interface UploadResult {
  file_name: string;
  file_size: number;
  mime_type: string;
  drive_file_id: string | null;
  drive_view_url: string;
  drive_download_url: string | null;
  storage_type: 'GOOGLE_DRIVE' | 'LOCAL';
  folder_path?: string;
}

/**
 * Upload file ke Google Drive dengan struktur folder otomatis berbasis Kategori & Slot Dokumen:
 * - Foto/Video: [Kategori] / [Nama Kegiatan] / Dokumentasi (Foto & Video)
 * - Slot Terpusat (misal Scan Daftar Hadir PMB): [Kategori] / [00 - Daftar Hadir (Semua Sekolah)] / YYYY-MM-DD - Sekolah - ...
 * - Slot Dokumen Per Kegiatan (misal Akademik): [Kategori] / [Nama Kegiatan] / Dokumen Kegiatan / [Label] ...
 * Jika Google Drive belum dikonfigurasi, otomatis fallback ke Local Storage.
 */
export async function uploadAttachment(
  file: Express.Multer.File,
  context?: UploadContext
): Promise<UploadResult> {
  const useDrive = isGoogleDriveConfigured();
  const finalFileName = buildUploadFileName(file.originalname, context);

  try {
    if (useDrive) {
      try {
        const drive = getDriveClient();

        const isMedia =
          context?.slotKey === 'MEDIA' ||
          (!context?.slot && isMediaAttachment(file.originalname, file.mimetype));

        let parentFolderId: string | undefined = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;
        let folderPathLabel: string | undefined;

        if (context) {
          if (!isMedia && context.slot?.centralized) {
            const centralName =
              context.slot.centralFolderName || `00 - ${context.slot.label}`;
            const folderRes = await ensureCentralizedCategoryFolder(
              drive,
              context.categoryName,
              centralName
            );
            parentFolderId = folderRes.targetFolderId;
            folderPathLabel = folderRes.folderPathLabel;
          } else {
            // Struktur 2 tingkat langsung: [Kategori] / [Nama Kegiatan / Sekolah]
            // Foto, video, dan dokumen kegiatan tersimpan langsung tanpa subfolder perantara
            const folderRes = await ensureEventFolder(
              drive,
              context.categoryName,
              context.eventName
            );
            parentFolderId = folderRes.targetFolderId;
            folderPathLabel = folderRes.folderPathLabel;
          }
        }

        const fileMetadata: any = {
          name: finalFileName,
          parents: parentFolderId ? [parentFolderId] : undefined,
        };

        // Stream langsung dari temp disk (0 MB beban RAM!) atau fallback buffer
        const bodyStream = file.path ? fs.createReadStream(file.path) : Readable.from(file.buffer);

        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: file.mimetype,
            body: bodyStream,
          },
          fields: 'id, name, webViewLink, webContentLink, size, mimeType',
          supportsAllDrives: true,
        });

        const fileId = response.data.id;
        if (!fileId) {
          throw new Error('Gagal mendapatkan ID file dari Google Drive.');
        }

        // Set akses lihat publik via link agar seluruh staf dapat membuka & mengunduh dari web
        try {
          await drive.permissions.create({
            fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true,
          });
        } catch (permError) {
          console.warn('Peringatan saat mengatur izin baca tautan Drive:', permError);
        }

        const fileDetails = await drive.files.get({
          fileId,
          fields: 'id, name, webViewLink, webContentLink, size',
          supportsAllDrives: true,
        });

        return {
          file_name: finalFileName,
          file_size: file.size,
          mime_type: file.mimetype,
          drive_file_id: fileId,
          drive_view_url:
            fileDetails.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
          drive_download_url:
            fileDetails.data.webContentLink ||
            `https://drive.google.com/uc?id=${fileId}&export=download`,
          storage_type: 'GOOGLE_DRIVE',
          folder_path: folderPathLabel,
        };
      } catch (err: any) {
        console.error('❌ Gagal upload ke Google Drive API:', err.message);
        // Jika kredensial Drive sudah dikonfigurasi tetapi gagal (misal token expired), beritahu jelas!
        throw new Error(
          `Gagal mengunggah ke Google Drive: ${err.message || 'Periksa konfigurasi Google Drive OAuth2.'}`
        );
      }
    }

    // --- FALLBACK KE LOCAL STORAGE (Saat kredensial Google Drive belum diisi) ---
    const timestamp = Date.now();
    const safeOriginalName = finalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${safeOriginalName}`;
    const localFilePath = path.join(UPLOAD_DIR, filename);

    if (file.path) {
      fs.copyFileSync(file.path, localFilePath);
    } else if (file.buffer) {
      fs.writeFileSync(localFilePath, file.buffer);
    }

    const localUrl = `/uploads/${filename}`;

    return {
      file_name: finalFileName,
      file_size: file.size,
      mime_type: file.mimetype,
      drive_file_id: null,
      drive_view_url: localUrl,
      drive_download_url: localUrl,
      storage_type: 'LOCAL',
    };
  } finally {
    // Selalu bersihkan temp file Multer di os.tmpdir() agar disk server tetap lega
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

export interface DeleteAttachmentResult {
  deletedFromDrive: boolean;
  deletedFromLocal: boolean;
  warning?: string;
}

/**
 * Hapus berkas secara PERMANEN dari Google Drive (langsung membebaskan kuota 15 GB)
 * atau hapus file lokal jika penyimpanan lokal.
 */
export async function deleteAttachmentFile(
  drive_file_id: string | null,
  drive_view_url: string
): Promise<DeleteAttachmentResult> {
  let targetFileId = drive_file_id;
  if (!targetFileId && drive_view_url) {
    const m = drive_view_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m?.[1]) targetFileId = m[1];
  }

  if (targetFileId) {
    if (!isGoogleDriveConfigured()) {
      return {
        deletedFromDrive: false,
        deletedFromLocal: false,
        warning:
          'Kredensial Google Drive (GOOGLE_OAUTH_*) belum terpasang pada server ini (misal backend/.env lokal), sehingga file di Google Drive belum ikut terhapus.',
      };
    }

    try {
      const drive = getDriveClient();
      // Hapus permanen dari Google Drive agar tidak menumpuk di Trash / menghabiskan kuota 15 GB
      await drive.files.delete({
        fileId: targetFileId,
        supportsAllDrives: true,
      });
      return { deletedFromDrive: true, deletedFromLocal: false };
    } catch (err: any) {
      const status = err?.code || err?.response?.status;
      if (status === 404) {
        // File memang sudah tidak ada di Google Drive
        return { deletedFromDrive: true, deletedFromLocal: false };
      }

      // Fallback ke Trash hanya jika Shared Drive melarang hard-delete (403)
      try {
        const drive = getDriveClient();
        await drive.files.update({
          fileId: targetFileId,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
        return { deletedFromDrive: true, deletedFromLocal: false };
      } catch (trashErr: any) {
        console.error(
          `❌ Gagal menghapus file dari Google Drive (${targetFileId}):`,
          err?.message,
          trashErr?.message
        );
        return {
          deletedFromDrive: false,
          deletedFromLocal: false,
          warning: `Gagal menghapus file di Google Drive: ${err?.message || 'Cek izin OAuth Google Drive.'}`,
        };
      }
    }
  }

  if (drive_view_url.startsWith('/uploads/')) {
    const filename = drive_view_url.replace('/uploads/', '');
    const localFilePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
        return { deletedFromDrive: false, deletedFromLocal: true };
      } catch (err: any) {
        console.warn(`Gagal menghapus file lokal (${localFilePath}):`, err.message);
      }
    }
  }

  return { deletedFromDrive: false, deletedFromLocal: false };
}

/**
 * Diagnostik lengkap integrasi Google Drive:
 * - Akun Google mana yang sedang aktif (email & nama)
 * - Apakah GOOGLE_DRIVE_FOLDER_ID valid dan dapat diakses oleh akun tersebut
 * - Posisi parent folder dari file upload terakhir
 */
export async function getGoogleDriveDiagnostics() {
  const mode = getGoogleDriveAuthMode();
  const configured = isGoogleDriveConfigured();
  const envFolderId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim();

  const result: any = {
    configured,
    authMode: mode,
    configuredFolderId: envFolderId || null,
    account: null,
    folderCheck: null,
    alternateFolderCheck: null,
    recentUpload: null,
    error: null,
  };

  if (!configured) {
    return result;
  }

  try {
    const drive = getDriveClient();

    // 1. Cek info akun Google OAuth
    try {
      const about = await drive.about.get({
        fields: 'user, storageQuota',
      });
      result.account = {
        email: about.data.user?.emailAddress || null,
        displayName: about.data.user?.displayName || null,
        limitBytes: about.data.storageQuota?.limit || null,
        usageBytes: about.data.storageQuota?.usage || null,
        usageInDriveBytes: about.data.storageQuota?.usageInDrive || null,
      };
    } catch (err: any) {
      result.account = { error: err.message };
    }

    // 2. Cek folder yang dikonfigurasi di GOOGLE_DRIVE_FOLDER_ID
    if (envFolderId) {
      try {
        const folder = await drive.files.get({
          fileId: envFolderId,
          fields: 'id, name, mimeType, owners, trashed, parents',
          supportsAllDrives: true,
        });
        result.folderCheck = {
          success: true,
          id: folder.data.id,
          name: folder.data.name,
          mimeType: folder.data.mimeType,
          owners: folder.data.owners?.map((o: any) => ({
            email: o.emailAddress,
            name: o.displayName,
          })),
          trashed: folder.data.trashed,
        };
      } catch (err: any) {
        result.folderCheck = {
          success: false,
          testedId: envFolderId,
          error: err.message,
          code: err.code || err.status,
        };
      }

      // Jika huruf ke-15 adalah 'F', coba cek versi 'f' (lowercase) untuk mendeteksi typo
      if (envFolderId.includes('pbmFGVj')) {
        const lowerVariant = envFolderId.replace('pbmFGVj', 'pbmfGVj');
        try {
          const altFolder = await drive.files.get({
            fileId: lowerVariant,
            fields: 'id, name, owners',
            supportsAllDrives: true,
          });
          result.alternateFolderCheck = {
            note: 'Varian huruf kecil f berhasil ditemukan!',
            id: altFolder.data.id,
            name: altFolder.data.name,
            owners: altFolder.data.owners?.map((o: any) => ({
              email: o.emailAddress,
              name: o.displayName,
            })),
          };
        } catch (altErr: any) {
          result.alternateFolderCheck = {
            note: 'Varian huruf kecil f juga dicoba:',
            error: altErr.message,
          };
        }
      }
    }

    // 3. Cek berkas lampiran terakhir yang diupload ke database
    const recent = await prisma.eventAttachment.findFirst({
      where: { drive_file_id: { not: null } },
      orderBy: { created_at: 'desc' },
      include: { event: { select: { id: true, name: true } } },
    });

    if (recent?.drive_file_id) {
      try {
        const fileInfo = await drive.files.get({
          fileId: recent.drive_file_id,
          fields: 'id, name, parents, owners, webViewLink, createdTime',
          supportsAllDrives: true,
        });

        const parentDetails: any[] = [];
        if (fileInfo.data.parents && fileInfo.data.parents.length > 0) {
          for (const pId of fileInfo.data.parents) {
            try {
              const pInfo = await drive.files.get({
                fileId: pId,
                fields: 'id, name, owners',
                supportsAllDrives: true,
              });
              parentDetails.push({
                id: pId,
                name: pInfo.data.name,
                owners: pInfo.data.owners?.map((o: any) => o.emailAddress),
              });
            } catch (pErr: any) {
              parentDetails.push({ id: pId, error: pErr.message });
            }
          }
        }

        result.recentUpload = {
          attachmentId: recent.id,
          fileName: recent.file_name,
          eventName: recent.event?.name,
          driveFileId: recent.drive_file_id,
          createdAt: recent.created_at,
          owners: fileInfo.data.owners?.map((o: any) => ({
            email: o.emailAddress,
            name: o.displayName,
          })),
          parents: parentDetails,
          webViewLink: fileInfo.data.webViewLink,
        };
      } catch (fErr: any) {
        result.recentUpload = {
          attachmentId: recent.id,
          driveFileId: recent.drive_file_id,
          error: fErr.message,
        };
      }
    }

    return result;
  } catch (err: any) {
    result.error = err.message;
    return result;
  }
}
