// Simple authentication utilities

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

export const getTokenInfo = (token) => {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId,
      role: payload.role,
      exp: payload.exp,
      iat: payload.iat,
      isExpired: payload.exp < Date.now() / 1000
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

// Check if user is authenticated and has valid token
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
};

// Get user role from token
export const getUserRole = () => {
  const token = getAuthToken();
  const tokenInfo = getTokenInfo(token);
  return tokenInfo?.role || null;
};

// Check if user has required role
export const hasRole = (requiredRole) => {
  const userRole = getUserRole();
  return userRole === requiredRole;
};

export default {
  getAuthToken,
  isTokenExpired,
  getTokenInfo,
  clearAuthToken,
  setAuthToken,
  isAuthenticated,
  getUserRole,
  hasRole
};