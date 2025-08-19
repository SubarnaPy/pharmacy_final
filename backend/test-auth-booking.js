import axios from 'axios';

const testUserAuth = async () => {
  try {
    const apiUrl = 'http://localhost:5000/api/v1';
    
    // First, let's try to create/login a test patient
    console.log('Testing patient authentication...');
    
    // Try to register a test patient
    const registerData = {
      name: 'Test Patient',
      email: 'testpatient@test.com',
      password: 'password123',
      role: 'patient'
    };
    
    let token;
    
    try {
      const registerResponse = await axios.post(`${apiUrl}/auth/register`, registerData);
      console.log('Registration successful:', registerResponse.data);
      token = registerResponse.data.data.token;
    } catch (regError) {
      console.log('Registration failed (user might exist), trying login...');
      
      // Try login instead
      const loginData = {
        email: 'testpatient@test.com',
        password: 'password123'
      };
      
      const loginResponse = await axios.post(`${apiUrl}/auth/login`, loginData);
      console.log('Login successful:', loginResponse.data);
      token = loginResponse.data.data.token;
    }
    
    if (token) {
      console.log('Got auth token:', token.substring(0, 20) + '...');
      
      // Now test the booking API with authentication
      const bookingData = {
        doctorId: '68968c32e63a3edb81217733',
        slotId: '68968c32e63a3edb81217733_2025-08-16_10:00',
        date: '2025-08-16',
        startTime: '10:00',
        endTime: '10:30',
        consultationType: 'video',
        notes: ''
      };
      
      const bookingResponse = await axios.post(`${apiUrl}/consultations/book`, bookingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Booking successful:', bookingResponse.data);
    }
    
  } catch (error) {
    console.error('Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testUserAuth();
