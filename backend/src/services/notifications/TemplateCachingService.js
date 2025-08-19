/**
 * Template Caching Service
 * Advanced caching system for notification templates with multiple cache layers,
 * intelligent invalidation, and performance optimization
 */
class TemplateCachingService {
  constructor(options = {}) {
    // Cache layers
    this.memoryCache = new Map();
    this.compiledCache = new Map();
    this.renderCache = new Map();
    this.metadataCache = new Map();
    
    // Configuration
    this.config = {
      // Memory cache settings
      memoryCacheSize: options.memoryCacheSize || 500,
      memoryCacheTTL: options.memoryCacheTTL || 3600000, // 1 hour
      
      // Compiled template cache settings
      compiledCacheSize: options.compiledCacheSize || 1000,
      compiledCacheTTL: options.compiledCacheTTL || 7200000, // 2 hours
      
      // Render cache settings
      renderCacheSize: options.renderCacheSize || 2000,
      renderCacheTTL: options.renderCacheTTL || 300000, // 5 minutes
      
      // Metadata cache settings
      metadataCacheSize: options.metadataCacheSize || 100,
      metadataCacheTTL: options.metadataCacheTTL || 1800000, // 30 minutes
      
      // Cache behavior
      enableCompression: options.enableCompression !== false,
      enableMetrics: options.enableMetrics !== false,
      preloadPopularTemplates: options.preloadPopularTemplates !== false
    };
    
    // Cache metrics
    this.metrics = {
      hits: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      misses: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      evictions: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      totalRequests: 0,
      averageResponseTime: 0,
      lastResetTime: new Date()
    };
    
    // Cache invalidation tracking
    this.invalidationRules = new Map();
    this.dependencyGraph = new Map();
    
    // Preload queue
    this.preloadQueue = new Set();
    
    // Initialize cache management
    this.initializeCacheManagement();
    
    console.log('✅ Template Caching Service initialized');
  }

  /**
   * Initialize cache management processes
   */
  initializeCacheManagement() {
    // Periodic cleanup
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // Every 5 minutes

    // Metrics reset
    setInterval(() => {
      this.resetMetrics();
    }, 3600000); // Every hour

    // Preload popular templates
    if (this.config.preloadPopularTemplates) {
      setInterval(() => {
        this.preloadPopularTemplates();
      }, 1800000); // Every 30 minutes
    }
  }

