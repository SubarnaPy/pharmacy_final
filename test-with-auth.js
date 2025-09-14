// Test script to verify health history API endpoint with authentication
import axios from 'axios';

async function testWithAuth() {
  try {
    // First, let's try to login to get a token
    console.log('🔍 Attempting to login...');
    
    // You'll need to replace these with actual test credentials
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'test@example.com', // Replace with a real test user
      password: 'password123'     // Replace with real password
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful, token obtained');
    
    // Now test the health history endpoint with authentication
    console.log('\n🔍 Testing health-history endpoint with auth...');
    const response = await axios.get('http://localhost:5000/api/v1/users/health-history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Success! Health history data:', response.data);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Login endpoint not found or health history endpoint not found');
    } else if (error.response?.status === 401) {
      console.log('❌ Invalid credentials or token');
    } else {
      console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
  }
}

console.log('Note: This test requires valid user credentials.');
console.log('If you have a test user, replace the credentials in the script and run again.');
console.log('For now, we know the endpoint exists because our previous test got 401 (auth required).\n');

// testWithAuth(); // Uncomment this line when you have test credentials
