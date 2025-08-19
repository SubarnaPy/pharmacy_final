import apiClient from '../../api/apiClient';

// Fetch notifications with advanced filtering options
export const fetchNotificationsAPI = (options = {}) => {
  const params = new URLSearchParams();
  
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.status) params.append('status', options.status);
  if (options.category) params.append('category', options.category);
  if (options.priority) params.append('priority', options.priority);
  if (options.type) params.append('type', options.type);
  if (options.dateRange) params.append('dateRange', options.dateRange);
  if (options.search) params.append('search', options.search);
  
  const queryString = params.toString();
  return apiClient.get(`/notifications/user${queryString ? `?${queryString}` : ''}`);
};

// Mark single notification as read
export const markNotificationReadAPI = (id) => 
  apiClient.put(`/notifications/${id}/read`);

// Mark all notifications as read
export const markAllNotificationsReadAPI = () => 
  apiClient.put('/notifications/read-all');

// Delete notification
export const deleteNotificationAPI = (id) => 
  apiClient.delete(`/notifications/${id}`);

// Get notification preferences
export const getNotificationPreferencesAPI = () => 
  apiClient.get('/notification-preferences');

// Update notification preferences
export const updateNotificationPreferencesAPI = (preferences) => 
  apiClient.put('/notification-preferences', preferences);

// Send test notification
export const sendTestNotificationAPI = (channels = ['websocket']) => 
  apiClient.post('/notifications/test', { channels });

// Get notification analytics (for admin)
export const getNotificationAnalyticsAPI = (filters = {}) => {
  const params = new URLSearchParams(filters);
  return apiClient.get(`/admin/notifications/analytics?${params}`);
};

// Admin: Send bulk notification
export const sendBulkNotificationAPI = (notificationData) => 
  apiClient.post('/admin/notifications/bulk', notificationData);

// Admin: Get system notification stats
export const getSystemNotificationStatsAPI = () => 
  apiClient.get('/admin/notifications/stats');
