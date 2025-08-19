import apiClient from './apiClient.js';

// API configuration
// const API_BASE_URL = 'http://localhost:5000/api/v1';

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    console.log(response);
    return response.data;
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  verify2FA: async ({ twoFactorCode, email, password }) => {
    const response = await apiClient.post('/auth/login', { 
      email, 
      password, 
      twoFactorCode 
    });
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/user/profile', profileData);
    return response.data;
  },
};

// Prescription API
export const prescriptionAPI = {
  upload: async (formData) => {
    const response = await apiClient.post('/prescriptions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get('/prescriptions');
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/prescriptions/${id}`);
    return response.data;
  },
};

// Pharmacy API
export const pharmacyAPI = {
  getNearby: async (lat, lng, radius = 10) => {
    const response = await apiClient.get(`/pharmacies/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  },

  search: async (query) => {
    const response = await apiClient.get(`/pharmacies/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export default {
  authAPI,
  userAPI,
  prescriptionAPI,
  pharmacyAPI,
};
