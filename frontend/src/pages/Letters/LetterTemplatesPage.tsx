import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  FolderOpen,
  HelpCircle,
  Sparkles,
  Clock,
  Building2,
  Copy,
  Check,
  X,
  FileDown,
  Info,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import {
  DownloadableTemplateItem,
  TemplateCategory,
  INITIAL_DOWNLOADABLE_TEMPLATES,
  LetterTemplateType,
} from '../../types/letterTemplates';
import { downloadWordTemplate } from '../../utils/wordDocumentGenerator';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

interface OutletContextType {
  onToggleSidebar: () => void;
}

const STORAGE_KEY = 'jadwal_kampus_downloadable_templates_v2';

export const LetterTemplatesPage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { isAdmin } = useAuth();
  const { success, error: toastError, info: toastInfo } = useToast();

  // Templates State (loaded from backend or fallback to local storage / defaults)
  const [templates, setTemplates] = useState<DownloadableTemplateItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_DOWNLOADABLE_TEMPLATES;
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('ALL');
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  // Detail Modal State
  const [activeDetailTemplate, setActiveDetailTemplate] = useState<DownloadableTemplateItem | null>(null);

  // Admin Add/Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<DownloadableTemplateItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'TUGAS' as LetterTemplateType,
    category: 'TUGAS' as TemplateCategory,
    categoryLabel: 'Surat Tugas & SPPD',
    description: '',
    fileFormat: 'DOCX' as 'DOCX' | 'DOTX' | 'PDF',
    fileSize: '45 KB',
    referenceNoPattern: '.../UTD-TEGAL/ST/XI/2026',
    driveViewUrl: '',
    driveDownloadUrl: '',
    instructions: '',
  });

  // Delete Confirm Dialog State
  const [templateToDelete, setTemplateToDelete] = useState<DownloadableTemplateItem | null>(null);

  // Save to localStorage whenever templates update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to cache templates:', e);
    }
  }, [templates]);

  // Load any user-created templates from backend API if available
  useEffect(() => {
    const fetchBackendRecords = async () => {
      try {
        const res: any = await api.get('/letters');
        if (res.success && res.data && res.data.length > 0) {
          // Merge with initial templates if backend has records
          const backendItems: DownloadableTemplateItem[] = res.data
            .map((rec: any) => {
              try {
                const payload = typeof rec.payload_json === 'string' ? JSON.parse(rec.payload_json) : rec.payload_json;
                if (payload && payload.isDownloadableCatalog) {
                  return {
                    id: rec.id,
                    title: rec.title,
                    type: rec.template_type as LetterTemplateType,
                    category: payload.category || 'TUGAS',
                    categoryLabel: payload.categoryLabel || 'Surat Tugas',
                    description: payload.description || '',
                    fileFormat: payload.fileFormat || 'DOCX',
                    fileSize: payload.fileSize || '45 KB',
                    referenceNoPattern: rec.reference_no || '.../UTD/2026',
                    driveViewUrl: payload.driveViewUrl || '',
                    driveDownloadUrl: payload.driveDownloadUrl || '',
                    instructions: payload.instructions || [],
                    lastUpdated: new Date(rec.updated_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                    updatedBy: rec.created_by?.name || 'Tata Usaha',
                  };
                }
              } catch {
                return null;
              }
              return null;
            })
            .filter(Boolean);

          if (backendItems.length > 0) {
            setTemplates((prev) => {
              const ids = new Set(backendItems.map((b) => b.id));
              const filteredPrev = prev.filter((p) => !ids.has(p.id));
              return [...backendItems, ...filteredPrev];
            });
          }
        }
      } catch (err) {
        // Non-critical, fallback to local templates
        console.warn('Backend letters API unavailable or empty:', err);
      }
    };

    fetchBackendRecords();
  }, []);

  // Filter Categories definition
  const categoryTabs: { key: TemplateCategory; label: string; count: number }[] = useMemo(() => {
    return [
      { key: 'ALL', label: 'Semua Template', count: templates.length },
      {
        key: 'TUGAS',
        label: 'Surat Tugas & SPPD',
        count: templates.filter((t) => t.category === 'TUGAS').length,
      },
      {
        key: 'KETERANGAN',
        label: 'Surat Keterangan',
        count: templates.filter((t) => t.category === 'KETERANGAN').length,
      },
      {
        key: 'UNDANGAN',
        label: 'Undangan & Rapat',
        count: templates.filter((t) => t.category === 'UNDANGAN').length,
      },
      {
        key: 'PERMOHONAN',
        label: 'Permohonan & Izin',
        count: templates.filter((t) => t.category === 'PERMOHONAN').length,
      },
      {
        key: 'AKADEMIK',
        label: 'Akademik & PMB',
        count: templates.filter((t) => t.category === 'AKADEMIK').length,
      },
    ];
  }, [templates]);

  // Filtered Templates based on search & category
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCat = selectedCategory === 'ALL' || tpl.category === selectedCategory;
      if (!matchCat) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tpl.title.toLowerCase().includes(q);
        const matchDesc = tpl.description.toLowerCase().includes(q);
        const matchRef = tpl.referenceNoPattern.toLowerCase().includes(q);
        const matchCatLabel = tpl.categoryLabel.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchRef || matchCatLabel;
      }

      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Handler: Download Document
  const handleDownload = (tpl: DownloadableTemplateItem) => {
    try {
      downloadWordTemplate(tpl);
      success(
        'Berkas template berhasil diunduh. Silakan buka dan edit di Microsoft Word.'
      );
    } catch (err) {
      console.error('Download error:', err);
      toastError('Gagal mengunduh berkas template.');
    }
  };

  // Handler: Open in Google Drive / Docs
  const handleOpenDrive = (tpl: DownloadableTemplateItem) => {
    const url = tpl.driveViewUrl || 'https://drive.google.com';
    window.open(url, '_blank', 'noopener,noreferrer');
    toastInfo('Membuka dokumen di tab Google Docs / Google Drive baru.');
  };

  // Handler: Copy Reference Number
  const handleCopyRef = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRefId(id);
    success(`Format nomor surat disalin: ${text}`);
    setTimeout(() => {
      setCopiedRefId(null);
    }, 2000);
  };

  // Admin: Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      type: 'TUGAS',
      category: 'TUGAS',
      categoryLabel: 'Surat Tugas & SPPD',
      description: '',
      fileFormat: 'DOCX',
      fileSize: '45 KB',
      referenceNoPattern: '.../UTD-TEGAL/ST/XI/2026',
      driveViewUrl: 'https://docs.google.com/document/d/...',
      driveDownloadUrl: '',
      instructions:
        '1. Ganti nomor registrasi surat tugas sesuai agenda TU.\n2. Lengkapi nama dan NIDN personil yang ditugaskan.\n3. Cetak pada kertas A4 bersurat resmi.',
    });
    setIsFormModalOpen(true);
  };

  // Admin: Open Edit Modal
  const handleOpenEditModal = (tpl: DownloadableTemplateItem) => {
    setEditingTemplate(tpl);
    setFormData({
      title: tpl.title,
      type: tpl.type,
      category: tpl.category,
      categoryLabel: tpl.categoryLabel,
      description: tpl.description,
      fileFormat: tpl.fileFormat,
      fileSize: tpl.fileSize,
      referenceNoPattern: tpl.referenceNoPattern,
      driveViewUrl: tpl.driveViewUrl || '',
      driveDownloadUrl: tpl.driveDownloadUrl || '',
      instructions: tpl.instructions.join('\n'),
    });
    setIsFormModalOpen(true);
  };

  // Admin: Save Create / Edit
  const handleSaveTemplate = async () => {
    if (!formData.title.trim()) {
      toastError('Judul template surat wajib diisi.');
      return;
    }

    const instructionList = formData.instructions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedItem: DownloadableTemplateItem = {
      id: editingTemplate ? editingTemplate.id : `tpl-${Date.now()}`,
      title: formData.title.trim(),
      type: formData.type,
      category: formData.category,
      categoryLabel:
        formData.category === 'TUGAS'
          ? 'Surat Tugas & SPPD'
          : formData.category === 'KETERANGAN'
          ? 'Surat Keterangan'
          : formData.category === 'UNDANGAN'
          ? 'Undangan & Rapat'
          : formData.category === 'PERMOHONAN'
          ? 'Permohonan & Izin'
          : 'Akademik & PMB',
      description: formData.description.trim(),
      fileFormat: formData.fileFormat,
      fileSize: formData.fileSize.trim() || '45 KB',
      referenceNoPattern: formData.referenceNoPattern.trim(),
      driveViewUrl: formData.driveViewUrl.trim() || undefined,
      driveDownloadUrl: formData.driveDownloadUrl.trim() || undefined,
      instructions: instructionList.length > 0 ? instructionList : ['Edit bagian bertanda kuning di Word.'],
      lastUpdated: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      updatedBy: 'BAAK & Tata Usaha',
    };

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? updatedItem : t))
      );
      success('Template surat berhasil diperbarui.');
    } else {
      setTemplates((prev) => [updatedItem, ...prev]);
      success('Template surat baru berhasil ditambahkan.');
    }

    // Try persisting to backend as well (silent failover to local if network error)
    try {
      await api.post('/letters', {
        id: editingTemplate ? editingTemplate.id : undefined,
        template_type: updatedItem.type,
        title: updatedItem.title,
        reference_no: updatedItem.referenceNoPattern,
        payload_json: {
          isDownloadableCatalog: true,
          category: updatedItem.category,
          categoryLabel: updatedItem.categoryLabel,
          description: updatedItem.description,
          fileFormat: updatedItem.fileFormat,
          fileSize: updatedItem.fileSize,
          driveViewUrl: updatedItem.driveViewUrl,
          driveDownloadUrl: updatedItem.driveDownloadUrl,
          instructions: updatedItem.instructions,
        },
      });
    } catch {
      // already saved in localStorage
    }

    setIsFormModalOpen(false);
  };

  // Admin: Delete Template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));

    try {
      await api.delete(`/letters/${templateToDelete.id}`);
    } catch {
      // silent
    }

    success(`Template "${templateToDelete.title}" telah dihapus.`);
    setTemplateToDelete(null);
  };

  return (
    <div className="min-h-screen pb-16 bg-[#F3F6FA]">
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Pusat Template Dokumen Resmi"
        subtitle="Unduh template surat dinas & akademik UTD PSDKU Tegal untuk diedit di Microsoft Word atau Google Docs"
        action={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Tambah Template
            </Button>
          ) : undefined
        }
      />

      <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* BANNER 1: Google Drive Hub & Word Editing Workflow */}
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#3B82F6] text-white rounded-clay p-5 sm:p-6 shadow-clay-card border border-blue-400/25 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                <FolderOpen className="w-3.5 h-3.5 text-blue-300" />
                Penyimpanan Resmi Google Drive
              </span>
              <span className="text-xs text-blue-200/80 hidden sm:inline">
                &bull; BAAK & Tata Usaha UTD PSDKU Tegal
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Katalog Template Surat Dinas & Akademik Siap Pakai
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Seluruh template telah disesuaikan dengan <strong>tata naskah dinas resmi</strong>, lengkap dengan Kop Surat UTD dan pengesahan. Unduh format <strong>.docx</strong> untuk kenyamanan mengedit di Microsoft Word, atau buka langsung di Google Docs.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 flex-shrink-0 w-full md:w-auto">
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-utd-navy-900 hover:bg-blue-50 active:scale-95 text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl shadow-md transition-all w-full sm:w-auto"
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-clay border border-slate-200/80 shadow-clay-card space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama surat, nomor referensi, atau keperluan..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 self-center md:self-auto">
              <span>Menampilkan:</span>
              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {filteredTemplates.length} Dokumen
              </span>
            </div>
          </div>

          {/* Category Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
            {categoryTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    selectedCategory === tab.key
                      ? 'bg-sky-300 text-slate-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* TEMPLATES GRID */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-clay p-12 text-center border border-slate-200/80 shadow-clay-card flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800">
                Template Tidak Ditemukan
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Tidak ada dokumen yang sesuai dengan kata kunci pencarian atau kategori yang dipilih.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              Reset Filter Pencarian
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-clay border border-slate-200/90 shadow-clay-sm hover:shadow-clay-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between p-5 space-y-4 group"
              >
                {/* Top Row: Category & Badges */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 truncate">
                      {tpl.categoryLabel}
                    </span>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tpl.fileFormat}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {tpl.fileSize}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-base font-black text-utd-navy-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {tpl.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Reference Pattern Box */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Format Penomoran:
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700 truncate">
                        {tpl.referenceNoPattern}
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Salin pola nomor"
                      onClick={() => handleCopyRef(tpl.referenceNoPattern, tpl.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white active:scale-95 transition-all flex-shrink-0"
                    >
                      {copiedRefId === tpl.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Quick Edit Instruction Summary */}
                  {tpl.instructions && tpl.instructions.length > 0 && (
                    <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 space-y-1">
                      <div className="font-extrabold text-amber-900 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>Petunjuk Edit di Word:</span>
                      </div>
                      <p className="text-[11px] text-amber-800 line-clamp-2 leading-tight">
                        &bull; {tpl.instructions[0]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Primary Button: Download .DOCX */}
                    <button
                      type="button"
                      onClick={() => handleDownload(tpl)}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black py-2.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .DOCX</span>
                    </button>

                    {/* Secondary Button: Buka di Drive / Docs */}
                    <button
                      type="button"
                      onClick={() => handleOpenDrive(tpl)}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Buka di Docs</span>
                    </button>
                  </div>

                  {/* Metadata & Admin Tools */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="truncate">Diperbarui: {tpl.lastUpdated}</span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDetailTemplate(tpl)}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Panduan Lengkap
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                          <button
                            type="button"
                            title="Edit Template"
                            onClick={() => handleOpenEditModal(tpl)}
                            className="p-1 hover:text-blue-600 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Hapus Template"
                            onClick={() => setTemplateToDelete(tpl)}
                            className="p-1 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Detail & Panduan Pengisian di Word */}
      {activeDetailTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDetailTemplate(null)}
          title={`Panduan Template: ${activeDetailTemplate.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  Kategori: {activeDetailTemplate.categoryLabel}
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {activeDetailTemplate.fileFormat} &bull; {activeDetailTemplate.fileSize}
                </span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                {activeDetailTemplate.description}
              </p>
            </div>

            {/* Reference Number */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Format Penomoran Buku Agenda TU:
                </span>
                <div className="text-sm font-mono font-bold text-slate-800">
                  {activeDetailTemplate.referenceNoPattern}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyRef(
                    activeDetailTemplate.referenceNoPattern,
                    activeDetailTemplate.id
                  )
                }
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Salin Pola Nomor
              </button>
            </div>

            {/* Step by Step Word Instructions */}
            <div className="space-y-2">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Langkah-Langkah Mengisi Dokumen di Microsoft Word:
              </h5>
              <div className="space-y-2">
                {activeDetailTemplate.instructions.map((inst, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDrive(activeDetailTemplate)}
                leftIcon={<ExternalLink className="w-4 h-4 text-slate-500" />}
              >
                Buka di Google Docs
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleDownload(activeDetailTemplate);
                  setActiveDetailTemplate(null);
                }}
                leftIcon={<Download className="w-4 h-4 text-white" />}
              >
                Download Berkas (.DOCX)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Admin Tambah / Edit Template */}
      {isFormModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFormModalOpen(false)}
          title={editingTemplate ? 'Edit Template Surat' : 'Tambah Template Dokumen Baru'}
          maxWidth="xl"
        >
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Template Surat <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Surat Tugas Seminar / Pelatihan Luar Kampus"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Dokumen
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as TemplateCategory,
                    })
                  }
                  options={[
                    { value: 'TUGAS', label: 'Surat Tugas & SPPD' },
                    { value: 'KETERANGAN', label: 'Surat Keterangan' },
                    { value: 'UNDANGAN', label: 'Undangan & Rapat' },
                    { value: 'PERMOHONAN', label: 'Permohonan & Izin' },
                    { value: 'AKADEMIK', label: 'Akademik & PMB' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Format Berkas
                </label>
                <Select
                  value={formData.fileFormat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fileFormat: e.target.value as any,
                    })
                  }
                  options={[
                    { value: 'DOCX', label: 'Microsoft Word (.DOCX)' },
                    { value: 'DOTX', label: 'Word Template (.DOTX)' },
                    { value: 'PDF', label: 'PDF Document (.PDF)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi / Kegunaan Dokumen
              </label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Jelaskan tujuan surat dan kapan surat ini harus digunakan..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pola Nomor Surat (Referensi TU)
                </label>
                <Input
                  value={formData.referenceNoPattern}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceNoPattern: e.target.value })
                  }
                  placeholder=".../UTD-TEGAL/ST/XI/2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perkiraan Ukuran Berkas
                </label>
                <Input
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  placeholder="Contoh: 45 KB"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tautan Google Drive / Google Docs (Opsional)
              </label>
              <Input
                value={formData.driveViewUrl}
                onChange={(e) =>
                  setFormData({ ...formData, driveViewUrl: e.target.value })
                }
                placeholder="https://docs.google.com/document/d/..."
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Masukkan tautan file resmi di Google Drive jika ada.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petunjuk Pengisian di Word (Tulis tiap poin per baris)
              </label>
              <Textarea
                rows={3}
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                placeholder="1. Ganti bagian kuning&#10;2. Lengkapi NIDN/NIP&#10;3. Cetak kertas A4"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
              >
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveTemplate}>
                {editingTemplate ? 'Simpan Perubahan' : 'Tambahkan Template'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(templateToDelete)}
        title="Hapus Template Dokumen"
        message={`Apakah Anda yakin ingin menghapus template "${templateToDelete?.title}" dari katalog?`}
        confirmText="Hapus Template"
        isDestructive={true}
        onConfirm={handleDeleteTemplate}
        onClose={() => setTemplateToDelete(null)}
      />
    </div>
  );
};
