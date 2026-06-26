import { Router } from 'express';
import { getAllEmployee, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employee.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.get('/', getAllEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;