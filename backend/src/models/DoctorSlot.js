import mongoose from 'mongoose';

const doctorSlotSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bookingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

doctorSlotSchema.index({ doctorId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('DoctorSlot', doctorSlotSchema);