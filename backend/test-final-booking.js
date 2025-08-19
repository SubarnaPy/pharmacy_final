import axios from 'axios';

const testBookingWithAuth = async () => {
  try {
    const apiUrl = 'http://localhost:5000/api/v1';
    
    // Login first
    const loginData = {
      email: 'patient@test.com',
      password: 'password123'
    };
    
    const loginResponse = await axios.post(`${apiUrl}/auth/login`, loginData);
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful, got token');
    
    // Now test booking
    const bookingData = {
      doctorId: '68968c32e63a3edb81217733',
      slotId: '68968c32e63a3edb81217733_2025-08-16_10:00',
      date: '2025-08-16',
      startTime: '10:00',
      endTime: '10:30',
      consultationType: 'video',
      notes: 'Test booking'
    };
    
    console.log('Attempting booking...');
    const bookingResponse = await axios.post(`${apiUrl}/consultations/book`, bookingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Booking successful!');
    console.log('Response:', bookingResponse.data);
    
  } catch (error) {
    console.error('Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testBookingWithAuth();
