import express from 'express';
import {
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
  getNotificationCounts,
  getFullProfile,
  updateProfileSection,
  rollbackProfileUpdate,
  getProfileChangeHistory,
  uploadDocuments,
  getDocumentUrl,
  validateProfileSection as validateSection,
  validateCompleteProfile,
  getProfileCompletionStatus,
  trackProfileProgress,
  getAvailableDoctorsForBooking,
  getDoctorAvailableSlots,
  bookConsultationWithDoctor
} from '../controllers/DoctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateProfileSection, validateDocumentUpload } from '../middleware/profileValidation.js';
import DocumentUploadService from '../services/DocumentUploadService.js';

const router = express.Router();
const documentUploadService = new DocumentUploadService();

import { getAvailableDoctors, getDoctorSlots, bookConsultation } from '../controllers/DoctorBookingController.js';

// Public routes for booking system
router.get('/booking', getAvailableDoctors);
router.get('/available', getAvailableDoctorsForBooking);

router.get('/', getAllDoctors);
router.get('/search', searchDoctors);

// Protected route placed before dynamic '/:id' to avoid conflict
router.get('/notification-counts', protect, authorize('doctor'), getNotificationCounts);

router.get('/:id', getDoctorById);
router.get('/:id/availability', getDoctorAvailability);
router.get('/:id/reviews', getDoctorReviews);
router.get('/:id/slots', getDoctorSlots);
router.get('/:id/available-slots', getDoctorAvailableSlots);

// Protected routes
router.use(protect);

// Admin only routes
router.post('/', authorize('admin'), createDoctor);

// Doctor and Admin routes
router.put('/:id', authorize('doctor', 'admin'), updateDoctor);
router.get('/:id/appointments', authorize('doctor', 'admin'), getDoctorAppointments);
router.get('/:id/earnings', authorize('doctor', 'admin'), getDoctorEarnings);
router.get('/:id/stats', authorize('doctor', 'admin'), getDoctorStats);
router.put('/:id/availability', authorize('doctor', 'admin'), updateDoctorAvailability);

// Patient booking routes
router.post('/:id/book', authorize('patient'), bookConsultation);

// Profile management routes
router.get('/:id/profile/full', authorize('doctor', 'admin'), getFullProfile);
router.put('/:id/profile/section', authorize('doctor', 'admin'), validateProfileSection, updateProfileSection);
router.post('/:id/profile/rollback', authorize('doctor', 'admin'), rollbackProfileUpdate);
router.get('/:id/profile/changes', authorize('doctor', 'admin'), getProfileChangeHistory);
router.post('/:id/documents', authorize('doctor', 'admin'), 
  documentUploadService.getMulterConfig().array('documents', 5), 
  validateDocumentUpload, 
  uploadDocuments
);

// Document URL generation route
router.get('/:id/documents/:publicId/url', authorize('doctor', 'admin'), getDocumentUrl);

// Profile validation routes
router.post('/:id/profile/validate-section', authorize('doctor', 'admin'), validateSection);
router.get('/:id/profile/validate', authorize('doctor', 'admin'), validateCompleteProfile);

// Profile completion and progress tracking routes
router.get('/:id/profile/completion', authorize('doctor', 'admin'), getProfileCompletionStatus);
router.post('/:id/profile/track-progress', authorize('doctor', 'admin'), trackProfileProgress);

export default router;
