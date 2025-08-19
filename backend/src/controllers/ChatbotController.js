import GeminiPatientChatbotAI from '../services/ai/GeminiPatientChatbotAI.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import PatientChatMessage from '../models/PatientChatMessage.js';

/**
 * Advanced Patient Chatbot Controller
 * Handles all chatbot interactions, conversation management, and health assistance
 */
class ChatbotController {
  constructor() {
    this.chatbotAI = new GeminiPatientChatbotAI();
  }

  /**
   * Handle chat message from patient
   */
  async sendMessage(req, res) {
    try {
      const { message, context = {} } = req.body;
      const userId = req.user.id;

      console.log(`💬 Processing chat message from user ${userId}: ${message}`);

      // Validate input
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message cannot be empty'
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Please keep it under 2000 characters.'
        });
      }

      // Get user profile for personalized responses
      const user = await User.findById(userId).select('profile role');
      const userProfile = {
        age: user.profile?.age,
        location: user.profile?.address?.city,
        gender: user.profile?.gender,
        medications: context.medications || [],
        medicalHistory: context.medicalHistory || [],
        allergies: context.allergies || []
      };

      // Generate AI response
      const aiResponse = await this.chatbotAI.generateHealthcareResponse(
        message, 
        userId, 
        userProfile
      );

      // Save conversation to database
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: message,
        botResponse: aiResponse,
        messageType: aiResponse.type || 'general',
        urgency: aiResponse.urgency || 'low',
        timestamp: new Date(),
        context: userProfile,
        session: req.session?.id || 'default'
      });

      await chatMessage.save();

      // Add additional features based on response type
      if (aiResponse.doctor_recommendations) {
        aiResponse.available_doctors = await this.findAvailableDoctors(
          aiResponse.doctor_recommendations, 
          userProfile.location
        );
      }

      res.json({
        success: true,
        response: aiResponse,
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in chat message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.'
      });
    }
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
      const { condition, specialty, location, urgency = 'medium' } = req.body;
      const userId = req.user.id;

      console.log(`👨‍⚕️ Finding doctor recommendations for user ${userId}`);

      let searchQuery = condition || specialty;
      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: 'Either condition or specialty is required'
        });
      }

      // Get user location if not provided
      let searchLocation = location;
      if (!searchLocation) {
        const user = await User.findById(userId).select('profile.address');
        searchLocation = user.profile?.address?.city;
      }

      // Find doctor recommendations using AI
      const recommendations = await this.chatbotAI.findDoctorRecommendations(
        searchQuery, 
        searchLocation, 
        urgency
      );

      // Find actual available doctors
      const availableDoctors = await this.findAvailableDoctorsDetailed(
        recommendations,
        searchLocation
      );

      // Save recommendation request
      const chatMessage = new PatientChatMessage({
        userId,
        userMessage: `Doctor recommendation request: ${searchQuery}`,
        botResponse: {
          recommendations,
          available_doctors: availableDoctors
        },
        messageType: 'doctor_recommendation',
        urgency,
        timestamp: new Date()
      });

      await chatMessage.save();

      res.json({
        success: true,
        recommendations,
        available_doctors: availableDoctors,
        search_location: searchLocation,
        messageId: chatMessage._id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting doctor recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get doctor recommendations'
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
