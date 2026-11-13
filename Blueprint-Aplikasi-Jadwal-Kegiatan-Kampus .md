# Blueprint Aplikasi Jadwal Kegiatan Kampus
### Hasil Brainstorming & Perancangan (untuk dasar development di Antigravity)

---

## 1. Ringkasan Ide

Aplikasi ini adalah **sistem jadwal kegiatan kampus internal** untuk membantu staff (Anda dan rekan-rekan) mengelola kegiatan seperti sosialisasi PMB, promosi kampus, kunjungan sekolah, rapat, seminar, workshop, kegiatan akademik, dan kemahasiswaan.

Inti masalahnya **bukan** "bagaimana membuat kalender", tapi **bagaimana mengelola kepastian tanggal yang bertingkat** — dari sekadar "rencananya Oktober" sampai "14 Oktober, jam 09.00, Aula". Ini yang membedakan aplikasi ini dari kalender generik (Google Calendar dkk) yang memaksa semua event punya tanggal pasti sejak awal.

Sistem bersifat **shared/bersama** (satu sumber kebenaran untuk semua staff), dengan dua role sederhana (Admin & User), berfokus pada tiga hal: **lihat jadwal cepat, cegah bentrok, cetak jadwal rapi.**

---

## 2. Masalah yang Diselesaikan

1. Jadwal kegiatan tersebar di WA, Excel, atau ingatan pribadi — tidak ada sumber tunggal.
2. Kegiatan dengan tanggal belum pasti sulit dicatat di tools kalender biasa, akhirnya sering tidak dicatat sama sekali sampai tanggalnya fix — padahal justru fase "belum pasti" ini yang paling butuh dipantau (supaya begitu tanggal keluar, bisa langsung dicek bentrok atau tidak).
3. Risiko dua kegiatan bentrok lokasi/waktu tanpa disadari sampai mendekati hari-H.
4. Butuh waktu untuk menyusun ulang jadwal jadi dokumen cetak yang rapi untuk atasan/rapat.
5. Staff lain tidak tahu kegiatan minggu ini tanpa bertanya langsung.

## 3. Core Value

> **"Satu tempat untuk tahu: kegiatan apa saja minggu ini, mana yang masih belum pasti, dan mana yang berpotensi bentrok — dalam hitungan detik."**

Nilai utamanya bukan pencatatan, tapi **kepercayaan diri dalam mengambil keputusan jadwal** — baik saat menjawab sekolah ("bisa tanggal segini?"), maupun saat menyusun laporan kegiatan.

## 4. User Persona

**Admin (Anda / staff penanggung jawab jadwal)**
Tujuan: mencatat kegiatan secepat mungkin begitu ada info dari sekolah/pihak lain, meng-update begitu ada kepastian, dan memastikan tidak ada bentrok sebelum menyanggupi jadwal.
Frustrasi saat ini: harus mengingat-ingat status "kira-kira" tiap kegiatan secara manual, dan cross-check manual antar Excel/WA.

**User/Staff (rekan kerja)**
Tujuan: cepat tahu ada kegiatan apa minggu ini/bulan ini tanpa harus tanya Admin, dan mencetak jadwal untuk kebutuhan sendiri.
Frustrasi saat ini: informasi jadwal telat sampai, atau versi yang beredar sudah tidak update.

## 5. User Flow

**Admin — mencatat kegiatan baru dengan info tidak pasti:**
Login → Jadwal Minggu Ini → klik "Tambah Kegiatan" → isi nama, kategori → pilih tingkat kepastian tanggal ("hanya perkiraan bulan") → isi "Oktober 2026" → simpan → sistem menandai status **Tentatif**, muncul di daftar tentatif, tidak ikut proses deteksi bentrok ketat.

**Admin — meng-update kegiatan setelah dapat kandidat tanggal:**
Buka kegiatan tentatif → Edit → ubah tingkat kepastian ke "kandidat tanggal" → masukkan 3 kandidat tanggal → sistem menampilkan status bentrok per kandidat (jika ada) → status berubah ke **Menunggu Konfirmasi**.

**Admin — mengonfirmasi tanggal final:**
Edit kegiatan → pilih salah satu kandidat / masukkan tanggal pasti → isi jam mulai/selesai & lokasi → sistem cek bentrok real-time → jika bentrok, tampil warning (tidak memblokir) → Admin simpan → status **Terjadwal**.

**User/Staff — cek jadwal:**
Login → langsung melihat "Jadwal Minggu Ini" → bisa geser ke minggu lain, atau pindah ke tampilan Kalender/Semua Kegiatan → cari/filter → klik kegiatan untuk detail → cetak bila perlu.

## 6. Information Architecture

```
├── Jadwal Minggu Ini      (halaman utama setelah login — Admin & User)
├── Kalender               (Month View, Week View)
├── Semua Kegiatan         (list + search + filter)
├── Kegiatan Tentatif      (khusus kegiatan belum pasti — daftar prioritas Admin)
├── Cetak Jadwal
├── Kelola Kegiatan        (Admin only — CRUD form)
├── Kelola Kategori        (Admin only)
└── (Kelola User — opsional, lihat catatan di bawah)
```

**Catatan kritis:** menu "Kelola Kegiatan" sebenarnya bisa **digabung** dengan "Semua Kegiatan" — Admin cukup melihat list yang sama, tapi dengan tombol Edit/Hapus yang muncul karena role-nya Admin. Tidak perlu dua menu terpisah untuk "melihat" dan "mengelola" data yang sama. Ini menyederhanakan navigasi tanpa mengurangi fungsi.

## 7. Feature List

