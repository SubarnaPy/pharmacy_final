import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';

// Mental Health Tracking Schema
const mentalHealthTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Mood Tracking
  moodEntries: [{
    date: { type: Date, default: Date.now },
    mood: {
      primary: {
        type: String,
        enum: ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'],
        required: true
      },
      emotions: [String], // anxiety, stress, excitement, etc.
      intensity: { type: Number, min: 1, max: 10 },
      notes: String
    },
    triggers: [String],
    medications: [{
      name: String,
      dosage: String,
      timeTaken: Date,
      effectiveness: { type: Number, min: 1, max: 10 }
    }],
    activities: [String],
    sleepHours: Number,
    stressLevel: { type: Number, min: 1, max: 10 },
    energyLevel: { type: Number, min: 1, max: 10 }
  }],
  
  // Mental Health Assessments
  assessments: [{
    type: {
      type: String,
      enum: ['PHQ9', 'GAD7', 'mood_disorder', 'anxiety_disorder', 'custom'],
      required: true
    },
    date: { type: Date, default: Date.now },
    score: Number,
    severity: {
      type: String,
      enum: ['minimal', 'mild', 'moderate', 'severe']
    },
    questions: [{
      question: String,
      answer: mongoose.Schema.Types.Mixed,
      score: Number
    }],
    recommendations: [String],
    followUpNeeded: Boolean
  }],
  
  // Therapy Chat Sessions
  chatSessions: [{
    sessionId: String,
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    messages: [{
      sender: { type: String, enum: ['user', 'ai'] },
      message: String,
      timestamp: { type: Date, default: Date.now },
      sentiment: String,
      keywords: [String]
    }],
    sessionSummary: {
      keyTopics: [String],
      emotionalState: String,
      recommendedActions: [String],
      riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'crisis'] },
      followUpScheduled: Boolean
    }
  }],
  
  // Medication Correlation Analysis
  medicationCorrelations: [{
    medication: String,
    moodImpact: {
      positive: Number,
      negative: Number,
      neutral: Number
    },
    sideEffects: [String],
    effectiveness: Number,
    adherenceImpact: Number,
    notes: String
  }],
  
  // Goals and Progress
  goals: [{
    goal: String,
    category: {
      type: String,
      enum: ['mood', 'anxiety', 'sleep', 'medication', 'therapy', 'lifestyle']
    },
    targetDate: Date,
    progress: { type: Number, min: 0, max: 100 },
    milestones: [{
      description: String,
      achieved: Boolean,
      date: Date
    }]
  }],
  
  // Risk Assessment
  riskAssessment: {
    lastAssessment: Date,
    currentRiskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'crisis'],
      default: 'low'
    },
    riskFactors: [String],
    protectiveFactors: [String],
    interventionPlan: [String],
    emergencyContacts: [{
      name: String,
      relationship: String,
      phone: String,
      isEmergency: Boolean
    }]
  }
}, {
  timestamps: true
});

const MentalHealthTracking = mongoose.model('MentalHealthTracking', mentalHealthTrackingSchema);

/**
 * Mental Health Integration Service
 * Mood tracking, AI therapy chatbot, and correlation with medications
 */
class MentalHealthIntegrationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
  }

  initializeService() {
    this.models = {
      therapyChat: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.7, // Higher for empathetic responses
          topK: 50,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      },
      moodAnalysis: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.3,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      },
      riskAssessment: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.2, // Lower for clinical assessment
          topK: 30,
          topP: 0.8,
          maxOutputTokens: 3072,
          responseMimeType: "application/json"
        }
      }
    };

    this.crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'hurt myself', 'self harm', 'cutting', 'overdose',
      'hopeless', 'no point', 'give up', 'cant go on'
    ];

    this.emergencyResources = {
      crisis: '988', // National Suicide Prevention Lifeline
      text: 'Text HOME to 741741', // Crisis Text Line
      emergency: '911'
    };

    console.log('✅ Mental Health Integration Service initialized');
  }

  /**
   * Record mood entry and analyze patterns
   */
  async recordMoodEntry(userId, moodData) {
    try {
      console.log('🧠 Recording mood entry for user:', userId);

      let tracking = await MentalHealthTracking.findOne({ user: userId });
      if (!tracking) {
        tracking = new MentalHealthTracking({ user: userId });
      }

      // Create mood entry
      const moodEntry = {
        date: new Date(),
        mood: moodData.mood,
        triggers: moodData.triggers || [],
        medications: moodData.medications || [],
        activities: moodData.activities || [],
        sleepHours: moodData.sleepHours,
        stressLevel: moodData.stressLevel,
        energyLevel: moodData.energyLevel
      };

      tracking.moodEntries.push(moodEntry);

      // Analyze mood patterns
      const moodAnalysis = await this.analyzeMoodPatterns(tracking.moodEntries);

      // Check for risk factors
      const riskAssessment = await this.assessMentalHealthRisk(moodData, tracking);

      // Update risk assessment if needed
      if (riskAssessment.riskLevel !== 'low') {
        tracking.riskAssessment.currentRiskLevel = riskAssessment.riskLevel;
        tracking.riskAssessment.lastAssessment = new Date();
        tracking.riskAssessment.riskFactors = riskAssessment.riskFactors;
      }

      await tracking.save();

      return {
        moodEntryId: moodEntry._id,
        moodAnalysis,
        riskAssessment,
        recommendations: this.generateMoodRecommendations(moodAnalysis, riskAssessment),
        correlations: await this.analyzeMediatonMoodCorrelation(userId, moodData)
      };

    } catch (error) {
      console.error('❌ Record mood entry failed:', error);
      throw error;
    }
  }

  /**
   * AI Therapy Chatbot interaction
   */
  async processTherapyChatMessage(userId, message, sessionId = null) {
    try {
      console.log('💬 Processing therapy chat message');

      // Check for crisis indicators
      const crisisDetected = this.detectCrisisIndicators(message);
      if (crisisDetected.isCrisis) {
        return await this.handleCrisisIntervention(userId, message, crisisDetected);
      }

      let tracking = await MentalHealthTracking.findOne({ user: userId });
      if (!tracking) {
        tracking = new MentalHealthTracking({ user: userId });
      }

      // Find or create chat session
      let session = sessionId ? 
        tracking.chatSessions.find(s => s.sessionId === sessionId) :
        null;

      if (!session) {
        session = {
          sessionId: `CHAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: new Date(),
          messages: [],
          sessionSummary: {}
        };
        tracking.chatSessions.push(session);
      }

      // Add user message
      session.messages.push({
        sender: 'user',
        message: message,
        timestamp: new Date(),
        sentiment: this.analyzeSentiment(message),
        keywords: this.extractKeywords(message)
      });

      // Generate AI response
      const aiResponse = await this.generateTherapyResponse(message, session, tracking);

      // Add AI response
      session.messages.push({
        sender: 'ai',
        message: aiResponse.message,
        timestamp: new Date()
      });

      // Update session summary
      session.sessionSummary = aiResponse.sessionSummary;

      await tracking.save();

      return {
        sessionId: session.sessionId,
        aiResponse: aiResponse.message,
        sentiment: aiResponse.sentiment,
        recommendations: aiResponse.recommendations,
        riskLevel: aiResponse.riskLevel,
        followUpSuggested: aiResponse.followUpSuggested
      };

    } catch (error) {
      console.error('❌ Therapy chat processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate AI therapy response
   */
  async generateTherapyResponse(message, session, tracking) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.therapyChat.name,
        generationConfig: this.models.therapyChat.config
      });

      const conversationHistory = session.messages.slice(-5).map(m => 
        `${m.sender}: ${m.message}`
      ).join('\n');

      const recentMoods = tracking.moodEntries?.slice(-3).map(entry => 
        `Date: ${entry.date}, Mood: ${entry.mood.primary}, Stress: ${entry.stressLevel}/10`
      ).join('\n') || 'No recent mood data';

      const prompt = `
You are an empathetic AI therapy assistant. Provide supportive, professional responses to help the user process their emotions and thoughts.

IMPORTANT GUIDELINES:
- Be empathetic, non-judgmental, and supportive
- Use therapeutic techniques like active listening, reflection, and gentle questioning
- Encourage professional help when appropriate
- Never provide medical advice or diagnose
- Focus on emotional support and coping strategies
- If serious mental health concerns are detected, recommend professional help

Recent conversation:
${conversationHistory}

User's recent mood data:
${recentMoods}

Current user message: "${message}"

Provide a therapeutic response following these guidelines:

Return JSON:
{
  "message": "empathetic_therapeutic_response",
  "techniques": ["therapeutic_techniques_used"],
  "sentiment": "positive|negative|neutral",
  "emotionalState": "detected_emotional_state",
  "riskLevel": "low|moderate|high",
  "recommendations": ["helpful_suggestions"],
  "sessionSummary": {
    "keyTopics": ["main_discussion_points"],
    "emotionalJourney": "emotional_progression_in_session",
    "breakthroughs": ["insights_or_progress"],
    "concerns": ["areas_of_concern"]
  },
  "followUpSuggested": boolean,
  "copingStrategies": ["practical_coping_methods"]
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ AI therapy response generation failed:', error);
      return {
        message: "I'm here to listen and support you. How are you feeling today?",
        sentiment: "neutral",
        riskLevel: "low",
        recommendations: ["Continue sharing your thoughts and feelings"]
      };
    }
  }

  /**
   * Analyze mood patterns using AI
   */
  async analyzeMoodPatterns(moodEntries) {
    try {
      if (!moodEntries || moodEntries.length < 3) {
        return { patterns: [], trends: [], insights: [] };
      }

      const model = this.genAI.getGenerativeModel({
        model: this.models.moodAnalysis.name,
        generationConfig: this.models.moodAnalysis.config
      });

      const recentEntries = moodEntries.slice(-14); // Last 2 weeks
      const moodData = recentEntries.map(entry => ({
        date: entry.date,
        mood: entry.mood.primary,
        intensity: entry.mood.intensity,
        stress: entry.stressLevel,
        energy: entry.energyLevel,
        sleep: entry.sleepHours,
        triggers: entry.triggers,
        activities: entry.activities
      }));

      const prompt = `
Analyze mood patterns from the following data:

${JSON.stringify(moodData, null, 2)}

Identify patterns, trends, and provide insights:

Return JSON:
{
  "patterns": [
    {
      "type": "daily|weekly|cyclical|seasonal",
      "description": "pattern_description",
      "frequency": "how_often_occurs",
      "strength": "weak|moderate|strong"
    }
  ],
  "trends": {
    "moodTrend": "improving|declining|stable",
    "stressTrend": "increasing|decreasing|stable",
    "energyTrend": "increasing|decreasing|stable",
    "overallDirection": "positive|negative|neutral"
  },
  "insights": [
    {
      "insight": "key_insight",
      "evidence": "supporting_data",
      "recommendation": "suggested_action"
    }
  ],
  "correlations": [
    {
      "factor1": "variable_name",
      "factor2": "variable_name",
      "correlation": "positive|negative|none",
      "strength": "weak|moderate|strong"
    }
  ],
  "riskFactors": ["identified_risk_factors"],
  "protectiveFactors": ["identified_protective_factors"]
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Mood pattern analysis failed:', error);
      return { patterns: [], trends: {}, insights: [] };
    }
  }

  /**
   * Assess mental health risk
   */
  async assessMentalHealthRisk(moodData, tracking) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.riskAssessment.name,
        generationConfig: this.models.riskAssessment.config
      });

      const recentMoods = tracking.moodEntries?.slice(-7) || [];
      const recentAssessments = tracking.assessments?.slice(-3) || [];

      const prompt = `
Assess mental health risk based on current mood data and history:

Current mood data:
${JSON.stringify(moodData)}

Recent mood history:
${JSON.stringify(recentMoods.map(m => ({
  date: m.date,
  mood: m.mood.primary,
  stress: m.stressLevel,
  energy: m.energyLevel
})))}

Recent assessments:
${JSON.stringify(recentAssessments.map(a => ({
  type: a.type,
  score: a.score,
  severity: a.severity,
  date: a.date
})))}

Assess risk level and provide clinical reasoning:

Return JSON:
{
  "riskLevel": "low|moderate|high|crisis",
  "riskScore": number,
  "riskFactors": ["identified_risk_factors"],
  "protectiveFactors": ["identified_protective_factors"],
  "warningSignes": ["concerning_indicators"],
  "recommendations": ["clinical_recommendations"],
  "interventionNeeded": boolean,
  "urgency": "routine|soon|urgent|immediate",
  "monitoringFrequency": "daily|weekly|biweekly|monthly",
  "reasoning": "clinical_reasoning_for_assessment"
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Mental health risk assessment failed:', error);
      return {
        riskLevel: 'low',
        riskFactors: [],
        recommendations: ['Continue regular mood tracking']
      };
    }
  }

  /**
   * Analyze medication-mood correlations
   */
  async analyzeMediatonMoodCorrelation(userId, moodData) {
    try {
      const tracking = await MentalHealthTracking.findOne({ user: userId });
      if (!tracking || !tracking.moodEntries.length) {
        return { correlations: [] };
      }

      // Find entries with medication data
      const entriesWithMeds = tracking.moodEntries.filter(entry => 
        entry.medications && entry.medications.length > 0
      );

      if (entriesWithMeds.length < 5) {
        return { correlations: [], note: 'Need more data for correlation analysis' };
      }

      // Group by medication and analyze mood patterns
      const medicationGroups = {};
      entriesWithMeds.forEach(entry => {
        entry.medications.forEach(med => {
          if (!medicationGroups[med.name]) {
            medicationGroups[med.name] = [];
          }
          medicationGroups[med.name].push({
            mood: entry.mood.primary,
            intensity: entry.mood.intensity,
            stress: entry.stressLevel,
            energy: entry.energyLevel,
            effectiveness: med.effectiveness,
            date: entry.date
          });
        });
      });

      const correlations = [];
      for (const [medication, data] of Object.entries(medicationGroups)) {
        if (data.length >= 3) {
          const correlation = await this.calculateMoodCorrelation(medication, data);
          correlations.push(correlation);
        }
      }

      return { correlations };

    } catch (error) {
      console.error('❌ Medication correlation analysis failed:', error);
      return { correlations: [] };
    }
  }

  /**
   * Calculate mood correlation for specific medication
   */
  async calculateMoodCorrelation(medication, data) {
    const moodValues = data.map(d => this.moodToNumeric(d.mood));
    const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    const avgStress = data.reduce((a, b) => a + (b.stress || 5), 0) / data.length;
    const avgEnergy = data.reduce((a, b) => a + (b.energy || 5), 0) / data.length;
    const avgEffectiveness = data.reduce((a, b) => a + (b.effectiveness || 5), 0) / data.length;

    return {
      medication,
      sampleSize: data.length,
      averageMood: avgMood,
      averageStress: avgStress,
      averageEnergy: avgEnergy,
      averageEffectiveness: avgEffectiveness,
      trend: avgMood > 3 ? 'positive' : avgMood < 3 ? 'negative' : 'neutral',
      confidence: data.length >= 10 ? 'high' : data.length >= 5 ? 'medium' : 'low'
    };
  }

  // Helper methods
  moodToNumeric(mood) {
    const mapping = {
      'very_sad': 1,
      'sad': 2,
      'neutral': 3,
      'happy': 4,
      'very_happy': 5
    };
    return mapping[mood] || 3;
  }

  detectCrisisIndicators(message) {
    const lowerMessage = message.toLowerCase();
    const crisisWords = this.crisisKeywords.filter(keyword => 
      lowerMessage.includes(keyword)
    );

    return {
      isCrisis: crisisWords.length > 0,
      indicators: crisisWords,
      severity: crisisWords.length > 2 ? 'high' : crisisWords.length > 0 ? 'moderate' : 'low'
    };
  }

  async handleCrisisIntervention(userId, message, crisisDetected) {
    console.log('🚨 CRISIS DETECTED - Initiating intervention');

    // Update risk assessment to crisis level
    await MentalHealthTracking.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'riskAssessment.currentRiskLevel': 'crisis',
          'riskAssessment.lastAssessment': new Date()
        }
      },
      { upsert: true }
    );

    return {
      isCrisis: true,
      message: "I'm very concerned about what you've shared. Your safety is the most important thing right now. Please reach out for immediate help:",
      emergencyResources: this.emergencyResources,
      recommendations: [
        'Call 988 (National Suicide Prevention Lifeline) immediately',
        'Go to your nearest emergency room',
        'Call 911 if you are in immediate danger',
        'Reach out to a trusted friend or family member',
        'Contact your mental health professional if you have one'
      ],
      riskLevel: 'crisis',
      followUpRequired: true
    };
  }

  analyzeSentiment(message) {
    // Simple sentiment analysis - in production, use more sophisticated NLP
    const positiveWords = ['good', 'better', 'happy', 'positive', 'excited', 'grateful'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'depressed', 'hopeless', 'anxious'];

    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  extractKeywords(message) {
    // Extract relevant keywords for therapy context
    const keywords = [];
    const therapeuticTerms = [
      'anxiety', 'depression', 'stress', 'worry', 'fear', 'anger', 'sadness',
      'work', 'family', 'relationship', 'health', 'sleep', 'medication',
      'therapy', 'counseling', 'support', 'coping', 'mindfulness'
    ];

    const lowerMessage = message.toLowerCase();
    therapeuticTerms.forEach(term => {
      if (lowerMessage.includes(term)) {
        keywords.push(term);
      }
    });

    return keywords;
  }

  generateMoodRecommendations(moodAnalysis, riskAssessment) {
    const recommendations = [];

    if (riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'crisis') {
      recommendations.push('Consider contacting a mental health professional');
    }

    if (moodAnalysis.trends?.stressTrend === 'increasing') {
      recommendations.push('Try stress reduction techniques like deep breathing or meditation');
    }

    if (moodAnalysis.trends?.energyTrend === 'decreasing') {
      recommendations.push('Focus on sleep hygiene and gentle physical activity');
    }

    recommendations.push('Continue tracking your mood to identify patterns');

    return recommendations;
  }
}

export { MentalHealthTracking, MentalHealthIntegrationService };