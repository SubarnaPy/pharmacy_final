// Test script to verify health history API endpoint
import axios from 'axios';

async function testHealthHistoryAPI() {
  try {
    // First, let's test if the server is running
    console.log('🔍 Testing server status...');
    const serverTest = await axios.get('http://localhost:5000/api/v1/health');
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server not running or health endpoint missing');
    console.log('Error:', error.message);
    // Continue anyway to test the endpoint
  }

  try {
    // Test the health-history endpoint without auth (should get 401)
    console.log('\n🔍 Testing health-history endpoint without auth...');
    const response = await axios.get('http://localhost:5000/api/v1/users/health-history');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Endpoint exists and correctly requires authentication');
      console.log('Response:', error.response.data);
    } else if (error.response?.status === 404) {
      console.log('❌ Endpoint not found (404)');
      console.log('Available routes might not include /users/health-history');
      console.log('Full error:', error.response?.data);
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
    }
  }

  // Let's also test the base users route
  try {
    console.log('\n🔍 Testing base users route...');
    await axios.get('http://localhost:5000/api/v1/users');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Base users route exists');
    } else if (error.response?.status === 404) {
      console.log('❌ Base users route not found');
    }
  }
}

testHealthHistoryAPI();
