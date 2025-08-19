import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import HealthSurvey from '../models/HealthSurvey.js';
import MedicalRecord from '../models/MedicalRecord.js';
import UserNotificationService from '../services/UserNotificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private (Patient)
export const bookAppointment = asyncHandler(async (req, res) => {
  const {
    doctorId,
    appointmentDate,
    startTime,
    duration = 30,
    consultationType,
    consultationMode = 'scheduled',
    reason,
    symptoms,
    healthSurvey,
    isUrgent = false,
    priority = 'medium'
  } = req.body;

  // Validate doctor exists and is accepting appointments
  const doctor = await Doctor.findOne({ user: doctorId })
    .populate('user', 'name email');
  
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  if (!doctor.isAcceptingAppointments) {
    throw new ApiError(400, 'Doctor is not accepting appointments currently');
  }

  // Check if consultation type is supported by doctor
  const supportedConsultation = doctor.consultationModes.find(
    mode => mode.type === consultationType && mode.isActive
  );

  if (!supportedConsultation) {
    throw new ApiError(400, `Doctor does not support ${consultationType} consultations`);
  }

  // Check for appointment slot conflicts
  const appointmentStart = new Date(startTime);
  const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60000);

  const conflictingAppointment = await Appointment.findOne({
    doctor: doctorId,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    $or: [
      {
        startTime: { $lt: appointmentEnd },
        endTime: { $gt: appointmentStart }
      }
    ]
  });

  if (conflictingAppointment) {
    throw new ApiError(400, 'The requested time slot is not available');
  }

  // Create payment record
  const consultationFee = supportedConsultation.fee;
  const platformFee = Math.round(consultationFee * 0.10); // 10% platform fee
  const gst = Math.round((consultationFee + platformFee) * 0.18); // 18% GST
  const totalAmount = consultationFee + platformFee + gst;

  const payment = await Payment.create({
    payer: req.user._id,
    payee: doctorId,
    appointment: null, // Will be updated after appointment creation
    amount: totalAmount,
    breakdown: {
      consultationFee,
      platformFee,
      gst
    },
    paymentMethod: 'pending', // Will be updated when payment is made
    status: 'pending'
  });

  // Create appointment
  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctorId,
    appointmentDate: new Date(appointmentDate),
    startTime: appointmentStart,
    duration,
    consultationType,
    consultationMode,
    reason,
    symptoms: symptoms || [],
    healthSurvey,
    payment: {
      amount: totalAmount,
      currency: 'INR',
      method: 'pending',
      status: 'pending'
    },
    isUrgent,
    priority,
    source: 'web'
  });

  // Update payment with appointment reference
  payment.appointment = appointment._id;
  await payment.save();

  // Populate appointment data for response
  await appointment.populate([
    { path: 'patient', select: 'name email phone' },
    { path: 'doctor', select: 'name email specializations' }
  ]);

  // Send appointment booking notifications
  try {
    const patientUser = await User.findById(req.user._id);
    const doctorUser = await User.findById(doctorId);
    
    if (patientUser && doctorUser) {
      await UserNotificationService.sendAppointmentBooked(appointment, patientUser, doctorUser);
    }
  } catch (notificationError) {
    console.error('⚠️ Failed to send appointment booking notifications:', notificationError.message);
  }

  res.status(201).json(new ApiResponse(
    201,
    {
      appointment,
      payment: {
        paymentId: payment._id,
        amount: payment.amount,
        status: payment.status
      }
    },
    'Appointment booked successfully. Please complete the payment.'
  ));
});

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private (Patient/Doctor/Admin)
export const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone profilePicture')
    .populate('doctor', 'name email specializations')
    .populate('medicalRecords');

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient._id.equals(req.user._id);
  const isDoctor = appointment.doctor._id.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new ApiError(403, 'Not authorized to view this appointment');
  }

  // Get payment details
  const payment = await Payment.findOne({ appointment: appointment._id });

  res.status(200).json(new ApiResponse(
    200,
    {
      appointment,
      payment
    },
    'Appointment details retrieved successfully'
  ));
});

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Patient/Doctor)
export const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient.equals(req.user._id);
  const isDoctor = appointment.doctor.equals(req.user._id);

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this appointment');
  }

  // Validate update permissions based on status
  if (appointment.status === 'completed') {
    throw new ApiError(400, 'Cannot update completed appointment');
  }

  const allowedUpdates = ['status', 'notes', 'meetingDetails'];
  if (isDoctor) {
    allowedUpdates.push('consultation', 'feedback');
  }

  // Filter only allowed updates
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
  .populate('patient', 'name email phone')
  .populate('doctor', 'name email specializations');

  res.status(200).json(new ApiResponse(
    200,
    updatedAppointment,
    'Appointment updated successfully'
  ));
});

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Patient/Doctor)
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient.equals(req.user._id);
  const isDoctor = appointment.doctor.equals(req.user._id);

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to cancel this appointment');
  }

  // Check if appointment can be cancelled
  if (!appointment.canBeCancelled()) {
    throw new ApiError(400, 'Appointment cannot be cancelled (less than 2 hours before appointment time or already completed)');
  }

  // Determine refund eligibility
  const now = new Date();
  const appointmentTime = new Date(appointment.startTime);
  const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);
  const refundEligible = hoursDiff >= 24; // 24 hours cancellation policy

  // Update appointment
  appointment.status = 'cancelled';
  appointment.cancellation = {
    cancelledBy: isPatient ? 'patient' : 'doctor',
    cancelledAt: new Date(),
    reason: reason || 'No reason provided',
    refundEligible
  };

  await appointment.save();

  // Process refund if eligible
  if (refundEligible) {
    const payment = await Payment.findOne({ appointment: appointment._id });
    if (payment && payment.status === 'completed') {
      await payment.initiateRefund(payment.amount, 'Appointment cancelled', req.user._id);
    }
  }

  res.status(200).json(new ApiResponse(
    200,
    {
      appointment,
      refundEligible,
      message: refundEligible ? 'Appointment cancelled. Refund will be processed.' : 'Appointment cancelled. No refund available.'
    },
    'Appointment cancelled successfully'
  ));
});

