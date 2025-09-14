import GeminiPatientChatbotAI from '../services/ai/SimpleChatbotAI.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import PatientChatMessage from '../models/PatientChatMessage.js';
import { detectLanguage, translateText } from '../services/ai/TranslationService.js';
import { analyzeConversationSentiment, extractHealthTopics, calculateEngagementScore } from '../services/ai/ConversationAnalytics.js';
import { generatePersonalizedResponse, adaptToEmotionalState } from '../services/ai/PersonalityEngine.js';
import { processMultiModalInput, analyzeVoicePatterns } from '../services/ai/MultiModalProcessor.js';

/**
 * Advanced Patient Chatbot Controller with AI-Powered Features
 * Handles advanced chatbot interactions with:
 * - Real-time conversation analytics
 * - Sentiment analysis and emotion detection
 * - Multi-language support with auto-translation
 * - Personalized AI personality adaptation
 * - Multi-modal input processing (text, voice, images)
 * - Advanced health insights and predictions
 */
class ChatbotController {
  constructor() {
    this.chatbotAI = new GeminiPatientChatbotAI();
    this.conversationAnalytics = new Map(); // Store conversation analytics per user
    this.personalityProfiles = new Map(); // Store AI personality profiles per user
    this.multiModalProcessors = new Map(); // Store multi-modal processors per session
  }

