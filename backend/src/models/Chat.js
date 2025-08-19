import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  attachments: [{ url: String, filename: String, mimeType: String, size: Number }],
  sentAt: { type: Date, default: Date.now },
  readAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
});

const ChatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
  messages: [MessageSchema],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  unreadCounts: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, count: Number }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Chat', ChatSchema);
