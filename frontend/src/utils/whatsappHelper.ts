/**
 * Utility untuk membantu staf melakukan Quick Follow-up WhatsApp
 * ke pihak sekolah/mitra luar kampus terkait kepastian jadwal kegiatan.
 */

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
 * Menyusun pesan pembuka otomatis yang sopan, resmi, dan hangat atas nama kampus UTD
 */
export function generateFollowUpMessage(event: {
  name: string;
  contact_info?: string | null;
  date_precision?: string;
  candidate_dates?: Array<{ candidate_date: string | Date }>;
  estimated_month?: string | null;
  estimated_week_label?: string | null;
}): string {
  // Ambil nama kontak jika ada di dalam tanda kurung atau sebelum nomor
  let greetingName = 'Bapak/Ibu';
  if (event.contact_info) {
    const namePart = event.contact_info.split(/[-–(0-9:]/)[0].trim();
    if (namePart && namePart.length > 2 && !namePart.match(/^[0-9+]/)) {
      greetingName = namePart;
    }
  }

  let scheduleDetail = '';
  if (event.date_precision === 'CANDIDATES' && event.candidate_dates && event.candidate_dates.length > 0) {
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
  }

  const message = `Yth. ${greetingName},

Salam hangat dari kami Tim Panitia Kegiatan Kampus Universitas Teknologi Digital (UTD) PSDKU Tegal. 🙏

Sehubungan dengan agenda kegiatan:
📌 *${event.name}*

${scheduleDetail}Kami bermaksud melakukan konfirmasi kepastian jadwal pelaksanaan tersebut untuk sinkronisasi agenda dan persiapan tim panitia kampus.

Apakah waktu pelaksanaannya sudah dapat difinalkan Bapak/Ibu? 

Atas perhatian dan kerja sama baiknya, kami ucapkan terima kasih.`;

  return message;
}

/**
 * Membuat tautan resmi WhatsApp Web / App
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatToWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
