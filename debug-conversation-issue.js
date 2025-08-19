import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

// Test pharmacy user token (from the logs)
const PHARMACY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhjZTg2ZDA2ZTdhYjI0ZWIzZGUxMjIiLCJlbWFpbCI6ImxzdWJhcm5hMjlAZ21haWwuY29tIiwicm9sZSI6InBoYXJtYWN5IiwiaWF0IjoxNzU1NTU5NDg1LCJleHAiOjE3NTYxNjQyODV9.kzQ3lDwpvSDZr6RvoAPWkYysJTESpnXVAUGEsBx6t9U';

async function debugConversationIssue() {
  console.log('🔍 Debugging Conversation Creation Issue');
  console.log('=' .repeat(60));

  try {
    // 1. Check if pharmacy has any orders
    console.log('📋 Step 1: Checking pharmacy orders...');
    const ordersResponse = await axios.get(`${API_BASE}/orders/pharmacy/orders`, {
      headers: {
        'Authorization': `Bearer ${PHARMACY_TOKEN}`
      }
    });

    const orders = ordersResponse.data.data || [];
    console.log(`✅ Found ${orders.length} orders for pharmacy`);
    
    if (orders.length > 0) {
      console.log('📊 Order statuses:');
      orders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNumber}: ${order.status} (Created: ${order.createdAt})`);
      });
    }

    // 2. Check existing conversations
    console.log('\n📋 Step 2: Checking existing conversations...');
    const conversationsResponse = await axios.get(`${API_BASE}/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${PHARMACY_TOKEN}`
      }
    });

    const conversations = conversationsResponse.data.data || [];
    console.log(`✅ Found ${conversations.length} conversations for pharmacy`);
    
    if (conversations.length > 0) {
      console.log('💬 Existing conversations:');
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.description || 'No description'} (${conv._id})`);
        console.log(`      Participants: ${conv.participants?.length || 0}`);
        console.log(`      Created: ${conv.createdAt}`);
        if (conv.metadata) {
          console.log(`      Metadata: ${JSON.stringify(conv.metadata)}`);
        }
      });
    }

    // 3. If there are confirmed orders but no conversations, investigate
    const confirmedOrders = orders.filter(order => order.status === 'confirmed');
    if (confirmedOrders.length > 0 && conversations.length === 0) {
      console.log('\n⚠️ ISSUE FOUND: Confirmed orders exist but no conversations!');
      console.log(`   Confirmed orders: ${confirmedOrders.length}`);
      
      // Try to manually create a conversation for the first confirmed order
      const testOrder = confirmedOrders[0];
      console.log(`\n🧪 Attempting to manually create conversation for order: ${testOrder.orderNumber}`);
      
      try {
        const createConvResponse = await axios.post(`${API_BASE}/chat/conversations/order`, {
          orderId: testOrder._id,
          patientId: testOrder.patient?._id || testOrder.patientId,
          pharmacyId: testOrder.pharmacyId
        }, {
          headers: {
            'Authorization': `Bearer ${PHARMACY_TOKEN}`
          }
        });
        
        console.log('✅ Manual conversation creation successful!');
        console.log('📄 Created conversation:', createConvResponse.data);
      } catch (createError) {
        console.log('❌ Manual conversation creation failed:');
        console.log('   Status:', createError.response?.status);
        console.log('   Error:', createError.response?.data?.message || createError.message);
      }
    }

    // 4. If no confirmed orders, find a pending order to confirm
    if (confirmedOrders.length === 0) {
      const pendingOrders = orders.filter(order => order.status === 'pending');
      if (pendingOrders.length > 0) {
        console.log('\n🧪 No confirmed orders found. Attempting to confirm a pending order...');
        const testOrder = pendingOrders[0];
        console.log(`   Confirming order: ${testOrder.orderNumber}`);
        
        try {
          const confirmResponse = await axios.put(`${API_BASE}/orders/${testOrder._id}/status`, {
            status: 'confirmed',
            notes: 'Test confirmation for conversation creation',
            updatedBy: 'pharmacy'
          }, {
            headers: {
              'Authorization': `Bearer ${PHARMACY_TOKEN}`
            }
          });
          
          console.log('✅ Order confirmed successfully!');
          
          // Wait and check if conversation was created
          console.log('⏱️ Waiting 3 seconds for conversation creation...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const newConversationsResponse = await axios.get(`${API_BASE}/chat/conversations`, {
            headers: {
              'Authorization': `Bearer ${PHARMACY_TOKEN}`
            }
          });
          
          const newConversations = newConversationsResponse.data.data || [];
          if (newConversations.length > conversations.length) {
            console.log('🎉 SUCCESS: New conversation was created after order confirmation!');
          } else {
            console.log('❌ ISSUE: No new conversation created after order confirmation');
          }
          
        } catch (confirmError) {
          console.log('❌ Order confirmation failed:');
          console.log('   Status:', confirmError.response?.status);
          console.log('   Error:', confirmError.response?.data?.message || confirmError.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test chat API endpoints
async function testChatEndpoints() {
  console.log('\n🧪 Testing Chat API Endpoints');
  console.log('=' .repeat(60));

  const endpoints = [
    { method: 'GET', path: '/chat/conversations', name: 'Get conversations' },
    { method: 'GET', path: '/chat/stats', name: 'Get chat stats' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint.name}...`);
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE}${endpoint.path}`,
        headers: {
          'Authorization': `Bearer ${PHARMACY_TOKEN}`
        }
      });
      console.log(`✅ ${endpoint.name}: ${response.status} - ${response.data?.message || 'OK'}`);
      if (endpoint.path === '/chat/conversations') {
        console.log(`   Conversations found: ${response.data?.data?.length || 0}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'Network Error'} - ${error.response?.data?.message || error.message}`);
    }
  }
}

// Main test function
async function runDebug() {
  console.log('🔍 Starting Conversation Debug Session');
  console.log('📝 Using pharmacy token from logs');
  console.log('');

  await testChatEndpoints();
  await debugConversationIssue();

  console.log('\n🏁 Debug session completed!');
}

runDebug();

export { debugConversationIssue, testChatEndpoints };
