/**
 * Create test notifications for the current logged-in user
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmaConnect');

// Notification schema (same as in the main app)
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'prescription_uploaded',
      'prescription_processed', 
      'prescription_matched',
      'pharmacy_response',
      'order_confirmed',
      'order_prepared',
      'order_out_for_delivery',
      'order_delivered',
      'order_cancelled',
      'payment_received',
      'appointment_booked',
      'appointment_reminder',
      'doctor_assigned',
      'consultation_started',
      'prescription_generated',
      'admin_notification',
      'system_maintenance',
      'promotional',
      'general'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'urgent'],
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: Date,
    deliveredAt: Date,
    status: {
      type: String,
      enum: ['pending', 'delivered', 'read', 'failed'],
      default: 'pending'
    }
  }],
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiresAt: Date
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

async function createNotificationsForCurrentUser() {
  try {
    console.log('🔗 Connected to database');

    // Target user ID from the logs (the current logged-in user)
    const targetUserId = '6890e8a839e6edc6ef1c712e';
    console.log(`📝 Creating notifications for user ID: ${targetUserId}`);

    // Delete existing notifications for this user to avoid duplicates
    await Notification.deleteMany({ 
      $or: [
        { userId: targetUserId },
        { 'recipients.userId': targetUserId }
      ]
    });
    console.log('🗑️ Cleaned up existing notifications');

    // Create test notifications with the new schema structure
    const testNotifications = [
      {
        userId: targetUserId,
        type: 'prescription_uploaded',
        category: 'success',
        title: 'Prescription Uploaded Successfully',
        message: 'Your prescription has been uploaded and is being processed by our AI system.',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { prescriptionId: 'test123', processingTime: '2 minutes' },
        priority: 'normal'
      },
      {
        userId: targetUserId,
        type: 'pharmacy_response',
        category: 'info',
        title: 'Pharmacy Response Received',
        message: 'MedPlus Pharmacy has responded to your prescription request with competitive pricing.',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { 
          pharmacyName: 'MedPlus Pharmacy', 
          estimatedTime: '30 minutes',
          totalAmount: 450,
          discount: 50
        },
        priority: 'high'
      },
      {
        userId: targetUserId,
        type: 'order_confirmed',
        category: 'success',
        title: 'Order Confirmed ✅',
        message: 'Your medicine order #ORD789 has been confirmed and is being prepared for delivery.',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { 
          orderId: 'ORD789', 
          amount: 400,
          deliveryTime: '45 minutes',
          trackingId: 'TRK123456'
        },
        priority: 'normal'
      },
      {
        userId: targetUserId,
        type: 'appointment_reminder',
        category: 'warning',
        title: 'Appointment Reminder 🩺',
        message: 'You have an upcoming appointment with Dr. Smith in 1 hour. Please be on time.',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { 
          doctorName: 'Dr. Smith', 
          specialization: 'Cardiologist',
          appointmentTime: new Date(Date.now() + 60 * 60 * 1000),
          consultationMode: 'Video Call'
        },
        priority: 'high'
      },
      {
        userId: targetUserId,
        type: 'promotional',
        category: 'info',
        title: 'Special Offer 🎉',
        message: 'Get 20% off on your next medicine order. Limited time offer!',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { 
          discountCode: 'SAVE20', 
          discountPercent: 20,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          minOrderAmount: 500
        },
        priority: 'low'
      },
      {
        userId: targetUserId,
        type: 'order_out_for_delivery',
        category: 'info',
        title: 'Order Out for Delivery 🚚',
        message: 'Your medicine order is now out for delivery. Expected delivery in 20 minutes.',
        recipients: [{
          userId: targetUserId,
          status: 'delivered',
          deliveredAt: new Date()
        }],
        data: { 
          orderId: 'ORD789',
          deliveryPartner: 'FastMed Delivery',
          estimatedDelivery: new Date(Date.now() + 20 * 60 * 1000),
          trackingLink: 'https://track.fastmed.com/TRK123456'
        },
        priority: 'normal'
      }
    ];

    // Insert notifications
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`✅ Created ${createdNotifications.length} test notifications`);

    // Display created notifications
    createdNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title} (${notif.type} - ${notif.category})`);
    });

    console.log('\n🎉 Test notifications created successfully!');
    console.log(`📱 Notifications are now available for user: ${targetUserId}`);
    console.log('🔄 Please refresh your frontend to see the notifications.');

  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
mongoose.connection.once('open', createNotificationsForCurrentUser);
