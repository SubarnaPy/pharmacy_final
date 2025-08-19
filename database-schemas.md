# MongoDB Database Schemas

## Overview

This document defines the complete MongoDB database schema for the Unified Patient-Pharmacy-Practitioner System. The schemas are designed with proper indexing, validation rules, and relationships to support all system requirements. All models are implemented in JavaScript using Mongoose ODM.

## Core Collections

### 1. Users Collection (User.js model)

```javascript
// User.js - Mongoose schema for users collection
{
  _id: ObjectId,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'pharmacy', 'admin'],
    default: 'patient'
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    dateOfBirth: {
      type: Date,
      required: function() { return this.role === 'patient'; }
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    avatar: {
      filename: String,
      s3Key: String,
      url: String
    }
  },
  healthHistory: [{
    condition: String,
    diagnosedDate: Date,
    medications: [String],
    allergies: [String],
    notes: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['sms', 'email'],
      default: 'sms'
    },
    secret: String, // For TOTP if implemented
    backupCodes: [String]
  },
  emailVerification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationExpires: Date
  },
  passwordReset: {
    token: String,
    expires: Date
  },
  loginAttempts: {
    count: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    lockedUntil: Date
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for users collection
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "profile.address.coordinates": "2dsphere" })
db.users.createIndex({ "createdAt": 1 })
db.users.createIndex({ "isActive": 1 })
```

### 2. Pharmacies Collection (Pharmacy.js model)

```javascript
// Pharmacy.js - Mongoose schema for pharmacies collection
{
  _id: ObjectId,
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  pharmacyInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    registeredPharmacist: {
      name: {
        type: String,
        required: true
      },
      licenseNumber: {
        type: String,
        required: true
      },
      phone: String,
      email: String
    },
    type: {
      type: String,
      enum: ['retail', 'hospital', 'clinical', 'specialty', 'compounding'],
      required: true
    },
    chainName: String, // For chain pharmacies
    independentOwner: String // For independent pharmacies
  },
  location: {
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        default: 'US'
      }
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    deliveryRadius: {
      type: Number, // in kilometers
      default: 10
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    fax: String,
    email: {
      type: String,
      required: true
    },
    website: String
  },
  operatingHours: {
    monday: {
      open: String, // "09:00"
      close: String, // "18:00"
      closed: {
        type: Boolean,
        default: false
      }
    },
    tuesday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    wednesday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    thursday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    friday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    saturday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    sunday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: true
      }
    },
    holidays: [{
      date: Date,
      name: String,
      closed: Boolean
    }]
  },
  services: [{
    type: String,
    enum: [
      'prescription_filling',
      'consultation',
      'vaccination',
      'health_screening',
      'medication_therapy_management',
      'compounding',
      'delivery',
      'drive_through',
      '24_hour'
    ]
  }],
  specialties: [{
    type: String,
    enum: [
      'diabetes_care',
      'pain_management',
      'oncology',
      'pediatric',
      'geriatric',
      'mental_health',
      'fertility',
      'veterinary'
    ]
  }],
  documents: [{
    type: {
      type: String,
      enum: ['pharmacy_license', 'dea_license', 'state_permit', 'insurance', 'other'],
      required: true
    },
    filename: String,
    s3Key: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  }],
  bankDetails: {
    accountHolderName: String,
    bankName: String,
    accountNumber: String, // Encrypted
    routingNumber: String, // Encrypted
    accountType: {
      type: String,
      enum: ['checking', 'savings']
    }
  },
  approvalStatus: {
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    reviewedBy: {
      type: ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    rejectionReason: String
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    totalPrescriptionsProcessed: {
      type: Number,
      default: 0
    },
    averageFulfillmentTime: Number, // in minutes
    successRate: {
      type: Number,
      default: 100
    },
    lastMonthVolume: {
      type: Number,
      default: 0
    }
  },
  inventorySync: {
    enabled: {
      type: Boolean,
      default: false
    },
    apiEndpoint: String,
    apiKey: String, // Encrypted
    lastSyncAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for pharmacies collection
db.pharmacies.createIndex({ "userId": 1 }, { unique: true })
db.pharmacies.createIndex({ "pharmacyInfo.licenseNumber": 1 }, { unique: true })
db.pharmacies.createIndex({ "location.coordinates": "2dsphere" })
db.pharmacies.createIndex({ "approvalStatus.status": 1 })
db.pharmacies.createIndex({ "services": 1 })
db.pharmacies.createIndex({ "rating.average": -1 })
db.pharmacies.createIndex({ "isActive": 1 })
```

### 3. Prescriptions Collection (Prescription.js model)

