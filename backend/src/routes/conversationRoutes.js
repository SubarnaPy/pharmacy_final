import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
// import { fileUpload } from '../middleware/fileUpload.js';
import ConversationController from '../controllers/ConversationController.js';

const router = express.Router();
const conversationController = new ConversationController();

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get conversations for current user (patient or pharmacy)
 * @access  Private
 */
router.get('/conversations', authenticate, conversationController.getConversations);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get messages for a specific conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', authenticate, conversationController.getConversationMessages);

/**
 * @route   POST /api/v1/chat/messages
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post('/messages', authenticate, conversationController.sendMessage);

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.post('/conversations/:conversationId/read', authenticate, conversationController.markAsRead);

/**
 * @route   POST /api/v1/chat/conversations/prescription
 * @desc    Create conversation when pharmacy accepts prescription
 * @access  Private (Pharmacy only)
 */
router.post('/conversations/prescription', authenticate, conversationController.createPrescriptionConversation);

/**
 * @route   POST /api/v1/chat/conversations/order
 * @desc    Create conversation when order is confirmed
 * @access  Private (Pharmacy only)
 */
router.post('/conversations/order', authenticate, conversationController.createOrderConversation);

/**
 * @route   POST /api/v1/chat/upload
 * @desc    Upload file to conversation
 * @access  Private
 */
// router.post('/upload', authenticate, fileUpload.single('file'), conversationController.uploadFile);

export default router;