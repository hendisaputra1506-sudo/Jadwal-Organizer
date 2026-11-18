import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { drive as googleDrive, auth as googleAuth } from '@googleapis/drive';
import { ENV } from '../config/env.js';

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
 * Memastikan struktur folder 3 tingkat terbentuk rapi di Google Drive:
 * [Folder Induk] / [Kategori] / [Nama Kegiatan] / [Dokumentasi (Foto & Video) | Daftar Hadir (PDF)]
 */
async function ensureThreeLevelFolder(
  drive: ReturnType<typeof googleDrive>,
  categoryName: string,
  eventName: string,
  subFolderName: string
): Promise<{ targetFolderId: string; folderPathLabel: string }> {
  const rootParentId = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;

  // Level 1: Folder Kategori (misal: Sosialisasi PMB, Expo Kampus, Pelatihan)
  const cleanCategory = sanitizeFolderName(categoryName || 'Kegiatan Kampus');
  const categoryFolderId = await findOrCreateFolder(drive, cleanCategory, rootParentId);

  // Level 2: Folder Nama Kegiatan / Sekolah (misal: MA Ahmad Dahlan Balapulang)
  const cleanEvent = cleanEventFolderName(eventName || 'Tanpa Nama', cleanCategory);
  const eventFolderId = await findOrCreateFolder(drive, cleanEvent, categoryFolderId);

  // Level 3: Sub-folder jenis berkas (Dokumentasi (Foto & Video) / Daftar Hadir (PDF))
  const targetFolderId = await findOrCreateFolder(drive, subFolderName, eventFolderId);

  return {
    targetFolderId,
    folderPathLabel: `${cleanCategory} / ${cleanEvent} / ${subFolderName}`,
  };
}

export interface UploadContext {
  categoryName: string;
  eventName: string;
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
 * Upload file ke Google Drive dengan struktur folder 3 tingkat otomatis & streaming disk (aman untuk video besar!).
 * Jika Google Drive belum dikonfigurasi, otomatis fallback ke Local Storage.
 */
export async function uploadAttachment(
  file: Express.Multer.File,
  context?: UploadContext
): Promise<UploadResult> {
  const useDrive = isGoogleDriveConfigured();

  try {
    if (useDrive) {
      try {
        const drive = getDriveClient();

        const subFolderName = resolveMediaSubfolderName(file.originalname, file.mimetype);
        let parentFolderId: string | undefined = ENV.GOOGLE_DRIVE_FOLDER_ID.trim() || undefined;
        let folderPathLabel: string | undefined;

        if (context) {
          const folderRes = await ensureThreeLevelFolder(
            drive,
            context.categoryName,
            context.eventName,
            subFolderName
          );
          parentFolderId = folderRes.targetFolderId;
          folderPathLabel = folderRes.folderPathLabel;
        }

        const fileMetadata: any = {
          name: file.originalname,
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
          file_name: file.originalname,
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
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${safeOriginalName}`;
    const localFilePath = path.join(UPLOAD_DIR, filename);

    if (file.path) {
      fs.copyFileSync(file.path, localFilePath);
    } else if (file.buffer) {
      fs.writeFileSync(localFilePath, file.buffer);
    }

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

/**
 * Pindahkan file ke Trash Google Drive (lebih aman agar masih bisa dipulihkan 30 hari jika terhapus tidak sengaja)
 * atau hapus file lokal jika penyimpanan lokal.
 */
export async function deleteAttachmentFile(
  drive_file_id: string | null,
  drive_view_url: string
): Promise<void> {
  if (drive_file_id && isGoogleDriveConfigured()) {
    try {
      const drive = getDriveClient();
      await drive.files.update({
        fileId: drive_file_id,
        requestBody: { trashed: true },
        supportsAllDrives: true,
      });
      return;
    } catch (err: any) {
      console.warn(`Gagal memindahkan file Drive ke Trash (${drive_file_id}):`, err.message);
    }
  }

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
