import express from 'express';
import { getQuickStats, getRecentPrescriptions, getUpcomingAppointments } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to fetch quick stats
router.get('/stats/quick', authenticate, getQuickStats);

// Route to fetch recent prescriptions
router.get('/prescriptions/recent', authenticate, getRecentPrescriptions);

// Route to fetch upcoming appointments
router.get('/appointments/upcoming', authenticate, getUpcomingAppointments);

export default router;
