import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { bookConsultation, getPatientBookings } from '../controllers/DoctorBookingController.js';
import {
  requestConsultation,
  getConsultations,
  getConsultation,
  cancelConsultationLegacy,
  getPatientConsultations,
  getConsultationDetails,
  cancelConsultation,
  startVideoConsultation
} from '../controllers/consultationController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Patient consultation history routes
router.get('/my-bookings', authorize('patient'), getPatientConsultations);
router.get('/:id/details', authorize('patient'), getConsultationDetails);
router.patch('/:id/cancel', authorize('patient'), cancelConsultation);

// Video consultation routes
router.patch('/:id/start', startVideoConsultation);

// Get all consultations for current user
router.get('/my-consultations', async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let filter = {};
    if (userRole === 'patient') {
      filter.patientId = userId;
    } else if (userRole === 'doctor') {
      const Doctor = (await import('../models/Doctor.js')).default;
      const doctor = await Doctor.findOne({ user: userId });
      
      if (doctor) {
        filter.doctorId = doctor._id;
      } else {
        return res.json({ success: true, data: [] });
      }
    }
    
    const Consultation = (await import('../models/Consultation.js')).default;
    const consultations = await Consultation.find(filter)
      .populate('doctorId', 'user specializations')
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: consultations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// Join consultation room
router.get('/:id/join', async (req, res) => {
  try {
    console.log('🔗 Join consultation request:', {
      consultationId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role
    });
    
    const Consultation = (await import('../models/Consultation.js')).default;
    const consultation = await Consultation.findById(req.params.id)
      .populate('doctorId', 'user specializations')
      .populate('patientId', 'name email');
    
    console.log('🔗 Found consultation:', consultation ? {
      id: consultation._id,
      doctorId: consultation.doctorId?._id,
      patientId: consultation.patientId?._id,
      status: consultation.status
    } : 'Not found');
    
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let authorized = false;
    if (userRole === 'patient' && consultation.patientId._id.toString() === userId.toString()) {
      authorized = true;
      console.log('🔗 Patient authorized');
    } else if (userRole === 'doctor') {
      const Doctor = (await import('../models/Doctor.js')).default;
      const doctor = await Doctor.findOne({ user: userId });
      console.log('🔗 Doctor lookup:', doctor ? { id: doctor._id, user: doctor.user } : 'Not found');
      if (doctor && consultation.doctorId._id.toString() === doctor._id.toString()) {
        authorized = true;
        console.log('🔗 Doctor authorized');
      }
    }
    
    if (!authorized) {
      console.log('❌ Not authorized to join consultation');
      return res.status(403).json({ success: false, message: 'Not authorized to join this consultation' });
    }
    
    console.log('✅ Consultation join successful');
    res.json({ success: true, data: consultation });
  } catch (error) {
    console.error('❌ Error joining consultation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book a consultation (from DoctorBookingController)
router.post('/book', authorize('patient'), bookConsultation);

// Legacy routes (for backward compatibility)
router.post('/', requestConsultation);
router.get('/', getConsultations);
router.get('/:id', getConsultation);
router.put('/:id/cancel-legacy', cancelConsultationLegacy);

export default router;