// @desc    Reschedule appointment
// @route   POST /api/appointments/:id/reschedule
// @access  Private (Patient/Doctor)
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { newStartTime, reason } = req.body;
  
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient.equals(req.user._id);
  const isDoctor = appointment.doctor.equals(req.user._id);

  if (!isPatient && !isDoctor) {
    throw new ApiError(403, 'Not authorized to reschedule this appointment');
  }

  // Check if appointment can be rescheduled
  if (!appointment.canBeRescheduled()) {
    throw new ApiError(400, 'Appointment cannot be rescheduled (maximum reschedule limit reached or appointment completed)');
  }

  // Check for conflicts with new time
  const newStart = new Date(newStartTime);
  const newEnd = new Date(newStart.getTime() + appointment.duration * 60000);

  const conflictingAppointment = await Appointment.findOne({
    _id: { $ne: appointment._id },
    doctor: appointment.doctor,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    $or: [
      {
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart }
      }
    ]
  });

  if (conflictingAppointment) {
    throw new ApiError(400, 'The requested new time slot is not available');
  }

  // Update appointment
  const originalDate = appointment.startTime;
  appointment.startTime = newStart;
  appointment.endTime = newEnd;
  appointment.appointmentDate = new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate());
  appointment.status = 'rescheduled';
  
  appointment.rescheduling = {
    rescheduledBy: isPatient ? 'patient' : 'doctor',
    rescheduledAt: new Date(),
    originalDate,
    reason: reason || 'No reason provided',
    reschedulingCount: (appointment.rescheduling?.reschedulingCount || 0) + 1
  };

  await appointment.save();

  await appointment.populate([
    { path: 'patient', select: 'name email phone' },
    { path: 'doctor', select: 'name email specializations' }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    appointment,
    'Appointment rescheduled successfully'
  ));
});

// @desc    Start consultation
// @route   POST /api/appointments/:id/start
// @access  Private (Doctor)
export const startConsultation = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization (only doctor can start consultation)
  if (!appointment.doctor.equals(req.user._id)) {
    throw new ApiError(403, 'Only the doctor can start the consultation');
  }

  // Check if appointment is confirmed
  if (appointment.status !== 'confirmed') {
    throw new ApiError(400, 'Appointment must be confirmed before starting consultation');
  }

  // Update appointment status
  appointment.status = 'in-progress';
  appointment.consultation.startedAt = new Date();

  // Generate meeting details if video/audio consultation
  if (['video', 'phone'].includes(appointment.consultationType)) {
    const meetingId = `meeting_${appointment._id}_${Date.now()}`;
    appointment.meetingDetails = {
      meetingId,
      joinUrl: `https://your-platform.com/consultation/${meetingId}`,
      roomId: meetingId
    };
  }

  await appointment.save();

  await appointment.populate([
    { path: 'patient', select: 'name email phone profilePicture' },
    { path: 'doctor', select: 'name email specializations' }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    appointment,
    'Consultation started successfully'
  ));
});

