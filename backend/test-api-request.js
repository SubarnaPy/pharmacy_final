import fetch from 'node-fetch';

async function testAPIRequest() {
  try {
    // First, test if the server is running
    console.log('🔄 Testing if backend server is running...');
    
    try {
      const healthResponse = await fetch('http://localhost:5000/api/v1/health', {
        method: 'GET'
      });
      console.log('✅ Backend server is responding');
    } catch (error) {
      console.log('❌ Backend server is not responding:', error.message);
      return;
    }
    
    // Test notification endpoint with a real JWT token
    console.log('\n🧪 Testing notification endpoint...');
    
    // You would need to get this token from the frontend localStorage or generate one
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhjZTg2ZDA2ZTdhYjI0ZWIzZGUxMjIiLCJfaWQiOiI2ODhjZTg2ZDA2ZTdhYjI0ZWIzZGUxMjIiLCJyb2xlIjoicGhhcm1hY3kiLCJpYXQiOjE3MjQxNzg3NTMsImV4cCI6MTcyNDE4MjM1M30.example'; // This would be expired
    
    console.log('📋 Note: You need to get a valid JWT token from the frontend localStorage or login');
    console.log('🔍 Test this manually in browser console:');
    console.log('fetch("http://localhost:5000/api/v1/notifications/user", {');
    console.log('  headers: { "Authorization": "Bearer " + localStorage.getItem("token") }');
    console.log('}).then(r => r.json()).then(console.log)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPIRequest();
