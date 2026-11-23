/**
 * Utility untuk membantu staf & admin melakukan komunikasi WhatsApp
 * ke pihak sekolah/mitra luar kampus sesuai status kegiatan (Tentatif, Pasti/Terjadwal, Selesai, Batal).
 */

export type WhatsAppTemplateMode =
  | 'CONFIRMED'
  | 'WAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Mengekstrak nomor handphone Indonesia (08..., 628..., +628...) dari teks bebas narahubung.
 * Contoh: "Bpk. Hartono (0812-3456-7890)" -> "081234567890"
 */
export function extractPhoneNumber(text: string | null | undefined): string | null {
  if (!text) return null;

  // Pola mencari angka nomor HP: 08xx atau +628xx atau 628xx dengan panjang 9 - 14 digit
  const match = text.match(/(?:\+?62|0)8[1-9][0-9\s\-]{6,13}[0-9]/);
  if (!match) return null;

  // Bersihkan spasi, strip, dan karakter non-angka kecuali tanda +
  const cleaned = match[0].replace(/[\s\-()]/g, '');
  return cleaned;
}

/**
 * Menstandarkan nomor telepon ke format internasional WhatsApp (628xxxxxxxx)
 */
export function formatToWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.substring(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Menentukan mode template default berdasarkan status dan kepastian tanggal kegiatan
 */
export function detectDefaultTemplateMode(event: {
  status?: string;
  date_precision?: string;
}): WhatsAppTemplateMode {
  if (event.status === 'COMPLETED') return 'COMPLETED';
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'CONFIRMED' || event.date_precision === 'EXACT') {
    return 'CONFIRMED';
  }
  return 'WAITING_CONFIRMATION';
}

/**
 * Menyusun pesan WhatsApp otomatis yang menyesuaikan status kegiatan:
 * - CONFIRMED / EXACT: Konfirmasi bahwa tim (misal Tim PMB) jadi melaksanakan kegiatan (besok / hari ini / tanggal pasti)
 * - WAITING_CONFIRMATION / DRAFT: Meminta kepastian tanggal / follow-up jadwal tentatif
 * - COMPLETED: Ucapan terima kasih pasca pelaksanaan kegiatan
 * - CANCELLED: Informasi penundaan / pembatalan kegiatan
 */
