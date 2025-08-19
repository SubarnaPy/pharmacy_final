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
    required: true,
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
      required: true,
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
    }
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cash', 'bank-transfer'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['razorpay', 'stripe', 'payu', 'cashfree', 'instamojo', 'manual']
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
paymentSchema.index({ transactionId: 1 });
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
  
  // Calculate GST if not provided
  if (!this.breakdown.gst && this.breakdown.consultationFee) {
    this.breakdown.gst = Math.round(this.breakdown.consultationFee * 0.18); // 18% GST
  }
  
  // Calculate total amount if not provided
  if (this.breakdown.consultationFee && !this.amount) {
    this.amount = this.breakdown.consultationFee + 
                 (this.breakdown.platformFee || 0) + 
                 (this.breakdown.gst || 0) - 
                 (this.breakdown.discount || 0) - 
                 (this.breakdown.couponDiscount || 0);
  }
  
  // Calculate settlement amount
  if (this.status === 'completed' && !this.settlement.amount) {
    this.settlement.amount = this.doctorEarning;
    this.settlement.scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
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

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
