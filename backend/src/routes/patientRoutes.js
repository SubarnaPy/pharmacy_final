import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import PatientChatMessage from '../models/PatientChatMessage.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   GET /api/v1/patient/symptom-history
 * @desc    Get symptom analysis history for patient
 * @access  Private (Patient only)
 */
router.get('/symptom-history', 
  authenticate, 
  authorize(['patient']), 
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;

      // Get symptom analysis history from chat messages
      const symptomHistory = await PatientChatMessage.find({
        userId: userId,
        messageType: 'symptom_analysis'
      })
      .select('userMessage botResponse urgency timestamp context')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

      // Transform the data for better frontend consumption
      const formattedHistory = symptomHistory.map(entry => ({
        id: entry._id,
        symptoms: entry.userMessage.replace('Symptom analysis: ', ''),
        analysis: entry.botResponse,
        urgency: entry.urgency,
        date: entry.timestamp,
        context: entry.context
      }));

      res.status(200).json({
        success: true,
        data: {
          history: formattedHistory,
          total: symptomHistory.length,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: symptomHistory.length === parseInt(limit)
          }
        },
        message: 'Symptom history retrieved successfully'
      });

    } catch (error) {
      console.error('Error fetching symptom history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch symptom history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

/**
 * @route   POST /api/v1/patient/symptom-entry
 * @desc    Add a new symptom entry/analysis
 * @access  Private (Patient only)
 */
router.post('/symptom-entry',
  authenticate,
  authorize(['patient']),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const { symptoms, additionalInfo = {} } = req.body;

      if (!symptoms || symptoms.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Symptoms description is required'
        });
      }

      // Create a simple symptom entry (can be enhanced with AI analysis later)
      const symptomEntry = new PatientChatMessage({
        userId,
        userMessage: `Manual symptom entry: ${symptoms}`,
        botResponse: {
          symptoms: symptoms,
          timestamp: new Date(),
          additionalInfo: additionalInfo,
          type: 'manual_entry'
        },
        messageType: 'symptom_entry',
        urgency: additionalInfo.urgency || 'medium',
        timestamp: new Date()
      });

      await symptomEntry.save();

      res.status(201).json({
        success: true,
        data: {
          id: symptomEntry._id,
          symptoms: symptoms,
          timestamp: symptomEntry.timestamp
        },
        message: 'Symptom entry recorded successfully'
      });

    } catch (error) {
      console.error('Error creating symptom entry:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record symptom entry',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

/**
 * @route   GET /api/v1/patient/health-summary
 * @desc    Get patient health summary including recent symptoms
 * @access  Private (Patient only)
 */
router.get('/health-summary',
  authenticate,
  authorize(['patient']),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;

      // Get user profile
      const user = await User.findById(userId).select('profile healthHistory');

      // Get recent symptom entries
      const recentSymptoms = await PatientChatMessage.find({
        userId: userId,
        messageType: { $in: ['symptom_analysis', 'symptom_entry'] }
      })
      .select('userMessage botResponse urgency timestamp')
      .sort({ timestamp: -1 })
      .limit(5);

      const healthSummary = {
        profile: {
          age: user.profile?.age,
          gender: user.profile?.gender,
          medicalHistory: user.healthHistory || []
        },
        recentSymptoms: recentSymptoms.map(entry => ({
          id: entry._id,
          symptoms: entry.userMessage.replace(/^(Symptom analysis: |Manual symptom entry: )/, ''),
          urgency: entry.urgency,
          date: entry.timestamp
        })),
        summary: {
          totalSymptomEntries: recentSymptoms.length,
          lastActivity: recentSymptoms.length > 0 ? recentSymptoms[0].timestamp : null
        }
      };

      res.status(200).json({
        success: true,
        data: healthSummary,
        message: 'Health summary retrieved successfully'
      });

    } catch (error) {
      console.error('Error fetching health summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch health summary',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

export default router;