- Login/logout, role-based access
- CRUD kegiatan lengkap (dengan tingkat kepastian tanggal)
- Catatan "Kebutuhan Kegiatan" (barang/alat/konsumsi) per kegiatan *(baru — revisi)*
- Halaman Jadwal Minggu Ini (dengan navigasi minggu)
- Kalender (Month + Week View)
- Deteksi & warning bentrok jadwal
- List "Kegiatan Tentatif" terpisah
- Search & filter
- Cetak jadwal (A4 landscape, tabel)
- Kelola kategori (warna/icon)
- Notifikasi warning sederhana (bentrok, tentatif mendekati tanggal, menunggu konfirmasi)
- Summary kecil (jumlah kegiatan, tentatif, konflik)

## 8. MVP Scope

**MUST HAVE (MVP)**
- Login & role (Admin/User)
- CRUD kegiatan + 3 level kepastian tanggal (bulan/minggu/pasti) + kandidat tanggal
- Halaman Jadwal Minggu Ini
- Kalender Month View + Week View
- Deteksi bentrok (warning, bukan block) untuk tanggal pasti vs pasti, dan tanggal pasti vs tentatif
- Kategori kegiatan dengan warna
- Search + filter dasar (kategori, status, bulan)
- Cetak jadwal (minggu ini, bulan ini, rentang tanggal) — tabel A4 landscape
- Status kegiatan (Tentatif, Menunggu Konfirmasi, Terjadwal, Selesai, Dibatalkan)
- Catatan "Kebutuhan Kegiatan" per kegiatan (field teks bebas, opsional) *(baru — revisi)*

**SHOULD HAVE**
- List khusus "Kegiatan Tentatif"
- Notifikasi ringan (banner, bukan sistem notifikasi kompleks)
- Filter tambahan (lokasi)
- Print "hanya kegiatan tentatif"
- Field kontak/narahubung sekolah (opsional, lihat bagian 10)

**COULD HAVE**
- Summary/statistik kecil di halaman utama
- Export selain print (misal PDF langsung, bukan cuma print browser)
- Riwayat perubahan sederhana per kegiatan (selain updated_at)

**FUTURE (jangan dikerjakan dulu)**
- Notifikasi email/WA otomatis
- Multi-kampus / multi-cabang
- Approval workflow (misal kegiatan harus disetujui sebelum tampil)
- Integrasi Google Calendar / kalender eksternal
- Manajemen user self-service (lupa password, dsb — untuk MVP, reset password bisa manual oleh Admin)

**Evaluasi jujur:** rentang tanggal bebas ("12–15 Oktober") saya sarankan **ditunda ke SHOULD HAVE**, bukan MVP — bisa disiasati dengan cara sederhana: catat sebagai perkiraan minggu ("minggu kedua Oktober") dulu, baru diperjelas begitu ada kepastian. Menambahkan tipe "date range belum pasti" di MVP menambah kompleksitas data model tanpa manfaat yang jauh lebih besar dari sekadar pakai level "minggu".

## 9. CRUD Design

**CREATE**
- Form bertahap secara logis: (1) info dasar [nama, kategori] → (2) tingkat kepastian tanggal [pilih salah satu: belum tahu / hanya bulan / hanya minggu / kandidat tanggal / tanggal pasti] → (3) field tanggal yang relevan muncul dinamis sesuai pilihan → (4) waktu & lokasi (opsional jika belum pasti) → (5) keterangan → (6) **Kebutuhan Kegiatan** *(baru — revisi)*.
- **Kebutuhan Kegiatan:** textarea multiline dengan placeholder "Tuliskan barang, alat, konsumsi, atau kebutuhan lainnya...". Pengguna bebas menulis daftar dengan format bullet sendiri (`- `/`* ` per baris) dan boleh membuat pengelompokan bebas seperti "Barang:", "Alat:", "Konsumsi:" sebagai baris judul di dalam teks yang sama — sistem tidak memaksa struktur, hanya menyimpan & menampilkan ulang persis seperti yang ditulis, dengan bullet dirender rapi saat ditampilkan.
- Validasi: nama wajib, kategori wajib, minimal salah satu info tanggal (boleh kosong total jika benar-benar belum ada info sama sekali — tapi harus eksplisit dipilih "belum tahu", bukan dibiarkan kosong tanpa keterangan). **Kebutuhan Kegiatan bersifat opsional** — kosong tidak menghambat penyimpanan kegiatan sama sekali.
- Saat lokasi + tanggal pasti + jam terisi → tampilkan pengecekan bentrok **sebelum** submit (real-time/on-blur), bukan setelah gagal simpan.
- Tombol simpan tetap aktif meski ada warning bentrok (lihat bagian 12) — bentrok tidak memblokir, kecuali kasus identik persis (dijelaskan di bagian 12).

**READ**
- List: tabel/list ringkas dengan badge warna kategori + badge status.
- Detail: semua field, riwayat tanggal (jika kandidat sempat berubah — opsional/should-have), tombol Edit/Hapus khusus Admin.
- **Detail juga menampilkan bagian "Kebutuhan Kegiatan"** *(baru — revisi)*: daftar barang/alat/konsumsi apa adanya, dirender sebagai bullet list rapi. Jika kosong, tampilkan teks "Belum ada kebutuhan yang dicatat." — bukan bagian yang disembunyikan begitu saja, supaya user tahu itu memang belum diisi, bukan error.
- Empty state: pesan berbeda untuk "belum ada kegiatan sama sekali" vs "tidak ada hasil untuk filter/pencarian ini" (dengan tombol reset filter).

