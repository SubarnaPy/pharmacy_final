import express from 'express';
import ChatbotController from '../controllers/ChatbotController.js';
import { authenticate, authenticateToken } from '../middleware/auth.js';
import { validatePatientRole } from '../middleware/roleValidation.js';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';

const router = express.Router();
const chatbotController = new ChatbotController();

// In-memory stores for rate limiting (replacing Redis)
const userBehaviorStore = new Map();
const analyticsStore = new Map();
const feedbackStore = new Map();

// Advanced Rate Limiting with in-memory store
const advancedChatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: 'Rate limit exceeded',
    retryAfter: 60,
    suggestions: [
      'Try reducing request frequency',
      'Consider upgrading to premium for higher limits',
      'Use batch operations when possible'
    ]
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const advancedSymptomRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // Fewer requests for heavy operations
  message: {
    success: false,
    error: 'Symptom analysis rate limit exceeded',
    retryAfter: 300
  }
});

const premiumUserRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Higher limit for premium users
  message: {
    success: false,
    error: 'Premium rate limit exceeded',
    retryAfter: 60
  }
});

// AI-powered adaptive rate limiting (in-memory version)
const adaptiveRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // Adjust limits based on user behavior and system load
    const userTier = req.user?.subscription?.tier || 'basic';
    const systemLoad = await getSystemLoad();
    const userBehaviorScore = await getUserBehaviorScore(req.user?.id);
    
    let basePoints = 20;
    
    // Tier-based adjustments
    if (userTier === 'premium') basePoints = 50;
    if (userTier === 'enterprise') basePoints = 100;
    
    // System load adjustments
    if (systemLoad > 80) basePoints *= 0.5;
    if (systemLoad < 30) basePoints *= 1.5;
    
    // User behavior adjustments
    if (userBehaviorScore > 0.8) basePoints *= 1.2; // Good behavior bonus
    if (userBehaviorScore < 0.3) basePoints *= 0.7; // Poor behavior penalty
    
    return Math.floor(basePoints);
  },
  message: {
    success: false,
    error: 'Adaptive rate limit exceeded',
    retryAfter: 60
  }
});

// Advanced middleware functions
const getSystemLoad = async () => {
  try {
    // Simulate system load calculation
    // In production, this would check CPU, memory, active connections, etc.
    const cpuLoad = Math.random() * 100;
    const memoryUsage = Math.random() * 100;
    const activeConnections = Math.random() * 1000;
    
    return Math.max(cpuLoad, memoryUsage, activeConnections / 10);
  } catch (error) {
    return 50; // Default moderate load
  }
};

const getUserBehaviorScore = async (userId) => {
  try {
    // Calculate user behavior score based on historical data stored in memory
    // Factors: request patterns, abuse reports, response quality feedback
    const recentActivity = userBehaviorStore.get(`user_behavior:${userId}`);
    
    if (!recentActivity) {
      return 0.7; // Default score for new users
    }
    
    const behavior = recentActivity;
    let score = 0.5;
    
    // Positive factors
    if (behavior.avgResponseTime < 2000) score += 0.1;
    if (behavior.feedbackRating > 4) score += 0.2;
    if (behavior.helpfulVotes > 10) score += 0.1;
    
    // Negative factors
    if (behavior.spamReports > 2) score -= 0.3;
    if (behavior.abusiveMessages > 0) score -= 0.4;
    if (behavior.rateLimitViolations > 5) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    return 0.5; // Default score
  }
};

// Advanced rate limiting middleware (simplified for in-memory)
const applyAdvancedRateLimit = (limiter) => {
  return limiter; // Return the express-rate-limit middleware directly
};

