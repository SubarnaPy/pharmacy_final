import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import UserNotificationService from '../services/UserNotificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import DoctorProfileService from '../services/DoctorProfileService.js';
import DocumentUploadService from '../services/DocumentUploadService.js';
import ProfileSyncService from '../services/ProfileSyncService.js';
import AuditLogService from '../services/AuditLogService.js';

// Create service instances
const documentUploadService = new DocumentUploadService();

// @desc    Get all doctors with filters
// @route   GET /api/doctors
// @access  Public
export const getAllDoctors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    specialization,
    consultationType,
    availability,
    minRating,
    maxFee,
    city,
    experience,
    sortBy = 'rating'
  } = req.query;

  // Build filter query
  const filter = {};
  
  if (specialization) {
    filter.specializations = { $in: [specialization] };
  }
  
  if (consultationType) {
    filter.consultationModes = { $elemMatch: { type: consultationType, isActive: true } };
  }
  
  if (minRating) {
    filter['ratings.average'] = { $gte: parseFloat(minRating) };
  }
  
  if (maxFee) {
    filter['consultationModes'] = {
      $elemMatch: {
        fee: { $lte: parseFloat(maxFee) }
      }
    };
  }
  
  if (city) {
    filter['location.city'] = { $regex: city, $options: 'i' };
  }
  
  if (experience) {
    filter.experienceYears = { $gte: parseInt(experience) };
  }

  // Build sort query
  let sortQuery = {};
  switch (sortBy) {
    case 'rating':
      sortQuery = { 'ratings.average': -1 };
      break;
    case 'experience':
      sortQuery = { experienceYears: -1 };
      break;
    case 'fee-low-to-high':
      sortQuery = { 'consultationModes.fee': 1 };
      break;
    case 'fee-high-to-low':
      sortQuery = { 'consultationModes.fee': -1 };
      break;
    default:
      sortQuery = { 'ratings.average': -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const doctors = await Doctor.find(filter)
    .populate('user', 'name email profilePicture isActive')
    .sort(sortQuery)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Doctor.countDocuments(filter);

  res.status(200).json(new ApiResponse(
    200,
    {
      doctors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDoctors: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    },
    'Doctors retrieved successfully'
  ));
});

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
export const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('user', 'name email profilePicture isActive createdAt');

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Get recent reviews
  const recentReviews = await Review.getRecentReviews(doctor.user._id, 5);
  
  // Get average rating
  const ratingStats = await Review.getAverageRating(doctor.user._id);

  res.status(200).json(new ApiResponse(
    200,
    {
      doctor,
      recentReviews,
      ratingStats
    },
    'Doctor details retrieved successfully'
  ));
});

// @desc    Create doctor profile
// @route   POST /api/doctors
// @access  Private (Admin only)
export const createDoctor = asyncHandler(async (req, res) => {
  const {
    userId,
    medicalLicense,
    specializations,
    qualifications,
    experienceYears,
    consultationModes,
    workingHours,
    location,
    bio,
    languages
  } = req.body;

  // Check if user exists and is not already a doctor
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const existingDoctor = await Doctor.findOne({ user: userId });
  if (existingDoctor) {
    throw new ApiError(400, 'User is already registered as a doctor');
  }

  const doctor = await Doctor.create({
    user: userId,
    medicalLicense,
    specializations,
    qualifications,
    experienceYears,
    consultationModes,
    workingHours,
    location,
    bio,
    languages
  });

  await doctor.populate('user', 'name email profilePicture');

  res.status(201).json(new ApiResponse(
    201,
    doctor,
    'Doctor profile created successfully'
  ));
});

// @desc    Update doctor profile
// @route   PUT /api/doctors/:id
// @access  Private (Doctor or Admin)
export const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Check authorization (doctor can update own profile or admin can update any)
  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to update this doctor profile');
  }

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('user', 'name email profilePicture');

  // Send profile update notification
  try {
    const user = await User.findById(doctor.user);
    if (user) {
      await UserNotificationService.sendProfileUpdated(
        user._id,
        user.role,
        user.name || 'Doctor',
        Object.keys(req.body)
      );
    }
  } catch (notificationError) {
    console.error('⚠️ Failed to send profile update notification:', notificationError.message);
  }

  res.status(200).json(new ApiResponse(
    200,
    updatedDoctor,
    'Doctor profile updated successfully'
  ));
});

// @desc    Get doctor's availability
// @route   GET /api/doctors/:id/availability
// @access  Public
export const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Get existing appointments
  const existingAppointments = await Appointment.find({
    doctor: doctor.user,
    appointmentDate: { $gte: start, $lte: end },
    status: { $in: ['confirmed', 'pending', 'in-progress'] }
  }).select('startTime endTime');

  // Generate available slots based on working hours
  const availability = doctor.generateAvailableSlots(start, end, existingAppointments);

  res.status(200).json(new ApiResponse(
    200,
    {
      availability,
      workingHours: doctor.workingHours,
      consultationModes: doctor.consultationModes.filter(mode => mode.isActive)
    },
    'Doctor availability retrieved successfully'
  ));
});

