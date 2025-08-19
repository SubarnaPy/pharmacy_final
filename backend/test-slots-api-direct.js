import axios from 'axios';

const testSlotsAPI = async () => {
  try {
    const doctorId = '68968c32e63a3edb81217733';
    const apiUrl = 'http://localhost:5000/api/v1';
    
    console.log(`Testing API: ${apiUrl}/doctors/${doctorId}/slots`);
    
    const response = await axios.get(`${apiUrl}/doctors/${doctorId}/slots`);
    console.log('API Response:', response.data);
    console.log(`Total slots: ${response.data.data.length}`);
    
    // Show first few slots as example
    if (response.data.data.length > 0) {
      console.log('\nFirst few slots:');
      response.data.data.slice(0, 5).forEach(slot => {
        console.log(`- ${slot.date} ${slot.time} (Available: ${slot.available})`);
      });
    }
    
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
};

testSlotsAPI();