> **Contoh tampilan Detail Kegiatan** *(baru — revisi)*:
>
> **Sosialisasi PMB 2027**
> Kategori: PMB · Tanggal: 14 Oktober 2026 · Waktu: 09.00–12.00
> Lokasi: SMK YPE Nusantara Slawi · Status: Terjadwal
>
> **Deskripsi**
> Sosialisasi penerimaan mahasiswa baru.
>
> **Kebutuhan Kegiatan**
> - Banner PMB
> - Brosur PMB
> - Laptop
> - Proyektor
> - Kabel HDMI
> - Sound system
> - Air mineral
> - Snack 50 box

**UPDATE**
- Semua field bisa diubah, termasuk **menaikkan tingkat kepastian** (dari "hanya bulan" ke "kandidat tanggal" ke "tanggal pasti") — ini alur paling sering dipakai, harus mulus.
- Juga harus bisa **menurunkan tingkat kepastian** (misal tanggal batal, mundur ke "menunggu konfirmasi lagi") — jangan asumsikan progres selalu satu arah.
- Perubahan tanggal pasti memicu ulang pengecekan bentrok.

**DELETE**
- Konfirmasi wajib (modal, sebutkan nama kegiatan yang akan dihapus).
- Rekomendasi: **soft delete** (flag `is_deleted` atau status `Dibatalkan` terpisah dari hard delete) — lihat bagian 24, ini salah satu kelemahan penting dari asumsi awal.
- Setelah dihapus/dibatalkan, kegiatan hilang dari jadwal aktif tapi (jika soft delete) masih bisa dilihat di riwayat/filter "dibatalkan".

**Lintas CRUD**
- Loading state: skeleton pada list/kalender saat fetch, spinner pada tombol submit saat proses simpan (cegah double-submit).
- Notifikasi sukses/gagal: toast singkat, bukan alert blocking.
- Duplicate handling: **peringatkan**, jangan blokir — kegiatan dengan nama sama di tanggal berbeda itu wajar (misal "Sosialisasi PMB" ke banyak sekolah berbeda). Duplicate warning hanya relevan jika nama **dan** tanggal **dan** lokasi sama persis.
- Responsive: form CRUD jadi single-column, full-width di mobile; date-picker & pemilihan kandidat tanggal harus tetap nyaman disentuh (touch target cukup besar).

## 10. Event Data Model (Rekomendasi Field)

Field dasar yang Anda sebutkan sudah tepat. Berikut evaluasinya + field tambahan yang direkomendasikan:

| Field | Wajib? | Alasan |
|---|---|---|
| Nama kegiatan | Ya | — |
| Kategori | Ya | Untuk warna & filter |
| Status | Ya (otomatis+manual) | Lihat model di bagian 11 |
| Tingkat kepastian tanggal | Ya | Inti dari sistem ini |
| Data tanggal (bulan/minggu/kandidat/pasti) | Tergantung tingkat | Bentuknya berubah sesuai tingkat kepastian |
| Waktu mulai/selesai | Opsional | Kosong = dianggap "kegiatan sepanjang hari" |
| Lokasi | Disarankan wajib jika sudah terjadwal | Tanpa lokasi, deteksi bentrok lokasi tidak bisa jalan |
| Keterangan | Opsional | — |
| **Kontak/narahubung** (baru) | Opsional | Saat tanggal masih tentatif, staff perlu tahu "harus follow-up ke siapa" — ini bukan PIC internal (yang eksplisit Anda larang), tapi kontak pihak luar. Genuinely berguna, bukan sekadar "terlihat keren". |
| **Kebutuhan Kegiatan** (baru — revisi) | Opsional | Catatan bebas barang/alat/konsumsi yang diperlukan untuk kegiatan; murni membantu persiapan teknis, bukan checklist tugas siapa-mengerjakan-apa — sehingga tetap sejalan dengan prinsip "bukan project management system" |
| **Prioritas/pentingnya konflik** | Tidak perlu | Overengineering untuk MVP — semua kegiatan diperlakukan setara dulu |
| PIC internal | **Tidak** | Sesuai instruksi Anda — dan memang di luar scope aplikasi ini |

Field "kontak/narahubung" saya usulkan masuk **SHOULD HAVE**, bukan MUST — supaya tidak memperlambat MVP, tapi layak dipertimbangkan karena benar-benar menjawab kebutuhan nyata (follow up kepastian tanggal ke sekolah).

## 11. Schedule Certainty Model — Ini Bagian Paling Penting

**Evaluasi kritis atas struktur status yang Anda usulkan:** struktur 5 status Anda pada dasarnya benar, tapi **mencampur dua dimensi berbeda** dalam satu field, yaitu: (a) *seberapa pasti tanggalnya*, dan (b) *di tahap mana siklus hidup kegiatan itu*. Ini berisiko membingungkan saat kegiatan sudah "Terjadwal" tapi... tanggalnya sebenarnya masih bisa berubah (kadang sekolah membatalkan mendadak walau sudah "pasti").

**Rekomendasi: pisahkan jadi dua atribut independen.**

**A. `date_precision` (tingkat kepastian tanggal)** — murni tentang data tanggal:
1. `unknown` — belum ada info sama sekali
2. `month` — hanya bulan diketahui (contoh: Oktober 2026)
3. `week` — hanya minggu diketahui (contoh: minggu ke-2 Oktober 2026)
4. `candidates` — beberapa kandidat tanggal
5. `exact` — tanggal pasti

**B. `status` (siklus hidup kegiatan)** — murni tentang tahap proses:
1. `draft` — baru dicatat, apapun tingkat kepastian tanggalnya (bisa digabung tampilannya dengan "Tentatif" agar tidak membingungkan user awam, tapi datanya terpisah)
2. `waiting_confirmation` — menunggu kepastian dari pihak luar
3. `confirmed` — sudah pasti dan akan berlangsung
4. `completed` — sudah selesai (idealnya otomatis berubah begitu tanggal terlewati, dengan opsi override manual)
5. `cancelled` — dibatalkan