// @desc    Get doctor's appointments
// @route   GET /api/doctors/:id/appointments
// @access  Private (Doctor only)
export const getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Check authorization
  if (!doctor.user.equals(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view these appointments');
  }

  const {
    page = 1,
    limit = 20,
    status,
    startDate,
    endDate,
    consultationType
  } = req.query;

  const filter = { doctor: doctor.user };
  
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
    'Doctor appointments retrieved successfully'
  ));
});

// @desc    Get doctor's earnings
// @route   GET /api/doctors/:id/earnings
// @access  Private (Doctor only)
export const getDoctorEarnings = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Check authorization
  if (!doctor.user.equals(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view earnings');
  }

  const { startDate, endDate, period = 'month' } = req.query;

  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    // Default to current month
    end = new Date();
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  }

  // Get earnings summary
  const earnings = await Payment.getDoctorEarnings(doctor.user._id, start, end);

  // Get pending settlements
  const pendingSettlements = await Payment.findPendingSettlements(doctor.user._id, 10);

  // Get earnings trend (monthly breakdown)
  const earningsTrend = await Payment.aggregate([
    {
      $match: {
        payee: doctor.user._id,
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$completedAt' },
          month: { $month: '$completedAt' }
        },
        totalEarnings: { $sum: '$settlement.amount' },
        totalConsultations: { $sum: 1 },
        averageEarning: { $avg: '$settlement.amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    {
      earnings,
      pendingSettlements,
      earningsTrend,
      period: { start, end }
    },
    'Doctor earnings retrieved successfully'
  ));
});

// @desc    Update doctor's availability
// @route   PUT /api/doctors/:id/availability
// @access  Private (Doctor only)
export const updateDoctorAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Check authorization
  if (!doctor.user.equals(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update availability');
  }

  const { workingHours, consultationModes, isAcceptingAppointments } = req.body;

  if (workingHours) {
    doctor.workingHours = workingHours;
  }

  if (consultationModes) {
    doctor.consultationModes = consultationModes;
  }

  if (typeof isAcceptingAppointments === 'boolean') {
    doctor.isAvailable = isAcceptingAppointments;
  }

  await doctor.save();

  res.status(200).json(new ApiResponse(
    200,
    {
      workingHours: doctor.workingHours,
      isAvailable: doctor.isAvailable,
      consultationModes: doctor.consultationModes
    },
    'Doctor availability updated successfully'
  ));
});

// @desc    Get doctor's reviews
// @route   GET /api/doctors/:id/reviews
// @access  Public
export const getDoctorReviews = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const {
    page = 1,
    limit = 10,
    rating,
    sortBy = 'recent'
  } = req.query;

  const filter = {
    reviewee: doctor.user,
    status: 'approved',
    reviewType: 'patient-to-doctor'
  };

  if (rating) {
    filter.rating = parseInt(rating);
  }

  let sortQuery = {};
  switch (sortBy) {
    case 'recent':
      sortQuery = { createdAt: -1 };
      break;
    case 'helpful':
      sortQuery = { helpfulVotes: -1, createdAt: -1 };
      break;
    case 'rating-high':
      sortQuery = { rating: -1, createdAt: -1 };
      break;
    case 'rating-low':
      sortQuery = { rating: 1, createdAt: -1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find(filter)
    .populate('reviewer', 'name profilePicture')
    .populate('appointment', 'consultationType appointmentDate')
    .sort(sortQuery)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Review.countDocuments(filter);

  // Get rating statistics
  const ratingStats = await Review.getAverageRating(doctor.user._id);

  res.status(200).json(new ApiResponse(
    200,
    {
      reviews,
      ratingStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    },
    'Doctor reviews retrieved successfully'
  ));
});

