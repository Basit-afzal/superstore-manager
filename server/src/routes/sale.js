import { Router } from 'express';
import { createSale, getSales, getSaleById } from '../controllers/sale.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.post('/', createSale);
router.get('/', getSales);
router.get('/:id', getSaleById);

export default router;