Kombinasi kedua atribut ini yang menentukan **badge visual** yang dilihat user (misalnya "Tentatif — perkiraan Oktober" = `status:draft` + `date_precision:month`). Ini membuat sistem lebih tangguh menghadapi kasus nyata (misalnya kegiatan `confirmed` dengan `date_precision:exact` yang tiba-tiba dibatalkan mendadak → tinggal ubah `status` ke `cancelled`, data tanggal tidak perlu diutak-atik).

**Kesimpulan:** struktur Anda **secara konsep benar**, tapi implementasinya disarankan 2 kolom, bukan 1 kolom status gabungan. Ini keputusan arsitektur kecil dengan dampak besar untuk menghindari technical debt di kemudian hari.

## 12. Conflict Detection — Aturan Bisnis Detail

**Prinsip utama: sistem tidak pernah memblokir penyimpanan. Sistem hanya memberi tingkat peringatan berbeda.** Alasan: staff kampus sering sengaja menjadwalkan hal yang "tumpang tindih secara teknis" tapi sebenarnya oke (misal dua kegiatan kecil di lokasi besar yang sama, atau overlap 15 menit yang ditoleransi). Memaksa blokir akan membuat Admin mencari cara mengakali sistem — lebih baik beri informasi jelas dan biarkan manusia memutuskan.

**Level peringatan:**

| Kondisi | Level | Perilaku sistem |
|---|---|---|
| Tanggal pasti + jam overlap + lokasi sama, pada 2 kegiatan `confirmed`/`exact` | **Konflik Pasti** ⚠️ merah | Warning tegas saat simpan, minta konfirmasi eksplisit ("Tetap simpan?") |
| Salah satu/kedua kegiatan masih `date_precision: month/week/candidates` | **Potensi Konflik** 🟡 kuning | Info saja, tidak minta konfirmasi tambahan |
| Tanggal sama, lokasi **berbeda** | Tidak ada konflik | Tidak perlu ditampilkan sama sekali |
| Tanggal beririsan tapi jam tidak overlap, lokasi sama | Tidak ada konflik | — |

**Aturan detail per kasus:**
- **Kegiatan tanpa jam** → diperlakukan sebagai kegiatan **sepanjang hari** di lokasi itu → otomatis overlap dengan kegiatan berjam di lokasi & tanggal yang sama (karena tidak diketahui jam pastinya, lebih aman dianggap berpotensi konflik daripada diabaikan).
- **Kegiatan sepanjang hari eksplisit** (all-day flag) → sama seperti di atas, konflik dengan apapun di lokasi & tanggal sama.
- **Kandidat tanggal jamak** → sistem mengecek bentrok **per kandidat**, tampilkan status ringkas per kandidat (misal: "12 Okt: aman · 14 Okt: potensi konflik dengan Rapat X · 16 Okt: aman"). Jika **semua** kandidat bentrok → tampilkan warning khusus "Semua kandidat tanggal berpotensi bentrok" (edge case penting, lihat bagian 23).
- **Lokasi sama tapi ditulis beda kapitalisasi/spasi** ("Aula" vs "aula ") → perlu normalisasi teks lokasi, atau lebih baik **lokasi berupa dropdown/master data**, bukan free text, supaya deteksi bentrok akurat. Ini saya rekomendasikan sebagai perubahan dari asumsi awal Anda.
- **Kegiatan melewati tengah malam** (misal 22.00–01.00) → dianggap dua segmen: hari pertama (22.00–24.00) dan hari kedua (00.00–01.00), keduanya dicek bentrok terpisah.

## 13. Calendar UX

**Month View** — wajib MVP. Tampilkan dot/badge warna kategori per tanggal (maks 2-3 label langsung terlihat, sisanya "+N lagi"). Tanggal dengan kegiatan tentatif tanpa tanggal pasti (`unknown`/`month`/`week`) **tidak muncul** di Month View biasa (karena tidak punya tanggal pasti untuk ditempatkan) — ditampilkan di panel terpisah "Kegiatan belum berjadwal" di sisi kalender.

**Week View** — wajib MVP, ini yang paling sering dipakai sehari-hari, mirip halaman "Jadwal Minggu Ini" tapi bisa menampilkan multi-hari sekaligus dengan slot jam.

**Day View — tidak perlu di MVP.** Alasan: kegiatan kampus tipe ini jarang lebih dari 2-4 per hari; Week View sudah cukup detail untuk melihat jam per hari. Day View menambah satu layer navigasi tanpa manfaat proporsional untuk volume data sekecil ini. Bisa ditambahkan nanti jika ternyata volume kegiatan per hari membengkak.

## 14. Weekly Schedule UX (Halaman Setelah Login)

**Desktop:** layout 7 kolom (Senin–Minggu) atau list vertikal per hari dengan hari kosong tetap ditampilkan ("Tidak ada kegiatan") supaya user yakin bukan error/loading gagal. Navigasi "← Minggu Lalu | Minggu Ini | Minggu Depan →" persisten di atas, plus indikator rentang tanggal jelas ("7–13 September 2026"). Highlight visual untuk hari ini.

**Mobile:** list vertikal per hari (bukan grid 7 kolom yang akan terlalu sempit), dengan swipe kiri/kanan atau tombol panah untuk pindah minggu. Card kegiatan menampilkan jam, nama, lokasi, badge kategori — cukup padat tapi tetap mudah disentuh.

Prioritas visual mengikuti urutan Anda di bagian M: jadwal dulu, baru warning/konflik, baru tentatif, baru statistik — ini keputusan yang tepat dan sebaiknya diikuti persis.

