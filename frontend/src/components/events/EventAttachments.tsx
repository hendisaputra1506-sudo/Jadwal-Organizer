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
} from 'lucide-react';
import { Card, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { api } from '../../services/api';
import { EventAttachment, DriveStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface EventAttachmentsProps {
  eventId: string;
  initialAttachments?: EventAttachment[];
  onAttachmentChange?: () => void;
}

type AttachmentCategory = 'MEDIA' | 'PDF' | 'OTHER';

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function classifyAttachment(fileName: string, mimeType?: string | null): AttachmentCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime === 'application/vnd.google-apps.folder' ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return 'MEDIA';
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return 'PDF';
  }
  return 'OTHER';
}

function getTargetSubfolderLabel(fileName: string, mimeType?: string): string {
  const cat = classifyAttachment(fileName, mimeType);
  if (cat === 'MEDIA') return 'Dokumentasi (Foto & Video)';
  if (cat === 'PDF') return 'Daftar Hadir (PDF)';
  return 'Berkas Lainnya';
}

function getFileVisual(fileName: string, mimeType?: string | null) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();

  if (mime === 'application/vnd.google-apps.folder') {
    return {
      Icon: FolderOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: 'Folder Drive',
    };
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return {
      Icon: Video,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badge: 'Video',
    };
  }
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'].includes(ext)
  ) {
    return {
      Icon: ImageIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      badge: 'Foto',
    };
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return {
      Icon: FileText,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: 'Daftar Hadir (PDF)',
    };
  }
  return {
    Icon: File,
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    badge: 'Berkas',
  };
}

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB

