import PredictiveHealthAnalyticsService from '../services/PredictiveHealthAnalyticsService.js';
import HealthAnalytics from '../models/HealthAnalytics.js';

/**
 * Health Analytics Controller
 * Handles predictive health analytics, medication adherence, and risk assessment
 */
class HealthAnalyticsController {
  constructor() {
    this.analyticsService = new PredictiveHealthAnalyticsService();
  }

  /**
   * Generate comprehensive health analytics for a patient
   */
  async generatePatientAnalytics(req, res) {
    try {
      const { patientId } = req.params;
      const options = req.body || {};

      console.log(`📊 Generating health analytics for patient: ${patientId}`);

      const analytics = await this.analyticsService.generateHealthAnalytics(patientId, options);

      res.status(200).json({
        success: true,
        message: 'Health analytics generated successfully',
        data: analytics
      });

    } catch (error) {
      console.error('❌ Generate analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate health analytics',
        error: error.message
      });
    }
  }

  /**
   * Get patient health analytics dashboard
   */
  async getPatientDashboard(req, res) {
    try {
      const { patientId } = req.params;

      console.log(`📈 Getting health dashboard for patient: ${patientId}`);

      const analytics = await HealthAnalytics.findOne({ patient: patientId })
        .populate('patient', 'name email age gender')
        .lean();

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'No health analytics found for this patient'
        });
      }

      // Calculate dashboard metrics
      const dashboard = {
        overallHealth: {
          score: analytics.overallHealthScore,
          status: this.getHealthStatus(analytics.overallHealthScore),
          lastUpdated: analytics.lastAnalysisDate
        },
        riskSummary: {
          totalRisks: analytics.healthRisks.length,
          highRisks: analytics.healthRisks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'very_high').length,
          categories: analytics.healthRisks.reduce((acc, risk) => {
            acc[risk.riskCategory] = (acc[risk.riskCategory] || 0) + 1;
            return acc;
          }, {})
        },
        adherenceMetrics: analytics.adherenceSummary,
        recentInsights: analytics.healthInsights.slice(0, 5),
        upcomingActions: this.extractUpcomingActions(analytics),
        trendsAnalysis: analytics.trendsAnalysis
      };

      res.status(200).json({
        success: true,
        data: {
          patient: analytics.patient,
          dashboard,
          analytics
        }
      });

    } catch (error) {
      console.error('❌ Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient dashboard',
        error: error.message
      });
    }
  }

  /**
   * Get patients needing immediate attention
   */
  async getPatientsNeedingAttention(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const riskLevel = req.query.riskLevel;

      console.log('🚨 Getting patients needing attention');

      let query = {};
      if (riskLevel) {
        query['healthRisks.riskLevel'] = riskLevel;
      }

      const patients = await HealthAnalytics.find({
        $or: [
          { 'healthRisks.riskLevel': { $in: ['high', 'very_high'] } },
          { 'medicationAdherence.adherenceScore': { $lt: 70 } },
          { overallHealthScore: { $lt: 60 } },
          ...Object.keys(query).length ? [query] : []
        ]
      })
      .populate('patient', 'name email phone age gender')
      .sort({ overallHealthScore: 1 })
      .limit(limit);

      const prioritizedPatients = patients.map(p => ({
        patient: p.patient,
        healthScore: p.overallHealthScore,
        criticalRisks: p.healthRisks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'very_high'),
        poorAdherence: p.medicationAdherence.filter(m => m.adherenceScore < 70),
        urgentActions: p.healthInsights.filter(i => i.severity === 'critical' || i.severity === 'high'),
        lastAnalysis: p.lastAnalysisDate,
        priority: this.calculatePriority(p)
      }));

      res.status(200).json({
        success: true,
        data: {
          totalPatients: patients.length,
          patients: prioritizedPatients,
          summary: {
            critical: prioritizedPatients.filter(p => p.priority === 'critical').length,
            high: prioritizedPatients.filter(p => p.priority === 'high').length,
            medium: prioritizedPatients.filter(p => p.priority === 'medium').length
          }
        }
      });

    } catch (error) {
      console.error('❌ Get attention patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patients needing attention',
        error: error.message
      });
    }
  }

  /**
   * Get medication adherence analytics
   */
  async getMedicationAdherenceAnalytics(req, res) {
    try {
      const { patientId } = req.params;
      const { timeframe = '30d' } = req.query;

      console.log(`💊 Getting adherence analytics for patient: ${patientId}`);

      const analytics = await HealthAnalytics.findOne({ patient: patientId });
      
      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'No analytics found for this patient'
        });
      }

      const adherenceData = {
        summary: analytics.adherenceSummary,
        medications: analytics.medicationAdherence.map(med => ({
          medication: med.medication,
          adherenceScore: med.adherenceScore,
          missedDoses: med.missedDoses,
          totalDoses: med.totalPrescribedDoses,
          adherenceRate: ((med.totalPrescribedDoses - med.missedDoses) / med.totalPrescribedDoses * 100).toFixed(1),
          predictedAdherence: med.predictedAdherence,
          pattern: med.adherencePattern?.slice(-30) // Last 30 days
        })),
        insights: analytics.healthInsights.filter(insight => insight.type === 'adherence_insight'),
        recommendations: this.generateAdherenceRecommendations(analytics.medicationAdherence)
      };

      res.status(200).json({
        success: true,
        data: adherenceData
      });

    } catch (error) {
      console.error('❌ Get adherence analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get medication adherence analytics',
        error: error.message
      });
    }
  }

  /**
   * Get health risk assessment
   */
  async getHealthRiskAssessment(req, res) {
    try {
      const { patientId } = req.params;

      console.log(`⚠️ Getting risk assessment for patient: ${patientId}`);

      const analytics = await HealthAnalytics.findOne({ patient: patientId })
        .populate('patient', 'name age gender medicalHistory');

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'No risk assessment found for this patient'
        });
      }

      const riskAssessment = {
        overallRiskLevel: this.calculateOverallRiskLevel(analytics.healthRisks),
        riskCategories: analytics.healthRisks.reduce((acc, risk) => {
          if (!acc[risk.riskCategory]) {
            acc[risk.riskCategory] = [];
          }
          acc[risk.riskCategory].push(risk);
          return acc;
        }, {}),
        priorityRisks: analytics.healthRisks
          .filter(risk => risk.riskLevel === 'high' || risk.riskLevel === 'very_high')
          .sort((a, b) => b.riskScore - a.riskScore),
        mitigationPlan: this.createMitigationPlan(analytics.healthRisks),
        monitoringSchedule: this.createMonitoringSchedule(analytics.healthRisks)
      };

      res.status(200).json({
        success: true,
        data: {
          patient: analytics.patient,
          riskAssessment,
          lastAssessment: analytics.lastAnalysisDate,
          nextAssessment: analytics.nextAnalysisDate
        }
      });

    } catch (error) {
      console.error('❌ Get risk assessment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get health risk assessment',
        error: error.message
      });
    }
  }

  /**
   * Generate daily health report
   */
  async generateDailyHealthReport(req, res) {
    try {
      console.log('📋 Generating daily health report');

      const report = await this.analyticsService.generateDailyHealthReport();

      res.status(200).json({
        success: true,
        message: 'Daily health report generated successfully',
        data: report
      });

    } catch (error) {
      console.error('❌ Generate daily report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily health report',
        error: error.message
      });
    }
  }

  /**
   * Update patient health analytics
   */
  async updatePatientAnalytics(req, res) {
    try {
      const { patientId } = req.params;
      const updateData = req.body;

      console.log(`🔄 Updating health analytics for patient: ${patientId}`);

      const analytics = await HealthAnalytics.findOneAndUpdate(
        { patient: patientId },
        { 
          ...updateData,
          lastAnalysisDate: new Date(),
          aiProcessingStatus: 'completed'
        },
        { new: true, upsert: true }
      );

      // Recalculate overall health score
      analytics.calculateOverallHealthScore();
      await analytics.save();

      res.status(200).json({
        success: true,
        message: 'Health analytics updated successfully',
        data: analytics
      });

    } catch (error) {
      console.error('❌ Update analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update health analytics',
        error: error.message
      });
    }
  }

  // Helper methods
  getHealthStatus(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  extractUpcomingActions(analytics) {
    const actions = [];
    
    analytics.healthInsights.forEach(insight => {
      insight.recommendedActions?.forEach(action => {
        if (action.priority === 'high' || action.priority === 'urgent') {
          actions.push({
            action: action.action,
            priority: action.priority,
            timeframe: action.timeframe,
            type: insight.type
          });
        }
      });
    });

    return actions.slice(0, 5); // Top 5 actions
  }

  calculatePriority(analytics) {
    if (analytics.overallHealthScore < 50) return 'critical';
    if (analytics.healthRisks.some(r => r.riskLevel === 'very_high')) return 'critical';
    if (analytics.overallHealthScore < 70) return 'high';
    if (analytics.healthRisks.some(r => r.riskLevel === 'high')) return 'high';
    return 'medium';
  }

  calculateOverallRiskLevel(healthRisks) {
    if (healthRisks.some(r => r.riskLevel === 'very_high')) return 'very_high';
    if (healthRisks.some(r => r.riskLevel === 'high')) return 'high';
    if (healthRisks.some(r => r.riskLevel === 'moderate')) return 'moderate';
    return 'low';
  }

  generateAdherenceRecommendations(medicationAdherence) {
    const recommendations = [];
    
    medicationAdherence.forEach(med => {
      if (med.adherenceScore < 70) {
        recommendations.push({
          medication: med.medication,
          issue: 'Poor adherence',
          recommendation: 'Consider medication reminders, pill organizers, or discussing barriers with patient',
          priority: med.adherenceScore < 50 ? 'high' : 'medium'
        });
      }
    });

    return recommendations;
  }

  createMitigationPlan(healthRisks) {
    return healthRisks
      .filter(risk => risk.riskLevel === 'high' || risk.riskLevel === 'very_high')
      .map(risk => ({
        riskCategory: risk.riskCategory,
        strategies: risk.mitigationStrategies,
        timeline: '1-3 months',
        priority: risk.riskLevel === 'very_high' ? 'urgent' : 'high'
      }));
  }

  createMonitoringSchedule(healthRisks) {
    const schedule = [];
    
    healthRisks.forEach(risk => {
      risk.monitoringParameters?.forEach(param => {
        schedule.push({
          parameter: param.parameter,
          frequency: param.frequency,
          currentValue: param.currentValue,
          targetValue: param.targetValue,
          riskCategory: risk.riskCategory
        });
      });
    });

    return schedule;
  }
}

export default HealthAnalyticsController;