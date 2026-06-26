import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.get('/stats', getDashboardStats);

export default router;