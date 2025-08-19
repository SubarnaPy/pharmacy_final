import NotificationTemplate from '../../models/NotificationTemplate.js';
import { EmailTemplateEngine } from './EmailTemplateEngine.js';
import SMSTemplateEngine from './SMSTemplateEngine.js';

/**
 * Template Management Service
 * Handles CRUD operations, versioning, validation, and performance monitoring for notification templates
 */
class TemplateManagementService {
  constructor(options = {}) {
    this.emailEngine = new EmailTemplateEngine(options.email);
    this.smsEngine = new SMSTemplateEngine(options.sms);
    this.templateCache = new Map();
    this.performanceMetrics = new Map();
    this.versionHistory = new Map();
    
    // Performance monitoring settings
    this.performanceThresholds = {
      renderTime: 1000, // 1 second
      cacheHitRate: 0.8, // 80%
      errorRate: 0.05 // 5%
    };
    
    console.log('✅ Template Management Service initialized');
  }

  /**
   * Create a new notification template
   * @param {Object} templateData - Template data
   * @param {string} createdBy - User ID who created the template
   * @returns {Object} Created template
   */
  async createTemplate(templateData, createdBy) {
    const startTime = Date.now();
    
    try {
      // Validate template data
      const validation = await this.validateTemplateData(templateData);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if template with same type already exists
      const existingTemplate = await NotificationTemplate.findOne({
        type: templateData.type,
        isActive: true
      });

      let version = '1.0.0';
      if (existingTemplate) {
        // Generate new version
        version = this.generateNextVersion(existingTemplate.version);
        
        // Deactivate old template if specified
        if (templateData.replaceExisting) {
          existingTemplate.isActive = false;
          await existingTemplate.save();
        }
      }

      // Create new template
      const template = new NotificationTemplate({
        ...templateData,
        version,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedTemplate = await template.save();
      
      // Clear cache for this template type
      this.clearCacheForType(templateData.type);
      
      // Record performance metrics
      this.recordPerformanceMetric('create', Date.now() - startTime, true);
      
      console.log(`✅ Template created: ${savedTemplate.type} v${savedTemplate.version}`);
      return savedTemplate;
      
    } catch (error) {
      this.recordPerformanceMetric('create', Date.now() - startTime, false);
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get template by type, channel, and role
   * @param {string} type - Notification type
   * @param {string} channel - Delivery channel
   * @param {string} userRole - User role
   * @param {string} language - Language preference
   * @returns {Object} Template
   */
  async getTemplate(type, channel, userRole, language = 'en') {
    const startTime = Date.now();
    const cacheKey = `${type}_${channel}_${userRole}_${language}`;
    
    try {
      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        this.recordPerformanceMetric('get', Date.now() - startTime, true, true);
        return this.templateCache.get(cacheKey);
      }

      // Query database
      const template = await NotificationTemplate.findOne({
        type,
        isActive: true,
        'variants.channel': channel,
        'variants.userRole': userRole,
        'variants.language': language
      }).sort({ version: -1 }); // Get latest version

      // Fallback to default language if not found
      let fallbackTemplate = null;
      if (!template && language !== 'en') {
        fallbackTemplate = await NotificationTemplate.findOne({
          type,
          isActive: true,
          'variants.channel': channel,
          'variants.userRole': userRole,
          'variants.language': 'en'
        }).sort({ version: -1 });
      }

      const foundTemplate = template || fallbackTemplate;
      
      if (!foundTemplate) {
        throw new Error(`Template not found: ${type} for ${channel}/${userRole}/${language}`);
      }

      // Get the specific variant
      const variant = foundTemplate.variants.find(v => 
        v.channel === channel && 
        v.userRole === userRole && 
        (v.language === language || (v.language === 'en' && !template))
      );

      if (!variant) {
        throw new Error(`Template variant not found: ${type} for ${channel}/${userRole}/${language}`);
      }

      // Cache the result
      this.templateCache.set(cacheKey, { template: foundTemplate, variant });
      
      // Update usage statistics
      await this.updateUsageStats(foundTemplate._id);
      
      this.recordPerformanceMetric('get', Date.now() - startTime, true, false);
      return { template: foundTemplate, variant };
      
    } catch (error) {
      this.recordPerformanceMetric('get', Date.now() - startTime, false, false);
      console.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated the template
   * @returns {Object} Updated template
   */
  async updateTemplate(templateId, updateData, updatedBy) {
    const startTime = Date.now();
    
    try {
      const existingTemplate = await NotificationTemplate.findById(templateId);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Store version history
      this.storeVersionHistory(existingTemplate);

      // Validate update data
      const validation = await this.validateTemplateData(updateData);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate new version if content changed
      let newVersion = existingTemplate.version;
      if (this.hasContentChanged(existingTemplate, updateData)) {
        newVersion = this.generateNextVersion(existingTemplate.version);
      }

      // Update template
      const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
        templateId,
        {
          ...updateData,
          version: newVersion,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      // Clear cache for this template type
      this.clearCacheForType(updatedTemplate.type);
      
      this.recordPerformanceMetric('update', Date.now() - startTime, true);
      
      console.log(`✅ Template updated: ${updatedTemplate.type} v${updatedTemplate.version}`);
      return updatedTemplate;
      
    } catch (error) {
      this.recordPerformanceMetric('update', Date.now() - startTime, false);
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete a template (soft delete by setting isActive to false)
   * @param {string} templateId - Template ID
   * @returns {boolean} Success status
   */
  async deleteTemplate(templateId) {
    const startTime = Date.now();
    
    try {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Soft delete
      template.isActive = false;
      template.updatedAt = new Date();
      await template.save();

      // Clear cache for this template type
      this.clearCacheForType(template.type);
      
      this.recordPerformanceMetric('delete', Date.now() - startTime, true);
      
      console.log(`✅ Template deleted: ${template.type} v${template.version}`);
      return true;
      
    } catch (error) {
      this.recordPerformanceMetric('delete', Date.now() - startTime, false);
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Get all templates with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Object} Templates and metadata
   */
  async getTemplates(filters = {}, pagination = {}) {
    const startTime = Date.now();
    
    try {
      const {
        type,
        category,
        channel,
        userRole,
        language,
        isActive = true,
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = -1
      } = pagination;

      // Build query
      const query = { isActive };
      
      if (type) query.type = type;
      if (category) query.category = category;
      if (channel) query['variants.channel'] = channel;
      if (userRole) query['variants.userRole'] = userRole;
      if (language) query['variants.language'] = language;
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } },
          { 'variants.title': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [templates, total] = await Promise.all([
        NotificationTemplate.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email'),
        NotificationTemplate.countDocuments(query)
      ]);

      this.recordPerformanceMetric('list', Date.now() - startTime, true);
      
      return {
        templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      this.recordPerformanceMetric('list', Date.now() - startTime, false);
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Rollback to a previous version
   * @param {string} templateId - Template ID
   * @param {string} targetVersion - Target version to rollback to
   * @returns {Object} Rolled back template
   */
  async rollbackTemplate(templateId, targetVersion) {
    const startTime = Date.now();
    
    try {
      const currentTemplate = await NotificationTemplate.findById(templateId);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // Get version history
      const versionHistory = this.versionHistory.get(templateId) || [];
      const targetVersionData = versionHistory.find(v => v.version === targetVersion);
      
      if (!targetVersionData) {
        throw new Error(`Version ${targetVersion} not found in history`);
      }

      // Store current version in history before rollback
      this.storeVersionHistory(currentTemplate);

      // Create new version with old data
      const newVersion = this.generateNextVersion(currentTemplate.version);
      
      const rolledBackTemplate = await NotificationTemplate.findByIdAndUpdate(
        templateId,
        {
          ...targetVersionData.data,
          version: newVersion,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      // Clear cache
      this.clearCacheForType(rolledBackTemplate.type);
      
      this.recordPerformanceMetric('rollback', Date.now() - startTime, true);
      
      console.log(`✅ Template rolled back: ${rolledBackTemplate.type} to v${targetVersion} as v${newVersion}`);
      return rolledBackTemplate;
      
    } catch (error) {
      this.recordPerformanceMetric('rollback', Date.now() - startTime, false);
      console.error('Error rolling back template:', error);
      throw error;
    }
  }

  /**
   * Validate template data
   * @param {Object} templateData - Template data to validate
   * @returns {Object} Validation result
   */
  async validateTemplateData(templateData) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields validation
      if (!templateData.name) errors.push('Template name is required');
      if (!templateData.type) errors.push('Template type is required');
      if (!templateData.category) errors.push('Template category is required');
      if (!templateData.variants || !Array.isArray(templateData.variants) || templateData.variants.length === 0) {
        errors.push('At least one template variant is required');
      }

      // Validate variants
      if (templateData.variants) {
        for (let i = 0; i < templateData.variants.length; i++) {
          const variant = templateData.variants[i];
          const variantErrors = await this.validateVariant(variant);
          errors.push(...variantErrors.map(err => `Variant ${i + 1}: ${err}`));
        }
      }

      // Business logic validation
      if (templateData.variants) {
        const channels = templateData.variants.map(v => v.channel);
        const uniqueChannels = [...new Set(channels)];
        if (channels.length !== uniqueChannels.length) {
          warnings.push('Duplicate channels found in variants');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed: ' + error.message],
        warnings
      };
    }
  }

  /**
   * Validate a single template variant
   * @param {Object} variant - Template variant
   * @returns {Array} Validation errors
   */
  async validateVariant(variant) {
    const errors = [];

    if (!variant.channel) errors.push('Channel is required');
    if (!variant.userRole) errors.push('User role is required');
    if (!variant.title) errors.push('Title is required');
    if (!variant.body) errors.push('Body is required');

    // Channel-specific validation
    if (variant.channel === 'email') {
      const emailValidation = await this.emailEngine.validateTemplate(variant);
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
      }
    } else if (variant.channel === 'sms') {
      const smsValidation = await this.smsEngine.validateTemplate(variant);
      if (!smsValidation.isValid) {
        errors.push(...smsValidation.errors);
      }
    }

    return errors;
  }

  /**
   * Test template rendering
   * @param {string} templateId - Template ID
   * @param {Object} testData - Test data
   * @returns {Object} Test results
   */
  async testTemplate(templateId, testData = {}) {
    const startTime = Date.now();
    
    try {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const results = {};
      
      // Test each variant
      for (const variant of template.variants) {
        try {
          let testResult;
          
          if (variant.channel === 'email') {
            testResult = await this.emailEngine.testTemplate(variant, testData);
          } else if (variant.channel === 'sms') {
            testResult = await this.smsEngine.testTemplate(variant, testData);
          } else {
            // Generic test for websocket
            testResult = {
              success: true,
              rendered: {
                title: this.interpolateString(variant.title, testData),
                body: this.interpolateString(variant.body, testData)
              }
            };
          }
          
          results[`${variant.channel}_${variant.userRole}_${variant.language}`] = testResult;
          
        } catch (error) {
          results[`${variant.channel}_${variant.userRole}_${variant.language}`] = {
            success: false,
            error: error.message
          };
        }
      }

      this.recordPerformanceMetric('test', Date.now() - startTime, true);
      
      return {
        templateId,
        templateName: template.name,
        templateType: template.type,
        results
      };
      
    } catch (error) {
      this.recordPerformanceMetric('test', Date.now() - startTime, false);
      console.error('Error testing template:', error);
      throw error;
    }
  }

  /**
   * Get template performance metrics
   * @param {string} templateId - Template ID (optional)
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics(templateId = null) {
    if (templateId) {
      return this.performanceMetrics.get(templateId) || {};
    }
    
    // Aggregate metrics
    const allMetrics = Array.from(this.performanceMetrics.values());
    const totalOperations = allMetrics.reduce((sum, m) => sum + m.totalOperations, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalCacheHits = allMetrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalCacheMisses = allMetrics.reduce((sum, m) => sum + m.cacheMisses, 0);
    
    return {
      totalOperations,
      errorRate: totalOperations > 0 ? totalErrors / totalOperations : 0,
      cacheHitRate: (totalCacheHits + totalCacheMisses) > 0 ? 
        totalCacheHits / (totalCacheHits + totalCacheMisses) : 0,
      averageResponseTime: allMetrics.length > 0 ? 
        allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length : 0,
      cacheSize: this.templateCache.size
    };
  }

  /**
   * Generate next version number
   * @param {string} currentVersion - Current version
   * @returns {string} Next version
   */
  generateNextVersion(currentVersion) {
    const parts = currentVersion.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  /**
   * Check if template content has changed
   * @param {Object} oldTemplate - Old template
   * @param {Object} newData - New template data
   * @returns {boolean} Has changed
   */
  hasContentChanged(oldTemplate, newData) {
    // Compare variants
    if (newData.variants) {
      const oldVariants = JSON.stringify(oldTemplate.variants);
      const newVariants = JSON.stringify(newData.variants);
      return oldVariants !== newVariants;
    }
    return false;
  }

  /**
   * Store version history
   * @param {Object} template - Template to store
   */
  storeVersionHistory(template) {
    const templateId = template._id.toString();
    if (!this.versionHistory.has(templateId)) {
      this.versionHistory.set(templateId, []);
    }
    
    const history = this.versionHistory.get(templateId);
    history.push({
      version: template.version,
      data: template.toObject(),
      timestamp: new Date()
    });
    
    // Keep only last 10 versions
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Update usage statistics
   * @param {string} templateId - Template ID
   */
  async updateUsageStats(templateId) {
    try {
      await NotificationTemplate.findByIdAndUpdate(
        templateId,
        {
          $inc: { 'usage.totalSent': 1 },
          $set: { 'usage.lastUsed': new Date() }
        }
      );
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }

  /**
   * Record performance metric
   * @param {string} operation - Operation type
   * @param {number} duration - Duration in ms
   * @param {boolean} success - Success status
   * @param {boolean} cacheHit - Cache hit status
   */
  recordPerformanceMetric(operation, duration, success, cacheHit = false) {
    const key = `global_${operation}`;
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        totalOperations: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(key);
    metrics.totalOperations++;
    metrics.totalResponseTime += duration;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.totalOperations;
    
    if (!success) metrics.errors++;
    if (cacheHit) metrics.cacheHits++;
    else metrics.cacheMisses++;
  }

  /**
   * Clear cache for specific template type
   * @param {string} type - Template type
   */
  clearCacheForType(type) {
    const keysToDelete = [];
    for (const key of this.templateCache.keys()) {
      if (key.startsWith(type + '_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.templateCache.delete(key));
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.templateCache.clear();
    this.emailEngine.clearCache();
    this.smsEngine.clearCache();
    console.log('All template caches cleared');
  }

  /**
   * Simple string interpolation
   * @param {string} template - Template string
   * @param {Object} data - Data object
   * @returns {string} Interpolated string
   */
  interpolateString(template, data) {
    if (!template || typeof template !== 'string') return '';
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match;
        }
      }
      
      return value !== null && value !== undefined ? String(value) : '';
    });
  }
}

export { TemplateManagementService };
export default TemplateManagementService;