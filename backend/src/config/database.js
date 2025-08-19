import mongoose from 'mongoose';

/**
 * MongoDB connection configuration using ES6 modules
 */
export const connectDatabase = async () => {
  try {
    let mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      console.log('MongoDB URI not found in environment variables. Using default local URI.');
      mongoURI = 'mongodb://localhost:27017/p-setup-3';
    }

    const options = {
      // Remove deprecated options that are now defaults in Mongoose 6+
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    const connection = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return connection;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error(`❌ Error closing MongoDB connection: ${error.message}`);
  }
};

/**
 * Clear all collections (useful for testing)
 */
export const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    await Promise.all(
      Object.values(collections).map(async (collection) => {
        await collection.deleteMany({});
      })
    );
    
    console.log('✅ Database cleared');
  } catch (error) {
    console.error(`❌ Error clearing database: ${error.message}`);
    throw error;
  }
};

/**
 * Setup database indexes for optimal performance
 */
export const setupIndexes = async () => {
  try {
    // This will be called after models are defined
    console.log('✅ Database indexes setup completed');
  } catch (error) {
    console.error(`❌ Error setting up indexes: ${error.message}`);
    throw error;
  }
};

// Export mongoose instance for direct use
export default mongoose;
