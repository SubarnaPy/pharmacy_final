import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  // Test health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint working:', healthData.status);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    return;
  }

  // Test mock queue endpoint (no auth required)
  try {
    console.log('\n2. Testing mock queue endpoint...');
    const mockResponse = await fetch(`${BASE_URL}/api/v1/prescription-requests/dev/mock-queue`);
    const mockData = await mockResponse.json();
    console.log('✅ Mock queue endpoint working, found', mockData.data?.queue?.length || 0, 'requests');
  } catch (error) {
    console.log('❌ Mock queue endpoint failed:', error.message);
  }

  // Test pharmacy dashboard stats (requires auth)
  try {
    console.log('\n3. Testing pharmacy dashboard stats (without auth)...');
    const dashboardResponse = await fetch(`${BASE_URL}/api/v1/pharmacies/dashboard/stats`);
    console.log('Dashboard response status:', dashboardResponse.status);
    
    if (dashboardResponse.status === 401) {
      console.log('✅ Dashboard endpoint properly requires authentication');
    } else {
      const dashboardText = await dashboardResponse.text();
      console.log('Dashboard response:', dashboardText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Dashboard endpoint test failed:', error.message);
  }

  // Test prescription queue (requires auth)
  try {
    console.log('\n4. Testing prescription queue (without auth)...');
    const queueResponse = await fetch(`${BASE_URL}/api/v1/prescription-requests/pharmacy/queue`);
    console.log('Queue response status:', queueResponse.status);
    
    if (queueResponse.status === 401) {
      console.log('✅ Queue endpoint properly requires authentication');
    } else {
      const queueText = await queueResponse.text();
      console.log('Queue response:', queueText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Queue endpoint test failed:', error.message);
  }

  console.log('\n🏁 Endpoint testing complete!');
}

testEndpoints().catch(console.error);