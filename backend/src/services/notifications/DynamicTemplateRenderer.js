import TemplateManagementService from './TemplateManagementService.js';
import TemplatePerformanceMonitor from './TemplatePerformanceMonitor.js';

/**
 * Dynamic Template Renderer
 * Handles dynamic template rendering with user personalization, multi-language support,
 * caching, and A/B testing capabilities
 */
class DynamicTemplateRenderer {
  constructor(options = {}) {
    this.templateManager = new TemplateManagementService(options.templateManager);
    this.performanceMonitor = new TemplatePerformanceMonitor(options.performanceMonitor);
    
    // Rendering cache
    this.renderCache = new Map();
    this.cacheConfig = {
      maxSize: options.cacheMaxSize || 1000,
      ttl: options.cacheTTL || 300000, // 5 minutes
      enabled: options.cacheEnabled !== false
    };
    
    // Multi-language support
    this.languageConfig = {
      defaultLanguage: options.defaultLanguage || 'en',
      supportedLanguages: options.supportedLanguages || ['en', 'es', 'fr', 'de'],
      fallbackChain: options.fallbackChain || ['en']
    };
    
    // A/B testing configuration
    this.abTestConfig = {
      enabled: options.abTestEnabled || false,
      testGroups: new Map(),
      defaultSplitRatio: options.defaultSplitRatio || 0.5
    };
    
    // Personalization engines
    this.personalizationEngines = new Map();
    this.initializePersonalizationEngines();
    
    // Template compilation cache
    this.compiledTemplates = new Map();
    
    console.log('✅ Dynamic Template Renderer initialized');
  }

  /**
   * Initialize personalization engines
   */
  initializePersonalizationEngines() {
    // User-based personalization
    this.personalizationEngines.set('user', {
      name: 'User Personalization',
      process: this.personalizeForUser.bind(this)
    });
    
    // Role-based personalization
    this.personalizationEngines.set('role', {
      name: 'Role-based Personalization',
      process: this.personalizeForRole.bind(this)
    });
    
    // Context-based personalization
    this.personalizationEngines.set('context', {
      name: 'Context-based Personalization',
      process: this.personalizeForContext.bind(this)
    });
    
    // Time-based personalization
    this.personalizationEngines.set('time', {
      name: 'Time-based Personalization',
      process: this.personalizeForTime.bind(this)
    });
  }

  /**
   * Render template with full personalization and optimization
   * @param {Object} renderRequest - Render request
   * @returns {Object} Rendered template
   */
  async renderTemplate(renderRequest) {
    const startTime = Date.now();
    
    try {
      const {
        templateType,
        channel,
        userRole,
        userId,
        language,
        data = {},
        context = {},
        options = {}
      } = renderRequest;

      // Validate render request
      this.validateRenderRequest(renderRequest);

      // Determine effective language
      const effectiveLanguage = await this.determineLanguage(language, userId, context);

      // Check cache first
      const cacheKey = this.generateCacheKey(templateType, channel, userRole, effectiveLanguage, data, context);
      if (this.cacheConfig.enabled && !options.bypassCache) {
        const cachedResult = this.getCachedRender(cacheKey);
        if (cachedResult) {
          this.performanceMonitor.recordRenderingPerformance(
            `${templateType}_cached`,
            channel,
            Date.now() - startTime,
            true,
            { cached: true }
          );
          return cachedResult;
        }
      }

      // Get template (with A/B testing if enabled)
      const templateResult = await this.getTemplateWithABTesting(
        templateType,
        channel,
        userRole,
        effectiveLanguage,
        userId,
        options
      );

      // Compile template if needed
      const compiledTemplate = await this.compileTemplate(templateResult.variant, templateResult.template);

      // Apply personalization
      const personalizedData = await this.applyPersonalization(
        data,
        context,
        userId,
        userRole,
        templateType
      );

      // Render template
      const renderedContent = await this.executeTemplateRendering(
        compiledTemplate,
        personalizedData,
        context,
        effectiveLanguage
      );

      // Post-process rendered content
      const finalContent = await this.postProcessContent(
        renderedContent,
        channel,
        userRole,
        context
      );

      // Prepare final result
      const result = {
        templateId: templateResult.template._id,
        templateVersion: templateResult.template.version,
        variant: templateResult.variant,
        content: finalContent,
        metadata: {
          language: effectiveLanguage,
          renderTime: Date.now() - startTime,
          personalized: true,
          cached: false,
          abTestGroup: templateResult.abTestGroup || null
        }
      };

      // Cache result if enabled
      if (this.cacheConfig.enabled && !options.skipCache) {
        this.cacheRender(cacheKey, result);
      }

      // Record performance metrics
      this.performanceMonitor.recordRenderingPerformance(
        templateResult.template._id.toString(),
        channel,
        Date.now() - startTime,
        true,
        {
          language: effectiveLanguage,
          personalized: true,
          abTest: !!templateResult.abTestGroup
        }
      );

      return result;

    } catch (error) {
      this.performanceMonitor.recordRenderingPerformance(
        `${renderRequest.templateType}_error`,
        renderRequest.channel,
        Date.now() - startTime,
        false,
        { error: error.message }
      );
      
      console.error('Template rendering failed:', error);
      throw error;
    }
  }

