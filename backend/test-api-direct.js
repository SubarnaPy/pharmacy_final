import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database.js';

// Import routes
import prescriptionRequestRoutes from './src/routes/prescriptionRequestRoutes.js';
import pharmacyRoutes from './src/routes/pharmacyRoutes.js';

dotenv.config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API server is working',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/v1/prescription-requests', prescriptionRequestRoutes);
app.use('/api/v1/pharmacies', pharmacyRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = 5001; // Different port to avoid conflicts

const startTestServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🧪 Test API server running on port ${PORT}`);
      console.log(`Test endpoints:`);
      console.log(`  GET  http://localhost:${PORT}/test`);
      console.log(`  GET  http://localhost:${PORT}/api/v1/prescription-requests/dev/mock-queue`);
      console.log(`  GET  http://localhost:${PORT}/api/v1/pharmacies/dashboard/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to start test server:', error);
    process.exit(1);
  }
};

startTestServer();