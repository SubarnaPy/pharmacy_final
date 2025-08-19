import Doctor from '../models/Doctor.js';
import Consultation from '../models/Consultation.js';
import User from '../models/User.js';
import UserNotificationService from '../services/UserNotificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// @desc    Get available doctors for booking
// @route   GET /api/doctors/booking
// @access  Public
export const getAvailableDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ 
    isAvailable: true,
    isAcceptingAppointments: true 
  }).populate('user', 'name email');
  
  const formattedDoctors = doctors.map(doctor => ({
    id: doctor._id,
    name: doctor.user?.name || 'Doctor',
    specialty: doctor.specializations?.[0] || 'General Medicine',
    experience: `${doctor.experience?.totalYears || 0} years`,
    rating: doctor.ratings?.average || 4.5,
    consultationFee: doctor.consultationModes?.video?.fee || 100,
    location: doctor.workplace?.[0]?.hospitalName || 'Not specified',
    available: doctor.isAvailable && doctor.isAcceptingAppointments
  }));
  
  res.status(200).json(new ApiResponse(
    200,
    formattedDoctors,
    'Available doctors retrieved successfully'
  ));
});

// @desc    Get doctor time slots
// @route   GET /api/doctors/:id/slots
// @access  Public
export const getDoctorSlots = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.params;
  const { days = 7 } = req.query;
  
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }
  
  const slots = await generateDoctorSlots(doctorId, parseInt(days));
  
  res.status(200).json(new ApiResponse(
    200,
    slots,
    'Doctor slots retrieved successfully'
  ));
});

// @desc    Book consultation
// @route   POST /api/consultations/book
// @access  Private
export const bookConsultation = asyncHandler(async (req, res) => {
  console.log('📅 Booking consultation with data:', req.body);
  
  const doctorId = req.params.id || req.body.doctorId;
  const { slotId, date, startTime, time, endTime, consultationType = 'video', notes = '' } = req.body;
  const patientId = req.user._id;
  
  // Use time or startTime (for flexibility)
  const finalTime = time || startTime;
  
  // Validate required fields
  if (!doctorId) {
    throw new ApiError(400, 'Doctor ID is required');
  }
  
  // If slotId is provided, try to extract date/time from it
  let finalDate = date;
  let extractedTime = finalTime;
  let finalEndTime = endTime;
  
  if (slotId && !date) {
    // Extract from slotId format: doctorId_date_time
    const parts = slotId.split('_');
    if (parts.length >= 3) {
      finalDate = parts[1];
      extractedTime = parts[2];
      // Generate endTime if not provided (assume 30 min consultation)
      if (!finalEndTime) {
        const [hours, minutes] = extractedTime.split(':');
        const endHour = parseInt(hours);
        const endMinute = parseInt(minutes) + 30;
        finalEndTime = `${endHour}:${endMinute.toString().padStart(2, '0')}`;
      }
    }
  }
  
  if (!finalDate) {
    throw new ApiError(400, 'Date is required (either in date field or slotId)');
  }
  
  if (!extractedTime) {
    throw new ApiError(400, 'Time is required (either in time field or slotId)');
  }
  
  if (!finalEndTime) {
    // Generate default endTime (30 minutes later)
    const [hours, minutes] = extractedTime.split(':');
    const endHour = parseInt(hours);
    const endMinute = parseInt(minutes) + 30;
    finalEndTime = `${endHour}:${endMinute.toString().padStart(2, '0')}`;
  }
  
  // Generate slotId if not provided
  const finalSlotId = slotId || `${doctorId}_${finalDate}_${extractedTime}`;
  
  console.log('📅 Final booking data:', {
    doctorId,
    finalDate,
    extractedTime,
    finalEndTime,
    finalSlotId
  });
  
  // Check if slot is already booked
  const existingBooking = await Consultation.findOne({
    doctorId,
    date: finalDate,
    time: extractedTime,
    status: 'confirmed'
  });
  
  if (existingBooking) {
    throw new ApiError(400, 'Time slot is already booked');
  }
  
  // Get doctor info
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }
  
  // Create consultation booking
  const consultation = new Consultation({
    doctorId,
    patientId,
    slotId: finalSlotId,
    date: finalDate,
    time: extractedTime,
    endTime: finalEndTime,
    consultationType,
    notes,
    consultationFee: doctor.consultationModes?.video?.fee || 100,
    status: 'confirmed'
  });
  
  await consultation.save();
  await consultation.populate('doctorId', 'user specializations');
  
  // Send notifications to both patient and doctor
  const doctorUser = await User.findById(doctor.user);
  const patientUser = await User.findById(patientId);
  
  // Send enhanced notifications
  try {
    await UserNotificationService.sendAppointmentBooked(consultation, patientUser, doctorUser);
    console.log('✅ Enhanced notifications sent for appointment booking');
  } catch (notificationError) {
    console.error('⚠️ Failed to send appointment notifications:', notificationError.message);
  }
  
  console.log('✅ Consultation booked and notifications sent');
  
  res.status(201).json(new ApiResponse(
    201,
    consultation,
    'Consultation booked successfully'
  ));
});

