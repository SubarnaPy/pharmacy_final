import NotificationTemplate from '../../models/NotificationTemplate.js';

/**
 * Multi-Language Template Service
 * Handles multi-language template support, translation management, and localization
 */
class MultiLanguageTemplateService {
  constructor(options = {}) {
    this.supportedLanguages = options.supportedLanguages || [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar'
    ];
    
    this.defaultLanguage = options.defaultLanguage || 'en';
    this.fallbackChain = options.fallbackChain || ['en'];
    
    // Language-specific configurations
    this.languageConfigs = new Map();
    this.initializeLanguageConfigs();
    
    // Translation cache
    this.translationCache = new Map();
    this.cacheConfig = {
      maxSize: options.cacheMaxSize || 1000,
      ttl: options.cacheTTL || 3600000 // 1 hour
    };
    
    // Localization rules
    this.localizationRules = new Map();
    this.initializeLocalizationRules();
    
    console.log('✅ Multi-Language Template Service initialized');
  }

  /**
   * Initialize language-specific configurations
   */
  initializeLanguageConfigs() {
    // English
    this.languageConfigs.set('en', {
      name: 'English',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      currency: 'USD',
      numberFormat: '1,234.56',
      pluralRules: 'english'
    });

    // Spanish
    this.languageConfigs.set('es', {
      name: 'Español',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'EUR',
      numberFormat: '1.234,56',
      pluralRules: 'spanish'
    });

    // French
    this.languageConfigs.set('fr', {
      name: 'Français',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'EUR',
      numberFormat: '1 234,56',
      pluralRules: 'french'
    });

    // German
    this.languageConfigs.set('de', {
      name: 'Deutsch',
      direction: 'ltr',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      currency: 'EUR',
      numberFormat: '1.234,56',
      pluralRules: 'german'
    });

    // Arabic
    this.languageConfigs.set('ar', {
      name: 'العربية',
      direction: 'rtl',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      currency: 'USD',
      numberFormat: '1,234.56',
      pluralRules: 'arabic'
    });

    // Chinese (Simplified)
    this.languageConfigs.set('zh', {
      name: '中文',
      direction: 'ltr',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
      currency: 'CNY',
      numberFormat: '1,234.56',
      pluralRules: 'chinese'
    });
  }