```javascript
// Prescription.js - Mongoose schema for prescriptions collection
{
  _id: ObjectId,
  patientId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: ObjectId,
    ref: 'Pharmacy'
  },
  prescriptionNumber: {
    type: String,
    unique: true,
    required: true
  },
  originalFile: {
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    s3Key: {
      type: String,
      required: true
    },
    url: String,
    fileType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      required: true
    },
    fileSize: Number, // in bytes
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  ocrData: {
    extractedText: String,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: Date,
    medications: [{
      name: String,
      genericName: String,
      strength: String,
      dosage: String,
      quantity: String,
      refills: Number,
      instructions: String,
      ndc: String, // National Drug Code
      confidence: Number
    }],
    doctorInfo: {
      name: String,
      npi: String, // National Provider Identifier
      phone: String,
      address: String,
      confidence: Number
    },
    patientInfo: {
      name: String,
      dateOfBirth: Date,
      address: String,
      confidence: Number
    },
    prescriptionDate: Date,
    errors: [String]
  },
  validationResults: {
    isValid: {
      type: Boolean,
      default: null
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100
    },
    flags: [{
      type: {
        type: String,
        enum: [
          'drug_interaction',
          'dosage_concern',
          'allergy_alert',
          'duplicate_prescription',
          'expired_prescription',
          'illegible_text',
          'missing_information',
          'suspicious_activity'
        ]
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      message: String,
      details: String
    }],
    drugInteractions: [{
      drug1: String,
      drug2: String,
      severity: String,
      description: String
    }],
    allergyAlerts: [{
      medication: String,
      allergen: String,
      severity: String
    }],
    validatedAt: Date,
    validatedBy: {
      type: String,
      enum: ['ai', 'pharmacist', 'system']
    }
  },
  status: {
    current: {
      type: String,
      enum: [
        'uploaded',
        'processing',
        'pending_pharmacy',
        'accepted',
        'declined',
        'in_preparation',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'completed',
        'cancelled',
        'expired'
      ],
      default: 'uploaded'
    },
    history: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },
  pharmacyRequests: [{
    pharmacyId: {
      type: ObjectId,
      ref: 'Pharmacy'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    response: {
      type: String,
      enum: ['pending', 'accepted', 'declined']
    },
    respondedAt: Date,
    estimatedFulfillmentTime: Number, // in minutes
    quotedPrice: Number,
    notes: String
  }],
  fulfillmentDetails: {
    acceptedAt: Date,
    estimatedCompletionTime: Date,
    actualCompletionTime: Date,
    preparationNotes: String,
    pharmacistNotes: String,
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery', 'mail']
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    trackingNumber: String,
    deliveredAt: Date,
    deliveredTo: String,
    signature: String // Base64 encoded signature
  },
  pricing: {
    medicationCosts: [{
      medication: String,
      unitPrice: Number,
      quantity: Number,
      totalPrice: Number,
      insuranceCovered: Number,
      patientPays: Number
    }],
    subtotal: Number,
    tax: Number,
    deliveryFee: Number,
    total: Number,
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      copay: Number
    }
  },
  refillInfo: {
    isRefillable: {
      type: Boolean,
      default: false
    },
    refillsRemaining: {
      type: Number,
      default: 0
    },
    nextRefillDate: Date,
    autoRefillEnabled: {
      type: Boolean,
      default: false
    },
    refillReminders: [{
      sentAt: Date,
      method: String, // 'email', 'sms', 'push'
      acknowledged: Boolean
    }]
  },
  consultationInfo: {
    requested: {
      type: Boolean,
      default: false
    },
    scheduledAt: Date,
    completedAt: Date,
    duration: Number, // in minutes
    notes: String,
    followUpRequired: Boolean,
    followUpDate: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    geoLocation: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for prescriptions collection
db.prescriptions.createIndex({ "prescriptionNumber": 1 }, { unique: true })
db.prescriptions.createIndex({ "patientId": 1 })
db.prescriptions.createIndex({ "pharmacyId": 1 })
db.prescriptions.createIndex({ "status.current": 1 })
db.prescriptions.createIndex({ "createdAt": -1 })
db.prescriptions.createIndex({ "ocrData.processingStatus": 1 })
db.prescriptions.createIndex({ "validationResults.flags.type": 1 })
db.prescriptions.createIndex({ "metadata.geoLocation": "2dsphere" })
```

### 4. Chat Messages Collection (ChatMessage.js model)

