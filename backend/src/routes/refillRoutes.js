import express from 'express';
import {
  scheduleReminder,
  getReminders,
  cancelReminder
} from '../controllers/refillReminderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

const router = express.Router();

// Schedule a refill reminder
router.post('/', authenticate, asyncHandler(scheduleReminder));

// Get all reminders for user
router.get('/', authenticate, asyncHandler(getReminders));

// Cancel a reminder
router.put('/:id/cancel', authenticate, asyncHandler(cancelReminder));

export default router;
