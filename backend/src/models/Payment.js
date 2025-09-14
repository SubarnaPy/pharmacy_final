import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Payment participants
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  payee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment context
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Medicine order context (for medicine purchases)
  medicineOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  
  // Pharmacy context (for medicine payments)
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    index: true
  },
  
  // Payment type
  paymentType: {
    type: String,
    enum: ['consultation', 'medicine_purchase', 'subscription', 'refund', 'other'],
    required: true,
    default: 'consultation',
    index: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  
  // Fee breakdown
  breakdown: {
    consultationFee: {
      type: Number,
      min: 0
    },
    medicineTotal: {
      type: Number,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    packagingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0
    },
    gst: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    insuranceCoverage: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cash', 'bank-transfer', 'stripe', 'cod'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['razorpay', 'stripe', 'payu', 'cashfree', 'instamojo', 'manual']
  },
  
  // Stripe-specific fields
  stripeData: {
    paymentIntentId: String,
    clientSecret: String,
    customerId: String,
    ephemeralKey: String,
    setupIntentId: String,
    paymentMethodId: String,
    accountId: String, // Connected account for pharmacies
    applicationFee: Number,
    transferData: {
      destination: String,
      amount: Number
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially-refunded'],
    default: 'pending',
    index: true
  },
  
  // Transaction details
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  gatewayTransactionId: String,
  gatewayOrderId: String,
  
  // Payment gateway response
  gatewayResponse: {
    raw: mongoose.Schema.Types.Mixed,
    status: String,
    message: String,
    errorCode: String,
    processingTime: Number // in milliseconds
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  
  // Refund information
  refund: {
    amount: {
      type: Number,
      min: 0
    },
    reason: String,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    initiatedAt: Date,
    completedAt: Date,
    refundTransactionId: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    gatewayResponse: mongoose.Schema.Types.Mixed
  },
  
  // Medicine order details (for medicine payments)
  medicineOrderDetails: {
    items: [{
      medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
      },
      quantity: {
        type: Number,
        min: 1
      },
      unitPrice: {
        type: Number,
        min: 0
      },
      totalPrice: {
        type: Number,
        min: 0
      },
      prescriptionRequired: {
        type: Boolean,
        default: true
      },
      prescriptionProvided: {
        type: Boolean,
        default: false
      }
    }],
    deliveryMethod: {
      type: String,
      enum: ['delivery', 'pickup', 'express_delivery'],
      default: 'pickup'
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: [Number] // [longitude, latitude]
    },
    pickupPharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy'
    },
    estimatedDeliveryTime: {
      type: String // e.g., "2-4 hours", "1-2 days"
    },
    deliveryInstructions: String,
    prescriptionUpload: {
      url: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      verifiedAt: Date
    }
  },
  
  // Coupon/Discount information
  coupon: {
    code: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    discountValue: Number,
    appliedDiscount: Number
  },
  
  // Invoice details
  invoice: {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    invoiceUrl: String,
    generatedAt: Date,
    sentAt: Date
  },
  
  // Settlement details (for doctors)
  settlement: {
    amount: Number, // Amount to be paid to doctor after platform fee
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    scheduledDate: Date,
    completedDate: Date,
    settlementId: String,
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String
    },
    utrNumber: String,
    failureReason: String
  },
  
  // Payment retry information
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  lastRetryAt: Date,
  nextRetryAt: Date,
  
  // Security
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,
  
  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskFactors: [String],
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  notes: String,
  
  // Tax information
  tax: {
    gstNumber: String,
    taxRate: {
      type: Number,
      default: 18 // 18% GST
    },
    taxAmount: Number,
    taxExempt: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ payer: 1, status: 1, createdAt: -1 });
