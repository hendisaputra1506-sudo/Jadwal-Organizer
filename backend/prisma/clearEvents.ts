import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Membersihkan seluruh data jadwal kegiatan...');
  
  // Hapus semua relasi lampiran dan kandidat tanggal terlebih dahulu
  const attachmentResult = await prisma.eventAttachment.deleteMany();
  console.log(`✅ Berhasil menghapus ${attachmentResult.count} berkas lampiran kegiatan.`);

  const candidateResult = await prisma.eventCandidateDate.deleteMany();
  console.log(`✅ Berhasil menghapus ${candidateResult.count} data opsi kandidat tanggal.`);

  // Hapus seluruh data kegiatan
  const eventResult = await prisma.event.deleteMany();
  console.log(`✅ Berhasil menghapus ${eventResult.count} data kegiatan kampus.`);

  console.log('🎉 Seluruh jadwal kegiatan telah dikosongkan. Akun admin/staff dan master kategori tetap tersimpan.');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat menghapus jadwal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
