import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CalendarDays,
  Calendar,
  ListFilter,
  HelpCircle,
  Archive,
  FolderSync,
  Camera,
  MessageCircle,
  Printer,
  FileText,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  ChevronDown,
  FolderTree,
  CheckCircle2,
  Tags,
  Users,
  Copy,
  KeyRound,
  Lightbulb,
  X,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

interface OutletContextType {
  onToggleSidebar: () => void;
}

type GuideTopic =
  | 'ALL'
  | 'WORKFLOW'
  | 'SCHEDULE'
  | 'DOCS_DRIVE'
  | 'ARCHIVE'
  | 'LETTERS'
  | 'ADMIN'
  | 'FAQ';

interface FeatureGuide {
  id: string;
  topic: Exclude<GuideTopic, 'ALL' | 'WORKFLOW' | 'FAQ'>;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
  route?: string;
  routeLabel?: string;
  adminOnly?: boolean;
  keywords: string[];
  steps: string[];
  tip?: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Catat Jadwal Kegiatan',
    desc: 'Tambahkan jadwal baru (tanggal pasti atau tentatif jika sekolah belum konfirmasi). Pakai tombol Duplikat untuk kegiatan yang mirip.',
    icon: CalendarDays,
    accent: 'bg-blue-600 text-white',
    route: '/events/new',
    actionLabel: 'Buat Jadwal',
  },
  {
    step: '02',
    title: 'Follow-Up via WhatsApp',
    desc: 'Buka detail kegiatan lalu klik Follow-up WA. Template pesan otomatis menyesuaikan status & hari pelaksanaan (H-1, Hari H, Tentatif, atau Pasca Kegiatan).',
    icon: MessageCircle,
    accent: 'bg-emerald-600 text-white',
    route: '/events',
    actionLabel: 'Lihat Daftar',
  },
  {
    step: '03',
    title: 'Unggah Foto, Video & Dokumen',
    desc: 'Setelah kegiatan berjalan, unggah foto/video ke Galeri dan unggah dokumen (misal Scan Daftar Hadir PMB atau Berita Acara Akademik) sesuai slot kategori.',
    icon: Camera,
    accent: 'bg-purple-600 text-white',
    route: '/archive',
    actionLabel: 'Buka Arsip',
  },
  {
    step: '04',
    title: 'Kurasi Press Release & Rekap',
    desc: 'Klik foto di galeri untuk pratinjau layar penuh & Unduh HD Press Release. Cek seluruh daftar hadir sekolah di tab Rekap Daftar Hadir.',
    icon: FolderSync,
    accent: 'bg-indigo-600 text-white',
    route: '/archive',
    actionLabel: 'Cek Rekap',
  },
];

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: 'weekly-calendar',
    topic: 'SCHEDULE',
    title: 'Jadwal Minggu Ini & Kalender Bulanan',
    subtitle: 'Pantau agenda berjalan harian, mingguan, hingga satu bulan penuh',
    icon: Calendar,
    colorClass: 'bg-blue-50 text-blue-600 border-blue-200',
    route: '/weekly',
    routeLabel: 'Buka Jadwal Minggu Ini',
    keywords: ['jadwal', 'minggu', 'kalender', 'bentrok', 'tanggal', 'bulan'],
    steps: [
      'Buka menu Jadwal Minggu Ini untuk melihat fokus kegiatan minggu berjalan beserta penanda Hari Ini.',
      'Buka menu Kalender untuk melihat sebaran agenda per bulan; klik tanggal atau kotak acara untuk langsung masuk ke detail.',
      'Saat menambah/mengubah jadwal di ruangan dan jam yang sama, sistem otomatis menampilkan peringatan potensi bentrok.',
    ],
    tip: 'Gunakan pintasan keyboard Ctrl + K (atau klik kotak Cari Cepat di atas) untuk melompat cepat ke sekolah atau kegiatan mana pun tanpa membuka kalender.',
  },
  {
    id: 'all-events-duplicate',
    topic: 'SCHEDULE',
    title: 'Semua Kegiatan, Urut Tanggal & Duplikat 1-Klik',
    subtitle: 'Kelola seluruh jadwal aktif dan buat agenda berulang lebih cepat',
    icon: ListFilter,
    colorClass: 'bg-sky-50 text-sky-600 border-sky-200',
    route: '/events',
    routeLabel: 'Buka Semua Kegiatan',
    keywords: ['semua kegiatan', 'duplikat', 'copy', 'urutkan', 'filter', 'tambah'],
    steps: [
      'Gunakan filter Kategori, Status, Bulan, dan tombol Urutkan Tanggal (Terbaru / Terlama) untuk menyaring daftar agenda.',
      'Klik ikon Duplikat (Salin) pada baris kegiatan atau di halaman Detail untuk membuat jadwal baru dengan rincian perlengkapan & kategori yang sama.',
      'Staf maupun Admin dapat menambah dan memperbarui detail jadwal secara kolaboratif.',
    ],
  },
  {
    id: 'tentative',
    topic: 'SCHEDULE',
    title: 'Kegiatan Tentatif (Belum Pasti Tanggal)',
    subtitle: 'Tampung jadwal sekolah/instansi yang masih menunggu konfirmasi',
    icon: HelpCircle,
    colorClass: 'bg-amber-50 text-amber-600 border-amber-200',
    route: '/tentative',
    routeLabel: 'Buka Kegiatan Tentatif',
    keywords: ['tentatif', 'belum pasti', 'menunggu konfirmasi', 'kandidat', 'estimasi'],
    steps: [
      'Saat membuat kegiatan, pilih presisi waktu Belum Pasti, Estimasi Bulan, Estimasi Minggu, atau Beberapa Tanggal Kandidat.',
      'Semua agenda tersebut otomatis masuk ke menu Kegiatan Tentatif agar tidak mengotori kalender utama.',
      'Begitu pihak sekolah memberi tanggal pasti, klik Ubah Kegiatan lalu ganti ke Tanggal Pasti & status Terkonfirmasi.',
    ],
  },
  {
    id: 'whatsapp-followup',
    topic: 'SCHEDULE',
    title: 'Follow-Up WhatsApp Otomatis',
    subtitle: 'Kirim pesan konfirmasi atau pengingat ke kontak sekolah/tim dalam 1 klik',
    icon: MessageCircle,
    colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    route: '/events',
    routeLabel: 'Pilih Kegiatan',
    keywords: ['whatsapp', 'wa', 'follow up', 'pesan', 'template', 'kontak', 'konfirmasi'],
    steps: [
      'Buka halaman Detail Kegiatan lalu klik tombol WhatsApp Follow-Up.',
      'Sistem otomatis mendeteksi kondisi acara (besok, hari ini, menunggu konfirmasi, atau sudah selesai) dan menyiapkan teks sopan siap kirim.',
      'Anda tetap bisa memilih 4 mode cepat (Konfirmasi Tanggal, Pengingat H-1, Koordinasi Tim, atau Ucapan Terima Kasih) lalu klik Buka WhatsApp atau Salin Pesan.',
    ],
  },
  {
    id: 'media-press-release',
    topic: 'DOCS_DRIVE',
    title: 'Galeri Preview Foto/Video & Kurasi Press Release',
    subtitle: 'Pilih foto terbaik secara visual & unduh kualitas asli (HD)',
    icon: Camera,
    colorClass: 'bg-purple-50 text-purple-600 border-purple-200',
    route: '/archive',
    routeLabel: 'Cek Galeri di Arsip',
    keywords: ['foto', 'video', 'preview', 'lightbox', 'press release', 'hd', 'unduh', 'upload', 'humas'],
    steps: [
      'Di halaman Detail Kegiatan, klik Unggah Foto/Video (bisa pilih hingga 15 file sekaligus, mendukung foto hingga video maks. 150 MB).',
      'Foto & video otomatis tampil sebagai grid pratinjau visual.',
      'Klik foto atau video untuk membuka Pratinjau Layar Penuh (gunakan panah ← / → di keyboard untuk menggeser cepat).',
      'Klik tombol Unduh HD (Press Release) untuk mengunduh file asli beresolusi penuh, atau klik Salin Link untuk dikirim ke tim Humas.',
    ],
    tip: 'Jika memiliki video rekaman di atas 150 MB atau album Google Drive eksternal, cukup pakai tab "Tautkan Link Drive" pada jendela upload.',
  },
  {
    id: 'category-slots-drive',
    topic: 'DOCS_DRIVE',
    title: 'Slot Dokumen per Kategori & Folder Gabungan Drive',
    subtitle: 'Dokumen otomatis mengikuti kategori kegiatan dan tersusun rapi di Google Drive',
    icon: FolderSync,
    colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    route: '/events',
    routeLabel: 'Lihat Contoh di Kegiatan',
    keywords: ['slot', 'daftar hadir', 'pdf', 'akademik', 'pmb', 'sosialisasi', 'google drive', 'folder', 'disatukan'],
    steps: [
      'Setiap kategori memiliki slot dokumen berbeda di bawah Galeri Foto/Video: misalnya Sosialisasi PMB menampilkan slot Scan Daftar Hadir Siswa (PDF), sedangkan Akademik menampilkan Berita Acara/Notulensi, Daftar Hadir, & Surat/SK.',
      'Cukup klik tombol Unggah langsung di kotak slot dokumen tersebut agar file langsung masuk ke folder Google Drive yang tepat.',
      'Khusus slot bertanda "Disatukan 1 Folder Drive" (seperti Scan Daftar Hadir PMB), file dari seluruh sekolah otomatis terkumpul dalam 1 folder gabungan Google Drive dengan nama file otomatis: Tanggal - Nama Sekolah.pdf (tidak digabung menjadi 1 PDF).',
    ],
    tip: 'Tidak perlu repot mengganti nama hasil scan HP (seperti CamScanner_001.pdf) sebelum upload — sistem otomatis merapikan namanya dengan tanggal dan nama sekolah.',
  },
  {
    id: 'archive-rekap',
    topic: 'ARCHIVE',
    title: 'Arsip Kegiatan & Rekap Daftar Hadir Semua Sekolah',
    subtitle: 'Cari kegiatan lama dengan cepat & pantau kelengkapan dokumen seluruh sekolah',
    icon: Archive,
    colorClass: 'bg-teal-50 text-teal-600 border-teal-200',
    route: '/archive',
    routeLabel: 'Buka Arsip & Dokumentasi',
    keywords: ['arsip', 'lama', 'selesai', 'rekap', 'csv', 'excel', 'semua sekolah', 'daftar hadir'],
    steps: [
      'Tab Arsip Kegiatan otomatis menampung kegiatan yang sudah lewat tanggal atau ditandai Selesai. Anda bisa mengurutkan dari Terbaru/Terlama, filter bulan/rentang tanggal, atau filter berdasarkan kelengkapan dokumentasi.',
      'Klik Unduh Rekap Excel (.CSV) di kanan atas untuk mengunduh laporan rekap kegiatan ke Excel.',
      'Tab Rekap Daftar Hadir (Semua Sekolah) menampilkan daftar seluruh sekolah dengan status Sudah Upload / Belum Upload, tautan unduh tiap file PDF, serta tombol Buka Folder Gabungan di Drive.',
    ],
  },
  {
    id: 'letters-print',
    topic: 'LETTERS',
    title: 'Template Surat & Cetak Jadwal A4',
    subtitle: 'Buat surat resmi kampus & cetak jadwal rapat siap tempel',
    icon: Printer,
    colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
    route: '/letters',
    routeLabel: 'Buka Template Surat',
    keywords: ['surat', 'template', 'cetak', 'print', 'a4', 'kop', 'tugas', 'undangan', 'magang'],
    steps: [
      'Buka menu Template Surat untuk membuat surat Tugas, Undangan, Magang, Permohonan, atau Surat Aktif lengkap dengan kop & format cetak rapi.',
      'Buka menu Cetak Jadwal untuk mencetak daftar agenda mingguan/bulanan dalam tampilan kertas A4 yang bersih tanpa tombol navigasi.',
    ],
  },
  {
    id: 'admin-category-slots',
    topic: 'ADMIN',
    title: 'Pengaturan Kategori & Slot Dokumen (Khusus Admin)',
    subtitle: 'Ubah aturan dokumen atau aktifkan folder gabungan Drive per kategori',
    icon: Tags,
    colorClass: 'bg-rose-50 text-rose-600 border-rose-200',
    route: '/admin/categories',
    routeLabel: 'Kelola Kategori',
    adminOnly: true,
    keywords: ['admin', 'kategori', 'slot dokumen', 'pengaturan', 'master', 'folder gabungan'],
    steps: [
      'Buka Admin Panel → Kelola Kategori lalu klik ikon Edit pada kategori yang ingin diatur.',
      'Tambahkan, ubah, atau hapus Slot Dokumen sesuai kebutuhan dokumen kategori tersebut (Foto & Video selalu otomatis aktif).',
      'Centang "Satukan semua kegiatan kategori ini ke 1 Folder Google Drive" jika ingin semua berkas slot tersebut dari berbagai kegiatan terkumpul di 1 folder Drive pusat.',
    ],
  },
  {
    id: 'admin-users-delete',
    topic: 'ADMIN',
    title: 'Kelola Pengguna & Hapus Permanen (Khusus Admin)',
    subtitle: 'Manajemen akun staf dan penghapusan bersih hingga Google Drive',
    icon: Users,
    colorClass: 'bg-rose-50 text-rose-600 border-rose-200',
    route: '/admin/users',
    routeLabel: 'Kelola Pengguna',
    adminOnly: true,
    keywords: ['admin', 'pengguna', 'user', 'akun', 'hapus', 'permanen', 'password', 'staf'],
    steps: [
      'Buka Admin Panel → Kelola Pengguna untuk membuat akun Staf/Admin baru atau mereset kata sandi pengguna yang lupa.',
      'Hanya Admin yang dapat menghapus kegiatan atau berkas lampiran. Saat berkas/kegiatan dihapus, file terkait di Google Drive juga otomatis terhapus permanen agar kuota penyimpanan tetap lega.',
    ],
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-no-delete',
    question: 'Kenapa saya tidak melihat tombol Hapus pada kegiatan atau foto/PDF?',
    answer:
      'Demi keamanan data bersama, akun Staf dapat menambah, mengubah, duplikat, dan mengunggah dokumentasi, namun tombol Hapus Permanen hanya tersedia untuk akun Admin. Jika ada jadwal atau berkas yang keliru diunggah, silakan hubungi Admin untuk menghapusnya.',
    keywords: ['hapus', 'delete', 'staf', 'admin', 'akses', 'tidak bisa hapus'],
  },
  {
    id: 'faq-drive-delete',
    question: 'Jika foto atau PDF dihapus di web oleh Admin, apakah di Google Drive ikut terhapus?',
    answer:
      'Ya! Sistem otomatis menghapus file secara permanen dari Google Drive (tidak menumpuk di folder Sampah/Trash) sehingga kuota Google Drive langsung lega kembali. Menghapus 1 kegiatan penuh juga otomatis membersihkan seluruh lampirannya di Drive.',
    keywords: ['google drive', 'hapus', 'trash', 'sampah', 'permanen', 'kuota'],
  },
  {
    id: 'faq-rename-scan',
    question: 'Nama file hasil scan HP saya berantakan (misal CamScanner_123.pdf), apakah harus diubah dulu?',
    answer:
      'Tidak wajib. Khusus dokumen yang masuk ke slot gabungan (seperti Scan Daftar Hadir Siswa PMB), sistem otomatis merapikan nama file saat disimpan ke Google Drive menjadi format "YYYY-MM-DD - Nama Sekolah - Daftar Hadir.pdf" agar rapi dan tidak tertukar.',
    keywords: ['rename', 'nama file', 'camscanner', 'scan', 'daftar hadir', 'pdf'],
  },
  {
    id: 'faq-large-video',
    question: 'Bagaimana jika ukuran video dokumentasi lebih besar dari 150 MB?',
    answer:
      'Batas unggah langsung lewat web adalah 150 MB per file (hingga 15 file sekaligus). Jika ada video berdurasi panjang di atas 150 MB, unggah langsung ke Google Drive Anda, aktifkan akses "Siapa saja yang memiliki link", lalu tempel tautannya di tab "Tautkan Link Drive".',
    keywords: ['video', '150 mb', 'besar', 'gagal upload', 'link drive', 'tautkan'],
  },
  {
    id: 'faq-past-events',
    question: 'Ke mana perginya kegiatan yang tanggalnya sudah lewat minggu lalu atau bulan lalu?',
    answer:
      'Agar tampilan Jadwal Minggu Ini dan Kalender tetap bersih dan ringan, seluruh kegiatan yang tanggalnya sudah lewat otomatis terdata di menu "Arsip & Dokumentasi". Anda bisa mencarinya berdasarkan nama sekolah, bulan, rentang tanggal, atau mengurutkan dari terlama/terbaru.',
    keywords: ['lewat', 'lama', 'hilang', 'arsip', 'cari kegiatan'],
  },
  {
    id: 'faq-password',
    question: 'Bagaimana cara mengganti kata sandi (password) akun saya sendiri?',
    answer:
      'Lihat bagian pojok kiri bawah pada menu samping (Sidebar), lalu klik tombol ikon kunci "Ganti Password". Masukkan password lama dan password baru Anda.',
    keywords: ['password', 'sandi', 'ganti password', 'login', 'akun'],
  },
];