// @desc    Search doctors
// @route   GET /api/doctors/search
// @access  Public
export const searchDoctors = asyncHandler(async (req, res) => {
  const {
    q,
    specialization,
    city,
    consultationType,
    minRating = 0,
    maxFee,
    page = 1,
    limit = 20
  } = req.query;

  if (!q && !specialization && !city) {
    throw new ApiError(400, 'Search query, specialization, or city is required');
  }

  // Build search query
  const searchQuery = [];

  if (q) {
    searchQuery.push(
      { 'user.name': { $regex: q, $options: 'i' } },
      { specializations: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
      { 'qualifications.degree': { $regex: q, $options: 'i' } }
    );
  }

  const filter = {};
  
  if (searchQuery.length > 0) {
    filter.$or = searchQuery;
  }

  if (specialization) {
    filter.specializations = { $in: [specialization] };
  }

  if (city) {
    filter['location.city'] = { $regex: city, $options: 'i' };
  }

  if (consultationType) {
    filter.consultationModes = { $elemMatch: { type: consultationType, isActive: true } };
  }

  if (minRating > 0) {
    filter['ratings.average'] = { $gte: parseFloat(minRating) };
  }

  if (maxFee) {
    filter['consultationModes'] = {
      $elemMatch: {
        fee: { $lte: parseFloat(maxFee) }
      }
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const doctors = await Doctor.find(filter)
    .populate('user', 'name email profilePicture')
    .sort({ 'ratings.average': -1, experienceYears: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Doctor.countDocuments(filter);

  res.status(200).json(new ApiResponse(
    200,
    {
      doctors,
      searchQuery: q,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    },
    'Doctor search completed successfully'
  ));
});

// @desc    Get doctor statistics
// @route   GET /api/doctors/:id/stats
// @access  Private (Doctor only)
export const getDoctorStats = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Check authorization
  if (!doctor.user.equals(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view statistics');
  }

  const { period = 'month' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Get appointment statistics
  const appointmentStats = await Appointment.aggregate([
    {
      $match: {
        doctor: doctor.user._id,
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get earnings for the period
  const earnings = await Payment.getDoctorEarnings(doctor.user._id, startDate, now);

  // Get rating statistics
  const ratingStats = await Review.getAverageRating(doctor.user._id);

  // Get consultation type breakdown
  const consultationTypeStats = await Appointment.aggregate([
    {
      $match: {
        doctor: doctor.user._id,
        status: 'completed',
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$consultationType',
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json(new ApiResponse(
    200,
    {
      period,
      dateRange: { startDate, endDate: now },
      appointmentStats,
      earnings,
      ratingStats,
      consultationTypeStats,
      totalPatients: await Appointment.distinct('patient', {
        doctor: doctor.user._id,
        status: 'completed'
      }).then(patients => patients.length)
    },
    'Doctor statistics retrieved successfully'
  ));
});

// @desc    Get complete doctor profile
// @route   GET /api/doctors/:id/profile/full
// @access  Private (Doctor or Admin)
export const getFullProfile = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const includeStats = req.query.includeStats === 'true';

  // Check authorization
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to access this profile');
  }

  const profileData = await DoctorProfileService.getFullProfile(doctorId, includeStats);

  res.status(200).json(new ApiResponse(
    200,
    profileData,
    'Complete doctor profile retrieved successfully'
  ));
});

// @desc    Update specific profile section
// @route   PUT /api/doctors/:id/profile/section
// @access  Private (Doctor or Admin)
export const updateProfileSection = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const { section, data } = req.body;
  const userId = req.user._id;

  // Check authorization
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to update this profile');
  }

  // Handle availability section specially
  if (section === 'availability') {
    console.log('Availability section update - received data:', JSON.stringify(data, null, 2));
    const { workingHours } = data;
    
    if (workingHours) {
      console.log('Setting working hours:', JSON.stringify(workingHours, null, 2));
      doctor.workingHours = workingHours;
    }

    try {
      await doctor.save();
      console.log('Doctor saved successfully with working hours:', JSON.stringify(doctor.workingHours, null, 2));
    } catch (saveError) {
      console.error('Error saving doctor:', saveError);
      throw new ApiError(400, `Failed to save availability: ${saveError.message}`);
    }

    const updatedSection = {
      workingHours: doctor.workingHours
    };

    res.status(200).json(new ApiResponse(
      200,
      {
        section,
        data: updatedSection,
        updatedAt: new Date()
      },
      `Profile section '${section}' updated successfully`
    ));
    return;
  }

  const updatedSection = await DoctorProfileService.updateProfileSection(
    doctorId, 
    section, 
    data, 
    userId
  );

  // Trigger doctor profile update notification
  if (req.notify) {
    await req.notify.trigger('doctor.profile_updated', {
      doctorId: doctor._id,
      doctorName: `${doctor.user?.profile?.firstName || 'Doctor'} ${doctor.user?.profile?.lastName || ''}`,
      section,
      updatedBy: userId,
      updatedAt: new Date(),
      notifyAdmins: true // Notify admins of profile changes
    });
  }

  res.status(200).json(new ApiResponse(
    200,
    {
      section,
      data: updatedSection,
      updatedAt: new Date()
    },
    `Profile section '${section}' updated successfully`
  ));
});

// @desc    Upload documents for doctor profile
// @route   POST /api/doctors/:id/documents
// @access  Private (Doctor or Admin)
export const uploadDocuments = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const { documentType } = req.body;
  const files = req.files;

  // Check authorization
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to upload documents for this profile');
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, 'No documents provided for upload');
  }

  // Upload documents
  const uploadResults = await documentUploadService.uploadMultipleDocuments(
    files,
    documentType,
    doctorId
  );

  // Update doctor profile with document references
  const documentReferences = uploadResults.map(result => ({
    fileName: result.fileName,
    fileUrl: result.fileUrl,
    publicId: result.publicId,
    documentType: result.documentType,
    uploadedAt: result.uploadedAt,
    fileSize: result.fileSize,
    mimeType: result.mimeType
  }));

  // Add documents to the appropriate section of the doctor profile
  if (documentType === 'license') {
    doctor.medicalLicense.documents = doctor.medicalLicense.documents || [];
    doctor.medicalLicense.documents.push(...documentReferences);
  } else if (documentType === 'certificate' || documentType === 'qualification') {
    doctor.documents = doctor.documents || [];
    doctor.documents.push(...documentReferences);
  }

  await doctor.save();

  res.status(201).json(new ApiResponse(
    201,
    {
      uploadedDocuments: uploadResults,
      documentReferences,
      totalUploaded: uploadResults.length
    },
    `${uploadResults.length} document(s) uploaded successfully`
  ));
});

// @desc    Generate secure document viewing URL
// @route   GET /api/doctors/:id/documents/:publicId/url
// @access  Private (Doctor or Admin)
export const getDocumentUrl = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const publicId = req.params.publicId;

  // Check authorization
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to access this document');
  }

  // Generate secure URL (valid for 1 hour)
  const secureUrl = documentUploadService.generateSecureDownloadUrl(publicId, 60);

  res.status(200).json(new ApiResponse(
    200,
    {
      url: secureUrl,
      expiresIn: 60 * 60 * 1000, // 1 hour in milliseconds
      publicId
    },
    'Document URL generated successfully'
  ));
});

