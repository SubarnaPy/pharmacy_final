import fetch from 'node-fetch';

const testSlotsAPI = async () => {
  try {
    const doctorId = '68968c32e63a3edb81217733';
    const apiUrl = 'http://localhost:5000/api/v1';
    const url = `${apiUrl}/doctors/${doctorId}/available-slots?days=14`;
    
    console.log('🔍 Testing URL:', url);
    
    const response = await fetch(url);
    
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', response.headers.get('content-type'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response Data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:');
      console.log(errorText);
    }
  } catch (error) {
    console.error('❌ Request Error:', error.message);
  }
};

testSlotsAPI();