## 15. Print System

**Struktur dokumen cetak (A4 Landscape):**
- **Header:** logo kampus (opsional upload di pengaturan) + nama institusi
- **Judul:** "Jadwal Kegiatan Kampus"
- **Periode:** rentang tanggal yang dicetak, jelas di bawah judul
- **Tabel:** kolom Hari/Tanggal | Waktu | Kegiatan | Lokasi | Kategori | Status — dikelompokkan per tanggal, dengan garis pemisah antar hari
- **Legenda kategori:** kotak warna kecil + nama kategori, di bawah tabel
- **Legenda status:** simbol/ikon status (misal 🟡 tentatif) + keterangan
- **Footer:** tanggal dicetak + "Dicetak dari Sistem Jadwal Kegiatan Kampus"
- **Nomor halaman:** ya, jika lebih dari satu halaman
- **Page break:** antar minggu/bulan jika mencetak rentang panjang, hindari memotong satu baris kegiatan jadi dua halaman
- **Repeat header tabel** di setiap halaman baru (pakai `thead` dengan CSS print yang tepat, bukan gambar)

**Opsi cetak:** minggu ini, minggu depan, bulan ini, rentang tanggal custom, semua kegiatan, hanya tentatif — semua sesuai permintaan Anda, ini set opsi yang masuk akal dan tidak berlebihan.

**Kebutuhan Kegiatan saat print** *(baru — revisi)*: **tidak** ditambahkan sebagai kolom di tabel jadwal utama — akan membuat tabel terlalu lebar dan mengorbankan keterbacaan, yang jadi prioritas utama dokumen A4 landscape. Sebagai gantinya, disediakan opsi cetak terpisah **"Cetak Detail Kegiatan"**: satu kegiatan per bagian/halaman, memuat semua field termasuk Kebutuhan Kegiatan secara lengkap dan rapi (format mirip contoh di bagian 9) — cocok dipakai untuk kebutuhan persiapan teknis di lapangan, terpisah dari cetak jadwal ringkas untuk distribusi umum/rapat.

**Teknis:** gunakan CSS `@media print` dengan HTML/tabel asli (bukan screenshot/canvas), supaya teks tetap tajam saat dicetak dan ukuran file kecil. Sembunyikan elemen navigasi/tombol saat mode print via `@media print { .no-print { display: none } }`.

## 16. Search & Filter

- **Search:** nama kegiatan + lokasi, satu search box, debounced (jangan search di tiap ketikan huruf, tunggu jeda singkat).
- **Filter:** kategori, status, bulan, tanggal (rentang) — sesuai usulan Anda.
- **Tambahan yang direkomendasikan:** filter **lokasi** (karena deteksi bentrok berbasis lokasi, filter ini natural dan berguna, misal "kegiatan apa saja yang pernah di Aula").
- Filter kombinasi (AND, bukan OR) dengan indikator jumlah filter aktif + tombol "reset semua filter".

## 17. Notification & Warning

Sesuai arahan Anda: sederhana, bukan sistem notifikasi kompleks (tidak perlu notification center, tidak perlu push notification untuk MVP).

- **Banner ringkasan** di halaman utama (bukan popup mengganggu): "⚠ 1 potensi konflik minggu ini", "🟡 3 kegiatan menunggu konfirmasi".
- **Per-kegiatan:** badge warning langsung di card/list saat ada konflik.
- **4 tipe visual konsisten:** Success (hijau), Warning (kuning), Error (merah), Info (biru) — dipakai konsisten di toast, banner, dan badge.
- Tidak perlu riwayat notifikasi/read-unread untuk MVP.

## 18. Role & Permission

| Aksi | Admin | User/Staff |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat jadwal/kalender/detail | ✅ | ✅ |
| Search & filter | ✅ | ✅ |
| Cetak | ✅ | ✅ |
| Tambah/Edit/Hapus kegiatan | ✅ | ❌ |
| Kelola kategori | ✅ | ❌ |
| Kelola user | ✅ (opsional MVP) | ❌ |

Dua role ini **cukup** untuk MVP — jangan tambah role ketiga (misal "Editor terbatas") kecuali benar-benar ada kebutuhan nyata di kemudian hari.

## 19. Database Design

**Evaluasi struktur awal Anda (`users`, `events`, `categories`, mungkin `settings`):** secara umum sudah tepat dan sesuai prinsip "jangan overengineering". Saya usulkan satu tabel tambahan yang ringan untuk mendukung model kandidat tanggal secara bersih, dan `settings` saya turunkan ke opsional/nice-to-have, bukan wajib MVP.

**Tabel yang direkomendasikan:**

**`users`**
- `id` (PK)
- `name`
- `email` / `username` (unique)
- `password_hash`
- `role` (enum: `admin`, `staff`)
- `created_at`

**`categories`**
- `id` (PK)
- `name`
- `color` (hex)
- `icon` (opsional, string kode ikon)
- `created_at`

**`events`**
- `id` (PK)
- `name`
- `category_id` (FK → categories, index)
- `status` (enum: `draft`, `waiting_confirmation`, `confirmed`, `completed`, `cancelled`, index)
- `date_precision` (enum: `unknown`, `month`, `week`, `candidates`, `exact`)
- `estimated_month` (nullable, misal `2026-10`)
- `estimated_week_label` (nullable, string bebas seperti "Minggu ke-2 Oktober 2026" — cukup sederhana untuk MVP, tidak perlu logika minggu-ISO yang rumit)
- `event_date` (nullable date, terisi hanya jika `date_precision = exact` atau kandidat sudah dipilih, index — **ini kolom kunci untuk query bentrok & kalender**)
- `start_time` (nullable time)
- `end_time` (nullable time)
- `is_all_day` (boolean, default false)
- `location` (FK ke master lokasi — lihat catatan di bawah, index)
- `description` (text, nullable)
- `contact_info` (nullable, should-have)
- `requirements_notes` (text, nullable — **baru, revisi**: catatan kebutuhan kegiatan, disimpan apa adanya sesuai yang diketik Admin termasuk baris/bullet buatan sendiri)
- `is_deleted` (boolean, default false — untuk soft delete)
- `created_by` (FK → users)
- `updated_by` (FK → users, nullable)
- `created_at`, `updated_at`