// @desc    Validate a specific profile section
// @route   POST /api/doctors/:id/profile/validate-section
// @access  Private (Doctor or Admin)
export const validateProfileSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { section, data } = req.body;

  // Check authorization
  const doctor = await Doctor.findById(id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to validate this profile');
  }

  // Import ProfileValidationService
  const ProfileValidationService = (await import('../services/ProfileValidationService.js')).default;

  // Validate section data using ProfileValidationService
  const validation = ProfileValidationService.validateSectionData(section, data);
  
  if (!validation.isValid) {
    return res.status(400).json(new ApiResponse(
      400,
      {
        isValid: false,
        errors: validation.errors,
        section,
        validationType: 'section',
        timestamp: new Date().toISOString()
      },
      'Profile section validation failed'
    ));
  }

  res.status(200).json(new ApiResponse(
    200,
    {
      isValid: true,
      section,
      validationType: 'section',
      timestamp: new Date().toISOString()
    },
    'Profile section validation passed'
  ));
});

// @desc    Validate complete doctor profile
// @route   GET /api/doctors/:id/profile/validate
// @access  Private (Doctor or Admin)
export const validateCompleteProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check authorization
  const doctor = await Doctor.findById(id);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  if (req.user.role !== 'admin' && !doctor.user.equals(req.user._id)) {
    throw new ApiError(403, 'Not authorized to validate this profile');
  }

  // Import ProfileValidationService
  const ProfileValidationService = (await import('../services/ProfileValidationService.js')).default;

  // Perform comprehensive validation
  const validation = ProfileValidationService.validateCompleteProfile(doctor.toObject());
  
  // Calculate completion percentage
  const requiredSections = ['personalInfo', 'medicalLicense', 'specializations', 'qualifications'];
  const completedSections = requiredSections.filter(section => {
    const sectionData = doctor[section];
    if (!sectionData) return false;
    
    if (Array.isArray(sectionData)) {
      return sectionData.length > 0;
    }
    
    if (typeof sectionData === 'object') {
      return Object.keys(sectionData).length > 0;
    }
    
    return true;
  });
  
  const completionPercentage = Math.round((completedSections.length / requiredSections.length) * 100);
  const missingSections = requiredSections.filter(section => !completedSections.includes(section));

  // Prepare response
  const response = {
    doctorId: id,
    isValid: validation.isValid,
    canActivateProfile: validation.canActivateProfile,
    completionPercentage,
    missingSections,
    errors: validation.errors || [],
    warnings: validation.warnings || [],
    businessRuleErrors: validation.businessRuleErrors || [],
    businessRuleWarnings: validation.businessRuleWarnings || [],
    validationType: 'complete_profile',
    validatedAt: new Date().toISOString(),
    summary: {
      totalErrors: (validation.errors?.length || 0) + (validation.businessRuleErrors?.length || 0),
      totalWarnings: (validation.warnings?.length || 0) + (validation.businessRuleWarnings?.length || 0),
      canSave: validation.errors?.length === 0,
      recommendedActions: []
    }
  };

  // Add recommended actions
  if (missingSections.length > 0) {
    response.summary.recommendedActions.push(`Complete missing sections: ${missingSections.join(', ')}`);
  }
  
  if (validation.businessRuleErrors?.length > 0) {
    response.summary.recommendedActions.push('Resolve critical business rule violations');
  }
  
  if (completionPercentage < 80) {
    response.summary.recommendedActions.push('Complete more profile sections to improve patient visibility');
  }

  res.status(200).json(new ApiResponse(
    200,
    response,
    'Profile validation completed'
  ));
});

