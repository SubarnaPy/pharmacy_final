import fetch from 'node-fetch';

// Test API calls
const BASE_URL = 'http://localhost:5000/api/v1';

async function testCreatePrescriptionRequests() {
  try {
    // You'll need to get a valid token from a pharmacy user
    const token = 'YOUR_PHARMACY_TOKEN_HERE'; // Replace with actual token
    
    const response = await fetch(`${BASE_URL}/prescription-requests/dev/create-test-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

async function testPharmacyQueue() {
  try {
    const token = 'YOUR_PHARMACY_TOKEN_HERE'; // Replace with actual token
    
    const response = await fetch(`${BASE_URL}/prescription-requests/pharmacy/queue`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Queue Response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to test
// testCreatePrescriptionRequests();
// testPharmacyQueue();

console.log('Test file created. Update tokens and uncomment functions to test.');