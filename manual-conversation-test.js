import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';
const PHARMACY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhjZTg2ZDA2ZTdhYjI0ZWIzZGUxMjIiLCJlbWFpbCI6ImxzdWJhcm5hMjlAZ21haWwuY29tIiwicm9sZSI6InBoYXJtYWN5IiwiaWF0IjoxNzU1NTU5NDg1LCJleHAiOjE3NTYxNjQyODV9.kzQ3lDwpvSDZr6RvoAPWkYysJTESpnXVAUGEsBx6t9U';

async function manuallyCreateConversation() {
  try {
    console.log('🧪 Manually Creating Conversation for Existing Order');
    console.log('=' .repeat(60));

    // Get the first order
    const ordersResponse = await axios.get(`${API_BASE}/orders/pharmacy/orders`, {
      headers: { 'Authorization': `Bearer ${PHARMACY_TOKEN}` }
    });

    const orders = ordersResponse.data.data || [];
    if (orders.length === 0) {
      console.log('❌ No orders found');
      return;
    }

    const testOrder = orders[0];
    console.log(`📦 Using order: ${testOrder.orderNumber}`);
    console.log(`   Status: ${testOrder.status}`);
    console.log(`   Patient: ${testOrder.patient?.profile?.firstName} ${testOrder.patient?.profile?.lastName}`);

    // Try to create conversation using the order conversation endpoint
    console.log('\n🔧 Attempting to create conversation...');
    
    const createResponse = await axios.post(`${API_BASE}/chat/conversations/order`, {
      orderId: testOrder._id,
      patientId: testOrder.patient?._id || testOrder.patientId,
      pharmacyId: testOrder.pharmacyId
    }, {
      headers: { 'Authorization': `Bearer ${PHARMACY_TOKEN}` }
    });

    console.log('✅ Conversation created successfully!');
    console.log('📄 Response:', createResponse.data);

    // Check if conversation now appears
    console.log('\n📋 Checking conversations after creation...');
    const conversationsResponse = await axios.get(`${API_BASE}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${PHARMACY_TOKEN}` }
    });

    const conversations = conversationsResponse.data.data || [];
    console.log(`✅ Found ${conversations.length} conversations`);
    
    if (conversations.length > 0) {
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.description || 'No description'}`);
        console.log(`      ID: ${conv._id}`);
        console.log(`      Participants: ${conv.participants?.length || 0}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
  }
}

manuallyCreateConversation();