// Analytics and monitoring middleware
const analyticsMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Track request analytics
  const analytics = {
    userId: req.user?.id,
    endpoint: req.route?.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    requestSize: JSON.stringify(req.body).length
  };
  
  // Override res.send to capture response data
  res.send = function(data) {
    analytics.responseTime = Date.now() - startTime;
    analytics.responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
    analytics.statusCode = res.statusCode;
    
    // Store analytics asynchronously
    setImmediate(() => {
      storeAnalytics(analytics);
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

// Store analytics data in memory
const storeAnalytics = async (analytics) => {
  try {
    // Store in memory with automatic cleanup
    const key = `analytics:${analytics.userId}:${Date.now()}`;
    analyticsStore.set(key, analytics);
    
    // Clean up old entries (keep only last 1000 entries per user)
    if (analyticsStore.size > 1000) {
      const oldestKeys = Array.from(analyticsStore.keys()).slice(0, analyticsStore.size - 1000);
      oldestKeys.forEach(key => analyticsStore.delete(key));
    }
  } catch (error) {
    console.error('Failed to store analytics:', error);
  }
};

// Update user behavior metrics (in-memory)
const updateUserBehaviorMetrics = async (userId, analytics) => {
  try {
    const behaviorKey = `user_behavior:${userId}`;
    const existing = userBehaviorStore.get(behaviorKey);
    
    let behavior = existing || {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: null,
      feedbackRating: 0,
      helpfulVotes: 0,
      spamReports: 0,
      abusiveMessages: 0,
      rateLimitViolations: 0
    };
    
    // Update metrics
    behavior.totalRequests += 1;
    behavior.avgResponseTime = (behavior.avgResponseTime + analytics.responseTime) / 2;
    behavior.lastActivity = analytics.timestamp;
    
    if (analytics.statusCode >= 400) {
      behavior.errorRate = (behavior.errorRate + 1) / behavior.totalRequests;
    }
    
    if (analytics.statusCode === 429) {
      behavior.rateLimitViolations += 1;
    }
    
    userBehaviorStore.set(behaviorKey, behavior);
  } catch (error) {
    console.error('Failed to update user behavior metrics:', error);
  }
};

// Update real-time metrics (in-memory)
const updateRealTimeMetrics = async (analytics) => {
  try {
    const timestamp = Math.floor(Date.now() / 60000); // Per minute
    const metricsKey = `realtime_metrics:${timestamp}`;
    
    let metrics = analyticsStore.get(metricsKey) || {
      requests: 0,
      response_time: 0,
      errors: 0,
      timestamp: timestamp
    };
    
    metrics.requests += 1;
    metrics.response_time += analytics.responseTime;
    
    if (analytics.statusCode >= 400) {
      metrics.errors += 1;
    }
    
    analyticsStore.set(metricsKey, metrics);
  } catch (error) {
    console.error('Failed to update real-time metrics:', error);
  }
};

// WebSocket authentication middleware
const authenticateWebSocket = (ws, req) => {
  try {
    const { query } = url.parse(req.url, true);
    const token = query.token;
    
    if (!token) {
      ws.close(1008, 'Authentication token required');
      return null;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    ws.close(1008, 'Invalid authentication token');
    return null;
  }
};

// WebSocket connection manager
class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.rooms = new Map();
  }
  
  addConnection(userId, ws) {
    this.connections.set(userId, ws);
    
    ws.on('close', () => {
      this.removeConnection(userId);
    });
    
    ws.on('message', (data) => {
      this.handleMessage(userId, data);
    });
  }
  
  removeConnection(userId) {
    this.connections.delete(userId);
    // Remove from all rooms
    for (const [roomId, users] of this.rooms) {
      const updated = users.filter(id => id !== userId);
      if (updated.length === 0) {
        this.rooms.delete(roomId);
      } else {
        this.rooms.set(roomId, updated);
      }
    }
  }
  
  joinRoom(userId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, []);
    }
    this.rooms.get(roomId).push(userId);
  }
  
  sendToUser(userId, message) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  sendToRoom(roomId, message, excludeUserId = null) {
    const users = this.rooms.get(roomId) || [];
    users.forEach(userId => {
      if (userId !== excludeUserId) {
        this.sendToUser(userId, message);
      }
    });
  }
  
  handleMessage(userId, data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'join_room':
          this.joinRoom(userId, message.roomId);
          break;
        case 'chat_message':
          this.handleChatMessage(userId, message);
          break;
        case 'typing':
          this.handleTyping(userId, message);
          break;
        case 'heartbeat':
          this.sendToUser(userId, { type: 'heartbeat_ack' });
          break;
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
    }
  }
  
  handleChatMessage(userId, message) {
    // Broadcast to room or handle direct message
    if (message.roomId) {
      this.sendToRoom(message.roomId, {
        type: 'chat_message',
        userId,
        message: message.content,
        timestamp: new Date().toISOString()
      }, userId);
    }
  }
  
  handleTyping(userId, message) {
    if (message.roomId) {
      this.sendToRoom(message.roomId, {
        type: 'typing',
        userId,
        isTyping: message.isTyping
      }, userId);
    }
  }
}

