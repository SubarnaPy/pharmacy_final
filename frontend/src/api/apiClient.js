import axios from 'axios';
import { toast } from 'react-toastify';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api/v1', // Temporarily use direct URL for debugging
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔍 ApiClient interceptor - Token available:', !!token);
  console.log('🔍 ApiClient interceptor - Request URL:', config.url);
  console.log('🔍 ApiClient interceptor - Base URL:', config.baseURL);
  console.log('🔍 ApiClient interceptor - Full URL:', `${config.baseURL}${config.url}`);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ ApiClient interceptor - Authorization header added');
  } else {
    console.log('❌ ApiClient interceptor - No token found in localStorage');
  }

  return config;
});

// Response interceptor for 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {

    const originalRequest = error.config;

    // Handle 401 with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if error is "User not found" - clear auth immediately
      if (error.response?.data?.message?.includes('User not found')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.includes('/login')) {
          toast.error('Account not found. Please login again.');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post('http://localhost:5000/api/v1/auth/refresh-token', {
            refreshToken
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('token', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Only show error message if it's not a login page
        if (!window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Show error toast for other errors (but not for auth redirects)
    const message = error.response?.data?.message || error.message;
    if (error.response?.status !== 401 || !message.includes('User not found')) {
      if (error.response?.status !== 401) {
        toast.error(message);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
