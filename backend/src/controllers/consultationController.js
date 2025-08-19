import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import UserNotificationService from '../services/UserNotificationService.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { v4 as uuidv4 } from 'uuid';

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
    startDate,
    endDate 
  } = req.query;

  // Build filter query
  const filter = { patientId };

  if (status) {
    filter.status = status;
  }

  if (consultationType) {
    filter.consultationType = consultationType;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const consultations = await Consultation.find(filter)
      .populate({
        path: 'doctorId',
        populate: {
          path: 'user',
          select: 'name email profilePicture'
        },
        select: 'specializations experience ratings consultationModes'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(filter);

    // Format consultation data
    const formattedConsultations = consultations.map(consultation => ({
      id: consultation._id,
      date: consultation.date,
      time: consultation.time,
      endTime: consultation.endTime,
      consultationType: consultation.consultationType,
      status: consultation.status,
      consultationFee: consultation.consultationFee,
      notes: consultation.notes,
      patientNotes: consultation.patientNotes,
      doctor: {
        id: consultation.doctorId._id,
        name: consultation.doctorId.user?.name || 'Doctor',
        email: consultation.doctorId.user?.email,
        profilePicture: consultation.doctorId.user?.profilePicture,
        specializations: consultation.doctorId.specializations || [],
        primarySpecialty: consultation.doctorId.specializations?.[0] || 'General Medicine',
        experience: consultation.doctorId.experience?.totalYears || 0,
        rating: consultation.doctorId.ratings?.average || 0
      },
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt
    }));

    res.status(200).json(new ApiResponse(
      200,
      {
        consultations: formattedConsultations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalConsultations: total,
          hasNextPage: skip + parseInt(limit) < total,
          hasPrevPage: parseInt(page) > 1
        }
      },
      'Patient consultations retrieved successfully'
    ));
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    throw new ApiError(500, 'Failed to fetch consultation history');
  }
});

/**
 * @desc    Get specific consultation details
 * @route   GET /api/v1/consultations/:id
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
      populate: {
        path: 'user',
        select: 'name email profilePicture phone'
      },
      select: 'specializations qualifications experience ratings consultationModes bio'
    });

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    const formattedConsultation = {
      id: consultation._id,
      date: consultation.date,
      time: consultation.time,
      endTime: consultation.endTime,
      consultationType: consultation.consultationType,
      status: consultation.status,
      consultationFee: consultation.consultationFee,
      notes: consultation.notes,
      patientNotes: consultation.patientNotes,
      doctor: {
        id: consultation.doctorId._id,
        name: consultation.doctorId.user?.name || 'Doctor',
        email: consultation.doctorId.user?.email,
        phone: consultation.doctorId.user?.phone,
        profilePicture: consultation.doctorId.user?.profilePicture,
        specializations: consultation.doctorId.specializations || [],
        primarySpecialty: consultation.doctorId.specializations?.[0] || 'General Medicine',
        qualifications: consultation.doctorId.qualifications || [],
        experience: consultation.doctorId.experience?.totalYears || 0,
        rating: consultation.doctorId.ratings?.average || 0,
        totalReviews: consultation.doctorId.ratings?.totalReviews || 0,
        bio: consultation.doctorId.bio
      },
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt
    };

    res.status(200).json(new ApiResponse(
      200,
      { consultation: formattedConsultation },
      'Consultation details retrieved successfully'
    ));
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
/**
 * @desc    Start video consultation and generate meeting link
 * @route   POST /api/v1/consultations/:id/start
 * @access  Private (Doctor/Patient)
 */
export const startVideoConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    const consultation = await Consultation.findById(id)
      .populate('doctorId patientId');

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    // Verify user is part of this consultation
    let authorized = false;
    
    if (userRole === 'patient' && consultation.patientId._id.toString() === userId.toString()) {
      authorized = true;
    } else if (userRole === 'doctor') {
      const doctor = await Doctor.findOne({ user: userId });
      if (doctor && consultation.doctorId._id.toString() === doctor._id.toString()) {
        authorized = true;
      }
    }
    
    if (!authorized) {
      throw new ApiError(403, 'Not authorized to join this consultation');
    }

    // Check if consultation can be started
    const allowedStatuses = ['confirmed', 'scheduled', 'booked'];
    if (!allowedStatuses.includes(consultation.status)) {
      throw new ApiError(400, `Consultation status is '${consultation.status}'. Only confirmed, scheduled, or booked consultations can be started.`);
    }

    // Generate or get meeting link
    if (!consultation.meetingLink) {
      consultation.meetingLink = `/consultation/${consultation._id}`;
      await consultation.save();
    }

    res.status(200).json(new ApiResponse(
      200,
      { 
        meetingLink: consultation.meetingLink,
        consultationId: consultation._id
      },
      'Video consultation started successfully'
    ));
  } catch (error) {
    console.error('Error starting video consultation:', error);
    throw error;
  }
});

