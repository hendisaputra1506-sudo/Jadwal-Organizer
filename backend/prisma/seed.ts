import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Menyiapkan database bersih (Clean Production Seed)...');

  // 1. Bersihkan seluruh data pengguna & kegiatan lama
  await prisma.eventCandidateDate.deleteMany();
  await prisma.eventAttachment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.letterRecord.deleteMany();
  await prisma.user.deleteMany();

  // 2. Buat Akun Administrator Tunggal (Hendi Saputra)
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('HendiUTD2026!#', salt);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Hendi Saputra',
      username: 'hendi',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Akun Administrator berhasil dibuat:');
  console.log(`   - Nama     : ${adminUser.name}`);
  console.log(`   - Username : ${adminUser.username}`);
  console.log(`   - Password : HendiUTD2026!#`);
  console.log(`   - Role     : ${adminUser.role}`);

  // 3. Pastikan Master Kategori tersedia
  const categoriesData = [
    { name: 'Sosialisasi PMB', color: '#2563EB', icon: 'GraduationCap' },
    { name: 'Akademik', color: '#059669', icon: 'BookOpen' },
    { name: 'Kegiatan Kampus', color: '#7C3AED', icon: 'Users' },
    { name: 'Rapat', color: '#D97706', icon: 'Briefcase' },
    { name: 'Seminar/Workshop', color: '#0284C7', icon: 'Presentation' },
    { name: 'Lainnya', color: '#64748B', icon: 'Calendar' },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { color: cat.color, icon: cat.icon },
      create: cat,
    });
  }
  console.log('✅ Master kategori siap.');

  // 4. Pastikan Master Lokasi Kampus tersedia
  const locationsData = [
    'Aula Utama',
    'Ruang Rapat A',
    'Ruang Rapat B',
    'Lab Komputer 1',
    'Gedung Serbaguna',
    'SMK YPE Nusantara Slawi',
    'SMA Negeri 1 Slawi',
  ];

  for (const locName of locationsData) {
    await prisma.location.upsert({
      where: { name: locName },
      update: {},
      create: { name: locName },
    });
  }
  console.log('✅ Master lokasi siap.');

  console.log('🎉 Setup database selesai! Database kini bersih tanpa dummy data dan siap digunakan untuk operasional resmi.');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan pada seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
