import React from 'react';
import kopSuratResmi from '../../kop-surat-resmi.png';

interface OfficialKopSuratProps {
  className?: string;
  customKopUrl?: string | null;
  hideKopForPhysicalPrint?: boolean;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({
  className = '',
  customKopUrl = null,
  hideKopForPhysicalPrint = false,
}) => {
  if (hideKopForPhysicalPrint) {
    return (
      <div
        className={`w-full block select-none m-0 p-0 ${className}`}
        style={{ height: '42mm' }}
      >
        <div className="print:hidden h-full flex items-center justify-center border-2 border-dashed border-amber-300 bg-amber-50/60 text-amber-800 text-xs font-sans rounded mx-4 my-2 px-4 py-2">
          <span>📄 <strong>Mode Kertas Berkop Fisik Aktif:</strong> Kop surat digital disembunyikan saat dicetak (disediakan ruang kosong 42mm agar pas dengan kertas kop resmi Anda).</span>
        </div>
      </div>
    );
  }

  const imgSrc = customKopUrl || kopSuratResmi;

  return (
    <div className={`w-full block select-none m-0 p-0 leading-none ${className}`}>
      <img
        src={imgSrc}
        alt="Kop Surat Resmi Universitas Teknologi Digital"
        className="w-full h-auto object-contain block select-none m-0 p-0"
        style={{
          width: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
