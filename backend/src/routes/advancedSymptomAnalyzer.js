// import express from 'express';
// import { authenticateToken } from '../middleware/auth.js';
// import { validatePatientRole } from '../middleware/roleValidation.js';
// import rateLimit from 'express-rate-limit';
// import AdvancedSymptomAnalyzer from '../services/ai/AdvancedSymptomAnalyzer.js';
// // import BodyVisualizationService from '../services/ai/BodyVisualizationService.js'; // Removed 3D visualization
// import RiskAssessmentService from '../services/ai/RiskAssessmentService.js';
// import ClinicalDecisionSupport from '../services/ai/ClinicalDecisionSupport.js';
// import ProgressionTrackingService from '../services/ai/ProgressionTrackingService.js';
// import EmotionDetectionService from '../services/ai/EmotionDetectionService.js';
// import MultiModalInputProcessor from '../services/ai/MultiModalInputProcessor.js';
// import RealTimeMonitoringService from '../services/ai/RealTimeMonitoringService.js';
// import SymptomHistory from '../models/SymptomHistory.js';
// import AuditLogService from '../services/AuditLogService.js';

// // const router = express.Router();

// // Rate limiting for symptom analysis
// const symptomAnalysisLimit = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   max: 10, // limit each user to 10 symptom analyses per 5 minutes
//   message: {
//     success: false,
//     error: 'Too many symptom analyses. Please wait before submitting another.',
//     retryAfter: 300
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // Initialize services
// const symptomAnalyzer = new AdvancedSymptomAnalyzer();
// // const bodyVisualization = new BodyVisualizationService(); // Removed 3D visualization
// const riskAssessment = new RiskAssessmentService();
// const clinicalSupport = new ClinicalDecisionSupport();
// const progressionTracking = new ProgressionTrackingService();
// const emotionDetection = new EmotionDetectionService();
// const multiModalProcessor = new MultiModalInputProcessor();
// const realTimeMonitoring = new RealTimeMonitoringService();

// /**
//  * @route POST /api/symptom-analyzer/analyze
//  * @desc Advanced AI-powered symptom analysis with multi-modal support
//  * @access Private (Patient)
//  */
// router.post('/analyze', authenticateToken, validatePatientRole, symptomAnalysisLimit, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const {
//       symptoms,
//       additionalInfo,
//       selectedBodyParts, // Simplified body parts selection
//       multiModalData,
//       progressionData,
//       riskFactors
//     } = req.body;

//     // Input validation
//     if (!symptoms || symptoms.trim().length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Symptoms description is required'
//       });
//     }

//     // Log the analysis request
//     await AuditLogService.log({
//       eventType: 'API_ACCESS',
//       userId,
//       action: 'symptom_analysis_requested',
//       details: {
//         symptomsLength: symptoms.length,
//         hasAdditionalInfo: !!additionalInfo,
//         hasSelectedBodyParts: !!selectedBodyParts?.length,
//         hasMultiModal: !!multiModalData
//       },
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent')
//     });

//     // Process multi-modal inputs if provided
//     let processedMultiModal = {};
//     if (multiModalData) {
//       processedMultiModal = await multiModalProcessor.processInputs(multiModalData, userId);
//     }

//     // Detect emotions from text and voice
//     let emotionAnalysis = {};
//     if (symptoms || multiModalData?.voiceTranscript) {
//       emotionAnalysis = await emotionDetection.analyzeEmotions({
//         text: symptoms,
//         voice: multiModalData?.voiceTranscript,
//         userId
//       });
//     }

//     // Simple body parts analysis (removed 3D visualization)
//     let bodyAnalysis = {};
//     if (selectedBodyParts?.length > 0) {
//       bodyAnalysis = {
//         selectedParts: selectedBodyParts,
//         affectedAreas: selectedBodyParts.map(part => ({ name: part }))
//       };
//     }

//     // Perform comprehensive symptom analysis
//     const analysisRequest = {
//       symptoms,
//       additionalInfo: {
//         duration: additionalInfo?.duration,
//         severity: additionalInfo?.severity || 'moderate',
//         triggers: additionalInfo?.triggers,
//         medications: additionalInfo?.medications,
//         allergies: additionalInfo?.allergies,
//         previousTreatment: additionalInfo?.previousTreatment
//       },
//       bodyAnalysis,
//       emotionAnalysis,
//       multiModalData: processedMultiModal,
//       userId,
//       timestamp: new Date().toISOString()
//     };

//     const analysis = await symptomAnalyzer.performComprehensiveAnalysis(analysisRequest);

//     // Perform risk assessment
//     const riskAnalysis = await riskAssessment.assessRisk({
//       analysis,
//       userProfile: req.user,
//       additionalRiskFactors: riskFactors
//     });