**`event_candidate_dates`** (baru, untuk mendukung kandidat tanggal jamak secara rapi — lebih baik daripada JSON field karena bisa di-index & di-query untuk bentrok)
- `id` (PK)
- `event_id` (FK → events, index)
- `candidate_date` (date)

**`locations`** (baru — direkomendasikan menggantikan free-text lokasi)
- `id` (PK)
- `name` (unique)

> **Kenapa `locations` sebagai master data, bukan free text?** Karena seluruh sistem deteksi bentrok bergantung pada kesamaan lokasi. Free text rawan salah ketik ("Aula" vs "aula 1" vs "Ruang Aula") yang membuat deteksi bentrok gagal diam-diam — bug yang sangat sulit disadari user. Ini tabel kecil, tidak menambah kompleksitas berarti, tapi menyelamatkan fitur paling penting kedua di aplikasi ini.

**`settings`** — opsional/COULD HAVE, isinya sekadar logo kampus & nama institusi untuk header print. Tidak wajib MVP; nilai default hardcode dulu juga tidak masalah.

> **Kenapa `requirements_notes` sebagai TEXT biasa, bukan JSON atau tabel terpisah?** *(baru — revisi)*
> - **TEXT (dipilih):** sistem hanya perlu menyimpan dan menampilkan ulang apa adanya. Admin sendiri yang mengatur pengelompokan (Barang/Alat/Konsumsi) lewat baris/heading bebas di dalam teks — tidak ada kebutuhan sistem untuk "mengerti" strukturnya, karena tidak ada checklist centang per item, tidak ada agregasi lintas kegiatan, dan tidak ada quantity tracking otomatis yang diminta. Paling sederhana, paling cepat dibangun, dan paling gampang diubah formatnya oleh Admin kapan saja tanpa migrasi data.
> - **JSON:** baru relevan kalau ke depannya field ini perlu punya struktur eksplisit per kategori (misalnya supaya bisa ditampilkan dalam 3 kolom terpisah Barang/Alat/Konsumsi secara otomatis, atau difilter per kategori). Untuk MVP ini berlebihan — Anda sendiri sudah menyatakan cukup dikelompokkan manual lewat teks.
> - **Tabel terpisah (`event_requirement_items`):** baru relevan kalau tiap item butuh atribut sendiri (jumlah presisi sebagai data terstruktur, status "sudah disiapkan/belum", siapa yang menyiapkan). Ini justru mengarah ke task/inventory management — yang eksplisit ingin dihindari. Ditandai sebagai kemungkinan FUTURE saja, bukan MVP.

**Index yang diperlukan:** `events.event_date`, `events.location_id`, `events.category_id`, `events.status`, komposit `(location_id, event_date)` untuk mempercepat query cek bentrok, `event_candidate_dates.event_id`.

**created_at/updated_at cukup untuk MVP?** Ya — cukup, sesuai evaluasi Anda sendiri. Audit log detail (siapa mengubah field apa, kapan) adalah FUTURE, bukan kebutuhan nyata untuk aplikasi seukuran ini. `created_by`/`updated_by` sederhana sudah cukup untuk akuntabilitas dasar.

## 20. UI/UX Design System

- **Warna:** 1 warna netral utama (misal slate/abu kebiruan) untuk UI, + palet warna kategori yang jelas dibedakan (bukan gradasi mirip-mirip) dan **konsisten dipakai di kalender, list, detail, badge, dan print**.
- **Typography:** satu font sans-serif modern (misal Inter/Plus Jakarta Sans), maksimal 3 ukuran heading + 1 body, hindari terlalu banyak variasi berat font.
- **Spacing:** skala konsisten (4/8/12/16/24px), jangan spacing acak per komponen.
- **Border radius:** sedang (8–12px) untuk kesan modern-tapi-profesional, bukan super-rounded (terlalu playful) atau tajam 0px (terlalu kaku).
- **Button:** primary (solid, warna netral gelap), secondary (outline), destructive (merah, khusus delete) — 3 tipe cukup.
- **Card & Table:** table jadi elemen utama untuk data padat (list kegiatan, print); card untuk tampilan ringkas (Jadwal Minggu Ini).
- **Badge:** dipakai konsisten untuk kategori & status, bentuk pill kecil, warna sesuai kategori/status.
- **Modal:** dipakai untuk konfirmasi delete & form cepat, bukan untuk seluruh form CRUD (form CRUD lebih baik halaman penuh agar tidak sesak di layar kecil).
- **Notification/toast:** posisi konsisten (misal kanan-atas), auto-dismiss 3-4 detik kecuali error.

## 21. Responsive Strategy

Prinsip: **jangan hanya mengecilkan elemen desktop** — ubah bentuknya.

