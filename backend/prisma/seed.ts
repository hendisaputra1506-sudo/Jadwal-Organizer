import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// PERINGATAN KEAMANAN:
// Kredensial berikut (admin / admin123 dan staff / staff123) merupakan
// KREDENSIAL PENGEMBANGAN (DEVELOPMENT-ONLY) untuk pengujian lokal.
// Kredensial ini WAJIB DIUBAH sebelum aplikasi dideploy ke server produksi!
// ============================================================================
async function main() {
  console.log('🌱 Memulai seeding database...');

  // 1. Bersihkan data lama
  await prisma.eventCandidateDate.deleteMany();
  await prisma.event.deleteMany();
  await prisma.location.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Buat Pengguna (Admin & Staff)
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const staffPasswordHash = await bcrypt.hash('staff123', salt);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Hendi (Admin Jadwal)',
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Staff Kampus',
      username: 'staff',
      password_hash: staffPasswordHash,
      role: 'USER',
    },
  });

  console.log('✅ Pengguna dibuat (admin & staff)');

  // 3. Buat Kategori
  const categoriesData = [
    { name: 'Sosialisasi PMB', color: '#2563EB', icon: 'GraduationCap' },
    { name: 'Akademik', color: '#059669', icon: 'BookOpen' },
    { name: 'Kegiatan Kampus', color: '#7C3AED', icon: 'Users' },
    { name: 'Rapat', color: '#D97706', icon: 'Briefcase' },
    { name: 'Seminar/Workshop', color: '#0284C7', icon: 'Presentation' },
    { name: 'Lainnya', color: '#64748B', icon: 'Calendar' },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categories[cat.name] = created.id;
  }
  console.log('✅ Kategori dibuat');

  // 4. Buat Lokasi
  const locationsData = [
    'Aula Utama',
    'Ruang Rapat A',
    'Ruang Rapat B',
    'Lab Komputer 1',
    'Gedung Serbaguna',
    'SMK YPE Nusantara Slawi',
    'SMA Negeri 1 Slawi',
  ];

  const locations: Record<string, string> = {};
  for (const locName of locationsData) {
    const created = await prisma.location.create({ data: { name: locName } });
    locations[locName] = created.id;
  }
  console.log('✅ Lokasi master dibuat');

  // 5. Buat Tanggal Acuan Hari Ini & Minggu Ini
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Hitung hari Senin minggu ini
  const dayOfWeek = today.getDay(); // 0 = Minggu, 1 = Senin
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);

  const getWeekDay = (offsetDays: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const dayMonday = getWeekDay(0);
  const dayTuesday = getWeekDay(1);
  const dayWednesday = getWeekDay(2);
  const dayThursday = getWeekDay(3);
  const dayFriday = getWeekDay(4);

  // 6. Buat Kegiatan Nyata
  // Event 1: Sosialisasi PMB dengan Kebutuhan Kegiatan lengkap
  await prisma.event.create({
    data: {
      name: 'Sosialisasi PMB 2027',
      category_id: categories['Sosialisasi PMB'],
      location_id: locations['SMK YPE Nusantara Slawi'],
      status: 'CONFIRMED',
      date_precision: 'EXACT',
      event_date: new Date(`${dayWednesday}T00:00:00.000Z`),
      start_time: '09:00',
      end_time: '12:00',
      is_all_day: false,
      contact_info: 'Bpk. Hartono (Kesiswaan SMK YPE - 081234567890)',
      description: 'Sosialisasi penerimaan mahasiswa baru angkatan 2027 dan pengenalan program beasiswa unggulan.',
      requirements_notes: `Barang:
• Banner PMB ukuran 3x1 meter
• Brosur PMB (300 lembar)
• Formulir pendaftaran & merchandise

Alat:
• Laptop panitia
• Proyektor & kabel HDMI
• Wireless pointer presenter
• Sound system portable

Konsumsi:
• Air mineral 2 dus
• Snack box untuk guru (15 box)
• Makan siang tim sosialisasi (5 box)`,
      created_by_id: adminUser.id,
    },
  });

  // Event 2: Rapat Koordinasi
  await prisma.event.create({
    data: {
      name: 'Rapat Koordinasi Akademik Semester Ganjil',
      category_id: categories['Rapat'],
      location_id: locations['Ruang Rapat A'],
      status: 'CONFIRMED',
      date_precision: 'EXACT',
      event_date: new Date(`${dayTuesday}T00:00:00.000Z`),
      start_time: '13:30',
      end_time: '15:30',
      is_all_day: false,
      contact_info: 'Sekretariat Rektorat (ext 102)',
      description: 'Evaluasi jadwal perkuliahan, ketersediaan ruang lab, dan persiapan ujian tengah semester.',
      requirements_notes: `Alat:
• Proyektor Ruang Rapat A
• Notula rapat digital

Konsumsi:
• Kopi & teh hangat
• Snack rapat (12 orang)`,
      created_by_id: adminUser.id,
    },
  });

  // Event 3: Workshop Penulisan Jurnal di Lab Komputer
  await prisma.event.create({
    data: {
      name: 'Workshop Publikasi Jurnal Terakreditasi SINTA',
      category_id: categories['Seminar/Workshop'],
      location_id: locations['Lab Komputer 1'],
      status: 'CONFIRMED',
      date_precision: 'EXACT',
      event_date: new Date(`${dayThursday}T00:00:00.000Z`),
      start_time: '08:30',
      end_time: '12:00',
      is_all_day: false,
      contact_info: 'LPPM Kampus (Dr. Rahmawati)',
      description: 'Pelatihan teknis sitasi Mendeley dan submit ke jurnal bereputasi.',
      requirements_notes: `Alat:
• Akun Mendeley & koneksi internet stabil
• 30 PC Lab aktif

Konsumsi:
• Snack pagi & air mineral`,
      created_by_id: adminUser.id,
    },
  });

  // Event 4: Kegiatan Tentatif (Kandidat Tanggal) - Menunggu Konfirmasi
  const candEvent = await prisma.event.create({
    data: {
      name: 'Kunjungan Studi Banding Politeknik Mitra',
      category_id: categories['Kegiatan Kampus'],
      location_id: locations['Aula Utama'],
      status: 'WAITING_CONFIRMATION',
      date_precision: 'CANDIDATES',
      start_time: '09:00',
      end_time: '14:00',
      contact_info: 'Humas Politeknik Mitra (Ibu Dewi - 085678901234)',
      description: 'Studi banding tata kelola penjaminan mutu dan laboratorium komputer kampus.',
      requirements_notes: `Barang:
• Plakat cendera mata
• Map materi pengenalan kampus

Konsumsi:
• Makan siang prasmanan 25 orang`,
      created_by_id: adminUser.id,
    },
  });

  // 3 kandidat tanggal
  const nextWeekDay1 = new Date(monday);
  nextWeekDay1.setDate(monday.getDate() + 7);
  const nextWeekDay2 = new Date(monday);
  nextWeekDay2.setDate(monday.getDate() + 9);
  const nextWeekDay3 = new Date(monday);
  nextWeekDay3.setDate(monday.getDate() + 11);

  await prisma.eventCandidateDate.createMany({
    data: [
      { event_id: candEvent.id, candidate_date: new Date(`${nextWeekDay1.toISOString().split('T')[0]}T00:00:00.000Z`) },
      { event_id: candEvent.id, candidate_date: new Date(`${nextWeekDay2.toISOString().split('T')[0]}T00:00:00.000Z`) },
      { event_id: candEvent.id, candidate_date: new Date(`${nextWeekDay3.toISOString().split('T')[0]}T00:00:00.000Z`) },
    ],
  });

  // Event 5: Kegiatan Tentatif (Bulan Saja)
  await prisma.event.create({
    data: {
      name: 'Expo Karir & Bursa Kerja Kampus 2026',
      category_id: categories['Kegiatan Kampus'],
      location_id: locations['Gedung Serbaguna'],
      status: 'DRAFT',
      date_precision: 'MONTH',
      estimated_month: '2026-11',
      description: 'Pameran lowongan kerja tahunan mengundang 20 perusahaan mitra.',
      requirements_notes: `Barang:
• Booth pameran 20 unit
• Sound system lapangan`,
      created_by_id: adminUser.id,
    },
  });

  // Event 6: Kegiatan Tentatif (Minggu Saja)
  await prisma.event.create({
    data: {
      name: 'Seminar Nasional AI & Transformasi Digital',
      category_id: categories['Seminar/Workshop'],
      location_id: locations['Aula Utama'],
      status: 'DRAFT',
      date_precision: 'WEEK',
      estimated_month: '2026-10',
      estimated_week_label: 'Minggu ke-3 Oktober 2026',
      description: 'Seminar nasional bersama narasumber industri teknologi.',
      created_by_id: adminUser.id,
    },
  });

  console.log('✅ Kegiatan contoh realistis berhasil di-seed!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan pada seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