//     // Get clinical decision support
//     const clinicalRecommendations = await clinicalSupport.getRecommendations({
//       analysis,
//       riskAnalysis,
//       userProfile: req.user
//     });

//     // Update progression tracking
//     let progressionInsights = {};
//     if (progressionData?.enabled) {
//       progressionInsights = await progressionTracking.updateProgression({
//         userId,
//         analysis,
//         riskAnalysis,
//         timeline: progressionData.timeline
//       });
//     }

//     // Find available specialists
//     const specialists = await clinicalSupport.findAvailableSpecialists({
//       analysis,
//       clinicalRecommendations,
//       userLocation: req.user.profile?.address
//     });

//     // Save to symptom history
//     const symptomRecord = new SymptomHistory({
//       userId,
//       symptoms,
//       additionalInfo,
//       analysis,
//       riskAnalysis,
//       clinicalRecommendations,
//       selectedBodyParts: selectedBodyParts || [],
//       multiModalData: processedMultiModal,
//       emotionAnalysis,
//       progressionInsights,
//       specialists: specialists.slice(0, 5), // Save top 5 specialists
//       timestamp: new Date()
//     });

//     await symptomRecord.save();

//     // Check for emergency conditions
//     const emergencyCheck = await riskAssessment.checkEmergencyConditions(riskAnalysis);
    
//     // Prepare comprehensive response
//     const response = {
//       success: true,
//       analysis: {
//         id: symptomRecord._id,
//         symptom_analysis: analysis.symptomAnalysis,
//         possible_causes: analysis.possibleCauses,
//         body_systems_involved: analysis.bodySystemsInvolved,
//         severity_assessment: analysis.severityAssessment,
//         confidence_score: analysis.confidenceScore
//       },
//       riskAnalysis: {
//         riskScore: riskAnalysis.riskScore,
//         urgencyLevel: riskAnalysis.urgencyLevel,
//         riskFactors: riskAnalysis.riskFactors,
//         clinicalAlerts: riskAnalysis.clinicalAlerts,
//         emergencyIndicators: emergencyCheck
//       },
//       clinicalRecommendations: {
//         differentialDiagnosis: clinicalRecommendations.differentialDiagnosis,
//         recommendedTests: clinicalRecommendations.recommendedTests,
//         treatmentOptions: clinicalRecommendations.treatmentOptions,
//         specialistReferrals: clinicalRecommendations.specialistReferrals,
//         clinicalPathways: clinicalRecommendations.clinicalPathways
//       },
//       recommendations: {
//         immediate_actions: analysis.recommendations?.immediateActions || [],
//         self_care_measures: analysis.recommendations?.selfCareMeasures || [],
//         when_to_see_doctor: analysis.recommendations?.whenToSeeDoctor,
//         specialist_needed: clinicalRecommendations.specialistReferrals?.[0]?.specialty,
//         follow_up_timing: analysis.recommendations?.followUpTiming
//       },
//       timeline: {
//         if_symptoms_worsen: analysis.timeline?.ifSymptomsWorsen,
//         follow_up_timing: analysis.timeline?.followUpTiming,
//         emergency_signs: analysis.timeline?.emergencySigns
//       },
//       redFlags: analysis.redFlags || [],
//       specialists: specialists,
//       emotionAnalysis: {
//         primaryEmotion: emotionAnalysis.primaryEmotion,
//         confidence: emotionAnalysis.confidence
//       },
//       progressionInsights: progressionInsights,
//       metadata: {
//         analysisId: symptomRecord._id,
//         timestamp: new Date().toISOString(),
//         processingTime: analysis.processingTime,
//         modelVersion: analysis.modelVersion,
//         confidenceMetrics: analysis.confidenceMetrics,
//         quotaExceeded: analysis.quotaExceeded || false,
//         isLimitedAnalysis: analysis.isLimitedAnalysis || false,
//         notice: analysis.notice
//       }
//     };

//     // Log successful analysis
//     await AuditLogService.log({
//       eventType: 'API_ACCESS',
//       userId,
//       action: 'symptom_analysis_completed',
//       details: {
//         analysisId: symptomRecord._id,
//         riskScore: riskAnalysis.riskScore,
//         urgencyLevel: riskAnalysis.urgencyLevel,
//         emergencyFlags: emergencyCheck.isEmergency
//       },
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent')
//     });

//     res.json(response);

//   } catch (error) {
//     console.error('❌ Symptom analysis error:', error);
    
//     // Log the error
//     await AuditLogService.log({
//       eventType: 'SYSTEM_ERROR',
//       userId: req.user?.id,
//       action: 'symptom_analysis_error',
//       details: {
//         error: error.message,
//         stack: error.stack
//       },
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent')
//     });

