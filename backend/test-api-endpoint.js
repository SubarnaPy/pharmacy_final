import fetch from 'node-fetch';

async function testPharmacyResponse() {
  console.log('🧪 Testing pharmacy response endpoint...');
  
  const url = 'http://localhost:5000/api/v1/prescription-requests/688d1774de907604f0ee27bd/respond';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OGNlODZkMDZlN2FiMjRlYjNkZTEyMiIsImVtYWlsIjoibHN1YmFybmEyOUBnbWFpbC5jb20iLCJyb2xlIjoicGhhcm1hY3kiLCJpYXQiOjE3NTQxNzE5NzIsImV4cCI6MTc1NDI1ODM3Mn0.Ej_Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
  
  const requestBody = {
    action: 'accept',
    estimatedFulfillmentTime: 120,
    quotedPrice: { total: 25.50 },
    notes: 'Prescription ready for pickup',
    pharmacyInfo: {
      specialInstructions: 'Take with food',
      pickupInstructions: 'Available 9 AM - 6 PM'
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Pharmacy response endpoint working correctly!');
    } else {
      console.log('❌ Pharmacy response endpoint failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
  }
}

testPharmacyResponse();