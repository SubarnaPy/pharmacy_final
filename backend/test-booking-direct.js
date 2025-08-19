import axios from 'axios';

const testBookingAPI = async () => {
  try {
    const apiUrl = 'http://localhost:5000/api/v1';
    
    // Test data
    const bookingData = {
      doctorId: '68968c32e63a3edb81217733',
      slotId: '68968c32e63a3edb81217733_2025-08-16_10:00',
      date: '2025-08-16',
      startTime: '10:00',
      endTime: '10:30',
      consultationType: 'video',
      notes: ''
    };
    
    console.log('Testing booking API...');
    console.log('Booking data:', bookingData);
    
    // Test without auth first to see the specific error
    const response = await axios.post(`${apiUrl}/consultations/book`, bookingData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success:', response.data);
    
  } catch (error) {
    console.error('API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testBookingAPI();
