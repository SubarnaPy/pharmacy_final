import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';

// Controller to fetch quick stats
export const getQuickStats = async (req, res) => {
  try {
    const activePrescriptions = await Prescription.countDocuments({ user: req.user.id, status: 'active' });
    const pendingRefills = await Prescription.countDocuments({ user: req.user.id, status: 'pending_refill' });
    // TODO: Replace placeholder values with real queries if needed
    // Example: Count unique pharmacies from prescription requests
    const pharmacyRequests = await PrescriptionRequest.find({ patient: req.user.id });
    const nearbyPharmacies = pharmacyRequests.length > 0 ? new Set(pharmacyRequests.map(r => r.selectedPharmacy?.pharmacyId)).size : 0;
    // Example: Count unread messages (to be implemented with chat schema)
    const unreadMessages = 0; // Placeholder, update after chat schema

    res.status(200).json({
      success: true,
      data: { activePrescriptions, pendingRefills, nearbyPharmacies, unreadMessages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch quick stats', error: error.message });
  }
};

// Controller to fetch recent prescriptions
export const getRecentPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Also fetch recent prescription requests with medication details
    const prescriptionRequests = await PrescriptionRequest.find({ patient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('medications status createdAt pharmacyResponses preferences');

    res.status(200).json({
      success: true,
      data: { prescriptions, prescriptionRequests },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch recent prescriptions', error: error.message });
  }
};

// Controller to fetch upcoming appointments
export const getUpcomingAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user.id, date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming appointments', error: error.message });
  }
};