const TOPIC_TABS: Array<{ id: GuideTopic; label: string }> = [
  { id: 'ALL', label: 'Semua Panduan' },
  { id: 'WORKFLOW', label: 'Alur Kerja Cepat' },
  { id: 'SCHEDULE', label: 'Jadwal & WA' },
  { id: 'DOCS_DRIVE', label: 'Dokumentasi & Drive' },
  { id: 'ARCHIVE', label: 'Arsip & Rekap' },
  { id: 'LETTERS', label: 'Surat & Cetak' },
  { id: 'ADMIN', label: 'Khusus Admin' },
  { id: 'FAQ', label: 'Tanya Jawab (FAQ)' },
];

export const GuidePage: React.FC = () => {
  const { onToggleSidebar } = useOutletContext<OutletContextType>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<GuideTopic>('ALL');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  const normalizedQuery = search.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    return FEATURE_GUIDES.filter((g) => {
      if (activeTopic !== 'ALL' && activeTopic !== g.topic) return false;
      if (!normalizedQuery) return true;
      const hay = [g.title, g.subtitle, ...g.keywords, ...g.steps, g.tip || '']
        .join(' ')
        .toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [activeTopic, normalizedQuery]);

  const filteredFaqs = useMemo(() => {
    if (activeTopic !== 'ALL' && activeTopic !== 'FAQ') return [];
    return FAQ_ITEMS.filter((f) => {
      if (!normalizedQuery) return true;
      const hay = [f.question, f.answer, ...f.keywords].join(' ').toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [activeTopic, normalizedQuery]);

  const showWorkflowSection =
    (activeTopic === 'ALL' || activeTopic === 'WORKFLOW') && !normalizedQuery;
  const showRoleSection = activeTopic === 'ALL' && !normalizedQuery;
  const showFolderDiagram =
    (activeTopic === 'ALL' || activeTopic === 'DOCS_DRIVE') &&
    (!normalizedQuery ||
      'google drive folder struktur daftar hadir sosialisasi akademik'.includes(normalizedQuery) ||
      normalizedQuery.includes('drive') ||
      normalizedQuery.includes('folder'));

  const hasAnyResult =
    showWorkflowSection || filteredGuides.length > 0 || filteredFaqs.length > 0 || showFolderDiagram;

  return (
    <div className="min-h-screen pb-16 bg-[#F3F6FA]">
      <Header
        onToggleSidebar={onToggleSidebar}
        title="Panduan & Dokumentasi Fitur"
        subtitle="Petunjuk praktis penggunaan sistem Jadwal Kampus UTD untuk Staf & Admin"
      />

      <div className="p-3.5 sm:p-8 max-w-6xl mx-auto space-y-6">
        {/* 1. Hero Banner + Instant Search */}
        <div className="bg-gradient-to-br from-[#0A1F44] via-[#123A7A] to-[#1D4ED8] text-white rounded-clay p-5 sm:p-8 shadow-clay-card space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-sky-200 text-xs font-bold tracking-wide">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Pusat Bantuan Staf &amp; Admin</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                Bingung pakai fitur tertentu? Cari panduannya di sini.
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Halaman ini merangkum seluruh fitur sistem mulai dari input jadwal, WhatsApp
                follow-up, upload dokumentasi &amp; daftar hadir Google Drive, hingga kurasi foto
                Press Release dan arsip kegiatan.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 rounded-clay-sm px-4 py-3 text-xs text-blue-100 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Tips Cepat</p>
                <p>
                  Tekan <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[11px]">Ctrl</kbd>{' '}
                  + <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[11px]">K</kbd>{' '}
                  kapan saja untuk cari jadwal instan!
                </p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Cari topik panduan... contoh: "daftar hadir", "press release", "whatsapp", "arsip"'
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 bg-white rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Topic Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {TOPIC_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTopic(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTopic === tab.id
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'bg-white/10 text-blue-100 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Alur Kerja Cepat (4 Langkah Utama Staf) */}
        {showWorkflowSection && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Alur Kerja Utama Staf (4 Langkah Praktis)
                </h3>
                <p className="text-xs text-slate-500">
                  Urutan singkat mulai dari pencatatan jadwal hingga dokumentasi &amp; Press Release
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {WORKFLOW_STEPS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    style={{ ['--stagger-i' as any]: idx }}
                    className="bg-white rounded-clay border border-slate-200/80 shadow-clay-sm p-4 flex flex-col justify-between gap-3 animate-card-reveal"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${item.accent}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-300 font-mono">
                          STEP {item.step}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Perbedaan Hak Akses Staf vs Admin */}
        {showRoleSection && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-clay border border-blue-200/80 shadow-clay-sm p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Hak Akses Staf</h4>
                    <p className="text-[11px] text-slate-500">Peran operasional sehari-hari</p>
                  </div>
                </div>
                {!isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    Akun Anda
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Melihat seluruh jadwal, kalender, arsip, &amp; rekap daftar hadir.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Menambah, mengubah, menduplikat, &amp; menandai kegiatan Selesai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Mengunggah foto, video, &amp; dokumen ke Google Drive + cetak surat/jadwal.</span>
                </li>
                <li className="flex items-start gap-2 text-slate-500">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Tidak dapat menghapus permanen jadwal/file (hubungi Admin bila perlu hapus).
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-clay border border-rose-200/80 shadow-clay-sm p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Hak Akses Admin</h4>
                    <p className="text-[11px] text-slate-500">Pengelola penuh sistem</p>
                  </div>
                </div>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Akun Anda
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Memiliki seluruh kemampuan akun Staf di atas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Menghapus permanen kegiatan &amp; berkas (otomatis ikut bersih di Google Drive).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Mengatur <strong>Slot Dokumen per Kategori</strong> &amp; folder gabungan Drive.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Mengelola akun pengguna (tambah staf, reset password) &amp; master lokasi.</span>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* 4. Visual Struktur Folder Otomatis Google Drive */}
        {showFolderDiagram && (
          <section className="bg-white rounded-clay border border-indigo-200/80 shadow-clay-sm p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Peta Susunan Folder Otomatis di Google Drive
                </h3>
                <p className="text-xs text-slate-500">
                  Anda tidak perlu membuat folder manual di Drive — sistem menatanya otomatis sesuai kategori
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto">
                <p className="text-sky-300 font-bold mb-1.5">
                  Contoh 1 — Kategori Sosialisasi PMB (Daftar Hadir Disatukan)
                </p>
                <pre className="whitespace-pre text-slate-200">{`📁 Sosialisasi PMB
 ├── 📁 00 - Daftar Hadir (Semua Sekolah)   ← Kumpul 1 folder!
 │    ├── 2026-11-18 - SMA N 1 Tegal - Daftar Hadir.pdf
 │    └── 2026-11-20 - SMK N 1 Slawi - Daftar Hadir.pdf
 │
 ├── 📁 SMA N 1 Tegal
 │    └── 📁 Dokumentasi (Foto & Video)     ← Foto/Video sekolah ini
 └── 📁 SMK N 1 Slawi
      └── 📁 Dokumentasi (Foto & Video)`}</pre>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto">
                <p className="text-emerald-300 font-bold mb-1.5">
                  Contoh 2 — Kategori Akademik / Pelatihan / Rapat
                </p>
                <pre className="whitespace-pre text-slate-200">{`📁 Akademik
 └── 📁 Yudisium Semester Ganjil
      ├── 📁 Dokumentasi (Foto & Video)     ← Foto & Video HD
      └── 📁 Dokumen Kegiatan
           ├── [Berita Acara] BA_Yudisium.pdf
           ├── [Daftar Hadir] Hadir_Dosen.pdf
           └── [Surat SK] SK_Kelulusan.pdf`}</pre>
              </div>
            </div>
          </section>
        )}

        {/* 5. Panduan Detail per Fitur */}
        {filteredGuides.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Panduan Lengkap Fitur ({filteredGuides.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Klik tombol "Buka ..." di tiap kartu untuk langsung mencoba fiturnya
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuides.map((guide, idx) => {
                const Icon = guide.icon;
                const canVisitRoute = guide.route && (!guide.adminOnly || isAdmin);
                return (
                  <div
                    key={guide.id}
                    style={{ ['--stagger-i' as any]: Math.min(idx, 8) }}
                    className="bg-white rounded-clay border border-slate-200/80 shadow-clay-sm p-4 sm:p-5 flex flex-col justify-between gap-4 animate-card-reveal"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${guide.colorClass}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                {guide.title}
                              </h4>
                              {guide.adminOnly && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Khusus Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{guide.subtitle}</p>
                          </div>
                        </div>
                      </div>

                      <ol className="space-y-2 text-xs text-slate-700 leading-relaxed pl-1">
                        {guide.steps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {guide.tip && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{guide.tip}</span>
                        </div>
                      )}
                    </div>

                    {canVisitRoute && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => navigate(guide.route!)}
                        >
                          {guide.routeLabel || 'Buka Menu'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. FAQ Interaktif (Accordion) */}
        {filteredFaqs.length > 0 && (
          <section className="space-y-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Pertanyaan yang Sering Ditanyakan (FAQ)
              </h3>
              <p className="text-xs text-slate-500">
                Jawaban cepat untuk kendala yang paling sering ditemui staf di lapangan
              </p>
            </div>

            <div className="bg-white rounded-clay border border-slate-200/80 shadow-clay-sm divide-y divide-slate-100 overflow-hidden">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-4 sm:px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/40">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty Search Result */}
        {!hasAnyResult && (
          <div className="bg-white rounded-clay border border-slate-200/80 p-8 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Panduan untuk &ldquo;{search}&rdquo; tidak ditemukan
            </p>
            <p className="text-xs text-slate-500">
              Coba kata kunci lain seperti &ldquo;daftar hadir&rdquo;, &ldquo;whatsapp&rdquo;,
              &ldquo;press release&rdquo;, atau reset filter.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setActiveTopic('ALL');
                }}
              >
                Tampilkan Semua Panduan
              </Button>
            </div>
          </div>
        )}

        {/* Quick Keyboard Shortcuts Footer */}
        <div className="bg-white rounded-clay border border-slate-200/80 shadow-clay-sm p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Copy className="w-4 h-4 text-blue-600" />
            <span>Pintasan Cepat Keyboard:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold">
                Ctrl + K
              </kbd>{' '}
              Pencarian Cepat
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold">
                ← / →
              </kbd>{' '}
              Geser Foto/Video di Lightbox
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold">
                Esc
              </kbd>{' '}
              Tutup Modal / Pratinjau
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidePage;
