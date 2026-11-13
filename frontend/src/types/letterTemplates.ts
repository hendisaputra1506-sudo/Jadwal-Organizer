export type LetterTemplateType =
  | 'MAGANG'
  | 'TUGAS'
  | 'UNDANGAN'
  | 'AKTIF'
  | 'PERMOHONAN'
  | 'CUSTOM';

export type TemplateCategory =
  | 'ALL'
  | 'KETERANGAN'
  | 'TUGAS'
  | 'UNDANGAN'
  | 'PERMOHONAN'
  | 'AKADEMIK';

export interface RecipientItem {
  id: string;
  name: string;
  nim?: string;
  studyProgram?: string;
  studyLevel?: string;
  roleOrPosition?: string;
  location?: string;
  dateRange?: string;
  customField?: string;
}

export interface LetterData {
  id?: string;
  templateType: LetterTemplateType;
  title: string;
  referenceNo: string;
  subject: string;
  signerName: string;
  signerPosition: string;
  signerNipOrNidn?: string;
  eventName?: string;
  activityLocation?: string;
  activityDateRange?: string;
  activityTime?: string;
  eventAgenda?: string;
  openingText?: string;
  closingText?: string;
  customContent?: string;
  city: string;
  letterDate: string;
  isBulk: boolean;
  recipients: RecipientItem[];
}

export interface LetterTemplateDefinition {
  type: LetterTemplateType;
  name: string;
  badge: string;
  description: string;
  defaultTitle: string;
  defaultSubject: string;
  defaultOpeningText: string;
  defaultClosingText: string;
}

/**
 * Model item katalog template surat siap download & edit di Word / Google Drive
 */
export interface DownloadableTemplateItem {
  id: string;
  title: string;
  type: LetterTemplateType;
  category: TemplateCategory;
  categoryLabel: string;
  description: string;
  fileFormat: 'DOCX' | 'DOTX' | 'PDF';
  fileSize: string;
  referenceNoPattern: string;
  driveViewUrl?: string; // Tautan view / edit di Google Drive / Docs
  driveDownloadUrl?: string; // Tautan unduh langsung berkas .docx
  instructions: string[]; // Petunjuk poin penting saat edit di Microsoft Word
  lastUpdated: string;
  updatedBy: string;
  isPopular?: boolean;
}

