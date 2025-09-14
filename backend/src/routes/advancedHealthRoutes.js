import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateRoles } from '../middleware/roleValidation.js';

// Import Services
import PredictiveHealthAnalyticsService from '../services/PredictiveHealthAnalyticsService.js';
import VoiceToPrescriptionService from '../services/VoiceToPrescriptionService.js';
import ARPillIdentificationService from '../services/ARPillIdentificationService.js';
import SmartSymptomCheckerService from '../services/SmartSymptomCheckerService.js';
import AIDrugDiscoveryService from '../services/AIDrugDiscoveryService.js';
import { GamifiedHealthService } from '../services/GamifiedHealthService.js';
import EmergencyPrescriptionService from '../services/EmergencyPrescriptionService.js';
import { MentalHealthIntegrationService } from '../services/MentalHealthIntegrationService.js';

const router = express.Router();

// Initialize services
const healthAnalytics = new PredictiveHealthAnalyticsService();
const voiceService = new VoiceToPrescriptionService();
const arPillService = new ARPillIdentificationService();
const symptomChecker = new SmartSymptomCheckerService();
const drugDiscovery = new AIDrugDiscoveryService();
const gamification = new GamifiedHealthService();
const emergencyService = new EmergencyPrescriptionService();
const mentalHealthService = new MentalHealthIntegrationService();

/**
 * PREDICTIVE HEALTH ANALYTICS ROUTES
 */
router.post('/health-analytics/generate/:patientId', authenticate, validateRoles(['admin', 'doctor', 'patient']), async (req, res) => {
  try {
    const { patientId } = req.params;
    const options = req.body || {};
    
    const analytics = await healthAnalytics.generateHealthAnalytics(patientId, options);
    
    res.status(200).json({
      success: true,
      message: 'Health analytics generated successfully',
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health analytics generation failed',
      error: error.message
    });
  }
});

router.get('/health-analytics/dashboard/:patientId', authenticate, validateRoles(['admin', 'doctor', 'patient']), async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const dashboard = await healthAnalytics.getPatientDashboard(patientId);
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get health dashboard',
      error: error.message
    });
  }
});

/**
 * VOICE-TO-PRESCRIPTION ROUTES
 */
router.post('/voice/process-prescription', authenticate, validateRoles(['doctor', 'admin']), async (req, res) => {
  try {
    const { voiceText, doctorProfile, options } = req.body;
    
    const result = await voiceService.processVoiceToPrescription(voiceText, doctorProfile, options);
    
    res.status(200).json({
      success: true,
      message: 'Voice prescription processed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Voice prescription processing failed',
      error: error.message
    });
  }
});

router.post('/voice/process-realtime', authenticate, validateRoles(['doctor', 'admin']), async (req, res) => {
  try {
    const { voiceChunks, doctorProfile, options } = req.body;
    
    const result = await voiceService.processRealTimeVoice(voiceChunks, doctorProfile, options);
    
    res.status(200).json({
      success: true,
      message: 'Real-time voice processing completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Real-time voice processing failed',
      error: error.message
    });
  }
});

router.get('/voice/templates', authenticate, validateRoles(['doctor', 'admin']), (req, res) => {
  try {
    const templates = voiceService.generateDictationTemplates();
    
    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get voice templates',
      error: error.message
    });
  }
});

/**
 * AR PILL IDENTIFICATION ROUTES
 */
router.post('/ar-pills/identify', authenticate, async (req, res) => {
  try {
    const { imageData, options } = req.body;
    
    const result = await arPillService.identifyPillsFromImage(imageData, options);
    
    res.status(200).json({
      success: true,
      message: 'Pill identification completed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Pill identification failed',
      error: error.message
    });
  }
});

router.post('/ar-pills/realtime-scan', authenticate, async (req, res) => {
  try {
    const { imageStream, options } = req.body;
    
    const result = await arPillService.processRealTimePillScanning(imageStream, options);
    
    res.status(200).json({
      success: true,
      message: 'Real-time pill scanning completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Real-time pill scanning failed',
      error: error.message
    });
  }
});