//     // Provide specific error messages based on error type
//     let errorMessage = 'Failed to analyze symptoms. Please try again later.';
//     let statusCode = 500;

//     if (error.message.includes('quota') || error.message.includes('rate limit') || error.status === 429) {
//       errorMessage = 'AI analysis service is temporarily at capacity. Basic analysis has been provided where possible. Please try again in a few minutes for full AI analysis.';
//       statusCode = 503; // Service Temporarily Unavailable
//     }

//     res.status(statusCode).json({
//       success: false,
//       error: errorMessage,
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined,
//       retryAfter: statusCode === 503 ? '5 minutes' : undefined
//     });
//   }
// });

// /**
//  * @route GET /api/symptom-analyzer/history
//  * @desc Get user's symptom analysis history
//  * @access Private (Patient)
//  */
// router.get('/history', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

//     const skip = (page - 1) * limit;
//     const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const history = await SymptomHistory.find({ userId })
//       .select('-multiModalData -bodyVisualizationData') // Exclude large data fields
//       .sort(sort)
//       .limit(parseInt(limit))
//       .skip(skip)
//       .lean();

//     const total = await SymptomHistory.countDocuments({ userId });

//     res.json({
//       success: true,
//       data: {
//         history,
//         pagination: {
//           page: parseInt(page),
//           limit: parseInt(limit),
//           total,
//           pages: Math.ceil(total / limit)
//         }
//       }
//     });

//   } catch (error) {
//     console.error('❌ Error fetching symptom history:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch symptom history'
//     });
//   }
// });

// /**
//  * @route GET /api/symptom-analyzer/history/:id
//  * @desc Get detailed symptom analysis by ID
//  * @access Private (Patient)
//  */
// router.get('/history/:id', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { id } = req.params;

//     const analysis = await SymptomHistory.findOne({ _id: id, userId }).lean();

//     if (!analysis) {
//       return res.status(404).json({
//         success: false,
//         error: 'Symptom analysis not found'
//       });
//     }

//     res.json({
//       success: true,
//       data: analysis
//     });

//   } catch (error) {
//     console.error('❌ Error fetching symptom analysis:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch symptom analysis'
//     });
//   }
// });

// /**
//  * @route POST /api/symptom-analyzer/process-multimodal
//  * @desc Process multi-modal inputs (voice, image, video)
//  * @access Private (Patient)
//  */
// router.post('/process-multimodal', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { multiModalData } = req.body;

//     if (!multiModalData) {
//       return res.status(400).json({
//         success: false,
//         error: 'Multi-modal data is required'
//       });
//     }

//     const processedData = await multiModalProcessor.processInputs(multiModalData, userId);

//     res.json({
//       success: true,
//       data: processedData
//     });

//   } catch (error) {
//     console.error('❌ Error processing multi-modal data:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to process multi-modal data'
//     });
//   }
// });

// /**
//  * @route GET /api/symptom-analyzer/body-parts
//  * @desc Get available body parts for visualization
//  * @access Private (Patient)
//  */
// router.get('/body-parts', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const bodyParts = await bodyVisualization.getAvailableBodyParts();
//     const anatomicalSystems = await bodyVisualization.getAnatomicalSystems();

//     res.json({
//       success: true,
//       data: {
//         bodyParts,
//         anatomicalSystems
//       }
//     });

//   } catch (error) {
//     console.error('❌ Error fetching body parts:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch body parts data'
//     });
//   }
// });

// /**
//  * @route POST /api/symptom-analyzer/real-time/connect
//  * @desc Connect to real-time monitoring
//  * @access Private (Patient)
//  */
// router.post('/real-time/connect', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { monitoringPreferences } = req.body;

//     const connectionData = await realTimeMonitoring.initializeConnection(userId, monitoringPreferences);

//     res.json({
//       success: true,
//       data: connectionData
//     });

//   } catch (error) {
//     console.error('❌ Error connecting to real-time monitoring:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to connect to real-time monitoring'
//     });
//   }
// });

// /**
//  * @route GET /api/symptom-analyzer/progression/:userId
//  * @desc Get symptom progression tracking data
//  * @access Private (Patient)
//  */
// router.get('/progression/:userId?', authenticateToken, validatePatientRole, async (req, res) => {
//   try {
//     const userId = req.params.userId || req.user.id;
    
//     // Ensure user can only access their own data unless they're admin
//     if (userId !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied'
//       });
//     }

//     const progressionData = await progressionTracking.getProgressionData(userId);

//     res.json({
//       success: true,
//       data: progressionData
//     });

//   } catch (error) {
//     console.error('❌ Error fetching progression data:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch progression data'
//     });
//   }
// });

// export default router;
