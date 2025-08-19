import mongoose from 'mongoose';

const refillReminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  remindAt: {
    type: Date,
    required: true
  },
  method: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    default: 'email'
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'cancelled'],
    default: 'scheduled'
  }
}, { timestamps: true });

refillReminderSchema.index({ user: 1, remindAt: 1 });
refillReminderSchema.index({ status: 1, remindAt: 1 });

const RefillReminder = mongoose.model('RefillReminder', refillReminderSchema);
export default RefillReminder;
