import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiPatientChatbotAI {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 1024,
      },
    });
  }

  async generateAdvancedHealthcareResponse(userMessage, userId, userProfile = {}) {
    return await this.generateHealthcareResponse(userMessage, userId, userProfile);
  }

  async generateHealthcareResponse(userMessage, userId, userProfile = {}) {
    try {
      console.log('Generating simple healthcare response for:', userMessage);

      const prompt = `You are a helpful healthcare AI assistant. Respond to: ${userMessage}`;
      
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      return {
        type: 'healthcare_info',
        message: responseText,
        recommendations: ['Consult a healthcare professional for personalized advice'],
        disclaimer: 'This is not professional medical advice.',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating healthcare response:', error);
      return {
        type: 'error',
        message: 'I apologize, but I am experiencing technical difficulties right now.',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getPersonalizedHealthTips(userProfile) {
    return {
      type: 'health_tips',
      message: 'Here are some general health tips for maintaining good health.',
      tips: [
        'Stay hydrated by drinking plenty of water',
        'Get regular exercise and adequate sleep'
      ],
      disclaimer: 'These are general health tips. Consult your healthcare provider for personalized advice.',
      timestamp: new Date().toISOString()
    };
  }
}

export default GeminiPatientChatbotAI;
