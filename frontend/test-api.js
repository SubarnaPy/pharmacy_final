// Simple test script to verify API configuration
const API_BASE_URL = 'http://localhost:5000/api';

console.log('Frontend API Configuration:');
console.log('API Base URL:', API_BASE_URL);
console.log('Using Axios client with interceptors');
console.log('\nEndpoints configured:');
console.log('- POST /auth/login');
console.log('- POST /auth/register');
console.log('- POST /auth/logout');
console.log('- GET /auth/me');
console.log('- POST /auth/refresh-token');

// Test function to check if backend is accessible
async function testBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    if (response.ok) {
      console.log('✅ Backend health check successful');
      const data = await response.json();
      console.log('Health status:', data);
    } else {
      console.log('⚠️ Backend responded but health check failed');
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    console.log('Make sure the backend server is running on http://localhost:5000');
  }
}

// Test auth endpoint accessibility
async function testAuthEndpoints() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log('✅ Auth endpoint accessible (401 expected without token)');
    } else {
      console.log('⚠️ Auth endpoint responded with status:', response.status);
    }
  } catch (error) {
    console.log('❌ Auth endpoint test failed:', error.message);
  }
}

console.log('\n=== Running Backend Tests ===');
testBackendConnection();
testAuthEndpoints();
