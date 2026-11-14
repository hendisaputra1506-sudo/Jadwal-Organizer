import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import conflictRoutes from './routes/conflictRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import letterRoutes from './routes/letterRoutes.js';

const app = express();

// 1. Sembunyikan header X-Powered-By untuk keamanan
app.disable('x-powered-by');

// 2. Proteksi HTTP Security Headers menggunakan Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Izinkan preview berkas & uploads
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Ditangani di level gateway/client agar tidak memblokir upload Google Drive
  })
);

// 3. Batasi ukuran body request (mencegah DoS payload raksasa)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiting untuk proteksi API
// Pembatas umum untuk semua rute /api: maksimal 300 request per 15 menit per IP
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan ke server dari IP ini. Silakan coba kembali dalam beberapa menit.',
  },
});

// Pembatas ketat khusus endpoint login untuk mencegah brute-force password guessing
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Maksimal 10 percobaan per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk yang gagal. Demi keamanan akun staf, silakan tunggu 15 menit.',
  },
});

// Pasang Rate Limiter
app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLoginLimiter);

// 5. Konfigurasi CORS (Mendukung Vercel, Localhost, dan konfigurasi kustom)
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Request non-browser / server-to-server / curl
  if (ENV.CORS_ORIGIN === '*') return true;

  const configuredList = ENV.CORS_ORIGIN.split(',').map((o) => o.trim().toLowerCase());
  const originLower = origin.toLowerCase();

  return (
    configuredList.includes(originLower) ||
    originLower.endsWith('.vercel.app') ||
    originLower.includes('localhost') ||
    originLower.includes('127.0.0.1')
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 6. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sistem Jadwal Kegiatan Kampus API is operational and secure.',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
});

// 7. Static files untuk fallback uploads lokal
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 8. Rute API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api', attachmentRoutes);

// 9. Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = Number(ENV.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server backend berjalan di port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
});

export default app;