// @desc    Rollback profile update
// @route   POST /api/doctors/:id/profile/rollback
// @access  Private (Doctor/Admin)
export const rollbackProfileUpdate = asyncHandler(async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const { operationId } = req.body;

    if (!operationId) {
      throw new ApiError(400, 'Operation ID is required for rollback');
    }

    // Verify doctor exists and user has permission
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Check if user has permission to rollback this doctor's profile
    if (req.user.role !== 'admin' && req.user.doctorProfile?.toString() !== doctorId) {
      throw new ApiError(403, 'Not authorized to rollback this profile');
    }

    // Perform rollback using ProfileSyncService
    const rollbackSuccess = await ProfileSyncService.rollbackUpdate(operationId);

    if (!rollbackSuccess) {
      throw new ApiError(400, 'Failed to rollback update. Operation may not exist or may have expired.');
    }

    // Get updated profile data
    const updatedProfile = await DoctorProfileService.getFullProfile(doctorId);

    res.status(200).json(
      new ApiResponse(200, {
        success: true,
        operationId,
        profile: updatedProfile
      }, 'Profile update rolled back successfully')
    );

  } catch (error) {
    console.error('Rollback profile update error:', error);
    throw error;
  }
});

// @desc    Get profile change history
// @route   GET /api/doctors/:id/profile/changes
// @access  Private (Doctor/Admin)
export const getProfileChangeHistory = asyncHandler(async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const { limit = 10, section = null } = req.query;

    // Verify doctor exists and user has permission
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Check if user has permission to view this doctor's change history
    if (req.user.role !== 'admin' && req.user.doctorProfile?.toString() !== doctorId) {
      throw new ApiError(403, 'Not authorized to view this profile change history');
    }

    // Get change history
    let changeHistory;
    if (section) {
      changeHistory = await AuditLogService.getProfileChangesBySection(doctorId, section, parseInt(limit));
    } else {
      changeHistory = await AuditLogService.getRecentProfileChanges(doctorId, parseInt(limit));
    }

    // Format the response
    const formattedHistory = changeHistory.map(change => ({
      id: change._id,
      operationId: change.operationId,
      section: change.section,
      changeType: change.changeType,
      isRollback: change.isRollback,
      timestamp: change.timestamp,
      impactLevel: change.impactLevel,
      syncStatus: change.syncStatus,
      user: change.userId ? {
        id: change.userId._id,
        name: change.userId.name,
        email: change.userId.email
      } : null,
      hasChanges: !!change.changes,
      hasPreviousValues: !!change.previousValues,
      notificationStatus: change.notificationStatus,
      affectedSystems: change.affectedSystems
    }));

    res.status(200).json(
      new ApiResponse(200, {
        changes: formattedHistory,
        totalCount: formattedHistory.length,
        doctorId,
        section: section || 'all'
      }, 'Profile change history retrieved successfully')
    );

  } catch (error) {
    console.error('Get profile change history error:', error);
    throw error;
  }
});

// @desc    Get profile completion status
// @route   GET /api/doctors/:id/profile/completion
// @access  Private (Doctor/Admin)
export const getProfileCompletionStatus = asyncHandler(async (req, res) => {
  try {
    const { id: doctorId } = req.params;

    // Verify doctor exists and user has permission
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Check if user has permission to view this doctor's completion status
    if (req.user.role !== 'admin' && req.user.doctorProfile?.toString() !== doctorId) {
      throw new ApiError(403, 'Not authorized to view this profile completion status');
    }

    // Get completion status from DoctorProfileService
    const completionStatus = await DoctorProfileService.getProfileCompletionStatus(doctorId);

    res.status(200).json(
      new ApiResponse(200, completionStatus, 'Profile completion status retrieved successfully')
    );

  } catch (error) {
    console.error('Get profile completion status error:', error);
    throw error;
  }
});

