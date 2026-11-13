import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:5432/jadwal_kampus?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jadwal-kampus-jwt-key-2026-prod-mvp',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Google Drive API Configurations
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
};