export const LETTER_TEMPLATES: LetterTemplateDefinition[] = [
  {
    type: 'MAGANG',
    name: 'Surat Keterangan Magang / Internship',
    badge: 'Magang',
    description: 'Surat resmi keterangan telah melaksanakan kegiatan magang/internship mahasiswa di kampus UTD.',
    defaultTitle: 'SURAT KETERANGAN',
    defaultSubject: 'TENTANG PELAKSANAAN KEGIATAN INTERNSHIP/MAGANG',
    defaultOpeningText: 'Yang bertanda tangan di bawah ini :',
    defaultClosingText: 'Demikian surat pernyataan ini dibuat untuk diketahui dan dipergunakan sebagaimana mestinya.',
  },
  {
    type: 'TUGAS',
    name: 'Surat Tugas Kegiatan Kampus',
    badge: 'Surat Tugas',
    description: 'Surat penugasan resmi untuk dosen, tenaga kependidikan, atau mahasiswa pada kegiatan kampus.',
    defaultTitle: 'SURAT TUGAS',
    defaultSubject: 'PENUGASAN KEGIATAN KAMPUS UNIVERSITAS TEKNOLOGI DIGITAL',
    defaultOpeningText: 'Pimpinan Universitas Teknologi Digital PSDKU Tegal dengan ini memberikan tugas kepada :',
    defaultClosingText: 'Demikian surat tugas ini diberikan agar dapat dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab.',
  },
  {
    type: 'UNDANGAN',
    name: 'Surat Undangan Rapat / Kegiatan',
    badge: 'Undangan',
    description: 'Surat undangan resmi rapat koordinasi, sosialisasi, atau acara akademik kampus.',
    defaultTitle: 'SURAT UNDANGAN',
    defaultSubject: 'UNDANGAN KEGIATAN / RAPAT KOORDINASI KAMPUS',
    defaultOpeningText: 'Sehubungan dengan akan dilaksanakannya agenda kegiatan kampus, bersama ini kami mengundang Bapak/Ibu/Saudara pada :',
    defaultClosingText: 'Mengingat pentingnya acara tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.',
  },
  {
    type: 'AKTIF',
    name: 'Surat Keterangan Aktif Kuliah',
    badge: 'Akademik',
    description: 'Surat keterangan bahwa mahasiswa bersangkutan terdaftar aktif kuliah untuk keperluan beasiswa, BPJS, atau instansi luar.',
    defaultTitle: 'SURAT KETERANGAN AKTIF KULIAH',
    defaultSubject: 'KETERANGAN STATUS MAHASISWA AKTIF',
    defaultOpeningText: 'Ketua Universitas Teknologi Digital PSDKU Tegal dengan ini menerangkan bahwa :',
    defaultClosingText: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  },
  {
    type: 'PERMOHONAN',
    name: 'Surat Permohonan Izin / Kunjungan / Kerjasama',
    badge: 'Permohonan',
    description: 'Surat permohonan izin tempat, sosialisasi PMB, studi banding, atau kunjungan industri ke instansi mitra.',
    defaultTitle: 'SURAT PERMOHONAN',
    defaultSubject: 'PERMOHONAN IZIN KUNJUNGAN / SOSIALISASI PMB',
    defaultOpeningText: 'Dengan hormat, dalam rangka pelaksanaan agenda kegiatan Universitas Teknologi Digital PSDKU Tegal, bersama ini kami mengajukan permohonan kepada :',
    defaultClosingText: 'Demikian permohonan ini kami sampaikan. Besar harapan kami permohonan ini dapat disetujui. Atas perhatian dan perkenan yang diberikan, kami haturkan terima kasih.',
  },
  {
    type: 'CUSTOM',
    name: 'Surat Bebas / Format Kustom',
    badge: 'Kustom',
    description: 'Format surat fleksibel dengan isi bebas namun tetap menggunakan Kop Surat & tanda tangan resmi UTD.',
    defaultTitle: 'SURAT RESMI',
    defaultSubject: 'PERIHAL KEGIATAN KAMPUS',
    defaultOpeningText: 'Dengan hormat,',
    defaultClosingText: 'Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
  },
];

export const DEFAULT_SIGNER = {
  name: 'Ibu Aries Setyani Wahyu Prasetyawati, S.P., M.M.',
  position: 'Ketua UTD PSDKU Tegal',
  city: 'Tegal',
};

export const SAMPLE_BULK_RECIPIENTS: RecipientItem[] = [
  {
    id: 'sample-1',
    name: 'Isna Nur Asifa',
    nim: '25303024',
    studyProgram: 'Manajemen Informatika',
    studyLevel: 'D3',
    roleOrPosition: 'Peserta Magang',
    location: 'UTD PSDKU Tegal',
    dateRange: '13 Agustus 2026 sampai dengan 27 Agustus 2026',
  },
  {
    id: 'sample-2',
    name: 'Muhammad Rizky Fauzan',
    nim: '25303018',
    studyProgram: 'Teknik Informatika',
    studyLevel: 'S1',
    roleOrPosition: 'Peserta Magang',
    location: 'UTD PSDKU Tegal',
    dateRange: '13 Agustus 2026 sampai dengan 27 Agustus 2026',
  },
  {
    id: 'sample-3',
    name: 'Siti Sarah Rahmawati',
    nim: '25303042',
    studyProgram: 'Sistem Informasi',
    studyLevel: 'S1',
    roleOrPosition: 'Peserta Magang',
    location: 'UTD PSDKU Tegal',
    dateRange: '13 Agustus 2026 sampai dengan 27 Agustus 2026',
  },
];

/**
 * Katalog Template Resmi Kampus (Siap Download .DOCX & Edit di MS Word)
 */
