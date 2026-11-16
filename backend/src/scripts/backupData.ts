import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';

/**
 * Script untuk membuat backup instan seluruh data database ke file JSON.
 * Data yang dicadangkan:
 * - Users
 * - Categories
 * - Locations
 * - Events (termasuk kegiatan yang di-soft-delete)
 * - EventCandidateDates
 * - EventAttachments
 * - LetterRecords
 */
async function backupDatabase() {
  console.log('📦 Memulai proses pencadangan database (Backup)...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const [users, categories, locations, events, candidateDates, attachments, letters] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.category.findMany(),
      prisma.location.findMany(),
      prisma.event.findMany({ include: { candidate_dates: true, attachments: true } }),
      prisma.eventCandidateDate.findMany(),
      prisma.eventAttachment.findMany(),
      prisma.letterRecord.findMany(),
    ]);

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      total_records: {
        users: users.length,
        categories: categories.length,
        locations: locations.length,
        events: events.length,
        candidate_dates: candidateDates.length,
        attachments: attachments.length,
        letters: letters.length,
      },
    },
    tables: {
      users,
      categories,
      locations,
      events,
      candidateDates,
      attachments,
      letters,
    },
  };

  const backupFileName = `backup-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log('✅ Pencadangan data berhasil diselesaikan!');
  console.log(`📁 File backup tersimpan di: ${backupFilePath}`);
  console.log('📊 Ringkasan Data Tersimpan:');
  console.log(`   - Pengguna (Users): ${users.length}`);
  console.log(`   - Kategori (Categories): ${categories.length}`);
  console.log(`   - Lokasi (Locations): ${locations.length}`);
  console.log(`   - Kegiatan (Events): ${events.length}`);
  console.log(`   - Kandidat Tanggal: ${candidateDates.length}`);
  console.log(`   - Lampiran Berkas: ${attachments.length}`);
  console.log(`   - Arsip Surat: ${letters.length}`);
}

backupDatabase()
  .catch((err) => {
    console.error('❌ Gagal mencadangkan database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
