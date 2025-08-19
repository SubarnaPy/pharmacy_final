import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slotId: {
    type: String,
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
  endTime: {
    type: String,
    required: true
  },
  consultationType: {
    type: String,
    enum: ['chat', 'phone', 'email', 'video', 'inPerson'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['confirmed', 'active', 'completed', 'cancelled', 'rescheduled'],
    default: 'confirmed'
  },
  consultationFee: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  patientNotes: {
    type: String,
    default: ''
  },
  doctorNotes: {
    type: String,
    default: ''
  },
  meetingLink: {
    type: String
  },
  duration: {
    type: Number,
    default: 30
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
consultationSchema.index({ doctorId: 1, date: 1, time: 1 });
consultationSchema.index({ patientId: 1 });
consultationSchema.index({ status: 1 });

export default mongoose.model('Consultation', consultationSchema);