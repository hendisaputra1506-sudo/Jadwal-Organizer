import { Router } from 'express';
import { checkConflicts } from '../controllers/conflictController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Logged in users can check conflicts
router.post('/check', authenticateToken, checkConflicts);

export default router;
