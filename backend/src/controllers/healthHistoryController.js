import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * @desc    Get all health history for a user
 * @route   GET /api/v1/users/health-history
 * @access  Private
 */
export const getHealthHistory = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('healthHistory');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    count: user.healthHistory.length,
    data: user.healthHistory,
  });
});

/**
 * @desc    Add a new health history record
 * @route   POST /api/v1/users/health-history
 * @access  Private
 */
export const addHealthHistory = asyncHandler(async (req, res, next) => {
  const { condition, diagnosedDate, medication, doctor, notes } = req.body;

  if (!condition) {
    return next(new AppError('Condition is required', 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const newRecord = {
    condition,
    diagnosedDate,
    medication,
    doctor,
    notes,
  };

  user.healthHistory.push(newRecord);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Health history record added successfully',
    data: user.healthHistory,
  });
});

/**
 * @desc    Update a health history record
 * @route   PUT /api/v1/users/health-history/:recordId
 * @access  Private
 */
export const updateHealthHistory = asyncHandler(async (req, res, next) => {
  const { recordId } = req.params;
  const updates = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const record = user.healthHistory.id(recordId);
  if (!record) {
    return next(new AppError('Health history record not found', 404));
  }

  Object.assign(record, updates);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Health history record updated successfully',
    data: user.healthHistory,
  });
});

/**
 * @desc    Delete a health history record
 * @route   DELETE /api/v1/users/health-history/:recordId
 * @access  Private
 */
export const deleteHealthHistory = asyncHandler(async (req, res, next) => {
  const { recordId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const record = user.healthHistory.id(recordId);
  if (!record) {
    return next(new AppError('Health history record not found', 404));
  }

  record.remove();
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Health history record deleted successfully',
    data: user.healthHistory,
  });
});