// @desc    Track profile completion progress
// @route   POST /api/doctors/:id/profile/track-progress
// @access  Private (Doctor/Admin)
export const trackProfileProgress = asyncHandler(async (req, res) => {
  try {
    const { id: doctorId } = req.params;

    // Verify doctor exists and user has permission
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Check if user has permission to track this doctor's progress
    if (req.user.role !== 'admin' && req.user.doctorProfile?.toString() !== doctorId) {
      throw new ApiError(403, 'Not authorized to track this profile progress');
    }

    // Track progress
    await DoctorProfileService.trackProfileProgress(doctorId);

    res.status(200).json(
      new ApiResponse(200, { success: true }, 'Profile progress tracked successfully')
    );

  } catch (error) {
    console.error('Track profile progress error:', error);
    throw error;
  }
});

// @desc    Get sync statistics for profile updates
// @route   GET /api/doctors/:id/profile/sync-stats
// @access  Private (Doctor/Admin)
export const getProfileSyncStats = asyncHandler(async (req, res) => {
  try {
    const { id: doctorId } = req.params;

    // Verify doctor exists and user has permission
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Check if user has permission to view sync stats
    if (req.user.role !== 'admin' && req.user.doctorProfile?.toString() !== doctorId) {
      throw new ApiError(403, 'Not authorized to view sync statistics');
    }

    // Get sync statistics
    const syncStats = ProfileSyncService.getSyncStats();
    const auditStats = await AuditLogService.getAuditStats({ entityType: 'doctor' });

    res.status(200).json(
      new ApiResponse(200, {
        syncStats,
        auditStats,
        doctorId
      }, 'Sync statistics retrieved successfully')
    );

  } catch (error) {
    console.error('Get sync stats error:', error);
    throw error;
  }
});

// @desc    Get pending sync operations
// @route   GET /api/doctors/profile/pending-sync
// @access  Private (Admin only)
export const getPendingSyncOperations = asyncHandler(async (req, res) => {
  try {
    // Only admins can view pending sync operations
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    // Get pending sync operations
    const pendingOperations = await AuditLogService.getPendingSyncOperations();

    const formattedOperations = pendingOperations.map(operation => ({
      id: operation._id,
      operationId: operation.operationId,
      doctorId: operation.doctorId,
      section: operation.section,
      syncStatus: operation.syncStatus,
      syncAttempts: operation.syncAttempts,
      timestamp: operation.timestamp,
      impactLevel: operation.impactLevel,
      affectedSystems: operation.affectedSystems,
      lastError: operation.syncErrors?.[operation.syncErrors.length - 1]?.error
    }));

    res.status(200).json(
      new ApiResponse(200, {
        pendingOperations: formattedOperations,
        totalCount: formattedOperations.length
      }, 'Pending sync operations retrieved successfully')
    );

  } catch (error) {
    console.error('Get pending sync operations error:', error);
    throw error;
  }
});

// @desc    Retry failed sync operation
// @route   POST /api/doctors/profile/retry-sync
// @access  Private (Admin only)
export const retrySyncOperation = asyncHandler(async (req, res) => {
  try {
    const { operationId } = req.body;

    // Only admins can retry sync operations
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    if (!operationId) {
      throw new ApiError(400, 'Operation ID is required');
    }

    // Find the operation and retry sync
    const operation = await ProfileChangeLog.findOne({ operationId });
    if (!operation) {
      throw new ApiError(404, 'Sync operation not found');
    }

    // Queue the operation for retry
    await ProfileSyncService.queueSyncOperations(
      operation.doctorId,
      operation.section,
      operation.changes,
      operationId
    );

    res.status(200).json(
      new ApiResponse(200, {
        operationId,
        status: 'queued_for_retry'
      }, 'Sync operation queued for retry')
    );

  } catch (error) {
    console.error('Retry sync operation error:', error);
    throw error;
  }
});

