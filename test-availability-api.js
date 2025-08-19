// Test script to verify the availability API endpoint works correctly
// Run this after starting your backend server

const testAvailabilityAPI = async () => {
  const baseURL = 'http://localhost:5000/api'; // Adjust port if needed
  
  // You'll need to replace these with actual values from your database
  const doctorId = 'YOUR_DOCTOR_ID'; // Replace with actual doctor ID
  const authToken = 'YOUR_AUTH_TOKEN'; // Replace with actual auth token
  
  const testData = {
    section: 'availability',
    data: {
      workingHours: {
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: false, start: null, end: null },
        sunday: { available: false, start: null, end: null }
      },
      timeSlotDuration: 30,
      breakBetweenSlots: 15,
      maxAdvanceBookingDays: 30
    }
  };

  try {
    const response = await fetch(`${baseURL}/doctors/${doctorId}/profile/section`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Test Successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ API Test Failed!');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

console.log('🧪 Testing Availability API...');
console.log('⚠️  Please update doctorId and authToken in this script before running');
console.log('📝 Instructions:');
console.log('1. Start your backend server');
console.log('2. Replace YOUR_DOCTOR_ID with an actual doctor ID from your database');
console.log('3. Replace YOUR_AUTH_TOKEN with a valid authentication token');
console.log('4. Run: node test-availability-api.js');

// Uncomment the line below after updating the credentials
// testAvailabilityAPI();