import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller.js';
import { registerStore } from '../controllers/store.js';
import { protectStore } from '../middleware/auth.middleware.js';


const router = Router();

router.post('/login', login);
router.post('/register', registerStore);
router.post('/logout', logout);
router.get('/me', protectStore, getMe);

export default router;
