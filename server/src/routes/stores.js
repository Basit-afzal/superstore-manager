import { Router } from 'express';
import { getMyStore, uploadProfileImage } from '../controllers/store.js';
import { protectStore } from '../middleware/auth.middleware.js';
import {
  handleUploadError,
  profileImageUpload,
} from '../middleware/upload.middleware.js';

const router = Router();

router.use(protectStore);
router.get('/me', getMyStore);
router.patch('/me/profile-image', (req, res, next) => {
  profileImageUpload.single('profile_image')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    return uploadProfileImage(req, res, next);
  });
});

export default router;