- **Weekly schedule:** desktop = grid/kolom per hari; mobile = list vertikal per hari dengan swipe/tombol navigasi minggu.
- **Kalender:** desktop = grid bulan penuh; mobile = grid bulan tetap bisa dipakai tapi dengan sel lebih ringkas (dot indikator, bukan teks nama kegiatan langsung di sel — tap untuk detail).
- **Tabel (list kegiatan):** desktop = tabel penuh kolom; mobile = **berubah jadi list card**, bukan tabel discroll horizontal (scroll horizontal pada tabel sangat buruk di mobile).
- **Detail kegiatan:** satu kolom penuh di semua ukuran, tidak masalah.
- **Form CRUD:** field full-width, grouping per section dengan jarak jelas, date-picker & pemilih kandidat tanggal harus large-touch-target.

## 22. Security Considerations

- Password di-hash (bcrypt/argon2), tidak pernah disimpan plain text.
- Session/token (JWT atau session cookie httpOnly) dengan masa berlaku wajar, logout menghapus token/session di sisi server.
- Protected routes: setiap endpoint yang mengubah data (create/update/delete) wajib cek role di sisi server, **bukan** hanya disembunyikan di UI (UI hiding saja gampang di-bypass).
- Validasi & sanitasi input di server (khususnya field `description`/`contact_info` yang free text) untuk mencegah XSS.
- Gunakan parameterized query/ORM untuk mencegah SQL injection.
- HTTPS wajib di production.
- Rate limiting sederhana di endpoint login untuk mencegah brute force.
- Untuk MVP: reset password dilakukan manual oleh Admin (generate password baru), tidak perlu flow "lupa password" via email — mengurangi kompleksitas tanpa mengorbankan keamanan untuk skala pengguna internal sekecil ini.

## 23. Edge Cases

Selain yang sudah Anda sebutkan, berikut daftar yang lebih lengkap:

1. Dua kegiatan di lokasi & waktu sama → sudah dibahas (bagian 12).
2. Kegiatan tanpa jam → diperlakukan all-day (bagian 12).
3. Kegiatan sepanjang hari eksplisit.
4. Kegiatan tentatif berubah jadi final → alur update (bagian 9).
5. Kegiatan dibatalkan → status `cancelled`, tetap tersimpan (soft delete), hilang dari tampilan default.
6. Kegiatan dipindah tanggal setelah sempat `confirmed` → perlu cek ulang bentrok otomatis, dan idealnya field kecil "tanggal sebelumnya" (opsional, bukan wajib).
7. Kegiatan dihapus (hard delete oleh Admin) vs dibatalkan (soft delete) — **harus dua aksi berbeda**, lihat bagian 24.
8. **Semua kandidat tanggal ternyata bentrok** → tampilkan warning eksplisit, jangan diam-diam pilih salah satu.
9. Kegiatan melewati tengah malam → dua segmen (bagian 12).
10. Dua kegiatan nama sama, tanggal beda → **wajar**, jangan dianggap duplikat otomatis (misal sosialisasi ke banyak sekolah dengan judul generik "Sosialisasi PMB").
11. Kegiatan dengan `date_precision: month` yang bulan-nya sudah lewat tapi belum pernah di-update Admin → sistem perlu penanda visual "sudah lewat waktu perkiraan, mohon update" (bukan otomatis dianggap selesai, karena Admin yang paling tahu realitanya).
12. Kandidat tanggal berjumlah 1 → secara fungsi harusnya sama dengan `exact` tapi status tetap `waiting_confirmation` sampai eksplisit dikonfirmasi Admin (jangan auto-promote).
13. Lokasi kosong pada kegiatan yang sudah `exact`/`confirmed` → deteksi bentrok lokasi tidak bisa jalan; sebaiknya lokasi **wajib** begitu status naik ke `confirmed`, meski opsional di tahap `draft`/tentatif.
14. User dengan role `staff` mencoba akses endpoint edit langsung via URL → harus ditolak di server (lihat bagian 22).
15. Dua Admin mengedit kegiatan yang sama bersamaan → untuk MVP cukup "last write wins" (yang simpan terakhir menang), optimistic locking bisa jadi FUTURE improvement.
16. Kategori dihapus padahal masih dipakai banyak kegiatan → sebaiknya kategori tidak bisa dihapus jika masih ada kegiatan terkait (atau kegiatan lama tetap tampil dengan label kategori "terhapus").

## 24. Potential Problems (Kritik Jujur)

Beberapa kelemahan nyata dari rancangan awal Anda:

1. **Status tunggal untuk dua dimensi berbeda** (dijelaskan panjang di bagian 11) — risiko: sistem jadi kaku saat menangani kasus "sudah confirmed tapi ternyata batal mendadak" atau sebaliknya.
2. **Lokasi sebagai free text** — risiko diam-diam merusak fitur paling penting kedua (deteksi bentrok) karena salah ketik/inkonsistensi penulisan.
3. **Delete tanpa pembedaan hard/soft delete** — jika Admin salah hapus kegiatan yang ternyata sudah dibagikan/dicetak, tidak ada cara mengembalikan. Untuk data historis kegiatan kampus (bisa berguna untuk laporan tahunan), kehilangan data permanen adalah risiko nyata.
4. **Kandidat tanggal sebagai kemungkinan disimpan JSON di kolom `events`** (jika mengikuti asumsi awal) — menyulitkan query "kegiatan apa saja yang salah satu kandidatnya bentrok dengan tanggal X". Tabel terpisah (bagian 19) menyelesaikan ini.
5. **Tidak ada mekanisme "tanggal perkiraan yang sudah kedaluwarsa tanpa update"** — kegiatan bisa "mengendap" sebagai tentatif tanpa ada yang sadar bulannya sudah lewat.
6. **Asumsi bahwa semua User/Staff hanya butuh read-only** — cukup masuk akal untuk sekarang, tapi jika suatu saat ada kebutuhan "staff boleh usulkan kegiatan tapi Admin yang approve", model role dua-tingkat ini perlu tambahan status `pending_review` sebelum tampil ke publik. **Tidak perlu dibangun sekarang**, tapi model status di bagian 11 sudah cukup fleksibel untuk menambah ini nanti tanpa migrasi besar-besaran.

