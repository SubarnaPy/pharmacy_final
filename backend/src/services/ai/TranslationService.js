import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Translation Service using Google Gemini AI
 * Provides language detection and translation capabilities
 */
class TranslationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Supported languages with their codes
    this.supportedLanguages = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'te': 'Telugu',
      'mr': 'Marathi',
      'ta': 'Tamil',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'or': 'Odia',
      'as': 'Assamese',
      'ur': 'Urdu',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic'
    };
  }

  /**
   * Detect the language of given text
   * @param {string} text - Text to analyze
   * @returns {Promise<string>} Language code (e.g., 'en', 'hi', 'bn')
   */
  async detectLanguage(text) {
    try {
      if (!text || text.trim().length === 0) {
        return 'en'; // Default to English
      }

      // For very short texts, use a simple pattern-based detection
      if (text.trim().length < 10) {
        return this.quickLanguageDetection(text);
      }

      const prompt = `
Detect the language of the following text and respond with ONLY the language code from this list:
${Object.entries(this.supportedLanguages).map(([code, name]) => `${code} - ${name}`).join('\n')}

Text: "${text}"

Respond with ONLY the language code (e.g., "en" for English, "hi" for Hindi, "bn" for Bengali).
If uncertain, respond with "en".
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const detectedCode = response.text().trim().toLowerCase();

      // Validate the detected language code
      if (this.supportedLanguages[detectedCode]) {
        console.log(`🌐 Language detected: ${detectedCode} (${this.supportedLanguages[detectedCode]})`);
        return detectedCode;
      }

      console.log(`⚠️ Invalid language code detected: ${detectedCode}, defaulting to English`);
      return 'en';

    } catch (error) {
      console.error('❌ Language detection failed:', error);
      return 'en'; // Default to English on error
    }
  }

  /**
   * Quick language detection for short texts using pattern matching
   * @param {string} text - Short text to analyze
   * @returns {string} Language code
   */
  quickLanguageDetection(text) {
    const patterns = {
      'hi': /[\u0900-\u097F]/, // Devanagari script
      'bn': /[\u0980-\u09FF]/, // Bengali script
      'te': /[\u0C00-\u0C7F]/, // Telugu script
      'ta': /[\u0B80-\u0BFF]/, // Tamil script
      'gu': /[\u0A80-\u0AFF]/, // Gujarati script
      'kn': /[\u0C80-\u0CFF]/, // Kannada script
      'ml': /[\u0D00-\u0D7F]/, // Malayalam script
      'pa': /[\u0A00-\u0A7F]/, // Gurmukhi script
      'or': /[\u0B00-\u0B7F]/, // Odia script
      'ar': /[\u0600-\u06FF]/, // Arabic script
      'zh': /[\u4E00-\u9FFF]/, // Chinese characters
      'ja': /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana and Katakana
      'ko': /[\uAC00-\uD7AF]/, // Hangul
      'ru': /[\u0400-\u04FF]/, // Cyrillic script
    };

    for (const [langCode, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return langCode;
      }
    }

    return 'en'; // Default to English
  }

  /**
   * Translate text to target language
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<string>} Translated text
   */
  async translateText(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      // Check if target language is supported
      if (!this.supportedLanguages[targetLanguage]) {
        console.warn(`Unsupported target language: ${targetLanguage}`);
        return text;
      }

      // If source and target are the same, return original text
      if (sourceLanguage === targetLanguage) {
        return text;
      }

      const targetLanguageName = this.supportedLanguages[targetLanguage];
      const sourceLanguageName = sourceLanguage !== 'auto' ? 
        this.supportedLanguages[sourceLanguage] : 'detected language';

      const prompt = `
Translate the following text from ${sourceLanguageName} to ${targetLanguageName}.
Maintain the original tone, style, and meaning. For medical/healthcare content, ensure accuracy of medical terms.

Text to translate: "${text}"

Provide ONLY the translated text without any additional explanation or formatting.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const translatedText = response.text().trim();

      console.log(`🌐 Translation: ${sourceLanguage || 'auto'} → ${targetLanguage}`);
      console.log(`Original: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      console.log(`Translated: "${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}"`);

      return translatedText;

    } catch (error) {
      console.error('❌ Translation failed:', error);
      return text; // Return original text on error
    }
  }

  /**
   * Translate healthcare-specific content with medical term preservation
   * @param {string} text - Medical text to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<string>} Translated medical text
   */
  async translateMedicalText(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      const targetLanguageName = this.supportedLanguages[targetLanguage];
      const sourceLanguageName = sourceLanguage !== 'auto' ? 
        this.supportedLanguages[sourceLanguage] : 'detected language';

      const prompt = `
Translate the following medical/healthcare text from ${sourceLanguageName} to ${targetLanguageName}.

IMPORTANT GUIDELINES:
1. Preserve all medical terminology accuracy
2. Keep drug names, medical procedure names, and technical terms precise
3. Maintain professional medical tone
4. Ensure patient safety by accurate translation of dosages, instructions, and warnings
5. If uncertain about medical terms, provide the original term in parentheses

Medical text to translate: "${text}"

Provide ONLY the translated text without additional explanation.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const translatedText = response.text().trim();

      console.log(`🏥 Medical Translation: ${sourceLanguage || 'auto'} → ${targetLanguage}`);
      return translatedText;

    } catch (error) {
      console.error('❌ Medical translation failed:', error);
      return text; // Return original text on error
    }
  }

  /**
   * Get supported languages list
   * @returns {Object} Object with language codes and names
   */
  getSupportedLanguages() {
    return { ...this.supportedLanguages };
  }

  /**
   * Check if a language is supported
   * @param {string} languageCode - Language code to check
   * @returns {boolean} True if supported
   */
  isLanguageSupported(languageCode) {
    return !!this.supportedLanguages[languageCode];
  }

  /**
   * Batch translate multiple texts
   * @param {Array<string>} texts - Array of texts to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<Array<string>>} Array of translated texts
   */
  async batchTranslate(texts, targetLanguage, sourceLanguage = 'auto') {
    try {
      const translations = await Promise.all(
        texts.map(text => this.translateText(text, targetLanguage, sourceLanguage))
      );
      return translations;
    } catch (error) {
      console.error('❌ Batch translation failed:', error);
      return texts; // Return original texts on error
    }
  }
}

// Create singleton instance
const translationService = new TranslationService();

// Export individual functions for backwards compatibility
export const detectLanguage = (text) => translationService.detectLanguage(text);
export const translateText = (text, targetLanguage, sourceLanguage) => 
  translationService.translateText(text, targetLanguage, sourceLanguage);
export const translateMedicalText = (text, targetLanguage, sourceLanguage) => 
  translationService.translateMedicalText(text, targetLanguage, sourceLanguage);

// Export the service class and instance
export { TranslationService };
export default translationService;