paymentSchema.index({ payee: 1, status: 1, createdAt: -1 });
paymentSchema.index({ appointment: 1 });
paymentSchema.index({ medicineOrder: 1 });
paymentSchema.index({ pharmacy: 1 });
paymentSchema.index({ paymentType: 1, status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ 'stripeData.paymentIntentId': 1 });
paymentSchema.index({ 'settlement.status': 1, 'settlement.scheduledDate': 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Virtual for net amount after refunds
paymentSchema.virtual('netAmount').get(function() {
  if (this.refund && this.refund.amount) {
    return this.amount - this.refund.amount;
  }
  return this.amount;
});

// Virtual for platform commission
paymentSchema.virtual('platformCommission').get(function() {
  return this.breakdown.platformFee || 0;
});

// Virtual for doctor's earning
paymentSchema.virtual('doctorEarning').get(function() {
  const totalAmount = this.amount;
  const platformFee = this.breakdown.platformFee || 0;
  const refundAmount = (this.refund && this.refund.amount) || 0;
  return totalAmount - platformFee - refundAmount;
});

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  // Generate transaction ID if not exists
  if (!this.transactionId) {
    this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  // Handle different payment types
  if (this.paymentType === 'medicine_purchase') {
    // Calculate medicine total if not provided
    if (!this.breakdown.medicineTotal && this.medicineOrderDetails && this.medicineOrderDetails.items) {
      this.breakdown.medicineTotal = this.calculateMedicineTotal();
    }
    
    // Calculate GST for medicine purchases (usually 12% for medicines)
    if (!this.breakdown.gst && this.breakdown.medicineTotal) {
      this.breakdown.gst = Math.round(this.breakdown.medicineTotal * 0.12); // 12% GST for medicines
    }
    
    // Calculate total amount if not provided
    if (!this.amount && this.breakdown.medicineTotal) {
      this.amount = (this.breakdown.medicineTotal || 0) + 
                   (this.breakdown.deliveryFee || 0) + 
                   (this.breakdown.packagingFee || 0) +
                   (this.breakdown.platformFee || 0) + 
                   (this.breakdown.gst || 0) - 
                   (this.breakdown.discount || 0) - 
                   (this.breakdown.couponDiscount || 0) -
                   (this.breakdown.insuranceCoverage || 0);
    }
  } else if (this.paymentType === 'consultation') {
    // Calculate GST for consultation if not provided
    if (!this.breakdown.gst && this.breakdown.consultationFee) {
      this.breakdown.gst = Math.round(this.breakdown.consultationFee * 0.18); // 18% GST for services
    }
    
    // Calculate total amount if not provided
    if (this.breakdown.consultationFee && !this.amount) {
      this.amount = this.breakdown.consultationFee + 
                   (this.breakdown.platformFee || 0) + 
                   (this.breakdown.gst || 0) - 
                   (this.breakdown.discount || 0) - 
                   (this.breakdown.couponDiscount || 0);
    }
  }
  
  // Calculate settlement amount
  if (this.status === 'completed' && !this.settlement.amount) {
    if (this.paymentType === 'consultation') {
      this.settlement.amount = this.doctorEarning;
      this.settlement.scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
    } else if (this.paymentType === 'medicine_purchase' && this.pharmacy) {
      // For pharmacy settlements, deduct platform fee from medicine total
      const pharmacyEarning = (this.breakdown.medicineTotal || 0) + 
                             (this.breakdown.deliveryFee || 0) - 
                             (this.breakdown.platformFee || 0);
      this.settlement.amount = Math.max(0, pharmacyEarning);
      this.settlement.scheduledDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days later for pharmacies
    }
  }
  
  // Set timestamps based on status
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  if (this.status === 'failed' && !this.failedAt) {
    this.failedAt = new Date();
  }
  
  next();
});

// Static methods
paymentSchema.statics.findPendingSettlements = function(doctorId, limit = 50) {
  return this.find({
    payee: doctorId,
    status: 'completed',
    'settlement.status': 'pending',
    'settlement.scheduledDate': { $lte: new Date() }
  })
  .populate('appointment', 'appointmentDate consultationType')
  .populate('payer', 'name email')
  .sort({ 'settlement.scheduledDate': 1 })
  .limit(limit);
};

paymentSchema.statics.getDoctorEarnings = async function(doctorId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        payee: new mongoose.Types.ObjectId(doctorId),
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$settlement.amount' },
        totalTransactions: { $sum: 1 },
        averageEarning: { $avg: '$settlement.amount' },
        totalRefunds: {
          $sum: {
            $cond: [{ $gt: ['$refund.amount', 0] }, '$refund.amount', 0]
          }
        }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalEarnings: 0,
    totalTransactions: 0,
    averageEarning: 0,
    totalRefunds: 0
  };
};