  /**
   * Determine effective language for rendering
   * @param {string} requestedLanguage - Requested language
   * @param {string} userId - User ID
   * @param {Object} context - Render context
   * @returns {string} Effective language
   */
  async determineLanguage(requestedLanguage, userId, context) {
    // Priority order:
    // 1. Explicitly requested language
    // 2. User's preferred language
    // 3. Context-based language (e.g., from location)
    // 4. Default language

    if (requestedLanguage && this.languageConfig.supportedLanguages.includes(requestedLanguage)) {
      return requestedLanguage;
    }

    // Try to get user's preferred language
    if (userId && context.userPreferences?.preferredLanguage) {
      const userLang = context.userPreferences.preferredLanguage;
      if (this.languageConfig.supportedLanguages.includes(userLang)) {
        return userLang;
      }
    }

    // Try context-based language detection
    if (context.location?.country) {
      const contextLang = this.getLanguageFromCountry(context.location.country);
      if (contextLang && this.languageConfig.supportedLanguages.includes(contextLang)) {
        return contextLang;
      }
    }

    // Fall back to default language
    return this.languageConfig.defaultLanguage;
  }

  /**
   * Get template with A/B testing support
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {string} language - Language
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Object} Template result
   */
  async getTemplateWithABTesting(templateType, channel, userRole, language, userId, options) {
    // Check if A/B testing is enabled for this template
    const abTestKey = `${templateType}_${channel}_${userRole}`;
    const abTest = this.abTestConfig.testGroups.get(abTestKey);

    if (this.abTestConfig.enabled && abTest && !options.skipABTest) {
      // Determine which variant to use based on user ID
      const userGroup = this.determineABTestGroup(userId, abTest);
      const templateResult = await this.templateManager.getTemplate(
        userGroup.templateType || templateType,
        channel,
        userRole,
        language
      );

      return {
        ...templateResult,
        abTestGroup: userGroup.name
      };
    }

    // Regular template retrieval
    const templateResult = await this.templateManager.getTemplate(
      templateType,
      channel,
      userRole,
      language
    );

    return templateResult;
  }

  /**
   * Compile template for efficient rendering
   * @param {Object} variant - Template variant
   * @param {Object} template - Full template object
   * @returns {Object} Compiled template
   */
  async compileTemplate(variant, template) {
    const compileKey = `${template._id}_${variant.channel}_${variant.userRole}_${variant.language}`;
    
    // Check if already compiled
    if (this.compiledTemplates.has(compileKey)) {
      return this.compiledTemplates.get(compileKey);
    }

    const compiled = {
      id: compileKey,
      templateId: template._id,
      variant: variant,
      compiledAt: new Date(),
      
      // Pre-compile template parts
      compiledSubject: this.compileTemplateString(variant.subject || ''),
      compiledTitle: this.compileTemplateString(variant.title || ''),
      compiledBody: this.compileTemplateString(variant.body || ''),
      compiledHtmlBody: this.compileTemplateString(variant.htmlBody || ''),
      
      // Pre-process actions
      compiledActions: variant.actions?.map(action => ({
        ...action,
        compiledText: this.compileTemplateString(action.text || ''),
        compiledUrl: this.compileTemplateString(action.url || '')
      })) || [],
      
      // Styling information
      styling: variant.styling || {},
      
      // Metadata
      metadata: {
        hasConditionals: this.hasConditionalLogic(variant),
        hasLoops: this.hasLoopLogic(variant),
        complexity: this.calculateTemplateComplexity(variant)
      }
    };

    // Cache compiled template
    this.compiledTemplates.set(compileKey, compiled);
    
    // Limit cache size
    if (this.compiledTemplates.size > this.cacheConfig.maxSize) {
      const firstKey = this.compiledTemplates.keys().next().value;
      this.compiledTemplates.delete(firstKey);
    }

    return compiled;
  }