export const EventAttachments: React.FC<EventAttachmentsProps> = ({
  eventId,
  initialAttachments = [],
  onAttachmentChange,
}) => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [attachments, setAttachments] = useState<EventAttachment[]>(initialAttachments);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MEDIA' | 'PDF'>('ALL');

  // Upload / Link Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'UPLOAD' | 'LINK'>('UPLOAD');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // External Drive Link State
  const [linkTitle, setLinkTitle] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkType, setLinkType] = useState<'DOCUMENTATION' | 'VIDEO' | 'ATTENDANCE_PDF'>(
    'DOCUMENTATION'
  );

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<EventAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const mediaCount = useMemo(
    () => attachments.filter((a) => classifyAttachment(a.file_name, a.mime_type) === 'MEDIA').length,
    [attachments]
  );
  const pdfCount = useMemo(
    () => attachments.filter((a) => classifyAttachment(a.file_name, a.mime_type) === 'PDF').length,
    [attachments]
  );

  const visibleAttachments = useMemo(() => {
    if (activeFilter === 'ALL') return attachments;
    return attachments.filter((a) => classifyAttachment(a.file_name, a.mime_type) === activeFilter);
  }, [attachments, activeFilter]);

  const addFilesToSelection = (incoming: FileList | File[]) => {
    const valid: File[] = [];
    Array.from(incoming).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toastError(`"${file.name}" melebihi batas 150 MB. Untuk video sangat besar, gunakan tab Tautkan Link Drive.`);
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
        res = await api.upload(`/attachments/event/${eventId}`, formData);
      } else {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append('files', f));
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
        onAttachmentChange?.();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus lampiran.');
    } finally {
      setIsDeleting(false);
    }
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
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">
                Dokumentasi & Daftar Hadir Kegiatan
              </CardTitle>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                  {attachments.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Foto, video dokumentasi, serta scan PDF daftar hadir siswa (tersortir otomatis di Google Drive)
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
                  <span>Belum Terhubung Drive</span>
                </>
              )}
            </div>
          )}

          <Button
            size="sm"
            leftIcon={<UploadCloud className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="no-print"
          >
            Upload / Tautkan
          </Button>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Filter Pills */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap no-print">
            {[
              { id: 'ALL', label: `Semua (${attachments.length})` },
              { id: 'MEDIA', label: `Foto & Video (${mediaCount})` },
              { id: 'PDF', label: `Daftar Hadir PDF (${pdfCount})` },
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
        )}

        {attachments.length === 0 ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-clay-sm bg-slate-50/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Belum ada dokumentasi atau daftar hadir
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              Unggah foto, video kegiatan (hingga 150 MB), atau scan PDF daftar hadir siswa. Sistem
              otomatis memisahkan folder <strong>Dokumentasi (Foto & Video)</strong> dan{' '}
              <strong>Daftar Hadir (PDF)</strong> di Google Drive.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UploadCloud className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
              className="no-print"
            >
              Unggah Dokumentasi / Daftar Hadir
            </Button>
          </div>
        ) : visibleAttachments.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-clay-sm border border-dashed border-slate-200">
            Tidak ada berkas pada kategori filter ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {visibleAttachments.map((file) => {
              const { Icon, color, badge } = getFileVisual(file.file_name, file.mime_type);
              const formattedDate = new Date(file.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={file.id}
                  className="p-3.5 sm:p-4 rounded-clay-sm border border-slate-200/80 bg-white hover:border-blue-200 shadow-clay-sm interactive-card flex items-start gap-3 justify-between group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-clay-sm border flex items-center justify-center flex-shrink-0 ${color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4
                        className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight hover:text-blue-600 transition-colors"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-slate-400">
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
                      {(file.drive_file_id || file.drive_view_url.includes('drive.google.com')) && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-1">
                          <Cloud className="w-3 h-3" />
                          Tersimpan di Google Drive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5 no-print">
                    <a
                      href={file.drive_view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      title="Buka di Google Drive"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {file.drive_download_url && (
                      <a
                        href={file.drive_download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                        title="Unduh File"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    {/* Delete button - Khusus ADMIN */}
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(file)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Hapus Lampiran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Upload & Link Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isUploading) resetModal();
        }}
        title="Unggah Dokumentasi & Daftar Hadir"
        description="Foto, video, dan PDF daftar hadir otomatis masuk ke sub-folder Google Drive kegiatan."
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
              <span>Upload Foto / Video / PDF</span>
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
                  accept="image/*,video/*,.pdf,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi"
                />

                <div className="space-y-2">
                  <div className="w-11 h-11 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik untuk memilih banyak file sekaligus atau seret ke sini
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Foto (JPG/PNG/WEBP/HEIC), Video (MP4/MOV/WEBM), & Scan PDF Daftar Hadir (Maks.
                      150 MB/file, hingga 15 file sekaligus)
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
                    const subFolder = getTargetSubfolderLabel(file.name, file.type);
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
                              <span className="text-blue-700 font-medium inline-flex items-center gap-1">
                                <FolderTree className="w-3 h-3" />
                                {subFolder}
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
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-clay-sm text-xs text-blue-900 flex items-start gap-2">
                <FolderTree className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold">Struktur Folder Otomatis Google Drive (3 Tingkat):</p>
                  <p className="text-[11px] text-blue-800 font-mono">
                    Kategori &rarr; Nama Kegiatan &rarr; Dokumentasi (Foto & Video) / Daftar Hadir (PDF)
                  </p>
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
                  placeholder="Contoh: Folder Dokumentasi Sosialisasi / Video Rekap"
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
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Berkas
                </label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-clay-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DOCUMENTATION">Folder / Album Dokumentasi (Foto & Video)</option>
                  <option value="VIDEO">Video Dokumentasi</option>
                  <option value="ATTENDANCE_PDF">Daftar Hadir Siswa (PDF)</option>
                </select>
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
        message="Apakah Anda yakin ingin menghapus berkas ini dari kegiatan? (File Google Drive akan dipindahkan ke Sampah / Trash)."
        itemName={deleteTarget?.file_name}
        confirmText="Hapus Berkas"
        isLoading={isDeleting}
      />
    </Card>
  );
};
