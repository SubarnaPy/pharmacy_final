// Database optimization utilities for the pharmacy platform
// Implements modern ES6+ features for MongoDB query optimization

const mongoose = require('mongoose');
const { recordDatabaseQuery } = require('../middleware/performanceMonitoring');

class DatabaseOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.aggregationCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Generic query optimization wrapper
  async optimizedFind(model, query = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      // Create optimized query
      let mongooseQuery = model.find(query);

      // Apply lean for read-only operations
      if (options.lean !== false) {
        mongooseQuery = mongooseQuery.lean();
      }

      // Apply projections for field selection
      if (options.select) {
        mongooseQuery = mongooseQuery.select(options.select);
      }

      // Apply population with field selection
      if (options.populate) {
        if (Array.isArray(options.populate)) {
          options.populate.forEach(pop => {
            mongooseQuery = mongooseQuery.populate(pop);
          });
        } else {
          mongooseQuery = mongooseQuery.populate(options.populate);
        }
      }

      // Apply sorting
      if (options.sort) {
        mongooseQuery = mongooseQuery.sort(options.sort);
      }

      // Apply pagination
      if (options.limit) {
        mongooseQuery = mongooseQuery.limit(options.limit);
      }
      if (options.skip) {
        mongooseQuery = mongooseQuery.skip(options.skip);
      }

      // Execute query
      const result = await mongooseQuery.exec();
      
      // Record performance metrics
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'find',
        model.collection.name
      );

      return result;
    } catch (error) {
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'find_error',
        model.collection.name
      );
      throw error;
    }
  }

  // Optimized aggregation pipeline
  async optimizedAggregate(model, pipeline, options = {}) {
    const startTime = Date.now();
    const cacheKey = JSON.stringify({ model: model.collection.name, pipeline });

    try {
      // Check cache first
      if (options.cache !== false && this.aggregationCache.has(cacheKey)) {
        const cached = this.aggregationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Optimize pipeline stages
      const optimizedPipeline = this.optimizePipeline(pipeline);

      // Execute aggregation
      const result = await model.aggregate(optimizedPipeline).exec();

      // Cache result if enabled
      if (options.cache !== false && result.length < 1000) { // Don't cache large results
        this.aggregationCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      // Record performance metrics
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'aggregate',
        model.collection.name
      );

      return result;
    } catch (error) {
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'aggregate_error',
        model.collection.name
      );
      throw error;
    }
  }

  // Pipeline optimization helper
  optimizePipeline(pipeline) {
    const optimized = [...pipeline];

    // Move $match stages to the beginning
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);
    
    // Sort $match stages by selectivity (smaller collections first)
    matchStages.sort((a, b) => {
      const aKeys = Object.keys(a.$match).length;
      const bKeys = Object.keys(b.$match).length;
      return bKeys - aKeys; // More conditions first (more selective)
    });

    return [...matchStages, ...otherStages];
  }

  // Geospatial query optimization
  async findNearbyPharmacies(coordinates, maxDistance = 10000, options = {}) {
    const startTime = Date.now();
    
    try {
      const Pharmacy = mongoose.model('Pharmacy');
      
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: coordinates
            },
            distanceField: "distance",
            maxDistance: maxDistance,
            spherical: true,
            ...(options.query && { query: options.query })
          }
        },
        {
          $match: {
            isVerified: true,
            isActive: true,
            ...(options.services && { services: { $in: options.services } })
          }
        },
        {
          $project: {
            name: 1,
            address: 1,
            contact: 1,
            services: 1,
            rating: 1,
            distance: 1,
            availability: 1
          }
        },
        ...(options.limit && [{ $limit: options.limit }])
      ];

      const result = await this.optimizedAggregate(Pharmacy, pipeline, options);
      
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'geospatial',
        'pharmacies'
      );

      return result;
    } catch (error) {
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'geospatial_error',
        'pharmacies'
      );
      throw error;
    }
  }

  // Bulk operations optimization
  async optimizedBulkWrite(model, operations, options = {}) {
    const startTime = Date.now();
    
    try {
      // Group operations by type for better performance
      const groupedOps = this.groupBulkOperations(operations);
      
      const results = [];
      
      // Execute grouped operations
      for (const [opType, ops] of Object.entries(groupedOps)) {
        if (ops.length > 0) {
          const result = await model.bulkWrite(ops, {
            ordered: false, // Allow parallel execution
            ...options
          });
          results.push(result);
        }
      }

      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'bulk_write',
        model.collection.name
      );

      return results;
    } catch (error) {
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'bulk_write_error',
        model.collection.name
      );
      throw error;
    }
  }

  // Group bulk operations by type
  groupBulkOperations(operations) {
    return operations.reduce((groups, op) => {
      const opType = Object.keys(op)[0];
      if (!groups[opType]) {
        groups[opType] = [];
      }
      groups[opType].push(op);
      return groups;
    }, {});
  }

  // Text search optimization
  async optimizedTextSearch(model, searchTerm, options = {}) {
    const startTime = Date.now();
    
    try {
      const pipeline = [
        {
          $match: {
            $text: { $search: searchTerm }
          }
        },
        {
          $addFields: {
            score: { $meta: "textScore" }
          }
        },
        {
          $sort: { score: { $meta: "textScore" } }
        },
        ...(options.additionalMatch && [{ $match: options.additionalMatch }]),
        ...(options.project && [{ $project: options.project }]),
        ...(options.limit && [{ $limit: options.limit }])
      ];

      const result = await this.optimizedAggregate(model, pipeline, options);
      
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'text_search',
        model.collection.name
      );

      return result;
    } catch (error) {
      recordDatabaseQuery(
        (Date.now() - startTime) / 1000,
        'text_search_error',
        model.collection.name
      );
      throw error;
    }
  }

  // Connection pool optimization
  static optimizeConnectionPool() {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    return options;
  }

  // Clear caches
  clearCaches() {
    this.queryCache.clear();
    this.aggregationCache.clear();
  }

  // Cache statistics
  getCacheStats() {
    return {
      queryCache: {
        size: this.queryCache.size,
        keys: Array.from(this.queryCache.keys())
      },
      aggregationCache: {
        size: this.aggregationCache.size,
        keys: Array.from(this.aggregationCache.keys())
      }
    };
  }
}