  /**
   * Apply personalization to template data
   * @param {Object} data - Base data
   * @param {Object} context - Context
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {string} templateType - Template type
   * @returns {Object} Personalized data
   */
  async applyPersonalization(data, context, userId, userRole, templateType) {
    let personalizedData = { ...data };

    // Apply each personalization engine
    for (const [engineName, engine] of this.personalizationEngines.entries()) {
      try {
        personalizedData = await engine.process(
          personalizedData,
          context,
          userId,
          userRole,
          templateType
        );
      } catch (error) {
        console.warn(`Personalization engine ${engineName} failed:`, error);
        // Continue with other engines
      }
    }

    return personalizedData;
  }

  /**
   * Execute template rendering with compiled template
   * @param {Object} compiledTemplate - Compiled template
   * @param {Object} data - Personalized data
   * @param {Object} context - Context
   * @param {string} language - Language
   * @returns {Object} Rendered content
   */
  async executeTemplateRendering(compiledTemplate, data, context, language) {
    const renderContext = {
      ...data,
      ...context,
      $language: language,
      $timestamp: new Date().toISOString(),
      $templateId: compiledTemplate.templateId
    };

    return {
      subject: this.renderCompiledString(compiledTemplate.compiledSubject, renderContext),
      title: this.renderCompiledString(compiledTemplate.compiledTitle, renderContext),
      body: this.renderCompiledString(compiledTemplate.compiledBody, renderContext),
      htmlBody: this.renderCompiledString(compiledTemplate.compiledHtmlBody, renderContext),
      actions: compiledTemplate.compiledActions.map(action => ({
        text: this.renderCompiledString(action.compiledText, renderContext),
        url: this.renderCompiledString(action.compiledUrl, renderContext),
        style: action.style
      })),
      styling: compiledTemplate.styling
    };
  }

  /**
   * Post-process rendered content
   * @param {Object} content - Rendered content
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {Object} context - Context
   * @returns {Object} Post-processed content
   */
  async postProcessContent(content, channel, userRole, context) {
    let processedContent = { ...content };

    // Channel-specific post-processing
    switch (channel) {
      case 'email':
        processedContent = await this.postProcessEmail(processedContent, userRole, context);
        break;
      case 'sms':
        processedContent = await this.postProcessSMS(processedContent, userRole, context);
        break;
      case 'websocket':
        processedContent = await this.postProcessWebSocket(processedContent, userRole, context);
        break;
    }

    // Apply security sanitization
    processedContent = this.sanitizeContent(processedContent);

    // Apply accessibility improvements
    processedContent = this.enhanceAccessibility(processedContent, channel);

    return processedContent;
  }

  /**
   * User-based personalization engine
   * @param {Object} data - Data
   * @param {Object} context - Context
   * @param {string} userId - User ID
   * @returns {Object} Personalized data
   */
  async personalizeForUser(data, context, userId) {
    if (!userId || !context.user) {
      return data;
    }

    const user = context.user;
    
    return {
      ...data,
      firstName: user.firstName || data.firstName || 'User',
      lastName: user.lastName || data.lastName || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      email: user.email || data.email || '',
      phone: user.phone || data.phone || '',
      preferredName: user.preferredName || user.firstName || 'User',
      timezone: user.timezone || data.timezone || 'UTC',
      
      // User preferences
      communicationPreferences: user.communicationPreferences || {},
      
      // Personalized greetings based on time
      greeting: this.generatePersonalizedGreeting(user.firstName, context.timestamp)
    };
  }

