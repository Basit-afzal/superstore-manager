import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getAllCustomers,
  updateCustomer,
} from '../controllers/customer.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.get('/', getAllCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
