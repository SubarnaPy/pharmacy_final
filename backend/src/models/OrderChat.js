import mongoose from 'mongoose';

/**
 * Order Chat Model - Unified chat system for patient-pharmacy communication
 * Stores messages for a specific order in a single shared room
 */
const OrderChatSchema = new mongoose.Schema({
  // Order this chat belongs to
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  // Chat room identifier (unique per order)
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Participants in this chat
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['patient', 'pharmacy'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Messages in this chat
  messages: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['patient', 'pharmacy'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    type: {
      type: String,
      enum: ['text', 'system', 'file'],
      default: 'text'
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      fileType: String,
      fileUrl: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }],

  // Chat room status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Last activity
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Order information snapshot
  orderInfo: {
    orderNumber: {
      type: String,
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true
    },
    pharmacyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      required: true
    }
  },

  // Chat settings
  settings: {
    allowFiles: {
      type: Boolean,
      default: true
    },
    messageRetentionDays: {
      type: Number,
      default: 90
    },
    isReadOnly: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'orderchats'
});

// Indexes for efficient querying
OrderChatSchema.index({ orderId: 1 });
OrderChatSchema.index({ roomId: 1 });
OrderChatSchema.index({ isActive: 1 });
OrderChatSchema.index({ lastActivity: -1 });
OrderChatSchema.index({ 'participants.userId': 1 });
OrderChatSchema.index({ 'messages.timestamp': -1 });

// Virtual for unread count per user
OrderChatSchema.virtual('unreadCount').get(function() {
  // This will be calculated dynamically based on the requesting user
  return 0;
});

// Method to add a message
OrderChatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastActivity = new Date();
  return this.save();
};

// Method to mark messages as read for a user
OrderChatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (!message.readBy.some(read => read.userId.toString() === userId.toString())) {
      message.readBy.push({
        userId: userId,
        readAt: new Date()
      });
    }
  });
  this.lastActivity = new Date();
  return this.save();
};

// Method to get unread count for a user
OrderChatSchema.methods.getUnreadCount = function(userId) {
  return this.messages.filter(message =>
    message.senderId.toString() !== userId.toString() &&
    !message.readBy.some(read => read.userId.toString() === userId.toString())
  ).length;
};

// Method to get recent messages
OrderChatSchema.methods.getRecentMessages = function(limit = 50) {
  return this.messages
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .reverse(); // Return in chronological order
};

// Static method to find by order ID
OrderChatSchema.statics.findByOrderId = function(orderId) {
  return this.findOne({ orderId, isActive: true });
};

// Static method to find by room ID
OrderChatSchema.statics.findByRoomId = function(roomId) {
  return this.findOne({ roomId, isActive: true });
};

// Static method to create order chat
OrderChatSchema.statics.createOrderChat = async function(orderData) {
  const { orderId, orderNumber, patientId, pharmacyId, pharmacyUserId, status } = orderData;

  const roomId = `order_${orderId}_${Date.now()}`;

  const orderChat = new this({
    orderId,
    roomId,
    participants: [
      {
        userId: patientId,
        role: 'patient',
        joinedAt: new Date()
      },
      {
        userId: pharmacyUserId,
        role: 'pharmacy',
        joinedAt: new Date()
      }
    ],
    messages: [
      {
        senderId: pharmacyUserId,
        senderRole: 'pharmacy',
        content: `Order ${orderNumber} confirmed! You can track your order and ask any questions here.`,
        type: 'system',
        timestamp: new Date(),
        readBy: [],
        metadata: {
          systemAction: 'order_chat_created',
          orderData: {
            orderId: orderId,
            orderNumber: orderNumber
          }
        }
      }
    ],
    orderInfo: {
      orderNumber,
      patientId,
      pharmacyId,
      pharmacyUserId,
      status
    }
  });

  return orderChat.save();
};

const OrderChat = mongoose.model('OrderChat', OrderChatSchema);

export default OrderChat;