## 25. Improvement Recommendations

Sesuai kelemahan di atas:

1. Pisahkan `status` dan `date_precision` menjadi dua kolom (bagian 11 & 19).
2. Jadikan `locations` sebagai master data/dropdown, bukan free text.
3. Terapkan soft delete (`is_deleted` + status `cancelled` terpisah dari hard delete yang hanya bisa dilakukan Admin dengan konfirmasi ganda, atau bahkan tidak diekspos di UI MVP — cukup "batalkan").
4. Gunakan tabel `event_candidate_dates` terpisah, bukan JSON.
5. Tambahkan indikator visual sederhana (bukan notifikasi kompleks) untuk kegiatan tentatif yang "waktunya sudah lewat perkiraan" — cukup badge "⏰ perlu di-update" di list Kegiatan Tentatif.
6. Desain skema status dari awal agar mudah ditambah `pending_review` di masa depan tanpa migrasi besar (sudah terakomodasi oleh model dua-kolom).

## 26. Final Recommended Specification

**Ringkas:**
- **Role:** Admin, Staff (2 role, sesuai rencana Anda)
- **Data inti:** `users`, `categories`, `locations`, `events`, `event_candidate_dates` (5 tabel — tetap ringkas)
- **Model status:** 2 kolom independen (`status` siklus hidup + `date_precision` tingkat kepastian tanggal)
- **Halaman utama:** Jadwal Minggu Ini
- **Fitur inti MVP:** CRUD kegiatan lengkap dengan tingkat kepastian tanggal, Kalender (Month+Week), deteksi bentrok berbasis warning bertingkat, cetak A4 landscape tabel, search & filter dasar
- **Ditunda dari MVP:** date-range bebas, notifikasi kompleks, approval workflow, audit log detail, multi-kampus
- **Prinsip desain:** warning bukan blocking; data lokasi terstandarisasi; soft delete untuk data historis

## 27. Development Roadmap

**Tahap 1 — Fondasi**
Setup project, struktur database (5 tabel di atas), autentikasi & role, protected routes dasar.

**Tahap 2 — CRUD Inti**
CRUD kegiatan lengkap dengan model 2-kolom status, form dinamis sesuai tingkat kepastian tanggal, master data kategori & lokasi, termasuk field "Kebutuhan Kegiatan" (teks bebas, opsional).

**Tahap 3 — Tampilan Jadwal**
Halaman Jadwal Minggu Ini (termasuk versi mobile), Kalender Month View & Week View.

**Tahap 4 — Deteksi Bentrok**
Implementasi aturan bentrok bertingkat (bagian 12), tampilkan warning di form & di list/kalender.

**Tahap 5 — Search, Filter, List Tentatif**
Search & filter, halaman "Kegiatan Tentatif" terpisah, badge "perlu di-update".

**Tahap 6 — Cetak Jadwal**
Layout print A4 landscape, semua opsi rentang cetak, CSS print.

**Tahap 7 — Polish**
Notifikasi/banner ringkas, summary kecil, responsive pass menyeluruh, empty/loading/error state review.

**Tahap 8 — Testing & Hardening**
Uji semua edge case di bagian 23, review keamanan (bagian 22), uji cetak di berbagai jumlah data.

---

## 28. Pertanyaan Klarifikasi Sebelum Development

Diurutkan berdasarkan tingkat kepentingan:

1. **Lokasi kegiatan** — apakah daftar lokasi kampus relatif tetap (Aula, Ruang Rapat A, dst — cocok jadi master data dropdown), atau sering berupa tempat baru/eksternal (sekolah tujuan, dsb — perlu opsi "lokasi lain" free text)?
2. **Delete vs Cancel** — apakah Anda setuju kegiatan yang "dihapus" sebenarnya cukup ditandai `Dibatalkan` (tetap tersimpan untuk riwayat), dan hard delete permanen hanya untuk kasus salah input murni?
3. **Siapa saja calon User/Staff?** Berapa perkiraan jumlah pengguna (untuk menentukan apakah "Kelola User" perlu di-build di MVP atau cukup ditambah manual ke database dulu)?
4. **Field kontak/narahubung** — perlu tidak untuk MVP, atau bisa ditunda ke tahap berikutnya?
5. **Kandidat tanggal** — berapa jumlah maksimal kandidat yang realistis (2-3, atau bisa lebih)? Ini memengaruhi desain UI pemilihan kandidat.
6. **Logo/identitas kampus untuk print** — perlu upload logo di pengaturan, atau cukup ditulis manual di kode untuk sekarang (karena hanya satu institusi)?
7. **Definisi "Selesai"** — apakah status `Selesai` berubah otomatis begitu tanggal kegiatan terlewati, atau harus diubah manual oleh Admin?
8. **Kategori kegiatan** — apakah 7 kategori yang Anda contohkan (Sosialisasi/PMB, Akademik, Kegiatan Kampus, Rapat, Seminar/Workshop, Tentatif, Lainnya) sudah final, atau perlu dikelola bebas oleh Admin (tambah/hapus kategori sendiri)?
9. **Volume data** — perkiraan berapa kegiatan per bulan? (Memengaruhi apakah pagination list perlu di MVP atau bisa ditunda.)
10. **Akses dari luar jaringan kampus** — apakah aplikasi perlu diakses dari luar (misal saat staff di lapangan/kunjungan sekolah), atau cukup diakses dari kantor saja? Ini memengaruhi keputusan hosting/deployment.