export const cancelConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patientId = req.user._id;

  try {
    const consultation = await Consultation.findOne({ 
      _id: id, 
      patientId 
    });

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    if (consultation.status !== 'confirmed') {
      throw new ApiError(400, 'Only confirmed consultations can be cancelled');
    }

    // Check if consultation is not too soon (e.g., at least 2 hours before)
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const now = new Date();
    const timeDifference = consultationDateTime.getTime() - now.getTime();
    const hoursUntilConsultation = timeDifference / (1000 * 60 * 60);

    if (hoursUntilConsultation < 2) {
      throw new ApiError(400, 'Consultations cannot be cancelled less than 2 hours before the scheduled time');
    }

    consultation.status = 'cancelled';
    await consultation.save();

    // Trigger consultation cancellation notification
    if (req.notify) {
      await req.notify.trigger('consultation.cancelled', {
        consultationId: consultation._id,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        consultationType: consultation.consultationType,
        scheduledDate: consultation.date,
        scheduledTime: consultation.time,
        cancelledAt: new Date(),
        cancelledBy: patientId
      });
    }

    res.status(200).json(new ApiResponse(
      200,
      { consultation },
      'Consultation cancelled successfully'
    ));
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
 * @desc    Start consultation
 * @route   PATCH /api/v1/consultations/:id/start
 * @access  Private (Doctor)
 */
export const startConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const consultation = await Consultation.findById(id)
      .populate('doctorId', '_id user')
      .populate('patientId', 'name email');

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    // Check if the doctor owns this consultation
    if (consultation.doctorId.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to start this consultation');
    }

    // Update consultation status
    consultation.status = 'active';
    consultation.startedAt = new Date();

    await consultation.save();

    // Send consultation started notifications
    try {
      const doctorUser = await User.findById(consultation.doctorId.user);
      const patientUser = await User.findById(consultation.patientId._id);
      
      if (doctorUser && patientUser) {
        // Notify patient
        await UserNotificationService.sendConsultationStarted(
          consultation._id,
          patientUser._id,
          'patient',
          doctorUser.name || 'Doctor'
        );
        
        // Notify doctor (confirmation)
        await UserNotificationService.sendConsultationStarted(
          consultation._id,
          doctorUser._id,
          'doctor',
          patientUser.name || 'Patient'
        );
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send consultation start notifications:', notificationError.message);
    }

    res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation started successfully'
    });
  } catch (error) {
    console.error('Error starting consultation:', error);
    throw error;
  }
});

/**
 * @desc    End consultation
 * @route   PATCH /api/v1/consultations/:id/end
 * @access  Private (Doctor)
 */
export const endConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { notes = '' } = req.body;

  try {
    const consultation = await Consultation.findById(id)
      .populate('doctorId', '_id user')
      .populate('patientId', 'name email');

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    // Check if the doctor owns this consultation
    if (consultation.doctorId.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to end this consultation');
    }

    if (consultation.status !== 'active') {
      throw new ApiError(400, 'Only active consultations can be ended');
    }

    // Update consultation status
    consultation.status = 'completed';
    consultation.completedAt = new Date();
    if (notes) {
      consultation.doctorNotes = notes;
    }

    await consultation.save();

    // Send consultation completed notifications
    try {
      const doctorUser = await User.findById(consultation.doctorId.user);
      const patientUser = await User.findById(consultation.patientId._id);
      
      if (doctorUser && patientUser) {
        // Notify patient
        await UserNotificationService.sendConsultationCompleted(
          consultation._id,
          patientUser._id,
          'patient',
          doctorUser.name || 'Doctor'
        );
        
        // Notify doctor (confirmation)
        await UserNotificationService.sendConsultationCompleted(
          consultation._id,
          doctorUser._id,
          'doctor',
          patientUser.name || 'Patient'
        );
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send consultation completion notifications:', notificationError.message);
    }

    res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation ended successfully'
    });
  } catch (error) {
    console.error('Error ending consultation:', error);
    throw error;
  }
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

// New consultation management functions for doctor booking system

// @desc    Get patient consultations by ID
// @route   GET /api/consultations/patient/:patientId
// @access  Private (Patient/Admin)
export const getPatientConsultationsById = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  // Check authorization
  if (req.user._id.toString() !== patientId && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view these consultations');
  }

  const filter = { patientId };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const consultations = await Consultation.find(filter)
      .populate({
        path: 'doctorId',
        populate: {
          path: 'user',
          select: 'name email profilePicture'
        },
        select: 'specializations user workplace experience'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(filter);

    res.status(200).json(new ApiResponse(
      200,
      {
        consultations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          total,
          hasNextPage: skip + parseInt(limit) < total,
          hasPrevPage: parseInt(page) > 1
        }
      },
      'Patient consultations retrieved successfully'
    ));
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    throw new ApiError(500, 'Failed to fetch consultations');
  }
});

// @desc    Cancel doctor consultation
// @route   PATCH /api/consultations/:id/cancel
// @access  Private (Patient/Doctor/Admin)
export const cancelDoctorConsultation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body;

  try {
    const consultation = await Consultation.findById(id)
      .populate('doctorId', 'user')
      .populate('patientId', 'name email');

    if (!consultation) {
      throw new ApiError(404, 'Consultation not found');
    }

    // Check if consultation can be cancelled
    if (consultation.status !== 'confirmed') {
      throw new ApiError(400, 'Only confirmed consultations can be cancelled');
    }

    // Check authorization
    const isPatient = req.user._id.toString() === consultation.patientId._id.toString();
    const isDoctor = consultation.doctorId?.user?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      throw new ApiError(403, 'Not authorized to cancel this consultation');
    }

    // Check if consultation is in the future
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const now = new Date();
    
    if (consultationDateTime <= now) {
      throw new ApiError(400, 'Cannot cancel past consultations');
    }

    // Update consultation status
    consultation.status = 'cancelled';
    consultation.cancellationReason = reason;
    consultation.cancelledBy = req.user._id;
    consultation.cancelledAt = new Date();

    await consultation.save();

    res.status(200).json(new ApiResponse(
      200,
      consultation,
      'Consultation cancelled successfully'
    ));

  } catch (error) {
    console.error('Error cancelling consultation:', error);
    throw error;
  }
});
