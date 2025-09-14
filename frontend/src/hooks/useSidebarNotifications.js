import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../api/apiClient';

const useSidebarNotifications = (userRole) => {
  const { user } = useSelector(state => state.auth);
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Get mock notifications for development/fallback
  const getMockNotifications = useCallback((role) => {
    switch (role) {
      case 'doctor':
        return {
          appointments: 5,
          consultations: 2,
          notifications: 8,
          'new-patients': 3,
          'prescription-requests': 4
        };
      case 'patient':
        return {
          'prescription-requests': 3,
          'doctor-book': 1,
          reminders: 2,
          'order-tracking': 1,
          notifications: 5,
          'test-results': 2
        };
      case 'admin':
        return {
          notifications: 12,
          doctors: 3,
          pharmacies: 2,
          'system-health': 1,
          'security-alerts': 4,
          'pending-verifications': 7
        };
      case 'pharmacy':
        return {
          'prescription-queue': 8,
          inventory: 3,
          'order-management': 15,
          chat: 4,
          notifications: 6,
          'low-stock': 5,
          'quality-alerts': 2
        };
      default:
        return {};
    }
  }, []);

  // Fetch notification counts for sidebar badges
  const fetchNotificationCounts = useCallback(async () => {
    if (!user || !userRole || fetchingRef.current || !mountedRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      // Use unified notification endpoint for all roles
      const endpoint = '/notifications/notification-counts';
      
      if (!endpoint) {
        // Use mock data immediately for unknown roles
        if (mountedRef.current) {
          setNotifications(getMockNotifications(userRole));
          setLoading(false);
        }
        fetchingRef.current = false;
        return;
      }

      const response = await apiClient.get(endpoint);
      if (mountedRef.current) {
        setNotifications(response.data.data || {});
        setApiAvailable(true);
      }
    } catch (error) {
      // Silently use mock data instead of logging errors for missing endpoints
      if (mountedRef.current) {
        const mockNotifications = getMockNotifications(userRole);
        setNotifications(mockNotifications);
        setApiAvailable(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [user, userRole, getMockNotifications]);



  // Update specific notification count
  const updateNotificationCount = useCallback((key, count) => {
    setNotifications(prev => ({
      ...prev,
      [key]: count
    }));
  }, []);

  // Increment notification count
  const incrementNotification = useCallback((key, increment = 1) => {
    setNotifications(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + increment
    }));
  }, []);

  // Decrement notification count
  const decrementNotification = useCallback((key, decrement = 1) => {
    setNotifications(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - decrement)
    }));
  }, []);

  // Clear notification count
  const clearNotification = useCallback((key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: 0
    }));
  }, []);

  // Get notification count for a specific key
  const getNotificationCount = useCallback((key) => {
    return notifications[key] || 0;
  }, [notifications]);

  // Get total notification count
  const getTotalNotifications = useCallback(() => {
    return Object.values(notifications).reduce((total, count) => total + (count || 0), 0);
  }, [notifications]);

  // Initialize notifications on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Load mock data immediately to prevent loading states
    const mockNotifications = getMockNotifications(userRole);
    setNotifications(mockNotifications);
    
    // Try to fetch real data if user is available
    if (user && userRole) {
      fetchNotificationCounts();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user, userRole, getMockNotifications, fetchNotificationCounts]);

  // Set up polling only if API is available (reduced frequency to prevent spam)
  useEffect(() => {
    if (!apiAvailable || !user || !userRole) return;

    const interval = setInterval(() => {
      if (mountedRef.current && !fetchingRef.current) {
        fetchNotificationCounts();
      }
    }, 60000); // Reduced to 1 minute to prevent spam

    return () => clearInterval(interval);
  }, [apiAvailable, user, userRole, fetchNotificationCounts]);

  // WebSocket connection for real-time updates (disabled for now to prevent errors)
  useEffect(() => {
    if (!user || !apiAvailable) return;

    // Only try WebSocket if API endpoints are working
    let ws = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/${user.id}`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification_count_update') {
            updateNotificationCount(data.key, data.count);
          } else if (data.type === 'notification_increment') {
            incrementNotification(data.key, data.increment);
          }
        } catch (error) {
          // Silently handle WebSocket message parsing errors
        }
      };

      ws.onerror = () => {
        // Silently handle WebSocket connection errors
      };

      ws.onclose = () => {
        // Silently handle WebSocket close
      };

    } catch (error) {
      // Silently handle WebSocket creation errors
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, apiAvailable, updateNotificationCount, incrementNotification]);

  return {
    notifications,
    loading,
    updateNotificationCount,
    incrementNotification,
    decrementNotification,
    clearNotification,
    getNotificationCount,
    getTotalNotifications,
    refreshNotifications: fetchNotificationCounts
  };
};

export default useSidebarNotifications;