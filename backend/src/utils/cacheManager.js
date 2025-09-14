// Advanced caching strategies for the pharmacy platform
// Implements in-memory caching without Redis dependency

const NodeCache = require('node-cache');
const { recordCacheOperation } = require('../middleware/performanceMonitoring');

class CacheManager {
  constructor() {
    // In-memory cache for frequently accessed small data
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance for read-heavy workloads
    });

    // In-memory only - no Redis dependency
    this.cacheHitCounts = new Map();
    this.cacheMissCounts = new Map();
    
    // Cleanup old cache statistics periodically
    setInterval(() => {
      if (this.cacheHitCounts.size > 1000) {
        this.cacheHitCounts.clear();
      }
      if (this.cacheMissCounts.size > 1000) {
        this.cacheMissCounts.clear();
      }
    }, 300000); // Every 5 minutes
  }

  // Initialize cache manager (in-memory only)
  async initialize() {
    try {
      console.log('Cache manager initialized (in-memory only)');
      return true;
    } catch (error) {
      console.error('Failed to initialize cache manager:', error);
      return false;
    }
  }

  // In-memory get operation
  async get(key, options = {}) {
    const startTime = Date.now();
    const { deserialize = true } = options;

    try {
      // Try memory cache
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        this.recordCacheHit('memory', key);
        recordCacheOperation('get', (Date.now() - startTime) / 1000, 'memory', true);
        return deserialize && typeof memoryResult === 'string' ? JSON.parse(memoryResult) : memoryResult;
      }

      // Cache miss
      this.recordCacheMiss('memory', key);
      recordCacheOperation('get', (Date.now() - startTime) / 1000, 'miss', false);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      recordCacheOperation('get', (Date.now() - startTime) / 1000, 'error', false);
      return null;
    }
  }

  // In-memory set operation
  async set(key, value, options = {}) {
    const startTime = Date.now();
    const { 
      ttl = 300, 
      serialize = true,
      priority = 'normal'
    } = options;

    try {
      const serializedValue = serialize ? JSON.stringify(value) : value;

      // Set in memory cache
      this.memoryCache.set(key, serializedValue, ttl);

      recordCacheOperation('set', (Date.now() - startTime) / 1000, 'memory');
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      recordCacheOperation('set', (Date.now() - startTime) / 1000, 'error');
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    const startTime = Date.now();

    try {
      // Delete from memory cache
      this.memoryCache.del(key);

      recordCacheOperation('delete', (Date.now() - startTime) / 1000, 'memory');
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      recordCacheOperation('delete', (Date.now() - startTime) / 1000, 'error');
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern) {
    const startTime = Date.now();

    try {
      // Delete from memory cache (check all keys)
      const memoryKeys = this.memoryCache.keys();
      const matchingKeys = memoryKeys.filter(key => 
        new RegExp(pattern.replace(/\*/g, '.*')).test(key)
      );
      matchingKeys.forEach(key => this.memoryCache.del(key));

      recordCacheOperation('delete_pattern', (Date.now() - startTime) / 1000, 'memory');
      return true;
    } catch (error) {
      console.error(`Cache pattern delete error for pattern ${pattern}:`, error);
      recordCacheOperation('delete_pattern', (Date.now() - startTime) / 1000, 'error');
      return false;
    }
  }

  // Memoization wrapper
  memoize(fn, options = {}) {
    const { ttl = 300, keyGenerator, usePrefix = true } = options;
    const prefix = usePrefix ? `memoized:${fn.name}:` : '';

    return async (...args) => {
      const key = keyGenerator ? 
        `${prefix}${keyGenerator(...args)}` : 
        `${prefix}${JSON.stringify(args)}`;

      // Try to get cached result
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(...args);
      await this.set(key, result, { ttl });
      return result;
    };
  }

  // Cache warming strategies
  async warmCache(warmingStrategies) {
    console.log('Starting cache warming...');
    
    for (const strategy of warmingStrategies) {
      try {
        await strategy.execute(this);
        console.log(`Cache warming completed for: ${strategy.name}`);
      } catch (error) {
        console.error(`Cache warming failed for ${strategy.name}:`, error);
      }
    }
  }

  // Record cache statistics
  recordCacheHit(cacheType, key) {
    const hitKey = `${cacheType}:hits`;
    this.cacheHitCounts.set(hitKey, (this.cacheHitCounts.get(hitKey) || 0) + 1);
  }

  recordCacheMiss(cacheType, key) {
    const missKey = `${cacheType}:misses`;
    this.cacheMissCounts.set(missKey, (this.cacheMissCounts.get(missKey) || 0) + 1);
  }

  // Get cache statistics
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    
    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0
      },
      redis: {
        connected: false,
        status: 'disabled'
      },
      custom: {
        hits: Object.fromEntries(this.cacheHitCounts),
        misses: Object.fromEntries(this.cacheMissCounts)
      }
    };
  }

  // Health check
  async healthCheck() {
    const health = {
      memory: true,
      redis: false,
      overall: true
    };

    // Test memory cache
    try {
      const testKey = 'health:test';
      this.memoryCache.set(testKey, 'test', 1);
      const result = this.memoryCache.get(testKey);
      health.memory = result === 'test';
      this.memoryCache.del(testKey); // Cleanup test key
    } catch (error) {
      health.memory = false;
    }

    // Redis is disabled
    health.redis = false;

    health.overall = health.memory; // Only memory cache needs to work
    return health;
  }
}

