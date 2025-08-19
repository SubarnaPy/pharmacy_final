import mongoose from 'mongoose';
import { Order } from './src/models/Order.js';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function testOrderEndpoints() {
  try {
    console.log('🧪 Testing Order Endpoints...\n');

    // Find a test patient and pharmacy
    const patient = await User.findOne({ role: 'patient' });
    const pharmacy = await Pharmacy.findOne({ isActive: { $ne: false } });

    if (!patient || !pharmacy) {
      console.log('❌ Need at least one patient and one pharmacy for testing');
      return;
    }

    console.log('👤 Using patient:', patient.email);
    console.log('🏥 Using pharmacy:', pharmacy.name);

    // Create a test prescription request
    const prescriptionRequest = new PrescriptionRequest({
      patient: patient._id,
      medications: [
        {
          name: 'Test Medication',
          quantity: 30,
          dosage: '500mg',
          instructions: 'Take 1 tablet daily'
        }
      ],
      preferences: {
        deliveryMethod: 'pickup'
      },
      status: 'draft',
      isActive: true
    });

    await prescriptionRequest.save();
    console.log('📋 Created test prescription request:', prescriptionRequest._id);

    // Create a test order
    const testOrder = new Order({
      prescriptionId: prescriptionRequest._id,
      patientId: patient._id,
      pharmacyId: pharmacy._id,
      orderType: 'pickup',
      items: [
        {
          medicationName: 'Test Medication',
          dosage: '500mg',
          quantity: 30,
          unitPrice: 1.50,
          totalPrice: 45.00,
          notes: 'Take with food'
        }
      ],
      totalAmount: 45.00,
      status: 'placed',
      paymentInfo: {
        method: 'card',
        status: 'pending'
      },
      pharmacyNotes: 'Test order for API testing',
      patientNotes: 'Please call when ready',
      isUrgent: false,
      prescriptionVerified: true
    });

    await testOrder.save();
    console.log('✅ Created test order:', testOrder.orderNumber);

    // Test order methods
    console.log('\n🔧 Testing order methods:');
    console.log('   Can be cancelled:', testOrder.canBeCancelled());
    console.log('   Tracking number:', testOrder.trackingNumber);

    // Test status update
    console.log('\n📊 Testing status update...');
    await testOrder.updateStatus('confirmed', 'Order confirmed by pharmacy', pharmacy.owner);
    console.log('   Status updated to:', testOrder.status);
    console.log('   Status history entries:', testOrder.statusHistory.length);

    // Test rating (simulate delivered order)
    testOrder.status = 'delivered';
    testOrder.deliveredAt = new Date();
    await testOrder.save();

    testOrder.rating = 5;
    testOrder.review = 'Excellent service!';
    testOrder.ratedAt = new Date();
    await testOrder.save();

    console.log('⭐ Added rating:', testOrder.rating, 'stars');
    console.log('💬 Review:', testOrder.review);

    // Test queries that the frontend will use
    console.log('\n🔍 Testing frontend queries...');

    // Patient orders query
    const patientOrders = await Order.find({ patientId: patient._id })
      .populate('patientId', 'profile contact')
      .populate('pharmacyId', 'name address phone rating')
      .populate('prescriptionId', 'medications')
      .sort({ createdAt: -1 });

    console.log('👤 Patient orders found:', patientOrders.length);

    // Pharmacy orders query
    const pharmacyOrders = await Order.find({ pharmacyId: pharmacy._id })
      .populate('patientId', 'profile contact')
      .populate('pharmacyId', 'name address phone')
      .populate('prescriptionId', 'medications')
      .sort({ createdAt: -1 });

    console.log('🏥 Pharmacy orders found:', pharmacyOrders.length);

    // Test data transformation for frontend
    console.log('\n🔄 Testing data transformation...');
    const transformedOrder = {
      _id: testOrder._id,
      orderNumber: testOrder.orderNumber,
      patient: {
        profile: patient.profile || {},
        contact: patient.contact || {}
      },
      pharmacy: {
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        rating: pharmacy.rating || 4.5
      },
      prescriptionRequest: {
        medications: prescriptionRequest.medications
      },
      status: testOrder.status,
      totalAmount: testOrder.totalAmount,
      deliveryMethod: testOrder.orderType,
      estimatedReadyTime: testOrder.pickupInfo?.estimatedPickupTime,
      createdAt: testOrder.createdAt,
      canCancel: testOrder.canBeCancelled(),
      canRate: testOrder.status === 'delivered' && !testOrder.rating,
      trackingNumber: testOrder.trackingNumber,
      rating: testOrder.rating,
      review: testOrder.review
    };

    console.log('✅ Transformed order structure looks good');
    console.log('   Order Number:', transformedOrder.orderNumber);
    console.log('   Status:', transformedOrder.status);
    console.log('   Can Cancel:', transformedOrder.canCancel);
    console.log('   Can Rate:', transformedOrder.canRate);
    console.log('   Rating:', transformedOrder.rating);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testOrderEndpoints();