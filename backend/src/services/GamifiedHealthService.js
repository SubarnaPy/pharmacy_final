import mongoose from 'mongoose';

const gamificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Points and Levels
  totalPoints: {
    type: Number,
    default: 0
  },
  currentLevel: {
    type: Number,
    default: 1
  },
  experiencePoints: {
    type: Number,
    default: 0
  },
  
  // Medication Adherence Tracking
  adherenceStreak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastMedicationDate: Date
  },
  
  // Achievements and Badges
  badges: [{
    name: String,
    description: String,
    category: {
      type: String,
      enum: ['adherence', 'health', 'community', 'learning', 'milestone']
    },
    earnedDate: Date,
    iconUrl: String,
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
    }
  }],
  
  // Health Challenges
  activeChallenges: [{
    challengeId: String,
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    target: Number,
    current: Number,
    startDate: Date,
    endDate: Date,
    reward: {
      points: Number,
      badge: String,
      special: String
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'failed', 'expired'],
      default: 'active'
    }
  }],
  
  // Daily/Weekly Goals
  goals: {
    daily: [{
      goal: String,
      target: Number,
      current: Number,
      completed: Boolean,
      date: Date,
      points: Number
    }],
    weekly: [{
      goal: String,
      target: Number,
      current: Number,
      completed: Boolean,
      weekStart: Date,
      points: Number
    }]
  },
  
  // Community Features
  communityStats: {
    helpfulVotes: { type: Number, default: 0 },
    postsShared: { type: Number, default: 0 },
    supportGiven: { type: Number, default: 0 },
    supportReceived: { type: Number, default: 0 }
  },
  
  // Learning and Education
  educationProgress: {
    modulesCompleted: [String],
    quizzesCompleted: [String],
    knowledgePoints: { type: Number, default: 0 },
    certifications: [String]
  },
  
  // Rewards and Redemptions
  rewardsEarned: [{
    reward: String,
    description: String,
    pointsCost: Number,
    earnedDate: Date,
    redeemedDate: Date,
    status: {
      type: String,
      enum: ['earned', 'redeemed', 'expired'],
      default: 'earned'
    }
  }],
  
  // Statistics
  statistics: {
    totalMedicationsTaken: { type: Number, default: 0 },
    perfectAdherenceDays: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    communityInteractions: { type: Number, default: 0 },
    healthScoreImprovement: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
gamificationSchema.index({ user: 1 });
gamificationSchema.index({ totalPoints: -1 });
gamificationSchema.index({ currentLevel: -1 });

// Methods
gamificationSchema.methods.addPoints = function(points, reason) {
  this.totalPoints += points;
  this.experiencePoints += points;
  
  // Check for level up
  const newLevel = Math.floor(this.experiencePoints / 1000) + 1;
  if (newLevel > this.currentLevel) {
    this.currentLevel = newLevel;
    return { levelUp: true, newLevel };
  }
  
  return { levelUp: false, totalPoints: this.totalPoints };
};

gamificationSchema.methods.earnBadge = function(badgeData) {
  const existingBadge = this.badges.find(b => b.name === badgeData.name);
  if (!existingBadge) {
    this.badges.push({
      ...badgeData,
      earnedDate: new Date()
    });
    return true;
  }
  return false;
};

const GamificationProfile = mongoose.model('GamificationProfile', gamificationSchema);

/**
 * Gamified Health Management Service
 */
class GamifiedHealthService {
  constructor() {
    this.pointsConfig = {
      medicationTaken: 10,
      perfectAdherenceDay: 50,
      weeklyStreak: 100,
      monthlyStreak: 500,
      challengeCompleted: 200,
      helpfulCommunityPost: 25,
      healthEducationCompleted: 75
    };
    
    this.badges = {
      adherence: [
        { name: 'First Step', description: 'Take your first medication', requirement: 1 },
        { name: 'Week Warrior', description: '7 days perfect adherence', requirement: 7 },
        { name: 'Month Master', description: '30 days perfect adherence', requirement: 30 },
        { name: 'Consistency King', description: '100 days streak', requirement: 100 }
      ],
      health: [
        { name: 'Health Seeker', description: 'Complete first health assessment', requirement: 1 },
        { name: 'Wellness Warrior', description: 'Improve health score by 20 points', requirement: 20 },
        { name: 'Vitality Victor', description: 'Achieve excellent health status', requirement: 1 }
      ]
    };
    
    console.log('✅ Gamified Health Service initialized');
  }

  /**
   * Record medication taken and award points
   */
  async recordMedicationTaken(userId, medicationData) {
    try {
      let profile = await GamificationProfile.findOne({ user: userId });
      if (!profile) {
        profile = new GamificationProfile({ user: userId });
      }

      // Award points for taking medication
      const pointsResult = profile.addPoints(this.pointsConfig.medicationTaken, 'Medication taken');
      
      // Update adherence streak
      const today = new Date().toDateString();
      const lastMedDate = profile.adherenceStreak.lastMedicationDate?.toDateString();
      
      if (lastMedDate !== today) {
        profile.adherenceStreak.current += 1;
        profile.adherenceStreak.lastMedicationDate = new Date();
        
        if (profile.adherenceStreak.current > profile.adherenceStreak.longest) {
          profile.adherenceStreak.longest = profile.adherenceStreak.current;
        }
      }
      
      // Check for streak badges
      await this.checkStreakBadges(profile);
      
      // Update statistics
      profile.statistics.totalMedicationsTaken += 1;
      
      await profile.save();
      
      return {
        pointsEarned: this.pointsConfig.medicationTaken,
        totalPoints: profile.totalPoints,
        currentStreak: profile.adherenceStreak.current,
        levelUp: pointsResult.levelUp,
        newBadges: [] // Would be populated by checkStreakBadges
      };

    } catch (error) {
      console.error('❌ Record medication failed:', error);
      throw error;
    }
  }

  /**
   * Create health challenges
   */
  async createHealthChallenge(challengeData) {
    const challenges = {
      daily: [
        {
          name: 'Perfect Adherence Day',
          description: 'Take all medications on time today',
          type: 'daily',
          target: 1,
          reward: { points: 50, badge: 'Daily Achiever' }
        }
      ],
      weekly: [
        {
          name: 'Weekly Consistency',
          description: 'Take medications every day this week',
          type: 'weekly',
          target: 7,
          reward: { points: 200, badge: 'Weekly Warrior' }
        }
      ],
      community: [
        {
          name: 'Support Network',
          description: 'Help 5 community members this month',
          type: 'monthly',
          target: 5,
          reward: { points: 300, badge: 'Community Helper' }
        }
      ]
    };

    return challenges;
  }

  /**
   * Check and award streak badges
   */
  async checkStreakBadges(profile) {
    const streakBadges = [
      { days: 7, name: 'Week Warrior', rarity: 'common' },
      { days: 30, name: 'Month Master', rarity: 'uncommon' },
      { days: 100, name: 'Consistency King', rarity: 'rare' },
      { days: 365, name: 'Year Champion', rarity: 'legendary' }
    ];

    for (const badge of streakBadges) {
      if (profile.adherenceStreak.current >= badge.days) {
        const earned = profile.earnBadge({
          name: badge.name,
          description: `${badge.days} days perfect adherence streak`,
          category: 'adherence',
          rarity: badge.rarity
        });
        
        if (earned) {
          console.log(`🏆 Badge earned: ${badge.name}`);
        }
      }
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(timeframe = 'monthly', limit = 10) {
    try {
      const leaderboard = await GamificationProfile.find()
        .populate('user', 'name')
        .sort({ totalPoints: -1 })
        .limit(limit)
        .lean();

      return leaderboard.map((profile, index) => ({
        rank: index + 1,
        userName: profile.user?.name || 'Anonymous',
        points: profile.totalPoints,
        level: profile.currentLevel,
        badges: profile.badges.length,
        streak: profile.adherenceStreak.current
      }));

    } catch (error) {
      console.error('❌ Get leaderboard failed:', error);
      return [];
    }
  }

  /**
   * Generate personalized challenges
   */
  async generatePersonalizedChallenges(userId, healthData) {
    try {
      const profile = await GamificationProfile.findOne({ user: userId });
      if (!profile) return [];

      const challenges = [];

      // Adherence-based challenges
      if (profile.adherenceStreak.current < 7) {
        challenges.push({
          name: 'Build Your Streak',
          description: 'Take medications for 7 consecutive days',
          type: 'weekly',
          target: 7,
          current: profile.adherenceStreak.current,
          reward: { points: 150, badge: 'Streak Starter' }
        });
      }

      // Health improvement challenges
      if (healthData?.healthScore < 80) {
        challenges.push({
          name: 'Health Boost',
          description: 'Improve your health score by 10 points',
          type: 'monthly',
          target: 10,
          current: 0,
          reward: { points: 300, badge: 'Health Improver' }
        });
      }

      return challenges;

    } catch (error) {
      console.error('❌ Generate challenges failed:', error);
      return [];
    }
  }
}

export { GamificationProfile, GamifiedHealthService };