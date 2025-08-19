import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const { Schema } = mongoose;

// Health History Schema
const healthHistorySchema = new Schema({
  condition: {
    type: String,
    trim: true
  },
  diagnosedDate: {
    type: Date
  },
  medication: {
    type: String,
    trim: true
  },
  doctor: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Address Schema
const addressSchema = new Schema({
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'United States',
    trim: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere'
  }
});

// Profile Schema
const profileSchema = new Schema({
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: addressSchema
  },
  avatar: {
    type: String, // Cloudinary URL
    default: null
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  }
});

// Two Factor Authentication Schema
const twoFactorAuthSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  secret: {
    type: String,
    default: null
  },
  backupCodes: [{
    type: String
  }],
  lastUsedAt: {
    type: Date,
    default: null
  }
});

// User Schema
const userSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    default: 'patient'
  },
  profile: {
    type: profileSchema
  },
  healthHistory: {
    type: [healthHistorySchema],
    default: []
  },
  twoFactorAuth: {
    type: twoFactorAuthSchema,
    default: () => ({})
  },
  emailVerification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    token: {
      type: String,
      default: null
    },
    verificationExpires: {
      type: Date,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  passwordReset: {
    token: {
      type: String,
      default: null
    },
    expires: {
      type: Date,
      default: null
    }
  },
  loginAttempts: {
    count: {
      type: Number,
      default: 0
    },
    lockedUntil: {
      type: Date,
      default: null
    }
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de']
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    }
  },
  paymentInfo: {
    stripeCustomerId: {
      type: String,
      default: null
    },
    defaultPaymentMethod: {
      type: String,
      default: null
    },
    paymentMethods: [{
      stripePaymentMethodId: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['card', 'bank_account', 'wallet'],
        default: 'card'
      },
      brand: String, // visa, mastercard, amex, etc.
      last4: String,
      expiryMonth: Number,
      expiryYear: Number,
      isDefault: {
        type: Boolean,
        default: false
      },
      nickname: String,
      billingAddress: addressSchema,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    subscriptions: [{
      stripeSubscriptionId: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'unpaid', 'incomplete'],
        required: true
      },
      planId: String,
      planName: String,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Reference to Pharmacy document (for pharmacy users)
  pharmacy: {
    type: Schema.Types.ObjectId,
    ref: 'Pharmacy',
    default: null
  },
  // Basic pharmacy info for quick access (stored in User for performance)
  pharmacyDetails: {
    pharmacyName: {
      type: String,
      trim: true
    },
    licenseNumber: {
      type: String,
      trim: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },
  
  // Reference to Doctor document (for doctor users)
  doctorProfile: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      if (ret.passwordReset) {
        delete ret.passwordReset;
      }
      if (ret.emailVerification) {
        delete ret.emailVerification.token;
      }
      if (ret.twoFactorAuth) {
        delete ret.twoFactorAuth.secret;
        delete ret.twoFactorAuth.backupCodes;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimal performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ pharmacy: 1 }); // Index for pharmacy reference
userSchema.index({ doctorProfile: 1 }); // Index for doctor profile reference
userSchema.index({ 'profile.address.coordinates': '2dsphere' });
userSchema.index({ createdAt: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'emailVerification.isVerified': 1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function () {
  if (!this.profile || !this.profile.firstName || !this.profile.lastName) {
    return '';
  }
  return `${this.profile.firstName} ${this.profile.lastName}`.trim();
});

// Virtual for account status
userSchema.virtual('isLocked').get(function () {
  return !!(this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  console.log('Generating token for user:', this);
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const payload = {
    id: this._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerification.token = token;
  this.emailVerification.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordReset.token = token;
  this.passwordReset.expires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Instance method to handle failed login attempts
userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'loginAttempts.lockedUntil': 1 },
      $set: { 'loginAttempts.count': 1 }
    });
  }

  const updates = { $inc: { 'loginAttempts.count': 1 } };

  // Lock account after 5 failed attempts
  if (this.loginAttempts.count + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'loginAttempts.lockedUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      'loginAttempts.count': 1,
      'loginAttempts.lockedUntil': 1
    }
  });
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

// Static method to find by role
userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true });
};

// Static method to find by pharmacy reference
userSchema.statics.findByPharmacy = function (pharmacyId) {
  return this.find({ pharmacy: pharmacyId, isActive: true });
};

// Static method to populate pharmacy details
userSchema.statics.findWithPharmacyDetails = function (query = {}) {
  return this.find(query).populate('pharmacy');
};

const User = mongoose.model('User', userSchema);

export default User;