// @desc    Get available doctors for patient booking
// @route   GET /api/doctors/available
// @access  Public
export const getAvailableDoctorsForBooking = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    specialization,
    consultationType = 'video',
    minRating = 0,
    maxFee,
    sortBy = 'rating'
  } = req.query;

  // Build filter for available doctors
  const filter = {
    isAvailable: true,
    isAcceptingAppointments: true,
    status: 'verified',
    [`consultationModes.${consultationType}.available`]: true
  };
  
  if (specialization && specialization !== 'all') {
    filter.specializations = { $in: [specialization] };
  }
  
  if (minRating > 0) {
    filter['ratings.average'] = { $gte: parseFloat(minRating) };
  }
  
  if (maxFee) {
    filter[`consultationModes.${consultationType}.fee`] = { $lte: parseFloat(maxFee) };
  }

  // Build sort query
  let sortQuery = {};
  switch (sortBy) {
    case 'rating':
      sortQuery = { 'ratings.average': -1 };
      break;
    case 'experience':
      sortQuery = { 'experience.totalYears': -1 };
      break;
    case 'fee_low':
      sortQuery = { [`consultationModes.${consultationType}.fee`]: 1 };
      break;
    case 'fee_high':
      sortQuery = { [`consultationModes.${consultationType}.fee`]: -1 };
      break;
    default:
      sortQuery = { 'ratings.average': -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const doctors = await Doctor.find(filter)
      .populate('user', 'name email profilePicture')
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(filter);

    // Format doctor data for booking
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      name: doctor.user?.name || 'Doctor',
      email: doctor.user?.email,
      profilePicture: doctor.user?.profilePicture,
      specializations: doctor.specializations || [],
      primarySpecialty: doctor.specializations?.[0] || 'General Medicine',
      experience: doctor.experience?.totalYears || 0,
      currentPosition: doctor.experience?.currentPosition,
      workplace: doctor.experience?.workplace?.[0]?.hospitalName || 'Not specified',
      bio: doctor.bio,
      languages: doctor.languages || ['en'],
      rating: doctor.ratings?.average || 0,
      totalReviews: doctor.ratings?.totalReviews || 0,
      consultationFee: doctor.consultationModes?.[consultationType]?.fee || 0,
      consultationDuration: doctor.consultationModes?.[consultationType]?.duration || 30,
      consultationModes: Object.keys(doctor.consultationModes || {})
        .filter(mode => doctor.consultationModes[mode]?.available)
        .map(mode => ({
          type: mode,
          fee: doctor.consultationModes[mode].fee,
          duration: doctor.consultationModes[mode].duration || 30
        })),
      qualifications: doctor.qualifications?.map(q => ({
        degree: q.degree,
        institution: q.institution,
        year: q.year,
        specialization: q.specialization
      })) || [],
      isAvailable: doctor.isAvailable,
      status: doctor.status,
      lastActiveAt: doctor.lastActiveAt
    }));

    res.status(200).json(new ApiResponse(
      200,
      {
        doctors: formattedDoctors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDoctors: total,
          hasNextPage: skip + parseInt(limit) < total,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          specialization,
          consultationType,
          minRating,
          maxFee,
          sortBy
        }
      },
      'Available doctors retrieved successfully'
    ));
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    throw new ApiError(500, 'Failed to fetch available doctors');
  }
});

// @desc    Get doctor available time slots
// @route   GET /api/doctors/:id/available-slots
// @access  Public
export const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.params;
  const { 
    startDate,
    endDate,
    days = 7 
  } = req.query;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    if (!doctor.isAvailable || !doctor.isAcceptingAppointments || doctor.status !== 'verified') {
      throw new ApiError(400, 'Doctor is not available for appointments');
    }

    // Calculate date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + (parseInt(days) * 24 * 60 * 60 * 1000));

    // Generate available slots
    const availableSlots = await generateAvailableSlots(doctor, start, end);

    res.status(200).json(new ApiResponse(
      200,
      {
        doctorId,
        doctorName: doctor.user?.name,
        slots: availableSlots,
        dateRange: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        },
        slotDuration: doctor.timeSlotDuration || 30,
        breakBetweenSlots: doctor.breakBetweenSlots || 10
      },
      'Doctor available slots retrieved successfully'
    ));
  } catch (error) {
    console.error('Error fetching doctor slots:', error);
    throw error;
  }
});

// @desc    Book a consultation with doctor
// @route   POST /api/doctors/:id/book
// @access  Private (Patient)
export const bookConsultationWithDoctor = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.params;
  const { 
    date, 
    startTime, 
    endTime, 
    consultationType = 'video', 
    notes = '' 
  } = req.body;
  const patientId = req.user._id;

  if (!date || !startTime || !endTime) {
    throw new ApiError(400, 'Date, start time, and end time are required');
  }

  try {
    // Check if doctor exists and is available
    const doctor = await Doctor.findById(doctorId).populate('user', 'name email');
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    if (!doctor.isAvailable || !doctor.isAcceptingAppointments || doctor.status !== 'verified') {
      throw new ApiError(400, 'Doctor is not available for appointments');
    }

    if (!doctor.consultationModes[consultationType]?.available) {
      throw new ApiError(400, `Doctor is not available for ${consultationType} consultations`);
    }

    // Check if slot is available
    const isSlotAvailable = await checkSlotAvailability(doctorId, date, startTime, endTime);
    if (!isSlotAvailable) {
      throw new ApiError(400, 'Time slot is not available');
    }

    // Create consultation booking
    const consultation = new Consultation({
      doctorId,
      patientId,
      slotId: `${doctorId}_${date}_${startTime}`, // Generate a unique slot ID
      date,
      time: startTime,
      endTime,
      consultationType,
      consultationFee: doctor.consultationModes[consultationType].fee,
      notes,
      status: 'confirmed'
    });

    await consultation.save();

    // Populate doctor and patient data
    await consultation.populate([
      { path: 'doctorId', populate: { path: 'user', select: 'name email' } },
      { path: 'patientId', select: 'name email' }
    ]);

    // Update doctor's stats
    await Doctor.findByIdAndUpdate(doctorId, {
      $inc: { 'stats.totalConsultations': 1 }
    });

    res.status(201).json(new ApiResponse(
      201,
      {
        consultation,
        bookingDetails: {
          doctorName: doctor.user?.name,
          date,
          time: `${startTime} - ${endTime}`,
          consultationType,
          fee: doctor.consultationModes[consultationType].fee,
          duration: doctor.consultationModes[consultationType].duration || 30
        }
      },
      'Consultation booked successfully'
    ));

  } catch (error) {
    console.error('Error booking consultation:', error);
    throw error;
  }
});

