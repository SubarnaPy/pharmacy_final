/**
 * Advanced Notification Service
 * Integrates with the backend Advanced Notification System
 * Handles real-time notifications, preferences, and multi-channel delivery
 */

import io from 'socket.io-client';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';
import notificationSoundService from './notificationSoundService';

class AdvancedNotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.notificationQueue = [];
    this.isOnline = navigator.onLine;
    
    // Initialize service
    this.init();
  }

  /**
   * Initialize the notification service
   */
  async init() {
    try {
      // Setup online/offline detection
      this.setupOnlineOfflineHandlers();
      
      // Connect to WebSocket if user is authenticated
      const token = localStorage.getItem('token');
      if (token) {
        await this.connect();
      }
      
      // Request notification permissions
      await this.requestNotificationPermission();
      
      console.log('✅ Advanced Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Notification Service:', error);
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      return;
    }

    try {
      this.socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
      });

      this.setupSocketEventHandlers();
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.handleReconnection();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupSocketEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user-specific room
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role) {
        this.socket.emit('join_room', { room: user.role });
      }
      
      // Process queued notifications
      this.processNotificationQueue();
      
      // Emit connection event
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
      this.handleReconnection();
    });

    // Notification events
    this.socket.on('notification', (data) => {
      console.log('📨 New notification received:', data);
      this.handleIncomingNotification(data);
    });

    this.socket.on('notification_read', (data) => {
      console.log('👁️ Notification marked as read:', data.notificationId);
      this.emit('notification_read', data);
    });

    this.socket.on('bulk_notification', (data) => {
      console.log('📨 Bulk notifications received:', data);
      data.notifications.forEach(notification => {
        this.handleIncomingNotification(notification);
      });
    });

    // System events
    this.socket.on('system_announcement', (data) => {
      console.log('📢 System announcement:', data);
      this.handleSystemAnnouncement(data);
    });
  }

  /**
   * Handle incoming notifications
   */
  handleIncomingNotification(notification) {
    // Store notification locally
    this.storeNotificationLocally(notification);
    
    // Show browser notification if permitted
    this.showBrowserNotification(notification);
    
    // Show toast notification
    this.showToastNotification(notification);
    
    // Play notification sound
    this.playNotificationSound(notification);
    
    // Emit to listeners
    this.emit('notification_received', notification);
  }

  /**
   * Handle system announcements
   */
  handleSystemAnnouncement(announcement) {
    toast.info(announcement.message, {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      className: 'system-announcement-toast'
    });
    
    this.emit('system_announcement', announcement);
  }

  /**
   * Store notification in local storage for offline access
   */
  storeNotificationLocally(notification) {
    try {
      const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
      stored.unshift(notification);
      
      // Keep only last 100 notifications
      const trimmed = stored.slice(0, 100);
      localStorage.setItem('notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to store notification locally:', error);
    }
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(notification) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/notification-icon.png',
        badge: '/notification-badge.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'critical',
        silent: notification.priority === 'low'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto close after 10 seconds unless it's critical
      if (notification.priority !== 'critical') {
        setTimeout(() => browserNotification.close(), 10000);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Show toast notification
   */
  showToastNotification(notification) {
    const toastOptions = {
      autoClose: this.getToastDuration(notification.priority),
      closeOnClick: true,
      pauseOnHover: true,
      onClick: () => {
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      }
    };

    switch (notification.priority) {
      case 'critical':
        toast.error(`${notification.title}: ${notification.message}`, toastOptions);
        break;
      case 'high':
        toast.warning(`${notification.title}: ${notification.message}`, toastOptions);
        break;
      case 'medium':
        toast.info(`${notification.title}: ${notification.message}`, toastOptions);
        break;
      default:
        toast(`${notification.title}: ${notification.message}`, toastOptions);
    }
  }

  /**
   * Play notification sound
   */
  async playNotificationSound(notification) {
    try {
      await notificationSoundService.playNotificationSound(notification);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  /**
   * Get toast duration based on priority
   */
  getToastDuration(priority) {
    switch (priority) {
      case 'critical': return false; // Don't auto-close
      case 'high': return 10000;
      case 'medium': return 7000;
      default: return 5000;
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Setup online/offline handlers
   */
  setupOnlineOfflineHandlers() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.isOnline = true;
      this.connect();
      this.processNotificationQueue();
      this.emit('online');
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline');
      this.isOnline = false;
      this.emit('offline');
    });
  }

  /**
   * Process queued notifications when back online
   */
  processNotificationQueue() {
    if (!this.isOnline || this.notificationQueue.length === 0) {
      return;
    }

    console.log(`📤 Processing ${this.notificationQueue.length} queued notifications`);
    
    this.notificationQueue.forEach(notification => {
      this.handleIncomingNotification(notification);
    });
    
    this.notificationQueue = [];
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // API Methods

  /**
   * Fetch user notifications
   */
  async fetchNotifications(options = {}) {
    try {
      const params = new URLSearchParams({
        page: options.page || 1,
        limit: options.limit || 20,
        status: options.status || 'all',
        ...options.filters
      });

      const response = await apiClient.get(`/notifications/user?${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      
      // Emit via WebSocket for real-time sync
      if (this.socket?.connected) {
        this.socket.emit('mark_read', { notificationId });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      await apiClient.put('/notifications/read-all');
      this.emit('all_notifications_read');
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences() {
    try {
      const response = await apiClient.get('/notification-preferences');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await apiClient.put('/notification-preferences', preferences);
      this.emit('preferences_updated', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(channels = ['websocket']) {
    try {
      const response = await apiClient.post('/notifications/test', { channels });
      return response.data;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  // Event System

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Utility Methods

  /**
   * Get connection status
   */
  isConnectedToServer() {
    return this.isConnected && this.socket?.connected;
  }

  /**
   * Get unread notification count from local storage
   */
  getUnreadCount() {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      return notifications.filter(n => !n.readAt).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    console.log('🔌 Disconnected from notification service');
  }

  /**
   * Cleanup service
   */
  destroy() {
    this.disconnect();
    this.listeners.clear();
    this.notificationQueue = [];
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create singleton instance
const advancedNotificationService = new AdvancedNotificationService();

export default advancedNotificationService;
