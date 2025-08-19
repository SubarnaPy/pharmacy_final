import express from 'express';
import ChatbotController from '../controllers/ChatbotController.js';
import { authenticate, authenticateToken } from '../middleware/auth.js';
import { validatePatientRole } from '../middleware/roleValidation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const chatbotController = new ChatbotController();

// Rate limiting for chatbot endpoints
const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute per user
  message: {
    success: false,
    error: 'Too many messages. Please wait before sending more.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `chatbot_${req.user?.id || req.ip}`
});

const symptomAnalysisRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 symptom analyses per 5 minutes
  message: {
    success: false,
    error: 'Too many symptom analysis requests. Please wait before analyzing more symptoms.',
    retryAfter: '5 minutes'
  },
  keyGenerator: (req) => `symptoms_${req.user?.id || req.ip}`
});

const doctorRecommendationRateLimit = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5, // 5 doctor recommendation requests per 2 minutes
  message: {
    success: false,
    error: 'Too many doctor recommendation requests. Please wait before requesting more.',
    retryAfter: '2 minutes'
  },
  keyGenerator: (req) => `doctor_rec_${req.user?.id || req.ip}`
});

// Apply authentication and patient role validation to all routes
// router.use(authenticateToken);
// router.use(validatePatientRole);

/**
 * @route   POST /api/chatbot/message
 * @desc    Send a message to the AI healthcare chatbot
 * @access  Private (Patients only)
 */
router.post('/message',authenticate, chatRateLimit, async (req, res) => {
  await chatbotController.sendMessage(req, res);
});

/**
 * @route   POST /api/chatbot/analyze-symptoms
 * @desc    Analyze symptoms using AI
 * @access  Private (Patients only)
 */
router.post('/analyze-symptoms',authenticate, symptomAnalysisRateLimit, async (req, res) => {
  await chatbotController.analyzeSymptoms(req, res);
});

/**
 * @route   POST /api/chatbot/doctor-recommendations
 * @desc    Get doctor recommendations based on condition or specialty
 * @access  Private (Patients only)
 */
router.post('/doctor-recommendations',authenticate, doctorRecommendationRateLimit, async (req, res) => {
  await chatbotController.getDoctorRecommendations(req, res);
});

/**
 * @route   GET /api/chatbot/health-education/:topic
 * @desc    Get health education content on a specific topic
 * @access  Private (Patients only)
 */
router.get('/health-education/:topic',authenticate, async (req, res) => {
  await chatbotController.getHealthEducation(req, res);
});

/**
 * @route   POST /api/chatbot/health-tips
 * @desc    Get personalized health tips based on user profile
 * @access  Private (Patients only)
 */
router.post('/health-tips',authenticate, async (req, res) => {
  await chatbotController.getPersonalizedHealthTips(req, res);
});

/**
 * @route   GET /api/chatbot/conversation-history
 * @desc    Get conversation history with pagination and filtering
 * @access  Private (Patients only)
 */
router.get('/conversation-history',authenticate, async (req, res) => {
  await chatbotController.getConversationHistory(req, res);
});

/**
 * @route   DELETE /api/chatbot/conversation-history
 * @desc    Clear conversation history
 * @access  Private (Patients only)
 */
router.delete('/conversation-history',authenticate, async (req, res) => {
  await chatbotController.clearConversationHistory(req, res);
});

/**
 * @route   GET /api/chatbot/status
 * @desc    Get chatbot status and statistics
 * @access  Private (Patients only)
 */
router.get('/status', authenticate,async (req, res) => {
  await chatbotController.getChatbotStatus(req, res);
});

/**
 * @route   POST /api/chatbot/rate-response
 * @desc    Rate a chatbot response
 * @access  Private (Patients only)
 */
router.post('/rate-response',authenticate, async (req, res) => {
  await chatbotController.rateResponse(req, res);
});

/**
 * @route   GET /api/chatbot/health-education/:topic
 * @desc    Get health education by topic
 * @access  Private (Patients only)
 */
router.get('/health-education/:topic',authenticate, async (req, res) => {
  await chatbotController.getHealthEducationByTopic(req, res);
});

export default router;
