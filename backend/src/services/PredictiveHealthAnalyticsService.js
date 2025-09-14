import HealthAnalytics from '../models/HealthAnalytics.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Predictive Health Analytics Service
 * AI-powered health insights, medication adherence prediction, and risk stratification
 */
class PredictiveHealthAnalyticsService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeMLModels();
  }

  initializeMLModels() {
    // Initialize ML model configurations
    this.models = {
      adherencePredictor: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      },
      riskAssessment: {
        name: "gemini-2.0-flash-exp", 
        config: {
          temperature: 0.2,
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 6144,
          responseMimeType: "application/json"
        }
      },
      healthInsights: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.4,
          topK: 50,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      }
    };

    console.log('✅ Predictive Health Analytics Service initialized');
  }

  /**
   * Generate comprehensive health analytics for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Health analytics results
   */
  async generateHealthAnalytics(patientId, options = {}) {
    try {
      console.log(`🔍 Starting health analytics for patient: ${patientId}`);

      // Get patient data
      const patient = await User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get prescription history
      const prescriptions = await Prescription.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(50);

      // Get existing analytics or create new
      let analytics = await HealthAnalytics.findOne({ patient: patientId });
      if (!analytics) {
        analytics = new HealthAnalytics({ patient: patientId });
      }

      // Generate different types of analytics
      const results = await Promise.all([
        this.analyzeAdherencePatterns(patient, prescriptions),
        this.assessHealthRisks(patient, prescriptions),
        this.generateHealthInsights(patient, prescriptions),
        this.predictFutureHealthTrends(patient, prescriptions)
      ]);

      const [adherenceAnalysis, riskAssessment, healthInsights, futureTrends] = results;

      // Update analytics object
      analytics.medicationAdherence = adherenceAnalysis.medicationAdherence || [];
      analytics.healthRisks = riskAssessment.healthRisks || [];
      analytics.healthInsights = healthInsights.insights || [];
      analytics.trendsAnalysis = futureTrends.trends || {};
      analytics.lastAnalysisDate = new Date();
      analytics.nextAnalysisDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      analytics.aiProcessingStatus = 'completed';

      // Calculate overall health score
      analytics.calculateOverallHealthScore();

      await analytics.save();

      console.log('✅ Health analytics completed successfully');
      return {
        patientId,
        analytics,
        summary: {
          overallHealthScore: analytics.overallHealthScore,
          totalRisks: analytics.healthRisks.length,
          criticalRisks: analytics.criticalAlerts.length,
          adherenceSummary: analytics.adherenceSummary
        }
      };

    } catch (error) {
      console.error('❌ Health analytics failed:', error);
      throw error;
    }
  }

  /**
   * Analyze medication adherence patterns using AI
   */
  async analyzeAdherencePatterns(patient, prescriptions) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.adherencePredictor.name,
        generationConfig: this.models.adherencePredictor.config
      });

      const prompt = `
Analyze medication adherence patterns for this patient:

**Patient Profile:**
- Age: ${patient.age || 'Unknown'}
- Medical Conditions: ${patient.medicalHistory?.conditions?.join(', ') || 'None specified'}
- Prescription Count: ${prescriptions.length}

**Recent Prescriptions:**
${prescriptions.slice(0, 10).map(p => `
- ${p.medications?.[0]?.name || 'Unknown'}: ${p.medications?.[0]?.dosage || 'N/A'} ${p.medications?.[0]?.frequency || 'N/A'}
  Status: ${p.status}
  Date: ${p.createdAt}
