import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  consultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'prescription', 'system'],
    default: 'text'
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatMessageSchema.index({ consultationId: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1 });

// Virtual for formatted timestamp
chatMessageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
});

// Method to mark message as read
chatMessageSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Method to soft delete message
chatMessageSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.message = 'This message has been deleted';
  return await this.save();
};

export default mongoose.model('ChatMessage', chatMessageSchema);
