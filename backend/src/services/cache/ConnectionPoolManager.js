// import redisCacheService from './RedisCacheService.js';
import logger from '../LoggerService.js';

class ConnectionPoolManager {
  constructor() {
    this.pools = new Map();
    this.poolConfigs = new Map();
    this.poolStats = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimers = new Map();
  }

  async initialize() {
    try {
      // Initialize default pools
      await this.createPool('email', {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 300000, // 5 minutes
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        maxRetries: 3
      });

      await this.createPool('sms', {
        min: 1,
        max: 5,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 300000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        maxRetries: 3
      });

      await this.createPool('database', {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 600000, // 10 minutes
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        maxRetries: 5
      });

      logger.info('Connection pool manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize connection pool manager:', error);
      return false;
    }
  }

  async createPool(name, config) {
    try {
      const poolConfig = {
        ...config,
        create: () => this.createConnection(name),
        destroy: (connection) => this.destroyConnection(name, connection),
        validate: (connection) => this.validateConnection(name, connection)
      };

      // Store configuration
      this.poolConfigs.set(name, poolConfig);

      // Initialize pool stats
      this.poolStats.set(name, {
        created: 0,
        destroyed: 0,
        acquired: 0,
        released: 0,
        errors: 0,
        activeConnections: 0,
        idleConnections: 0,
        pendingAcquires: 0,
        lastHealthCheck: null,
        healthStatus: 'unknown'
      });

      // Create the actual pool (simplified implementation)
      const pool = {
        config: poolConfig,
        connections: [],
        activeConnections: new Set(),
        pendingAcquires: [],
        stats: this.poolStats.get(name)
      };

      this.pools.set(name, pool);

      // Start health checks
      this.startHealthCheck(name);

      // Pre-populate with minimum connections
      await this.ensureMinimumConnections(name);

      logger.info(`Created connection pool: ${name}`, { config });
      return true;
    } catch (error) {
      logger.error(`Error creating pool ${name}:`, error);
      throw error;
    }
  }

  async createConnection(poolName) {
    try {
      let connection;
      
      switch (poolName) {
        case 'email':
          connection = await this.createEmailConnection();
          break;
        case 'sms':
          connection = await this.createSMSConnection();
          break;
        case 'database':
          connection = await this.createDatabaseConnection();
          break;
        default:
          throw new Error(`Unknown pool type: ${poolName}`);
      }

      const stats = this.poolStats.get(poolName);
      stats.created++;
      stats.activeConnections++;

      logger.debug(`Created connection for pool: ${poolName}`);
      return connection;
    } catch (error) {
      const stats = this.poolStats.get(poolName);
      if (stats) stats.errors++;
      
      logger.error(`Error creating connection for pool ${poolName}:`, error);
      throw error;
    }
  }

  async createEmailConnection() {
    // Simulate email service connection
    return {
      type: 'email',
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isActive: true,
      lastUsed: new Date(),
      // Mock email client
      client: {
        send: async (data) => {
          // Simulate email sending
          await new Promise(resolve => setTimeout(resolve, 100));
          return { messageId: `msg_${Date.now()}` };
        }
      }
    };
  }

  async createSMSConnection() {
    // Simulate SMS service connection
    return {
      type: 'sms',
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isActive: true,
      lastUsed: new Date(),
      // Mock SMS client
      client: {
        send: async (data) => {
          // Simulate SMS sending
          await new Promise(resolve => setTimeout(resolve, 50));
          return { messageId: `sms_${Date.now()}` };
        }
      }
    };
  }

  async createDatabaseConnection() {
    // Simulate database connection
    return {
      type: 'database',
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isActive: true,
      lastUsed: new Date(),
      // Mock database client
      client: {
        query: async (query) => {
          // Simulate database query
          await new Promise(resolve => setTimeout(resolve, 10));
          return { results: [] };
        }
      }
    };
  }

