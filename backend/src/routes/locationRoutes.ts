import { Router } from 'express';
import {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/locationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Everyone logged in can read locations
router.get('/', authenticateToken, getAllLocations);

// Only ADMIN can create, update, or delete locations
router.post('/', authenticateToken, requireAdmin, createLocation);
router.put('/:id', authenticateToken, requireAdmin, updateLocation);
router.delete('/:id', authenticateToken, requireAdmin, deleteLocation);

export default router;