/**
 * SMART SYMPTOM CHECKER ROUTES
 */
router.post('/symptoms/analyze', authenticate, async (req, res) => {
  try {
    const { symptomData, patientProfile, options } = req.body;
    
    const analysis = await symptomChecker.analyzeSymptoms(symptomData, patientProfile, options);
    
    res.status(200).json({
      success: true,
      message: 'Symptom analysis completed successfully',
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Symptom analysis failed',
      error: error.message
    });
  }
});

router.post('/symptoms/track-outcome', authenticate, async (req, res) => {
  try {
    const { analysisId, prescriptionData, outcomeData } = req.body;
    
    const result = await symptomChecker.trackPrescriptionOutcome(analysisId, prescriptionData, outcomeData);
    
    res.status(200).json({
      success: true,
      message: 'Outcome tracking completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Outcome tracking failed',
      error: error.message
    });
  }
});

/**
 * AI DRUG DISCOVERY ROUTES
 */
router.post('/drug-discovery/alternatives', authenticate, async (req, res) => {
  try {
    const { currentMedication, patientProfile, options } = req.body;
    
    const alternatives = await drugDiscovery.findAlternativeMedications(currentMedication, patientProfile, options);
    
    res.status(200).json({
      success: true,
      message: 'Alternative medications found',
      data: alternatives
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Alternative medication search failed',
      error: error.message
    });
  }
});

router.post('/drug-discovery/personalized', authenticate, async (req, res) => {
  try {
    const { patientProfile, treatmentGoals } = req.body;
    
    const recommendations = await drugDiscovery.getPersonalizedMedicineRecommendations(patientProfile, treatmentGoals);
    
    res.status(200).json({
      success: true,
      message: 'Personalized medicine recommendations generated',
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Personalized recommendations failed',
      error: error.message
    });
  }
});

router.post('/drug-discovery/clinical-trials', authenticate, async (req, res) => {
  try {
    const { patientProfile, condition } = req.body;
    
    const trials = await drugDiscovery.findClinicalTrials(patientProfile, condition);
    
    res.status(200).json({
      success: true,
      message: 'Clinical trials found',
      data: trials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Clinical trial search failed',
      error: error.message
    });
  }
});

/**
 * GAMIFIED HEALTH MANAGEMENT ROUTES
 */
router.post('/gamification/medication-taken', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { medicationData } = req.body;
    
    const result = await gamification.recordMedicationTaken(userId, medicationData);
    
    res.status(200).json({
      success: true,
      message: 'Medication recorded and points awarded',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record medication',
      error: error.message
    });
  }
});

router.get('/gamification/leaderboard', authenticate, async (req, res) => {
  try {
    const { timeframe, limit } = req.query;
    
    const leaderboard = await gamification.getLeaderboard(timeframe, parseInt(limit) || 10);
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
      error: error.message
    });
  }
});

router.get('/gamification/challenges/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { healthData } = req.query;
    
    const challenges = await gamification.generatePersonalizedChallenges(userId, healthData);
    
    res.status(200).json({
      success: true,
      data: challenges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get challenges',
      error: error.message
    });
  }
});

/**
 * EMERGENCY PRESCRIPTION ROUTES
 */
router.post('/emergency/request', authenticate, async (req, res) => {
  try {
    const { emergencyData, patientProfile } = req.body;
    
    const result = await emergencyService.handleEmergencyRequest(emergencyData, patientProfile);
    
    res.status(200).json({
      success: true,
      message: 'Emergency request processed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Emergency request processing failed',
      error: error.message
    });
  }
});