  /**
   * Initialize localization rules
   */
  initializeLocalizationRules() {
    // Date formatting rules
    this.localizationRules.set('date', {
      'en': (date) => date.toLocaleDateString('en-US'),
      'es': (date) => date.toLocaleDateString('es-ES'),
      'fr': (date) => date.toLocaleDateString('fr-FR'),
      'de': (date) => date.toLocaleDateString('de-DE'),
      'ar': (date) => date.toLocaleDateString('ar-SA'),
      'zh': (date) => date.toLocaleDateString('zh-CN')
    });

    // Time formatting rules
    this.localizationRules.set('time', {
      'en': (date) => date.toLocaleTimeString('en-US'),
      'es': (date) => date.toLocaleTimeString('es-ES'),
      'fr': (date) => date.toLocaleTimeString('fr-FR'),
      'de': (date) => date.toLocaleTimeString('de-DE'),
      'ar': (date) => date.toLocaleTimeString('ar-SA'),
      'zh': (date) => date.toLocaleTimeString('zh-CN')
    });

    // Number formatting rules
    this.localizationRules.set('number', {
      'en': (num) => num.toLocaleString('en-US'),
      'es': (num) => num.toLocaleString('es-ES'),
      'fr': (num) => num.toLocaleString('fr-FR'),
      'de': (num) => num.toLocaleString('de-DE'),
      'ar': (num) => num.toLocaleString('ar-SA'),
      'zh': (num) => num.toLocaleString('zh-CN')
    });

    // Currency formatting rules
    this.localizationRules.set('currency', {
      'en': (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
      'es': (amount, currency = 'EUR') => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount),
      'fr': (amount, currency = 'EUR') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount),
      'de': (amount, currency = 'EUR') => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount),
      'ar': (amount, currency = 'USD') => new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(amount),
      'zh': (amount, currency = 'CNY') => new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount)
    });
  }

  /**
   * Get template in specified language with fallback support
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {string} language - Requested language
   * @returns {Object} Template with language variant
   */
  async getLocalizedTemplate(templateType, channel, userRole, language) {
    try {
      // Normalize language code
      const normalizedLanguage = this.normalizeLanguageCode(language);
      
      // Try to get template in requested language
      let template = await this.findTemplateByLanguage(templateType, channel, userRole, normalizedLanguage);
      
      if (template) {
        return {
          template,
          language: normalizedLanguage,
          fallback: false
        };
      }

      // Try fallback languages
      for (const fallbackLang of this.fallbackChain) {
        template = await this.findTemplateByLanguage(templateType, channel, userRole, fallbackLang);
        if (template) {
          return {
            template,
            language: fallbackLang,
            fallback: true,
            requestedLanguage: normalizedLanguage
          };
        }
      }

      throw new Error(`No template found for ${templateType} in any supported language`);

    } catch (error) {
      console.error('Error getting localized template:', error);
      throw error;
    }
  }

  /**
   * Find template by language
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {string} language - Language
   * @returns {Object} Template
   */
  async findTemplateByLanguage(templateType, channel, userRole, language) {
    const template = await NotificationTemplate.findOne({
      type: templateType,
      isActive: true,
      'variants.channel': channel,
      'variants.userRole': userRole,
      'variants.language': language
    }).sort({ version: -1 });

    if (!template) return null;

    // Find the specific variant
    const variant = template.variants.find(v => 
      v.channel === channel && 
      v.userRole === userRole && 
      v.language === language
    );

    if (!variant) return null;

    return { template, variant };
  }

  /**
   * Create localized template variant
   * @param {string} templateId - Base template ID
   * @param {string} language - Target language
   * @param {Object} translatedContent - Translated content
   * @param {Object} options - Options
   * @returns {Object} Updated template
   */
  async createLocalizedVariant(templateId, language, translatedContent, options = {}) {
    try {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const normalizedLanguage = this.normalizeLanguageCode(language);
      
      // Check if variant already exists
      const existingVariant = template.variants.find(v => 
        v.channel === translatedContent.channel &&
        v.userRole === translatedContent.userRole &&
        v.language === normalizedLanguage
      );

      if (existingVariant && !options.overwrite) {
        throw new Error(`Variant already exists for language ${normalizedLanguage}`);
      }

      // Validate translated content
      const validation = await this.validateTranslatedContent(translatedContent, normalizedLanguage);
      if (!validation.isValid) {
        throw new Error(`Translation validation failed: ${validation.errors.join(', ')}`);
      }

      // Apply language-specific formatting
      const localizedContent = await this.applyLanguageFormatting(translatedContent, normalizedLanguage);

      // Create new variant
      const newVariant = {
        ...localizedContent,
        language: normalizedLanguage,
        createdAt: new Date(),
        translatedBy: options.translatedBy,
        translationMethod: options.translationMethod || 'manual'
      };

      if (existingVariant) {
        // Update existing variant
        Object.assign(existingVariant, newVariant);
      } else {
        // Add new variant
        template.variants.push(newVariant);
      }

      template.updatedAt = new Date();
      await template.save();

      // Clear cache for this template
      this.clearTemplateCache(templateId);

      return template;

    } catch (error) {
      console.error('Error creating localized variant:', error);
      throw error;
    }
  }

  /**
   * Bulk create localized variants
   * @param {string} templateId - Template ID
   * @param {Array} translations - Array of translations
   * @param {Object} options - Options
   * @returns {Object} Results
   */
  async bulkCreateLocalizedVariants(templateId, translations, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: translations.length
    };

    for (const translation of translations) {
      try {
        await this.createLocalizedVariant(
          templateId, 
          translation.language, 
          translation.content, 
          options
        );
        results.successful.push(translation.language);
      } catch (error) {
        results.failed.push({
          language: translation.language,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Auto-translate template to multiple languages
   * @param {string} templateId - Template ID
   * @param {Array} targetLanguages - Target languages
   * @param {Object} options - Translation options
   * @returns {Object} Translation results
   */
  async autoTranslateTemplate(templateId, targetLanguages, options = {}) {
    try {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get base variant (usually English)
      const baseVariant = template.variants.find(v => v.language === this.defaultLanguage);
      if (!baseVariant) {
        throw new Error('Base language variant not found');
      }

      const translations = [];
      
      for (const targetLang of targetLanguages) {
        try {
          const translatedContent = await this.translateContent(baseVariant, targetLang, options);
          translations.push({
            language: targetLang,
            content: translatedContent
          });
        } catch (error) {
          console.error(`Translation failed for ${targetLang}:`, error);
        }
      }

      // Bulk create variants
      const results = await this.bulkCreateLocalizedVariants(templateId, translations, {
        ...options,
        translationMethod: 'auto'
      });

      return results;

    } catch (error) {
      console.error('Error auto-translating template:', error);
      throw error;
    }
  }

  /**
   * Translate content to target language
   * @param {Object} content - Content to translate
   * @param {string} targetLanguage - Target language
   * @param {Object} options - Translation options
   * @returns {Object} Translated content
   */
  async translateContent(content, targetLanguage, options = {}) {
    // This is a placeholder for actual translation service integration
    // In a real implementation, you would integrate with services like:
    // - Google Translate API
    // - AWS Translate
    // - Azure Translator
    // - DeepL API
    
    const cacheKey = `${JSON.stringify(content)}_${targetLanguage}`;
    
    // Check cache first
    if (this.translationCache.has(cacheKey)) {
      const cached = this.translationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        return cached.translation;
      }
    }

    // Simulate translation (replace with actual service)
    const translatedContent = await this.simulateTranslation(content, targetLanguage);
    
    // Cache result
    this.translationCache.set(cacheKey, {
      translation: translatedContent,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.translationCache.size > this.cacheConfig.maxSize) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }

    return translatedContent;
  }

  /**
   * Simulate translation (placeholder for real translation service)
   * @param {Object} content - Content to translate
   * @param {string} targetLanguage - Target language
   * @returns {Object} Simulated translated content
   */
  async simulateTranslation(content, targetLanguage) {
    // This is a mock implementation
    // In production, replace with actual translation service calls
    
    const translations = {
      'es': {
        'Hello': 'Hola',
        'Welcome': 'Bienvenido',
        'Your prescription is ready': 'Su receta está lista',
        'Order confirmed': 'Pedido confirmado',
        'Thank you': 'Gracias'
      },
      'fr': {
        'Hello': 'Bonjour',
        'Welcome': 'Bienvenue',
        'Your prescription is ready': 'Votre ordonnance est prête',
        'Order confirmed': 'Commande confirmée',
        'Thank you': 'Merci'
      },
      'de': {
        'Hello': 'Hallo',
        'Welcome': 'Willkommen',
        'Your prescription is ready': 'Ihr Rezept ist bereit',
        'Order confirmed': 'Bestellung bestätigt',
        'Thank you': 'Danke'
      }
    };

    const langTranslations = translations[targetLanguage] || {};
    
    const translateText = (text) => {
      if (!text) return text;
      
      let translated = text;
      for (const [original, translation] of Object.entries(langTranslations)) {
        translated = translated.replace(new RegExp(original, 'gi'), translation);
      }
      return translated;
    };

    return {
      ...content,
      subject: translateText(content.subject),
      title: translateText(content.title),
      body: translateText(content.body),
      htmlBody: translateText(content.htmlBody),
      actions: content.actions?.map(action => ({
        ...action,
        text: translateText(action.text)
      })) || []
    };
  }

  /**
   * Apply language-specific formatting
   * @param {Object} content - Content
   * @param {string} language - Language
   * @returns {Object} Formatted content
   */
  async applyLanguageFormatting(content, language) {
    const langConfig = this.languageConfigs.get(language);
    if (!langConfig) return content;

    const formatted = { ...content };

    // Apply RTL styling for RTL languages
    if (langConfig.direction === 'rtl') {
      formatted.styling = {
        ...formatted.styling,
        direction: 'rtl',
        textAlign: 'right'
      };
    }

    // Apply language-specific date/time formatting in content
    formatted.body = this.applyLocalizationToText(formatted.body, language);
    formatted.htmlBody = this.applyLocalizationToText(formatted.htmlBody, language);

    return formatted;
  }

  /**
   * Apply localization to text content
   * @param {string} text - Text content
   * @param {string} language - Language
   * @returns {string} Localized text
   */
  applyLocalizationToText(text, language) {
    if (!text) return text;

    let localizedText = text;

    // Apply date formatting
    const dateRule = this.localizationRules.get('date')[language];
    if (dateRule) {
      localizedText = localizedText.replace(/\{\{date:([^}]+)\}\}/g, (match, dateStr) => {
        try {
          const date = new Date(dateStr);
          return dateRule(date);
        } catch {
          return match;
        }
      });
    }

    // Apply time formatting
    const timeRule = this.localizationRules.get('time')[language];
    if (timeRule) {
      localizedText = localizedText.replace(/\{\{time:([^}]+)\}\}/g, (match, timeStr) => {
        try {
          const date = new Date(timeStr);
          return timeRule(date);
        } catch {
          return match;
        }
      });
    }

    // Apply number formatting
    const numberRule = this.localizationRules.get('number')[language];
    if (numberRule) {
      localizedText = localizedText.replace(/\{\{number:([^}]+)\}\}/g, (match, numStr) => {
        try {
          const num = parseFloat(numStr);
          return numberRule(num);
        } catch {
          return match;
        }
      });
    }

    // Apply currency formatting
    const currencyRule = this.localizationRules.get('currency')[language];
    if (currencyRule) {
      localizedText = localizedText.replace(/\{\{currency:([^:}]+):?([^}]*)\}\}/g, (match, amountStr, currency) => {
        try {
          const amount = parseFloat(amountStr);
          return currencyRule(amount, currency || undefined);
        } catch {
          return match;
        }
      });
    }

    return localizedText;
  }

  /**
   * Validate translated content
   * @param {Object} content - Translated content
   * @param {string} language - Language
   * @returns {Object} Validation result
   */
  async validateTranslatedContent(content, language) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!content.channel) errors.push('Channel is required');
    if (!content.userRole) errors.push('User role is required');
    if (!content.title) errors.push('Title is required');
    if (!content.body) errors.push('Body is required');

    // Language-specific validation
    const langConfig = this.languageConfigs.get(language);
    if (!langConfig) {
      warnings.push(`Language ${language} is not in supported languages list`);
    }

    // Check for placeholder consistency
    const placeholderPattern = /\{\{[^}]+\}\}/g;
    const titlePlaceholders = (content.title?.match(placeholderPattern) || []).sort();
    const bodyPlaceholders = (content.body?.match(placeholderPattern) || []).sort();
    
    if (JSON.stringify(titlePlaceholders) !== JSON.stringify(bodyPlaceholders)) {
      warnings.push('Placeholder inconsistency between title and body');
    }

    // Check for RTL language content direction
    if (langConfig?.direction === 'rtl') {
      const hasRTLChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(content.body);
      if (!hasRTLChars) {
        warnings.push('RTL language detected but content appears to be LTR');
      }
    }

    // Check content length for different channels
    if (content.channel === 'sms' && content.body && content.body.length > 160) {
      errors.push('SMS content exceeds 160 character limit');
    }

    if (content.channel === 'email' && content.subject && content.subject.length > 78) {
      warnings.push('Email subject exceeds recommended 78 character limit');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get language statistics for templates
   * @param {string} templateType - Template type (optional)
   * @returns {Object} Language statistics
   */
  async getLanguageStatistics(templateType = null) {
    try {
      const query = { isActive: true };
      if (templateType) {
        query.type = templateType;
      }

      const templates = await NotificationTemplate.find(query);
      
      const stats = {
        totalTemplates: templates.length,
        languageDistribution: {},
        channelLanguageMatrix: {},
        roleLanguageMatrix: {},
        completionRate: {}
      };

      // Analyze language distribution
      for (const template of templates) {
        for (const variant of template.variants) {
          const lang = variant.language;
          
          // Overall distribution
          stats.languageDistribution[lang] = (stats.languageDistribution[lang] || 0) + 1;
          
          // Channel-language matrix
          if (!stats.channelLanguageMatrix[variant.channel]) {
            stats.channelLanguageMatrix[variant.channel] = {};
          }
          stats.channelLanguageMatrix[variant.channel][lang] = 
            (stats.channelLanguageMatrix[variant.channel][lang] || 0) + 1;
          
          // Role-language matrix
          if (!stats.roleLanguageMatrix[variant.userRole]) {
            stats.roleLanguageMatrix[variant.userRole] = {};
          }
          stats.roleLanguageMatrix[variant.userRole][lang] = 
            (stats.roleLanguageMatrix[variant.userRole][lang] || 0) + 1;
        }
      }

      // Calculate completion rates
      for (const lang of this.supportedLanguages) {
        const templatesWithLang = templates.filter(t => 
          t.variants.some(v => v.language === lang)
        ).length;
        stats.completionRate[lang] = templates.length > 0 ? 
          (templatesWithLang / templates.length) * 100 : 0;
      }

      return stats;

    } catch (error) {
      console.error('Error getting language statistics:', error);
      throw error;
    }
  }

  /**
   * Get missing translations report
   * @param {string} baseLanguage - Base language
   * @returns {Array} Missing translations
   */
  async getMissingTranslations(baseLanguage = 'en') {
    try {
      const templates = await NotificationTemplate.find({ isActive: true });
      const missing = [];

      for (const template of templates) {
        const baseVariants = template.variants.filter(v => v.language === baseLanguage);
        
        for (const baseVariant of baseVariants) {
          for (const targetLang of this.supportedLanguages) {
            if (targetLang === baseLanguage) continue;
            
            const hasTranslation = template.variants.some(v => 
              v.channel === baseVariant.channel &&
              v.userRole === baseVariant.userRole &&
              v.language === targetLang
            );

            if (!hasTranslation) {
              missing.push({
                templateId: template._id,
                templateType: template.type,
                templateName: template.name,
                channel: baseVariant.channel,
                userRole: baseVariant.userRole,
                missingLanguage: targetLang,
                baseLanguage: baseLanguage
              });
            }
          }
        }
      }

      return missing;

    } catch (error) {
      console.error('Error getting missing translations:', error);
      throw error;
    }
  }

  /**
   * Normalize language code
   * @param {string} language - Language code
   * @returns {string} Normalized language code
   */
  normalizeLanguageCode(language) {
    if (!language) return this.defaultLanguage;
    
    // Convert to lowercase and extract primary language
    const normalized = language.toLowerCase().split('-')[0];
    
    // Check if supported
    if (this.supportedLanguages.includes(normalized)) {
      return normalized;
    }
    
    // Return default if not supported
    return this.defaultLanguage;
  }

  /**
   * Clear template cache
   * @param {string} templateId - Template ID
   */
  clearTemplateCache(templateId) {
    const keysToDelete = [];
    for (const key of this.translationCache.keys()) {
      if (key.includes(templateId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.translationCache.delete(key));
  }

  /**
   * Get supported languages
   * @returns {Array} Supported languages with metadata
   */
  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.languageConfigs.get(lang)?.name || lang,
      direction: this.languageConfigs.get(lang)?.direction || 'ltr',
      isDefault: lang === this.defaultLanguage
    }));
  }

  /**
   * Add new supported language
   * @param {string} languageCode - Language code
   * @param {Object} config - Language configuration
   */
  addSupportedLanguage(languageCode, config) {
    if (!this.supportedLanguages.includes(languageCode)) {
      this.supportedLanguages.push(languageCode);
    }
    this.languageConfigs.set(languageCode, config);
  }

  /**
   * Remove supported language
   * @param {string} languageCode - Language code
   */
  removeSupportedLanguage(languageCode) {
    if (languageCode === this.defaultLanguage) {
      throw new Error('Cannot remove default language');
    }
    
    const index = this.supportedLanguages.indexOf(languageCode);
    if (index > -1) {
      this.supportedLanguages.splice(index, 1);
    }
    this.languageConfigs.delete(languageCode);
  }
}

export { MultiLanguageTemplateService };
export default MultiLanguageTemplateService;