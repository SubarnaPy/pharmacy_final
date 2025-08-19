import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import VideoCall from '../models/VideoCall.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Get call history for authenticated user
 */
router.get('/calls', authenticate, async (req, res) => {
  try {
    const { limit = 20, skip = 0, status, startDate, endDate } = req.query;
    const userId = req.user.id;

    // Build query
    const query = {
      $or: [
        { 'participants.patient': userId },
        { 'participants.pharmacist': userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const calls = await VideoCall.find(query)
      .populate('participants.patient', 'name email avatar')
      .populate('participants.pharmacist', 'name email avatar')
      .populate('prescriptionId', 'medications status')
      .populate('pharmacyId', 'name address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          total: await VideoCall.countDocuments(query)
        }
      }
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call history',
      error: error.message
    });
  }
});

/**
 * Get specific call details
 */
router.get('/calls/:callId', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await VideoCall.findOne({ 
      callId,
      $or: [
        { 'participants.patient': userId },
        { 'participants.pharmacist': userId }
      ]
    })
    .populate('participants.patient', 'name email avatar role')
    .populate('participants.pharmacist', 'name email avatar role')
    .populate('prescriptionId')
    .populate('pharmacyId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or access denied'
      });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    console.error('Get call details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call details',
      error: error.message
    });
  }
});

/**
 * Initiate a new video call
 */
router.post('/calls/initiate', authenticate, async (req, res) => {
  try {
    const { participantId, type, prescriptionId, pharmacyId } = req.body;
    const initiatorId = req.user.id;

    // Validate required fields
    if (!participantId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID and call type are required'
      });
    }

    // Validate call type
    if (!['consultation', 'prescription_review'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid call type'
      });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Determine participants based on user roles
    let participants;
    if (req.user.role === 'patient') {
      participants = {
        patient: initiatorId,
        pharmacist: participantId
      };
    } else if (req.user.role === 'pharmacist') {
      participants = {
        patient: participantId,
        pharmacist: initiatorId
      };
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role for video calls'
      });
    }

    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create video call record
    const videoCall = new VideoCall({
      callId,
      type,
      participants,
      prescriptionId: prescriptionId || null,
      pharmacyId: pharmacyId || null,
      status: 'initiated',
      metadata: {
        audioEnabled: true,
        videoEnabled: true,
        screenShared: false
      }
    });

    await videoCall.save();

    // Populate participant details for response
    await videoCall.populate('participants.patient', 'name email avatar role');
    await videoCall.populate('participants.pharmacist', 'name email avatar role');

    res.status(201).json({
      success: true,
      data: {
        callId,
        call: videoCall
      },
      message: 'Video call initiated successfully'
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate video call',
      error: error.message
    });
  }
});

/**
 * End a video call
 */
router.post('/calls/:callId/end', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const { endReason } = req.body;
    const userId = req.user.id;

    const call = await VideoCall.findOne({ 
      callId,
      $or: [
        { 'participants.patient': userId },
        { 'participants.pharmacist': userId }
      ]
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or access denied'
      });
    }

    if (call.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Call is already ended'
      });
    }

    // Calculate duration if call was connected
    let duration = 0;
    if (call.startTime) {
      duration = Date.now() - call.startTime.getTime();
    }

    // Update call record
    call.status = 'ended';
    call.endTime = new Date();
    call.duration = duration;
    call.metadata.endReason = endReason || 'user_ended';

    await call.save();

    res.json({
      success: true,
      data: {
        callId,
        duration,
        endTime: call.endTime
      },
      message: 'Call ended successfully'
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end call',
      error: error.message
    });
  }
});

/**
 * Get call recordings for authenticated user
 */
router.get('/recordings', authenticate, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    // Return empty recordings for now since CallRecordingService might not be available
    res.json({
      success: true,
      data: {
        recordings: [],
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      }
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings',
      error: error.message
    });
  }
});

/**
 * Update call metadata (for tracking call events)
 */
router.patch('/calls/:callId/metadata', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const { audioEnabled, videoEnabled, screenShared, callQuality } = req.body;
    const userId = req.user.id;

    const call = await VideoCall.findOne({ 
      callId,
      $or: [
        { 'participants.patient': userId },
        { 'participants.pharmacist': userId }
      ]
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or access denied'
      });
    }

    // Update metadata
    if (typeof audioEnabled === 'boolean') {
      call.metadata.audioEnabled = audioEnabled;
    }
    if (typeof videoEnabled === 'boolean') {
      call.metadata.videoEnabled = videoEnabled;
    }
    if (typeof screenShared === 'boolean') {
      call.metadata.screenShared = screenShared;
    }
    if (callQuality) {
      call.metadata.callQuality = callQuality;
    }

    await call.save();

    res.json({
      success: true,
      data: call.metadata,
      message: 'Call metadata updated successfully'
    });
  } catch (error) {
    console.error('Update call metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call metadata',
      error: error.message
    });
  }
});

/**
 * Get WebRTC service statistics (admin only)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get call statistics from database
    const callStats = await VideoCall.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const totalCalls = await VideoCall.countDocuments();
    const callsToday = await VideoCall.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    res.json({
      success: true,
      data: {
        recordings: { total: 0, active: 0, completed: 0 },
        calls: {
          total: totalCalls,
          today: callsToday,
          byStatus: callStats
        }
      }
    });
  } catch (error) {
    console.error('Get WebRTC stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

export default router;