paymentSchema.statics.getPlatformRevenue = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$breakdown.platformFee' },
        totalGST: { $sum: '$breakdown.gst' },
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: '$amount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalRevenue: 0,
    totalGST: 0,
    totalTransactions: 0,
    totalVolume: 0
  };
};

// Medicine payment specific static methods
paymentSchema.statics.getMedicinePaymentStats = async function(pharmacyId = null, startDate, endDate) {
  const matchStage = {
    paymentType: 'medicine_purchase',
    status: 'completed',
    completedAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (pharmacyId) {
    matchStage.pharmacy = new mongoose.Types.ObjectId(pharmacyId);
  }
  
  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMedicineRevenue: { $sum: '$breakdown.medicineTotal' },
        totalDeliveryRevenue: { $sum: '$breakdown.deliveryFee' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$amount' },
        deliveryOrders: {
          $sum: {
            $cond: [{ $eq: ['$medicineOrderDetails.deliveryMethod', 'delivery'] }, 1, 0]
          }
        },
        pickupOrders: {
          $sum: {
            $cond: [{ $eq: ['$medicineOrderDetails.deliveryMethod', 'pickup'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalMedicineRevenue: 0,
    totalDeliveryRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    deliveryOrders: 0,
    pickupOrders: 0
  };
};

paymentSchema.statics.findPendingMedicinePrescriptions = function(limit = 50) {
  return this.find({
    paymentType: 'medicine_purchase',
    status: 'completed',
    'medicineOrderDetails.prescriptionUpload.verified': false,
    'medicineOrderDetails.items': {
      $elemMatch: { prescriptionRequired: true }
    }
  })
  .populate('payer', 'name email')
  .populate('pharmacy', 'name contact')
  .populate('medicineOrderDetails.items.medicine', 'name brandName')
  .sort({ completedAt: 1 })
  .limit(limit);
};

paymentSchema.statics.getDeliveryAnalytics = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        paymentType: 'medicine_purchase',
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$medicineOrderDetails.deliveryMethod',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' },
        averageDeliveryFee: { $avg: '$breakdown.deliveryFee' }
      }
    }
  ]);
  
  return result;
};

// Instance methods
paymentSchema.methods.initiateRefund = function(amount, reason, initiatedBy) {
  this.refund = {
    amount: amount || this.amount,
    reason: reason,
    initiatedBy: initiatedBy,
    initiatedAt: new Date(),
    status: 'pending'
  };
  
  return this.save();
};

paymentSchema.methods.completeRefund = function(refundTransactionId, gatewayResponse) {
  if (!this.refund) {
    throw new Error('No refund initiated');
  }
  
  this.refund.status = 'completed';
  this.refund.completedAt = new Date();
  this.refund.refundTransactionId = refundTransactionId;
  this.refund.gatewayResponse = gatewayResponse;
  
  // Update main payment status
  if (this.refund.amount >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially-refunded';
  }
  
  return this.save();
};

paymentSchema.methods.processSettlement = function(utrNumber, bankDetails) {
  this.settlement.status = 'completed';
  this.settlement.completedDate = new Date();
  this.settlement.utrNumber = utrNumber;
  if (bankDetails) {
    this.settlement.bankDetails = bankDetails;
  }
  
  return this.save();
};

paymentSchema.methods.failSettlement = function(reason) {
  this.settlement.status = 'failed';
  this.settlement.failureReason = reason;
  
  return this.save();
};

paymentSchema.methods.canRetry = function() {
  return this.status === 'failed' && 
         this.retryCount < 3 && 
         (!this.nextRetryAt || this.nextRetryAt <= new Date());
};

paymentSchema.methods.scheduleRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  // Exponential backoff: 5min, 15min, 45min
  const delayMinutes = Math.pow(3, this.retryCount) * 5;
  this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  
  return this.save();
};

// Medicine payment specific methods
paymentSchema.methods.calculateMedicineTotal = function() {
  if (!this.medicineOrderDetails || !this.medicineOrderDetails.items) {
    return 0;
  }
  
  return this.medicineOrderDetails.items.reduce((total, item) => {
    return total + (item.totalPrice || 0);
  }, 0);
};

