// Comprehensive server status test
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testServerStatus() {
  console.log('🧪 Testing server status and routes...\n');

  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/health`,
      expectJson: true
    },
    {
      name: 'Prescription Request Test Route',
      url: `${BASE_URL}/api/v1/prescription-requests/dev/test`,
      expectJson: true
    },
    {
      name: 'Pharmacy Test Route',
      url: `${BASE_URL}/api/v1/pharmacies/dev/test`,
      expectJson: true
    },
    {
      name: 'Mock Queue Route',
      url: `${BASE_URL}/api/v1/prescription-requests/dev/mock-queue`,
      expectJson: true
    },
    {
      name: 'Pharmacy Dashboard (Auth Required)',
      url: `${BASE_URL}/api/v1/pharmacies/dashboard/stats`,
      expectJson: true,
      expectAuth: true
    },
    {
      name: 'Prescription Queue (Auth Required)',
      url: `${BASE_URL}/api/v1/prescription-requests/pharmacy/queue`,
      expectJson: true,
      expectAuth: true
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url);
      console.log(`Status: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`Content-Type: ${contentType}`);
      
      if (test.expectAuth && response.status === 401) {
        console.log('✅ Correctly requires authentication');
      } else if (test.expectJson && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Returns JSON:', data.success ? 'Success' : 'Error');
        if (data.message) console.log(`Message: ${data.message}`);
      } else {
        const text = await response.text();
        console.log('❌ Non-JSON response (first 100 chars):', text.substring(0, 100));
      }
      
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
    
    console.log('---');
  }

  console.log('🏁 Server status test complete!');
}

testServerStatus().catch(console.error);