import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
import { 
  getHealthHistory, 
  addHealthHistory, 
  updateHealthHistory, 
  deleteHealthHistory 
} from '../controllers/healthHistoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

const router = Router();

router.route('/profile')
  .get(authenticate, asyncHandler(getUserProfile))
  .put(authenticate, asyncHandler(updateUserProfile));

router.route('/health-history')
  .get(authenticate, asyncHandler(getHealthHistory))
  .post(authenticate, asyncHandler(addHealthHistory));

router.route('/health-history/:recordId')
  .put(authenticate, asyncHandler(updateHealthHistory))
  .delete(authenticate, asyncHandler(deleteHealthHistory));

// Placeholder for avatar upload
router.post('/upload-avatar', asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Upload avatar endpoint - To be implemented in Task 4'
  });
}));

export default router;
