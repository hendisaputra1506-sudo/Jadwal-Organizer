import { DownloadableTemplateItem } from '../types/letterTemplates';

/**
 * Utility untuk menghasilkan dokumen Microsoft Word (.doc / Word XML) siap pakai
 * dengan Kop Surat Resmi UTD PSDKU Tegal, margin rapi, dan placeholder siap edit.
 */
export function generateWordDocumentBlob(template: DownloadableTemplateItem): Blob {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Isi dokumen berdasarkan jenis template
  let documentBody = '';

  switch (template.type) {
    case 'TUGAS':
      documentBody = `
        <div class="doc-title">SURAT TUGAS</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD-TEGAL/ST/XI/2026'}</span></div>

        <p>Pimpinan Universitas Teknologi Digital PSDKU Tegal dengan ini memberikan tugas kedinasan kepada :</p>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 35%;">Nama Lengkap & NIDN / NIP</th>
              <th style="width: 30%;">Jabatan / Program Studi</th>
              <th style="width: 30%;">Peran dalam Penugasan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><span class="highlight">[Nama Dosen / Staf 1, M.Kom.]</span><br><small>NIDN: [06XXXXXXXX]</small></td>
              <td>Dosen Tetap Teknik Informatika</td>
              <td>Koordinator Pelaksana</td>
            </tr>
            <tr>
              <td style="text-align: center;">2</td>
              <td><span class="highlight">[Nama Dosen / Staf 2, S.Kom.]</span><br><small>NIP: [19XXXXXXXX]</small></td>
              <td>Staf BAAK & Akademik</td>
              <td>Anggota Tim Penugasan</td>
            </tr>
          </tbody>
        </table>

        <p>Untuk melaksanakan kegiatan :</p>
        <table style="width: 100%; margin-left: 20px; font-size: 11pt;">
          <tr>
            <td style="width: 25%; font-weight: bold;">Kegiatan / Acara</td>
            <td style="width: 3%;">:</td>
            <td><span class="highlight">[Tuliskan Nama Kegiatan / Pelatihan / Pengabdian di sini]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Hari, Tanggal</td>
            <td>:</td>
            <td><span class="highlight">[Contoh: Kamis – Jumat, 12 – 13 November 2026]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Waktu</td>
            <td>:</td>
            <td><span class="highlight">[08.30 – 16.00 WIB]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Tempat / Lokasi</td>
            <td>:</td>
            <td><span class="highlight">[Contoh: Ruang Rapat Senat / Lokasi Mitra Luar Kampus]</span></td>
          </tr>
        </table>

        <p style="margin-top: 15px;">Demikian surat tugas ini diberikan kepada yang bersangkutan agar dapat dilaksanakan dengan penuh tanggung jawab dan melaporkan hasilnya setelah kegiatan selesai.</p>
      `;
      break;

    case 'MAGANG':
      documentBody = `
        <div class="doc-title">SURAT KETERANGAN MAGANG / INTERNSHIP</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD/BAAK/KET-MAGANG/XI/2026'}</span></div>

        <p>Yang bertanda tangan di bawah ini :</p>
        <table style="width: 100%; margin-left: 20px; font-size: 11pt; margin-bottom: 12px;">
          <tr>
            <td style="width: 28%; font-weight: bold;">Nama</td>
            <td style="width: 3%;">:</td>
            <td>Ibu Aries Setyani Wahyu Prasetyawati, S.P., M.M.</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Jabatan</td>
            <td>:</td>
            <td>Ketua UTD PSDKU Tegal</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Instansi</td>
            <td>:</td>
            <td>Universitas Teknologi Digital PSDKU Tegal</td>
          </tr>
        </table>

        <p>Dengan ini menerangkan bahwa mahasiswa di bawah ini :</p>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35%;">Nama Mahasiswa</th>
              <th style="width: 20%;">NIM</th>
              <th style="width: 25%;">Program Studi</th>
              <th style="width: 20%;">Jenjang</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="highlight">[Nama Mahasiswa 1]</span></td>
              <td><span class="highlight">[253030XX]</span></td>
              <td>Manajemen Informatika</td>
              <td>Diploma III (D3)</td>
            </tr>
            <tr>
              <td><span class="highlight">[Nama Mahasiswa 2]</span></td>
              <td><span class="highlight">[253030YY]</span></td>
              <td>Sistem Informasi</td>
              <td>Strata 1 (S1)</td>
            </tr>
          </tbody>
        </table>

        <p>Telah benar-benar melaksanakan kegiatan <strong>Internship / Magang Mandiri</strong> di lingkungan Universitas Teknologi Digital PSDKU Tegal terhitung sejak tanggal <span class="highlight">[13 Agustus 2026]</span> sampai dengan <span class="highlight">[27 November 2026]</span> dengan hasil yang baik.</p>

        <p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk diketahui dan dapat dipergunakan sebagaimana mestinya.</p>
      `;
      break;

    case 'UNDANGAN':
      documentBody = `
        <div class="doc-title">SURAT UNDANGAN RESMI</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD/UND/XI/2026'}</span></div>

        <table style="width: 100%; font-size: 11pt; margin-bottom: 15px;">
          <tr>
            <td style="width: 15%;">Lampiran</td>
            <td style="width: 3%;">:</td>
            <td>1 (Satu) Berkas Susunan Acara</td>
          </tr>
          <tr>
            <td>Perihal</td>
            <td>:</td>
            <td><strong><span class="highlight">[Undangan Rapat Koordinasi Akademik & Kurikulum 2026/2027]</span></strong></td>
          </tr>
        </table>

        <p>Kepada Yth.<br>
        <strong><span class="highlight">Bapak / Ibu Dosen & Staf Akademik UTD PSDKU Tegal</span></strong><br>
        Di Tempat</p>

        <p>Dengan hormat,<br>
        Sehubungan dengan akan dimulainya persiapan agenda akademik semester mendatang, bersama ini kami mengundang Bapak/Ibu/Saudara untuk hadir dalam rapat koordinasi yang akan dilaksanakan pada :</p>

        <table style="width: 100%; margin-left: 20px; font-size: 11pt; margin-bottom: 15px;">
          <tr>
            <td style="width: 25%; font-weight: bold;">Hari / Tanggal</td>
            <td style="width: 3%;">:</td>
            <td><span class="highlight">[Contoh: Selasa, 10 November 2026]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Pukul / Waktu</td>
            <td>:</td>
            <td><span class="highlight">[09.00 – 12.00 WIB s/d Selesai]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Tempat</td>
            <td>:</td>
            <td><span class="highlight">[Ruang Rapat Utama Gedung A / Tautan Zoom Meeting]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Agenda Pembahasan</td>
            <td>:</td>
            <td><span class="highlight">[Evaluasi Perkuliahan, Penjadwalan Ujian, dan Sosialisasi PMB]</span></td>
          </tr>
        </table>

        <p>Mengingat pentingnya agenda tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerjasamanya, kami sampaikan terima kasih.</p>
      `;
      break;

    case 'AKTIF':
      documentBody = `
        <div class="doc-title">SURAT KETERANGAN AKTIF KULIAH</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD-TEGAL/BAAK/AKTIF/XI/2026'}</span></div>

        <p>Pimpinan Universitas Teknologi Digital PSDKU Tegal, dengan ini menerangkan dengan sesungguhnya bahwa :</p>

        <table style="width: 100%; margin-left: 20px; font-size: 11pt; margin-bottom: 15px;">
          <tr>
            <td style="width: 28%; font-weight: bold;">Nama Mahasiswa</td>
            <td style="width: 3%;">:</td>
            <td><strong><span class="highlight">[Nama Lengkap Mahasiswa]</span></strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Nomor Induk Mahasiswa (NIM)</td>
            <td>:</td>
            <td><span class="highlight">[253030XXXX]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Program Studi / Jenjang</td>
            <td>:</td>
            <td><span class="highlight">[Teknik Informatika / Strata Satu (S1)]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Semester / Tahun Akademik</td>
            <td>:</td>
            <td><span class="highlight">[Semester Ganjil / T.A. 2026/2027]</span></td>
          </tr>
        </table>

        <p>Adalah benar terdaftar sebagai mahasiswa aktif pada Universitas Teknologi Digital PSDKU Tegal.</p>

        <p>Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan :<br>
        <strong><span class="highlight">[Kelengkapan Pengajuan Beasiswa / Tunjangan Gaji Orang Tua / BPJS Kesehatan]</span></strong>.</p>

        <p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      `;
      break;

    case 'PERMOHONAN':
      documentBody = `
        <div class="doc-title">SURAT PERMOHONAN RESMI</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD/PMB/IZIN/XI/2026'}</span></div>

        <table style="width: 100%; font-size: 11pt; margin-bottom: 15px;">
          <tr>
            <td style="width: 15%;">Perihal</td>
            <td style="width: 3%;">:</td>
            <td><strong><span class="highlight">[Permohonan Izin Sosialisasi PMB / Kunjungan Industri]</span></strong></td>
          </tr>
        </table>

        <p>Kepada Yth.<br>
        <strong><span class="highlight">Bapak / Ibu Kepala SMK / SMA / Instansi Mitra</span></strong><br>
        Di Tempat</p>

        <p>Dengan hormat,<br>
        Dalam rangka pelaksanaan agenda tahunan Universitas Teknologi Digital PSDKU Tegal mengenai pengenalan dunia perkuliahan dan teknologi digital kepada siswa tingkat akhir, bersama ini kami bermaksud mengajukan permohonan izin untuk menyelenggarakan kegiatan sosialisasi pada :</p>

        <table style="width: 100%; margin-left: 20px; font-size: 11pt; margin-bottom: 15px;">
          <tr>
            <td style="width: 25%; font-weight: bold;">Hari / Tanggal</td>
            <td style="width: 3%;">:</td>
            <td><span class="highlight">[Contoh: Rabu, 18 November 2026]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Waktu</td>
            <td>:</td>
            <td><span class="highlight">[09.00 – 11.30 WIB]</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Sasaran Peserta</td>
            <td>:</td>
            <td><span class="highlight">[Siswa-Siswi Kelas XII Semua Jurusan]</span></td>
          </tr>
        </table>

        <p>Besar harapan kami Bapak/Ibu berkenan memberikan izin atas terselenggaranya kegiatan ini. Untuk koordinasi teknis, pihak sekolah dapat menghubungi tim kami melalui narahubung: <strong><span class="highlight">[Nama PIC PMB - No. HP/WA: 08XXXXXXXXXX]</span></strong>.</p>

        <p>Demikian permohonan ini kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu kami haturkan terima kasih.</p>
      `;
      break;

    default:
      documentBody = `
        <div class="doc-title">${template.title.toUpperCase()}</div>
        <div class="doc-ref">Nomor : <span class="highlight">${template.referenceNoPattern || '..../UTD-TEGAL/2026'}</span></div>

        <p>Dengan hormat,</p>
        <p><span class="highlight">[Tuliskan isi surat resmi di sini. Anda dapat mengubah font, spasi, menambahkan tabel, dan menyesuaikan kebutuhan format di Microsoft Word.]</span></p>

        <p>Demikian surat ini dibuat agar dapat dipergunakan sebagaimana mestinya.</p>
      `;
      break;
  }

  // Format HTML Lengkap yang didesain khusus agar dibuka Microsoft Word dengan layout A4 dan Kop Surat Resmi
  const fullHtmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm; /* A4 */
          margin: 2.0cm 2.5cm 2.0cm 2.5cm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.45;
          color: #000000;
        }
        .header-kop {
          text-align: center;
          border-bottom: 3px double #000000;
          padding-bottom: 8px;
          margin-bottom: 24px;
        }
        .header-univ {
          font-size: 15pt;
          font-weight: bold;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-sub {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #0B1E3F;
        }
        .header-address {
          font-size: 9.5pt;
          color: #333333;
          margin-top: 3px;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: bold;
          text-align: center;
          text-decoration: underline;
          margin-top: 10px;
        }
        .doc-ref {
          font-size: 10.5pt;
          text-align: center;
          margin-bottom: 22px;
        }
        .highlight {
          background-color: #FFFF00;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0;
          font-size: 11pt;
        }
        .data-table th, .data-table td {
          border: 1px solid #000000;
          padding: 6px 10px;
          vertical-align: top;
        }
        .data-table th {
          background-color: #F1F5F9;
          text-align: center;
          font-weight: bold;
        }
        .sig-container {
          width: 100%;
          margin-top: 35px;
        }
        .sig-box {
          float: right;
          width: 260px;
          text-align: left;
          font-size: 11pt;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- KOP SURAT RESMI UTD -->
        <div class="header-kop">
          <div class="header-univ">UNIVERSITAS TEKNOLOGI DIGITAL</div>
          <div class="header-sub">PROGRAM STUDI DI LUAR KAMPUS UTAMA (PSDKU) TEGAL</div>
          <div class="header-address">
            Jl. Mataram No. 9, Kota Tegal, Jawa Tengah 52142<br>
            Telp: (0283) 351234 &bull; Email: info@utd.ac.id &bull; Website: https://utd.ac.id
          </div>
        </div>

        <!-- ISI SURAT DINAMIS -->
        ${documentBody}

        <!-- PENGESAHAN / TANDA TANGAN RESMI -->
        <div class="sig-container">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="width: 50%;"></td>
              <td style="width: 50%;">
                <div class="sig-box">
                  <div>Tegal, <span class="highlight">${currentDate}</span></div>
                  <div style="margin-top: 4px; font-weight: bold;">Ketua UTD PSDKU Tegal,</div>
                  <br><br><br><br>
                  <div style="font-weight: bold; text-decoration: underline;">Ibu Aries Setyani Wahyu Prasetyawati, S.P., M.M.</div>
                  <div style="font-size: 10pt; color: #444;">NIDN / NIP : 062809XXXX</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  return new Blob([fullHtmlContent], {
    type: 'application/msword;charset=utf-8',
  });
}

/**
 * Memicu pengunduhan dokumen langsung ke browser pengguna
 */
export function downloadWordTemplate(template: DownloadableTemplateItem): void {
  // Jika memiliki direct download URL dari Google Drive, unduh dari URL tersebut
  if (template.driveDownloadUrl) {
    window.open(template.driveDownloadUrl, '_blank');
    return;
  }

  // Generate dokumen Microsoft Word resmi
  const blob = generateWordDocumentBlob(template);
  const cleanTitle = template.title.replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = `Template_${cleanTitle}_UTD.doc`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

