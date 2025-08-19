/**
 * Simple Notification Hook
 * A simpler version that uses REST API instead of WebSocket
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../api/apiClient';

export const useSimpleNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, isAuthenticated } = useSelector(state => state.auth);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching notifications for user:', user._id);
      
      const response = await apiClient.get('/notifications/user');
      
      if (response.data && response.data.success) {
        const responseData = response.data.data || {};
        const fetchedNotifications = responseData.notifications || [];
        const summary = responseData.summary || {};
        
        console.log('✅ Fetched notifications:', fetchedNotifications);
        
        setNotifications(fetchedNotifications);
        setUnreadCount(summary.unreadCount || 0);
      } else {
        console.error('❌ API response error:', response.data);
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('❌ Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?._id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);
      
      await apiClient.post(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ Notification marked as read');
    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?._id) return;

    try {
      console.log('📖 Marking all notifications as read');
      
      await apiClient.post('/notifications/mark-all-read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          isRead: true, 
          readAt: new Date() 
        }))
      );
      
      setUnreadCount(0);
      
      console.log('✅ All notifications marked as read');
    } catch (err) {
      console.error('❌ Error marking all notifications as read:', err);
    }
  }, [user?._id]);

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      fetchNotifications();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?._id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    connectionStatus: isAuthenticated ? 'connected' : 'disconnected',
    markAsRead,
    markAllAsRead,
    refresh,
    clearError: () => setError(null)
  };
};
