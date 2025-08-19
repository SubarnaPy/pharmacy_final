import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * @desc    Get patient's consultation history
 * @route   GET /api/v1/consultations/my-bookings
 * @access  Private (Patient)
 */
export const getPatientConsultations = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const { 
    page = 1, 
    limit = 10, 
    status, 
    consultationType,
    dateFrom,
    dateTo 
  } = req.query;

  // Build filter query
  const filter = { patientId };

  if (status) {
    filter.status = status;
  }

  if (consultationType) {
    filter.consultationType = consultationType;
  }

  if (dateFrom || dateTo) {
    filter.appointmentDate = {};
    if (dateFrom) filter.appointmentDate.$gte = dateFrom;
    if (dateTo) filter.appointmentDate.$lte = dateTo;
  }

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const consultations = await Consultation.find(filter)
      .populate({
        path: 'doctorId',
        select: 'name email phone specialization experience ratings profilePicture'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        consultations,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      },
      message: 'Consultation history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    throw new ApiError(500, 'Failed to fetch consultation history');
  }
});

/**
 * @desc    Get specific consultation details
 * @route   GET /api/v1/consultations/:id/details
 * @access  Private (Patient)
 */
export const getConsultationDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patientId = req.user._id;

  try {
    const consultation = await Consultation.findOne({ 
      _id: id, 
      patientId 
    })
    .populate({
      path: 'doctorId',
      select: 'name email phone specialization experience ratings profilePicture qualifications bio'
    });

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching consultation details:', error);
    throw error;
  }
});

/**
 * @desc    Cancel consultation
 * @route   PATCH /api/v1/consultations/:id/cancel
 * @access  Private (Patient)
 */
export const cancelConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patientId = req.user._id;
  const { reason = '' } = req.body;

  try {
    const consultation = await Consultation.findOne({ 
      _id: id, 
      patientId 
    });

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    if (consultation.status === 'cancelled') {
      throw new ApiError(400, 'Consultation is already cancelled');
    }

    if (consultation.status === 'completed') {
      throw new ApiError(400, 'Cannot cancel a completed consultation');
    }

    // Check if consultation can be cancelled (at least 2 hours before)
    const consultationDateTime = new Date(`${consultation.appointmentDate}T${consultation.appointmentTime}`);
    const now = new Date();
    const timeDifference = consultationDateTime.getTime() - now.getTime();
    const hoursUntilConsultation = timeDifference / (1000 * 60 * 60);

    if (hoursUntilConsultation < 2) {
      throw new ApiError(400, 'Consultations can only be cancelled at least 2 hours in advance');
    }
    
    if (consultationDateTime <= now) {
      throw new ApiError(400, 'Cannot cancel past consultations');
    }

    // Update consultation status
    consultation.status = 'cancelled';
    consultation.cancellationReason = reason;
    consultation.cancelledBy = req.user._id;
    consultation.cancelledAt = new Date();

    await consultation.save();

    res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling consultation:', error);
    throw error;
  }
});

/**
 * @desc    Request a new virtual consultation
 * @route   POST /api/v1/consultations
 * @access  Private (Patient)
 */
export const requestConsultation = asyncHandler(async (req, res, next) => {
  const { pharmacy, startTime, endTime, consultationType, reason } = req.body;
  const patient = req.user.userId;

  if (!pharmacy || !startTime || !endTime) {
    return next(new AppError('pharmacy, startTime, and endTime are required', 400));
  }

  const appointment = await Appointment.create({
    patient,
    pharmacy,
    startTime,
    endTime,
    consultationType,
    reason
  });

  res.status(201).json({
    success: true,
    data: appointment
  });
});

/**
 * @desc    Get all consultations for current user
 * @route   GET /api/v1/consultations
 * @access  Private
 */
export const getConsultations = asyncHandler(async (req, res) => {
  const { role, userId } = req.user;
  let query = {};

  if (role === 'patient') {
    query = { patient: userId };
  } else if (role === 'pharmacist') {
    query = { pharmacy: req.user.pharmacyId || undefined };
  }

  const appointments = await Appointment.find(query).sort({ startTime: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

/**
 * @desc    Get a specific consultation
 * @route   GET /api/v1/consultations/:id
 * @access  Private
 */
export const getConsultation = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  // Patients can only view their own
  if (req.user.role === 'patient' && appointment.patient.toString() !== req.user.userId) {
    return next(new AppError('Access denied', 403));
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});

/**
 * @desc    Cancel a consultation (legacy)
 * @route   PUT /api/v1/consultations/:id/cancel-legacy
 * @access  Private (Patient)
 */
export const cancelConsultationLegacy = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  if (appointment.patient.toString() !== req.user.userId) {
    return next(new AppError('Access denied', 403));
  }

  appointment.status = 'cancelled';
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled',
    data: appointment
  });
});
