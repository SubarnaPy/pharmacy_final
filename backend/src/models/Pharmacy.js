import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

// Address subdocument schema
const addressSchema = new Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP/Postal code is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Allow various international postal code formats
        // US: 12345 or 12345-6789
        // UK: SW1A 1AA
        // Canada: K1A 0A6
        // India: 123456
        // General: alphanumeric with spaces and hyphens, 3-10 chars
        return /^[A-Za-z0-9\s\-]{3,10}$/.test(v);
      },
      message: 'Please provide a valid postal/ZIP code'
    }
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'United States'
  }
}, { _id: false });

// Contact information schema
const contactSchema = new Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
  },
  fax: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid fax number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+\..+/, 'Please provide a valid website URL']
  }
}, { _id: false });

// Operating hours schema
const operatingHoursSchema = new Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openTime: {
    type: String,
    required: function() { return this.isOpen; },
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  closeTime: {
    type: String,
    required: function() { return this.isOpen; },
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  breaks: [{
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    },
    description: String
  }]
}, { _id: false });

// License information schema
const licenseSchema = new Schema({
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true,
    uppercase: true
  },
  licenseType: {
    type: String,
    required: [true, 'License type is required'],
    enum: ['community', 'hospital', 'retail', 'online', 'clinic', 'compound', 'specialty', 'mail_order']
  },
  issuingAuthority: {
    type: String,
    required: [true, 'Issuing authority is required'],
    trim: true
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(date) {
        return date > this.issueDate;
      },
      message: 'Expiry date must be after issue date'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  documentUrl: {
    type: String,
    required: [true, 'License document is required']
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  verificationNotes: String,
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, { _id: false });

// Service offerings schema
const serviceSchema = new Schema({
  prescription_filling: { type: Boolean, default: true },
  consultation: { type: Boolean, default: false },
  delivery: { type: Boolean, default: false },
  compound_medications: { type: Boolean, default: false },
  immunizations: { type: Boolean, default: false },
  health_screenings: { type: Boolean, default: false },
  medication_therapy_management: { type: Boolean, default: false },
  specialty_medications: { type: Boolean, default: false },
  durable_medical_equipment: { type: Boolean, default: false },
  emergency_services: { type: Boolean, default: false },
  custom_services: [String]
}, { _id: false });

// Delivery zone schema
const deliveryZoneSchema = new Schema({
  zipCodes: [String],
  radiusKm: {
    type: Number,
    min: [0, 'Delivery radius cannot be negative'],
    max: [100, 'Delivery radius cannot exceed 100 km']
  },
  deliveryFee: {
    type: Number,
    min: [0, 'Delivery fee cannot be negative'],
    default: 0
  },
  minOrderAmount: {
    type: Number,
    min: [0, 'Minimum order amount cannot be negative'],
    default: 0
  },
  estimatedDeliveryTime: {
    type: String,
    default: '2-4 hours'
  }
}, { _id: false });

// Insurance and payment schema
const insuranceSchema = new Schema({
  acceptedInsurances: [String],
  acceptedPayments: {
    type: [String],
    default: ['cash', 'credit_card', 'debit_card', 'insurance']
  },
  medicaidProvider: { type: Boolean, default: false },
  medicareProvider: { type: Boolean, default: false }
}, { _id: false });

// Staff information schema
const staffSchema = new Schema({
  pharmacists: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    specializations: [String],
    yearsExperience: {
      type: Number,
      min: 0
    }
  }],
  totalStaff: {
    type: Number,
    min: 1,
    default: 1
  }
}, { _id: false });

// Rating and review schema
const ratingSchema = new Schema({
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    min: 0,
    default: 0
  },
  ratingBreakdown: {
    five_star: { type: Number, default: 0 },
    four_star: { type: Number, default: 0 },
    three_star: { type: Number, default: 0 },
    two_star: { type: Number, default: 0 },
    one_star: { type: Number, default: 0 }
  }
}, { _id: false });

