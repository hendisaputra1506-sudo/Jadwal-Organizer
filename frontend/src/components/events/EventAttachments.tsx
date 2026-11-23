import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  ExternalLink,
  Download,
  Trash2,
  UploadCloud,
  Loader2,
  Cloud,
  HardDrive,
  Camera,
  FolderOpen,
  Link2,
  X,
  FolderTree,
  Play,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Eye,
  FolderSync,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Card, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { api } from '../../services/api';
import { EventAttachment, DriveStatus, Category, CategoryDocumentSlot } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface EventAttachmentsProps {
  eventId: string;
  eventName?: string;
  category?: Category | null;
  initialAttachments?: EventAttachment[];
  onAttachmentChange?: () => void;
}

type AttachmentKind = 'IMAGE' | 'VIDEO' | 'PDF' | 'FOLDER' | 'OTHER';

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getBackendOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw || raw.startsWith('/')) return '';
  try {
    const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
    return new URL(withProto).origin;
  } catch {
    return '';
  }
}

function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const origin = getBackendOrigin();
    return origin ? `${origin}${url}` : url;
  }
  return url;
}

function extractDriveFileId(file: EventAttachment): string | null {
  if (file.drive_file_id) return file.drive_file_id;
  const url = file.drive_view_url || '';
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile?.[1]) return matchFile[1];
  const matchQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchQuery?.[1]) return matchQuery[1];
  return null;
}

function detectKind(fileName: string, mimeType?: string | null): AttachmentKind {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();

  if (mime === 'application/vnd.google-apps.folder') return 'FOLDER';
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return 'VIDEO';
  }
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'].includes(ext)
  ) {
    return 'IMAGE';
  }
  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  return 'OTHER';
}

function getThumbnailUrl(file: EventAttachment, width = 800): string | null {
  const kind = detectKind(file.file_name, file.mime_type);
  const driveId = extractDriveFileId(file);

  if (driveId) {
    // Google Drive thumbnail resmi bekerja cepat untuk Foto maupun Video!
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${width}`;
  }

  if (kind === 'IMAGE') {
    return resolveFileUrl(file.drive_view_url);
  }

  return null;
}

function getHighResImageFallback(file: EventAttachment): string | null {
  const driveId = extractDriveFileId(file);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}=w1600`;
  }
  return resolveFileUrl(file.drive_view_url);
}

function getDownloadUrl(file: EventAttachment): string {
  if (file.drive_download_url) return resolveFileUrl(file.drive_download_url);
  const driveId = extractDriveFileId(file);
  if (driveId) return `https://drive.google.com/uc?export=download&id=${driveId}`;
  return resolveFileUrl(file.drive_view_url);
}

function getEmbedPreviewUrl(file: EventAttachment): string | null {
  const driveId = extractDriveFileId(file);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  return resolveFileUrl(file.drive_view_url);
}

function getTargetSubfolderLabel(fileName: string, mimeType?: string): string {
  const kind = detectKind(fileName, mimeType);
  if (kind === 'IMAGE' || kind === 'VIDEO' || kind === 'FOLDER') {
    return 'Dokumentasi (Foto & Video)';
  }
  if (kind === 'PDF') return 'Daftar Hadir (PDF)';
  return 'Berkas Lainnya';
}

function getFileVisual(fileName: string, mimeType?: string | null) {
  const kind = detectKind(fileName, mimeType);
  switch (kind) {
    case 'FOLDER':
      return {
        Icon: FolderOpen,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        badge: 'Folder Drive',
      };
    case 'VIDEO':
      return {
        Icon: Video,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        badge: 'Video',
      };
    case 'IMAGE':
      return {
        Icon: ImageIcon,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        badge: 'Foto',
      };
    case 'PDF':
      return {
        Icon: FileText,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        badge: 'Daftar Hadir (PDF)',
      };
    default:
      return {
        Icon: File,
        color: 'text-slate-600 bg-slate-100 border-slate-200',
        badge: 'Berkas',
      };
  }
}

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB

function getSlotAcceptString(targetSlotKey: string, slots: CategoryDocumentSlot[]): string {
  if (targetSlotKey === 'MEDIA') {
    return 'image/*,video/*,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi';
  }
  const matched = slots.find((s) => s.key === targetSlotKey);
  if (matched?.accept === 'PDF') return '.pdf,application/pdf';
  if (matched?.accept === 'DOC') return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
  return 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi';
}

