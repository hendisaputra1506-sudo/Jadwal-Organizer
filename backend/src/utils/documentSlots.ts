export type SlotAcceptType = 'PDF' | 'DOC' | 'ANY';

export interface CategoryDocumentSlot {
  key: string;
  label: string;
  accept: SlotAcceptType;
  centralized: boolean;
  centralFolderName?: string;
  required?: boolean;
}

export function slugifySlotKey(label: string): string {
  const cleaned = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return cleaned || 'dokumen';
}

export function isMediaAttachment(fileName: string, mimeType?: string | null): boolean {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime === 'application/vnd.google-apps.folder' ||
    [
      'png',
      'jpg',
      'jpeg',
      'webp',
      'gif',
      'heic',
      'heif',
      'mp4',
      'mov',
      'webm',
      'mkv',
      'avi',
      'm4v',
      '3gp',
    ].includes(ext)
  );
}

export function isPdfAttachment(fileName: string, mimeType?: string | null): boolean {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();
  return mime.includes('pdf') || ext === 'pdf';
}

/**
 * Validasi & sanitasi array document_slots dari request Admin.
 * Mengembalikan null bila input adalah null (reset ke default otomatis),
 * atau array CategoryDocumentSlot[] (boleh kosong [] bila Admin sengaja ingin tanpa slot dokumen).
 */
export function normalizeDocumentSlots(raw: unknown): CategoryDocumentSlot[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;

  const seenKeys = new Set<string>();
  const result: CategoryDocumentSlot[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const label = String(obj.label || '').trim().slice(0, 80);
    if (!label) continue;

    let key = String(obj.key || '').trim();
    key = key ? slugifySlotKey(key) : slugifySlotKey(label);
    if (key === 'media' || key === 'other') {
      key = `doc_${key}`;
    }

    // Pastikan key unik di dalam 1 kategori
    let uniqueKey = key;
    let counter = 2;
    while (seenKeys.has(uniqueKey)) {
      uniqueKey = `${key}_${counter++}`;
    }
    seenKeys.add(uniqueKey);

    const rawAccept = String(obj.accept || 'ANY').toUpperCase();
    const accept: SlotAcceptType =
      rawAccept === 'PDF' || rawAccept === 'DOC' || rawAccept === 'ANY' ? rawAccept : 'ANY';

    const centralized = Boolean(obj.centralized);
    const rawCentralFolder = String(obj.centralFolderName || '').trim().slice(0, 90);
    const centralFolderName = centralized
      ? rawCentralFolder || `00 - ${label}`
      : undefined;

    result.push({
      key: uniqueKey,
      label,
      accept,
      centralized,
      ...(centralFolderName ? { centralFolderName } : {}),
      required: obj.required !== undefined ? Boolean(obj.required) : false,
    });
  }

  return result;
}

/**
 * Bawaan cerdas per nama kategori jika Admin belum menyimpan custom document_slots.
 * Foto & Video Dokumentasi selalu otomatis tersedia di semua kategori (tidak perlu dimasukkan di sini).
 */
export function getDefaultDocumentSlotsForCategoryName(
  categoryName?: string | null
): CategoryDocumentSlot[] {
  const lower = (categoryName || '').toLowerCase();

  if (/pmb|sosialisasi|sekolah/.test(lower)) {
    return [
      {
        key: 'daftar_hadir',
        label: 'Scan Daftar Hadir Siswa (PDF)',
        accept: 'PDF',
        centralized: true,
        centralFolderName: '00 - Daftar Hadir (Semua Sekolah)',
        required: true,
      },
    ];
  }

  if (/expo|pameran|edufair/.test(lower)) {
    return [
      {
        key: 'daftar_hadir',
        label: 'Scan Daftar Hadir / Pengunjung',
        accept: 'ANY',
        centralized: true,
        centralFolderName: '00 - Daftar Hadir (Semua Expo)',
        required: true,
      },
    ];
  }

  if (/akademik|perkuliahan|kuliah|ujian|wisuda|yudisium/.test(lower)) {
    return [
      {
        key: 'berita_acara',
        label: 'Berita Acara / Notulensi',
        accept: 'DOC',
        centralized: false,
        required: true,
      },
      {
        key: 'daftar_hadir',
        label: 'Daftar Hadir Peserta',
        accept: 'PDF',
        centralized: false,
        required: false,
      },
      {
        key: 'surat_sk_materi',
        label: 'Surat / SK / Materi',
        accept: 'ANY',
        centralized: false,
        required: false,
      },
    ];
  }

  if (/pelatihan|seminar|workshop|webinar/.test(lower)) {
    return [
      {
        key: 'daftar_hadir',
        label: 'Daftar Hadir Peserta',
        accept: 'PDF',
        centralized: false,
        required: true,
      },
      {
        key: 'materi',
        label: 'Materi / Modul',
        accept: 'ANY',
        centralized: false,
        required: false,
      },
      {
        key: 'laporan',
        label: 'Laporan / Sertifikat',
        accept: 'PDF',
        centralized: false,
        required: false,
      },
    ];
  }

  if (/rapat|koordinasi|evaluasi/.test(lower)) {
    return [
      {
        key: 'notulensi',
        label: 'Notulensi Rapat',
        accept: 'DOC',
        centralized: false,
        required: true,
      },
      {
        key: 'daftar_hadir',
        label: 'Daftar Hadir Rapat',
        accept: 'PDF',
        centralized: false,
        required: false,
      },
    ];
  }

  return [
    {
      key: 'dokumen_kegiatan',
      label: 'Dokumen / Laporan Kegiatan',
      accept: 'ANY',
      centralized: false,
      required: false,
    },
  ];
}

/**
 * Mengembalikan slot dokumen efektif milik suatu kategori:
 * - Jika Admin sudah pernah mengatur `document_slots` (bukan null/undefined), gunakan persis aturan Admin (termasuk [] bila dikosongkan).
 * - Jika belum (null/undefined), gunakan default otomatis berdasarkan nama kategori.
 */
export function getEffectiveDocumentSlots(
  category?: { name?: string | null; document_slots?: unknown } | null
): CategoryDocumentSlot[] {
  if (category && category.document_slots !== null && category.document_slots !== undefined) {
    const normalized = normalizeDocumentSlots(category.document_slots);
    if (normalized !== null) return normalized;
  }
  return getDefaultDocumentSlotsForCategoryName(category?.name);
}

/**
 * Mencocokkan lampiran lama (yang slot_key-nya masih null) maupun baru ke slot yang tepat.
 */
export function resolveAttachmentSlotKey(
  attachment: { slot_key?: string | null; file_name: string; mime_type?: string | null },
  slots: CategoryDocumentSlot[]
): string {
  if (attachment.slot_key) {
    if (attachment.slot_key === 'MEDIA' || attachment.slot_key === 'OTHER') {
      return attachment.slot_key;
    }
    if (slots.some((s) => s.key === attachment.slot_key)) {
      return attachment.slot_key;
    }
    return attachment.slot_key;
  }

  if (isMediaAttachment(attachment.file_name, attachment.mime_type)) {
    return 'MEDIA';
  }

  if (isPdfAttachment(attachment.file_name, attachment.mime_type)) {
    const daftarHadirSlot = slots.find(
      (s) => s.key.includes('daftar_hadir') || /daftar\s*hadir/i.test(s.label)
    );
    if (daftarHadirSlot) return daftarHadirSlot.key;

    const pdfSlot = slots.find((s) => s.accept === 'PDF');
    if (pdfSlot) return pdfSlot.key;
  }

  return 'OTHER';
}