// @desc    Complete consultation
// @route   POST /api/appointments/:id/complete
// @access  Private (Doctor)
export const completeConsultation = asyncHandler(async (req, res) => {
  const {
    diagnosis,
    treatment,
    prescriptions,
    recommendations,
    followUpRequired,
    followUpDate,
    doctorNotes
  } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization (only doctor can complete consultation)
  if (!appointment.doctor.equals(req.user._id)) {
    throw new ApiError(403, 'Only the doctor can complete the consultation');
  }

  // Check if consultation is in progress
  if (appointment.status !== 'in-progress') {
    throw new ApiError(400, 'Consultation must be in progress to complete');
  }

  // Calculate actual duration
  const startedAt = appointment.consultation.startedAt;
  const endedAt = new Date();
  const actualDuration = Math.round((endedAt - startedAt) / (1000 * 60));

  // Update consultation details
  appointment.status = 'completed';
  appointment.consultation = {
    ...appointment.consultation,
    endedAt,
    actualDuration,
    diagnosis,
    treatment,
    prescriptions,
    recommendations,
    followUpRequired: followUpRequired || false,
    followUpDate: followUpDate ? new Date(followUpDate) : null,
    doctorNotes
  };

  await appointment.save();

  // Create medical record
  const medicalRecord = await MedicalRecord.create({
    patient: appointment.patient,
    doctor: appointment.doctor,
    appointment: appointment._id,
    recordType: 'consultation-note',
    title: `Consultation - ${new Date().toLocaleDateString()}`,
    description: `${appointment.consultationType} consultation for ${appointment.reason}`,
    content: {
      chiefComplaint: appointment.reason,
      assessment: {
        provisionalDiagnosis: diagnosis,
        clinicalNotes: doctorNotes
      },
      treatmentPlan: {
        medications: prescriptions,
        treatment,
        recommendations,
        followUp: {
          required: followUpRequired,
          date: followUpDate,
          instructions: recommendations?.join(', ')
        }
      }
    },
    status: 'approved'
  });

  // Add medical record reference to appointment
  appointment.medicalRecords.push(medicalRecord._id);
  await appointment.save();

  await appointment.populate([
    { path: 'patient', select: 'name email phone' },
    { path: 'doctor', select: 'name email specializations' },
    { path: 'medicalRecords' }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    {
      appointment,
      medicalRecord
    },
    'Consultation completed successfully'
  ));
});

// @desc    Get user appointments
// @route   GET /api/appointments
// @access  Private
export const getUserAppointments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    startDate,
    endDate,
    consultationType
  } = req.query;

  // Build filter based on user role
  const filter = {};
  const userRole = req.user.role;

  if (userRole === 'patient') {
    filter.patient = req.user._id;
  } else if (userRole === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }
    filter.doctor = req.user._id;
  } else if (userRole === 'admin') {
    // Admin can see all appointments (no additional filter)
  } else {
    throw new ApiError(403, 'Not authorized to view appointments');
  }

  if (status) {
    filter.status = status;
  }

  if (startDate && endDate) {
    filter.appointmentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  if (consultationType) {
    filter.consultationType = consultationType;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const appointments = await Appointment.find(filter)
    .populate('patient', 'name email phone profilePicture')
    .populate('doctor', 'name email specializations')
    .sort({ appointmentDate: -1, startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Appointment.countDocuments(filter);

  res.status(200).json(new ApiResponse(
    200,
    {
      appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    },
    'Appointments retrieved successfully'
  ));
});

// @desc    Confirm appointment payment
// @route   POST /api/appointments/:id/confirm-payment
// @access  Private (Patient)
export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentMethod, transactionId, gatewayResponse } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check authorization
  if (!appointment.patient.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to confirm payment for this appointment');
  }

  // Check if payment is pending
  if (appointment.payment.status !== 'pending') {
    throw new ApiError(400, 'Payment is not in pending status');
  }

  // Update payment details
  appointment.payment.method = paymentMethod;
  appointment.payment.status = 'completed';
  appointment.payment.transactionId = transactionId;
  appointment.payment.paymentGatewayResponse = gatewayResponse;
  appointment.payment.paidAt = new Date();

  // Update appointment status
  appointment.status = 'confirmed';

  await appointment.save();

  // Update payment record
  const payment = await Payment.findOne({ appointment: appointment._id });
  if (payment) {
    payment.paymentMethod = paymentMethod;
    payment.status = 'completed';
    payment.transactionId = transactionId;
    payment.gatewayResponse = {
      raw: gatewayResponse,
      status: 'success'
    };
    payment.completedAt = new Date();
    await payment.save();
  }

  await appointment.populate([
    { path: 'patient', select: 'name email phone' },
    { path: 'doctor', select: 'name email specializations' }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    appointment,
    'Payment confirmed and appointment scheduled successfully'
  ));
});

export default {
  bookAppointment,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  startConsultation,
  completeConsultation,
  getUserAppointments,
  confirmPayment
};
