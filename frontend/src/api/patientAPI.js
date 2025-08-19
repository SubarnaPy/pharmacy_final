import apiClient from './apiClient.js';

// User Profile APIs
export const userAPI = {
  // Get user profile
  getProfile: () => apiClient.get('/users/profile'),
  
  // Update user profile
  updateProfile: (profileData) => apiClient.put('/users/profile', profileData),
  
  // Get health history
  getHealthHistory: () => apiClient.get('/users/health-history'),
  
  // Add health history record
  addHealthHistory: (record) => apiClient.post('/users/health-history', record),
  
  // Update health history record
  updateHealthHistory: (recordId, updates) => apiClient.put(`/users/health-history/${recordId}`, updates),
  
  // Delete health history record
  deleteHealthHistory: (recordId) => apiClient.delete(`/users/health-history/${recordId}`),
  
  // Upload avatar
  uploadAvatar: (formData) => apiClient.post('/users/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Prescription APIs
export const prescriptionAPI = {
  // Process single prescription
  processPrescription: (formData) => apiClient.post('/prescriptions/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Process prescription and create pharmacy request
  processAndCreateRequest: (formData) => apiClient.post('/prescriptions/process-and-request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Submit prescription request to pharmacies
  submitPrescriptionRequest: (requestId) => apiClient.post(`/prescriptions/requests/${requestId}/submit`),
  
  // Get prescription history
  getHistory: (params = {}) => apiClient.get('/prescriptions/history', { params }),
  
  // Get prescription stats
  getStats: () => apiClient.get('/prescriptions/stats'),
  
  // Get specific prescription result
  getResult: (processingId) => apiClient.get(`/prescriptions/${processingId}`),
  
  // Get recent prescriptions (dashboard)
  getRecent: () => apiClient.get('/prescriptions/recent')
};

// Pharmacy APIs
export const pharmacyAPI = {
  // Search nearby pharmacies
  searchNearby: (params) => apiClient.get('/pharmacies/search', { params }),
  
  // Get nearby pharmacies
  getNearby: (params) => apiClient.get('/pharmacies/nearby', { params }),
  
  // Get pharmacy details
  getDetails: (pharmacyId) => apiClient.get(`/pharmacies/${pharmacyId}`)
};

// Consultation APIs
export const consultationAPI = {
  // Request consultation
  requestConsultation: (data) => apiClient.post('/consultations', data),
  
  // Get all consultations
  getConsultations: () => apiClient.get('/consultations'),
  
  // Get specific consultation
  getConsultation: (id) => apiClient.get(`/consultations/${id}`),
  
  // Cancel consultation
  cancelConsultation: (id) => apiClient.put(`/consultations/${id}/cancel`)
};

// Refill Reminder APIs
export const reminderAPI = {
  // Schedule reminder
  scheduleReminder: (data) => apiClient.post('/reminders', data),
  
  // Get all reminders
  getReminders: () => apiClient.get('/reminders'),
  
  // Cancel reminder
  cancelReminder: (id) => apiClient.put(`/reminders/${id}/cancel`)
};

// Order APIs
export const orderAPI = {
  // Get order history
  getHistory: (params = {}) => apiClient.get('/orders', { params }),
  
  // Get specific order
  getOrder: (orderId) => apiClient.get(`/orders/${orderId}`),
  
  // Track order
  trackOrder: (orderId) => apiClient.get(`/orders/${orderId}/track`)
};

// Payment APIs
export const paymentAPI = {
  // Create payment intent
  createPaymentIntent: (data) => apiClient.post('/payments/create-intent', data),
  
  // Confirm payment
  confirmPayment: (data) => apiClient.post('/payments/confirm', data),
  
  // Get payment history
  getPaymentHistory: (params = {}) => apiClient.get('/payments/history', { params })
};

// Dashboard APIs
export const dashboardAPI = {
  // Get quick stats
  getQuickStats: () => apiClient.get('/stats/quick'),
  
  // Get recent prescriptions
  getRecentPrescriptions: () => apiClient.get('/prescriptions/recent'),
  
  // Get upcoming appointments
  getUpcomingAppointments: () => apiClient.get('/appointments/upcoming')
};

// Chat APIs
export const chatAPI = {
  // Start chat with pharmacy
  startChat: (pharmacyId) => apiClient.post('/chat/start', { pharmacyId }),
  
  // Get chat messages
  getMessages: (chatId, params = {}) => apiClient.get(`/chat/${chatId}/messages`, { params }),
  
  // Send message
  sendMessage: (chatId, message) => apiClient.post(`/chat/${chatId}/messages`, { message }),
  
  // Get user chats
  getUserChats: () => apiClient.get('/chat/user-chats')
};

export default {
  userAPI,
  prescriptionAPI,
  pharmacyAPI,
  consultationAPI,
  reminderAPI,
  orderAPI,
  paymentAPI,
  dashboardAPI,
  chatAPI
};
