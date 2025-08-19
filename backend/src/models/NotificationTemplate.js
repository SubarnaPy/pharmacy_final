import mongoose from 'mongoose';

// Notification Template Schema for Advanced Notification System
const NotificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
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
      'profile_updated', 'document_uploaded', 'verification_required'
    ]
  },
  category: { 
    type: String, 
    enum: ['medical', 'administrative', 'system', 'marketing'], 
    required: true 
  },

  // Template variants for different channels and roles
  variants: [{
    channel: { 
      type: String, 
      enum: ['websocket', 'email', 'sms'], 
      required: true 
    },
    userRole: { 
      type: String, 
      enum: ['patient', 'doctor', 'pharmacy', 'admin'], 
      required: true 
    },
    language: { type: String, default: 'en' },

    // Content templates
    subject: String, // For email
    title: { type: String, required: true }, // For websocket/push
    body: { type: String, required: true }, // Template with placeholders
    htmlBody: String, // For email HTML version

    // Styling and formatting
    styling: {
      primaryColor: { type: String, default: '#007bff' },
      logoUrl: String,
      footerText: String
    },

    // Action buttons
    actions: [{
      text: { type: String, required: true },
      url: { type: String, required: true },
      style: { 
        type: String, 
        enum: ['primary', 'secondary', 'danger'], 
        default: 'primary' 
      }
    }]
  }],

  // Template metadata
  version: { type: String, default: '1.0.0' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Usage analytics
  usage: {
    totalSent: { type: Number, default: 0 },
    lastUsed: Date,
    averageEngagement: { type: Number, default: 0 }
  }
});

// Indexes for performance
NotificationTemplateSchema.index({ type: 1, 'variants.channel': 1, 'variants.userRole': 1 });
NotificationTemplateSchema.index({ isActive: 1, type: 1 });
NotificationTemplateSchema.index({ createdAt: -1 });

// Compound index for template lookup
NotificationTemplateSchema.index({ 
  type: 1, 
  'variants.channel': 1, 
  'variants.userRole': 1, 
  'variants.language': 1,
  isActive: 1 
});

// Update the updatedAt field on save
NotificationTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('NotificationTemplate', NotificationTemplateSchema);