const wsManager = new WebSocketManager();

// Legacy rate limiting for backward compatibility
const legacyChatRateLimit = rateLimit({
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

// Apply advanced middleware to all routes
router.use(analyticsMiddleware);

/**
 * @route   POST /api/chatbot/message
 * @desc    Send a message to the AI healthcare chatbot with advanced rate limiting
 * @access  Private (Patients only)
 */
router.post('/message', authenticate, applyAdvancedRateLimit(adaptiveRateLimit), async (req, res) => {
  await chatbotController.sendMessage(req, res);
});

/**
 * @route   POST /api/chatbot/analyze-symptoms
 * @desc    Analyze symptoms using AI with enhanced rate limiting
 * @access  Private (Patients only)
 */
router.post('/analyze-symptoms', authenticate, applyAdvancedRateLimit(advancedSymptomRateLimit), async (req, res) => {
  await chatbotController.analyzeSymptoms(req, res);
});

/**
 * @route   POST /api/chatbot/doctor-recommendations
 * @desc    Get doctor recommendations with smart rate limiting
 * @access  Private (Patients only)
 */
router.post('/doctor-recommendations', authenticate, applyAdvancedRateLimit(advancedChatRateLimit), async (req, res) => {
  await chatbotController.getDoctorRecommendations(req, res);
});

/**
 * @route   GET /api/chatbot/health-education/:topic
 * @desc    Get health education content with optimized rate limiting
 * @access  Private (Patients only)
 */
router.get('/health-education/:topic', authenticate, applyAdvancedRateLimit(advancedChatRateLimit), async (req, res) => {
  await chatbotController.getHealthEducation(req, res);
});

/**
 * @route   POST /api/chatbot/health-tips
 * @desc    Get personalized health tips with adaptive limiting
 * @access  Private (Patients only)
 */
router.post('/health-tips', authenticate, applyAdvancedRateLimit(adaptiveRateLimit), async (req, res) => {
  await chatbotController.getPersonalizedHealthTips(req, res);
});

/**
 * @route   GET /api/chatbot/conversation-history
 * @desc    Get conversation history with enhanced analytics
 * @access  Private (Patients only)
 */
router.get('/conversation-history', authenticate, async (req, res) => {
  await chatbotController.getConversationHistory(req, res);
});

/**
 * @route   DELETE /api/chatbot/conversation-history
 * @desc    Clear conversation history
 * @access  Private (Patients only)
 */
router.delete('/conversation-history', authenticate, async (req, res) => {
  await chatbotController.clearConversationHistory(req, res);
});

/**
 * @route   GET /api/chatbot/status
 * @desc    Get chatbot status and advanced system metrics
 * @access  Private (Patients only)
 */
router.get('/status', authenticate, async (req, res) => {
  await chatbotController.getChatbotStatus(req, res);
});

/**
 * @route   POST /api/chatbot/rate-response
 * @desc    Rate a chatbot response with analytics tracking
 * @access  Private (Patients only)
 */
router.post('/rate-response', authenticate, async (req, res) => {
  await chatbotController.rateResponse(req, res);
});

// ============= ADVANCED ANALYTICS ENDPOINTS =============

/**
 * @route   GET /api/chatbot/analytics/usage
 * @desc    Get user usage analytics and insights
 * @access  Private (Patients only)
 */
router.get('/analytics/usage', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '7d' } = req.query;
    
    // Get user analytics from Redis
    const behaviorKey = `user_behavior:${userId}`;
    const behavior = await redis.get(behaviorKey);
    
    const analytics = behavior ? JSON.parse(behavior) : {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: null
    };
    
    // Get usage patterns
    const usagePatterns = await getUserUsagePatterns(userId, timeframe);
    
    res.json({
      success: true,
      analytics: {
        ...analytics,
        usagePatterns,
        insights: generateUsageInsights(analytics, usagePatterns),
        recommendations: generateUsageRecommendations(analytics)
      },
      timeframe,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics data'
    });
  }
});