// Pre-defined caching strategies for common use cases
class CachingStrategies {
  static userProfile(cacheManager) {
    return {
      async get(userId) {
        return cacheManager.get(`user:profile:${userId}`, { ttl: 600 });
      },
      
      async set(userId, profile) {
        return cacheManager.set(`user:profile:${userId}`, profile, { ttl: 600 });
      },
      
      async invalidate(userId) {
        return cacheManager.delete(`user:profile:${userId}`);
      }
    };
  }

  static pharmacyInventory(cacheManager) {
    return {
      async get(pharmacyId) {
        return cacheManager.get(`pharmacy:inventory:${pharmacyId}`, { ttl: 300 });
      },
      
      async set(pharmacyId, inventory) {
        return cacheManager.set(`pharmacy:inventory:${pharmacyId}`, inventory, { ttl: 300 });
      },
      
      async invalidate(pharmacyId) {
        return cacheManager.delete(`pharmacy:inventory:${pharmacyId}`);
      },
      
      async invalidateAll() {
        return cacheManager.deletePattern('pharmacy:inventory:*');
      }
    };
  }

  static prescriptionValidation(cacheManager) {
    return {
      async get(prescriptionId) {
        return cacheManager.get(`prescription:validation:${prescriptionId}`, { ttl: 1800 });
      },
      
      async set(prescriptionId, validation) {
        return cacheManager.set(`prescription:validation:${prescriptionId}`, validation, { ttl: 1800 });
      }
    };
  }

  static geospatialQueries(cacheManager) {
    return {
      async getNearbyPharmacies(lat, lng, radius) {
        const key = `geo:pharmacies:${lat}:${lng}:${radius}`;
        return cacheManager.get(key, { ttl: 600 });
      },
      
      async setNearbyPharmacies(lat, lng, radius, pharmacies) {
        const key = `geo:pharmacies:${lat}:${lng}:${radius}`;
        return cacheManager.set(key, pharmacies, { ttl: 600 });
      }
    };
  }
}

// Cache warming strategies
const cacheWarmingStrategies = [
  {
    name: 'Popular Medications',
    async execute(cacheManager) {
      // Warm cache with popular medication data
      const popularMeds = [
        'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Metformin'
      ];
      
      for (const med of popularMeds) {
        const key = `medication:info:${med.toLowerCase()}`;
        // Simulate fetching medication info
        const info = { name: med, category: 'common', inStock: true };
        await cacheManager.set(key, info, { ttl: 3600 });
      }
    }
  },
  {
    name: 'Active Pharmacies',
    async execute(cacheManager) {
      // Warm cache with active pharmacy data
      // This would typically fetch from database
      const key = 'pharmacies:active:list';
      const pharmacies = []; // Fetch from database
      await cacheManager.set(key, pharmacies, { ttl: 1800 });
    }
  }
];

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = {
  CacheManager,
  CachingStrategies,
  cacheManager,
  cacheWarmingStrategies
};
