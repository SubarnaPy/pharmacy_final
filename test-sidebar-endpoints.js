// Test script to verify the API endpoints used by SidebarDataService
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

// Mock authentication token - replace with real token
const TEST_TOKEN = 'your-test-token-here';

const testEndpoints = [
  // Dashboard stats endpoints
  { method: 'GET', url: '/pharmacies/dashboard/stats', description: 'Pharmacy dashboard stats' },
  { method: 'GET', url: '/admin/dashboard/stats', description: 'Admin dashboard stats' },
  
  // Prescription request stats
  { method: 'GET', url: '/prescription-requests/stats', description: 'Prescription request stats' },
  
  // Order stats
  { method: 'GET', url: '/orders/admin/stats', description: 'Admin order stats' },
  
  // Chat stats
  { method: 'GET', url: '/chat/stats', description: 'Chat stats' },
  
  // Notification counts
  { method: 'GET', url: '/notifications/notification-counts', description: 'Notification counts' },
  
  // Pharmacy status
  { method: 'GET', url: '/pharmacies/status/me', description: 'Current user pharmacy status' },
];

async function testEndpoint(endpoint) {
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${API_BASE_URL}${endpoint.url}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ ${endpoint.description}: ${response.status}`);
    return { endpoint: endpoint.url, status: 'success', code: response.status };
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${endpoint.description}: ${error.response.status} - ${error.response.data?.message || 'No message'}`);
      return { endpoint: endpoint.url, status: 'error', code: error.response.status, message: error.response.data?.message };
    } else {
      console.log(`❌ ${endpoint.description}: ${error.message}`);
      return { endpoint: endpoint.url, status: 'error', message: error.message };
    }
  }
}

async function testAllEndpoints() {
  console.log('🔍 Testing API endpoints used by SidebarDataService...\n');
  
  const results = [];
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('\n📊 Summary:');
  console.log('Success:', results.filter(r => r.status === 'success').length);
  console.log('Errors:', results.filter(r => r.status === 'error').length);
  
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.log('\n🔧 Endpoints that need fixing:');
    errors.forEach(error => {
      console.log(`- ${error.endpoint} (${error.code || 'Network error'}): ${error.message || 'Unknown error'}`);
    });
  }
}

// Only run if called directly
if (require.main === module) {
  testAllEndpoints().catch(console.error);
}

module.exports = { testAllEndpoints, testEndpoint };
