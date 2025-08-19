import mongoose from 'mongoose';

const videoCallSchema = new mongoose.Schema({
  callId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  type: { 
    type: String, 
    enum: ['consultation', 'prescription_review'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['initiated', 'ringing', 'connected', 'ended', 'rejected', 'timeout'],
    default: 'initiated'
  },
  participants: {
    patient: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    pharmacist: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  },
  duration: { 
    type: Number, 
    default: 0 
  }, // in milliseconds
  startTime: Date,
  endTime: Date,
  prescriptionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription' 
  },
  pharmacyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Pharmacy' 
  },
  recordingId: String,
  metadata: {
    audioEnabled: { 
      type: Boolean, 
      default: true 
    },
    videoEnabled: { 
      type: Boolean, 
      default: true 
    },
    screenShared: { 
      type: Boolean, 
      default: false 
    },
    callQuality: String,
    endReason: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
videoCallSchema.index({ callId: 1 });
videoCallSchema.index({ 'participants.patient': 1 });
videoCallSchema.index({ 'participants.pharmacist': 1 });
videoCallSchema.index({ status: 1 });
videoCallSchema.index({ createdAt: -1 });

const VideoCall = mongoose.model('VideoCall', videoCallSchema);

export default VideoCall;