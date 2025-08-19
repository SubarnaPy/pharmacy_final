const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

// Test conversation creation when order status is updated to 'confirmed'
async function testConversationCreation() {
  console.log('🧪 Testing Conversation Creation on Order Confirmation');
  console.log('=' .repeat(60));

  try {
    // 1. First, get all orders to find one to test with
    console.log('📋 Step 1: Fetching existing orders...');
    const ordersResponse = await axios.get(`${API_BASE}/orders/pharmacy/orders`, {
      headers: {
        'Authorization': `Bearer ${process.env.PHARMACY_TOKEN || 'your-pharmacy-token'}`
      }
    });

    const orders = ordersResponse.data.data || [];
    console.log(`✅ Found ${orders.length} orders`);

    if (orders.length === 0) {
      console.log('⚠️ No orders found. Create an order first to test conversation creation.');
      return;
    }

    // Find a pending order to confirm
    const pendingOrder = orders.find(order => order.status === 'pending');
    
    if (!pendingOrder) {
      console.log('⚠️ No pending orders found. Create a pending order to test conversation creation.');
      console.log('📊 Available order statuses:', orders.map(o => `${o.orderNumber}: ${o.status}`));
      return;
    }

    console.log(`📦 Found pending order: ${pendingOrder.orderNumber}`);

    // 2. Update order status to 'confirmed' to trigger conversation creation
    console.log('📋 Step 2: Confirming order to trigger conversation creation...');
    const confirmResponse = await axios.put(`${API_BASE}/orders/${pendingOrder._id}/status`, {
      status: 'confirmed',
      notes: 'Order confirmed - testing conversation creation',
      updatedBy: 'pharmacy'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PHARMACY_TOKEN || 'your-pharmacy-token'}`
      }
    });

    console.log('✅ Order status updated to confirmed');

    // 3. Wait a moment for conversation creation
    console.log('⏱️ Waiting for conversation creation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Check if conversation was created
    console.log('📋 Step 3: Checking for created conversations...');
    const conversationsResponse = await axios.get(`${API_BASE}/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${process.env.PHARMACY_TOKEN || 'your-pharmacy-token'}`
      }
    });

    const conversations = conversationsResponse.data.data || [];
    console.log(`✅ Found ${conversations.length} conversations`);

    // Look for conversation related to our order
    const orderConversation = conversations.find(conv => 
      conv.metadata?.orderId === pendingOrder._id || 
      conv.description?.includes(pendingOrder.orderNumber)
    );

    if (orderConversation) {
      console.log('🎉 SUCCESS: Order conversation was created!');
      console.log('📄 Conversation Details:');
      console.log(`   - ID: ${orderConversation._id}`);
      console.log(`   - Description: ${orderConversation.description}`);
      console.log(`   - Participants: ${orderConversation.participants?.length || 0}`);
      console.log(`   - Created: ${orderConversation.createdAt}`);
      
      if (orderConversation.metadata) {
        console.log(`   - Order ID: ${orderConversation.metadata.orderId}`);
        console.log(`   - Order Number: ${orderConversation.metadata.orderNumber}`);
      }
    } else {
      console.log('❌ ISSUE: No conversation found for the confirmed order');
      console.log('🔍 Available conversations:');
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.description || 'No description'} (${conv._id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test conversation API endpoints
async function testConversationEndpoints() {
  console.log('\n🧪 Testing Conversation API Endpoints');
  console.log('=' .repeat(60));

  const endpoints = [
    '/chat/conversations',
    '/chat/conversations/order'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint}...`);
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PHARMACY_TOKEN || 'your-pharmacy-token'}`
        }
      });
      console.log(`✅ ${endpoint}: ${response.status} - ${response.data?.message || 'OK'}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Network Error'} - ${error.response?.data?.message || error.message}`);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Conversation Creation Tests');
  console.log('📝 Make sure you have:');
  console.log('   - Backend running on port 5001');
  console.log('   - Valid pharmacy token in PHARMACY_TOKEN env var');
  console.log('   - At least one pending order in the system');
  console.log('');

  await testConversationEndpoints();
  await testConversationCreation();

  console.log('\n🏁 Tests completed!');
}

if (require.main === module) {
  runTests();
}

module.exports = { testConversationCreation, testConversationEndpoints };
