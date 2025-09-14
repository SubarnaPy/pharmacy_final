import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import compromise from 'compromise';

/**
 * Conversation Analytics Service using AI and NLP
 * Provides sentiment analysis, topic extraction, and engagement scoring
 */
class ConversationAnalyticsService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Initialize NLP tools
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
    
    // Health-related keywords for topic extraction
    this.healthTopics = {
      symptoms: ['pain', 'ache', 'fever', 'headache', 'nausea', 'dizzy', 'tired', 'fatigue', 'cough', 'cold'],
      medications: ['medicine', 'drug', 'pill', 'tablet', 'prescription', 'dose', 'medication'],
      conditions: ['diabetes', 'hypertension', 'asthma', 'depression', 'anxiety', 'allergy'],
      wellness: ['exercise', 'diet', 'sleep', 'stress', 'nutrition', 'fitness', 'health'],
      mental_health: ['stress', 'anxiety', 'depression', 'mood', 'mental', 'emotional', 'therapy'],
      emergency: ['emergency', 'urgent', 'serious', 'severe', 'critical', 'hospital', 'ambulance']
    };
  }

  /**
   * Analyze conversation sentiment using multiple approaches
   * @param {string} message - User message to analyze
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeConversationSentiment(message, context = {}) {
    try {
      console.log('🔍 Analyzing conversation sentiment for message:', message.substring(0, 100));

      // Basic sentiment analysis using Natural
      const tokens = this.tokenizer.tokenize(message.toLowerCase());
      const score = this.sentimentAnalyzer.getSentiment(tokens);
      
      // Normalize score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, score / 5));
      
      // Classify sentiment
      let classification = 'neutral';
      let confidence = 0.5;
      
      if (normalizedScore > 0.1) {
        classification = 'positive';
        confidence = Math.min(1, normalizedScore + 0.3);
      } else if (normalizedScore < -0.1) {
        classification = 'negative';
        confidence = Math.min(1, Math.abs(normalizedScore) + 0.3);
      }

      // Enhanced sentiment analysis using Gemini AI for medical context
      const aiSentiment = await this.analyzeWithGemini(message, context);

      // Detect emotional indicators
      const emotions = this.detectEmotions(message);
      
      // Detect urgency indicators
      const urgency = this.detectUrgency(message);

      const result = {
        score: normalizedScore,
        classification: classification,
        confidence: confidence,
        emotions: emotions,
        urgency: urgency,
        aiEnhanced: aiSentiment,
        medicalContext: this.extractMedicalContext(message),
        timestamp: new Date()
      };

      console.log('✅ Sentiment analysis result:', {
        classification: result.classification,
        score: result.score.toFixed(2),
        confidence: result.confidence.toFixed(2),
        emotions: result.emotions,
        urgency: result.urgency
      });

      return result;

    } catch (error) {
      console.error('❌ Sentiment analysis failed:', error);
      return {
        score: 0,
        classification: 'neutral',
        confidence: 0.5,
        emotions: [],
        urgency: 'low',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Extract health-related topics from conversation
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @returns {Promise<Array>} Array of extracted topics
   */
  async extractHealthTopics(message, context = {}) {
    try {
      console.log('🏷️ Extracting health topics from message');

      const topics = [];
      const doc = compromise(message.toLowerCase());
      
      // Extract nouns and medical terms
      const nouns = doc.nouns().out('array');
      const adjectives = doc.adjectives().out('array');
      
      // Check against health topic categories
      for (const [category, keywords] of Object.entries(this.healthTopics)) {
        const foundKeywords = [];
        
        keywords.forEach(keyword => {
          if (message.toLowerCase().includes(keyword) || 
              nouns.some(noun => noun.includes(keyword)) ||
              adjectives.some(adj => adj.includes(keyword))) {
            foundKeywords.push(keyword);
          }
        });
        
        if (foundKeywords.length > 0) {
          topics.push({
            category: category,
            keywords: foundKeywords,
            relevance: foundKeywords.length / keywords.length,
            confidence: Math.min(1, foundKeywords.length * 0.3)
          });
        }
      }

      // Enhanced topic extraction using Gemini AI
      const aiTopics = await this.extractTopicsWithGemini(message, context);
      
      // Merge topics
      const mergedTopics = this.mergeTopics(topics, aiTopics);

      console.log('✅ Extracted topics:', mergedTopics.map(t => `${t.category} (${t.confidence.toFixed(2)})`));
      
      return mergedTopics;

    } catch (error) {
      console.error('❌ Topic extraction failed:', error);
      return [];
    }
  }

  /**
   * Calculate engagement score based on conversation patterns
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} Engagement score and metrics
   */
  async calculateEngagementScore(message, context = {}) {
    try {
      console.log('📊 Calculating engagement score');

      const metrics = {
        messageLength: message.length,
        wordCount: message.split(/\s+/).length,
        questionCount: (message.match(/\?/g) || []).length,
        exclamationCount: (message.match(/!/g) || []).length,
        emotionWords: this.countEmotionWords(message),
        medicalTerms: this.countMedicalTerms(message),
        personalPronouns: this.countPersonalPronouns(message)
      };

      // Calculate base engagement score
      let score = 0;
      
      // Length factor (optimal range: 10-200 characters)
      if (metrics.messageLength >= 10 && metrics.messageLength <= 200) {
        score += 0.2;
      } else if (metrics.messageLength > 200) {
        score += 0.1; // Longer messages might indicate high engagement but could be rambling
      }

      // Question factor (shows curiosity and engagement)
      score += Math.min(0.3, metrics.questionCount * 0.1);

      // Emotion factor (shows emotional investment)
      score += Math.min(0.2, metrics.emotionWords * 0.05);

      // Medical terms factor (shows health focus)
      score += Math.min(0.2, metrics.medicalTerms * 0.05);

      // Personal pronouns factor (shows personal relevance)
      score += Math.min(0.1, metrics.personalPronouns * 0.02);

      // Conversation history factor
      if (context.conversationHistory) {
        const historyScore = this.calculateHistoryEngagement(context.conversationHistory);
        score += historyScore * 0.2;
      }

      // Normalize to 0-1 range
      score = Math.max(0, Math.min(1, score));

      // Classify engagement level
      let level = 'low';
      if (score > 0.7) level = 'high';
      else if (score > 0.4) level = 'medium';

      const result = {
        score: score,
        level: level,
        metrics: metrics,
        factors: {
          length: metrics.messageLength >= 10 && metrics.messageLength <= 200,
          questions: metrics.questionCount > 0,
          emotions: metrics.emotionWords > 0,
          medical: metrics.medicalTerms > 0,
          personal: metrics.personalPronouns > 0
        },
        timestamp: new Date()
      };

      console.log('✅ Engagement score:', {
        score: result.score.toFixed(2),
        level: result.level,
        factors: Object.entries(result.factors).filter(([k, v]) => v).map(([k]) => k)
      });

      return result;

    } catch (error) {
      console.error('❌ Engagement calculation failed:', error);
      return {
        score: 0.5,
        level: 'medium',
        metrics: {},
        factors: {},
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Enhanced sentiment analysis using Gemini AI
   */
  async analyzeWithGemini(message, context) {
    try {
      const prompt = `
Analyze the sentiment and emotional context of this healthcare-related message:

Message: "${message}"

Provide analysis in this JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "emotions": ["emotion1", "emotion2"],
  "healthConcern": "none|mild|moderate|high|critical",
  "urgency": "low|medium|high|emergency"
}

Focus on healthcare context and patient emotional state.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch {
        return { sentiment: 'neutral', confidence: 0.5, emotions: [], healthConcern: 'mild', urgency: 'low' };
      }
    } catch (error) {
      console.error('Gemini sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 0.5, emotions: [], healthConcern: 'mild', urgency: 'low' };
    }
  }

  /**
   * Extract topics using Gemini AI
   */
  async extractTopicsWithGemini(message, context) {
    try {
      const prompt = `
Extract health-related topics from this message:

Message: "${message}"

Return JSON array of topics:
[
  {
    "category": "symptoms|medications|conditions|wellness|mental_health|emergency",
    "keywords": ["keyword1", "keyword2"],
    "confidence": 0.0-1.0
  }
]

Focus on medical and health-related content only.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Gemini topic extraction failed:', error);
      return [];
    }
  }

  /**
   * Detect emotions in text
   */
  detectEmotions(message) {
    const emotionPatterns = {
      worried: ['worried', 'concerned', 'anxious', 'nervous', 'scared'],
      happy: ['happy', 'good', 'great', 'excellent', 'wonderful', 'glad'],
      sad: ['sad', 'depressed', 'down', 'upset', 'unhappy'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
      confused: ['confused', 'unsure', 'uncertain', 'unclear', 'puzzled'],
      hopeful: ['hopeful', 'optimistic', 'confident', 'positive'],
      fearful: ['afraid', 'scared', 'terrified', 'frightened', 'fear']
    };

    const detectedEmotions = [];
    const lowerMessage = message.toLowerCase();

    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        detectedEmotions.push(emotion);
      }
    }

    return detectedEmotions;
  }

  /**
   * Detect urgency indicators
   */
  detectUrgency(message) {
    const urgencyPatterns = {
      emergency: ['emergency', 'urgent', 'asap', 'immediately', 'critical', 'severe'],
      high: ['important', 'serious', 'worried', 'concerned', 'help'],
      medium: ['soon', 'should', 'need to', 'when'],
      low: ['eventually', 'sometime', 'maybe', 'might']
    };

    const lowerMessage = message.toLowerCase();

    for (const [level, patterns] of Object.entries(urgencyPatterns)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return level;
      }
    }

    return 'low';
  }

  /**
   * Extract medical context indicators
   */
  extractMedicalContext(message) {
    const medicalIndicators = {
      symptoms: this.healthTopics.symptoms.some(s => message.toLowerCase().includes(s)),
      medications: this.healthTopics.medications.some(m => message.toLowerCase().includes(m)),
      conditions: this.healthTopics.conditions.some(c => message.toLowerCase().includes(c)),
      emergency: this.healthTopics.emergency.some(e => message.toLowerCase().includes(e))
    };

    return medicalIndicators;
  }

  /**
   * Count emotion words in message
   */
  countEmotionWords(message) {
    const emotionWords = ['feel', 'feeling', 'worried', 'happy', 'sad', 'angry', 'scared', 'confused', 'excited', 'nervous'];
    return emotionWords.filter(word => message.toLowerCase().includes(word)).length;
  }

  /**
   * Count medical terms in message
   */
  countMedicalTerms(message) {
    const allMedicalTerms = Object.values(this.healthTopics).flat();
    return allMedicalTerms.filter(term => message.toLowerCase().includes(term)).length;
  }

  /**
   * Count personal pronouns
   */
  countPersonalPronouns(message) {
    const pronouns = ['i', 'me', 'my', 'myself', 'we', 'us', 'our'];
    const words = message.toLowerCase().split(/\s+/);
    return pronouns.filter(pronoun => words.includes(pronoun)).length;
  }

  /**
   * Calculate engagement from conversation history
   */
  calculateHistoryEngagement(history) {
    if (!history || history.length === 0) return 0;
    
    const recentMessages = history.slice(-5); // Last 5 messages
    const avgLength = recentMessages.reduce((sum, msg) => sum + (msg.length || 0), 0) / recentMessages.length;
    
    // Normalize based on optimal message length
    return Math.min(1, avgLength / 100);
  }

  /**
   * Merge topics from different sources
   */
  mergeTopics(basicTopics, aiTopics) {
    const merged = [...basicTopics];
    
    aiTopics.forEach(aiTopic => {
      const existing = merged.find(t => t.category === aiTopic.category);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, aiTopic.confidence);
        existing.keywords = [...new Set([...existing.keywords, ...aiTopic.keywords])];
      } else {
        merged.push(aiTopic);
      }
    });

    return merged.sort((a, b) => b.confidence - a.confidence);
  }
}

// Create singleton instance
const conversationAnalytics = new ConversationAnalyticsService();

// Export individual functions
export const analyzeConversationSentiment = (message, context) => 
  conversationAnalytics.analyzeConversationSentiment(message, context);

export const extractHealthTopics = (message, context) => 
  conversationAnalytics.extractHealthTopics(message, context);

export const calculateEngagementScore = (message, context) => 
  conversationAnalytics.calculateEngagementScore(message, context);

// Export the service class and instance
export { ConversationAnalyticsService };
export default conversationAnalytics;