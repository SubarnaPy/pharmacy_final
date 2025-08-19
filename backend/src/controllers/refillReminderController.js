import RefillReminder from '../models/RefillReminder.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * @desc    Schedule a refill reminder
 * @route   POST /api/v1/reminders
 * @access  Private
 */
export const scheduleReminder = asyncHandler(async (req, res, next) => {
  const { prescription, remindAt, method } = req.body;
  const user = req.user.userId;

  if (!prescription || !remindAt) {
    return next(new AppError('prescription and remindAt are required', 400));
  }

  const reminder = await RefillReminder.create({
    user,
    prescription,
    remindAt,
    method
  });

  res.status(201).json({
    success: true,
    data: reminder
  });
});

/**
 * @desc    Get all reminders for current user
 * @route   GET /api/v1/reminders
 * @access  Private
 */
export const getReminders = asyncHandler(async (req, res) => {
  const user = req.user.userId;
  const reminders = await RefillReminder.find({ user }).sort({ remindAt: 1 });
  res.status(200).json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

/**
 * @desc    Cancel a reminder
 * @route   PUT /api/v1/reminders/:id/cancel
 * @access  Private
 */
export const cancelReminder = asyncHandler(async (req, res, next) => {
  const reminder = await RefillReminder.findById(req.params.id);
  if (!reminder) {
    return next(new AppError('Reminder not found', 404));
  }
  if (reminder.user.toString() !== req.user.userId) {
    return next(new AppError('Access denied', 403));
  }
  reminder.status = 'cancelled';
  await reminder.save();
  res.status(200).json({
    success: true,
    message: 'Reminder cancelled',
    data: reminder
  });
});