`).join('')}

**Analysis Requirements:**
1. Predict adherence score (0-100) for each medication
2. Identify risk factors for non-adherence
3. Suggest interventions to improve adherence
4. Predict future adherence patterns

Return JSON with this structure:
{
  "medicationAdherence": [
    {
      "medicationName": "string",
      "adherenceScore": number,
      "missedDoses": number,
      "totalPrescribedDoses": number,
      "predictedAdherence": {
        "nextWeek": number,
        "nextMonth": number,
        "factors": ["string"]
      },
      "riskFactors": ["string"],
      "interventions": ["string"]
    }
  ],
  "overallAdherenceScore": number,
  "adherenceCategory": "excellent|good|fair|poor",
  "keyInsights": ["string"]
}`;

      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());
      
      return analysis;

    } catch (error) {
      console.error('❌ Adherence analysis failed:', error);
      return { medicationAdherence: [] };
    }
  }

  /**
   * Assess health risks using AI-powered analysis
   */
  async assessHealthRisks(patient, prescriptions) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.riskAssessment.name,
        generationConfig: this.models.riskAssessment.config
      });

      const prompt = `
Perform comprehensive health risk assessment:

**Patient Data:**
- Age: ${patient.age || 'Unknown'}
- Gender: ${patient.gender || 'Unknown'}
- Medical History: ${JSON.stringify(patient.medicalHistory || {})}
- Allergies: ${patient.allergies?.join(', ') || 'None'}
- Current Medications: ${prescriptions.slice(0, 5).map(p => 
  p.medications?.map(m => `${m.name} ${m.dosage}`).join(', ')
).join('; ')}

**Risk Assessment Areas:**
1. Cardiovascular risk
2. Diabetes complications
3. Drug interactions
4. Mental health risks
5. Polypharmacy risks
6. Age-related risks

Return JSON:
{
  "healthRisks": [
    {
      "riskCategory": "cardiovascular|diabetes|hypertension|mental_health|drug_interaction|side_effects",
      "riskLevel": "very_low|low|moderate|high|very_high",
      "riskScore": number,
      "contributingFactors": [
        {
          "factor": "string",
          "weight": number,
          "description": "string"
        }
      ],
      "mitigationStrategies": ["string"],
      "monitoringParameters": [
        {
          "parameter": "string",
          "currentValue": "string",
          "targetValue": "string",
          "frequency": "string"
        }
      ]
    }
  ],
  "overallRiskLevel": "low|moderate|high|critical",
  "priorityActions": ["string"],
  "recommendedFollowUp": "string"
}`;

      const result = await model.generateContent(prompt);
      const assessment = JSON.parse(result.response.text());
      
      return assessment;

    } catch (error) {
      console.error('❌ Risk assessment failed:', error);
      return { healthRisks: [] };
    }
  }

  /**
   * Generate personalized health insights
   */
  async generateHealthInsights(patient, prescriptions) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.healthInsights.name,
        generationConfig: this.models.healthInsights.config
      });

      const prompt = `
Generate personalized health insights and recommendations:

**Patient Profile:**
- Demographics: Age ${patient.age || 'Unknown'}, ${patient.gender || 'Unknown'}
- Health Status: ${JSON.stringify(patient.medicalHistory || {})}
- Medication History: ${prescriptions.length} prescriptions
- Latest Medications: ${prescriptions.slice(0, 3).map(p => 
  p.medications?.map(m => m.name).join(', ')
).join('; ')}

**Generate Insights For:**
1. Risk predictions with preventive measures
2. Adherence improvement strategies
3. Health trends analysis
4. Preventive care recommendations
5. Lifestyle modifications
6. Medication optimization opportunities

Return JSON:
{
  "insights": [
    {
      "type": "risk_prediction|adherence_insight|health_trend|preventive_care",
      "severity": "low|moderate|high|critical",
      "prediction": "string",
      "confidence": number,
      "recommendedActions": [
        {
          "action": "string",
          "priority": "low|medium|high|urgent",
          "timeframe": "string"
        }
      ],
      "dataPoints": [
        {
          "source": "string",
          "value": "string|number",
          "timestamp": "string"
        }
      ]
    }
  ],
  "preventiveCare": {
    "screeningRecommendations": ["string"],
    "lifestyleModifications": ["string"],
    "monitoringSchedule": ["string"]
  },
  "personalizedTips": ["string"]
}`;

      const result = await model.generateContent(prompt);
      const insights = JSON.parse(result.response.text());
      
      return insights;

    } catch (error) {
      console.error('❌ Health insights generation failed:', error);
      return { insights: [] };
    }
  }

  /**
   * Predict future health trends
   */
  async predictFutureHealthTrends(patient, prescriptions) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.healthInsights.name,
        generationConfig: this.models.healthInsights.config
      });

      const prompt = `
Predict future health trends and trajectories:

**Historical Data:**
- Patient Age: ${patient.age || 'Unknown'}
- Prescription Trend: ${prescriptions.length} total prescriptions
- Recent Pattern: ${prescriptions.slice(0, 5).map(p => 
  `${p.createdAt} - ${p.medications?.length || 0} medications`
).join('; ')}

**Prediction Timeline:**
- Next 3 months
- Next 6 months  
- Next 1 year

Return JSON:
{
  "trends": {
    "improvingMetrics": ["string"],
    "decliningMetrics": ["string"], 
    "stableMetrics": ["string"]
  },
  "predictions": {
    "3months": {
      "healthScore": number,
      "riskFactors": ["string"],
      "recommendedActions": ["string"]
    },
    "6months": {
      "healthScore": number,
      "riskFactors": ["string"],
      "recommendedActions": ["string"]
    },
    "1year": {
      "healthScore": number,
      "riskFactors": ["string"],
      "recommendedActions": ["string"]
    }
  },
  "earlyWarningSignals": ["string"],
  "preventiveOpportunities": ["string"]
}`;

      const result = await model.generateContent(prompt);
      const trends = JSON.parse(result.response.text());
      
      return trends;

    } catch (error) {
      console.error('❌ Trend prediction failed:', error);
      return { trends: {} };
    }
  }

  /**
   * Get patients requiring immediate attention
   */
  async getPatientsNeedingAttention(limit = 10) {
    try {
      return await HealthAnalytics.getPatientsNeedingAttention()
        .limit(limit)
        .sort({ overallHealthScore: 1 });
    } catch (error) {
      console.error('❌ Failed to get patients needing attention:', error);
      return [];
    }
  }

  /**
   * Generate daily health analytics report
   */
  async generateDailyHealthReport() {
    try {
      const criticalPatients = await this.getPatientsNeedingAttention(20);
      const totalPatients = await HealthAnalytics.countDocuments();
      
      const riskDistribution = await HealthAnalytics.aggregate([
        { $unwind: '$healthRisks' },
        { $group: { _id: '$healthRisks.riskLevel', count: { $sum: 1 } } }
      ]);

      const adherenceStats = await HealthAnalytics.aggregate([
        { $unwind: '$medicationAdherence' },
        { $group: { 
          _id: null, 
          avgAdherence: { $avg: '$medicationAdherence.adherenceScore' },
          poorAdherence: { $sum: { $cond: [{ $lt: ['$medicationAdherence.adherenceScore', 70] }, 1, 0] } }
        }}
      ]);

      return {
        reportDate: new Date(),
        summary: {
          totalPatients,
          criticalPatients: criticalPatients.length,
          riskDistribution,
          adherenceStats: adherenceStats[0] || {}
        },
        criticalPatients,
        recommendations: [
          'Review patients with health scores below 60',
          'Follow up on medication adherence < 70%',
          'Monitor high-risk patients daily'
        ]
      };

    } catch (error) {
      console.error('❌ Daily report generation failed:', error);
      throw error;
    }
  }
}

export default PredictiveHealthAnalyticsService;