  /**
   * Role-based personalization engine
   * @param {Object} data - Data
   * @param {Object} context - Context
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Object} Personalized data
   */
  async personalizeForRole(data, context, userId, userRole) {
    const roleSpecificData = { ...data };

    switch (userRole) {
      case 'patient':
        roleSpecificData.roleTitle = 'Patient';
        roleSpecificData.dashboardUrl = `${process.env.FRONTEND_URL}/patient/dashboard`;
        roleSpecificData.supportContact = process.env.PATIENT_SUPPORT_EMAIL || 'support@healthcare.com';
        break;
        
      case 'doctor':
        roleSpecificData.roleTitle = 'Doctor';
        roleSpecificData.dashboardUrl = `${process.env.FRONTEND_URL}/doctor/dashboard`;
        roleSpecificData.supportContact = process.env.DOCTOR_SUPPORT_EMAIL || 'doctor-support@healthcare.com';
        if (context.doctor) {
          roleSpecificData.specialization = context.doctor.specialization;
          roleSpecificData.licenseNumber = context.doctor.licenseNumber;
        }
        break;
        
      case 'pharmacy':
        roleSpecificData.roleTitle = 'Pharmacy Staff';
        roleSpecificData.dashboardUrl = `${process.env.FRONTEND_URL}/pharmacy/dashboard`;
        roleSpecificData.supportContact = process.env.PHARMACY_SUPPORT_EMAIL || 'pharmacy-support@healthcare.com';
        if (context.pharmacy) {
          roleSpecificData.pharmacyName = context.pharmacy.name;
          roleSpecificData.pharmacyAddress = context.pharmacy.address;
        }
        break;
        
      case 'admin':
        roleSpecificData.roleTitle = 'Administrator';
        roleSpecificData.dashboardUrl = `${process.env.FRONTEND_URL}/admin/dashboard`;
        roleSpecificData.supportContact = process.env.ADMIN_SUPPORT_EMAIL || 'admin-support@healthcare.com';
        break;
    }

    return roleSpecificData;
  }

  /**
   * Context-based personalization engine
   * @param {Object} data - Data
   * @param {Object} context - Context
   * @returns {Object} Personalized data
   */
  async personalizeForContext(data, context) {
    const contextualData = { ...data };

    // Location-based personalization
    if (context.location) {
      contextualData.location = context.location;
      contextualData.timezone = context.location.timezone || contextualData.timezone;
      contextualData.currency = this.getCurrencyFromCountry(context.location.country);
      contextualData.dateFormat = this.getDateFormatFromCountry(context.location.country);
    }

    // Device-based personalization
    if (context.device) {
      contextualData.device = context.device;
      contextualData.isMobile = context.device.type === 'mobile';
      contextualData.isTablet = context.device.type === 'tablet';
      contextualData.isDesktop = context.device.type === 'desktop';
    }

    // Session-based personalization
    if (context.session) {
      contextualData.sessionId = context.session.id;
      contextualData.isFirstVisit = context.session.isFirstVisit;
      contextualData.lastLoginDate = context.session.lastLoginDate;
    }

    return contextualData;
  }

  /**
   * Time-based personalization engine
   * @param {Object} data - Data
   * @param {Object} context - Context
   * @returns {Object} Personalized data
   */
  async personalizeForTime(data, context) {
    const now = new Date();
    const timeData = { ...data };

    // Time-based greetings and content
    const hour = now.getHours();
    if (hour < 12) {
      timeData.timeOfDay = 'morning';
      timeData.timeGreeting = 'Good morning';
    } else if (hour < 17) {
      timeData.timeOfDay = 'afternoon';
      timeData.timeGreeting = 'Good afternoon';
    } else {
      timeData.timeOfDay = 'evening';
      timeData.timeGreeting = 'Good evening';
    }

    // Day-based personalization
    const dayOfWeek = now.getDay();
    timeData.isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    timeData.dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // Seasonal personalization
    const month = now.getMonth();
    if (month >= 2 && month <= 4) timeData.season = 'spring';
    else if (month >= 5 && month <= 7) timeData.season = 'summer';
    else if (month >= 8 && month <= 10) timeData.season = 'fall';
    else timeData.season = 'winter';

    // Urgency based on time sensitivity
    if (context.urgency) {
      timeData.urgencyLevel = context.urgency;
      timeData.isUrgent = context.urgency === 'high' || context.urgency === 'critical';
    }

    return timeData;
  }

