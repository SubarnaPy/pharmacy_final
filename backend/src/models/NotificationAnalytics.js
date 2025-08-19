import mongoose from 'mongoose';

const notificationAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Overall metrics
  totalSent: {
    type: Number,
    default: 0
  },
  totalDelivered: {
    type: Number,
    default: 0
  },
  totalRead: {
    type: Number,
    default: 0
  },
  totalActioned: {
    type: Number,
    default: 0
  },
  totalFailed: {
    type: Number,
    default: 0
  },
  
  // Channel breakdown
  channelMetrics: {
    websocket: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    email: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    sms: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    }
  },
  
  // User role breakdown
  roleMetrics: {
    patient: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    },
    doctor: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    },
    pharmacy: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    },
    admin: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    }
  },
  
  // Notification type breakdown
  typeMetrics: [{
    type: {
      type: String,
      required: true
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  }],
  
  // Performance metrics
  performance: {
    averageDeliveryTime: {
      type: Number,
      default: 0
    },
    failureRate: {
      type: Number,
      default: 0
    },
    retryRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
notificationAnalyticsSchema.index({ date: 1, 'typeMetrics.type': 1 });

// Static methods for analytics operations
notificationAnalyticsSchema.statics.getOrCreateDailyRecord = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  let record = await this.findOne({ date: startOfDay });
  
  if (!record) {
    record = new this({ date: startOfDay });
    await record.save();
  }
  
  return record;
};

notificationAnalyticsSchema.statics.incrementMetric = async function(date, metricPath, value = 1) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const updateQuery = {};
  updateQuery[`$inc`] = {};
  updateQuery[`$inc`][metricPath] = value;
  
  await this.updateOne(
    { date: startOfDay },
    updateQuery,
    { upsert: true }
  );
};

notificationAnalyticsSchema.statics.updateTypeMetric = async function(date, notificationType, metricType, value = 1) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  // First, try to increment existing type metric
  const result = await this.updateOne(
    { 
      date: startOfDay,
      'typeMetrics.type': notificationType
    },
    {
      $inc: { [`typeMetrics.$.${metricType}`]: value }
    }
  );
  
  // If no existing type metric found, add new one
  if (result.matchedCount === 0) {
    const newTypeMetric = {
      type: notificationType,
      sent: 0,
      delivered: 0,
      engagement: 0,
      averageResponseTime: 0
    };
    newTypeMetric[metricType] = value;
    
    await this.updateOne(
      { date: startOfDay },
      {
        $push: { typeMetrics: newTypeMetric }
      },
      { upsert: true }
    );
  }
};

notificationAnalyticsSchema.statics.getAnalyticsSummary = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: '$totalSent' },
        totalDelivered: { $sum: '$totalDelivered' },
        totalRead: { $sum: '$totalRead' },
        totalActioned: { $sum: '$totalActioned' },
        totalFailed: { $sum: '$totalFailed' },
        avgDeliveryTime: { $avg: '$performance.averageDeliveryTime' },
        avgFailureRate: { $avg: '$performance.failureRate' },
        avgRetryRate: { $avg: '$performance.retryRate' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalActioned: 0,
    totalFailed: 0,
    avgDeliveryTime: 0,
    avgFailureRate: 0,
    avgRetryRate: 0
  };
};

export default mongoose.model('NotificationAnalytics', notificationAnalyticsSchema);