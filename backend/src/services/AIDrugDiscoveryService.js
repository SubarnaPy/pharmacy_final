import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Drug Discovery Service
 * Alternative medication suggestions, personalized medicine, and clinical trial matching
 */
class AIDrugDiscoveryService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
  }

  initializeService() {
    this.models = {
      drugDiscovery: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      }
    };

    console.log('✅ AI Drug Discovery Service initialized');
  }

  /**
   * Find alternative medications with AI analysis
   */
  async findAlternativeMedications(currentMedication, patientProfile, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.drugDiscovery.name,
        generationConfig: this.models.drugDiscovery.config
      });

      const prompt = `
Find alternative medications for: ${currentMedication.name}

Patient Profile:
- Age: ${patientProfile.age}
- Conditions: ${patientProfile.conditions?.join(', ') || 'None'}
- Allergies: ${patientProfile.allergies?.join(', ') || 'None'}
- Budget concerns: ${options.budgetSensitive ? 'Yes' : 'No'}

Reason for alternatives: ${options.reason || 'Cost optimization'}

Return JSON with alternatives:
{
  "alternatives": [
    {
      "name": "medication_name",
      "type": "generic|brand|biosimilar",
      "mechanism": "how_it_works",
      "efficacy": "compared_to_original",
      "costSavings": "percentage_cheaper",
      "advantages": ["benefits"],
      "disadvantages": ["limitations"],
      "patientSuitability": "excellent|good|fair|poor",
      "switchingConsiderations": ["important_notes"]
    }
  ],
  "personalizedRecommendations": {
    "bestOption": "top_choice",
    "reasoning": "why_recommended",
    "geneticConsiderations": ["genetic_factors"],
    "monitoringNeeded": ["monitoring_requirements"]
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Alternative medication search failed:', error);
      throw error;
    }
  }

  /**
   * Provide personalized medicine recommendations
   */
  async getPersonalizedMedicineRecommendations(patientProfile, treatmentGoals) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.drugDiscovery.name,
        generationConfig: this.models.drugDiscovery.config
      });

      const prompt = `
Provide personalized medicine recommendations based on patient genetics and profile.

Patient Profile:
${JSON.stringify(patientProfile)}

Treatment Goals:
${JSON.stringify(treatmentGoals)}

Focus on:
1. Genetic-based medication selection
2. Personalized dosing recommendations
3. Metabolizer status considerations
4. Precision medicine opportunities

Return comprehensive personalized recommendations in JSON format.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Personalized medicine recommendations failed:', error);
      throw error;
    }
  }

  /**
   * Match patients to relevant clinical trials
   */
  async findClinicalTrials(patientProfile, condition) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.drugDiscovery.name,
        generationConfig: this.models.drugDiscovery.config
      });

      const prompt = `
Find relevant clinical trials for:
Condition: ${condition}
Patient: Age ${patientProfile.age}, ${patientProfile.gender}
Location: ${patientProfile.location || 'United States'}

Return matching clinical trials in JSON format with eligibility criteria and potential benefits.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Clinical trial matching failed:', error);
      throw error;
    }
  }
}

export default AIDrugDiscoveryService;