function resolveClientSlotKey(
  file: EventAttachment,
  slots: CategoryDocumentSlot[]
): string {
  if (file.slot_key) {
    if (file.slot_key === 'MEDIA' || file.slot_key === 'OTHER') return file.slot_key;
    if (slots.some((s) => s.key === file.slot_key)) return file.slot_key;
    return 'OTHER';
  }
  const kind = detectKind(file.file_name, file.mime_type);
  if (kind === 'IMAGE' || kind === 'VIDEO') return 'MEDIA';
  if (kind === 'PDF') {
    const daftarHadirSlot = slots.find(
      (s) => s.key.includes('daftar_hadir') || /daftar\s*hadir/i.test(s.label)
    );
    if (daftarHadirSlot) return daftarHadirSlot.key;
    const pdfSlot = slots.find((s) => s.accept === 'PDF');
    if (pdfSlot) return pdfSlot.key;
  }
  return 'OTHER';
}

export const EventAttachments: React.FC<EventAttachmentsProps> = ({
  eventId,
  eventName,
  category,
  initialAttachments = [],
  onAttachmentChange,
}) => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [attachments, setAttachments] = useState<EventAttachment[]>(initialAttachments);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MEDIA' | 'DOCS'>('ALL');
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Slot Dokumen Khusus Kategori ini
  const categorySlots = useMemo<CategoryDocumentSlot[]>(() => {
    if (category?.effective_document_slots) return category.effective_document_slots;
    if (category?.document_slots) return category.document_slots;
    return [];
  }, [category]);

  // Lightbox Preview State (Untuk kurasi Foto, Video, & PDF Press Release)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [lightboxUseFallbackImg, setLightboxUseFallbackImg] = useState<boolean>(false);

  // Upload / Link Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetSlotKey, setTargetSlotKey] = useState<string>('MEDIA');
  const [modalTab, setModalTab] = useState<'UPLOAD' | 'LINK'>('UPLOAD');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // External Drive Link State
  const [linkTitle, setLinkTitle] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkType, setLinkType] = useState<'DOCUMENTATION' | 'VIDEO' | 'ATTENDANCE_PDF' | 'DOCUMENT'>(
    'DOCUMENTATION'
  );

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<EventAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTargetSlot = useMemo(
    () => categorySlots.find((s) => s.key === targetSlotKey) || null,
    [categorySlots, targetSlotKey]
  );

  const openUploadForSlot = (slotKey: string) => {
    setTargetSlotKey(slotKey);
    setModalTab('UPLOAD');
    setSelectedFiles([]);
    if (slotKey === 'MEDIA') {
      setLinkType('DOCUMENTATION');
    } else if (slotKey.includes('daftar_hadir')) {
      setLinkType('ATTENDANCE_PDF');
    } else {
      setLinkType('DOCUMENT');
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (initialAttachments && initialAttachments.length > 0) {
      setAttachments(initialAttachments);
    }
  }, [initialAttachments]);

  const fetchAttachmentsAndStatus = useCallback(async () => {
    try {
      const [attRes, statusRes]: [any, any] = await Promise.all([
        api.get(`/attachments/event/${eventId}`),
        api.get('/attachments/status'),
      ]);

      if (attRes.success && attRes.data) {
        setAttachments(attRes.data);
      }
      if (statusRes.success && statusRes.data) {
        setDriveStatus(statusRes.data);
      }
    } catch (err) {
      console.error('Error fetching attachments or drive status:', err);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAttachmentsAndStatus();
  }, [fetchAttachmentsAndStatus]);

  // Kelompokkan lampiran menjadi: Media (Foto & Video), Slot Kategori, dan Berkas Lainnya
  const { mediaItems, slotFilesMap, otherDocItems, totalDocsCount } = useMemo(() => {
    const media: EventAttachment[] = [];
    const bySlot: Record<string, EventAttachment[]> = {};
    categorySlots.forEach((s) => {
      bySlot[s.key] = [];
    });
    const others: EventAttachment[] = [];

    for (const att of attachments) {
      const key = resolveClientSlotKey(att, categorySlots);
      const kind = detectKind(att.file_name, att.mime_type);
      if (key === 'MEDIA' && (kind === 'IMAGE' || kind === 'VIDEO')) {
        media.push(att);
      } else if (key !== 'MEDIA' && bySlot[key]) {
        bySlot[key].push(att);
      } else {
        others.push(att);
      }
    }

    const docsCount =
      Object.values(bySlot).reduce((acc, arr) => acc + arr.length, 0) + others.length;

    return {
      mediaItems: media,
      slotFilesMap: bySlot,
      otherDocItems: others,
      totalDocsCount: docsCount,
    };
  }, [attachments, categorySlots]);

  // Semua item yang bisa di-preview di Lightbox (Foto, Video, & PDF)
  const previewableItems = useMemo(
    () =>
      attachments.filter((a) => {
        const k = detectKind(a.file_name, a.mime_type);
        return k === 'IMAGE' || k === 'VIDEO' || k === 'PDF';
      }),
    [attachments]
  );

  const activePreviewFile =
    previewIndex !== null && previewableItems[previewIndex]
      ? previewableItems[previewIndex]
      : null;

  const openPreview = (file: EventAttachment) => {
    const idx = previewableItems.findIndex((item) => item.id === file.id);
    if (idx >= 0) {
      setLightboxUseFallbackImg(false);
      setPreviewIndex(idx);
    } else {
      window.open(resolveFileUrl(file.drive_view_url), '_blank', 'noopener,noreferrer');
    }
  };

  // Keyboard navigation in Lightbox (Left / Right / Esc)
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewIndex(null);
      } else if (e.key === 'ArrowRight' && previewableItems.length > 1) {
        setLightboxUseFallbackImg(false);
        setPreviewIndex((prev) =>
          prev === null ? null : (prev + 1) % previewableItems.length
        );
      } else if (e.key === 'ArrowLeft' && previewableItems.length > 1) {
        setLightboxUseFallbackImg(false);
        setPreviewIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + previewableItems.length) % previewableItems.length
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewIndex, previewableItems.length]);

  const handleCopyLink = async (file: EventAttachment) => {
    try {
      await navigator.clipboard.writeText(resolveFileUrl(file.drive_view_url));
      setCopiedId(file.id);
      success('Tautan berkas disalin — siap dibagikan ke tim humas / press release!');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toastError('Gagal menyalin tautan.');
    }
  };

  const addFilesToSelection = (incoming: FileList | File[]) => {
    const valid: File[] = [];
    Array.from(incoming).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toastError(
          `"${file.name}" melebihi batas 150 MB. Untuk video sangat besar, gunakan tab Tautkan Link Drive.`
        );
        return;
      }
      valid.push(file);
    });

    if (valid.length === 0) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > 15) {
        toastError('Maksimal 15 file dalam satu kali unggah.');
        return merged.slice(0, 15);
      }
      return merged;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToSelection(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToSelection(e.dataTransfer.files);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedFiles([]);
    setLinkTitle('');
    setLinkUrl('');
    setLinkType('DOCUMENTATION');
    setModalTab('UPLOAD');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    const resolvedSlotLabel =
      targetSlotKey === 'MEDIA'
        ? 'Dokumentasi (Foto & Video)'
        : activeTargetSlot?.label || 'Berkas Lainnya';

    if (modalTab === 'LINK') {
      if (!linkTitle.trim() || !linkUrl.trim()) {
        toastError('Judul dan tautan Google Drive wajib diisi.');
        return;
      }
      setIsUploading(true);
      try {
        const res: any = await api.post(`/attachments/event/${eventId}/link`, {
          title: linkTitle.trim(),
          url: linkUrl.trim(),
          linkType,
          slotKey: targetSlotKey,
          slotLabel: resolvedSlotLabel,
        });
        if (res.success) {
          success(res.message || 'Tautan Google Drive berhasil ditambahkan.');
          resetModal();
          await fetchAttachmentsAndStatus();
          onAttachmentChange?.();
        }
      } catch (err: any) {
        toastError(err.message || 'Gagal menyimpan tautan.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      let res: any;
      if (selectedFiles.length === 1) {
        const formData = new FormData();
        formData.append('file', selectedFiles[0]);
        formData.append('slotKey', targetSlotKey);
        formData.append('slotLabel', resolvedSlotLabel);
        res = await api.upload(`/attachments/event/${eventId}`, formData);
      } else {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append('files', f));
        formData.append('slotKey', targetSlotKey);
        formData.append('slotLabel', resolvedSlotLabel);
        res = await api.upload(`/attachments/event/${eventId}/batch`, formData);
      }

      if (res.success) {
        success(res.message || 'Berkas berhasil diunggah.');
        resetModal();
        await fetchAttachmentsAndStatus();
        onAttachmentChange?.();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal mengunggah berkas.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res: any = await api.delete(`/attachments/${deleteTarget.id}`);
      if (res.success) {
        success(res.message || 'Lampiran berhasil dihapus.');
        setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
        setPreviewIndex(null);
        onAttachmentChange?.();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus lampiran.');
    } finally {
      setIsDeleting(false);
    }
  };

  const showMediaSection = activeFilter === 'ALL' || activeFilter === 'MEDIA';
  const showDocSection = activeFilter === 'ALL' || activeFilter === 'DOCS';

  const renderDocFileRow = (file: EventAttachment) => {
    const kind = detectKind(file.file_name, file.mime_type);
    const { Icon, color, badge } = getFileVisual(file.file_name, file.mime_type);
    const downloadHref = getDownloadUrl(file);
    const formattedDate = new Date(file.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <div
        key={file.id}
        className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 shadow-xs flex items-start gap-2.5 justify-between group"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h5
              onClick={() => openPreview(file)}
              className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight hover:text-blue-600 cursor-pointer"
              title={file.file_name}
            >
              {file.file_name}
            </h5>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-600">{badge}</span>
              {file.file_size ? (
                <>
                  <span>•</span>
                  <span>{formatFileSize(file.file_size)}</span>
                </>
              ) : null}
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5 no-print">
          {kind === 'PDF' && (
            <button
              type="button"
              onClick={() => openPreview(file)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Pratinjau PDF"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={resolveFileUrl(file.drive_view_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Buka di Google Drive"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {kind !== 'FOLDER' && (
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Unduh File"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeleteTarget(file)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Hapus Permanen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-clay-sm bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg">
                Dokumentasi &amp; Dokumen Kegiatan
              </CardTitle>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                  {attachments.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Slot dokumen otomatis menyesuaikan kategori{' '}
              <span className="font-semibold text-slate-700">{category?.name || 'Kegiatan'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {driveStatus && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                driveStatus.isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={driveStatus.message}
            >
              {driveStatus.isConfigured ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Drive Aktif</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                  <span>Penyimpanan Lokal</span>
                </>
              )}
            </div>
          )}

          <Button
            size="sm"
            leftIcon={<UploadCloud className="w-4 h-4" />}
            onClick={() => openUploadForSlot('MEDIA')}
            className="no-print"
          >
            Unggah Foto/Video
          </Button>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap no-print">
          {[
            { id: 'ALL', label: `Semua (${attachments.length})` },
            { id: 'MEDIA', label: `Foto & Video (${mediaItems.length})` },
            { id: 'DOCS', label: `Dokumen ${category?.name || 'Kegiatan'} (${totalDocsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* =================================================================
            ZONA 1: GALERI VISUAL FOTO & VIDEO (Selalu Ada untuk Press Release)
            ================================================================= */}
        {showMediaSection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Galeri Dokumentasi Foto &amp; Video ({mediaItems.length})</span>
              </h4>
              <div className="flex items-center gap-2">
                {mediaItems.length > 0 && (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Klik untuk perbesar HD / putar video
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openUploadForSlot('MEDIA')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer no-print"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Foto / Video</span>
                </button>
              </div>
            </div>

            {mediaItems.length === 0 ? (
              <div className="py-6 px-4 text-center border-2 border-dashed border-slate-200 rounded-clay-sm bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada foto atau video dokumentasi
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                  Unggah foto &amp; video agar langsung tampil sebagai galeri pratinjau Press Release.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                  onClick={() => openUploadForSlot('MEDIA')}
                  className="no-print"
                >
                  Unggah Foto / Video
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {mediaItems.map((file, idx) => {
                    const kind = detectKind(file.file_name, file.mime_type);
                    const isVideo = kind === 'VIDEO';
                    const driveId = extractDriveFileId(file);
                    const thumbUrl = getThumbnailUrl(file, 800);
                    const thumbFailed = Boolean(failedThumbIds[file.id]);
                    const localVideoUrl =
                      isVideo && !driveId ? resolveFileUrl(file.drive_view_url) : null;
                    const downloadHref = getDownloadUrl(file);

                    return (
                      <div
                        key={file.id}
                        style={{ ['--stagger-i' as any]: Math.min(idx, 8) }}
                        className="rounded-clay-sm border border-slate-200/90 bg-white shadow-clay-sm interactive-card animate-card-reveal overflow-hidden flex flex-col group"
                      >
                        {/* Media Thumbnail Preview Area */}
                        <div
                          onClick={() => openPreview(file)}
                          className="relative aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
                        >
                          {localVideoUrl ? (
                            <video
                              src={localVideoUrl}
                              preload="metadata"
                              muted
                              playsInline
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : thumbUrl && !thumbFailed ? (
                            <img
                              src={thumbUrl}
                              alt={file.file_name}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedThumbIds((prev) => ({ ...prev, [file.id]: true }))
                              }
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                              {isVideo ? (
                                <Video className="w-9 h-9 text-indigo-300" />
                              ) : (
                                <ImageIcon className="w-9 h-9 text-purple-300" />
                              )}
                              <span className="text-[11px] text-slate-300">
                                Klik untuk membuka pratinjau
                              </span>
                            </div>
                          )}

                          {/* Top-Left Media Type Badge */}
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-xs flex items-center gap-1 ${
                              isVideo
                                ? 'bg-indigo-600/90 text-white'
                                : 'bg-slate-900/75 text-white'
                            }`}
                          >
                            {isVideo ? (
                              <>
                                <Video className="w-3 h-3" /> Video
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3" /> Foto
                              </>
                            )}
                          </span>

                          {/* Center Play Button for Video OR Hover Zoom Overlay for Photo */}
                          {isVideo ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/25 group-hover:bg-slate-900/40 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-white/95 text-indigo-600 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-indigo-600 ml-0.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold shadow-md">
                                <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                                Perbesar
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Name + Press Release Quick Actions */}
                        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 bg-white border-t border-slate-100">
                          <div className="min-w-0 flex-1">
                            <p
                              onClick={() => openPreview(file)}
                              className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600"
                              title={file.file_name}
                            >
                              {file.file_name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {file.file_size ? formatFileSize(file.file_size) : 'Google Drive'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 no-print">
                            {/* Download HD Original */}
                            <a
                              href={downloadHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              title="Unduh File Asli (HD) untuk Press Release"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            {/* Copy Share Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyLink(file)}
                              title="Salin Link untuk Tim Humas"
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
                            >
                              {copiedId === file.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Admin Delete */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(file)}
                                title="Hapus Dokumentasi"
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* =================================================================
            ZONA 2: SLOT DOKUMEN KHUSUS KATEGORI (Otomatis Sesuai Kategori!)
            ================================================================= */}
        {showDocSection && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  Dokumen Khusus Kategori {category?.name || 'Kegiatan'} ({totalDocsCount})
                </span>
              </h4>
              <button
                type="button"
                onClick={() => openUploadForSlot('OTHER')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer no-print"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Berkas / Link Lainnya</span>
              </button>
            </div>

            {categorySlots.length > 0 && (
              <div className="space-y-3">
                {categorySlots.map((slot) => {
                  const filesInSlot = slotFilesMap[slot.key] || [];
                  const hasFiles = filesInSlot.length > 0;
                  return (
                    <div
                      key={slot.key}
                      className={`rounded-clay-sm border p-3.5 sm:p-4 space-y-3 transition-colors ${
                        slot.centralized
                          ? 'bg-indigo-50/30 border-indigo-200/80'
                          : 'bg-slate-50/50 border-slate-200/80'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {slot.label}
                            </span>

                            {hasFiles ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                {filesInSlot.length} Berkas
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100/80 text-amber-800">
                                Belum diunggah
                              </span>
                            )}

                            {slot.centralized && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"
                                title={`Semua file pada slot ini otomatis disatukan di 1 folder Google Drive: ${category?.name || ''} / ${slot.centralFolderName || slot.label}`}
                              >
                                <FolderSync className="w-3 h-3" />
                                Disatukan 1 Folder Drive
                              </span>
                            )}
                          </div>

                          {slot.centralized && (
                            <p className="text-[11px] text-indigo-700/85">
                              Otomatis tersimpan di folder gabungan:{' '}
                              <span className="font-mono font-semibold">
                                {category?.name || 'Kategori'} /{' '}
                                {slot.centralFolderName || `00 - ${slot.label}`}
                              </span>
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={hasFiles ? 'outline' : 'primary'}
                          leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                          onClick={() => openUploadForSlot(slot.key)}
                          className="no-print flex-shrink-0"
                        >
                          {hasFiles ? 'Tambah File' : `Unggah ${slot.accept === 'PDF' ? 'PDF' : 'Dokumen'}`}
                        </Button>
                      </div>

                      {/* Slot Files List */}
                      {hasFiles ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {filesInSlot.map((file) => renderDocFileRow(file))}
                        </div>
                      ) : (
                        <div className="py-3 px-3 rounded-xl border border-dashed border-slate-300/80 bg-white/70 text-[11px] text-slate-400">
                          Klik tombol di samping untuk langsung mengunggah{' '}
                          <strong className="text-slate-600">{slot.label}</strong>
                          {eventName ? ` untuk ${eventName}` : ''}.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ZONA 3: BERKAS TAMBAHAN / LAINNYA (Di luar slot kategori) */}
            {otherDocItems.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Berkas &amp; Tautan Tambahan Lainnya ({otherDocItems.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {otherDocItems.map((file) => renderDocFileRow(file))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* =====================================================================
          FULLSCREEN LIGHTBOX PREVIEW MODAL (Foto HD, Player Video, & PDF!)
          ===================================================================== */}
      {activePreviewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col animate-backdrop-in no-print"
          onClick={() => setPreviewIndex(null)}
        >
          {/* Top Bar: Info + Press Release Download & Share Actions */}
          <div
            className="px-3.5 sm:px-6 py-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-blue-200 text-xs font-mono font-bold flex-shrink-0">
                {(previewIndex ?? 0) + 1} / {previewableItems.length}
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {activePreviewFile.file_name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {getFileVisual(activePreviewFile.file_name, activePreviewFile.mime_type).badge}
                  {activePreviewFile.file_size
                    ? ` • ${formatFileSize(activePreviewFile.file_size)}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Salin Link */}
              <button
                type="button"
                onClick={() => handleCopyLink(activePreviewFile)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedId === activePreviewFile.id ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Salin Link</span>
              </button>

              {/* Unduh HD Original (Press Release Ready!) */}
              <a
                href={getDownloadUrl(activePreviewFile)}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Unduh HD (Press Release)</span>
                <span className="sm:hidden">Unduh</span>
              </a>

              {/* Buka di Tab Baru Google Drive */}
              <a
                href={resolveFileUrl(activePreviewFile.drive_view_url)}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka di Google Drive"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Close */}
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                title="Tutup (Esc)"
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Media Stage */}
          <div
            className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {previewableItems.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxUseFallbackImg(false);
                  setPreviewIndex((prev) =>
                    prev === null
                      ? null
                      : (prev - 1 + previewableItems.length) % previewableItems.length
                  );
                }}
                aria-label="Sebelumnya"
                className="absolute left-2 sm:left-5 z-20 p-2.5 sm:p-3 rounded-full bg-slate-900/75 hover:bg-blue-600 text-white border border-white/15 shadow-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Preview Content */}
            {(() => {
              const kind = detectKind(activePreviewFile.file_name, activePreviewFile.mime_type);
              const driveId = extractDriveFileId(activePreviewFile);

              if (kind === 'IMAGE') {
                const imgSrc = lightboxUseFallbackImg
                  ? getHighResImageFallback(activePreviewFile)
                  : getThumbnailUrl(activePreviewFile, 1600);
                return (
                  <img
                    key={activePreviewFile.id}
                    src={imgSrc || ''}
                    alt={activePreviewFile.file_name}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (!lightboxUseFallbackImg) setLightboxUseFallbackImg(true);
                    }}
                    className="max-h-[72vh] max-w-[90vw] object-contain rounded-xl shadow-2xl animate-modal-spring"
                  />
                );
              }

              if (kind === 'VIDEO') {
                if (driveId) {
                  return (
                    <iframe
                      key={activePreviewFile.id}
                      src={getEmbedPreviewUrl(activePreviewFile) || ''}
                      title={activePreviewFile.file_name}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="w-full max-w-4xl aspect-video rounded-xl shadow-2xl bg-black border border-white/10 animate-modal-spring"
                    />
                  );
                }
                return (
                  <video
                    key={activePreviewFile.id}
                    src={resolveFileUrl(activePreviewFile.drive_view_url)}
                    controls
                    autoPlay
                    className="max-h-[72vh] max-w-[90vw] rounded-xl shadow-2xl bg-black animate-modal-spring"
                  />
                );
              }

              // PDF Preview
              return (
                <iframe
                  key={activePreviewFile.id}
                  src={getEmbedPreviewUrl(activePreviewFile) || ''}
                  title={activePreviewFile.file_name}
                  className="w-full max-w-4xl h-[74vh] rounded-xl shadow-2xl bg-white border border-white/15 animate-modal-spring"
                />
              );
            })()}

            {/* Next Button */}
            {previewableItems.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxUseFallbackImg(false);
                  setPreviewIndex((prev) =>
                    prev === null ? null : (prev + 1) % previewableItems.length
                  );
                }}
                aria-label="Berikutnya"
                className="absolute right-2 sm:right-5 z-20 p-2.5 sm:p-3 rounded-full bg-slate-900/75 hover:bg-blue-600 text-white border border-white/15 shadow-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Filmstrip Thumbnails for Quick Selection */}
          {previewableItems.length > 1 && (
            <div
              className="px-4 py-2.5 bg-slate-900/90 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {previewableItems.map((item, idx) => {
                const isSelected = idx === previewIndex;
                const kind = detectKind(item.file_name, item.mime_type);
                const thumb = getThumbnailUrl(item, 240);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLightboxUseFallbackImg(false);
                      setPreviewIndex(idx);
                    }}
                    title={item.file_name}
                    className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer flex items-center justify-center bg-slate-800 ${
                      isSelected
                        ? 'border-sky-400 scale-105 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {thumb && kind !== 'PDF' ? (
                      <img
                        src={thumb}
                        alt={item.file_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : kind === 'PDF' ? (
                      <FileText className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Video className="w-4 h-4 text-indigo-400" />
                    )}
                    {kind === 'VIDEO' && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-3 h-3 text-white fill-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload & Link Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isUploading) resetModal();
        }}
        title={
          targetSlotKey === 'MEDIA'
            ? 'Unggah Foto & Video Dokumentasi'
            : activeTargetSlot
            ? `Unggah: ${activeTargetSlot.label}`
            : 'Unggah Berkas / Tautan Lainnya'
        }
        description={
          activeTargetSlot?.centralized
            ? `Otomatis masuk ke folder gabungan Google Drive: ${category?.name || 'Kategori'} / ${activeTargetSlot.centralFolderName || `00 - ${activeTargetSlot.label}`}`
            : 'Berkas otomatis dirapikan ke folder Google Drive kegiatan sesuai kategori.'
        }
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={resetModal} disabled={isUploading}>
              Batal
            </Button>
            <Button
              size="sm"
              leftIcon={
                isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modalTab === 'LINK' ? (
                  <Link2 className="w-4 h-4" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )
              }
              onClick={handleUpload}
              disabled={
                isUploading ||
                (modalTab === 'UPLOAD'
                  ? selectedFiles.length === 0
                  : !linkTitle.trim() || !linkUrl.trim())
              }
            >
              {isUploading
                ? modalTab === 'LINK'
                  ? 'Menyimpan...'
                  : `Mengunggah ${selectedFiles.length} berkas...`
                : modalTab === 'LINK'
                ? 'Simpan Tautan'
                : `Unggah ${selectedFiles.length > 0 ? `(${selectedFiles.length} Berkas)` : 'Sekarang'}`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Slot Tujuan Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Slot Penyimpanan ({category?.name || 'Kegiatan'})
            </label>
            <Select
              value={targetSlotKey}
              onChange={(e) => setTargetSlotKey(e.target.value)}
              disabled={isUploading}
            >
              <option value="MEDIA">📷 Galeri Dokumentasi (Foto &amp; Video)</option>
              {categorySlots.map((slot) => (
                <option key={slot.key} value={slot.key}>
                  {slot.centralized ? '📁 ' : '📄 '}
                  {slot.label}
                  {slot.centralized ? ' — Disatukan 1 Folder Drive' : ''}
                </option>
              ))}
              <option value="OTHER">📎 Berkas / Tautan Lainnya</option>
            </Select>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setModalTab('UPLOAD')}
              disabled={isUploading}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'UPLOAD'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('LINK')}
              disabled={isUploading}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'LINK'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Tautkan Link Drive</span>
            </button>
          </div>

          {modalTab === 'UPLOAD' ? (
            <>
              {/* Drag & Drop Multi-File Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 sm:p-6 border-2 border-dashed rounded-clay-sm text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/60'
                    : selectedFiles.length > 0
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={getSlotAcceptString(targetSlotKey, categorySlots)}
                />

                <div className="space-y-2">
                  <div className="w-11 h-11 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik untuk memilih file atau seret ke sini
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {targetSlotKey === 'MEDIA'
                        ? 'Foto (JPG/PNG/WEBP/HEIC) & Video (MP4/MOV/WEBM) — Maks. 150 MB/file, hingga 15 file'
                        : activeTargetSlot?.accept === 'PDF'
                        ? 'Scan / Dokumen PDF (Maks. 150 MB/file)'
                        : 'PDF, Word, Excel, PowerPoint, Foto, atau Video (Maks. 150 MB/file)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Files List with Auto-Folder Destination Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Berkas siap diunggah ({selectedFiles.length})</span>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  {selectedFiles.map((file, idx) => {
                    const { Icon, color } = getFileVisual(file.name, file.type);
                    const targetFolderDisplay =
                      targetSlotKey === 'MEDIA'
                        ? 'Dokumentasi (Foto & Video)'
                        : activeTargetSlot?.centralized
                        ? `${category?.name || 'Kategori'} / ${activeTargetSlot.centralFolderName || `00 - ${activeTargetSlot.label}`}`
                        : activeTargetSlot
                        ? `Dokumen Kegiatan (${activeTargetSlot.label})`
                        : getTargetSubfolderLabel(file.name, file.type);
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span
                                className={`font-medium inline-flex items-center gap-1 ${
                                  activeTargetSlot?.centralized ? 'text-indigo-700' : 'text-blue-700'
                                }`}
                              >
                                {activeTargetSlot?.centralized ? (
                                  <FolderSync className="w-3 h-3" />
                                ) : (
                                  <FolderTree className="w-3 h-3" />
                                )}
                                {targetFolderDisplay}
                              </span>
                            </p>
                          </div>
                        </div>
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Auto-Folder Structure Note */}
              <div
                className={`p-3 rounded-clay-sm text-xs flex items-start gap-2 border ${
                  activeTargetSlot?.centralized
                    ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
                    : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                }`}
              >
                {activeTargetSlot?.centralized ? (
                  <FolderSync className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <FolderTree className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 leading-relaxed">
                  {activeTargetSlot?.centralized ? (
                    <>
                      <p className="font-bold">Folder Gabungan Google Drive (Semua Sekolah/Kegiatan):</p>
                      <p className="text-[11px] text-indigo-800 font-mono">
                        {category?.name || 'Kategori'} &rarr;{' '}
                        {activeTargetSlot.centralFolderName || `00 - ${activeTargetSlot.label}`}
                      </p>
                      <p className="text-[11px] text-indigo-700">
                        Nama file otomatis dirapikan dengan <strong>Tanggal &amp; Nama Kegiatan</strong>{' '}
                        agar tidak tertukar antar sekolah.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold">Tujuan Folder Otomatis Google Drive:</p>
                      <p className="text-[11px] text-blue-800 font-mono">
                        {category?.name || 'Kategori'} &rarr; {eventName || 'Nama Kegiatan'} &rarr;{' '}
                        {targetSlotKey === 'MEDIA'
                          ? 'Dokumentasi (Foto & Video)'
                          : 'Dokumen Kegiatan'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul / Keterangan Tautan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Contoh: Folder Dokumentasi Lengkap / Scan Daftar Hadir"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan (URL) Google Drive <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... atau /drive/folders/..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Tautan
                </label>
                <Select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as any)}
                >
                  <option value="DOCUMENTATION">Folder / Album Dokumentasi (Foto &amp; Video)</option>
                  <option value="VIDEO">Video Dokumentasi</option>
                  <option value="ATTENDANCE_PDF">Scan Daftar Hadir (PDF)</option>
                  <option value="DOCUMENT">Dokumen Kegiatan (PDF/Word/Excel/PPT)</option>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Berkas Lampiran"
        message="Apakah Anda yakin ingin menghapus berkas ini secara permanen dari aplikasi dan Google Drive?"
        itemName={deleteTarget?.file_name}
        confirmText="Hapus Permanen"
        isLoading={isDeleting}
      />
    </Card>
  );
};