// Main Pharmacy Schema
const pharmacySchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Pharmacy name is required'],
    trim: true,
    maxlength: [200, 'Pharmacy name cannot exceed 200 characters'],
    index: 'text'
  },
  
  chainName: {
    type: String,
    trim: true,
    maxlength: [100, 'Chain name cannot exceed 100 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Owner/Manager Information
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Pharmacy owner is required']
  },

  // Location and Address
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },

  // Geospatial location for proximity searches
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Must be [longitude, latitude] within valid ranges.'
      }
    }
  },

  // Contact Information
  contact: {
    type: contactSchema,
    required: [true, 'Contact information is required']
  },

  // License Information
  licenses: {
    type: [licenseSchema],
    required: [true, 'At least one license is required'],
    validate: {
      validator: function(licenses) {
        return licenses.length > 0;
      },
      message: 'At least one license is required'
    }
  },

  // Operating Hours
  operatingHours: {
    type: [operatingHoursSchema],
    required: [true, 'Operating hours are required'],
    validate: {
      validator: function(hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const providedDays = hours.map(h => h.day);
        return days.every(day => providedDays.includes(day));
      },
      message: 'Operating hours must be provided for all 7 days of the week'
    }
  },

  // Services and Capabilities
  services: {
    type: serviceSchema,
    default: () => ({})
  },

  // Delivery Information
  delivery: {
    zones: [deliveryZoneSchema],
    isAvailable: { type: Boolean, default: false },
    emergencyDelivery: { type: Boolean, default: false }
  },

  // Insurance and Payment
  insurance: {
    type: insuranceSchema,
    default: () => ({})
  },

  // Staff Information
  staff: {
    type: staffSchema,
    required: [true, 'Staff information is required']
  },

  // Ratings and Reviews
  rating: {
    type: ratingSchema,
    default: () => ({})
  },

  // Pharmacy Status and Approval
  registrationStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'inactive'],
    default: 'draft'
  },

  approvalHistory: [{
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'suspended']
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Verification and Compliance
  isVerified: {
    type: Boolean,
    default: false
  },

  verificationDocuments: [{
    type: {
      type: String,
      enum: ['license', 'insurance', 'certification', 'inspection', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Business Metrics
  metrics: {
    totalPrescriptionsFilled: { type: Number, default: 0 },
    averageFulfillmentTime: { type: Number, default: 0 }, // in minutes
    totalCustomers: { type: Number, default: 0 },
    monthlyVolume: { type: Number, default: 0 }
  },

  // Notification Preferences
  notifications: {
    newPrescriptions: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
  },

  // System Metadata
  isActive: {
    type: Boolean,
    default: true
  },

  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  registeredAt: {
    type: Date,
    default: Date.now
  },

  approvedAt: Date,

  // Search and SEO
  searchTags: [String],
  
  // API Integration
  apiIntegration: {
    hasAPI: { type: Boolean, default: false },
    apiKey: String,
    webhookUrl: String
  }

}, {
  timestamps: true,
  collection: 'pharmacies'
});

// Indexes for performance optimization
pharmacySchema.index({ location: '2dsphere' }); // Geospatial index for location-based queries
pharmacySchema.index({ 'address.zipCode': 1 }); // Index for ZIP code searches
pharmacySchema.index({ registrationStatus: 1 }); // Index for status filtering
pharmacySchema.index({ isActive: 1, isVerified: 1 }); // Compound index for active verified pharmacies
pharmacySchema.index({ 'licenses.licenseNumber': 1 }); // Index for license lookup
pharmacySchema.index({ owner: 1 }); // Index for owner lookup
pharmacySchema.index({ 'contact.email': 1 }); // Email index for faster queries
pharmacySchema.index({ name: 'text', description: 'text', searchTags: 'text' }); // Text search index
pharmacySchema.index({ createdAt: -1 }); // Index for recent registrations
pharmacySchema.index({ 'rating.averageRating': -1 }); // Index for rating-based sorting

// Virtual fields
pharmacySchema.virtual('isOpen').get(function() {
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = this.operatingHours.find(h => h.day === currentDay);
  if (!todayHours || !todayHours.isOpen) return false;
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

pharmacySchema.virtual('hasActiveDelivery').get(function() {
  return this.delivery.isAvailable && this.delivery.zones && this.delivery.zones.length > 0;
});

pharmacySchema.virtual('primaryLicense').get(function() {
  return this.licenses.find(license => license.isActive && license.verificationStatus === 'verified') || this.licenses[0];
});

// Instance methods
pharmacySchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.totalReviews;
  const currentAverage = this.rating.averageRating;
  
  // Update rating breakdown
  const ratingKey = `${Math.floor(newRating)}_star`;
  if (this.rating.ratingBreakdown[ratingKey] !== undefined) {
    this.rating.ratingBreakdown[ratingKey]++;
  }
  
  // Calculate new average
  const newTotal = currentTotal + 1;
  const newAverage = ((currentAverage * currentTotal) + newRating) / newTotal;
  
  this.rating.totalReviews = newTotal;
  this.rating.averageRating = Math.round(newAverage * 10) / 10; // Round to 1 decimal place
  
  return this.save();
};

pharmacySchema.methods.isWithinDeliveryZone = function(zipCode, coordinates) {
  if (!this.delivery.isAvailable) return false;
  
  // Check ZIP code zones
  const zipCodeMatch = this.delivery.zones.some(zone => 
    zone.zipCodes && zone.zipCodes.includes(zipCode)
  );
  
  if (zipCodeMatch) return true;
  
  // Check radius zones if coordinates provided
  if (coordinates && coordinates.length === 2) {
    return this.delivery.zones.some(zone => {
      if (!zone.radiusKm) return false;
      
      const distance = this.calculateDistance(coordinates);
      return distance <= zone.radiusKm;
    });
  }
  
  return false;
};

pharmacySchema.methods.calculateDistance = function(targetCoordinates) {
  // Haversine formula to calculate distance between two points
  const [targetLng, targetLat] = targetCoordinates;
  const [pharmacyLng, pharmacyLat] = this.location.coordinates;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (targetLat - pharmacyLat) * Math.PI / 180;
  const dLng = (targetLng - pharmacyLng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
           Math.cos(pharmacyLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
           Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

pharmacySchema.methods.getEstimatedFulfillmentTime = function() {
  // Basic algorithm - can be enhanced with ML
  const baseTime = 30; // 30 minutes base time
  const volumeMultiplier = Math.min(this.metrics.monthlyVolume / 1000, 2); // Max 2x multiplier
  const ratingBonus = this.rating.averageRating >= 4.5 ? -5 : 0; // 5 min bonus for high-rated
  
  return Math.max(15, baseTime + (volumeMultiplier * 10) + ratingBonus); // Minimum 15 minutes
};

pharmacySchema.methods.canAcceptPrescription = function() {
  return this.isActive && 
         this.isVerified && 
         this.registrationStatus === 'approved' &&
         this.primaryLicense &&
         this.primaryLicense.verificationStatus === 'verified';
};

// Static methods
pharmacySchema.statics.findNearby = function(coordinates, radiusKm = 10, filters = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    },
    isActive: true,
    isVerified: true,
    registrationStatus: 'approved',
    ...filters
  };
  
  return this.find(query);
};

pharmacySchema.statics.searchByText = function(searchTerm, filters = {}) {
  return this.find({
    $text: { $search: searchTerm },
    isActive: true,
    isVerified: true,
    registrationStatus: 'approved',
    ...filters
  }).sort({ score: { $meta: 'textScore' } });
};

pharmacySchema.statics.getPharmacyStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$registrationStatus',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating.averageRating' }
      }
    }
  ]);
};

// Middleware hooks
pharmacySchema.pre('save', function(next) {
  // Update last active timestamp
  this.lastActiveAt = new Date();
  
  // Validate coordinates if location is being set
  if (this.location && this.location.coordinates) {
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Invalid coordinates provided'));
    }
  }
  
  // Ensure operating hours are complete
  if (this.operatingHours && this.operatingHours.length > 0) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const providedDays = this.operatingHours.map(h => h.day);
    
    if (!days.every(day => providedDays.includes(day))) {
      return next(new Error('Operating hours must be provided for all days of the week'));
    }
  }
  
  next();
});

pharmacySchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastActiveAt: new Date() });
  next();
});

// Post middleware for logging
pharmacySchema.post('save', function(doc) {
  console.log(`Pharmacy ${doc.name} has been saved with status: ${doc.registrationStatus}`);
});

pharmacySchema.post('findOneAndUpdate', function(doc) {
  if (doc) {
    console.log(`Pharmacy ${doc.name} has been updated`);
  }
});

// Export the model
const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);

export default Pharmacy;
