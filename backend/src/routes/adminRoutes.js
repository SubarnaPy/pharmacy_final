import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import adminController from '../controllers/adminController.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';
import { validateAdminAction } from '../middleware/validationMiddleware.js';

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(adminOnly);

// Dashboard and Analytics Routes
router.get('/dashboard/stats', asyncHandler(adminController.getDashboardStats));
router.get('/analytics', asyncHandler(adminController.getAnalytics));
router.get('/system/metrics', asyncHandler(adminController.getSystemMetrics));
router.get('/audit-logs', asyncHandler(adminController.getAuditLogs));

// Notification Monitoring Routes
router.get('/notifications/dashboard', asyncHandler(adminController.getNotificationDashboard));
router.get('/notifications/analytics', asyncHandler(adminController.getNotificationAnalytics));
router.get('/notifications/health', asyncHandler(adminController.getNotificationSystemHealth));
router.get('/notifications/delivery-report', asyncHandler(adminController.getDeliveryReport));
router.get('/notifications/performance-trends', asyncHandler(adminController.getPerformanceTrends));
router.get('/notifications/real-time-metrics', asyncHandler(adminController.getRealTimeNotificationMetrics));
router.post('/notifications/alert-thresholds', validateAdminAction, asyncHandler(adminController.updateAlertThresholds));

// Alert Management Routes
router.get('/alerts/active', asyncHandler(adminController.getActiveAlerts));
router.get('/alerts/history', asyncHandler(adminController.getAlertHistory));
router.get('/alerts/statistics', asyncHandler(adminController.getAlertStatistics));
router.post('/alerts/:alertId/acknowledge', validateAdminAction, asyncHandler(adminController.acknowledgeAlert));
router.post('/alerts/:alertId/resolve', validateAdminAction, asyncHandler(adminController.resolveAlert));
router.get('/alerts/escalation-rules', asyncHandler(adminController.getEscalationRules));
router.put('/alerts/escalation-rules/:alertType', validateAdminAction, asyncHandler(adminController.updateEscalationRule));

// User Management Routes
router.get('/users', asyncHandler(adminController.getAllUsers));
router.get('/users/:userId', asyncHandler(adminController.getUserDetails));
router.patch('/users/:userId', validateAdminAction, asyncHandler(adminController.updateUser));
router.patch('/users/:userId/suspend', validateAdminAction, asyncHandler(adminController.suspendUser));
router.delete('/users/:userId', validateAdminAction, asyncHandler(adminController.deleteUser));

// Pharmacy Management Routes
router.get('/pharmacies/pending', asyncHandler(adminController.getPendingPharmacies));
router.patch('/pharmacies/:pharmacyId/approve', validateAdminAction, asyncHandler(adminController.approvePharmacy));
router.patch('/pharmacies/:pharmacyId/reject', validateAdminAction, asyncHandler(adminController.rejectPharmacy));

export default router;
