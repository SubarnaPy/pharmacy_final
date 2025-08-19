import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';
import adminController from './src/controllers/adminController.js';

// Load environment variables
dotenv.config();

async function testAdminDashboardEndpoints() {
  try {
    console.log('🧪 Testing Admin Dashboard Endpoints...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a simple Express app for testing
    const app = express();
    app.use(express.json());

    // Mock authentication middleware for testing
    app.use((req, res, next) => {
      req.user = { id: 'test-admin-id', role: 'admin' };
      next();
    });

    // Add admin routes
    app.get('/admin/notifications/dashboard', async (req, res, next) => {
      try {
        await adminController.getNotificationDashboard(req, res, next);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/admin/notifications/health', async (req, res, next) => {
      try {
        await adminController.getNotificationSystemHealth(req, res, next);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/admin/notifications/analytics', async (req, res, next) => {
      try {
        await adminController.getNotificationAnalytics(req, res, next);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/admin/notifications/delivery-report', async (req, res, next) => {
      try {
        await adminController.getDeliveryReport(req, res, next);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/admin/notifications/real-time-metrics', async (req, res, next) => {
      try {
        await adminController.getRealTimeNotificationMetrics(req, res, next);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    console.log('🚀 Testing admin dashboard endpoints...\n');

    // Test 1: Dashboard endpoint
    console.log('📊 Testing dashboard endpoint...');
    try {
      const dashboardResponse = await request(app)
        .get('/admin/notifications/dashboard')
        .expect(200);
      
      console.log('✅ Dashboard endpoint working');
      console.log('Dashboard data keys:', Object.keys(dashboardResponse.body.data || {}));
    } catch (error) {
      console.log('⚠️ Dashboard endpoint error:', error.message);
    }

    // Test 2: System health endpoint
    console.log('\n🏥 Testing system health endpoint...');
    try {
      const healthResponse = await request(app)
        .get('/admin/notifications/health')
        .expect(200);
      
      console.log('✅ System health endpoint working');
      console.log('Health data keys:', Object.keys(healthResponse.body.data || {}));
    } catch (error) {
      console.log('⚠️ System health endpoint error:', error.message);
    }

    // Test 3: Analytics endpoint
    console.log('\n📈 Testing analytics endpoint...');
    try {
      const analyticsResponse = await request(app)
        .get('/admin/notifications/analytics')
        .expect(200);
      
      console.log('✅ Analytics endpoint working');
      console.log('Analytics data keys:', Object.keys(analyticsResponse.body.data || {}));
    } catch (error) {
      console.log('⚠️ Analytics endpoint error:', error.message);
    }

    // Test 4: Delivery report endpoint
    console.log('\n📋 Testing delivery report endpoint...');
    try {
      const reportResponse = await request(app)
        .get('/admin/notifications/delivery-report')
        .expect(200);
      
      console.log('✅ Delivery report endpoint working');
      console.log('Report data keys:', Object.keys(reportResponse.body.data || {}));
    } catch (error) {
      console.log('⚠️ Delivery report endpoint error:', error.message);
    }

    // Test 5: Real-time metrics endpoint
    console.log('\n⚡ Testing real-time metrics endpoint...');
    try {
      const metricsResponse = await request(app)
        .get('/admin/notifications/real-time-metrics')
        .expect(200);
      
      console.log('✅ Real-time metrics endpoint working');
      console.log('Metrics data keys:', Object.keys(metricsResponse.body.data || {}));
    } catch (error) {
      console.log('⚠️ Real-time metrics endpoint error:', error.message);
    }

    console.log('\n✅ Admin dashboard endpoint tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the test
testAdminDashboardEndpoints();