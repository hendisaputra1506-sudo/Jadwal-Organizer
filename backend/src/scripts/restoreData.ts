import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';

/**
 * Script untuk memulihkan (Restore) database dari berkas backup JSON.
 * Cara pakai:
 * npx tsx src/scripts/restoreData.ts [nama-file-backup.json]
 */
async function restoreDatabase() {
  const backupDir = path.join(process.cwd(), 'backups');
  let targetFile = process.argv[2];

  if (!targetFile) {
    if (!fs.existsSync(backupDir)) {
      console.error('❌ Folder backups belum ada. Tidak ada data yang bisa dipulihkan.');
      process.exit(1);
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('❌ Tidak ditemukan berkas backup di folder backups/.');
      process.exit(1);
    }

    targetFile = path.join(backupDir, files[0]);
    console.log(`ℹ️ Menggunakan berkas backup terbaru: ${files[0]}`);
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(backupDir, targetFile);
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ Berkas backup tidak ditemukan: ${targetFile}`);
    process.exit(1);
  }

  console.log(`🔄 Membaca berkas backup: ${targetFile}`);
  const rawData = fs.readFileSync(targetFile, 'utf-8');
  const backup = JSON.parse(rawData);

  if (!backup.tables) {
    console.error('❌ Format berkas backup tidak valid.');
    process.exit(1);
  }

  console.log('⚠️ Memulai proses pemulihan (Restoring data)...');

  // Gunakan Prisma Transaction untuk konsistensi
  await prisma.$transaction(async (tx) => {
    // 1. Pulihkan Kategori
    for (const cat of backup.tables.categories || []) {
      await tx.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name, color: cat.color, icon: cat.icon },
        create: { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon },
      });
    }

    // 2. Pulihkan Lokasi
    for (const loc of backup.tables.locations || []) {
      await tx.location.upsert({
        where: { id: loc.id },
        update: { name: loc.name },
        create: { id: loc.id, name: loc.name },
      });
    }

    // 3. Pulihkan Pengguna
    for (const u of backup.tables.users || []) {
      await tx.user.upsert({
        where: { id: u.id },
        update: {
          name: u.name,
          username: u.username,
          password_hash: u.password_hash,
          role: u.role,
        },
        create: {
          id: u.id,
          name: u.name,
          username: u.username,
          password_hash: u.password_hash,
          role: u.role,
        },
      });
    }

    // 4. Pulihkan Kegiatan
    for (const ev of backup.tables.events || []) {
      await tx.event.upsert({
        where: { id: ev.id },
        update: {
          name: ev.name,
          category_id: ev.category_id,
          status: ev.status,
          date_precision: ev.date_precision,
          estimated_month: ev.estimated_month,
          estimated_week_label: ev.estimated_week_label,
          event_date: ev.event_date ? new Date(ev.event_date) : null,
          start_time: ev.start_time,
          end_time: ev.end_time,
          is_all_day: ev.is_all_day,
          location_name: ev.location_name,
          location_id: ev.location_id,
          description: ev.description,
          contact_info: ev.contact_info,
          requirements_notes: ev.requirements_notes,
          is_deleted: ev.is_deleted,
          created_by_id: ev.created_by_id,
          updated_by_id: ev.updated_by_id,
        },
        create: {
          id: ev.id,
          name: ev.name,
          category_id: ev.category_id,
          status: ev.status,
          date_precision: ev.date_precision,
          estimated_month: ev.estimated_month,
          estimated_week_label: ev.estimated_week_label,
          event_date: ev.event_date ? new Date(ev.event_date) : null,
          start_time: ev.start_time,
          end_time: ev.end_time,
          is_all_day: ev.is_all_day,
          location_name: ev.location_name,
          location_id: ev.location_id,
          description: ev.description,
          contact_info: ev.contact_info,
          requirements_notes: ev.requirements_notes,
          is_deleted: ev.is_deleted,
          created_by_id: ev.created_by_id,
          updated_by_id: ev.updated_by_id,
        },
      });
    }

    // 5. Pulihkan Kandidat Tanggal
    for (const cd of backup.tables.candidateDates || []) {
      await tx.eventCandidateDate.upsert({
        where: { id: cd.id },
        update: {
          candidate_date: new Date(cd.candidate_date),
        },
        create: {
          id: cd.id,
          event_id: cd.event_id,
          candidate_date: new Date(cd.candidate_date),
        },
      });
    }

    // 6. Pulihkan Surat
    for (const letRec of backup.tables.letters || []) {
      await tx.letterRecord.upsert({
        where: { id: letRec.id },
        update: {
          template_type: letRec.template_type,
          title: letRec.title,
          reference_no: letRec.reference_no,
          event_id: letRec.event_id,
          payload_json: letRec.payload_json,
        },
        create: {
          id: letRec.id,
          template_type: letRec.template_type,
          title: letRec.title,
          reference_no: letRec.reference_no,
          event_id: letRec.event_id,
          created_by_id: letRec.created_by_id,
          payload_json: letRec.payload_json,
        },
      });
    }
  });

  console.log('🎉 Pemulihan database (Restore) berhasil 100%!');
}

restoreDatabase()
  .catch((err) => {
    console.error('❌ Gagal memulihkan database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
