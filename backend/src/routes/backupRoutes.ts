import { Router } from 'express';
import { downloadDatabaseBackup } from '../controllers/backupController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/download', authenticateToken, requireAdmin, downloadDatabaseBackup);

export default router;
