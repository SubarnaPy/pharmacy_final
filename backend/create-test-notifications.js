/**
 * Create test notifications for testing the notification system
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmaConnect');

// Notification schema (matching current model)
const notificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: [
      'prescription_created', 'prescription_updated', 'prescription_ready', 'prescription_review_required',
      'order_placed', 'order_confirmed', 'order_ready', 'order_delivered', 'order_cancelled',
      'appointment_scheduled', 'appointment_reminder', 'appointment_cancelled', 'appointment_completed',
      'payment_successful', 'payment_failed', 'payment_refunded',
      'inventory_low_stock', 'inventory_expired', 'inventory_near_expiry',
      'user_registered', 'user_verified', 'password_reset', 'security_alert',
      'system_maintenance', 'system_update', 'system_alert',
      'consultation_scheduled', 'consultation_reminder', 'consultation_completed',
      'profile_updated', 'document_uploaded', 'verification_required',
      'prescription_uploaded', 'pharmacy_response', 'order_out_for_delivery', 'promotional'
    ]
  },
  category: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error'], 
    default: 'info' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'critical'], 
    default: 'normal' 
  },
  recipients: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['patient', 'doctor', 'pharmacy', 'admin'], required: true },
    deliveryChannels: [{ type: String, enum: ['websocket', 'email', 'sms'] }],
    deliveryStatus: {
      websocket: {
        status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
        deliveredAt: Date,
        error: String
      }
    },
    readAt: Date,
    actionTaken: {
      action: String,
      takenAt: Date
    }
  }],
  content: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: String,
    actionText: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  contextData: mongoose.Schema.Types.Mixed,
  relatedEntities: [{
    entityType: { 
      type: String, 
      enum: ['prescription', 'order', 'appointment', 'user', 'pharmacy', 'doctor', 'payment', 'inventory'] 
    },
    entityId: mongoose.Schema.Types.ObjectId
  }],
  scheduledFor: Date,
  expiresAt: Date,
  analytics: {
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    actionCount: { type: Number, default: 0 },
    bounceCount: { type: Number, default: 0 },
    unsubscribeCount: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// User schema (simplified for finding users)
const userSchema = new mongoose.Schema({
  email: String,
  profile: {
    firstName: String,
    lastName: String
  },
  role: String
});

const User = mongoose.model('User', userSchema);

async function createTestNotifications() {
  try {
    console.log('🔗 Connected to database');

    // Find the first user to create notifications for
    const users = await User.find().limit(5);
    console.log('📊 Found users:', users.length);

    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`📝 Creating notifications for user: ${testUser.profile?.firstName} ${testUser.profile?.lastName} (${testUser.email})`);

    // Create test notifications with current schema
    const testNotifications = [
      {
        type: 'prescription_uploaded',
        category: 'success',
        priority: 'normal',
        recipients: [{
          userId: testUser._id,
          userRole: 'patient',
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: 'Prescription Uploaded Successfully',
          message: 'Your prescription has been uploaded and is being processed.',
          metadata: { prescriptionId: 'test123' }
        },
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      },
      {
        type: 'pharmacy_response',
        category: 'info',
        priority: 'high',
        recipients: [{
          userId: testUser._id,
          userRole: 'patient',
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: 'Pharmacy Response Received',
          message: 'MedPlus Pharmacy has responded to your prescription request.',
          metadata: { pharmacyName: 'MedPlus Pharmacy', estimatedTime: '30 minutes' }
        },
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      },
      {
        type: 'order_confirmed',
        category: 'success',
        priority: 'normal',
        recipients: [{
          userId: testUser._id,
          userRole: 'patient',
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: 'Order Confirmed',
          message: 'Your medicine order has been confirmed and is being prepared.',
          metadata: { orderId: 'ORD789', amount: 250 }
        },
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      },
      {
        type: 'appointment_reminder',
        category: 'warning',
        priority: 'high',
        recipients: [{
          userId: testUser._id,
          userRole: 'patient',
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: 'Appointment Reminder',
          message: 'You have an appointment with Dr. Smith in 1 hour.',
          metadata: { doctorName: 'Dr. Smith', appointmentTime: new Date(Date.now() + 60 * 60 * 1000) }
        },
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      },
      {
        type: 'promotional',
        category: 'info',
        priority: 'low',
        recipients: [{
          userId: testUser._id,
          userRole: 'patient',
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: 'Special Offer',
          message: 'Get 20% off on your next medicine order. Use code SAVE20',
          metadata: { discountCode: 'SAVE20', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        },
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      }
    ];

    // Insert notifications
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`✅ Created ${createdNotifications.length} test notifications`);

    // Display created notifications
    createdNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title} (${notif.type} - ${notif.category})`);
    });

    console.log('\n🎉 Test notifications created successfully!');
    console.log('📱 You should now see notifications in the frontend.');

  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
mongoose.connection.once('open', createTestNotifications);
