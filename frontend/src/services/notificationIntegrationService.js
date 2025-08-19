/**
 * Notification Integration Service
 * Bridges Redux store with advanced notification service
 */

import { store } from '../store';
import {
  notificationReceived,
  notificationReadReceived,
  allNotificationsReadReceived,
  setConnectionStatus,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../features/notification/notificationSlice';
import advancedNotificationService from './advancedNotificationService';

class NotificationIntegrationService {
  constructor() {
    this.initialized = false;
    this.setupEventListeners();
  }

  /**
   * Initialize the integration service
   */
  init() {
    if (this.initialized) return;

    // Connect Redux store with advanced notification service
    this.setupReduxIntegration();
    this.initialized = true;
    
    console.log('✅ Notification Integration Service initialized');
  }

  /**
   * Setup event listeners for advanced notification service
   */
  setupEventListeners() {
    // Connection status events
    advancedNotificationService.on('connected', () => {
      store.dispatch(setConnectionStatus('connected'));
    });

    advancedNotificationService.on('disconnected', () => {
      store.dispatch(setConnectionStatus('disconnected'));
    });

    advancedNotificationService.on('connecting', () => {
      store.dispatch(setConnectionStatus('connecting'));
    });

    advancedNotificationService.on('connection_failed', () => {
      store.dispatch(setConnectionStatus('failed'));
    });

    advancedNotificationService.on('offline', () => {
      store.dispatch(setConnectionStatus('offline'));
    });

    advancedNotificationService.on('online', () => {
      store.dispatch(setConnectionStatus('connected'));
    });

    // Notification events
    advancedNotificationService.on('notification_received', (notification) => {
      store.dispatch(notificationReceived(notification));
    });

    advancedNotificationService.on('notification_read', (data) => {
      store.dispatch(notificationReadReceived(data));
    });

    advancedNotificationService.on('all_notifications_read', () => {
      store.dispatch(allNotificationsReadReceived());
    });

    // System events
    advancedNotificationService.on('system_announcement', (announcement) => {
      // Handle system announcements
      store.dispatch(notificationReceived({
        id: `system_${Date.now()}`,
        type: 'system_announcement',
        category: 'system',
        priority: 'high',
        title: 'System Announcement',
        message: announcement.message,
        createdAt: new Date().toISOString(),
        readAt: null
      }));
    });
  }

  /**
   * Setup Redux integration
   */
  setupReduxIntegration() {
    // Subscribe to Redux store changes
    let previousState = store.getState().notification;

    store.subscribe(() => {
      const currentState = store.getState().notification;
      
      // Handle state changes that need to sync with service
      if (previousState.connectionStatus !== currentState.connectionStatus) {
        this.handleConnectionStatusChange(currentState.connectionStatus);
      }

      previousState = currentState;
    });
  }

  /**
   * Handle connection status changes
   */
  handleConnectionStatusChange(status) {
    console.log(`🔔 Notification connection status changed: ${status}`);
    
    // Perform actions based on connection status
    switch (status) {
      case 'connected':
        // Fetch latest notifications when connected
        store.dispatch(fetchNotifications());
        break;
      case 'disconnected':
        // Handle disconnection
        break;
      case 'failed':
        // Handle connection failure
        break;
    }
  }

  /**
   * Get current notification state from Redux
   */
  getNotificationState() {
    return store.getState().notification;
  }

  /**
   * Dispatch notification actions
   */
  async fetchNotifications(options = {}) {
    return store.dispatch(fetchNotifications(options));
  }

  async markAsRead(notificationId) {
    return store.dispatch(markNotificationRead(notificationId));
  }

  async markAllAsRead() {
    return store.dispatch(markAllNotificationsRead());
  }

  /**
   * Get notification statistics
   */
  getNotificationStats() {
    const state = this.getNotificationState();
    
    return {
      total: state.list.length,
      unread: state.unreadCount,
      read: state.list.length - state.unreadCount,
      byCategory: this.getNotificationsByCategory(),
      byPriority: this.getNotificationsByPriority(),
      recentActivity: this.getRecentActivity()
    };
  }

  /**
   * Get notifications grouped by category
   */
  getNotificationsByCategory() {
    const state = this.getNotificationState();
    const categories = {};

    state.list.forEach(notification => {
      const category = notification.category || 'other';
      if (!categories[category]) {
        categories[category] = { total: 0, unread: 0 };
      }
      categories[category].total++;
      if (!notification.readAt) {
        categories[category].unread++;
      }
    });

    return categories;
  }

  /**
   * Get notifications grouped by priority
   */
  getNotificationsByPriority() {
    const state = this.getNotificationState();
    const priorities = {};

    state.list.forEach(notification => {
      const priority = notification.priority || 'medium';
      if (!priorities[priority]) {
        priorities[priority] = { total: 0, unread: 0 };
      }
      priorities[priority].total++;
      if (!notification.readAt) {
        priorities[priority].unread++;
      }
    });

    return priorities;
  }

  /**
   * Get recent notification activity
   */
  getRecentActivity(hours = 24) {
    const state = this.getNotificationState();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return state.list.filter(notification => 
      new Date(notification.createdAt) > cutoff
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Check if user has unread critical notifications
   */
  hasCriticalNotifications() {
    const state = this.getNotificationState();
    
    return state.list.some(notification => 
      !notification.readAt && 
      (notification.priority === 'critical' || notification.priority === 'high')
    );
  }

  /**
   * Get notification summary for dashboard widgets
   */
  getDashboardSummary() {
    const stats = this.getNotificationStats();
    const hasCritical = this.hasCriticalNotifications();
    const recentActivity = this.getRecentActivity(24);

    return {
      unreadCount: stats.unread,
      totalCount: stats.total,
      hasCritical,
      recentCount: recentActivity.length,
      categories: stats.byCategory,
      priorities: stats.byPriority,
      connectionStatus: this.getNotificationState().connectionStatus
    };
  }

  /**
   * Cleanup service
   */
  destroy() {
    this.initialized = false;
    // Remove event listeners if needed
    console.log('🔔 Notification Integration Service destroyed');
  }
}

// Create singleton instance
const notificationIntegrationService = new NotificationIntegrationService();

export default notificationIntegrationService;