router.post('/emergency/travel-prescription', authenticate, async (req, res) => {
  try {
    const { travelData, patientProfile } = req.body;
    
    const result = await emergencyService.handleTravelPrescription(travelData, patientProfile);
    
    res.status(200).json({
      success: true,
      message: 'Travel prescription processed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Travel prescription processing failed',
      error: error.message
    });
  }
});

router.post('/emergency/disaster-response', authenticate, validateRoles(['admin']), async (req, res) => {
  try {
    const { disasterData, affectedArea } = req.body;
    
    const result = await emergencyService.activateDisasterResponse(disasterData, affectedArea);
    
    res.status(200).json({
      success: true,
      message: 'Disaster response activated',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Disaster response activation failed',
      error: error.message
    });
  }
});

/**
 * MENTAL HEALTH INTEGRATION ROUTES
 */
router.post('/mental-health/mood-entry', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { moodData } = req.body;
    
    const result = await mentalHealthService.recordMoodEntry(userId, moodData);
    
    res.status(200).json({
      success: true,
      message: 'Mood entry recorded successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record mood entry',
      error: error.message
    });
  }
});

router.post('/mental-health/therapy-chat', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, sessionId } = req.body;
    
    const result = await mentalHealthService.processTherapyChatMessage(userId, message, sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Therapy chat message processed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Therapy chat processing failed',
      error: error.message
    });
  }
});

/**
 * COMPREHENSIVE HEALTH INTEGRATION ROUTES
 */
router.get('/health/comprehensive-dashboard/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Get data from multiple services
    const [
      healthAnalytics,
      gamificationData,
      mentalHealthData
    ] = await Promise.allSettled([
      healthAnalytics.generateHealthAnalytics(patientId),
      gamification.generatePersonalizedChallenges(patientId),
      // Would fetch mental health data
    ]);

    const dashboard = {
      patientId,
      healthAnalytics: healthAnalytics.status === 'fulfilled' ? healthAnalytics.value : null,
      gamification: gamificationData.status === 'fulfilled' ? gamificationData.value : null,
      mentalHealth: mentalHealthData.status === 'fulfilled' ? mentalHealthData.value : null,
      generatedAt: new Date()
    };
    
    res.status(200).json({
      success: true,
      message: 'Comprehensive health dashboard generated',
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate comprehensive dashboard',
      error: error.message
    });
  }
});

router.post('/health/ai-health-assistant', authenticate, async (req, res) => {
  try {
    const { query, patientData, context } = req.body;
    
    // This would integrate multiple AI services to provide comprehensive health assistance
    // For now, route to appropriate service based on query type
    
    let result;
    if (query.includes('symptom')) {
      result = await symptomChecker.analyzeSymptoms(query, patientData);
    } else if (query.includes('medication') || query.includes('drug')) {
      result = await drugDiscovery.findAlternativeMedications(query, patientData);
    } else {
      result = { message: 'AI health assistant processing...', query };
    }
    
    res.status(200).json({
      success: true,
      message: 'AI health assistant response',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'AI health assistant failed',
      error: error.message
    });
  }
});

/**
 * HEALTH DATA INTEGRATION ENDPOINT
 */
router.post('/health/integrate-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      wearableData, 
      medicationData, 
      symptomData, 
      moodData,
      vitalSigns 
    } = req.body;
    
    // Process data through multiple services
    const results = {};
    
    if (medicationData) {
      results.medication = await gamification.recordMedicationTaken(userId, medicationData);
    }
    
    if (moodData) {
      results.mood = await mentalHealthService.recordMoodEntry(userId, moodData);
    }
    
    if (symptomData) {
      results.symptoms = await symptomChecker.analyzeSymptoms(symptomData, { id: userId });
    }
    
    // Generate comprehensive health insights
    if (Object.keys(results).length > 0) {
      results.analytics = await healthAnalytics.generateHealthAnalytics(userId);
    }
    
    res.status(200).json({
      success: true,
      message: 'Health data integrated successfully',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health data integration failed',
      error: error.message
    });
  }
});

export default router;