```javascript
// ChatMessage.js - Mongoose schema for chatMessages collection
{
  _id: ObjectId,
  chatId: {
    type: String,
    required: true,
    index: true
  },
  prescriptionId: {
    type: ObjectId,
    ref: 'Prescription'
  },
  senderId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'prescription_update', 'video_call_invite'],
    default: 'text'
  },
  content: {
    text: String,
    file: {
      filename: String,
      s3Key: String,
      url: String,
      fileType: String,
      fileSize: Number
    },
    systemMessage: {
      type: String,
      data: Object
    }
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  readStatus: {
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  },
  editHistory: [{
    originalContent: String,
    editedAt: Date,
    reason: String
  }],
  reactions: [{
    userId: {
      type: ObjectId,
      ref: 'User'
    },
    emoji: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: ObjectId,
    ref: 'ChatMessage'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  timestamp: {
    type: Date,
    default: Date.now
  }
}

// Indexes for chatMessages collection
db.chatMessages.createIndex({ "chatId": 1, "timestamp": -1 })
db.chatMessages.createIndex({ "senderId": 1 })
db.chatMessages.createIndex({ "receiverId": 1 })
db.chatMessages.createIndex({ "prescriptionId": 1 })
db.chatMessages.createIndex({ "readStatus.isRead": 1 })
db.chatMessages.createIndex({ "timestamp": -1 })
```

### 5. Video Consultations Collection (VideoConsultation.js model)

```javascript
// VideoConsultation.js - Mongoose schema for videoConsultations collection
{
  _id: ObjectId,
  prescriptionId: {
    type: ObjectId,
    ref: 'Prescription',
    required: true
  },
  patientId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  pharmacistId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  sessionId: {
    type: String,
    unique: true,
    required: true
  },
  scheduledAt: Date,
  startedAt: Date,
  endedAt: Date,
  duration: Number, // in seconds
  status: {
    type: String,
    enum: ['scheduled', 'waiting', 'active', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  connectionDetails: {
    roomId: String,
    token: String, // WebRTC token
    iceServers: [Object],
    recordingEnabled: {
      type: Boolean,
      default: false
    },
    recordingUrl: String
  },
  participants: [{
    userId: {
      type: ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date,
    connectionQuality: String, // 'excellent', 'good', 'fair', 'poor'
    deviceInfo: {
      browser: String,
      os: String,
      camera: Boolean,
      microphone: Boolean
    }
  }],
  consultationNotes: {
    pharmacistNotes: String,
    patientConcerns: [String],
    medicationDiscussed: [String],
    recommendations: [String],
    followUpRequired: Boolean,
    followUpDate: Date
  },
  prescriptionChanges: [{
    medication: String,
    changeType: {
      type: String,
      enum: ['dosage_adjustment', 'substitution', 'addition', 'removal']
    },
    oldValue: String,
    newValue: String,
    reason: String
  }],
  rating: {
    patientRating: {
      type: Number,
      min: 1,
      max: 5
    },
    pharmacistRating: {
      type: Number,
      min: 1,
      max: 5
    },
    patientFeedback: String,
    pharmacistFeedback: String
  },
  technicalIssues: [{
    type: {
      type: String,
      enum: ['audio', 'video', 'connection', 'other']
    },
    description: String,
    timestamp: Date,
    resolved: Boolean
  }],
  billing: {
    consultationFee: Number,
    duration: Number, // billable minutes
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for videoConsultations collection
db.videoConsultations.createIndex({ "sessionId": 1 }, { unique: true })
db.videoConsultations.createIndex({ "prescriptionId": 1 })
db.videoConsultations.createIndex({ "patientId": 1 })
db.videoConsultations.createIndex({ "pharmacistId": 1 })
db.videoConsultations.createIndex({ "status": 1 })
db.videoConsultations.createIndex({ "scheduledAt": 1 })
db.videoConsultations.createIndex({ "createdAt": -1 })
```

### 6. Payments Collection (Payment.js model)

