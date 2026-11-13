# Sistem Jadwal Kegiatan Kampus

Aplikasi internal berbasis web untuk mengelola dan memantau jadwal kegiatan kampus secara terpusat (*shared calendar*), menangani tanggal tentatif bertingkat, serta mendeteksi potensi maupun kepastian bentrok jadwal secara cerdas.

Dikembangkan berdasarkan dokumen spesifikasi: [Blueprint-Aplikasi-Jadwal-Kegiatan-Kampus .md](./Blueprint-Aplikasi-Jadwal-Kegiatan-Kampus%20.md).

---

## 🎯 Nilai Utama Sistem

> **"Satu tempat untuk tahu: kegiatan apa saja minggu ini, mana yang masih belum pasti, dan mana yang berpotensi bentrok — dalam hitungan detik."**

- **Shared Schedule**: Satu sumber kebenaran data kegiatan untuk seluruh staf.
- **Gradual Date Certainty**: Mendukung berbagai tingkat kepastian tanggal (*Belum Tahu*, *Perkiraan Bulan*, *Perkiraan Minggu*, *Kandidat Tanggal*, *Tanggal Pasti*).
- **Conflict Detection Engine**: Membedakan **Konflik Pasti** (merah ⚠️) dan **Potensi Konflik** (kuning 🟡) berbasis lokasi dan waktu tanpa memblokir paksa penyimpanan.
- **Kebutuhan Kegiatan**: Catatan bebas multiline untuk barang, alat, dan konsumsi per kegiatan.
- **Print First-Class**: Tata letak cetak dokumen standar **A4 Landscape** yang rapi dengan CSS `@media print`.
- **Desain Claymorphism**: Tampilan visual taktil, lembut, modern, dengan memprioritaskan keterbacaan data (*Readability > Visual Effects*).

---

## 🧱 Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Fast modern build tool)
- **Tailwind CSS** (Custom Claymorphism Design System)
- **React Router v6** (Role-based protected routing)
- **Lucide React** (Clean modern UI icons)

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM**
- **Database**: PostgreSQL (Dockerized via `docker-compose.yml`)
- **Autentikasi**: JWT (JSON Web Token) & bcryptjs password hashing
- **Branding**: Universitas Teknologi Digital (UTD Navy & Crimson)

---

## 🚀 Panduan Menjalankan Aplikasi (Lokal)

### 1. Jalankan Database PostgreSQL
```bash
docker compose up -d
```

### 2. Akun Pengguna Awal (Seed)
Aplikasi telah di-seed dengan akun awal berikut:
- **Admin**: `admin` / `admin123` (Hak akses penuh: kelola jadwal kegiatan dan master kategori)
- **Staff / User**: `staff` / `staff123` (Hak akses lihat, cari, filter, dan cetak jadwal)

### 3. Menjalankan Backend
```bash
cd backend
npm install
npm run prisma:push    # Sinkronisasi skema ke PostgreSQL
npm run prisma:seed    # Inisialisasi akun & data contoh
npm run dev            # Berjalan di http://localhost:5000
```

### 4. Menjalankan Frontend
```bash
cd frontend
npm install
npm run dev            # Berjalan di http://localhost:5173
```

---

## 🌐 Panduan Publikasi (Production Deployment)

### Opsi 1: 1-Click Docker Compose (VPS / Server Kampus)
Cukup jalankan satu perintah di server Ubuntu/Linux:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Aplikasi langsung aktif di port 80 dengan Nginx reverse proxy terintegrasi.

### Opsi 2: Cloud PaaS
- **Frontend**: Deploy folder `frontend/` ke [Vercel](https://vercel.com) atau [Netlify](https://netlify.com) dengan Environment Variable `VITE_API_URL=https://api-domain-anda.com/api`.
- **Backend**: Deploy folder `backend/` ke [Railway](https://railway.app) atau [Render](https://render.com).
- **Database**: PostgreSQL gratis di [Supabase](https://supabase.com) atau Railway PostgreSQL.

---

## 🗄️ Model Data (5 Tabel Inti)
1. `User`: Akun pengguna dan peran (`ADMIN`, `USER`).
2. `Category`: Master data kategori kegiatan dengan label warna.
3. `Location`: Master data lokasi kampus dan sekolah mitra untuk deteksi bentrok.
4. `Event`: Data utama kegiatan kampus dengan pemisahan 2 kolom: `status` (siklus hidup) dan `date_precision` (kepastian tanggal).
5. `EventCandidateDate`: Tabel relasi multi-kandidat tanggal untuk kegiatan yang memiliki beberapa opsi hari.
