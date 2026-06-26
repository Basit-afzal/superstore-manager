import { Router } from 'express';
import { createPaymentIntent } from '../controllers/payment.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.post('/intent', createPaymentIntent);

export default router;