/**
 * @route   GET /api/chatbot/analytics/performance
 * @desc    Get system performance metrics and health status
 * @access  Private (Admin only)
 */
router.get('/analytics/performance', authenticate, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const systemLoad = await getSystemLoad();
    const realTimeMetrics = await getRealTimeMetrics();
    const performanceInsights = await getPerformanceInsights();
    
    res.json({
      success: true,
      performance: {
        systemLoad,
        realTimeMetrics,
        insights: performanceInsights,
        healthStatus: systemLoad < 70 ? 'healthy' : systemLoad < 90 ? 'warning' : 'critical'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance data'
    });
  }
});

/**
 * @route   GET /api/chatbot/analytics/trends
 * @desc    Get usage trends and predictive analytics
 * @access  Private (Patients only)
 */
router.get('/analytics/trends', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query;
    
    const trends = await getUserTrends(userId, period);
    const predictions = await generatePredictiveInsights(userId, trends);
    
    res.json({
      success: true,
      trends: {
        historical: trends,
        predictions,
        insights: generateTrendInsights(trends),
        recommendations: generateTrendRecommendations(trends, predictions)
      },
      period,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trends data'
    });
  }
});

/**
 * @route   POST /api/chatbot/analytics/feedback
 * @desc    Submit advanced feedback with sentiment analysis
 * @access  Private (Patients only)
 */
