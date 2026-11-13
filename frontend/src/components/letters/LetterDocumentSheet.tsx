import React from 'react';
import { OfficialKopSurat } from './OfficialKopSurat';
import { LetterData, RecipientItem } from '../../types/letterTemplates';

interface LetterDocumentSheetProps {
  letterData: LetterData;
  recipient: RecipientItem;
  sheetIndex?: number;
  totalSheets?: number;
  className?: string;
  isPrintOnly?: boolean;
  customKopUrl?: string | null;
  hideKopForPhysicalPrint?: boolean;
}

export const LetterDocumentSheet: React.FC<LetterDocumentSheetProps> = ({
  letterData,
  recipient,
  sheetIndex,
  totalSheets,
  className = '',
  isPrintOnly = false,
  customKopUrl = null,
  hideKopForPhysicalPrint = false,
}) => {
  const {
    templateType,
    title,
    referenceNo,
    subject,
    signerName,
    signerPosition,
    openingText,
    closingText,
    city = 'Tegal',
    letterDate,
    activityLocation,
    activityDateRange,
    activityTime,
    eventAgenda,
    customContent,
  } = letterData;

  // Format Nama Penerima
  const recipientName = recipient.name || '—';
  const recipientNim = recipient.nim || '—';
  const recipientProdi = recipient.studyProgram || '—';
  const recipientJenjang = recipient.studyLevel || 'D3';
  const recipientLocation = recipient.location || activityLocation || 'UTD PSDKU Tegal';
  const recipientDates = recipient.dateRange || activityDateRange || '—';

  return (
    <div
      className={`letter-sheet bg-white text-black font-serif print:shadow-none print:border-none print:m-0 print:p-0 ${
        isPrintOnly ? 'hidden print:block' : ''
      } ${className}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: 0,
        margin: '0 auto',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        lineHeight: 1.5,
        fontSize: '11.5pt',
        fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
      }}
    >
      {/* 1. KOP SURAT RESMI (Full-bleed edge-to-edge sesuai template PDF asli) */}
      <OfficialKopSurat
        customKopUrl={customKopUrl}
        hideKopForPhysicalPrint={hideKopForPhysicalPrint}
      />

      {/* 2. AREA KONTEN DOKUMEN (Dengan margin resmi 20-22mm) */}
      <div
        className="letter-body-content"
        style={{
          padding: '6mm 22mm 20mm 22mm',
          boxSizing: 'border-box',
        }}
      >
        {/* JUDUL DAN NOMOR SURAT */}
        <div className="text-center mt-2 mb-5">
          <h2 className="text-base sm:text-lg font-bold tracking-wider uppercase underline underline-offset-4 decoration-1 font-serif">
            {title || 'SURAT KETERANGAN'}
          </h2>
          <p className="text-xs sm:text-sm font-bold tracking-tight mt-1 font-serif">
            {referenceNo || '27/UTD/BAAK/VIII/2026'}
          </p>

        {/* Sub-judul / Perihal jika ada */}
        {subject && (
          <div className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-tight max-w-lg mx-auto font-serif">
            {subject}
          </div>
        )}
      </div>

      {/* 3. ISI SURAT BERDASARKAN TEMPLATE */}
      <div className="text-justify space-y-4 text-xs sm:text-sm leading-relaxed font-serif">
        {/* TEMPLATE 1: MAGANG / INTERNSHIP (Sesuai persis dengan format PDF) */}
        {templateType === 'MAGANG' && (
          <>
            <div>
              <p className="mb-2">{openingText || 'Yang bertanda tangan di bawah ini :'}</p>
              <table className="w-full border-collapse ml-4 text-xs sm:text-sm">
                <tbody>
                  <tr>
                    <td className="w-28 py-0.5 align-top">Nama</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-medium">{signerName}</td>
                  </tr>
                  <tr>
                    <td className="w-28 py-0.5 align-top">Jabatan</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-medium">{signerPosition}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-2">Menerangkan bahwa :</p>
              <table className="w-full border-collapse ml-4 text-xs sm:text-sm">
                <tbody>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">Nama</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{recipientName}</td>
                  </tr>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">NIM</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5">{recipientNim}</td>
                  </tr>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">Program Studi</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5">{recipientProdi}</td>
                  </tr>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">Jenjang Studi</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5">{recipientJenjang}</td>
                  </tr>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">Telah melaksanakan kegiatan di</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-medium">{recipientLocation}</td>
                  </tr>
                  <tr>
                    <td className="w-56 py-0.5 align-top whitespace-nowrap">Dari tanggal</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-medium">{recipientDates}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">
              {closingText ||
                'Demikian surat pernyataan ini dibuat untuk diketahui dan dipergunakan sebagaimana mestinya.'}
            </p>
          </>
        )}

        {/* TEMPLATE 2: SURAT TUGAS */}
        {templateType === 'TUGAS' && (
          <>
            <p>
              {openingText ||
                'Pimpinan Universitas Teknologi Digital PSDKU Tegal dengan ini memberikan tugas kepada :'}
            </p>

            <table className="w-full border-collapse ml-4 text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="w-36 py-1 align-top">Nama</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-semibold">{recipientName}</td>
                </tr>
                {recipientNim && (
                  <tr>
                    <td className="w-36 py-1 align-top">NIM / NIDN</td>
                    <td className="w-3 py-1 align-top">:</td>
                    <td className="py-1">{recipientNim}</td>
                  </tr>
                )}
                <tr>
                  <td className="w-36 py-1 align-top">Jabatan / Prodi</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientProdi} ({recipientJenjang})</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-3">Untuk melaksanakan tugas sebagai berikut :</p>
            <table className="w-full border-collapse ml-4 text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="w-36 py-1 align-top">Keperluan / Tugas</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-medium">{subject || 'Pelaksanaan Kegiatan Kampus'}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Tempat Pelaksanaan</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientLocation}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Waktu Pelaksanaan</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientDates} {activityTime ? `(${activityTime})` : ''}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">
              {closingText ||
                'Demikian surat tugas ini diberikan agar dapat dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab.'}
            </p>
          </>
        )}

        {/* TEMPLATE 3: SURAT UNDANGAN */}
        {templateType === 'UNDANGAN' && (
          <>
            <div className="flex justify-between items-start text-xs sm:text-sm mb-3">
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td className="w-20 py-0.5">Lampiran</td>
                      <td className="w-3 py-0.5">:</td>
                      <td className="py-0.5">-</td>
                    </tr>
                    <tr>
                      <td className="w-20 py-0.5">Perihal</td>
                      <td className="w-3 py-0.5">:</td>
                      <td className="py-0.5 font-bold">{subject || 'Undangan Kegiatan'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-right">
                <p>Kepada Yth.</p>
                <p className="font-bold">{recipientName}</p>
                <p className="text-slate-600 italic">{recipientProdi || 'di Tempat'}</p>
              </div>
            </div>

            <p className="mt-3">{openingText}</p>

            <table className="w-full border-collapse ml-4 text-xs sm:text-sm my-3">
              <tbody>
                <tr>
                  <td className="w-36 py-1 align-top">Hari / Tanggal</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-medium">{recipientDates}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Waktu</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{activityTime || '09:00 WIB – Selesai'}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Tempat</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientLocation}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Agenda Acara</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-medium">{eventAgenda || subject || 'Koordinasi Kegiatan'}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">{closingText}</p>
          </>
        )}

        {/* TEMPLATE 4: AKTIF KULIAH */}
        {templateType === 'AKTIF' && (
          <>
            <p className="mb-3">{openingText}</p>
            <table className="w-full border-collapse ml-4 text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="w-36 py-1 align-top">Nama</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-semibold">{recipientName}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">NIM</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientNim}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Program Studi</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientProdi}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Jenjang Studi</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1">{recipientJenjang}</td>
                </tr>
                <tr>
                  <td className="w-36 py-1 align-top">Status Akademik</td>
                  <td className="w-3 py-1 align-top">:</td>
                  <td className="py-1 font-semibold text-emerald-800 print:text-black">
                    Aktif Terdaftar
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">
              Adalah benar mahasiswa yang bersangkutan terdaftar aktif mengikuti kegiatan akademik pada
              Universitas Teknologi Digital PSDKU Tegal. Surat keterangan ini diterbitkan untuk
              keperluan: <strong>{subject || 'Pengurusan Administrasi / Beasiswa'}</strong>.
            </p>

            <p className="mt-3">{closingText}</p>
          </>
        )}

        {/* TEMPLATE 5: PERMOHONAN */}
        {templateType === 'PERMOHONAN' && (
          <>
            <div className="mb-4">
              <p>Kepada Yth.</p>
              <p className="font-bold">{recipientName}</p>
              <p className="text-slate-700">{recipientLocation || 'di Tempat'}</p>
            </div>

            <p>{openingText}</p>

            <div className="bg-slate-50/70 p-3 rounded my-2 print:bg-transparent print:p-0">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <tbody>
                  <tr>
                    <td className="w-36 py-0.5 align-top">Kegiatan</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-semibold">{subject}</td>
                  </tr>
                  <tr>
                    <td className="w-36 py-0.5 align-top">Rencana Tanggal</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5">{recipientDates}</td>
                  </tr>
                  <tr>
                    <td className="w-36 py-0.5 align-top">Jumlah Peserta</td>
                    <td className="w-3 py-0.5 align-top">:</td>
                    <td className="py-0.5 font-medium">{eventAgenda || 'Civitas Akademika Kampus UTD'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">{closingText}</p>
          </>
        )}

        {/* TEMPLATE 6: CUSTOM / BEBAS */}
        {templateType === 'CUSTOM' && (
          <div className="space-y-3">
            <p>{openingText}</p>
            <div className="whitespace-pre-wrap leading-relaxed">
              {customContent ||
                'Tuliskan isi surat resmi kampus di sini. Seluruh format dan kop surat resmi Universitas Teknologi Digital tetap terjaga dengan rapi.'}
            </div>
            <p className="mt-4">{closingText}</p>
          </div>
        )}
      </div>

      {/* 4. BAGIAN TANDA TANGAN (Kanan Bawah) */}
      <div className="mt-12 flex justify-end">
        <div className="w-64 text-center font-serif">
          <p className="text-xs sm:text-sm">
            {city}, {letterDate || '27 Agustus 2026'}
          </p>
          <p className="text-xs sm:text-sm font-semibold mt-1">{signerPosition}</p>

          {/* Area Spasi Tanda Tangan */}
          <div className="h-20 sm:h-24"></div>

          {/* Nama Penandatangan & Garis Bawah */}
          <p className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 border-b border-black inline-block px-1">
            {signerName}
          </p>
        </div>
      </div>

      {/* Sheet Index Indicator (Only for on-screen preview) */}
      {typeof sheetIndex === 'number' && typeof totalSheets === 'number' && totalSheets > 1 && (
        <div className="mt-12 pt-4 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-sans print:hidden">
          Lembar {sheetIndex + 1} dari {totalSheets} &bull; {recipientName} ({recipientNim})
        </div>
      )}
      </div>
    </div>
  );
};