  /**
   * Post-process email content
   * @param {Object} content - Content
   * @param {string} userRole - User role
   * @param {Object} context - Context
   * @returns {Object} Processed content
   */
  async postProcessEmail(content, userRole, context) {
    const processed = { ...content };

    // Ensure HTML structure
    if (processed.htmlBody && !processed.htmlBody.includes('<html')) {
      processed.htmlBody = this.wrapInEmailHTML(processed.htmlBody, processed.styling);
    }

    // Add tracking pixels if enabled
    if (context.trackingEnabled) {
      processed.htmlBody = this.addEmailTracking(processed.htmlBody, context.trackingId);
    }

    // Optimize for email clients
    processed.htmlBody = this.optimizeForEmailClients(processed.htmlBody);

    // Generate plain text version if not provided
    if (!processed.textBody && processed.htmlBody) {
      processed.textBody = this.htmlToText(processed.htmlBody);
    }

    return processed;
  }

  /**
   * Post-process SMS content
   * @param {Object} content - Content
   * @param {string} userRole - User role
   * @param {Object} context - Context
   * @returns {Object} Processed content
   */
  async postProcessSMS(content, userRole, context) {
    const processed = { ...content };

    // Ensure SMS length limits
    if (processed.body && processed.body.length > 160) {
      processed.body = this.truncateForSMS(processed.body);
      processed.truncated = true;
    }

    // Add unsubscribe info if required
    if (context.includeUnsubscribe) {
      processed.body += ' Reply STOP to opt out';
    }

    // Remove HTML if present
    processed.body = this.stripHTML(processed.body);

    return processed;
  }

  /**
   * Post-process WebSocket content
   * @param {Object} content - Content
   * @param {string} userRole - User role
   * @param {Object} context - Context
   * @returns {Object} Processed content
   */
  async postProcessWebSocket(content, userRole, context) {
    const processed = { ...content };

    // Structure for real-time notifications
    processed.notification = {
      id: context.notificationId || this.generateNotificationId(),
      title: processed.title,
      body: processed.body,
      actions: processed.actions,
      timestamp: new Date().toISOString(),
      priority: context.priority || 'normal',
      category: context.category || 'general'
    };

    return processed;
  }

  /**
   * Compile template string for efficient rendering
   * @param {string} template - Template string
   * @returns {Object} Compiled template
   */
  compileTemplateString(template) {
    if (!template) return { type: 'static', value: '' };

    // Check if template has dynamic content
    const hasPlaceholders = /\{\{[^}]+\}\}/.test(template);
    const hasConditionals = /\{\{#if\s+[^}]+\}\}/.test(template);
    const hasLoops = /\{\{#each\s+[^}]+\}\}/.test(template);

    if (!hasPlaceholders && !hasConditionals && !hasLoops) {
      return { type: 'static', value: template };
    }

    // Parse template into tokens
    const tokens = this.parseTemplateTokens(template);
    
    return {
      type: 'dynamic',
      template: template,
      tokens: tokens,
      hasConditionals: hasConditionals,
      hasLoops: hasLoops
    };
  }

  /**
   * Render compiled template string
   * @param {Object} compiled - Compiled template
   * @param {Object} context - Render context
   * @returns {string} Rendered string
   */
  renderCompiledString(compiled, context) {
    if (!compiled) return '';
    
    if (compiled.type === 'static') {
      return compiled.value;
    }

    if (compiled.type === 'dynamic') {
      return this.renderDynamicTemplate(compiled, context);
    }

    return '';
  }

  /**
   * Render dynamic template with context
   * @param {Object} compiled - Compiled template
   * @param {Object} context - Context
   * @returns {string} Rendered string
   */
  renderDynamicTemplate(compiled, context) {
    let result = compiled.template;

    // Handle conditionals first
    if (compiled.hasConditionals) {
      result = this.processConditionals(result, context);
    }

    // Handle loops
    if (compiled.hasLoops) {
      result = this.processLoops(result, context);
    }

    // Handle simple placeholders
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(context, key.trim());
      return value !== null && value !== undefined ? String(value) : '';
    });

    return result;
  }

  /**
   * Process conditional logic in templates
   * @param {string} template - Template string
   * @param {Object} context - Context
   * @returns {string} Processed template
   */
  processConditionals(template, context) {
    // Simple if/else processing
    return template.replace(/\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? content : '';
    });
  }