paymentSchema.methods.getTotalMedicineItems = function() {
  if (!this.medicineOrderDetails || !this.medicineOrderDetails.items) {
    return 0;
  }
  
  return this.medicineOrderDetails.items.reduce((total, item) => {
    return total + (item.quantity || 0);
  }, 0);
};

paymentSchema.methods.requiresPrescription = function() {
  if (!this.medicineOrderDetails || !this.medicineOrderDetails.items) {
    return false;
  }
  
  return this.medicineOrderDetails.items.some(item => item.prescriptionRequired);
};

paymentSchema.methods.hasPrescriptionUploaded = function() {
  return this.medicineOrderDetails && 
         this.medicineOrderDetails.prescriptionUpload && 
         this.medicineOrderDetails.prescriptionUpload.url;
};

paymentSchema.methods.isPrescriptionVerified = function() {
  return this.hasPrescriptionUploaded() && 
         this.medicineOrderDetails.prescriptionUpload.verified;
};

paymentSchema.methods.canProcessMedicineOrder = function() {
  if (this.paymentType !== 'medicine_purchase') {
    return { canProcess: false, reason: 'Not a medicine purchase' };
  }
  
  if (this.status !== 'completed') {
    return { canProcess: false, reason: 'Payment not completed' };
  }
  
  if (this.requiresPrescription() && !this.isPrescriptionVerified()) {
    return { canProcess: false, reason: 'Prescription required but not verified' };
  }
  
  return { canProcess: true };
};

paymentSchema.methods.createStripePaymentIntent = async function(stripeInstance) {
  try {
    if (!stripeInstance) {
      throw new Error('Stripe instance required');
    }
    
    const paymentIntentData = {
      amount: Math.round(this.amount * 100), // Convert to cents
      currency: this.currency.toLowerCase(),
      metadata: {
        paymentId: this._id.toString(),
        paymentType: this.paymentType,
        userId: this.payer.toString()
      }
    };
    
    // Add application fee for pharmacy payments
    if (this.paymentType === 'medicine_purchase' && this.pharmacy) {
      const Pharmacy = mongoose.model('Pharmacy');
      const pharmacy = await Pharmacy.findById(this.pharmacy);
      
      if (pharmacy && pharmacy.paymentConfig && pharmacy.paymentConfig.stripeAccountId) {
        paymentIntentData.transfer_data = {
          destination: pharmacy.paymentConfig.stripeAccountId
        };
        
        if (this.breakdown.platformFee > 0) {
          paymentIntentData.application_fee_amount = Math.round(this.breakdown.platformFee * 100);
        }
      }
    }
    
    const paymentIntent = await stripeInstance.paymentIntents.create(paymentIntentData);
    
    this.stripeData = {
      ...this.stripeData,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
    
    await this.save();
    
    return paymentIntent;
    
  } catch (error) {
    throw new Error(`Failed to create Stripe payment intent: ${error.message}`);
  }
};

paymentSchema.methods.confirmStripePayment = async function(paymentIntentId, stripeInstance) {
  try {
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      this.status = 'completed';
      this.completedAt = new Date();
      this.gatewayTransactionId = paymentIntent.id;
      this.gatewayResponse = {
        raw: paymentIntent,
        status: paymentIntent.status,
        message: 'Payment succeeded'
      };
      
      await this.save();
      return true;
    } else {
      this.status = 'failed';
      this.failedAt = new Date();
      this.gatewayResponse = {
        raw: paymentIntent,
        status: paymentIntent.status,
        message: `Payment failed: ${paymentIntent.status}`
      };
      
      await this.save();
      return false;
    }
    
  } catch (error) {
    throw new Error(`Failed to confirm Stripe payment: ${error.message}`);
  }
};

paymentSchema.methods.calculateDeliveryFee = function(distance, deliveryMethod = 'delivery') {
  let baseFee = 0;
  
  switch (deliveryMethod) {
    case 'express_delivery':
      baseFee = 100; // ₹100 base for express
      break;
    case 'delivery':
      baseFee = 50; // ₹50 base for normal delivery
      break;
    case 'pickup':
    default:
      return 0; // No fee for pickup
  }
  
  // Add distance-based fee (₹5 per km after first 5km)
  if (distance > 5) {
    baseFee += (distance - 5) * 5;
  }
  
  return Math.round(baseFee);
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
