import RealTimeAnalyticsService from './notifications/RealTimeAnalyticsService.js';
import DeliveryMonitoringService from './notifications/DeliveryMonitoringService.js';

/**
 * Admin Dashboard WebSocket Service
 * Handles real-time updates for admin notification monitoring dashboard
 */
class AdminDashboardWebSocketService {
  constructor(io) {
    this.io = io;
    this.adminNamespace = io.of('/admin-dashboard');
    this.connectedAdmins = new Map();
    this.setupEventHandlers();
    this.startPeriodicUpdates();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.adminNamespace.on('connection', (socket) => {
      console.log(`Admin connected to dashboard: ${socket.id}`);

      // Authenticate admin user
      socket.on('authenticate', async (data) => {
        try {
          const { userId, userRole, token } = data;
          
          // Verify admin role (you might want to add proper JWT verification here)
          if (userRole !== 'admin') {
            socket.emit('auth_error', { message: 'Unauthorized: Admin access required' });
            socket.disconnect();
            return;
          }

          // Store admin connection
          this.connectedAdmins.set(socket.id, {
            userId,
            userRole,
            connectedAt: new Date(),
            lastActivity: new Date()
          });

          // Subscribe to real-time analytics
          RealTimeAnalyticsService.subscribe(socket.id, socket, {
            adminDashboard: true
          });

          // Send initial dashboard data
          const initialData = await RealTimeAnalyticsService.getLiveDashboardData();
          socket.emit('initial_dashboard_data', initialData);

          socket.emit('authenticated', { 
            message: 'Successfully connected to admin dashboard',
            connectedAdmins: this.connectedAdmins.size
          });

        } catch (error) {
          console.error('Admin authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle dashboard filter updates
      socket.on('update_filters', (filters) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (admin) {
          admin.filters = filters;
          admin.lastActivity = new Date();
          this.connectedAdmins.set(socket.id, admin);
        }
      });

      // Handle real-time metrics request
      socket.on('request_real_time_metrics', async () => {
        try {
          const metrics = await this.getRealTimeMetrics();
          socket.emit('real_time_metrics', metrics);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch real-time metrics' });
        }
      });

      // Handle system health check request
      socket.on('request_system_health', async () => {
        try {
          const health = await RealTimeAnalyticsService.getSystemHealth();
          socket.emit('system_health', health);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch system health' });
        }
      });

      // Handle performance trends request
      socket.on('request_performance_trends', async (params) => {
        try {
          const { days = 7 } = params || {};
          const trends = await RealTimeAnalyticsService.getPerformanceTrends(days);
          socket.emit('performance_trends', trends);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch performance trends' });
        }
      });

      // Handle alert acknowledgment
      socket.on('acknowledge_alert', async (alertId) => {
        try {
          // Log alert acknowledgment
          console.log(`Alert ${alertId} acknowledged by admin ${socket.id}`);
          
          // Broadcast acknowledgment to other admins
          socket.broadcast.emit('alert_acknowledged', {
            alertId,
            acknowledgedBy: this.connectedAdmins.get(socket.id)?.userId,
            acknowledgedAt: new Date()
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to acknowledge alert' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Admin disconnected from dashboard: ${socket.id}`);
        
        // Unsubscribe from real-time analytics
        RealTimeAnalyticsService.unsubscribe(socket.id);
        
        // Remove from connected admins
        this.connectedAdmins.delete(socket.id);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        const admin = this.connectedAdmins.get(socket.id);
        if (admin) {
          admin.lastActivity = new Date();
          this.connectedAdmins.set(socket.id, admin);
        }
        socket.emit('pong', { timestamp: new Date() });
      });
    });

    // Listen for performance alerts from monitoring services
    RealTimeAnalyticsService.on('performance_alert', (alert) => {
      this.broadcastAlert(alert);
    });

    DeliveryMonitoringService.on('delivery_alert', (alert) => {
      this.broadcastAlert(alert);
    });
  }

  /**
   * Start periodic updates to connected admins
   */
  startPeriodicUpdates() {
    // Send dashboard updates every 30 seconds
    setInterval(async () => {
      if (this.connectedAdmins.size > 0) {
        try {
          const dashboardData = await RealTimeAnalyticsService.getLiveDashboardData();
          this.adminNamespace.emit('dashboard_update', dashboardData);
        } catch (error) {
          console.error('Error sending periodic dashboard update:', error);
        }
      }
    }, 30000);

    // Send system health updates every 2 minutes
    setInterval(async () => {
      if (this.connectedAdmins.size > 0) {
        try {
          const systemHealth = await RealTimeAnalyticsService.getSystemHealth();
          this.adminNamespace.emit('system_health_update', systemHealth);
        } catch (error) {
          console.error('Error sending system health update:', error);
        }
      }
    }, 120000);

    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000);
  }

  /**
   * Broadcast alert to all connected admins
   */
  broadcastAlert(alert) {
    this.adminNamespace.emit('notification_alert', {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      broadcastAt: new Date()
    });
  }

  /**
   * Get real-time metrics for dashboard
   */
  async getRealTimeMetrics() {
    const [
      realTimeMetrics,
      systemHealth,
      monitoringStatus
    ] = await Promise.all([
      RealTimeAnalyticsService.getRealTimeMetrics(),
      RealTimeAnalyticsService.getSystemHealth(),
      DeliveryMonitoringService.getCurrentStatus()
    ]);

    return {
      realTime: realTimeMetrics,
      systemHealth,
      monitoring: monitoringStatus,
      timestamp: new Date()
    };
  }

  /**
   * Send custom message to specific admin
   */
  sendToAdmin(adminSocketId, event, data) {
    const socket = this.adminNamespace.sockets.get(adminSocketId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Send custom message to all connected admins
   */
  broadcastToAllAdmins(event, data) {
    this.adminNamespace.emit(event, data);
  }

  /**
   * Get connected admins count
   */
  getConnectedAdminsCount() {
    return this.connectedAdmins.size;
  }

  /**
   * Get connected admins info
   */
  getConnectedAdminsInfo() {
    const admins = [];
    for (const [socketId, adminInfo] of this.connectedAdmins.entries()) {
      admins.push({
        socketId,
        userId: adminInfo.userId,
        connectedAt: adminInfo.connectedAt,
        lastActivity: adminInfo.lastActivity,
        filters: adminInfo.filters || {}
      });
    }
    return admins;
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    for (const [socketId, adminInfo] of this.connectedAdmins.entries()) {
      if (adminInfo.lastActivity < fiveMinutesAgo) {
        const socket = this.adminNamespace.sockets.get(socketId);
        if (socket) {
          socket.disconnect();
        }
        this.connectedAdmins.delete(socketId);
        RealTimeAnalyticsService.unsubscribe(socketId);
        console.log(`Cleaned up inactive admin connection: ${socketId}`);
      }
    }
  }

  /**
   * Force disconnect all admins (for maintenance)
   */
  disconnectAllAdmins(reason = 'Server maintenance') {
    this.adminNamespace.emit('force_disconnect', { reason });
    
    for (const [socketId] of this.connectedAdmins.entries()) {
      const socket = this.adminNamespace.sockets.get(socketId);
      if (socket) {
        socket.disconnect();
      }
    }
    
    this.connectedAdmins.clear();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedAdmins: this.connectedAdmins.size,
      totalConnections: this.adminNamespace.sockets.size,
      uptime: process.uptime(),
      lastUpdate: new Date()
    };
  }
}

export default AdminDashboardWebSocketService;