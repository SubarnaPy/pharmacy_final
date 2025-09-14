import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Personality Engine Service
 * Provides personalized AI responses and emotional adaptation
 */
class PersonalityEngineService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Personality modes and their characteristics
    this.personalityModes = {
      professional: {
        empathy: 0.7,
        formality: 0.8,
        reassurance: 0.6,
        directness: 0.8,
        warmth: 0.5,
        description: 'Professional, clinical, and informative'
      },
      compassionate: {
        empathy: 0.9,
        formality: 0.4,
        reassurance: 0.9,
        directness: 0.5,
        warmth: 0.9,
        description: 'Warm, understanding, and supportive'
      },
      educational: {
        empathy: 0.6,
        formality: 0.7,
        reassurance: 0.7,
        directness: 0.9,
        warmth: 0.6,
        description: 'Informative, educational, and clear'
      },
      supportive: {
        empathy: 0.8,
        formality: 0.3,
        reassurance: 0.9,
        directness: 0.4,
        warmth: 0.8,
        description: 'Encouraging, positive, and motivating'
      },
      urgent: {
        empathy: 0.7,
        formality: 0.9,
        reassurance: 0.5,
        directness: 1.0,
        warmth: 0.4,
        description: 'Direct, clear, and action-oriented'
      }
    };

    // Emotional states and their response patterns
    this.emotionalStates = {
      anxious: {
        responsePattern: 'reassuring',
        toneAdjustment: 'calming',
        preferredPersonality: 'compassionate',
        keyPhrases: ['understand your concerns', 'it\'s normal to feel', 'let\'s work through this']
      },
      worried: {
        responsePattern: 'supportive',
        toneAdjustment: 'reassuring',
        preferredPersonality: 'supportive',
        keyPhrases: ['I hear your concerns', 'many people experience', 'you\'re taking the right step']
      },
      confused: {
        responsePattern: 'educational',
        toneAdjustment: 'clear',
        preferredPersonality: 'educational',
        keyPhrases: ['let me explain', 'to clarify', 'here\'s what this means']
      },
      frustrated: {
        responsePattern: 'understanding',
        toneAdjustment: 'patient',
        preferredPersonality: 'compassionate',
        keyPhrases: ['I understand your frustration', 'let\'s figure this out together', 'that sounds challenging']
      },
      hopeful: {
        responsePattern: 'encouraging',
        toneAdjustment: 'positive',
        preferredPersonality: 'supportive',
        keyPhrases: ['that\'s great to hear', 'you\'re on the right track', 'keep up the good work']
      },
      scared: {
        responsePattern: 'comforting',
        toneAdjustment: 'gentle',
        preferredPersonality: 'compassionate',
        keyPhrases: ['you\'re not alone', 'it\'s understandable to feel scared', 'let\'s take this step by step']
      }
    };
  }

  /**
   * Generate personalized response based on user profile and context
   * @param {string} baseResponse - Base AI response
   * @param {Object} userProfile - User profile and preferences
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} Personalized response
   */
  async generatePersonalizedResponse(baseResponse, userProfile, context = {}) {
    try {
      console.log('🎭 Generating personalized response with personality adaptation');

      // Determine optimal personality mode
      const personalityMode = this.selectPersonalityMode(userProfile, context);
      
      // Get personality characteristics
      const personality = this.personalityModes[personalityMode];
      
      // Adapt response based on emotional state
      const emotionalAdaptation = this.getEmotionalAdaptation(userProfile.currentEmotion, context);
      
      // Generate personalized response using Gemini AI
      const personalizedResponse = await this.generateAdaptedResponse(
        baseResponse,
        personality,
        emotionalAdaptation,
        userProfile,
        context
      );

      const result = {
        originalResponse: baseResponse,
        personalizedResponse: personalizedResponse,
        personalityMode: personalityMode,
        personalityTraits: personality,
        emotionalAdaptation: emotionalAdaptation,
        adaptationReasons: this.getAdaptationReasons(personalityMode, userProfile, context),
        timestamp: new Date()
      };

      console.log('✅ Personalized response generated:', {
        mode: personalityMode,
        empathy: personality.empathy,
        warmth: personality.warmth,
        emotion: userProfile.currentEmotion || 'neutral'
      });

      return result;

    } catch (error) {
      console.error('❌ Response personalization failed:', error);
      return {
        originalResponse: baseResponse,
        personalizedResponse: baseResponse,
        personalityMode: 'professional',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Adapt AI personality to emotional state
   * @param {string} userId - User ID
   * @param {Object} userProfile - User profile
   * @param {Object} conversationAnalytics - Current conversation analytics
   * @returns {Promise<Object>} Adapted personality configuration
   */
  async adaptToEmotionalState(userId, userProfile, conversationAnalytics) {
    try {
      console.log('🧠 Adapting AI personality to emotional state');

      // Detect current emotional state
      const detectedEmotion = this.detectPrimaryEmotion(conversationAnalytics, userProfile);
      
      // Get base personality preferences
      const basePersonality = userProfile.aiPersonality?.mode || 'professional';
      
      // Calculate adaptation based on emotional state and conversation context
      const adaptation = this.calculatePersonalityAdaptation(
        detectedEmotion,
        conversationAnalytics,
        basePersonality
      );

      // Generate adapted personality configuration
      const adaptedPersonality = {
        mode: adaptation.recommendedMode,
        traits: {
          ...this.personalityModes[adaptation.recommendedMode],
          // Emotional adjustments
          empathy: Math.min(1, this.personalityModes[adaptation.recommendedMode].empathy + adaptation.empathyBoost),
          warmth: Math.min(1, this.personalityModes[adaptation.recommendedMode].warmth + adaptation.warmthBoost),
          reassurance: Math.min(1, this.personalityModes[adaptation.recommendedMode].reassurance + adaptation.reassuranceBoost)
        },
        emotionalState: detectedEmotion,
        adaptationLevel: adaptation.level,
        adaptationReason: adaptation.reason,
        contextFactors: adaptation.contextFactors,
        userId: userId,
        adapted: true,
        timestamp: new Date()
      };

      console.log('✅ Personality adapted:', {
        emotion: detectedEmotion,
        mode: adaptation.recommendedMode,
        level: adaptation.level,
        empathy: adaptedPersonality.traits.empathy.toFixed(2),
        warmth: adaptedPersonality.traits.warmth.toFixed(2)
      });

      return adaptedPersonality;

    } catch (error) {
      console.error('❌ Personality adaptation failed:', error);
      return {
        mode: 'professional',
        traits: this.personalityModes.professional,
        emotionalState: 'neutral',
        adaptationLevel: 'none',
        error: error.message,
        adapted: false,
        timestamp: new Date()
      };
    }
  }

  /**
   * Select optimal personality mode based on context
   */
  selectPersonalityMode(userProfile, context) {
    // Check for urgency indicators
    if (context.urgency === 'emergency' || context.urgency === 'high') {
      return 'urgent';
    }

    // Check emotional state
    if (userProfile.currentEmotion) {
      const emotionalState = this.emotionalStates[userProfile.currentEmotion];
      if (emotionalState?.preferredPersonality) {
        return emotionalState.preferredPersonality;
      }
    }

    // Check conversation analytics
    if (context.conversationAnalytics?.sentiment?.classification === 'negative') {
      return 'compassionate';
    }

    // Check user preferences
    if (userProfile.aiPersonality?.mode) {
      return userProfile.aiPersonality.mode;
    }

    // Check chat mode
    if (userProfile.chatMode === 'educational') {
      return 'educational';
    }

    // Default
    return 'professional';
  }

  /**
   * Get emotional adaptation configuration
   */
  getEmotionalAdaptation(emotion, context) {
    if (!emotion || !this.emotionalStates[emotion]) {
      return {
        pattern: 'neutral',
        tone: 'professional',
        keyPhrases: [],
        adjustments: {}
      };
    }

    const emotionalState = this.emotionalStates[emotion];
    
    return {
      pattern: emotionalState.responsePattern,
      tone: emotionalState.toneAdjustment,
      keyPhrases: emotionalState.keyPhrases,
      adjustments: {
        empathyBoost: emotion === 'scared' || emotion === 'anxious' ? 0.2 : 0.1,
        warmthBoost: emotion === 'worried' || emotion === 'frustrated' ? 0.2 : 0.1,
        reassuranceBoost: emotion === 'anxious' || emotion === 'scared' ? 0.3 : 0.1
      }
    };
  }

  /**
   * Generate adapted response using Gemini AI
   */
  async generateAdaptedResponse(baseResponse, personality, emotionalAdaptation, userProfile, context) {
    try {
      const prompt = `
Adapt this healthcare response to match the specified personality and emotional context:

Original Response: "${baseResponse}"

Personality Mode: ${personality.description}
Traits:
- Empathy Level: ${personality.empathy}
- Formality Level: ${personality.formality}
- Warmth Level: ${personality.warmth}
- Reassurance Level: ${personality.reassurance}

Emotional Adaptation:
- Pattern: ${emotionalAdaptation.pattern}
- Tone: ${emotionalAdaptation.tone}
- Key Phrases to Include: ${emotionalAdaptation.keyPhrases.join(', ')}

User Context:
- Age: ${userProfile.age || 'Unknown'}
- Current Emotion: ${userProfile.currentEmotion || 'Neutral'}
- Language Preference: ${userProfile.languagePreference || 'English'}

Instructions:
1. Maintain all medical accuracy and information
2. Adapt the tone and style to match the personality traits
3. Include appropriate emotional support phrases
4. Keep the response length similar to the original
5. Ensure the response feels natural and human-like

Provide only the adapted response without any additional formatting or explanation.
`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      console.error('AI response adaptation failed:', error);
      return baseResponse; // Return original response on error
    }
  }

  /**
   * Detect primary emotion from conversation analytics
   */
  detectPrimaryEmotion(conversationAnalytics, userProfile) {
    // Check explicit emotion from user profile
    if (userProfile.currentEmotion) {
      return userProfile.currentEmotion;
    }

    // Check conversation analytics
    if (conversationAnalytics?.emotions && conversationAnalytics.emotions.length > 0) {
      return conversationAnalytics.emotions[0]; // Primary emotion
    }

    // Infer from sentiment
    if (conversationAnalytics?.sentiment) {
      const sentiment = conversationAnalytics.sentiment;
      if (sentiment.classification === 'negative' && sentiment.confidence > 0.7) {
        if (conversationAnalytics.urgency === 'high' || conversationAnalytics.urgency === 'emergency') {
          return 'scared';
        }
        return 'worried';
      } else if (sentiment.classification === 'positive' && sentiment.confidence > 0.7) {
        return 'hopeful';
      }
    }

    return 'neutral';
  }

  /**
   * Calculate personality adaptation parameters
   */
  calculatePersonalityAdaptation(emotion, conversationAnalytics, basePersonality) {
    let adaptationLevel = 'none';
    let recommendedMode = basePersonality;
    let empathyBoost = 0;
    let warmthBoost = 0;
    let reassuranceBoost = 0;
    let reason = 'No adaptation needed';
    
    // Emotional state adaptation
    if (emotion !== 'neutral' && this.emotionalStates[emotion]) {
      adaptationLevel = 'moderate';
      recommendedMode = this.emotionalStates[emotion].preferredPersonality;
      reason = `Adapted for ${emotion} emotional state`;
      
      const adjustments = this.emotionalStates[emotion];
      empathyBoost = 0.1;
      warmthBoost = 0.1;
      reassuranceBoost = 0.1;
    }

    // Urgency adaptation
    if (conversationAnalytics?.urgency === 'emergency' || conversationAnalytics?.urgency === 'high') {
      adaptationLevel = 'high';
      recommendedMode = 'urgent';
      reason = 'Adapted for high urgency situation';
      empathyBoost = 0;
      warmthBoost = -0.1;
      reassuranceBoost = 0.2;
    }

    // Sentiment adaptation
    if (conversationAnalytics?.sentiment?.classification === 'negative' && 
        conversationAnalytics.sentiment.confidence > 0.8) {
      adaptationLevel = 'moderate';
      if (recommendedMode === basePersonality) {
        recommendedMode = 'compassionate';
        reason = 'Adapted for negative sentiment';
      }
      empathyBoost += 0.2;
      warmthBoost += 0.2;
      reassuranceBoost += 0.2;
    }

    return {
      level: adaptationLevel,
      recommendedMode: recommendedMode,
      empathyBoost: Math.min(0.3, empathyBoost),
      warmthBoost: Math.min(0.3, warmthBoost),
      reassuranceBoost: Math.min(0.3, reassuranceBoost),
      reason: reason,
      contextFactors: {
        emotion: emotion,
        urgency: conversationAnalytics?.urgency || 'low',
        sentiment: conversationAnalytics?.sentiment?.classification || 'neutral',
        confidence: conversationAnalytics?.sentiment?.confidence || 0
      }
    };
  }

  /**
   * Get adaptation reasons for transparency
   */
  getAdaptationReasons(personalityMode, userProfile, context) {
    const reasons = [];
    
    if (userProfile.currentEmotion && userProfile.currentEmotion !== 'neutral') {
      reasons.push(`Adapted for emotional state: ${userProfile.currentEmotion}`);
    }
    
    if (context.urgency && context.urgency !== 'low') {
      reasons.push(`Adapted for urgency level: ${context.urgency}`);
    }
    
    if (context.conversationAnalytics?.sentiment?.classification === 'negative') {
      reasons.push('Adapted for negative sentiment detected');
    }
    
    if (userProfile.aiPersonality?.mode && userProfile.aiPersonality.mode !== 'professional') {
      reasons.push(`Using preferred personality mode: ${userProfile.aiPersonality.mode}`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Using default professional mode');
    }
    
    return reasons;
  }

  /**
   * Get available personality modes
   */
  getPersonalityModes() {
    return { ...this.personalityModes };
  }

  /**
   * Get emotional states configuration
   */
  getEmotionalStates() {
    return { ...this.emotionalStates };
  }

  /**
   * Update personality mode for user
   */
  updatePersonalityMode(userId, mode, preferences = {}) {
    // This would typically save to database
    // For now, return the configuration
    if (!this.personalityModes[mode]) {
      throw new Error(`Invalid personality mode: ${mode}`);
    }
    
    return {
      userId: userId,
      mode: mode,
      traits: this.personalityModes[mode],
      preferences: preferences,
      updatedAt: new Date()
    };
  }
}

// Create singleton instance
const personalityEngine = new PersonalityEngineService();

// Export individual functions
export const generatePersonalizedResponse = (baseResponse, userProfile, context) => 
  personalityEngine.generatePersonalizedResponse(baseResponse, userProfile, context);

export const adaptToEmotionalState = (userId, userProfile, conversationAnalytics) => 
  personalityEngine.adaptToEmotionalState(userId, userProfile, conversationAnalytics);

// Export the service class and instance
export { PersonalityEngineService };
export default personalityEngine;