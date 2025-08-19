/**
 * API Utility Functions
 * Centralized API configuration and helper functions
 */

// Get the API base URL from environment variables
export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
};

// Get the base server URL (without /api/v1)
export const getBaseUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace('/api/v1', '');
};

// Create a fetch wrapper with default headers
export const apiRequest = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    console.log(`🔍 API Request: ${config.method || 'GET'} ${url}`);
    const response = await fetch(url, config);
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    console.log(`📡 Content-Type: ${response.headers.get('content-type')}`);
    
    return response;
  } catch (error) {
    console.error(`❌ API Request failed: ${error.message}`);
    throw error;
  }
};

// Helper for GET requests
export const apiGet = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

// Helper for POST requests
export const apiPost = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Helper for PUT requests
export const apiPut = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Helper for DELETE requests
export const apiDelete = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

// Helper for PATCH requests
export const apiPatch = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// Parse JSON response with error handling
export const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('❌ Non-JSON response:', text.substring(0, 200));
    throw new Error('Server returned non-JSON response');
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error('❌ JSON parse error:', error);
    throw new Error('Invalid JSON response');
  }
};

// Create an API client object with common HTTP methods
const apiClient = {
  // Standard method names that return parsed JSON
  get: async (endpoint, options = {}) => {
    const response = await apiGet(endpoint, options);
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await parseJsonResponse(response);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return await parseJsonResponse(response);
  },
  
  post: async (endpoint, data, options = {}) => {
    const response = await apiPost(endpoint, data, options);
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await parseJsonResponse(response);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return await parseJsonResponse(response);
  },
  
  put: async (endpoint, data, options = {}) => {
    const response = await apiPut(endpoint, data, options);
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await parseJsonResponse(response);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return await parseJsonResponse(response);
  },
  
  delete: async (endpoint, options = {}) => {
    const response = await apiDelete(endpoint, options);
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await parseJsonResponse(response);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return await parseJsonResponse(response);
  },
  
  patch: async (endpoint, data, options = {}) => {
    const response = await apiPatch(endpoint, data, options);
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await parseJsonResponse(response);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return await parseJsonResponse(response);
  },
  
  // Original method names for backward compatibility
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  
  // Utility functions
  getApiUrl,
  getBaseUrl,
  apiRequest,
  parseJsonResponse,
};

export default apiClient;