  /**
   * Get template from cache with fallback to database
   * @param {string} cacheKey - Cache key
   * @param {Function} fetchFunction - Function to fetch from database
   * @param {Object} options - Cache options
   * @returns {Promise<Object>} Template data
   */
  async getTemplate(cacheKey, fetchFunction, options = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Try memory cache first
      const memoryResult = this.getFromMemoryCache(cacheKey);
      if (memoryResult) {
        this.recordCacheHit('memory', Date.now() - startTime);
        return memoryResult;
      }

      // Cache miss - fetch from database
      this.recordCacheMiss('memory');
      const data = await fetchFunction();
      
      if (data) {
        // Store in memory cache
        this.setInMemoryCache(cacheKey, data, options);
      }

      this.recordResponseTime(Date.now() - startTime);
      return data;

    } catch (error) {
      console.error('Error getting template from cache:', error);
      throw error;
    }
  }

  /**
   * Get compiled template from cache
   * @param {string} cacheKey - Cache key
   * @param {Function} compileFunction - Function to compile template
   * @param {Object} options - Cache options
   * @returns {Promise<Object>} Compiled template
   */
  async getCompiledTemplate(cacheKey, compileFunction, options = {}) {
    const startTime = Date.now();

    try {
      // Try compiled cache
      const compiledResult = this.getFromCompiledCache(cacheKey);
      if (compiledResult) {
        this.recordCacheHit('compiled', Date.now() - startTime);
        return compiledResult;
      }

      // Cache miss - compile template
      this.recordCacheMiss('compiled');
      const compiled = await compileFunction();
      
      if (compiled) {
        // Store in compiled cache
        this.setInCompiledCache(cacheKey, compiled, options);
      }

      return compiled;

    } catch (error) {
      console.error('Error getting compiled template from cache:', error);
      throw error;
    }
  }

  /**
   * Get rendered template from cache
   * @param {string} cacheKey - Cache key
   * @param {Function} renderFunction - Function to render template
   * @param {Object} options - Cache options
   * @returns {Promise<Object>} Rendered template
   */
  async getRenderedTemplate(cacheKey, renderFunction, options = {}) {
    const startTime = Date.now();

    try {
      // Check if render caching is disabled for this request
      if (options.skipCache) {
        return await renderFunction();
      }

      // Try render cache
      const renderResult = this.getFromRenderCache(cacheKey);
      if (renderResult) {
        this.recordCacheHit('render', Date.now() - startTime);
        return renderResult;
      }

      // Cache miss - render template
      this.recordCacheMiss('render');
      const rendered = await renderFunction();
      
      if (rendered && !options.skipCacheStore) {
        // Store in render cache
        this.setInRenderCache(cacheKey, rendered, options);
      }

      return rendered;

    } catch (error) {
      console.error('Error getting rendered template from cache:', error);
      throw error;
    }
  }

  /**
   * Get template metadata from cache
   * @param {string} cacheKey - Cache key
   * @param {Function} fetchFunction - Function to fetch metadata
   * @param {Object} options - Cache options
   * @returns {Promise<Object>} Template metadata
   */
  async getTemplateMetadata(cacheKey, fetchFunction, options = {}) {
    const startTime = Date.now();

    try {
      // Try metadata cache
      const metadataResult = this.getFromMetadataCache(cacheKey);
      if (metadataResult) {
        this.recordCacheHit('metadata', Date.now() - startTime);
        return metadataResult;
      }

      // Cache miss - fetch metadata
      this.recordCacheMiss('metadata');
      const metadata = await fetchFunction();
      
      if (metadata) {
        // Store in metadata cache
        this.setInMetadataCache(cacheKey, metadata, options);
      }

      return metadata;

    } catch (error) {
      console.error('Error getting template metadata from cache:', error);
      throw error;
    }
  }

  /**
   * Memory cache operations
   */
  getFromMemoryCache(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.memoryCacheTTL) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    return this.config.enableCompression ? this.decompress(entry.data) : entry.data;
  }

  setInMemoryCache(key, data, options = {}) {
    // Check cache size and evict if necessary
    if (this.memoryCache.size >= this.config.memoryCacheSize) {
      this.evictLRU(this.memoryCache, 'memory');
    }

    const entry = {
      data: this.config.enableCompression ? this.compress(data) : data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: options.ttl || this.config.memoryCacheTTL,
      size: this.calculateSize(data)
    };

    this.memoryCache.set(key, entry);
    
    // Track dependencies if provided
    if (options.dependencies) {
      this.trackDependencies(key, options.dependencies);
    }
  }

  /**
   * Compiled cache operations
   */
  getFromCompiledCache(key) {
    const entry = this.compiledCache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.compiledCacheTTL) {
      this.compiledCache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  setInCompiledCache(key, data, options = {}) {
    if (this.compiledCache.size >= this.config.compiledCacheSize) {
      this.evictLRU(this.compiledCache, 'compiled');
    }

    const entry = {
      data: data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: options.ttl || this.config.compiledCacheTTL,
      size: this.calculateSize(data)
    };

    this.compiledCache.set(key, entry);
    
    if (options.dependencies) {
      this.trackDependencies(key, options.dependencies);
    }
  }

  /**
   * Render cache operations
   */
  getFromRenderCache(key) {
    const entry = this.renderCache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.renderCacheTTL) {
      this.renderCache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  setInRenderCache(key, data, options = {}) {
    if (this.renderCache.size >= this.config.renderCacheSize) {
      this.evictLRU(this.renderCache, 'render');
    }

    const entry = {
      data: data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: options.ttl || this.config.renderCacheTTL,
      size: this.calculateSize(data)
    };

    this.renderCache.set(key, entry);
  }

  /**
   * Metadata cache operations
   */
  getFromMetadataCache(key) {
    const entry = this.metadataCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.metadataCacheTTL) {
      this.metadataCache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  setInMetadataCache(key, data, options = {}) {
    if (this.metadataCache.size >= this.config.metadataCacheSize) {
      this.evictLRU(this.metadataCache, 'metadata');
    }

    const entry = {
      data: data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: options.ttl || this.config.metadataCacheTTL,
      size: this.calculateSize(data)
    };

    this.metadataCache.set(key, entry);
  }

  /**
   * Cache invalidation
   */
  invalidateTemplate(templateId) {
    const keysToInvalidate = [];
    
    // Find all cache keys related to this template
    for (const key of this.memoryCache.keys()) {
      if (key.includes(templateId)) {
        keysToInvalidate.push(key);
      }
    }
    
    for (const key of this.compiledCache.keys()) {
      if (key.includes(templateId)) {
        keysToInvalidate.push(key);
      }
    }
    
    for (const key of this.renderCache.keys()) {
      if (key.includes(templateId)) {
        keysToInvalidate.push(key);
      }
    }

    // Invalidate all related keys
    keysToInvalidate.forEach(key => {
      this.memoryCache.delete(key);
      this.compiledCache.delete(key);
      this.renderCache.delete(key);
      this.metadataCache.delete(key);
    });

    // Invalidate dependent keys
    this.invalidateDependencies(templateId);

    console.log(`Invalidated ${keysToInvalidate.length} cache entries for template ${templateId}`);
  }

  invalidateByPattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToInvalidate = [];

    // Check all caches
    const caches = [
      { cache: this.memoryCache, name: 'memory' },
      { cache: this.compiledCache, name: 'compiled' },
      { cache: this.renderCache, name: 'render' },
      { cache: this.metadataCache, name: 'metadata' }
    ];

    for (const { cache, name } of caches) {
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          keysToInvalidate.push({ key, cache: name });
          cache.delete(key);
        }
      }
    }

    console.log(`Invalidated ${keysToInvalidate.length} cache entries matching pattern: ${pattern}`);
    return keysToInvalidate;
  }

  invalidateByTags(tags) {
    const keysToInvalidate = [];
    
    // This would require tag tracking in cache entries
    // For now, implement basic tag-based invalidation
    for (const tag of tags) {
      const pattern = `.*${tag}.*`;
      const invalidated = this.invalidateByPattern(pattern);
      keysToInvalidate.push(...invalidated);
    }

    return keysToInvalidate;
  }

  /**
   * Dependency tracking
   */
  trackDependencies(key, dependencies) {
    for (const dependency of dependencies) {
      if (!this.dependencyGraph.has(dependency)) {
        this.dependencyGraph.set(dependency, new Set());
      }
      this.dependencyGraph.get(dependency).add(key);
    }
  }

  invalidateDependencies(dependency) {
    const dependentKeys = this.dependencyGraph.get(dependency);
    if (!dependentKeys) return;

    for (const key of dependentKeys) {
      this.memoryCache.delete(key);
      this.compiledCache.delete(key);
      this.renderCache.delete(key);
      this.metadataCache.delete(key);
    }

    this.dependencyGraph.delete(dependency);
  }

  /**
   * Cache warming and preloading
   */
  async warmCache(templates) {
    console.log(`Warming cache with ${templates.length} templates`);
    
    for (const template of templates) {
      try {
        // Add to preload queue
        this.preloadQueue.add(template.id);
        
        // Preload template data
        const cacheKey = this.generateCacheKey(template.type, template.channel, template.userRole, template.language);
        await this.preloadTemplate(cacheKey, template);
        
      } catch (error) {
        console.error(`Error warming cache for template ${template.id}:`, error);
      }
    }
  }

  async preloadTemplate(cacheKey, template) {
    // Store in memory cache
    this.setInMemoryCache(cacheKey, template, { ttl: this.config.memoryCacheTTL * 2 });
    
    // Pre-compile if possible
    if (template.variants) {
      for (const variant of template.variants) {
        const compiledKey = `${cacheKey}_compiled_${variant.channel}_${variant.userRole}`;
        // This would call the actual compilation logic
        // For now, just store the variant
        this.setInCompiledCache(compiledKey, variant);
      }
    }
  }

  async preloadPopularTemplates() {
    // This would query analytics to find popular templates
    // For now, implement basic preloading logic
    console.log('Preloading popular templates...');
    
    // Get templates that are frequently accessed
    const popularTemplates = await this.getPopularTemplates();
    
    for (const template of popularTemplates) {
      if (!this.preloadQueue.has(template.id)) {
        await this.preloadTemplate(template.cacheKey, template);
        this.preloadQueue.add(template.id);
      }
    }
  }

  async getPopularTemplates() {
    // Placeholder - would integrate with analytics service
    return [];
  }

  /**
   * Cache maintenance
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean compiled cache
    for (const [key, entry] of this.compiledCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.compiledCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean render cache
    for (const [key, entry] of this.renderCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.renderCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean metadata cache
    for (const [key, entry] of this.metadataCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.metadataCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  evictLRU(cache, cacheType) {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.metrics.evictions[cacheType]++;
    }
  }

  /**
   * Metrics and monitoring
   */
  recordCacheHit(cacheType, responseTime) {
    if (this.config.enableMetrics) {
      this.metrics.hits[cacheType]++;
      this.recordResponseTime(responseTime);
    }
  }

  recordCacheMiss(cacheType) {
    if (this.config.enableMetrics) {
      this.metrics.misses[cacheType]++;
    }
  }

  recordResponseTime(responseTime) {
    if (this.config.enableMetrics) {
      const totalRequests = this.metrics.totalRequests;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  getCacheMetrics() {
    const totalHits = Object.values(this.metrics.hits).reduce((sum, hits) => sum + hits, 0);
    const totalMisses = Object.values(this.metrics.misses).reduce((sum, misses) => sum + misses, 0);
    const totalRequests = totalHits + totalMisses;

    return {
      ...this.metrics,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      cacheSize: {
        memory: this.memoryCache.size,
        compiled: this.compiledCache.size,
        render: this.renderCache.size,
        metadata: this.metadataCache.size
      },
      memoryUsage: this.calculateTotalMemoryUsage()
    };
  }

  resetMetrics() {
    this.metrics = {
      hits: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      misses: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      evictions: { memory: 0, compiled: 0, render: 0, metadata: 0 },
      totalRequests: 0,
      averageResponseTime: 0,
      lastResetTime: new Date()
    };
  }

  /**
   * Utility methods
   */
  generateCacheKey(...parts) {
    return parts.filter(part => part != null).join('_');
  }

  compress(data) {
    // Placeholder for compression logic
    // In production, use actual compression library
    return JSON.stringify(data);
  }

  decompress(data) {
    // Placeholder for decompression logic
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  calculateSize(data) {
    // Rough size calculation
    return JSON.stringify(data).length;
  }

  calculateTotalMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size || 0;
    }
    
    for (const entry of this.compiledCache.values()) {
      totalSize += entry.size || 0;
    }
    
    for (const entry of this.renderCache.values()) {
      totalSize += entry.size || 0;
    }
    
    for (const entry of this.metadataCache.values()) {
      totalSize += entry.size || 0;
    }
    
    return totalSize;
  }

  /**
   * Cache configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Cache configuration updated');
  }

  getConfig() {
    return { ...this.config };
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.memoryCache.clear();
    this.compiledCache.clear();
    this.renderCache.clear();
    this.metadataCache.clear();
    this.dependencyGraph.clear();
    this.preloadQueue.clear();
    
    console.log('All caches cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      isHealthy: this.isHealthy(),
      metrics: this.getCacheMetrics(),
      config: this.getConfig(),
      uptime: Date.now() - this.metrics.lastResetTime
    };
  }

  isHealthy() {
    const metrics = this.getCacheMetrics();
    
    // Check if hit rate is reasonable
    const hitRateThreshold = 0.3; // 30%
    if (metrics.hitRate < hitRateThreshold && metrics.totalRequests > 100) {
      return false;
    }
    
    // Check if memory usage is reasonable
    const maxMemoryUsage = 100 * 1024 * 1024; // 100MB
    if (metrics.memoryUsage > maxMemoryUsage) {
      return false;
    }
    
    return true;
  }
}

export { TemplateCachingService };
export default TemplateCachingService;