import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Import configurations
import { connectDatabase } from './src/config/database.js';
// import { connectRedis } from './src/config/redis.js';
import { errorHandler, notFound } from './src/middleware/errorMiddleware.js';

// Import security middleware
import {
  generalLimiter,
  authLimiter,
  helmetConfig,
  corsConfig,
  securityHeaders,
  ipFilter,
  securityLogger
} from './src/middleware/security.js';

// Import audit logging
import AuditLogService from './src/services/AuditLogService.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import prescriptionRoutes from './src/routes/prescriptionRoutes.js';
import createPrescriptionRequestRoutes from './src/routes/prescriptionRequestRoutes.js';
// import prescriptionValidationRoutes from './routes/prescriptionValidation.js';
import pharmacyRoutes from './src/routes/pharmacyRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import orderChatRoutes from './src/routes/orderChatRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import fileRoutes from './src/routes/fileRoutes.js';
import createPharmacyDiscoveryRoutes from './src/routes/pharmacyDiscovery.js';
import webrtcRoutes from './src/routes/webrtc.js';
import medicalDocumentRoutes from './src/routes/medicalDocumentRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import consultationRoutes from './src/routes/consultationRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import notificationPreferencesRoutes from './src/routes/notificationPreferencesRoutes.js';
import doctorRoutes from './src/routes/doctorRoutes.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';
import inventoryRoutes from './src/routes/inventory/inventoryRoutes.js';
import refillRoutes from './src/routes/refillRoutes.js';
import chatbotRoutes from './src/routes/chatbotRoutes.js';
import advancedHealthRoutes from './src/routes/advancedHealthRoutes.js';
import medicineRoutes from './src/routes/medicineRoutes.js';
// import advancedSymptomAnalyzerRoutes from './src/routes/advancedSymptomAnalyzer.js';

// Import chat services
import ChatSocketService from './src/services/chat/ChatSocketService.js';
import WebRTCSignalingService from './src/services/webrtc/WebRTCSignalingService.js';
import SymptomMonitoringWebSocketService from './src/services/SymptomMonitoringWebSocketService.js';

// Import notification services
import EnhancedNotificationService from './src/services/notifications/EnhancedNotificationService.js';
import NotificationMiddleware from './src/middleware/NotificationMiddleware.js';
import AdminDashboardWebSocketService from './src/services/AdminDashboardWebSocketService.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with single instance
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize services
let chatSocketService;
let webrtcSignalingService;
let symptomMonitoringService;
let notificationService;
let notificationMiddleware;
let adminDashboardService;

// Generate request ID middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Security middleware (order matters)
app.use(ipFilter); // IP filtering first
app.use(securityHeaders); // Custom security headers
app.use(helmetConfig); // Helmet security middleware
app.use(corsConfig); // CORS configuration
// Apply global rate limiting only outside development to avoid 429s during local work
if (process.env.NODE_ENV !== 'development') {
  app.use(generalLimiter); // Rate limiting
}
app.use(securityLogger); // Security logging

// Data sanitization middleware
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Clean user input from malicious HTML
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/v1/prescription-requests/pharmacy/queue',
      '/api/v1/pharmacies/dashboard/stats',
      '/api/v1/prescription-requests/dev/mock-queue'
    ]
  });
});

// Debug middleware for API routes
app.use('/api', (req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Headers:`, req.headers);
  next();
});

// Add notification middleware to all API routes (will be initialized after services are ready)
app.use('/api', (req, res, next) => {
  if (notificationMiddleware) {
    return notificationMiddleware.middleware()(req, res, next);
  }
  next();
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
// prescription-requests route will be initialized in startServer() after Socket.IO is ready
// app.use('/api/v1/prescription-validation', prescriptionValidationRoutes);
app.use('/api/v1/pharmacies', pharmacyRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
// pharmacy-discovery route will be initialized in startServer() after Socket.IO is ready
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/order-chat', orderChatRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/webrtc', webrtcRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reminders', refillRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notification-preferences', notificationPreferencesRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/advanced-health', advancedHealthRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/medical-documents', medicalDocumentRoutes);
// app.use('/api/v1/symptom-analyzer', advancedSymptomAnalyzerRoutes);
app.use('/api/v1', dashboardRoutes);



// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    // await connectRedis();
    
    // Initialize services with shared Socket.IO instance
    chatSocketService = new ChatSocketService(io);
    console.log('💬 Chat Socket Service initialized');
    
    webrtcSignalingService = new WebRTCSignalingService(io);
    console.log('📹 WebRTC Signaling Service initialized');
    
    // Initialize notification service with WebSocket support
    notificationService = new EnhancedNotificationService({
      webSocketService: chatSocketService,
      emailService: null, // Will be initialized when email service is available
      smsService: null    // Will be initialized when SMS service is available
    });
    console.log('📬 Enhanced Notification Service initialized');
    
    // Initialize notification middleware
    notificationMiddleware = new NotificationMiddleware(notificationService);
    console.log('🔔 Notification Middleware initialized');
    
    // Initialize admin dashboard WebSocket service
    adminDashboardService = new AdminDashboardWebSocketService(io);
    console.log('📊 Admin Dashboard WebSocket Service initialized');
    
    // Initialize symptom monitoring WebSocket service
    symptomMonitoringService = new SymptomMonitoringWebSocketService(io);
    console.log('✅ Symptom monitoring WebSocket service initialized');

    // Make services accessible in routes after initialization
    app.set('chatSocketService', chatSocketService);
    app.set('webrtcSignalingService', webrtcSignalingService);
    app.set('symptomMonitoringService', symptomMonitoringService);
    app.set('notificationService', notificationService);
    app.set('notificationMiddleware', notificationMiddleware);
    
    // Initialize routes that need Socket.IO instance
    const prescriptionRequestRoutes = createPrescriptionRequestRoutes(io);
    app.use('/api/v1/prescription-requests', prescriptionRequestRoutes);
    console.log('💊 Prescription Request Routes initialized with Socket.IO');
    
    const pharmacyDiscoveryRoutes = createPharmacyDiscoveryRoutes(io);
    app.use('/api/v1/pharmacy-discovery', pharmacyDiscoveryRoutes);
    console.log('🏥 Pharmacy Discovery Routes initialized with Socket.IO');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`💬 Socket.io chat service running`);
      console.log(`📞 WebRTC signaling service running`);
      console.log(`🩺 Symptom monitoring WebSocket service running`);
      console.log(`🔌 Connected users: ${chatSocketService.getConnectedUsersCount()}`);
      console.log(`🏠 Active rooms: ${chatSocketService.getActiveRoomsCount()}`);
      console.log(`📞 Active calls: ${webrtcSignalingService.getStats().activeCalls.length}`);
      console.log(`👥 Monitoring sessions: ${symptomMonitoringService.getSessionStats().activeSessions}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  httpServer.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

startServer();

export default app;