export const INITIAL_DOWNLOADABLE_TEMPLATES: DownloadableTemplateItem[] = [
  {
    id: 'tpl-tugas-resmi',
    title: 'Surat Tugas Kegiatan Kampus (Dosen / Tendik)',
    type: 'TUGAS',
    category: 'TUGAS',
    categoryLabel: 'Surat Tugas & SPPD',
    description: 'Format surat penugasan dinas resmi bagi Dosen, Tenaga Kependidikan, atau Tim Kepanitiaan kampus untuk menghadiri kegiatan, pelatihan, sosialisasi, atau pengabdian.',
    fileFormat: 'DOCX',
    fileSize: '46 KB',
    referenceNoPattern: '.../UTD-TEGAL/ST/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_tugas_utd_view',
    instructions: [
      'Ganti nomor registrasi surat tugas pada bagian atas sesuai buku agenda TU.',
      'Lengkapi nama, NIDN/NIP, dan jabatan personil yang ditugaskan pada tabel.',
      'Tentukan tanggal pelaksanaan, waktu, dan lokasi tempat kegiatan bertugas.',
      'Cetak pada kertas A4 (standar margin 3-4 cm) untuk penandatanganan dan cap basah.',
    ],
    lastUpdated: '10 Nov 2026',
    updatedBy: 'BAAK & Tata Usaha',
    isPopular: true,
  },
  {
    id: 'tpl-keterangan-magang',
    title: 'Surat Keterangan Magang / Internship Mahasiswa',
    type: 'MAGANG',
    category: 'KETERANGAN',
    categoryLabel: 'Surat Keterangan',
    description: 'Surat resmi keterangan telah melaksanakan dan menyelesaikan program magang/internship di lingkungan kampus UTD PSDKU Tegal.',
    fileFormat: 'DOCX',
    fileSize: '42 KB',
    referenceNoPattern: '.../UTD/BAAK/KET-MAGANG/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_magang_utd_view',
    instructions: [
      'Isi identitas mahasiswa pada bagian kuning: Nama Lengkap, NIM, dan Program Studi.',
      'Tentukan rentang tanggal periode pelaksanaan magang yang telah dilalui.',
      'Lampirkan lembar penilaian atau sertifikat magang jika dipersyaratkan.',
    ],
    lastUpdated: '08 Nov 2026',
    updatedBy: 'BAAK UTD',
    isPopular: true,
  },
  {
    id: 'tpl-undangan-rapat',
    title: 'Surat Undangan Rapat Koordinasi / Rektorat',
    type: 'UNDANGAN',
    category: 'UNDANGAN',
    categoryLabel: 'Undangan & Rapat',
    description: 'Format surat undangan resmi rapat koordinasi akademik, rapat dosen, rapat kerja tahunan, atau agenda senat kampus.',
    fileFormat: 'DOCX',
    fileSize: '39 KB',
    referenceNoPattern: '.../UTD/UND/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_undangan_utd_view',
    instructions: [
      'Ubah daftar penerima undangan di bagian "Kepada Yth. Bapak/Ibu...".',
      'Lengkapi rincian Hari, Tanggal, Jam (WIB), dan Ruangan/Lokasi Acara.',
      'Jika rapat bersifat daring/hybrid, cantumkan tautan Zoom atau Google Meet.',
      'Sertakan lampiran agenda susunan rapat pada halaman kedua bila diperlukan.',
    ],
    lastUpdated: '05 Nov 2026',
    updatedBy: 'Sekretariat Pimpinan',
    isPopular: true,
  },
  {
    id: 'tpl-aktif-kuliah',
    title: 'Surat Keterangan Mahasiswa Aktif Kuliah',
    type: 'AKTIF',
    category: 'AKADEMIK',
    categoryLabel: 'Akademik & PMB',
    description: 'Surat keterangan resmi bahwa mahasiswa bersangkutan terdaftar aktif kuliah di semester berjalan untuk syarat beasiswa, tunjangan gaji orang tua/PNS, atau BPJS.',
    fileFormat: 'DOCX',
    fileSize: '41 KB',
    referenceNoPattern: '.../UTD-TEGAL/BAAK/AKTIF/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_aktif_kuliah_view',
    instructions: [
      'Periksa apakah mahasiswa sudah menyelesaikan registrasi dan KRS semester aktif.',
      'Lengkapi nama orang tua, NIP/Instansi tempat orang tua bekerja jika untuk tunjangan.',
      'Pastikan format nomor surat sesuai penomoran registrasi akademik BAAK.',
    ],
    lastUpdated: '01 Nov 2026',
    updatedBy: 'BAAK UTD',
    isPopular: false,
  },
  {
    id: 'tpl-izin-pmb',
    title: 'Surat Permohonan Izin Sosialisasi PMB ke Sekolah',
    type: 'PERMOHONAN',
    category: 'PERMOHONAN',
    categoryLabel: 'Permohonan & Izin',
    description: 'Surat resmi permohonan izin audiensi atau sosialisasi Penerimaan Mahasiswa Baru (PMB) ke Kepala Sekolah SMA/SMK/MA mitra.',
    fileFormat: 'DOCX',
    fileSize: '45 KB',
    referenceNoPattern: '.../UTD/PMB/IZIN/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_izin_pmb_view',
    instructions: [
      'Ganti nama sekolah tujuan dan sebutan Pimpinan (Yth. Bapak/Ibu Kepala SMA/SMK...).',
      'Tuliskan alternatif tanggal dan jam kunjungan yang diharapkan.',
      'Sertakan nomor kontak WhatsApp PIC PMB yang dapat dihubungi sekolah.',
    ],
    lastUpdated: '28 Okt 2026',
    updatedBy: 'Divisi PMB & Kerjasama',
    isPopular: true,
  },
  {
    id: 'tpl-berita-acara',
    title: 'Format Berita Acara & Notula Rapat Akademik',
    type: 'UNDANGAN',
    category: 'UNDANGAN',
    categoryLabel: 'Undangan & Rapat',
    description: 'Dokumen standar pencatatan hasil keputusan rapat, ringkasan notula, dan daftar absensi kehadiran pimpinan & dosen.',
    fileFormat: 'DOCX',
    fileSize: '37 KB',
    referenceNoPattern: '.../UTD/BA-RAPAT/XI/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_berita_acara_view',
    instructions: [
      'Tuliskan tanggal rapat, pimpinan sidang, dan notulis rapat.',
      'Catat poin-poin keputusan penting dan pembagian tanggung jawab (Action Items).',
      'Lampirkan lembar tanda tangan kehadiran fisik/digital.',
    ],
    lastUpdated: '20 Okt 2026',
    updatedBy: 'Tata Usaha',
    isPopular: false,
  },
  {
    id: 'tpl-proposal-ormawa',
    title: 'Format Pengajuan Proposal Kegiatan Ormawa / BEM',
    type: 'PERMOHONAN',
    category: 'PERMOHONAN',
    categoryLabel: 'Permohonan & Izin',
    description: 'Template baku lembar pengesahan dan format proposal pengajuan izin serta bantuan dana kegiatan organisasi mahasiswa/BEM.',
    fileFormat: 'DOCX',
    fileSize: '54 KB',
    referenceNoPattern: '.../PROP/ORMAWA/UTD/2026',
    driveViewUrl: 'https://docs.google.com/document/d/1_sample_proposal_ormawa_view',
    instructions: [
      'Lengkapi rincian latar belakang, tujuan, waktu, dan tempat kegiatan.',
      'Sertakan susunan panitia pelaksana dan rincian Rencana Anggaran Biaya (RAB).',
      'Lengkapi tanda tangan Ketua Pelaksana, Pembina Ormawa, dan Wakil Rektor.',
    ],
    lastUpdated: '15 Okt 2026',
    updatedBy: 'Kemahasiswaan UTD',
    isPopular: false,
  },
];