// @desc    Get patient bookings
// @route   GET /api/consultations/patient/:patientId
// @access  Private
export const getPatientBookings = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status, limit = 10, page = 1 } = req.query;
  
  // Check authorization
  if (req.user._id.toString() !== patientId && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view these bookings');
  }
  
  const filter = { patientId };
  if (status) filter.status = status;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const consultations = await Consultation.find(filter)
    .populate('doctorId', 'user specializations workplace')
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
    'Patient bookings retrieved successfully'
  ));
});

// Helper function to generate doctor slots
const generateDoctorSlots = async (doctorId, days = 7) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return [];
  
  const slots = [];
  const today = new Date();
  
  // Get existing bookings for the period
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);
  
  const existingBookings = await Consultation.find({
    doctorId,
    date: { 
      $gte: today.toISOString().split('T')[0],
      $lte: endDate.toISOString().split('T')[0]
    },
    status: 'confirmed'
  });
  
  const bookedSlots = new Set(
    existingBookings.map(booking => `${booking.date}_${booking.time}`)
  );
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dateStr = date.toISOString().split('T')[0];
    
    const daySchedule = doctor.workingHours?.[dayName];
    if (daySchedule?.available && daySchedule.slots) {
      daySchedule.slots.forEach(slot => {
        const slotKey = `${dateStr}_${slot.start}`;
        const available = !bookedSlots.has(slotKey);
        
        slots.push({
          _id: `${doctorId}_${dateStr}_${slot.start}`,
          date: dateStr,
          time: slot.start,
          endTime: slot.end,
          available,
          doctorId
        });
      });
    }
  }
  
  return slots;
};

// Helper function to validate slot availability
const validateSlotAvailability = async (doctorId, date, time) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return false;
  
  const requestDate = new Date(date);
  const dayName = requestDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
  
  const daySchedule = doctor.workingHours?.[dayName];
  if (!daySchedule?.available) return false;
  
  const hasSlot = daySchedule.slots?.some(slot => slot.start === time);
  return hasSlot;
};

// @desc    Cancel consultation
// @route   PUT /api/consultations/:consultationId/cancel
// @access  Private
export const cancelConsultation = asyncHandler(async (req, res) => {
  const { consultationId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Find consultation
  const consultation = await Consultation.findById(consultationId)
    .populate('doctorId', 'user specializations')
    .populate('patientId', 'name');
  
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found');
  }
  
  // Check authorization
  const isPatient = userRole === 'patient' && consultation.patientId._id.toString() === userId;
  const isDoctor = userRole === 'doctor' && consultation.doctorId.user.toString() === userId;
  
  if (!isPatient && !isDoctor) {
    throw new ApiError(403, 'Not authorized to cancel this consultation');
  }
  
  // Update consultation status
  consultation.status = 'cancelled';
  consultation.cancellationReason = reason;
  consultation.cancelledBy = userRole;
  consultation.cancelledAt = new Date();
  await consultation.save();
  
  // Send cancellation notifications
  try {
    const doctorUser = await User.findById(consultation.doctorId.user);
    const patientUser = consultation.patientId;
    
    await UserNotificationService.sendAppointmentCancelled(
      consultation,
      patientUser,
      doctorUser,
      userRole
    );
    
    console.log('✅ Consultation cancellation notifications sent');
  } catch (notificationError) {
    console.error('⚠️ Failed to send cancellation notifications:', notificationError.message);
  }
  
  res.status(200).json(new ApiResponse(
    200,
    consultation,
    'Consultation cancelled successfully'
  ));
});

export default {
  getAvailableDoctors,
  getDoctorSlots,
  bookConsultation,
  getPatientBookings,
  cancelConsultation
};