import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import compromise from 'compromise';

/**
 * Advanced Gemini-Powered Patient Chatbot AI Service
 * Provides comprehensive healthcare assistance, disease information, doctor recommendations, and more
 */
class GeminiPatientChatbotAI {
  constructor() {
    // Initialize Google Generative AI
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    
    // Initialize NLP components
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    
    // AI model configurations for different chat purposes
    this.models = {
      general: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.3, // Balanced for helpful but safe responses
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      },
      medical: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.2, // Lower for more precise medical information
          topK: 30,
          topP: 0.8,
          maxOutputTokens: 6144,
          responseMimeType: "application/json"
        }
      },
      emergency: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.1, // Very low for emergency situations
          topK: 20,
          topP: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      }
    };

    // Context memory for conversation continuity
    this.conversationHistory = new Map();
    
    // Medical specialties and common conditions mapping
    this.medicalSpecialties = this.initializeMedicalSpecialties();
    this.commonConditions = this.initializeCommonConditions();
    this.emergencyKeywords = this.initializeEmergencyKeywords();
  }

  /**
   * Initialize medical specialties mapping
   */
  initializeMedicalSpecialties() {
    return {
      cardiology: {
        keywords: ['heart', 'cardiac', 'blood pressure', 'chest pain', 'palpitations', 'hypertension', 'cholesterol'],
        conditions: ['hypertension', 'heart disease', 'arrhythmia', 'heart attack', 'stroke']
      },
      dermatology: {
        keywords: ['skin', 'rash', 'acne', 'mole', 'eczema', 'psoriasis', 'dermatitis'],
        conditions: ['acne', 'eczema', 'psoriasis', 'skin cancer', 'dermatitis']
      },
      gastroenterology: {
        keywords: ['stomach', 'digestive', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'acid reflux'],
        conditions: ['gastritis', 'acid reflux', 'IBS', 'ulcer', 'liver disease']
      },
      neurology: {
        keywords: ['brain', 'neurological', 'headache', 'migraine', 'seizure', 'memory', 'dementia'],
        conditions: ['migraine', 'epilepsy', 'alzheimer', 'parkinson', 'stroke']
      },
      orthopedics: {
        keywords: ['bone', 'joint', 'muscle', 'fracture', 'arthritis', 'back pain', 'knee pain'],
        conditions: ['arthritis', 'fracture', 'osteoporosis', 'joint pain', 'back pain']
      },
      psychiatry: {
        keywords: ['mental health', 'depression', 'anxiety', 'stress', 'mood', 'sleep', 'panic'],
        conditions: ['depression', 'anxiety', 'bipolar', 'PTSD', 'insomnia']
      },
      pediatrics: {
        keywords: ['child', 'children', 'infant', 'baby', 'vaccination', 'growth', 'development'],
        conditions: ['childhood illnesses', 'developmental issues', 'vaccinations', 'growth problems']
      },
      gynecology: {
        keywords: ['women', 'pregnancy', 'menstrual', 'reproductive', 'contraception', 'fertility'],
        conditions: ['pregnancy care', 'menstrual disorders', 'fertility issues', 'contraception']
      },
      ophthalmology: {
        keywords: ['eye', 'vision', 'sight', 'blurred vision', 'eye pain', 'cataract', 'glaucoma'],
        conditions: ['cataract', 'glaucoma', 'vision problems', 'eye infections']
      },
      ent: {
        keywords: ['ear', 'nose', 'throat', 'hearing', 'sinus', 'tonsil', 'voice'],
        conditions: ['hearing loss', 'sinus infection', 'throat infection', 'voice problems']
      }
    };
  }

  /**
   * Initialize common medical conditions with descriptions
   */
  initializeCommonConditions() {
    return {
      diabetes: {
        type: 'chronic',
        urgency: 'moderate',
        specialties: ['endocrinology', 'internal medicine'],
        symptoms: ['frequent urination', 'excessive thirst', 'fatigue', 'blurred vision'],
        prevention: ['healthy diet', 'regular exercise', 'weight management']
      },
      hypertension: {
        type: 'chronic',
        urgency: 'moderate',
        specialties: ['cardiology', 'internal medicine'],
        symptoms: ['headache', 'dizziness', 'chest pain', 'shortness of breath'],
        prevention: ['low sodium diet', 'regular exercise', 'stress management']
      },
      asthma: {
        type: 'chronic',
        urgency: 'moderate',
        specialties: ['pulmonology', 'allergy'],
        symptoms: ['wheezing', 'shortness of breath', 'cough', 'chest tightness'],
        prevention: ['avoid triggers', 'regular medication', 'clean environment']
      },
      migraine: {
        type: 'episodic',
        urgency: 'moderate',
        specialties: ['neurology'],
        symptoms: ['severe headache', 'nausea', 'light sensitivity', 'visual disturbances'],
        prevention: ['stress management', 'regular sleep', 'trigger avoidance']
      }
    };
  }

  /**
   * Initialize emergency keywords that require immediate attention
   */
  initializeEmergencyKeywords() {
    return [
      'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'severe bleeding',
      'loss of consciousness', 'severe allergic reaction', 'poisoning', 'severe burns',
      'suicide', 'self harm', 'emergency', 'urgent', 'life threatening'
    ];
  }

  /**
   * Test Gemini API connection
   */
  async testGeminiConnection() {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent("Hello, respond with 'Connected' if you can receive this message.");
      return result.response.text().includes('Connected');
    } catch (error) {
      console.error('❌ Gemini connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Analyze user message intent and urgency
   */
  analyzeMessageIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for emergency keywords
    const isEmergency = this.emergencyKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );

    // Determine intent categories
    const intents = {
      medical_query: this.containsMedicalTerms(lowerMessage),
      doctor_recommendation: lowerMessage.includes('doctor') || lowerMessage.includes('specialist'),
      symptom_checker: lowerMessage.includes('symptom') || lowerMessage.includes('pain') || lowerMessage.includes('feel'),
      medication_inquiry: lowerMessage.includes('medicine') || lowerMessage.includes('medication') || lowerMessage.includes('drug'),
      appointment_help: lowerMessage.includes('appointment') || lowerMessage.includes('booking'),
      emergency: isEmergency,
      general_health: lowerMessage.includes('health') || lowerMessage.includes('wellness'),
      prevention: lowerMessage.includes('prevent') || lowerMessage.includes('avoid')
    };

    // Determine urgency level
    let urgency = 'low';
    if (isEmergency) urgency = 'emergency';
    else if (lowerMessage.includes('urgent') || lowerMessage.includes('severe')) urgency = 'high';
    else if (lowerMessage.includes('pain') || lowerMessage.includes('problem')) urgency = 'medium';

    return { intents, urgency, isEmergency };
  }

  /**
   * Check if message contains medical terms
   */
  containsMedicalTerms(message) {
    const medicalTerms = [
      'symptom', 'disease', 'condition', 'treatment', 'diagnosis', 'medicine',
      'pain', 'ache', 'fever', 'infection', 'allergy', 'chronic', 'acute'
    ];
    return medicalTerms.some(term => message.includes(term));
  }

  /**
   * Get conversation history for a user
   */
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(userId, userMessage, botResponse) {
    const history = this.getConversationHistory(userId);
    history.push({
      timestamp: new Date(),
      user: userMessage,
      bot: botResponse,
      type: 'chat'
    });

    // Keep only last 10 exchanges to manage memory
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationHistory.set(userId, history);
  }

  /**
   * Generate comprehensive healthcare response using Gemini AI
   */
  async generateHealthcareResponse(userMessage, userId, userProfile = {}) {
    try {
      console.log('🤖 Generating healthcare response for:', userMessage);
      
      // Analyze message intent
      const analysis = this.analyzeMessageIntent(userMessage);
      console.log('📊 Message analysis:', analysis);

      // Handle emergency situations first
      if (analysis.isEmergency) {
        return await this.handleEmergencyResponse(userMessage, analysis);
      }

      // Get conversation history for context
      const conversationHistory = this.getConversationHistory(userId);
      
      // Choose appropriate model based on intent
      const modelType = analysis.intents.medical_query || analysis.intents.symptom_checker ? 'medical' : 'general';
      const model = this.genAI.getGenerativeModel({ 
        model: this.models[modelType].name,
        generationConfig: this.models[modelType].config
      });

      // Build comprehensive prompt
      const prompt = this.buildHealthcarePrompt(userMessage, analysis, conversationHistory, userProfile);
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse JSON response
      let response;
      try {
        response = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON response, using fallback');
        response = this.createFallbackResponse(userMessage, responseText);
      }

      // Enhance response with additional features
      response = await this.enhanceResponse(response, analysis, userProfile);

      // Update conversation history
      this.updateConversationHistory(userId, userMessage, response);

      console.log('✅ Generated healthcare response successfully');
      return response;

    } catch (error) {
      console.error('❌ Error generating healthcare response:', error);
      return this.createErrorResponse(error.message);
    }
  }

  /**
   * Handle emergency situations with immediate response
   */
  async handleEmergencyResponse(userMessage, analysis) {
    return {
      type: 'emergency',
      urgency: 'emergency',
      message: "⚠️ **EMERGENCY DETECTED** ⚠️\n\nIf this is a medical emergency, please:\n\n🚨 **Call emergency services immediately:**\n- India: 108 (Emergency)\n- General: 112 (Emergency)\n\n🏥 **Go to the nearest emergency room**\n\n📞 **Contact your doctor immediately**\n\nI'm an AI assistant and cannot provide emergency medical care. Please seek immediate professional medical help.",
      recommendations: [
        {
          action: "Call Emergency Services",
          priority: "immediate",
          phone: "108",
          description: "For immediate medical emergency response"
        },
        {
          action: "Visit Emergency Room",
          priority: "immediate",
          description: "Go to the nearest hospital emergency department"
        }
      ],
      timestamp: new Date().toISOString(),
      disclaimer: "This is an automated emergency response. Seek immediate professional medical help."
    };
  }

  /**
   * Build comprehensive healthcare prompt for Gemini
   */
  buildHealthcarePrompt(userMessage, analysis, conversationHistory, userProfile) {
    const contextHistory = conversationHistory.slice(-6).map(h => 
      `User: ${h.user}\nAssistant: ${typeof h.bot === 'object' ? h.bot.message : h.bot}`
    ).join('\n\n');

    return `You are an advanced AI healthcare assistant designed to help patients with medical information, doctor recommendations, and health guidance. You must provide helpful, accurate, and safe medical information while being clear about limitations.

IMPORTANT GUIDELINES:
1. Always include medical disclaimers
2. Recommend consulting healthcare professionals for serious concerns
3. Provide evidence-based information
4. Be empathetic and supportive
5. Never provide specific medical diagnoses
6. Include relevant doctor specialties and recommendations
7. Suggest preventive measures when appropriate

USER CONTEXT:
- User Profile: ${JSON.stringify(userProfile)}
- Message Intent Analysis: ${JSON.stringify(analysis)}
- Conversation History: ${contextHistory || 'No previous conversation'}

USER MESSAGE: "${userMessage}"

Please respond in the following JSON format:
{
  "type": "healthcare_response",
  "urgency": "${analysis.urgency}",
  "message": "Your helpful response here (use markdown formatting)",
  "medical_information": {
    "condition": "Possible condition or topic discussed",
    "symptoms": ["List of relevant symptoms"],
    "causes": ["Possible causes"],
    "prevention": ["Prevention tips"],
    "when_to_see_doctor": "When to seek medical attention"
  },
  "doctor_recommendations": [
    {
      "specialty": "Medical specialty",
      "reason": "Why this specialist",
      "urgency": "when to see them",
      "what_to_expect": "What happens during consultation"
    }
  ],
  "self_care_tips": ["Practical self-care suggestions"],
  "red_flags": ["Warning signs to watch for"],
  "follow_up_questions": ["Relevant questions to ask user"],
  "educational_resources": ["Links or resources for learning more"],
  "disclaimer": "Medical disclaimer about AI limitations and need for professional consultation",
  "confidence_level": "high/medium/low",
  "recommended_actions": [
    {
      "action": "Specific action to take",
      "priority": "immediate/high/medium/low",
      "timeline": "When to do this"
    }
  ]
}

Ensure your response is helpful, medically sound, and appropriately cautious about AI limitations in healthcare.`;
  }

  /**
   * Enhance response with additional contextual information
   */
  async enhanceResponse(response, analysis, userProfile) {
    try {
      // Add location-based doctor recommendations if available
      if (userProfile.location && response.doctor_recommendations) {
        response.location_context = {
          user_location: userProfile.location,
          suggestion: "Based on your location, I can help you find nearby specialists."
        };
      }

      // Add urgency-based guidance
      if (analysis.urgency === 'high') {
        response.urgency_note = "⚠️ Based on your message, this seems like it needs prompt medical attention.";
      }

      // Add personalized health tips based on profile
      if (userProfile.age) {
        response.age_specific_tips = this.getAgeSpecificTips(userProfile.age);
      }

      // Add medication interaction warnings if user mentions medications
      if (analysis.intents.medication_inquiry && userProfile.medications) {
        response.medication_context = {
          note: "I see you're asking about medications. Always consult your doctor about medication interactions.",
          current_medications: userProfile.medications || []
        };
      }

      return response;
    } catch (error) {
      console.warn('⚠️ Error enhancing response:', error.message);
      return response;
    }
  }

  /**
   * Get age-specific health tips
   */
  getAgeSpecificTips(age) {
    if (age < 18) {
      return ["Focus on proper nutrition for growth", "Regular physical activity", "Adequate sleep for development"];
    } else if (age < 40) {
      return ["Establish healthy habits early", "Regular exercise routine", "Stress management techniques"];
    } else if (age < 65) {
      return ["Regular health screenings", "Maintain physical activity", "Monitor blood pressure and cholesterol"];
    } else {
      return ["Regular senior health checkups", "Fall prevention measures", "Cognitive health activities"];
    }
  }

  /**
   * Find appropriate doctors based on symptoms or condition
   */
  async findDoctorRecommendations(symptoms, location = null, urgency = 'medium') {
    try {
      const recommendations = [];
      
      // Analyze symptoms to determine specialty
      const symptomsLower = symptoms.toLowerCase();
      
      for (const [specialty, data] of Object.entries(this.medicalSpecialties)) {
        const matchCount = data.keywords.filter(keyword => 
          symptomsLower.includes(keyword)
        ).length;
        
        if (matchCount > 0) {
          recommendations.push({
            specialty: specialty.charAt(0).toUpperCase() + specialty.slice(1),
            match_score: matchCount,
            relevant_keywords: data.keywords.filter(keyword => symptomsLower.includes(keyword)),
            conditions_treated: data.conditions,
            urgency_level: urgency,
            description: this.getSpecialtyDescription(specialty)
          });
        }
      }

      // Sort by match score
      recommendations.sort((a, b) => b.match_score - a.match_score);
      
      return recommendations.slice(0, 3); // Return top 3 matches
    } catch (error) {
      console.error('❌ Error finding doctor recommendations:', error);
      return [];
    }
  }

  /**
   * Get specialty description
   */
  getSpecialtyDescription(specialty) {
    const descriptions = {
      cardiology: "Specialists in heart and cardiovascular system disorders",
      dermatology: "Specialists in skin, hair, and nail conditions",
      gastroenterology: "Specialists in digestive system disorders",
      neurology: "Specialists in nervous system and brain disorders",
      orthopedics: "Specialists in bone, joint, and muscle conditions",
      psychiatry: "Specialists in mental health and behavioral disorders",
      pediatrics: "Specialists in children's health and development",
      gynecology: "Specialists in women's reproductive health",
      ophthalmology: "Specialists in eye and vision disorders",
      ent: "Specialists in ear, nose, and throat conditions"
    };
    return descriptions[specialty] || "Medical specialist";
  }

  /**
   * Analyze symptoms and provide preliminary guidance
   */
  async analyzeSymptoms(symptoms, userProfile = {}) {
    try {
      console.log('🔍 Analyzing symptoms:', symptoms);
      
      const model = this.genAI.getGenerativeModel({ 
        model: this.models.medical.name,
        generationConfig: this.models.medical.config
      });

      const prompt = `As a healthcare AI assistant, analyze the following symptoms and provide guidance:

SYMPTOMS: "${symptoms}"
USER PROFILE: ${JSON.stringify(userProfile)}

Provide a comprehensive analysis in JSON format:
{
  "symptom_analysis": {
    "primary_symptoms": ["List main symptoms"],
    "associated_symptoms": ["Related symptoms to watch for"],
    "possible_causes": ["Potential causes (ranging from common to serious)"],
    "severity_assessment": "mild/moderate/severe/urgent",
    "body_systems_involved": ["Affected body systems"]
  },
  "recommendations": {
    "immediate_actions": ["What to do right now"],
    "when_to_see_doctor": "Specific guidance on medical consultation timing",
    "specialist_needed": "Type of doctor if specialty care needed",
    "self_care_measures": ["Safe self-care steps"],
    "monitoring_advice": ["What to watch for"]
  },
  "red_flags": ["Warning signs requiring immediate medical attention"],
  "timeline": {
    "if_symptoms_worsen": "Timeframe for seeking help if worse",
    "follow_up_timing": "When to reassess or follow up"
  },
  "disclaimer": "Appropriate medical disclaimer",
  "confidence": "Assessment confidence level"
}

Be thorough but clear about the limitations of AI symptom analysis.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let analysis;
      try {
        analysis = JSON.parse(responseText);
      } catch (parseError) {
        analysis = {
          error: "Could not parse symptom analysis",
          raw_response: responseText
        };
      }

      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing symptoms:', error);
      return {
        error: error.message,
        message: "Unable to analyze symptoms at this time. Please consult a healthcare professional."
      };
    }
  }

  /**
   * Provide health education on a specific topic
   */
  async provideHealthEducation(topic) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.models.general.name,
        generationConfig: this.models.general.config
      });

      const prompt = `Provide comprehensive health education about: "${topic}"

Structure your response as educational content in JSON format:
{
  "topic": "${topic}",
  "overview": "Clear, accessible explanation of the topic",
  "key_points": ["Important facts and information"],
  "prevention": ["Prevention strategies"],
  "management": ["Management approaches"],
  "lifestyle_factors": ["Relevant lifestyle considerations"],
  "myths_vs_facts": [
    {"myth": "Common misconception", "fact": "Accurate information"}
  ],
  "when_to_seek_help": "When to consult healthcare providers",
  "additional_resources": ["Reliable sources for more information"],
  "takeaway_message": "Key message for patients"
}

Ensure information is evidence-based, current, and accessible to general audiences.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let education;
      try {
        education = JSON.parse(responseText);
      } catch (parseError) {
        education = {
          topic: topic,
          overview: responseText,
          error: "Could not parse structured education content"
        };
      }

      return education;
    } catch (error) {
      console.error('❌ Error providing health education:', error);
      return {
        error: error.message,
        topic: topic,
        message: "Unable to provide educational content at this time."
      };
    }
  }

  /**
   * Create fallback response when JSON parsing fails
   */
  createFallbackResponse(userMessage, rawResponse) {
    return {
      type: 'fallback',
      message: rawResponse,
      disclaimer: "I'm here to help with health information, but please consult healthcare professionals for medical advice.",
      timestamp: new Date().toISOString(),
      note: "Response generated in fallback mode"
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(errorMessage) {
    return {
      type: 'error',
      message: "I apologize, but I'm experiencing technical difficulties right now. Please try again later or consult a healthcare professional for urgent matters.",
      error: errorMessage,
      recommendations: [
        {
          action: "Try again later",
          priority: "low"
        },
        {
          action: "Consult healthcare professional for urgent matters",
          priority: "high"
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health tips based on user profile and preferences
   */
  async getPersonalizedHealthTips(userProfile) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.models.general.name,
        generationConfig: this.models.general.config
      });

      const prompt = `Generate personalized health tips for a user with the following profile:

USER PROFILE: ${JSON.stringify(userProfile)}

Provide personalized health recommendations in JSON format:
{
  "daily_health_tips": ["Practical daily health advice"],
  "nutrition_recommendations": ["Dietary suggestions"],
  "exercise_suggestions": ["Appropriate physical activity recommendations"],
  "preventive_care": ["Preventive health measures"],
  "lifestyle_modifications": ["Beneficial lifestyle changes"],
  "health_monitoring": ["What health metrics to track"],
  "wellness_goals": ["Achievable wellness objectives"],
  "seasonal_advice": ["Current season-specific health tips"]
}

Make recommendations specific, actionable, and appropriate for the user's profile.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let tips;
      try {
        tips = JSON.parse(responseText);
      } catch (parseError) {
        tips = {
          error: "Could not parse health tips",
          raw_response: responseText
        };
      }

      return tips;
    } catch (error) {
      console.error('❌ Error generating health tips:', error);
      return {
        error: error.message,
        message: "Unable to generate personalized health tips at this time."
      };
    }
  }

  /**
   * Clear conversation history for a user
   */
  clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
    return true;
  }

  /**
   * Get chatbot statistics
   */
  getChatbotStats() {
    return {
      active_conversations: this.conversationHistory.size,
      total_specialties: Object.keys(this.medicalSpecialties).length,
      total_conditions: Object.keys(this.commonConditions).length,
      emergency_keywords: this.emergencyKeywords.length,
      model_configs: Object.keys(this.models)
    };
  }
}

export default GeminiPatientChatbotAI;
