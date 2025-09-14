import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Simple Symptom Analyzer with basic Gemini AI integration
 */
class AdvancedSymptomAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * Perform simple symptom analysis
   */
  async performComprehensiveAnalysis(request) {
    const startTime = Date.now();
    
    try {
      console.log('🔬 Starting simple symptom analysis...');
      
      const { symptoms, additionalInfo = {} } = request;
      
      if (!symptoms || symptoms.trim().length === 0) {
        throw new Error('Symptoms are required');
      }

      // Create simple prompt for Gemini
      const prompt = this.buildSimplePrompt(symptoms, additionalInfo);
      
      // Get AI response
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.text();
      
      // Parse the response
      const analysis = this.parseResponse(analysisText);
      
      const processingTime = Date.now() - startTime;
      
      const result_data = {
        symptomAnalysis: {
          primary_symptoms: analysis.primary_symptoms || [symptoms],
          secondary_symptoms: analysis.secondary_symptoms || [],
          severity_assessment: analysis.severity || 'moderate',
          confidence_score: analysis.confidence || 0.7
        },
        possibleCauses: analysis.possible_causes || ['Further evaluation needed'],
        bodySystemsInvolved: analysis.body_systems || ['General'],
        severityAssessment: analysis.severity || 'moderate',
        confidenceScore: analysis.confidence || 0.7,
        recommendations: {
          immediateActions: analysis.immediate_actions || ['Rest and monitor symptoms'],
          selfCareMeasures: analysis.self_care || ['Stay hydrated', 'Get adequate rest'],
          whenToSeeDoctor: analysis.when_to_see_doctor || 'If symptoms persist or worsen',
          followUpTiming: analysis.follow_up || 'Within 24-48 hours if symptoms persist'
        },
        redFlags: analysis.red_flags || [],
        timeline: analysis.timeline || {},
        processingTime: processingTime,
        modelVersion: 'gemini-1.5-pro-simple',
        confidenceMetrics: {
          overall_confidence: analysis.confidence || 0.7
        }
      };

      console.log(`✅ Simple analysis completed in ${processingTime}ms`);
      return result_data;

    } catch (error) {
      console.error('❌ Error in symptom analysis:', error);
      
      // Return basic fallback response
      return this.getFallbackResponse(request.symptoms);
    }
  }

  /**
   * Build simple prompt for Gemini
   */
  buildSimplePrompt(symptoms, additionalInfo) {
    return `As a healthcare AI assistant, analyze these symptoms and provide a simple assessment:

Symptoms: "${symptoms}"
Duration: ${additionalInfo.duration || 'Not specified'}
Severity: ${additionalInfo.severity || 'Not specified'}

Please provide a response in this JSON format:
{
  "primary_symptoms": ["list of main symptoms"],
  "secondary_symptoms": ["list of related symptoms"],
  "possible_causes": ["list of 3-4 possible causes"],
  "body_systems": ["affected body systems"],
  "severity": "low/moderate/high",
  "immediate_actions": ["immediate steps to take"],
  "self_care": ["self-care recommendations"],
  "when_to_see_doctor": "when to seek medical attention",
  "follow_up": "follow-up timing",
  "red_flags": ["warning signs to watch for"],
  "confidence": 0.8
}

Keep the response helpful but emphasize that this is not a substitute for professional medical advice.`;
  }

  /**
   * Parse Gemini response
   */
  parseResponse(responseText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Could not parse JSON response, using text parsing');
    }
    
    // Fallback text parsing
    return this.parseTextResponse(responseText);
  }

  /**
   * Parse text response when JSON parsing fails
   */
  parseTextResponse(text) {
    return {
      primary_symptoms: [text.substring(0, 100) + '...'],
      secondary_symptoms: [],
      possible_causes: ['Analysis available in response text'],
      body_systems: ['General'],
      severity: 'moderate',
      immediate_actions: ['Rest and monitor symptoms'],
      self_care: ['Stay hydrated', 'Get adequate rest'],
      when_to_see_doctor: 'If symptoms persist or worsen',
      follow_up: 'Within 24-48 hours',
      red_flags: ['Severe worsening of symptoms'],
      confidence: 0.6,
      raw_response: text
    };
  }

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(symptoms) {
    return {
      symptomAnalysis: {
        primary_symptoms: [symptoms || 'General symptoms'],
        secondary_symptoms: [],
        severity_assessment: 'moderate',
        confidence_score: 0.3
      },
      possibleCauses: [
        'Common viral infection',
        'Stress-related symptoms', 
        'Minor medical condition requiring evaluation'
      ],
      bodySystemsInvolved: ['General'],
      severityAssessment: 'moderate',
      confidenceScore: 0.3,
      recommendations: {
        immediateActions: ['Rest and monitor symptoms'],
        selfCareMeasures: ['Stay hydrated', 'Get adequate rest'],
        whenToSeeDoctor: 'If symptoms persist or worsen',
        followUpTiming: 'Within 24-48 hours'
      },
      redFlags: [
        'High fever (>102°F)',
        'Severe pain',
        'Difficulty breathing'
      ],
      timeline: {},
      processingTime: 0,
      modelVersion: 'fallback',
      confidenceMetrics: {
        overall_confidence: 0.3
      },
      notice: 'This is a basic analysis. Please consult a healthcare professional for proper diagnosis.'
    };
  }
}

export default AdvancedSymptomAnalyzer;
