import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());

// Test routes to verify they work
app.get('/debug/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Debug route working',
    timestamp: new Date().toISOString()
  });
});

// Mock prescription queue endpoint
app.get('/debug/prescription-requests/dev/mock-queue', (req, res) => {
  const mockRequests = [
    {
      _id: '507f1f77bcf86cd799439011',
      requestNumber: 'PRX-2024-001',
      patient: {
        _id: 'patient1',
        profile: { firstName: 'John', lastName: 'Doe' },
        contact: { phone: '+1-555-0123' }
      },
      medications: [
        { 
          name: 'Metformin 500mg', 
          dosage: { instructions: '1 tablet twice daily' }, 
          quantity: { prescribed: 60, unit: 'tablets' },
          frequency: 'Twice daily' 
        }
      ],
      preferences: {
        urgency: 'routine',
        deliveryMethod: 'pickup'
      },
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      status: 'submitted',
      estimatedValue: 45.99
    }
  ];

  res.json({
    success: true,
    message: 'Mock prescription queue data',
    data: {
      pharmacyId: 'mock-pharmacy-id',
      pharmacyName: 'Mock Pharmacy',
      queue: mockRequests,
      queueSize: mockRequests.length
    }
  });
});

// Mock dashboard stats
app.get('/debug/pharmacies/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    message: 'Mock dashboard statistics',
    data: {
      pendingRequests: 5,
      activeOrders: 12,
      totalFulfilled: 45,
      monthlyRevenue: 2500,
      averageRating: 4.7,
      totalCustomers: 89,
      inventoryStats: {
        totalItems: 150,
        lowStockItems: 3
      }
    }
  });
});

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`🔍 Debug server running on port ${PORT}`);
  console.log(`Test these URLs:`);
  console.log(`  http://localhost:${PORT}/debug/test`);
  console.log(`  http://localhost:${PORT}/debug/prescription-requests/dev/mock-queue`);
  console.log(`  http://localhost:${PORT}/debug/pharmacies/dashboard/stats`);
});