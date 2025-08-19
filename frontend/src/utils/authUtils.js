// Authentication utilities
export const authUtils = {
  // Get token from localStorage
  getToken: () => localStorage.getItem('token'),
  
  // Get refresh token from localStorage
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  
  // Get user data from localStorage
  getUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },
  
  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  
  // Set auth data
  setAuth: (user, accessToken, refreshToken = null) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },
  
  // Check if token is likely expired (basic check)
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
};

export default authUtils;