// Database monitoring utilities
class DatabaseMonitor {
  static async getConnectionStatus() {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      state: states[state],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  static async getCollectionStats() {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const stats = [];
    for (const collection of collections) {
      try {
        const collStats = await db.collection(collection.name).stats();
        stats.push({
          name: collection.name,
          documents: collStats.count,
          avgSize: collStats.avgObjSize,
          totalSize: collStats.size,
          indexSize: collStats.totalIndexSize,
          indexes: collStats.nindexes
        });
      } catch (error) {
        // Skip collections that don't support stats
        continue;
      }
    }

    return stats;
  }

  static async getSlowQueries() {
    const db = mongoose.connection.db;
    
    try {
      // Enable profiling for slow queries
      await db.admin().command({ profile: 2, slowms: 100 });
      
      // Get slow queries from system.profile collection
      const slowQueries = await db.collection('system.profile')
        .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .sort({ ts: -1 })
        .limit(50)
        .toArray();

      return slowQueries;
    } catch (error) {
      console.warn('Could not retrieve slow queries:', error.message);
      return [];
    }
  }
}

// Export optimized query builders
const queryBuilders = {
  // Prescription queries
  async findPrescriptionsByPatient(patientId, options = {}) {
    const PrescriptionRequest = mongoose.model('PrescriptionRequest');
    const optimizer = new DatabaseOptimizer();
    
    return optimizer.optimizedFind(
      PrescriptionRequest,
      { patientId },
      {
        sort: { createdAt: -1 },
        populate: [
          { path: 'pharmacyId', select: 'name address contact' },
          { path: 'patientId', select: 'name email' }
        ],
        ...options
      }
    );
  },

  // Pharmacy inventory queries
  async findMedicationAvailability(medicationName, location, options = {}) {
    const Inventory = mongoose.model('Inventory');
    const optimizer = new DatabaseOptimizer();
    
    const pipeline = [
      {
        $match: {
          'medications.name': { $regex: medicationName, $options: 'i' },
          'medications.inStock': true
        }
      },
      {
        $lookup: {
          from: 'pharmacies',
          localField: 'pharmacyId',
          foreignField: '_id',
          as: 'pharmacy'
        }
      },
      {
        $unwind: '$pharmacy'
      },
      {
        $match: {
          'pharmacy.isVerified': true,
          'pharmacy.isActive': true
        }
      },
      ...(location && [{
        $geoNear: {
          near: {
            type: "Point",
            coordinates: location
          },
          distanceField: "distance",
          maxDistance: options.maxDistance || 10000,
          spherical: true
        }
      }]),
      {
        $project: {
          pharmacy: {
            name: 1,
            address: 1,
            contact: 1
          },
          medications: {
            $filter: {
              input: '$medications',
              cond: {
                $and: [
                  { $regexMatch: { input: '$$this.name', regex: medicationName, options: 'i' } },
                  { $eq: ['$$this.inStock', true] }
                ]
              }
            }
          },
          distance: 1
        }
      }
    ];

    return optimizer.optimizedAggregate(Inventory, pipeline, options);
  }
};

module.exports = {
  DatabaseOptimizer,
  DatabaseMonitor,
  queryBuilders
};