// Helper function to generate available slots for a doctor
const generateAvailableSlots = async (doctor, startDate, endDate) => {
  const slots = [];
  const currentDate = new Date(startDate);
  const maxAdvanceBookingDays = doctor.maxAdvanceBookingDays || 30;
  
  // Get existing bookings for the date range
  const existingBookings = await Consultation.find({
    doctorId: doctor._id,
    date: {
      $gte: startDate.toISOString().split('T')[0],
      $lte: endDate.toISOString().split('T')[0]
    },
    status: 'confirmed'
  });

  const bookedSlots = new Set(
    existingBookings.map(booking => `${booking.date}_${booking.time}`)
  );

  while (currentDate <= endDate && currentDate <= new Date(Date.now() + (maxAdvanceBookingDays * 24 * 60 * 60 * 1000))) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Skip past dates
    if (currentDate < new Date().setHours(0, 0, 0, 0)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const daySchedule = doctor.workingHours?.[dayName];
    if (daySchedule?.available && daySchedule.slots && daySchedule.slots.length > 0) {
      const daySlots = [];
      
      daySchedule.slots.forEach(slot => {
        const slotKey = `${dateStr}_${slot.start}`;
        const isBooked = bookedSlots.has(slotKey);
        
        // Check if slot is in the future (for today)
        let isInFuture = true;
        if (dateStr === new Date().toISOString().split('T')[0]) {
          const now = new Date();
          const slotTime = new Date(`${dateStr}T${slot.start}`);
          isInFuture = slotTime > now;
        }

        if (!isBooked && isInFuture) {
          daySlots.push({
            id: `${doctor._id}_${dateStr}_${slot.start}`,
            date: dateStr,
            startTime: slot.start,
            endTime: slot.end,
            available: true,
            duration: calculateSlotDuration(slot.start, slot.end)
          });
        }
      });

      if (daySlots.length > 0) {
        slots.push({
          date: dateStr,
          dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          formattedDate: currentDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          slots: daySlots,
          totalSlots: daySlots.length
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
};

// Helper function to check slot availability
const checkSlotAvailability = async (doctorId, date, startTime, endTime) => {
  try {
    // Check if there's already a booking for this exact time slot
    const existingBooking = await Consultation.findOne({
      doctorId,
      date,
      time: startTime,
      status: 'confirmed'
    });

    if (existingBooking) {
      return false;
    }

    // Validate against doctor's working hours
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return false;
    }

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = doctor.workingHours?.[dayName];
    
    if (!daySchedule?.available || !daySchedule.slots) {
      return false;
    }

    // Check if the requested time slot exists in doctor's schedule
    const validSlot = daySchedule.slots.find(slot => 
      slot.start === startTime && slot.end === endTime
    );

    return !!validSlot;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
};

// Helper function to calculate slot duration
const calculateSlotDuration = (startTime, endTime) => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return Math.abs(end - start) / (1000 * 60); // Duration in minutes
};

export const getNotificationCounts = asyncHandler(async (req, res) => {
  // This is a placeholder implementation.
  // In a real application, you would fetch the actual notification counts from a database or a notification service.
  const notificationCounts = {
    unread: 5,
    total: 20,
    categories: {
      appointments: 2,
      messages: 3,
      updates: 0
    }
  };

  res.status(200).json(new ApiResponse(
    200,
    notificationCounts,
    'Notification counts retrieved successfully'
  ));
});

export default {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  getDoctorAvailability,
  getDoctorAppointments,
  getDoctorEarnings,
  updateDoctorAvailability,
  getDoctorReviews,
  searchDoctors,
  getDoctorStats,
  getFullProfile,
  updateProfileSection,
  uploadDocuments,
  getDocumentUrl,
  validateProfileSection,
  validateCompleteProfile,
  getAvailableDoctorsForBooking,
  getDoctorAvailableSlots,
  bookConsultationWithDoctor,
  rollbackProfileUpdate,
  getProfileChangeHistory,
  getProfileCompletionStatus,
  trackProfileProgress,
  getProfileSyncStats,
  getPendingSyncOperations,
  retrySyncOperation,
  getNotificationCounts
};
