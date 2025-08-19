import fetch from 'node-fetch';

const testBookingAPI = async () => {
  try {
    const doctorId = '68968c32e63a3edb81217733';
    const apiUrl = 'http://localhost:5000/api/v1';
    const url = `${apiUrl}/doctors/${doctorId}/book`;
    
    const bookingData = {
      date: '2025-08-11',
      startTime: '09:00',
      endTime: '17:00',
      consultationType: 'video',
      notes: 'Test booking'
    };
    
    console.log('🔍 Testing Booking URL:', url);
    console.log('📋 Booking Data:', bookingData);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No authorization token - this should fail with 401
      },
      body: JSON.stringify(bookingData)
    });
    
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

testBookingAPI();
