/**
 * Advanced Notifications Hook
 * React hook for managing advanced notification system integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import advancedNotificationService from '../services/advancedNotificationService';

export const useAdvancedNotifications = (options = {}) => {
  const {
    autoConnect = true,
    enableBrowserNotifications = true,
    enableSounds = true,
    pollInterval = 30000, // 30 seconds
    maxRetries = 3
  } = options;

  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const retryCountRef = useRef(0);
  const pollIntervalRef = useRef(null);

  // Initialize service and setup event listeners
  useEffect(() => {
    const setupEventListeners = () => {
      // Connection events
      advancedNotificationService.on('connected', () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        retryCountRef.current = 0;
      });

      advancedNotificationService.on('disconnected', (reason) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setError(`Disconnected: ${reason}`);
      });

      advancedNotificationService.on('connection_failed', () => {
        setConnectionStatus('failed');
        setError('Failed to connect to notification service');
      });

      // Notification events
      advancedNotificationService.on('notification_received', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      advancedNotificationService.on('notification_read', (data) => {
        setNotifications(prev => 
          prev.map(n => 
            n.id === data.notificationId 
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });

      advancedNotificationService.on('all_notifications_read', () => {
        setNotifications(prev => 
          prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      });

      // System events
      advancedNotificationService.on('system_announcement', (announcement) => {
        // Handle system announcements
        console.log('System announcement received:', announcement);
      });

      // Network events
      advancedNotificationService.on('online', () => {
        setConnectionStatus('connected');
        fetchNotifications();
      });

      advancedNotificationService.on('offline', () => {
        setConnectionStatus('offline');
      });

      // Preferences events
      advancedNotificationService.on('preferences_updated', (newPreferences) => {
        setPreferences(newPreferences);
      });
    };

    setupEventListeners();

    // Auto-connect if enabled
    if (autoConnect) {
      advancedNotificationService.connect();
    }

    // Setup polling for fallback
    if (pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        if (!isConnected) {
          fetchNotifications();
        }
      }, pollInterval);
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [autoConnect, isConnected, pollInterval]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await advancedNotificationService.fetchNotifications(options);
      setNotifications(response.notifications || []);
      setUnreadCount(response.notifications?.filter(n => !n.readAt).length || 0);
      
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notifications';
      setError(errorMessage);
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => fetchNotifications(options), 1000 * retryCountRef.current);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [maxRetries]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await advancedNotificationService.markAsRead(notificationId);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await advancedNotificationService.markAllAsRead();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await advancedNotificationService.getPreferences();
      setPreferences(prefs);
      return prefs;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      const updated = await advancedNotificationService.updatePreferences(newPreferences);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async (channels = ['websocket']) => {
    try {
      return await advancedNotificationService.sendTestNotification(channels);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Connect to notification service
  const connect = useCallback(() => {
    setConnectionStatus('connecting');
    advancedNotificationService.connect();
  }, []);

  // Disconnect from notification service
  const disconnect = useCallback(() => {
    advancedNotificationService.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Filter notifications
  const getFilteredNotifications = useCallback((filter = 'all') => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.readAt);
      case 'read':
        return notifications.filter(n => n.readAt);
      case 'high':
        return notifications.filter(n => n.priority === 'high' || n.priority === 'critical');
      case 'medical':
        return notifications.filter(n => n.category === 'medical');
      case 'administrative':
        return notifications.filter(n => n.category === 'administrative');
      default:
        return notifications;
    }
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Get notifications by priority
  const getNotificationsByPriority = useCallback((priority) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh notifications
  const refresh = useCallback(() => {
    return fetchNotifications();
  }, [fetchNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,
    preferences,
    connectionStatus,

    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loadPreferences,
    updatePreferences,
    sendTestNotification,
    connect,
    disconnect,
    clearError,
    refresh,

    // Utilities
    getFilteredNotifications,
    getNotificationsByType,
    getNotificationsByPriority,

    // Service instance (for advanced usage)
    service: advancedNotificationService
  };
};

// Hook for notification preferences management
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const prefs = await advancedNotificationService.getPreferences();
      setPreferences(prefs);
      return prefs;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = await advancedNotificationService.updatePreferences(updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateChannelPreference = useCallback(async (channel, enabled) => {
    if (!preferences) return;

    const updates = {
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: { ...preferences.channels[channel], enabled }
      }
    };

    return updatePreferences(updates);
  }, [preferences, updatePreferences]);

  const updateCategoryPreference = useCallback(async (category, settings) => {
    if (!preferences) return;

    const updates = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: { ...preferences.categories[category], ...settings }
      }
    };

    return updatePreferences(updates);
  }, [preferences, updatePreferences]);

  const updateQuietHours = useCallback(async (quietHours) => {
    if (!preferences) return;

    const updates = {
      ...preferences,
      globalSettings: {
        ...preferences.globalSettings,
        quietHours
      }
    };

    return updatePreferences(updates);
  }, [preferences, updatePreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    loadPreferences,
    updatePreferences,
    updateChannelPreference,
    updateCategoryPreference,
    updateQuietHours
  };
};

// Hook for real-time connection status
export const useNotificationConnection = () => {
  const [status, setStatus] = useState('disconnected');
  const [lastConnected, setLastConnected] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleConnected = () => {
      setStatus('connected');
      setLastConnected(new Date());
      setReconnectAttempts(0);
    };

    const handleDisconnected = () => {
      setStatus('disconnected');
    };

    const handleConnecting = () => {
      setStatus('connecting');
      setReconnectAttempts(prev => prev + 1);
    };

    const handleConnectionFailed = () => {
      setStatus('failed');
    };

    advancedNotificationService.on('connected', handleConnected);
    advancedNotificationService.on('disconnected', handleDisconnected);
    advancedNotificationService.on('connecting', handleConnecting);
    advancedNotificationService.on('connection_failed', handleConnectionFailed);

    return () => {
      advancedNotificationService.off('connected', handleConnected);
      advancedNotificationService.off('disconnected', handleDisconnected);
      advancedNotificationService.off('connecting', handleConnecting);
      advancedNotificationService.off('connection_failed', handleConnectionFailed);
    };
  }, []);

  return {
    status,
    lastConnected,
    reconnectAttempts,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasFailed: status === 'failed'
  };
};

export default useAdvancedNotifications;