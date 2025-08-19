
import mongoose from "mongoose";

const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  notes: { type: String },
});

const OrderSchema = new Schema(
  {
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "PrescriptionRequest",
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "completed",
        "cancelled",
        "on_hold",
      ],
      default: "placed",
      index: true,
    },
    orderType: {
      type: String,
      enum: ["pickup", "delivery", "either"],
      required: true,
    },
    items: [OrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Delivery information
    deliveryInfo: {
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      phoneNumber: String,
      deliveryInstructions: String,
      estimatedDeliveryTime: Date,
      actualDeliveryTime: Date,
      deliveryFee: { type: Number, default: 0 },
    },
    // Pickup information
    pickupInfo: {
      estimatedPickupTime: Date,
      actualPickupTime: Date,
      pickupInstructions: String,
    },
    // Payment information
    paymentInfo: {
      method: {
        type: String,
        enum: ["cash", "card", "insurance", "online"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paidAmount: { type: Number, default: 0 },
      insuranceCovered: { type: Number, default: 0 },
      copayAmount: { type: Number, default: 0 },
    },
    // Status tracking
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "placed",
            "confirmed",
            "preparing",
            "ready",
            "out_for_delivery",
            "delivered",
            "completed",
            "cancelled",
            "on_hold",
          ],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        updatedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        notes: String,
      },
    ],
    // Additional fields
    pharmacyNotes: String,
    patientNotes: String,
    specialInstructions: String,
    isUrgent: { type: Boolean, default: false },
    prescriptionVerified: { type: Boolean, default: false },

    // Rating and review fields
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    ratedAt: Date,

    // Timestamps for various stages
    placedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    preparedAt: Date,
    readyAt: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
OrderSchema.index({ prescriptionId: 1 });
OrderSchema.index({ patientId: 1, createdAt: -1 });
OrderSchema.index({ pharmacyId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });

// Pre-save middleware to generate order number
OrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    let orderNumber;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 5) {
      const count = await this.constructor.countDocuments();
      orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, "0")}`;
      exists = await this.constructor.exists({ orderNumber });
      attempts++;
    }

    if (exists) {
      return next(new Error("Failed to generate unique order number"));
    }

    this.orderNumber = orderNumber;
  }
  next();
});

// Instance methods
OrderSchema.methods.canBeCancelled = function () {
  return ['placed', 'confirmed'].includes(this.status);
};

OrderSchema.methods.updateStatus = function (newStatus, notes = '', updatedBy = null) {
  const previousStatus = this.status;
  this.status = newStatus;
  this.updatedAt = new Date();

  // Add to status history
  if (!this.statusHistory) {
    this.statusHistory = [];
  }

  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: updatedBy,
    notes: notes,
    previousStatus: previousStatus
  });

  // Set specific timestamps based on status
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = new Date();
      break;
    case 'preparing':
      this.preparedAt = new Date();
      break;
    case 'ready':
      this.readyAt = new Date();
      break;
    case 'out_for_delivery':
      this.shippedAt = new Date();
      break;
    case 'delivered':
    case 'completed':
      this.deliveredAt = new Date();
      this.completedAt = new Date();
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

// Virtual for tracking number
OrderSchema.virtual('trackingNumber').get(function () {
  return `TRK${this.orderNumber.slice(-6)}`;
});

export const Order = mongoose.model("Order", OrderSchema);