  async destroyConnection(poolName, connection) {
    try {
      if (connection && connection.client) {
        // Close the actual connection
        if (connection.client.close) {
          await connection.client.close();
        }
        connection.isActive = false;
      }

      const stats = this.poolStats.get(poolName);
      if (stats) {
        stats.destroyed++;
        stats.activeConnections = Math.max(0, stats.activeConnections - 1);
      }

      logger.debug(`Destroyed connection for pool: ${poolName}`, { 
        connectionId: connection?.id 
      });
    } catch (error) {
      logger.error(`Error destroying connection for pool ${poolName}:`, error);
    }
  }

  async validateConnection(poolName, connection) {
    try {
      if (!connection || !connection.isActive) {
        return false;
      }

      // Check if connection is too old
      const maxAge = 3600000; // 1 hour
      if (Date.now() - connection.createdAt.getTime() > maxAge) {
        return false;
      }

      // Perform basic health check
      switch (connection.type) {
        case 'email':
        case 'sms':
        case 'database':
          // For now, just check if it exists and is active
          return connection.client && connection.isActive;
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error validating connection for pool ${poolName}:`, error);
      return false;
    }
  }

  async acquireConnection(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    try {
      const stats = pool.stats;
      stats.acquired++;

      // Try to get an idle connection first
      let connection = pool.connections.find(conn => 
        !pool.activeConnections.has(conn) && this.validateConnection(poolName, conn)
      );

      if (!connection) {
        // Create new connection if under max limit
        if (pool.activeConnections.size < pool.config.max) {
          connection = await this.createConnection(poolName);
          pool.connections.push(connection);
        } else {
          // Wait for a connection to become available
          connection = await this.waitForConnection(poolName);
        }
      }

      if (connection) {
        pool.activeConnections.add(connection);
        connection.lastUsed = new Date();
        stats.idleConnections = pool.connections.length - pool.activeConnections.size;
        
        logger.debug(`Acquired connection from pool: ${poolName}`, {
          connectionId: connection.id,
          activeConnections: pool.activeConnections.size
        });
      }

      return connection;
    } catch (error) {
      const stats = pool.stats;
      stats.errors++;
      
      logger.error(`Error acquiring connection from pool ${poolName}:`, error);
      throw error;
    }
  }

  async releaseConnection(poolName, connection) {
    const pool = this.pools.get(poolName);
    if (!pool || !connection) {
      return;
    }

    try {
      pool.activeConnections.delete(connection);
      const stats = pool.stats;
      stats.released++;
      stats.idleConnections = pool.connections.length - pool.activeConnections.size;

      logger.debug(`Released connection to pool: ${poolName}`, {
        connectionId: connection.id,
        activeConnections: pool.activeConnections.size
      });

      // Process any pending acquires
      if (pool.pendingAcquires.length > 0) {
        const pendingResolve = pool.pendingAcquires.shift();
        pendingResolve(connection);
      }
    } catch (error) {
      logger.error(`Error releasing connection to pool ${poolName}:`, error);
    }
  }

  async waitForConnection(poolName, timeout = 30000) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = pool.pendingAcquires.indexOf(resolve);
        if (index > -1) {
          pool.pendingAcquires.splice(index, 1);
        }
        reject(new Error(`Connection acquire timeout for pool ${poolName}`));
      }, timeout);

      const wrappedResolve = (connection) => {
        clearTimeout(timeoutId);
        resolve(connection);
      };

      pool.pendingAcquires.push(wrappedResolve);
      pool.stats.pendingAcquires = pool.pendingAcquires.length;
    });
  }

  async ensureMinimumConnections(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const config = pool.config;
    const currentConnections = pool.connections.length;

    if (currentConnections < config.min) {
      const needed = config.min - currentConnections;
      const promises = [];

      for (let i = 0; i < needed; i++) {
        promises.push(this.createConnection(poolName));
      }

      try {
        const newConnections = await Promise.all(promises);
        pool.connections.push(...newConnections);
        
        logger.info(`Created ${needed} minimum connections for pool: ${poolName}`);
      } catch (error) {
        logger.error(`Error creating minimum connections for pool ${poolName}:`, error);
      }
    }
  }

  startHealthCheck(poolName) {
    const timer = setInterval(async () => {
      await this.performHealthCheck(poolName);
    }, this.healthCheckInterval);

    this.healthCheckTimers.set(poolName, timer);
  }

  async performHealthCheck(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    try {
      const stats = pool.stats;
      let healthyConnections = 0;
      const connectionsToRemove = [];

      // Check each connection
      for (const connection of pool.connections) {
        const isValid = await this.validateConnection(poolName, connection);
        if (isValid) {
          healthyConnections++;
        } else {
          connectionsToRemove.push(connection);
        }
      }

      // Remove invalid connections
      for (const connection of connectionsToRemove) {
        const index = pool.connections.indexOf(connection);
        if (index > -1) {
          pool.connections.splice(index, 1);
          pool.activeConnections.delete(connection);
          await this.destroyConnection(poolName, connection);
        }
      }

      // Update stats
      stats.lastHealthCheck = new Date();
      stats.healthStatus = healthyConnections > 0 ? 'healthy' : 'unhealthy';
      stats.activeConnections = pool.activeConnections.size;
      stats.idleConnections = pool.connections.length - pool.activeConnections.size;

      // Ensure minimum connections
      await this.ensureMinimumConnections(poolName);

      // Cache pool status
      await redisCacheService.setConnectionPoolStatus(poolName, {
        healthStatus: stats.healthStatus,
        totalConnections: pool.connections.length,
        activeConnections: stats.activeConnections,
        idleConnections: stats.idleConnections,
        lastHealthCheck: stats.lastHealthCheck
      });

      logger.debug(`Health check completed for pool: ${poolName}`, {
        healthy: healthyConnections,
        removed: connectionsToRemove.length,
        total: pool.connections.length
      });
    } catch (error) {
      logger.error(`Error during health check for pool ${poolName}:`, error);
      
      const stats = pool.stats;
      stats.healthStatus = 'error';
      stats.lastHealthCheck = new Date();
    }
  }

  // Pool management methods
  async getPoolStats(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    return {
      name: poolName,
      config: pool.config,
      stats: pool.stats,
      connections: {
        total: pool.connections.length,
        active: pool.activeConnections.size,
        idle: pool.connections.length - pool.activeConnections.size,
        pending: pool.pendingAcquires.length
      }
    };
  }

  async getAllPoolStats() {
    const allStats = {};
    
    for (const poolName of this.pools.keys()) {
      allStats[poolName] = await this.getPoolStats(poolName);
    }
    
    return allStats;
  }

  async drainPool(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return false;

    try {
      // Stop health checks
      const timer = this.healthCheckTimers.get(poolName);
      if (timer) {
        clearInterval(timer);
        this.healthCheckTimers.delete(poolName);
      }

      // Close all connections
      const promises = pool.connections.map(connection => 
        this.destroyConnection(poolName, connection)
      );
      
      await Promise.all(promises);

      // Clear pool data
      pool.connections = [];
      pool.activeConnections.clear();
      pool.pendingAcquires = [];

      logger.info(`Drained pool: ${poolName}`);
      return true;
    } catch (error) {
      logger.error(`Error draining pool ${poolName}:`, error);
      return false;
    }
  }

  async shutdown() {
    try {
      const poolNames = Array.from(this.pools.keys());
      const promises = poolNames.map(poolName => this.drainPool(poolName));
      
      await Promise.all(promises);
      
      this.pools.clear();
      this.poolConfigs.clear();
      this.poolStats.clear();
      
      logger.info('Connection pool manager shutdown complete');
    } catch (error) {
      logger.error('Error during connection pool manager shutdown:', error);
    }
  }
}

export default new ConnectionPoolManager();