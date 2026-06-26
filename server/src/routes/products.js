import { Router } from 'express';
import {
  adjustProductStock,
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  restockProduct,
  updateProduct,
  lowStockProducts,
} from '../controllers/products.js';
import { protectStore } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectStore);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.post('/:id/restock', restockProduct);
router.post('/:id/adjust', adjustProductStock);
router.delete('/:id', deleteProduct);
router.get('/low-stock', lowStockProducts);

export default router;
