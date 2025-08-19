import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testSubmitPrescriptionRequest() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import the PrescriptionController
    const PrescriptionController = (await import('./src/controllers/PrescriptionController.js')).default;
    
    // Create an instance
    const controller = new PrescriptionController();
    
    // Mock request and response objects
    const requestId = '68a0e91736a21838ddf896d1';
    const userId = '688b92ead99cdb72d8b85adb';
    
    const mockReq = {
      params: { requestId },
      user: { id: userId }
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        console.log(`📤 Response ${this.statusCode}:`, JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log('🔄 Testing prescription request submission...');
    
    try {
      await controller.submitPrescriptionRequest(mockReq, mockRes);
      
      if (mockRes.statusCode === 200) {
        console.log('✅ Prescription request submission successful!');
      } else {
        console.log('❌ Prescription request submission failed with status:', mockRes.statusCode);
      }
    } catch (error) {
      console.error('❌ Error during submission:', error.message);
    }

    await mongoose.disconnect();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testSubmitPrescriptionRequest();
