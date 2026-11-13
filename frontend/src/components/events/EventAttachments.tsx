import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Presentation,
  ExternalLink,
  Download,
  Trash2,
  UploadCloud,
  Loader2,
  Cloud,
  HardDrive,
  Paperclip,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
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

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileName: string, mimeType?: string | null) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext) || mimeType?.includes('pdf')) {
    return {
      Icon: FileText,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      label: 'PDF',
    };
  }
  if (
    ['xlsx', 'xls', 'csv'].includes(ext) ||
    mimeType?.includes('spreadsheet') ||
    mimeType?.includes('excel')
  ) {
    return {
      Icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: 'Excel / Spreadsheet',
    };
  }
  if (['docx', 'doc'].includes(ext) || mimeType?.includes('word')) {
    return {
      Icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      label: 'Dokumen Word',
    };
  }
  if (
    ['pptx', 'ppt'].includes(ext) ||
    mimeType?.includes('presentation') ||
    mimeType?.includes('powerpoint')
  ) {
    return {
      Icon: Presentation,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      label: 'PowerPoint',
    };
  }
  if (
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ||
    mimeType?.startsWith('image/')
  ) {
    return {
      Icon: ImageIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      label: 'Gambar',
    };
  }
  return {
    Icon: File,
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    label: 'Dokumen',
  };
}

export const EventAttachments: React.FC<EventAttachmentsProps> = ({
  eventId,
  initialAttachments = [],
  onAttachmentChange,
}) => {
  const { user, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [attachments, setAttachments] = useState<EventAttachment[]>(initialAttachments);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<EventAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialAttachments changes
  useEffect(() => {
    if (initialAttachments && initialAttachments.length > 0) {
      setAttachments(initialAttachments);
    }
  }, [initialAttachments]);

  // Fetch status and attachments
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toastError('Ukuran file tidak boleh melebihi 25 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toastError('Ukuran file tidak boleh melebihi 25 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res: any = await api.upload(`/attachments/event/${eventId}`, formData);
      if (res.success) {
        success(res.message || 'File berhasil diunggah.');
        setIsModalOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchAttachmentsAndStatus();
        onAttachmentChange?.();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal mengunggah file.');
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
        success('Lampiran berhasil dihapus.');
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
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-clay-sm bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Dokumen & Lampiran Kegiatan</CardTitle>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                  {attachments.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Proposal, rundown, surat undangan, TOR, dan berkas pendukung kegiatan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Storage Mode Badge */}
          {driveStatus && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                driveStatus.isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title={driveStatus.message}
            >
              {driveStatus.isConfigured ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Drive</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Penyimpanan Server</span>
                </>
              )}
            </div>
          )}

          {/* Upload Button */}
          {user && (
            <Button
              size="sm"
              leftIcon={<UploadCloud className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
              className="no-print"
            >
              Upload File
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-4 sm:p-6">
        {attachments.length === 0 ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-clay-sm bg-slate-50/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Belum ada lampiran dokumen</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Unggah file proposal, susunan acara, surat undangan, atau materi untuk memudahkan
              akses seluruh tim.
            </p>
            {user && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={() => setIsModalOpen(true)}
                className="no-print"
              >
                Unggah Dokumen Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {attachments.map((file) => {
              const { Icon, color, label } = getFileIcon(file.file_name, file.mime_type);
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
                  className="p-3.5 sm:p-4 rounded-clay-sm border border-slate-200/80 bg-white hover:border-slate-300 shadow-clay-sm transition-all flex items-start gap-3 justify-between group"
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
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                        {file.file_size && <span>•</span>}
                        <span>{formattedDate}</span>
                      </div>
                      {file.drive_file_id && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-1">
                          <Cloud className="w-3 h-3" />
                          Tersimpan di Google Drive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5 no-print">
                    {/* Open in View/Google Drive */}
                    <a
                      href={file.drive_view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      title="Buka Dokumen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {/* Download Button if available */}
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

                    {/* Delete button for admin or authenticated user */}
                    {(isAdmin || user) && (
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

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isUploading) {
            setIsModalOpen(false);
            setSelectedFile(null);
          }
        }}
        title="Upload Dokumen Kegiatan"
        description="File akan diunggah dan disimpan ke Google Drive dengan hak akses tautan publik."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedFile(null);
              }}
              disabled={isUploading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              leftIcon={
                isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )
              }
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Mengunggah ke Drive...' : 'Unggah Sekarang'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 sm:p-8 border-2 border-dashed rounded-clay-sm text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg,.webp"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <p className="text-[11px] text-blue-600 font-medium">Klik untuk mengganti file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Klik untuk memilih atau seret file ke sini
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mendukung PDF, Word, Excel, PowerPoint, Gambar, ZIP (Maks. 25 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Drive status info note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-clay-sm text-xs text-slate-600 flex items-start gap-2">
            <Cloud className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              {driveStatus?.isConfigured
                ? 'File akan otomatis diunggah langsung ke folder Google Drive kampus dan tautan langsung dapat diakses anggota tim.'
                : 'Google Drive API belum dikonfigurasi pada file backend .env. File sementara disimpan di server lokal dengan aman.'}
            </span>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Lampiran Dokumen"
        message="Apakah Anda yakin ingin menghapus file lampiran ini dari kegiatan?"
        itemName={deleteTarget?.file_name}
        confirmText="Hapus Lampiran"
        isLoading={isDeleting}
      />
    </Card>
  );
};