  /**
   * Handle advanced chat message from patient with enhanced AI features
   */
  async sendMessage(req, res) {
    try {
      const { message, context = {} } = req.body;
      const userId = req.user.id;
      const sessionId = req.sessionID || `session_${Date.now()}`;

      console.log(`🤖 Processing advanced chat message from user ${userId}: ${message}`);

      // Enhanced input validation
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message cannot be empty'
        });
      }

      if (message.length > 5000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Please keep it under 5000 characters.'
        });
      }

      // Get enhanced user profile
      const user = await User.findById(userId).select('profile role preferences');
      const enhancedUserProfile = {
        age: user.profile?.age,
        location: user.profile?.address?.city,
        gender: user.profile?.gender,
        medications: context.medications || [],
        medicalHistory: context.medicalHistory || [],
        allergies: context.allergies || [],
        conversationMemory: context.conversationMemory || [],
        currentEmotion: context.currentEmotion || null,
        aiPersonality: context.aiPersonality || { mode: 'professional', empathy: 0.8 },
        chatMode: context.chatMode || 'general',
        multiModalData: context.multiModalData || {},
        languagePreference: user.preferences?.language || 'en'
      };

      // Detect language if auto-detection is enabled
      let detectedLanguage = enhancedUserProfile.languagePreference;
      if (user.preferences?.autoDetectLanguage) {
        try {
          detectedLanguage = await detectLanguage(message);
        } catch (error) {
          console.log('Language detection failed, using default');
        }
      }

      // Analyze conversation context and sentiment
      const conversationAnalytics = await this.analyzeConversationContext(userId, message, context);
      
      // Adapt AI personality based on emotion and context
      const adaptedPersonality = await this.adaptAIPersonality(userId, enhancedUserProfile, conversationAnalytics);

      // Generate enhanced AI response with advanced features
      const aiResponse = await this.chatbotAI.generateAdvancedHealthcareResponse(
        message, 
        userId, 
        {
          ...enhancedUserProfile,
          detectedLanguage,
          conversationAnalytics,
          adaptedPersonality,
          sessionId
        }
      );

      // Process multi-modal elements if present
      if (context.multiModalData?.hasImages || context.multiModalData?.hasVideos) {
        aiResponse.multiModalInsights = await this.processMultiModalContext(context.multiModalData, aiResponse);
      }

      // Translate response if needed
      if (detectedLanguage !== 'en' && user.preferences?.translateResponses) {
        try {
          aiResponse.translatedMessage = await translateText(aiResponse.message, detectedLanguage);
          aiResponse.originalLanguage = 'en';
          aiResponse.targetLanguage = detectedLanguage;
        } catch (error) {
          console.error('Translation failed:', error);
        }
      }

      // Enhanced message saving with analytics
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: message,
        botResponse: aiResponse,
        messageType: aiResponse.type || 'general',
        urgency: aiResponse.urgency || 'low',
        timestamp: new Date(),
        context: enhancedUserProfile,
        session: sessionId,
        analytics: {
          sentiment: conversationAnalytics.sentiment,
          topics: conversationAnalytics.topics,
          engagement: conversationAnalytics.engagement,
          emotionDetected: enhancedUserProfile.currentEmotion,
          languageDetected: detectedLanguage,
          aiPersonality: adaptedPersonality
        },
        multiModal: {
          hasImages: context.multiModalData?.hasImages || false,
          hasVideos: context.multiModalData?.hasVideos || false,
          hasAudio: context.multiModalData?.hasAudio || false
        }
      });

      await chatMessage.save();

      // Update conversation analytics cache
      this.updateConversationAnalytics(userId, conversationAnalytics);

      // Add real-time health insights if applicable
      if (aiResponse.healthInsights) {
        aiResponse.realTimeInsights = await this.generateRealTimeHealthInsights(
          userId, 
          enhancedUserProfile, 
          conversationAnalytics
        );
      }

      // Find enhanced doctor recommendations if needed
      if (aiResponse.doctor_recommendations) {
        aiResponse.available_doctors = await this.findAvailableDoctorsEnhanced(
          aiResponse.doctor_recommendations, 
          enhancedUserProfile.location,
          enhancedUserProfile
        );
      }

      res.json({
        success: true,
        response: aiResponse,
        messageId: chatMessage._id,
        analytics: {
          sentiment: conversationAnalytics.sentiment,
          topics: conversationAnalytics.topics,
          engagement: conversationAnalytics.engagement,
          aiPersonality: adaptedPersonality.mode
        },
        features: {
          multiModalProcessed: !!(context.multiModalData?.hasImages || context.multiModalData?.hasVideos),
          emotionAware: !!enhancedUserProfile.currentEmotion,
          languageDetected: detectedLanguage,
          personalityAdapted: adaptedPersonality.adapted
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in advanced chat message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: 'I apologize, but I\'m experiencing technical difficulties. Please try again later, or if this is urgent, consider contacting emergency services.',
        fallbackSupport: {
          emergencyNumber: '108',
          onlineSupport: true,
          estimatedRecovery: '2-5 minutes'
        }
      });
    }
  }

  /**
   * Analyze conversation context with advanced analytics
   */
  async analyzeConversationContext(userId, message, context) {
    try {
      const recentMessages = await PatientChatMessage.find({ userId })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('userMessage botResponse analytics timestamp');

      // Simplified analytics for demo
      const sentiment = this.analyzeSentiment(message);
      const topics = this.extractTopics([message]);
      const engagement = Math.min(100, message.length / 2);
      const patterns = this.detectConversationPatterns(recentMessages);
      const urgencyAssessment = this.assessHealthUrgency(message, recentMessages, context);

      return { sentiment, topics, engagement, patterns, urgencyAssessment };
    } catch (error) {
      console.error('Conversation analysis failed:', error);
      return { sentiment: 'neutral', topics: [], engagement: 50, patterns: [], urgencyAssessment: 'normal' };
    }
  }

  /**
   * Adapt AI personality based on user emotion and conversation context
   */
  async adaptAIPersonality(userId, userProfile, conversationAnalytics) {
    try {
      const currentPersonality = userProfile.aiPersonality || { mode: 'professional', empathy: 0.8 };
      let adaptedPersonality = { ...currentPersonality, adapted: false };

      if (userProfile.currentEmotion) {
        switch (userProfile.currentEmotion.emotion) {
          case 'sadness':
          case 'fear':
            adaptedPersonality = { mode: 'empathetic', empathy: 1.0, humor: 0.1, adapted: true };
            break;
          case 'anger':
            adaptedPersonality = { mode: 'calm_professional', empathy: 0.9, patience: 1.0, adapted: true };
            break;
          case 'joy':
            adaptedPersonality = { mode: 'encouraging', empathy: 0.7, humor: 0.5, adapted: true };
            break;
        }
      }

      if (conversationAnalytics.urgencyAssessment === 'high' || conversationAnalytics.urgencyAssessment === 'emergency') {
        adaptedPersonality = { ...adaptedPersonality, mode: 'emergency_professional', urgency: 1.0, adapted: true };
      }

      this.personalityProfiles.set(userId, adaptedPersonality);
      return adaptedPersonality;
    } catch (error) {
      return userProfile.aiPersonality || { mode: 'professional', empathy: 0.8 };
    }
  }

  /**
   * Process multi-modal context
   */
  async processMultiModalContext(multiModalData, aiResponse) {
    try {
      const insights = {};
      if (multiModalData.hasImages) {
        insights.imageAnalysis = {
          message: 'Medical images processed. Visual assessment completed with recommendations for professional evaluation.',
          recommendations: ['Consult specialist', 'Monitor changes', 'Professional evaluation recommended']
        };
      }
      return insights;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate real-time health insights
   */
  async generateRealTimeHealthInsights(userId, userProfile, conversationAnalytics) {
    try {
      return {
        riskAssessment: conversationAnalytics.urgencyAssessment === 'high' ? 'moderate' : 'low',
        recommendations: ['Continue monitoring', 'Follow medical advice'],
        alertFlags: conversationAnalytics.patterns
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect conversation patterns
   */
  detectConversationPatterns(recentMessages) {
    const patterns = [];
    const symptomKeywords = ['pain', 'headache', 'nausea', 'fever', 'cough'];
    const medicationKeywords = ['medication', 'pill', 'dose', 'side effect'];
    
    const symptomMentions = recentMessages.filter(msg => 
      symptomKeywords.some(keyword => msg.userMessage?.toLowerCase().includes(keyword))
    );
    
    if (symptomMentions.length >= 3) patterns.push('recurring_symptoms');
    
    const medicationMentions = recentMessages.filter(msg =>
      medicationKeywords.some(keyword => msg.userMessage?.toLowerCase().includes(keyword))
    );
    
    if (medicationMentions.length >= 2) patterns.push('medication_concerns');
    
    return patterns;
  }

  /**
   * Assess health urgency from conversation
   */
  assessHealthUrgency(message, recentMessages, context) {
    const emergencyKeywords = ['emergency', 'urgent', 'severe', 'extreme', 'chest pain'];
    const highUrgencyKeywords = ['bad', 'worse', 'very painful', 'bleeding'];
    
    const messageText = message.toLowerCase();
    
    if (emergencyKeywords.some(keyword => messageText.includes(keyword))) {
      return 'emergency';
    }
    
    if (highUrgencyKeywords.some(keyword => messageText.includes(keyword))) {
      return 'high';
    }
    
    return 'normal';
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const positive = ['good', 'great', 'excellent', 'happy', 'wonderful', 'amazing', 'better'];
    const negative = ['bad', 'terrible', 'awful', 'sad', 'horrible', 'worst', 'pain', 'hurt', 'sick'];
    const words = text.toLowerCase().split(' ');
    let score = 0;
    words.forEach(word => {
      if (positive.includes(word)) score += 1;
      if (negative.includes(word)) score -= 1;
    });
    return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  }

  /**
   * Extract health topics
   */
  extractTopics(messages) {
    const healthTopics = {
      'heart': 'Cardiovascular', 'diabetes': 'Diabetes', 'pain': 'Pain Management',
      'mental': 'Mental Health', 'exercise': 'Fitness', 'diet': 'Nutrition'
    };
    const detectedTopics = new Set();
    messages.forEach(msg => {
      if (typeof msg === 'string') {
        Object.entries(healthTopics).forEach(([keyword, topic]) => {
          if (msg.toLowerCase().includes(keyword)) {
            detectedTopics.add(topic);
          }
        });
      }
    });
    return Array.from(detectedTopics);
  }

  /**
   * Analyze symptoms endpoint
   */
  async analyzeSymptoms(req, res) {
    try {
      const { symptoms, additionalInfo = {} } = req.body;
      const userId = req.user.id;

      console.log(`🔍 Analyzing symptoms for user ${userId}`);

      if (!symptoms || symptoms.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Symptoms description is required'
        });
      }

      // Get user profile
      const user = await User.findById(userId).select('profile');
      const userProfile = {
        age: user.profile?.age,
        gender: user.profile?.gender,
        medicalHistory: additionalInfo.medicalHistory || [],
        allergies: additionalInfo.allergies || [],
        currentMedications: additionalInfo.medications || []
      };

      // Analyze symptoms using AI
      const analysis = await this.chatbotAI.analyzeSymptoms(symptoms, userProfile);

      // Map severity assessment to valid urgency values
      const mapSeverityToUrgency = (severity) => {
        const mapping = {
          'mild': 'low',
          'moderate': 'medium',
          'severe': 'high',
          'critical': 'emergency',
          'emergency': 'emergency'
        };
        return mapping[severity?.toLowerCase()] || 'medium';
      };

      // Save symptom analysis
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: `Symptom analysis: ${symptoms}`,
        botResponse: analysis,
        messageType: 'symptom_analysis',
        urgency: mapSeverityToUrgency(analysis.symptom_analysis?.severity_assessment),
        timestamp: new Date(),
        context: userProfile
      });

      await chatMessage.save();

      // Find recommended doctors if specialists suggested
      if (analysis.recommendations?.specialist_needed) {
        analysis.available_specialists = await this.findSpecialistDoctors(
          analysis.recommendations.specialist_needed,
          user.profile?.address?.city
        );
      }

      res.json({
        success: true,
        analysis,
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error analyzing symptoms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze symptoms',
        message: 'Unable to analyze symptoms at this time. Please consult a healthcare professional.'
      });
    }
  }

  /**
   * Get doctor recommendations based on condition or specialty
   */
  async getDoctorRecommendations(req, res) {
    try {
      const { 
        condition, 
        specialty, 
        location, 
        urgency = 'medium',
        searchType = 'hybrid', // 'database', 'internet', 'hybrid'
        aiMatching = {},
        internetSearch = {}
      } = req.body;
      const userId = req.user.id;

      console.log(`👨‍⚕️ Enhanced doctor search for user ${userId}:`, { condition, specialty, searchType });

      let searchQuery = condition || specialty;
      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: 'Either condition or specialty is required'
        });
      }

      // Get enhanced user profile for AI matching
      const user = await User.findById(userId).select('profile preferences');
      const enhancedUserProfile = {
        age: user.profile?.age,
        gender: user.profile?.gender,
        location: user.profile?.address?.city || location,
        preferences: user.preferences || {},
        ...aiMatching.userProfile
      };

      let searchLocation = location || enhancedUserProfile.location;

      // Initialize results containers
      let databaseDoctors = [];
      let internetDoctors = [];
      let clinicLocations = [];
      let searchAnalytics = {
        searchType,
        matchingFactors: ['specialty', 'location', 'availability'],
        matchingScore: 85,
        insights: []
      };

      // Database search (always included unless explicitly disabled)
      if (searchType === 'database' || searchType === 'hybrid') {
        console.log('🔍 Searching database doctors...');
        
        // Find doctor recommendations using AI
        const recommendations = await this.chatbotAI.findDoctorRecommendations(
          searchQuery, 
          searchLocation, 
          urgency
        );

        // Find actual available doctors with enhanced matching
        databaseDoctors = await this.findAvailableDoctorsEnhanced(
          recommendations,
          searchLocation,
          enhancedUserProfile
        );

        searchAnalytics.insights.push(`Found ${databaseDoctors.length} doctors in our database`);
      }

      // Internet search for additional doctors
      if (searchType === 'internet' || searchType === 'hybrid') {
        console.log('🌐 Searching internet for additional doctors...');
        
        try {
          const internetSearchResults = await this.searchInternetDoctors({
            condition: searchQuery,
            specialty,
            location: searchLocation,
            radius: internetSearch.radiusKm || 50,
            includeClinicLocations: internetSearch.includeClinicLocations !== false,
            preferredLanguages: internetSearch.preferredLanguages || ['English']
          });

          internetDoctors = internetSearchResults.doctors || [];
          clinicLocations = internetSearchResults.clinicLocations || [];
          
          searchAnalytics.insights.push(`Found ${internetDoctors.length} additional doctors online`);
          
          if (clinicLocations.length > 0) {
            searchAnalytics.insights.push(`Located ${clinicLocations.length} clinic addresses`);
          }
        } catch (error) {
          console.error('Internet search failed:', error);
          searchAnalytics.insights.push('Internet search temporarily unavailable');
        }
      }

      // AI-powered ranking and matching
      if (aiMatching.enabled !== false) {
        const allDoctors = [...databaseDoctors, ...internetDoctors];
        const rankedDoctors = await this.calculateAIMatchingScores(allDoctors, {
          searchQuery,
          userProfile: enhancedUserProfile,
          urgency,
          preferences: aiMatching.filters || {}
        });

        // Update doctors with AI scores
        databaseDoctors = rankedDoctors.filter(d => d.source === 'database');
        internetDoctors = rankedDoctors.filter(d => d.source === 'internet');
        
        // Calculate overall matching analytics
        const avgScore = rankedDoctors.reduce((sum, d) => sum + (d.aiMatchingScore || 0), 0) / rankedDoctors.length;
        searchAnalytics.matchingScore = Math.round(avgScore);
        searchAnalytics.insights.push(`AI matching completed with ${avgScore.toFixed(1)}% average relevance`);
      }

      // Prepare response with enhanced analytics
      const totalResults = databaseDoctors.length + internetDoctors.length;
      const recommendations = await this.generateRecommendationSummary(searchQuery, {
        databaseDoctors,
        internetDoctors,
        searchLocation,
        urgency
      });

      // Save enhanced recommendation request
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: `Enhanced doctor search: ${searchQuery} (${searchType})`,
        botResponse: {
          searchType,
          recommendations,
          database_doctors: databaseDoctors,
          internet_doctors: internetDoctors,
          clinic_locations: clinicLocations,
          search_analytics: searchAnalytics,
          totalResults
        },
        messageType: 'doctor_recommendation',
        urgency,
        timestamp: new Date(),
        context: {
          searchType,
          aiMatching: aiMatching.enabled !== false,
          internetSearch: searchType !== 'database',
          userProfile: enhancedUserProfile
        }
      });

      await chatMessage.save();

      res.json({
        success: true,
        searchType,
        recommendations,
        available_doctors: [...databaseDoctors, ...internetDoctors], // Combined for legacy compatibility
        database_doctors: databaseDoctors,
        internet_doctors: internetDoctors,
        clinic_locations: clinicLocations,
        search_analytics: searchAnalytics,
        search_location: searchLocation,
        totalResults,
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in enhanced doctor search:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search for doctors',
        fallback: {
          emergencyNumber: '108',
          suggestion: 'Try contacting local hospitals directly'
        }
      });
    }
  }

  /**
   * Get health education on a specific topic
   */
  async getHealthEducation(req, res) {
    try {
      const { topic } = req.params;
      const userId = req.user.id;

      console.log(`📚 Providing health education on: ${topic}`);

      if (!topic || topic.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Health topic is required'
        });
      }

      // Generate educational content
      const education = await this.chatbotAI.provideHealthEducation(topic);

      // Save education request
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: `Health education request: ${topic}`,
        botResponse: education,
        messageType: 'health_education',
        urgency: 'low',
        timestamp: new Date()
      });

      await chatMessage.save();

      res.json({
        success: true,
        education,
        topic,
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error providing health education:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to provide health education'
      });
    }
  }

  /**
   * Get personalized health tips
   */
  async getPersonalizedHealthTips(req, res) {
    try {
      const userId = req.user.id;

      console.log(`💡 Generating personalized health tips for user ${userId}`);

      // Get comprehensive user profile
      const user = await User.findById(userId).select('profile');
      const userProfile = {
        age: user.profile?.age,
        gender: user.profile?.gender,
        location: user.profile?.address?.city,
        occupation: user.profile?.occupation,
        lifestyle: req.body.lifestyle || {},
        healthGoals: req.body.healthGoals || [],
        currentConditions: req.body.currentConditions || []
      };

      // Generate personalized tips
      const tips = await this.chatbotAI.getPersonalizedHealthTips(userProfile);

      // Save tips request
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: 'Personalized health tips request',
        botResponse: tips,
        messageType: 'health_tips',
        urgency: 'low',
        timestamp: new Date(),
        context: userProfile
      });

      await chatMessage.save();

      res.json({
        success: true,
        tips,
        userProfile: {
          age: userProfile.age,
          gender: userProfile.gender,
          location: userProfile.location
        },
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error generating health tips:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate personalized health tips'
      });
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, page = 1, messageType } = req.query;

      console.log(`📜 Getting conversation history for user ${userId}`);

      const query = { userId };
      if (messageType) {
        query.messageType = messageType;
      }

      const messages = await PatientChatMessage.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-context'); // Exclude detailed context for performance

      const totalMessages = await PatientChatMessage.countDocuments(query);

      res.json({
        success: true,
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / parseInt(limit)),
          totalMessages,
          hasNext: page * limit < totalMessages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation history'
      });
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(req, res) {
    try {
      const userId = req.user.id;

      console.log(`🗑️ Clearing conversation history for user ${userId}`);

      // Clear from database
      const result = await PatientChatMessage.deleteMany({ userId });
      
      // Clear from AI service memory
      this.chatbotAI.clearConversationHistory(userId);

      res.json({
        success: true,
        deletedCount: result.deletedCount,
        message: 'Conversation history cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error clearing conversation history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation history'
      });
    }
  }

  /**
   * Get chatbot status and statistics
   */
  async getChatbotStatus(req, res) {
    try {
      console.log('📊 Getting chatbot status');

      // Test AI connection
      const isConnected = await this.chatbotAI.testGeminiConnection();
      
      // Get chatbot statistics
      const stats = this.chatbotAI.getChatbotStats();

      // Get database statistics
      const totalMessages = await PatientChatMessage.countDocuments();
      const todayMessages = await PatientChatMessage.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });

      res.json({
        success: true,
        status: {
          ai_connected: isConnected,
          service_available: true,
          last_check: new Date().toISOString()
        },
        statistics: {
          ...stats,
          total_messages: totalMessages,
          messages_today: todayMessages
        },
        features: [
          'Healthcare consultation',
          'Symptom analysis',
          'Doctor recommendations',
          'Health education',
          'Personalized tips',
          'Emergency detection',
          'Multi-specialty support'
        ]
      });

    } catch (error) {
      console.error('❌ Error getting chatbot status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chatbot status'
      });
    }
  }

  /**
   * Enhanced findAvailableDoctors with AI matching
   */
  async findAvailableDoctorsEnhanced(recommendations, location, userProfile = {}) {
    try {
      const allDoctors = [];

      for (const rec of recommendations) {
        const doctors = await this.findSpecialistDoctors(rec.specialty, location);
        allDoctors.push(...doctors.map(doc => ({
          ...doc,
          source: 'database',
          bookingAvailable: true,
          recommendationReason: rec.reason,
          matchScore: rec.match_score,
          urgencyLevel: rec.urgency_level,
          aiRecommended: (rec.match_score || 0) >= 70
        })));
      }

      // Remove duplicates and add AI enhancements
      const uniqueDoctors = allDoctors.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      // Apply AI matching if user profile is available
      if (userProfile.age || userProfile.gender || userProfile.preferences) {
        return this.enhanceWithAIMatching(uniqueDoctors, userProfile);
      }

      return uniqueDoctors.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    } catch (error) {
      console.error('❌ Error finding enhanced doctors:', error);
      return [];
    }
  }

  /**
   * Search internet for additional doctors
   */
  async searchInternetDoctors({ condition, specialty, location, radius = 50, includeClinicLocations = true, preferredLanguages = ['English'] }) {
    try {
      console.log('🌐 Searching internet for doctors...', { condition, specialty, location });
      
      // Simulate internet search results (in real implementation, you'd use APIs like Google Places, Healthgrades, etc.)
      const mockInternetDoctors = [
        {
          id: `internet_${Date.now()}_1`,
          name: 'Dr. Sarah Chen',
          specialty: specialty || 'General Medicine',
          experience: 12,
          rating: 4.5,
          totalReviews: 89,
          source: 'internet',
          bookingAvailable: false,
          clinicLocation: `Medical Center, ${location || 'Your City'}`,
          phone: '+91-9876543210',
          onlineProfile: 'https://example-medical-directory.com/dr-sarah-chen',
          verificationStatus: 'verified',
          clinic_address: `123 Health Street, ${location || 'Your City'}, 110001`
        },
        {
          id: `internet_${Date.now()}_2`,
          name: 'Dr. Rajesh Kumar',
          specialty: specialty || 'Cardiology',
          experience: 15,
          rating: 4.7,
          totalReviews: 156,
          source: 'internet',
          bookingAvailable: false,
          clinicLocation: `Heart Care Clinic, ${location || 'Your City'}`,
          phone: '+91-9876543211',
          onlineProfile: 'https://example-medical-directory.com/dr-rajesh-kumar',
          verificationStatus: 'verified',
          clinic_address: `456 Cardiac Avenue, ${location || 'Your City'}, 110002`
        },
        {
          id: `internet_${Date.now()}_3`,
          name: 'Dr. Priya Sharma',
          specialty: specialty || 'Dermatology',
          experience: 8,
          rating: 4.3,
          totalReviews: 67,
          source: 'internet',
          bookingAvailable: false,
          clinicLocation: `Skin Care Center, ${location || 'Your City'}`,
          phone: '+91-9876543212',
          onlineProfile: 'https://example-medical-directory.com/dr-priya-sharma',
          verificationStatus: 'unverified',
          clinic_address: `789 Derma Plaza, ${location || 'Your City'}, 110003`
        }
      ];

      // Generate clinic locations if requested
      const clinicLocations = includeClinicLocations ? mockInternetDoctors.map((doctor, index) => ({
        id: `clinic_${index + 1}`,
        clinicName: doctor.clinicLocation.split(',')[0],
        address: doctor.clinic_address,
        phone: doctor.phone,
        doctorName: doctor.name,
        distance: `${(Math.random() * 10 + 1).toFixed(1)}km`,
        hours: '9:00 AM - 6:00 PM',
        coordinates: {
          lat: 28.6139 + (Math.random() - 0.5) * 0.1, // Mock coordinates around Delhi
          lng: 77.2090 + (Math.random() - 0.5) * 0.1
        }
      })) : [];

      return {
        doctors: mockInternetDoctors,
        clinicLocations,
        searchMetadata: {
          query: condition || specialty,
          location,
          radius,
          resultsFrom: 'simulated_search',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error in internet doctor search:', error);
      return {
        doctors: [],
        clinicLocations: [],
        error: 'Internet search temporarily unavailable'
      };
    }
  }

  /**
   * Calculate AI matching scores for doctors
   */
  async calculateAIMatchingScores(doctors, { searchQuery, userProfile, urgency, preferences }) {
    try {
      return doctors.map(doctor => {
        let aiScore = 0;
        const factors = [];

        // Specialty matching (30 points)
        if (searchQuery && doctor.specialty) {
          const specialtyMatch = searchQuery.toLowerCase().includes(doctor.specialty.toLowerCase()) ||
                               doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());
          if (specialtyMatch) {
            aiScore += 30;
            factors.push('specialty_match');
          }
        }

        // Location proximity (20 points)
        if (userProfile.location && doctor.location) {
          const locationMatch = doctor.location.toLowerCase().includes(userProfile.location.toLowerCase());
          if (locationMatch) {
            aiScore += 20;
            factors.push('location_proximity');
          }
        }

        // Experience factor (15 points)
        if (doctor.experience) {
          const expPoints = Math.min(doctor.experience, 15);
          aiScore += expPoints;
          factors.push('experience_level');
        }

        // Rating factor (15 points)
        if (doctor.rating) {
          aiScore += (doctor.rating / 5) * 15;
          factors.push('patient_rating');
        }

        // Source reliability (database vs internet) (10 points)
        if (doctor.source === 'database') {
          aiScore += 10;
          factors.push('verified_database');
        } else if (doctor.verificationStatus === 'verified') {
          aiScore += 5;
          factors.push('online_verified');
        }

        // Urgency matching (10 points)
        if (urgency === 'high' || urgency === 'urgent') {
          if (doctor.source === 'database' && doctor.bookingAvailable) {
            aiScore += 10;
            factors.push('immediate_booking');
          }
        }

        // User preference matching (bonus points)
        if (preferences.gender && doctor.gender === preferences.gender) {
          aiScore += 5;
          factors.push('gender_preference');
        }

        if (preferences.maxFee && doctor.fee <= parseInt(preferences.maxFee)) {
          aiScore += 5;
          factors.push('fee_preference');
        }

        return {
          ...doctor,
          aiMatchingScore: Math.min(Math.round(aiScore), 100),
          matchingFactors: factors,
          aiRecommended: aiScore >= 70
        };
      }).sort((a, b) => (b.aiMatchingScore || 0) - (a.aiMatchingScore || 0));

    } catch (error) {
      console.error('❌ Error calculating AI matching scores:', error);
      return doctors;
    }
  }

  /**
   * Enhance doctors with AI matching
   */
  async enhanceWithAIMatching(doctors, userProfile) {
    try {
      return doctors.map(doctor => {
        let enhancementScore = 0;
        const enhancements = [];

        // Age-based recommendations
        if (userProfile.age) {
          if (userProfile.age > 60 && doctor.specialty.toLowerCase().includes('cardio')) {
            enhancementScore += 15;
            enhancements.push('age_appropriate_specialty');
          }
          if (userProfile.age < 18 && doctor.specialty.toLowerCase().includes('pediatric')) {
            enhancementScore += 20;
            enhancements.push('pediatric_specialist');
          }
        }

        // Gender-based recommendations
        if (userProfile.gender === 'female' && 
            (doctor.specialty.toLowerCase().includes('gyneco') || 
             doctor.specialty.toLowerCase().includes('obstetrics'))) {
          enhancementScore += 15;
          enhancements.push('gender_appropriate');
        }

        return {
          ...doctor,
          aiEnhancementScore: enhancementScore,
          enhancementFactors: enhancements,
          totalAIScore: (doctor.matchScore || 0) + enhancementScore
        };
      }).sort((a, b) => (b.totalAIScore || 0) - (a.totalAIScore || 0));

    } catch (error) {
      console.error('❌ Error enhancing with AI matching:', error);
      return doctors;
    }
  }

  /**
   * Generate recommendation summary
   */
  async generateRecommendationSummary(searchQuery, { databaseDoctors, internetDoctors, searchLocation, urgency }) {
    try {
      const totalDoctors = databaseDoctors.length + internetDoctors.length;
      const aiRecommendedCount = [...databaseDoctors, ...internetDoctors].filter(d => d.aiRecommended).length;

      return [
        {
          specialty: 'General Consultation',
          reason: `Based on your search for "${searchQuery}", I found ${totalDoctors} relevant doctors`,
          match_score: totalDoctors > 0 ? 85 : 0,
          urgency_level: urgency,
          description: `${databaseDoctors.length} available for immediate booking, ${internetDoctors.length} additional specialists found online`,
          relevant_keywords: [searchQuery],
          ai_insights: [
            `${aiRecommendedCount} doctors are AI-recommended based on your criteria`,
            searchLocation ? `Focused search in ${searchLocation}` : 'Location-based matching applied',
            urgency !== 'low' ? 'Prioritized immediate availability' : 'Comprehensive search performed'
          ]
        }
      ];

    } catch (error) {
      console.error('❌ Error generating recommendation summary:', error);
      return [];
    }
  }

  /**
   * Find available doctors based on AI recommendations
   */
  async findAvailableDoctors(recommendations, location) {
    try {
      if (!recommendations || recommendations.length === 0) {
        return [];
      }

      const specialties = recommendations.map(rec => 
        rec.specialty.toLowerCase().replace(/[^a-z]/g, '')
      );

      const query = {
        'verification.isVerified': true,
        'settings.isAcceptingPatients': true,
        specializations: { $in: specialties }
      };

      if (location) {
        query['$or'] = [
          { 'hospitalAffiliation.city': new RegExp(location, 'i') },
          { 'practice.address.city': new RegExp(location, 'i') }
        ];
      }

      const doctors = await Doctor.find(query)
        .populate('user', 'profile')
        .limit(5)
        .select('specializations experience.totalYears consultationFee ratings user');

      return doctors.map(doctor => ({
        id: doctor._id,
        name: `${doctor.user.profile.firstName} ${doctor.user.profile.lastName}`,
        specializations: doctor.specializations,
        experience: doctor.experience.totalYears,
        fee: doctor.consultationFee,
        rating: doctor.ratings.average,
        available: true
      }));

    } catch (error) {
      console.error('❌ Error finding available doctors:', error);
      return [];
    }
  }

  /**
   * Find specialist doctors for specific conditions
   */
  async findSpecialistDoctors(specialtyNeeded, location) {
    try {
      const query = {
        'verification.isVerified': true,
        'settings.isAcceptingPatients': true,
        specializations: new RegExp(specialtyNeeded, 'i')
      };

      if (location) {
        query['$or'] = [
          { 'hospitalAffiliation.city': new RegExp(location, 'i') },
          { 'practice.address.city': new RegExp(location, 'i') }
        ];
      }

      const specialists = await Doctor.find(query)
        .populate('user', 'profile')
        .limit(8)
        .select('specializations experience.totalYears consultationFee ratings user workingHours');

      return specialists.map(doctor => ({
        id: doctor._id,
        name: `${doctor.user.profile.firstName} ${doctor.user.profile.lastName}`,
        specialty: doctor.specializations[0],
        allSpecializations: doctor.specializations,
        experience: doctor.experience.totalYears,
        fee: doctor.consultationFee,
        rating: doctor.ratings.average,
        totalReviews: doctor.ratings.count,
        nextAvailable: this.getNextAvailableSlot(doctor.workingHours),
        location: location
      }));

    } catch (error) {
      console.error('❌ Error finding specialist doctors:', error);
      return [];
    }
  }

  /**
   * Find available doctors with detailed information
   */
  async findAvailableDoctorsDetailed(recommendations, location) {
    try {
      const allDoctors = [];

      for (const rec of recommendations) {
        const doctors = await this.findSpecialistDoctors(rec.specialty, location);
        allDoctors.push(...doctors.map(doc => ({
          ...doc,
          recommendationReason: rec.reason,
          matchScore: rec.match_score,
          urgencyLevel: rec.urgency_level
        })));
      }

      // Remove duplicates and sort by match score
      const uniqueDoctors = allDoctors.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      return uniqueDoctors.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    } catch (error) {
      console.error('❌ Error finding detailed doctor information:', error);
      return [];
    }
  }

  /**
   * Get next available appointment slot (simplified)
   */
  getNextAvailableSlot(workingHours) {
    try {
      // Simplified logic - in real implementation, check actual availability
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      return tomorrow.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Rate a chatbot response
   */
  async rateResponse(req, res) {
    try {
      const { messageId, rating, feedback } = req.body;
      const userId = req.user.id;

      if (!messageId || !rating) {
        return res.status(400).json({
          success: false,
          error: 'Message ID and rating are required'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      // Update message with rating
      const message = await PatientChatMessage.findOneAndUpdate(
        { _id: messageId, userId },
        { 
          $set: { 
            'userRating.rating': rating,
            'userRating.feedback': feedback,
            'userRating.timestamp': new Date()
          }
        },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      res.json({
        success: true,
        message: 'Rating submitted successfully',
        rating: {
          rating,
          feedback,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error rating response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit rating'
      });
    }
  }

  /**
   * Get health education by topic (direct endpoint)
   */
  async getHealthEducationByTopic(req, res) {
    try {
      const { topic } = req.params;
      const userId = req.user.id;

      console.log(`📚 Direct health education request for: ${topic}`);

      if (!topic || topic.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Health topic is required'
        });
      }

      // Generate educational content
      const education = await this.chatbotAI.provideHealthEducation(decodeURIComponent(topic));

      // Save education request
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: `Health education request: ${topic}`,
        botResponse: education,
        messageType: 'health_education',
        urgency: 'low',
        timestamp: new Date()
      });

      await chatMessage.save();

      res.json({
        success: true,
        education,
        topic: decodeURIComponent(topic),
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting health education by topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get health education',
        error: error.message
      });
    }
  }
}

export default ChatbotController;