  /**
   * Process loop logic in templates
   * @param {string} template - Template string
   * @param {Object} context - Context
   * @returns {string} Processed template
   */
  processLoops(template, context) {
    // Simple each loop processing
    return template.replace(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayPath, content) => {
      const array = this.getNestedValue(context, arrayPath.trim());
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        const itemContext = { ...context, this: item, index: index };
        return this.renderDynamicTemplate({ template: content, hasConditionals: true, hasLoops: false }, itemContext);
      }).join('');
    });
  }

  /**
   * Evaluate condition for template conditionals
   * @param {string} condition - Condition string
   * @param {Object} context - Context
   * @returns {boolean} Condition result
   */
  evaluateCondition(condition, context) {
    // Simple condition evaluation (can be extended)
    try {
      // Handle simple existence checks
      if (!condition.includes(' ')) {
        const value = this.getNestedValue(context, condition);
        return !!value;
      }

      // Handle simple comparisons
      const operators = ['===', '!==', '==', '!=', '>', '<', '>=', '<='];
      for (const op of operators) {
        if (condition.includes(op)) {
          const [left, right] = condition.split(op).map(s => s.trim());
          const leftValue = this.getNestedValue(context, left);
          const rightValue = right.startsWith('"') || right.startsWith("'") 
            ? right.slice(1, -1) 
            : this.getNestedValue(context, right);
          
          switch (op) {
            case '===': return leftValue === rightValue;
            case '!==': return leftValue !== rightValue;
            case '==': return leftValue == rightValue;
            case '!=': return leftValue != rightValue;
            case '>': return leftValue > rightValue;
            case '<': return leftValue < rightValue;
            case '>=': return leftValue >= rightValue;
            case '<=': return leftValue <= rightValue;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn('Condition evaluation failed:', condition, error);
      return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object
   * @param {string} path - Path
   * @returns {any} Value
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Parse template into tokens for compilation
   * @param {string} template - Template string
   * @returns {Array} Tokens
   */
  parseTemplateTokens(template) {
    const tokens = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Add text before placeholder
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          value: template.slice(lastIndex, match.index)
        });
      }

      // Add placeholder token
      tokens.push({
        type: 'placeholder',
        key: match[1].trim(),
        original: match[0]
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < template.length) {
      tokens.push({
        type: 'text',
        value: template.slice(lastIndex)
      });
    }

    return tokens;
  }

  /**
   * Generate cache key for rendered template
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {string} language - Language
   * @param {Object} data - Data
   * @param {Object} context - Context
   * @returns {string} Cache key
   */
  generateCacheKey(templateType, channel, userRole, language, data, context) {
    // Create a hash of the data and context for caching
    const dataHash = this.hashObject({ ...data, ...context });
    return `${templateType}_${channel}_${userRole}_${language}_${dataHash}`;
  }

  /**
   * Get cached render result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result
   */
  getCachedRender(cacheKey) {
    const cached = this.renderCache.get(cacheKey);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
      this.renderCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache render result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Result to cache
   */
  cacheRender(cacheKey, result) {
    // Implement LRU cache behavior
    if (this.renderCache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.renderCache.keys().next().value;
      this.renderCache.delete(firstKey);
    }

    this.renderCache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });
  }

  /**
   * Configure A/B test for template
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @param {string} userRole - User role
   * @param {Object} testConfig - Test configuration
   */
  configureABTest(templateType, channel, userRole, testConfig) {
    const testKey = `${templateType}_${channel}_${userRole}`;
    this.abTestConfig.testGroups.set(testKey, {
      ...testConfig,
      createdAt: new Date()
    });
  }

  /**
   * Determine A/B test group for user
   * @param {string} userId - User ID
   * @param {Object} abTest - A/B test configuration
   * @returns {Object} Test group
   */
  determineABTestGroup(userId, abTest) {
    // Simple hash-based assignment for consistent grouping
    const hash = this.hashString(userId);
    const ratio = abTest.splitRatio || this.abTestConfig.defaultSplitRatio;
    
    return hash < ratio ? abTest.groupA : abTest.groupB;
  }

  /**
   * Utility methods
   */

  validateRenderRequest(request) {
    const required = ['templateType', 'channel', 'userRole'];
    for (const field of required) {
      if (!request[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  generatePersonalizedGreeting(firstName, timestamp) {
    const hour = new Date(timestamp || Date.now()).getHours();
    const name = firstName || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  }

  getLanguageFromCountry(country) {
    const countryLanguageMap = {
      'US': 'en', 'GB': 'en', 'CA': 'en',
      'ES': 'es', 'MX': 'es', 'AR': 'es',
      'FR': 'fr', 'BE': 'fr', 'CH': 'fr',
      'DE': 'de', 'AT': 'de'
    };
    return countryLanguageMap[country?.toUpperCase()];
  }

  getCurrencyFromCountry(country) {
    const countryCurrencyMap = {
      'US': 'USD', 'GB': 'GBP', 'CA': 'CAD',
      'ES': 'EUR', 'FR': 'EUR', 'DE': 'EUR',
      'MX': 'MXN', 'AR': 'ARS'
    };
    return countryCurrencyMap[country?.toUpperCase()] || 'USD';
  }

  getDateFormatFromCountry(country) {
    const countryDateFormatMap = {
      'US': 'MM/DD/YYYY',
      'GB': 'DD/MM/YYYY',
      'CA': 'DD/MM/YYYY',
      'DE': 'DD.MM.YYYY'
    };
    return countryDateFormatMap[country?.toUpperCase()] || 'YYYY-MM-DD';
  }

  hashObject(obj) {
    return this.hashString(JSON.stringify(obj));
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  hasConditionalLogic(variant) {
    const content = `${variant.subject || ''} ${variant.title || ''} ${variant.body || ''} ${variant.htmlBody || ''}`;
    return /\{\{#if\s+[^}]+\}\}/.test(content);
  }

  hasLoopLogic(variant) {
    const content = `${variant.subject || ''} ${variant.title || ''} ${variant.body || ''} ${variant.htmlBody || ''}`;
    return /\{\{#each\s+[^}]+\}\}/.test(content);
  }

  calculateTemplateComplexity(variant) {
    const content = `${variant.subject || ''} ${variant.title || ''} ${variant.body || ''} ${variant.htmlBody || ''}`;
    let complexity = 0;
    
    // Count placeholders
    complexity += (content.match(/\{\{[^}]+\}\}/g) || []).length;
    
    // Count conditionals (higher weight)
    complexity += (content.match(/\{\{#if\s+[^}]+\}\}/g) || []).length * 2;
    
    // Count loops (highest weight)
    complexity += (content.match(/\{\{#each\s+[^}]+\}\}/g) || []).length * 3;
    
    return complexity;
  }

  wrapInEmailHTML(content, styling = {}) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
    .header { color: ${styling.primaryColor || '#007bff'}; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
  }

  addEmailTracking(htmlBody, trackingId) {
    if (!trackingId) return htmlBody;
    
    const trackingPixel = `<img src="${process.env.BACKEND_URL}/api/notifications/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
    return htmlBody.replace('</body>', `${trackingPixel}</body>`);
  }

  optimizeForEmailClients(htmlBody) {
    // Basic email client optimizations
    return htmlBody
      .replace(/<style[^>]*>([^<]*)<\/style>/gi, '') // Remove external styles
      .replace(/class="[^"]*"/gi, '') // Remove CSS classes
      .replace(/<link[^>]*>/gi, ''); // Remove external links
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  truncateForSMS(text, maxLength = 160) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  stripHTML(text) {
    return text.replace(/<[^>]+>/g, '');
  }

  sanitizeContent(content) {
    // Basic XSS prevention
    const sanitized = { ...content };
    
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    };

    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeString(sanitized[key]);
      }
    });

    return sanitized;
  }

  enhanceAccessibility(content, channel) {
    if (channel !== 'email' || !content.htmlBody) return content;

    const enhanced = { ...content };
    
    // Add alt text to images without it
    enhanced.htmlBody = enhanced.htmlBody.replace(
      /<img([^>]*?)(?!\s+alt=)([^>]*?)>/gi,
      '<img$1 alt="Image"$2>'
    );

    return enhanced;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.renderCache.clear();
    this.compiledTemplates.clear();
    console.log('Dynamic template renderer caches cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      renderCache: {
        size: this.renderCache.size,
        maxSize: this.cacheConfig.maxSize,
        hitRate: this.calculateCacheHitRate()
      },
      compiledTemplates: {
        size: this.compiledTemplates.size,
        maxSize: this.cacheConfig.maxSize
      }
    };
  }

  calculateCacheHitRate() {
    // This would need to be tracked during actual usage
    return 0; // Placeholder
  }
}

export { DynamicTemplateRenderer };
export default DynamicTemplateRenderer;