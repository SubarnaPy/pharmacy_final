import express from 'express';
import {
  bookAppointment,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  startConsultation,
  completeConsultation,
  getUserAppointments,
  confirmPayment
} from '../controllers/AppointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All appointment routes require authentication
router.use(protect);

// Patient and general routes
router.post('/', authorize('patient', 'admin'), bookAppointment);
router.get('/', getUserAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id', updateAppointment);
router.post('/:id/reschedule', rescheduleAppointment);
router.delete('/:id', cancelAppointment);

// Patient specific routes
router.post('/:id/confirm-payment', authorize('patient', 'admin'), confirmPayment);

// Doctor specific routes
router.post('/:id/start', authorize('doctor', 'admin'), startConsultation);
router.post('/:id/complete', authorize('doctor', 'admin'), completeConsultation);

export default router;
