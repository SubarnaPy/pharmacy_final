import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { validationUtils } from '../utils/authUtils.js';

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const { profile, preferences } = req.body;

  if (profile) {
    // Sanitize profile data
    const sanitizedProfile = {
      firstName: validationUtils.sanitizeInput(profile.firstName) || user.profile.firstName,
      lastName: validationUtils.sanitizeInput(profile.lastName) || user.profile.lastName,
      dateOfBirth: profile.dateOfBirth || user.profile.dateOfBirth,
      gender: profile.gender || user.profile.gender,
      phone: profile.phone || user.profile.phone,
      address: {
        street: validationUtils.sanitizeInput(profile.address?.street) || user.profile.address?.street,
        city: validationUtils.sanitizeInput(profile.address?.city) || user.profile.address?.city,
        state: validationUtils.sanitizeInput(profile.address?.state) || user.profile.address?.state,
        zipCode: profile.address?.zipCode || user.profile.address?.zipCode,
        country: validationUtils.sanitizeInput(profile.address?.country) || user.profile.address?.country,
      },
      emergencyContact: {
        name: validationUtils.sanitizeInput(profile.emergencyContact?.name) || user.profile.emergencyContact?.name,
        phone: profile.emergencyContact?.phone || user.profile.emergencyContact?.phone,
        relationship: validationUtils.sanitizeInput(profile.emergencyContact?.relationship) || user.profile.emergencyContact?.relationship,
      },
    };
    user.profile = { ...user.profile, ...sanitizedProfile };
  }

  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser.toObject(),
  });
});