export function generateFollowUpMessage(
  event: {
    name: string;
    status?: string;
    contact_info?: string | null;
    date_precision?: string;
    event_date?: string | Date | null;
    start_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean;
    location_name?: string | null;
    location?: { name: string } | null;
    category?: { name: string } | null;
    candidate_dates?: Array<{ candidate_date: string | Date }>;
    estimated_month?: string | null;
    estimated_week_label?: string | null;
    officers?: Array<{ role?: string | null; user?: { name?: string | null; username?: string | null } }>;
  },
  modeOverride?: WhatsAppTemplateMode
): string {
  const mode = modeOverride || detectDefaultTemplateMode(event);

  // 1. Ambil sapaan nama kontak jika ada sebelum nomor HP / tanda kurung
  let greetingName = 'Bapak/Ibu';
  if (event.contact_info) {
    const namePart = event.contact_info.split(/[-–(0-9:]/)[0].trim();
    if (namePart && namePart.length > 2 && !namePart.match(/^[0-9+]/)) {
      greetingName = namePart;
    }
  }

  // 2. Deteksi nama tim berdasarkan kategori atau nama kegiatan (misal Tim PMB untuk Sosialisasi/PMB)
  const combinedText = `${event.name} ${event.category?.name || ''}`.toLowerCase();
  const isPMB =
    combinedText.includes('pmb') ||
    combinedText.includes('sosialisasi') ||
    combinedText.includes('promosi') ||
    combinedText.includes('sekolah') ||
    combinedText.includes('kunjungan');

  const fullTeamName = isPMB
    ? 'Tim PMB Universitas Teknologi Digital (UTD) PSDKU Tegal'
    : 'Tim Panitia Kegiatan Kampus Universitas Teknologi Digital (UTD) PSDKU Tegal';

  const shortTeamName = isPMB ? 'Tim PMB UTD PSDKU Tegal' : 'Tim UTD PSDKU Tegal';

  // 3. Format tanggal pelaksanaan & deteksi kata relatif (hari ini, besok, lusa)
  let formattedExactDate = '';
  let relativeDayPhrase = 'sesuai jadwal yang telah disepakati';
  let relativeBadge = '';

  if (event.event_date) {
    const dateStr = String(event.event_date).split('T')[0];
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round(
        (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      formattedExactDate = targetDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (diffDays === 0) {
        relativeDayPhrase = `*hari ini (${formattedExactDate})*`;
        relativeBadge = ' (Hari Ini)';
      } else if (diffDays === 1) {
        relativeDayPhrase = `*besok (${formattedExactDate})*`;
        relativeBadge = ' (Besok)';
      } else if (diffDays === 2) {
        relativeDayPhrase = `*lusa (${formattedExactDate})*`;
        relativeBadge = ' (Lusa)';
      } else {
        relativeDayPhrase = `pada hari *${formattedExactDate}*`;
      }
    }
  } else {
    // Jika status sudah diubah ke Pasti tetapi tanggal spesifik belum dipilih, gunakan istilah besok / sesuai jadwal
    relativeDayPhrase = '*besok / sesuai jadwal yang telah disepakati*';
  }

  // 4. Format waktu & lokasi
  const timeText = event.is_all_day
    ? 'Sepanjang Hari'
    : event.start_time && event.end_time
    ? `${event.start_time} – ${event.end_time} WIB`
    : event.start_time
    ? `Pukul ${event.start_time} WIB – Selesai`
    : '';

  const locationText = event.location_name || event.location?.name || '';

  // ============================================================================
  // MODE 1: CONFIRMED (JADWAL PASTI -> KONFIRMASI JADI MELAKSANAKAN KEGIATAN)
  // ============================================================================
  if (mode === 'CONFIRMED') {
    const detailLines: string[] = [`📌 Kegiatan: *${event.name}*`];
    if (formattedExactDate) {
      detailLines.push(`🗓️ Hari/Tanggal: *${formattedExactDate}${relativeBadge}*`);
    }
    if (timeText) {
      detailLines.push(`⏰ Waktu: *${timeText}*`);
    }
    if (locationText) {
      detailLines.push(`📍 Lokasi: *${locationText}*`);
    }
    if (event.officers && event.officers.length > 0) {
      detailLines.push(
        `👥 Petugas/Personil: *${event.officers
          .map((o) => `@${o.user?.name || 'Staf'} (${o.role})`)
          .join(', ')}*`
      );
    }

    return `Yth. ${greetingName},

Salam hangat dari kami ${fullTeamName}. 🙏

Melalui pesan ini, kami ingin mengonfirmasi bahwa ${relativeDayPhrase}, kami dari ${shortTeamName} jadi melaksanakan kegiatan:

${detailLines.join('\n')}

Tim kami sudah siap hadir untuk melaksanakan agenda tersebut. Mohon izin konfirmasi Bapak/Ibu, apakah ada arahan tambahan atau hal teknis di lokasi yang perlu kami sesuaikan?

Atas perhatian, sambutan, dan kerja sama baiknya, kami ucapkan terima kasih. Sampai jumpa di lokasi kegiatan. 🙏`;
  }

  // ============================================================================
  // MODE 2: COMPLETED (KEGIATAN SELESAI -> UCAPAN TERIMA KASIH)
  // ============================================================================
  if (mode === 'COMPLETED') {
    return `Yth. ${greetingName},

Salam hangat dari kami ${fullTeamName}. 🙏

Kami mengucapkan terima kasih yang sebesar-besarnya atas sambutan, fasilitas, serta kerja sama yang sangat baik dalam pelaksanaan kegiatan:
📌 *${event.name}*${locationText ? `\n📍 Lokasi: *${locationText}*` : ''}

Semoga kegiatan yang telah terlaksana memberikan manfaat yang optimal dan silaturahmi serta kerja sama baik ini dapat terus berlanjut di kesempatan berikutnya. 🙏`;
  }

  // ============================================================================
  // MODE 3: CANCELLED (DIBATALKAN / DITUNDA)
  // ============================================================================
  if (mode === 'CANCELLED') {
    return `Yth. ${greetingName},

Salam hangat dari kami ${fullTeamName}. 🙏

Sehubungan dengan rencana kegiatan:
📌 *${event.name}*

Dengan penuh permohonan maaf, kami menginformasikan bahwa pelaksanaan kegiatan tersebut saat ini terpaksa ditunda / dibatalkan sementara waktu dikarenakan adanya penyesuaian agenda kampus. Kami akan segera menghubungi Bapak/Ibu kembali terkait koordinasi jadwal pengganti.

Atas pengertian dan kerja sama baik Bapak/Ibu, kami ucapkan terima kasih. 🙏`;
  }

  // ============================================================================
  // MODE 4: WAITING_CONFIRMATION / DRAFT (TENTATIF -> MINTA KEPASTIAN TANGGAL)
  // ============================================================================
  let scheduleDetail = '';
  if (
    event.date_precision === 'CANDIDATES' &&
    event.candidate_dates &&
    event.candidate_dates.length > 0
  ) {
    const datesFormatted = event.candidate_dates
      .map((c) => {
        const d = new Date(c.candidate_date);
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      })
      .join(', ');
    scheduleDetail = `Adapun opsi pilihan tanggal yang sebelumnya direncanakan adalah: ${datesFormatted}. `;
  } else if (event.date_precision === 'WEEK' && event.estimated_week_label) {
    scheduleDetail = `Adapun perkiraan jadwal yang direncanakan adalah pada ${event.estimated_week_label}. `;
  } else if (event.date_precision === 'MONTH' && event.estimated_month) {
    scheduleDetail = `Adapun perkiraan jadwal yang direncanakan adalah pada bulan ${event.estimated_month}. `;
  } else if (formattedExactDate) {
    scheduleDetail = `Adapun rencana tanggal yang diajukan adalah pada ${formattedExactDate}. `;
  }

  return `Yth. ${greetingName},

Salam hangat dari kami ${fullTeamName}. 🙏

Sehubungan dengan agenda kegiatan:
📌 *${event.name}*

${scheduleDetail}Kami bermaksud melakukan konfirmasi kepastian jadwal pelaksanaan tersebut untuk sinkronisasi agenda dan persiapan ${shortTeamName}.

Apakah waktu pelaksanaannya sudah dapat difinalkan Bapak/Ibu?

Atas perhatian dan kerja sama baiknya, kami ucapkan terima kasih. 🙏`;
}

/**
 * Membuat tautan resmi WhatsApp Web / App
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatToWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
