import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import OrderChatController from '../controllers/OrderChatController.js';

const router = express.Router();

// Initialize controller
const orderChatController = new OrderChatController();

/**
 * @route   GET /api/v1/order-chat/:orderId
 * @desc    Get or create order chat for a specific order
 * @access  Private
 */
router.get('/:orderId', authenticate, orderChatController.getOrderChat);

/**
 * @route   GET /api/v1/order-chat/:orderId/messages
 * @desc    Get messages for an order chat
 * @access  Private
 */
router.get('/:orderId/messages', authenticate, orderChatController.getMessages);

/**
 * @route   POST /api/v1/order-chat/:orderId/messages
 * @desc    Send a message in the order chat
 * @access  Private
 */
router.post('/:orderId/messages', authenticate, orderChatController.sendMessage);

/**
 * @route   POST /api/v1/order-chat/:orderId/read
 * @desc    Mark order chat as read
 * @access  Private
 */
router.post('/:orderId/read', authenticate, orderChatController.markAsRead);

/**
 * @route   GET /api/v1/order-chat/user/conversations
 * @desc    Get user's order chats
 * @access  Private
 */
router.get('/user/conversations', authenticate, orderChatController.getUserOrderChats);

/**
 * @route   GET /api/v1/order-chat/stats
 * @desc    Get order chat statistics
 * @access  Private
 */
router.get('/stats', authenticate, orderChatController.getOrderChatStats);

export default router;
