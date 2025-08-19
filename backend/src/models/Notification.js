import mongoose from 'mongoose';

// Enhanced Notification Schema for Advanced Notification System
const NotificationSchema = new mongoose.Schema({
  // Basic notification info
  type: { 
    type: String, 
    required: true,
    enum: [
      'prescription_created', 'prescription_updated', 'prescription_ready', 'prescription_review_required', 'prescription_response_received', 'prescription_shared_with_pharmacy', 'prescription_request',
      'order_placed', 'order_confirmed', 'order_ready', 'order_delivered', 'order_cancelled', 'order_status_updated', 'order_payment_received',
      'appointment_scheduled', 'appointment_reminder', 'appointment_cancelled', 'appointment_completed', 'appointment_rescheduled',
      'doctor_booking_confirmed', 'doctor_new_appointment', 'doctor_appointment_cancelled', 'doctor_consultation_request',
      'pharmacy_response_submitted', 'pharmacy_order_received', 'pharmacy_order_processed', 'pharmacy_prescription_request',
      'patient_prescription_uploaded', 'patient_order_placed', 'patient_appointment_booked', 'patient_consultation_scheduled',
      'payment_successful', 'payment_failed', 'payment_refunded', 'payment_pending', 'payment_due',
      'inventory_low_stock', 'inventory_expired', 'inventory_near_expiry', 'inventory_updated',
      'user_registered', 'user_verified', 'password_reset', 'security_alert', 'profile_completed',
      'system_maintenance', 'system_update', 'system_alert', 'system_announcement',
      'consultation_scheduled', 'consultation_reminder', 'consultation_completed', 'consultation_started', 'consultation_ended',
      'profile_updated', 'document_uploaded', 'verification_required', 'verification_completed',
      'refill_reminder', 'medication_reminder', 'health_checkup_reminder',
      'chat_message_received', 'chat_started', 'support_ticket_created', 'support_ticket_resolved'
    ]
  },
  category: { 
    type: String, 
    enum: ['medical', 'administrative', 'system', 'marketing'], 
    default: 'medical' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical', 'emergency'], 
    default: 'medium' 
  },

  // Recipients with delivery status
  recipients: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['patient', 'doctor', 'pharmacy', 'admin'], required: true },
    deliveryChannels: [{ type: String, enum: ['websocket', 'email', 'sms'] }],
    deliveryStatus: {
      websocket: {
        status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
        deliveredAt: Date,
        error: String
      },
      email: {
        status: { type: String, enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'], default: 'pending' },
        deliveredAt: Date,
        messageId: String,
        error: String,
        openedAt: Date,
        clickedAt: Date
      },
      sms: {
        status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
        deliveredAt: Date,
        messageId: String,
        error: String
      }
    },
    readAt: Date,
    actionTaken: {
      action: String,
      takenAt: Date
    }
  }],

  // Content
  content: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: String,
    actionText: String,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Template information
  templateId: String,
  templateVersion: String,

  // Context and data
  contextData: mongoose.Schema.Types.Mixed, // Original data used to generate notification
  relatedEntities: [{
    entityType: { 
      type: String, 
      enum: ['prescription', 'order', 'appointment', 'user', 'pharmacy', 'doctor', 'payment', 'inventory'] 
    },
    entityId: mongoose.Schema.Types.ObjectId
  }],

  // Scheduling and expiry
  scheduledFor: Date,
  expiresAt: Date,

  // Analytics
  analytics: {
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    actionCount: { type: Number, default: 0 },
    bounceCount: { type: Number, default: 0 },
    unsubscribeCount: { type: Number, default: 0 }
  },

  // System metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  retryCount: { type: Number, default: 0 },
  lastRetryAt: Date
});

// Indexes for performance
NotificationSchema.index({ 'recipients.userId': 1, 'recipients.deliveryStatus.websocket.status': 1, createdAt: -1 });
NotificationSchema.index({ type: 1, category: 1, priority: 1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ 'relatedEntities.entityType': 1, 'relatedEntities.entityId': 1 });

// Update the updatedAt field on save
NotificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Notification', NotificationSchema);
