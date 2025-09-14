import express from 'express';
import HealthAnalyticsController from '../controllers/HealthAnalyticsController.js';
import { auth } from '../middleware/auth.js';
import { roleValidation } from '../middleware/roleValidation.js';

const router = express.Router();
const healthAnalyticsController = new HealthAnalyticsController();

/**
 * Health Analytics Routes
 * All routes require authentication
 */

// Generate health analytics for a patient
router.post('/generate/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    await healthAnalyticsController.generatePatientAnalytics(req, res);
  }
);

// Get patient health dashboard
router.get('/dashboard/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    await healthAnalyticsController.getPatientDashboard(req, res);
  }
);

// Get patients needing immediate attention (admin/doctor only)
router.get('/attention', 
  auth, 
  roleValidation(['admin', 'doctor']),
  async (req, res) => {
    await healthAnalyticsController.getPatientsNeedingAttention(req, res);
  }
);

// Get medication adherence analytics
router.get('/adherence/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    await healthAnalyticsController.getMedicationAdherenceAnalytics(req, res);
  }
);

// Get health risk assessment
router.get('/risk-assessment/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    await healthAnalyticsController.getHealthRiskAssessment(req, res);
  }
);

// Generate daily health report (admin/doctor only)
router.get('/daily-report', 
  auth, 
  roleValidation(['admin', 'doctor']),
  async (req, res) => {
    await healthAnalyticsController.generateDailyHealthReport(req, res);
  }
);

// Update patient health analytics
router.put('/update/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor']),
  async (req, res) => {
    await healthAnalyticsController.updatePatientAnalytics(req, res);
  }
);

// Get health analytics history
router.get('/history/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const analytics = await HealthAnalytics.findOne({ patient: patientId })
        .populate('patient', 'name email');

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'No analytics history found'
        });
      }

      const history = {
        healthInsights: analytics.healthInsights.slice(offset, offset + limit),
        riskHistory: analytics.healthRisks,
        adherenceHistory: analytics.medicationAdherence,
        trendsData: analytics.trendsAnalysis
      };

      res.status(200).json({
        success: true,
        data: history
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics history',
        error: error.message
      });
    }
  }
);

// Get health score trends
router.get('/trends/:patientId', 
  auth, 
  roleValidation(['admin', 'doctor', 'patient']),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { period = '30d' } = req.query;

      // This would typically query historical data
      // For now, return current trends analysis
      const analytics = await HealthAnalytics.findOne({ patient: patientId });

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'No trends data found'
        });
      }

      const trends = {
        currentScore: analytics.overallHealthScore,
        trendsAnalysis: analytics.trendsAnalysis,
        period,
        lastUpdated: analytics.lastAnalysisDate,
        improvementAreas: analytics.trendsAnalysis.improvingMetrics || [],
        concernAreas: analytics.trendsAnalysis.decliningMetrics || []
      };

      res.status(200).json({
        success: true,
        data: trends
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get health trends',
        error: error.message
      });
    }
  }
);

// Bulk generate analytics for multiple patients (admin only)
router.post('/bulk-generate', 
  auth, 
  roleValidation(['admin']),
  async (req, res) => {
    try {
      const { patientIds } = req.body;

      if (!patientIds || !Array.isArray(patientIds)) {
        return res.status(400).json({
          success: false,
          message: 'Patient IDs array is required'
        });
      }

      console.log(`🔄 Bulk generating analytics for ${patientIds.length} patients`);

      const results = [];
      const errors = [];

      for (const patientId of patientIds) {
        try {
          const analytics = await healthAnalyticsController.analyticsService.generateHealthAnalytics(patientId);
          results.push({
            patientId,
            success: true,
            healthScore: analytics.analytics.overallHealthScore
          });
        } catch (error) {
          errors.push({
            patientId,
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk analytics generated: ${results.length} successful, ${errors.length} failed`,
        data: {
          successful: results,
          failed: errors,
          summary: {
            totalProcessed: patientIds.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bulk analytics generation failed',
        error: error.message
      });
    }
  }
);

export default router;