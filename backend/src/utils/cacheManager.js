// Advanced caching strategies for the pharmacy platform
// Implements multi-level caching with Redis and in-memory caching

const Redis = require('redis');
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

    // Redis client for distributed caching
    this.redisClient = null;
    this.isRedisConnected = false;
    this.cacheHitCounts = new Map();
    this.cacheMissCounts = new Map();
  }

  // Initialize Redis connection
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redisClient.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.isRedisConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isRedisConnected = false;
    }
  }

  // Multi-level get operation
  async get(key, options = {}) {
    const startTime = Date.now();
    const { useMemory = true, useRedis = true, deserialize = true } = options;

    try {
      // Try memory cache first
      if (useMemory) {
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult !== undefined) {
          this.recordCacheHit('memory', key);
          recordCacheOperation('get', (Date.now() - startTime) / 1000, 'memory', true);
          return deserialize && typeof memoryResult === 'string' ? JSON.parse(memoryResult) : memoryResult;
        }
      }

      // Try Redis cache
      if (useRedis && this.isRedisConnected) {
        const redisResult = await this.redisClient.get(key);
        if (redisResult !== null) {
          // Store in memory cache for faster future access
          if (useMemory) {
            this.memoryCache.set(key, redisResult, options.ttl || 300);
          }
          
          this.recordCacheHit('redis', key);
          recordCacheOperation('get', (Date.now() - startTime) / 1000, 'redis', true);
          return deserialize ? JSON.parse(redisResult) : redisResult;
        }
      }

      // Cache miss
      this.recordCacheMiss('both', key);
      recordCacheOperation('get', (Date.now() - startTime) / 1000, 'both', false);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      recordCacheOperation('get', (Date.now() - startTime) / 1000, 'error', false);
      return null;
    }
  }

  // Multi-level set operation
  async set(key, value, options = {}) {
    const startTime = Date.now();
    const { 
      useMemory = true, 
      useRedis = true, 
      ttl = 300, 
      serialize = true,
      priority = 'normal'
    } = options;

    try {
      const serializedValue = serialize ? JSON.stringify(value) : value;

      // Set in memory cache
      if (useMemory) {
        this.memoryCache.set(key, serializedValue, ttl);
      }

      // Set in Redis cache
      if (useRedis && this.isRedisConnected) {
        if (ttl > 0) {
          await this.redisClient.setEx(key, ttl, serializedValue);
        } else {
          await this.redisClient.set(key, serializedValue);
        }
      }

      recordCacheOperation('set', (Date.now() - startTime) / 1000, 'both');
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      recordCacheOperation('set', (Date.now() - startTime) / 1000, 'error');
      return false;
    }
  }

  // Delete from all cache levels
  async delete(key) {
    const startTime = Date.now();

    try {
      // Delete from memory cache
      this.memoryCache.del(key);

      // Delete from Redis
      if (this.isRedisConnected) {
        await this.redisClient.del(key);
      }

      recordCacheOperation('delete', (Date.now() - startTime) / 1000, 'both');
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

      // Delete from Redis
      if (this.isRedisConnected) {
        const redisKeys = await this.redisClient.keys(pattern);
        if (redisKeys.length > 0) {
          await this.redisClient.del(redisKeys);
        }
      }

      recordCacheOperation('delete_pattern', (Date.now() - startTime) / 1000, 'both');
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
        connected: this.isRedisConnected
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
      redis: this.isRedisConnected,
      overall: true
    };

    // Test memory cache
    try {
      const testKey = 'health:test';
      this.memoryCache.set(testKey, 'test', 1);
      const result = this.memoryCache.get(testKey);
      health.memory = result === 'test';
    } catch (error) {
      health.memory = false;
    }

    // Test Redis
    if (this.isRedisConnected) {
      try {
        await this.redisClient.ping();
      } catch (error) {
        health.redis = false;
        this.isRedisConnected = false;
      }
    }

    health.overall = health.memory && health.redis;
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
