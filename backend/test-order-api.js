import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

// Test credentials - you'll need to update these with actual test user credentials
const PHARMACY_TOKEN = 'your_pharmacy_jwt_token_here';
const PATIENT_TOKEN = 'your_patient_jwt_token_here';

async function testOrderAPIs() {
  console.log('🧪 Testing Order Management APIs...\n');

  try {
    // Test 1: Get pharmacy orders
    console.log('1. Testing GET /orders/pharmacy/orders');
    try {
      const response = await axios.get(`${BASE_URL}/orders/pharmacy/orders`, {
        headers: {
          'Authorization': `Bearer ${PHARMACY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          status: '',
          dateRange: '',
          search: '',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 50
        }
      });
      
      console.log('✅ Pharmacy orders endpoint working');
      console.log(`   Found ${response.data.data?.length || 0} orders`);
    } catch (error) {
      console.log('❌ Pharmacy orders endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Get patient orders
    console.log('\n2. Testing GET /orders/my-orders');
    try {
      const response = await axios.get(`${BASE_URL}/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${PATIENT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          status: '',
          dateRange: '',
          search: '',
          limit: 50
        }
      });
      
      console.log('✅ Patient orders endpoint working');
      console.log(`   Found ${response.data.data?.length || 0} orders`);
    } catch (error) {
      console.log('❌ Patient orders endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Test validation with valid parameters
    console.log('\n3. Testing validation with valid parameters');
    try {
      const response = await axios.get(`${BASE_URL}/orders/pharmacy/orders`, {
        headers: {
          'Authorization': `Bearer ${PHARMACY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          status: 'placed',
          dateRange: 'week',
          search: 'test',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 10
        }
      });
      
      console.log('✅ Validation with valid parameters working');
    } catch (error) {
      console.log('❌ Validation test failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Test validation with invalid parameters
    console.log('\n4. Testing validation with invalid parameters');
    try {
      const response = await axios.get(`${BASE_URL}/orders/pharmacy/orders`, {
        headers: {
          'Authorization': `Bearer ${PHARMACY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          status: 'invalid_status',
          sortBy: 'invalid_field',
          sortOrder: 'invalid_order',
          limit: 200
        }
      });
      
      console.log('⚠️ Validation should have failed but didn\'t');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation correctly rejected invalid parameters');
        console.log('   Error:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Instructions for running the test
console.log('📋 To run this test:');
console.log('1. Start your backend server: npm run dev');
console.log('2. Update the PHARMACY_TOKEN and PATIENT_TOKEN variables with valid JWT tokens');
console.log('3. Run: node test-order-api.js\n');

// Uncomment the line below to run the test (after updating tokens)
// testOrderAPIs();