```javascript
// Payment.js - Mongoose schema for payments collection
{
  _id: ObjectId,
  prescriptionId: {
    type: ObjectId,
    ref: 'Prescription',
    required: true
  },
  patientId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  paymentIntentId: {
    type: String,
    unique: true,
    required: true
  },
  stripePaymentId: String,
  amount: {
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'digital_wallet', 'insurance'],
      required: true
    },
    last4: String, // Last 4 digits of card
    brand: String, // visa, mastercard, etc.
    expiryMonth: Number,
    expiryYear: Number,
    fingerprint: String // Stripe fingerprint
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    copay: Number,
    deductible: Number,
    coveragePercentage: Number,
    claimNumber: String,
    preAuthRequired: Boolean,
    preAuthNumber: String
  },
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'succeeded',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded',
      'disputed'
    ],
    default: 'pending'
  },
  paymentDate: Date,
  failureReason: String,
  refunds: [{
    amount: Number,
    reason: String,
    refundId: String,
    processedAt: Date,
    status: String
  }],
  disputes: [{
    disputeId: String,
    reason: String,
    amount: Number,
    status: String,
    createdAt: Date,
    evidence: [String]
  }],
  payoutInfo: {
    pharmacyPayout: Number,
    platformCommission: Number,
    processingFee: Number,
    payoutDate: Date,
    payoutStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    }
  },
  receipt: {
    receiptNumber: String,
    receiptUrl: String,
    emailSent: Boolean,
    emailSentAt: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    paymentSource: String // 'web', 'mobile', 'api'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for payments collection
db.payments.createIndex({ "paymentIntentId": 1 }, { unique: true })
db.payments.createIndex({ "prescriptionId": 1 })
db.payments.createIndex({ "patientId": 1 })
db.payments.createIndex({ "pharmacyId": 1 })
db.payments.createIndex({ "status": 1 })
db.payments.createIndex({ "paymentDate": -1 })
db.payments.createIndex({ "createdAt": -1 })
```

### 7. Notifications Collection (Notification.js model)

```javascript
// Notification.js - Mongoose schema for notifications collection
{
  _id: ObjectId,
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'prescription_uploaded',
      'prescription_accepted',
      'prescription_declined',
      'prescription_ready',
      'prescription_delivered',
      'payment_successful',
      'payment_failed',
      'refill_reminder',
      'consultation_scheduled',
      'consultation_reminder',
      'pharmacy_approved',
      'pharmacy_rejected',
      'new_message',
      'system_maintenance',
      'security_alert'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    prescriptionId: {
      type: ObjectId,
      ref: 'Prescription'
    },
    pharmacyId: {
      type: ObjectId,
      ref: 'Pharmacy'
    },
    paymentId: {
      type: ObjectId,
      ref: 'Payment'
    },
    consultationId: {
      type: ObjectId,
      ref: 'VideoConsultation'
    },
    actionUrl: String,
    actionText: String
  },
  channels: [{
    type: {
      type: String,
      enum: ['push', 'email', 'sms', 'in_app']
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'bounced']
    },
    errorMessage: String
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for notifications collection
db.notifications.createIndex({ "userId": 1, "createdAt": -1 })
db.notifications.createIndex({ "type": 1 })
db.notifications.createIndex({ "isRead": 1 })
db.notifications.createIndex({ "priority": 1 })
db.notifications.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })
```

### 8. Audit Logs Collection (AuditLog.js model)

```javascript
// AuditLog.js - Mongoose schema for auditLogs collection
{
  _id: ObjectId,
  userId: {
    type: ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true // 'user', 'prescription', 'pharmacy', 'payment', etc.
  },
  resourceId: {
    type: ObjectId,
    required: true
  },
  changes: {
    before: Object,
    after: Object
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String,
    method: String, // HTTP method
    endpoint: String,
    statusCode: Number
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  tags: [String],
  timestamp: {
    type: Date,
    default: Date.now
  }
}

// Indexes for auditLogs collection
db.auditLogs.createIndex({ "userId": 1, "timestamp": -1 })
db.auditLogs.createIndex({ "resource": 1, "resourceId": 1 })
db.auditLogs.createIndex({ "action": 1 })
db.auditLogs.createIndex({ "severity": 1 })
db.auditLogs.createIndex({ "timestamp": -1 })
db.auditLogs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 31536000 }) // 1 year TTL
```

## Database Configuration

### Connection Settings
```javascript
// MongoDB connection configuration
const mongoConfig = {
  uri: process.env.MONGODB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
    authSource: 'admin'
  }
}
```

### Validation Rules
```javascript
// Custom validation functions
const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone) => /^\+?[\d\s\-\(\)]+$/.test(phone),
  zipCode: (zip) => /^\d{5}(-\d{4})?$/.test(zip),
  licenseNumber: (license) => /^[A-Z0-9\-]+$/.test(license)
}
```

### Data Encryption
```javascript
// Fields that require encryption
const encryptedFields = [
  'users.password',
  'pharmacies.bankDetails.accountNumber',
  'pharmacies.bankDetails.routingNumber',
  'pharmacies.inventorySync.apiKey'
]
```

This comprehensive database schema provides:

- **Proper indexing** for optimal query performance
- **Data validation** to ensure data integrity
- **Relationship management** between collections
- **Security considerations** with encrypted sensitive fields
- **Audit trail** capabilities for compliance
- **Scalability** with proper document structure
- **Flexibility** for future enhancements