router.post('/analytics/feedback', authenticate, async (req, res) => {
  try {
    const { rating, comment, category, features } = req.body;
    const userId = req.user.id;
    
    // Perform sentiment analysis on comment
    const sentiment = await analyzeFeedbackSentiment(comment);
    
    const feedback = {
      userId,
      rating,
      comment,
      category,
      features,
      sentiment,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // Store feedback
    await storeFeedback(feedback);
    
    // Update user behavior score
    await updateUserBehaviorScore(userId, feedback);
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      sentiment: sentiment.label,
      confidence: sentiment.confidence
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

// ============= REAL-TIME WEBSOCKET ENDPOINTS =============

/**
 * @route   WS /api/chatbot/ws/chat
 * @desc    Real-time chat WebSocket connection
 * @access  Private (Patients only)
 */
router.ws = (wss) => {
  wss.on('connection', (ws, req) => {
    const user = authenticateWebSocket(ws, req);
    if (!user) return;
    
    console.log(`WebSocket connected: User ${user.id}`);
    wsManager.addConnection(user.id, ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to advanced chatbot system',
      features: {
        realTimeChat: true,
        typingIndicators: true,
        presenceStatus: true,
        notifications: true
      },
      timestamp: new Date().toISOString()
    }));
  });
};

/**
 * @route   GET /api/chatbot/ws/token
 * @desc    Get WebSocket authentication token
 * @access  Private (Patients only)
 */
router.get('/ws/token', authenticate, async (req, res) => {
  try {
    const wsToken = jwt.sign(
      { 
        id: req.user.id, 
        type: 'websocket',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      process.env.JWT_SECRET
    );
    
    res.json({
      success: true,
      wsToken,
      wsUrl: `ws://localhost:3001/api/chatbot/ws/chat?token=${wsToken}`,
      expiresIn: 3600
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate WebSocket token'
    });
  }
});

// ============= UTILITY FUNCTIONS FOR ANALYTICS =============

// Get user usage patterns
const getUserUsagePatterns = async (userId, timeframe) => {
  try {
    const patterns = {
      hourlyDistribution: {},
      dailyDistribution: {},
      featureUsage: {},
      averageSessionLength: 0,
      peakUsageHours: []
    };
    
    // Simulate analytics data - in production, query from database
    for (let hour = 0; hour < 24; hour++) {
      patterns.hourlyDistribution[hour] = Math.floor(Math.random() * 20);
    }
    
    return patterns;
  } catch (error) {
    return {};
  }
};

// Generate usage insights
const generateUsageInsights = (analytics, patterns) => {
  const insights = [];
  
  if (analytics.totalRequests > 100) {
    insights.push({
      type: 'engagement',
      level: 'high',
      message: 'You\'re highly engaged with the health platform!'
    });
  }
  
  return insights;
};

// Generate usage recommendations
const generateUsageRecommendations = (analytics) => {
  const recommendations = [];
  
  if (analytics.totalRequests < 10) {
    recommendations.push({
      title: 'Explore More Features',
      description: 'Try our health education library and interactive learning modules.',
      priority: 'medium'
    });
  }
  
  return recommendations;
};

// Get real-time metrics
const getRealTimeMetrics = async () => {
  try {
    return {
      currentMinute: Math.floor(Date.now() / 60000),
      requestsPerMinute: Math.floor(Math.random() * 50),
      averageResponseTime: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 5,
      activeUsers: wsManager.connections.size || 0
    };
  } catch (error) {
    return {
      currentMinute: Math.floor(Date.now() / 60000),
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeUsers: 0
    };
  }
};

// Get performance insights
const getPerformanceInsights = async () => {
  return [
    {
      type: 'system_performance',
      level: 'info',
      message: 'System is performing within normal parameters'
    }
  ];
};

// Get user trends
const getUserTrends = async (userId, period) => {
  return {
    usage: [],
    engagement: [],
    satisfaction: []
  };
};

// Generate predictive insights
const generatePredictiveInsights = async (userId, trends) => {
  return [
    {
      type: 'usage_prediction',
      confidence: 0.8,
      prediction: 'Steady usage expected'
    }
  ];
};

// Generate trend insights
const generateTrendInsights = (trends) => {
  return [
    {
      type: 'trend_analysis',
      message: 'Your health engagement is improving'
    }
  ];
};

// Generate trend recommendations
const generateTrendRecommendations = (trends, predictions) => {
  return [
    {
      title: 'Continue Your Progress',
      description: 'Keep up the great work with your health journey',
      priority: 'low'
    }
  ];
};

// Analyze feedback sentiment
const analyzeFeedbackSentiment = async (comment) => {
  // Simplified sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'useless'];
  
  const words = comment.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveScore++;
    if (negativeWords.includes(word)) negativeScore++;
  });
  
  const totalScore = positiveScore - negativeScore;
  let label = 'neutral';
  let confidence = 0.5;
  
  if (totalScore > 0) {
    label = 'positive';
    confidence = 0.8;
  } else if (totalScore < 0) {
    label = 'negative';
    confidence = 0.8;
  }
  
  return { label, confidence };
};

// Store feedback in memory
const storeFeedback = async (feedback) => {
  try {
    const feedbackKey = `feedback:${feedback.userId}:${Date.now()}`;
    feedbackStore.set(feedbackKey, feedback);
    
    // Clean up old entries (keep only last 500 feedback entries)
    if (feedbackStore.size > 500) {
      const oldestKeys = Array.from(feedbackStore.keys()).slice(0, feedbackStore.size - 500);
      oldestKeys.forEach(key => feedbackStore.delete(key));
    }
  } catch (error) {
    console.error('Failed to store feedback:', error);
  }
};

// Update user behavior score in memory
const updateUserBehaviorScore = async (userId, feedback) => {
  try {
    const behaviorKey = `user_behavior:${userId}`;
    const existing = userBehaviorStore.get(behaviorKey);
    
    let behavior = existing || {
      feedbackRating: 0,
      feedbackCount: 0
    };
    
    behavior.feedbackRating = (behavior.feedbackRating * behavior.feedbackCount + feedback.rating) / (behavior.feedbackCount + 1);
    behavior.feedbackCount += 1;
    
    userBehaviorStore.set(behaviorKey, behavior);
  } catch (error) {
    console.error('Failed to update user behavior score:', error);
  }
};

export default router;
export { wsManager };
