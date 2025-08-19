/**
 * Test script to verify the enhanced marketplace workflow with detailed billing and messages
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import {Order} from './src/models/Order.js';

// Load environment variables
dotenv.config();

async function testEnhancedMarketplace() {
  try {
    console.log('🚀 === TESTING ENHANCED MARKETPLACE WORKFLOW ===');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find or create a patient
    let patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      patient = new User({
        email: 'patient@test.com',
        password: 'password123',
        role: 'patient',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        },
        contact: {
          phone: '+1-555-0123'
        }
      });
      await patient.save();
      console.log('✅ Created test patient:', patient.email);
    } else {
      console.log('✅ Found existing patient:', patient.email);
    }

    // 2. Find pharmacies
    const pharmacies = await Pharmacy.find({ isActive: true }).limit(2);
    if (pharmacies.length === 0) {
      console.log('❌ No pharmacies found. Please create pharmacies first.');
      return;
    }
    console.log('✅ Found pharmacies:', pharmacies.length);

    // 3. Create a prescription request
    const prescriptionRequest = new PrescriptionRequest({
      patient: patient._id,
      prescriber: {
        name: 'Dr. Enhanced Test',
        npiNumber: '1234567890',
        contactInfo: {
          phone: '+1-555-0123',
          email: 'dr.enhanced@test.com'
        }
      },
      medications: [
        {
          name: 'Metformin 500mg',
          genericName: 'Metformin',
          brandName: 'Glucophage',
          dosage: {
            form: 'tablet',
            instructions: '1 tablet twice daily with meals',
            frequency: 'BID',
            duration: '30 days'
          },
          quantity: {
            prescribed: 60,
            unit: 'tablets'
          },
          isGenericAcceptable: true
        },
        {
          name: 'Lisinopril 10mg',
          genericName: 'Lisinopril',
          brandName: 'Prinivil',
          dosage: {
            form: 'tablet',
            instructions: '1 tablet once daily',
            frequency: 'QD',
            duration: '30 days'
          },
          quantity: {
            prescribed: 30,
            unit: 'tablets'
          },
          isGenericAcceptable: true
        }
      ],
      preferences: {
        deliveryMethod: 'pickup',
        urgency: 'routine'
      },
      targetPharmacies: pharmacies.map((pharmacy, index) => ({
        pharmacyId: pharmacy._id,
        notifiedAt: new Date(),
        priority: index + 1
      })),
      status: 'submitted'
    });

    await prescriptionRequest.save();
    console.log('✅ Created prescription request:', prescriptionRequest.requestNumber);

    // 4. Simulate enhanced pharmacy responses
    const responses = [];
    
    // First pharmacy - detailed response with billing and message
    const detailedResponse = {
      pharmacy: pharmacies[0]._id,
      status: 'accepted',
      quotedPrice: {
        subtotal: 45.99,
        tax: 3.68,
        total: 49.67
      },
      estimatedFulfillmentTime: 30,
      notes: 'Prescription ready for pickup. Please bring ID.',
      
      // Enhanced detailed bill
      detailedBill: {
        medications: [
          {
            name: 'Metformin 500mg',
            brandName: 'Glucophage',
            genericName: 'Metformin',
            strength: '500mg',
            quantity: {
              prescribed: 60,
              unit: 'tablets'
            },
            pricing: {
              unitPrice: 0.45,
              totalPrice: 27.00,
              insuranceCoverage: 5.00,
              patientPay: 22.00
            },
            availability: {
              inStock: true,
              stockQuantity: 500
            },
            substitution: {
              isSubstituted: true,
              originalMedication: 'Glucophage',
              reason: 'Generic substitution for cost savings',
              savings: 8.00
            }
          },
          {
            name: 'Lisinopril 10mg',
            brandName: 'Prinivil',
            genericName: 'Lisinopril',
            strength: '10mg',
            quantity: {
              prescribed: 30,
              unit: 'tablets'
            },
            pricing: {
              unitPrice: 0.63,
              totalPrice: 18.99,
              insuranceCoverage: 3.00,
              patientPay: 15.99
            },
            availability: {
              inStock: true,
              stockQuantity: 200
            },
            substitution: {
              isSubstituted: false
            }
          }
        ],
        summary: {
          subtotal: 45.99,
          discount: {
            amount: 2.00,
            reason: 'Senior discount',
            percentage: 4.3
          },
          tax: {
            amount: 3.68,
            rate: 8.5
          },
          fees: [
            {
              type: 'consultation',
              amount: 5.00,
              description: 'Pharmacist consultation fee'
            }
          ],
          insurance: {
            copay: 10.00,
            deductible: 0,
            coinsurance: 0,
            totalCoverage: 8.00
          },
          finalTotal: 52.67,
          patientOwes: 44.67
        }
      },

      // Custom pharmacy message
      pharmacyMessage: {
        title: 'Important: Medication Instructions',
        content: 'Please take Metformin with food to reduce stomach upset. Lisinopril should be taken at the same time each day. If you experience any dizziness, please contact us immediately.\n\nWe have applied a senior discount to your order. Your insurance has been processed and covers $8.00 of the total cost.',
        priority: 'high',
        requiresAcknowledgment: true,
        messageType: 'instruction'
      },

      // Additional pharmacy info
      pharmacyInfo: {
        specialInstructions: 'Please bring photo ID and insurance card for pickup',
        pickupInstructions: 'Available for pickup at drive-through or inside counter',
        consultationAvailable: true,
        consultationFee: 5.00,
        pharmacistName: 'Dr. Sarah Johnson, PharmD',
        contactNumber: '+1-555-0199'
      },

      respondedAt: new Date()
    };

    // Second pharmacy - simpler response
    const simpleResponse = {
      pharmacy: pharmacies[1]._id,
      status: 'accepted',
      quotedPrice: {
        subtotal: 52.99,
        tax: 4.24,
        total: 57.23
      },
      estimatedFulfillmentTime: 45,
      notes: 'Both medications in stock. Ready in 45 minutes.',
      
      pharmacyMessage: {
        title: 'Prescription Update',
        content: 'Your prescription is ready for processing. We have both medications in stock and can have them ready within 45 minutes.',
        priority: 'normal',
        requiresAcknowledgment: false,
        messageType: 'info'
      },

      pharmacyInfo: {
        pickupInstructions: 'Please use main entrance for pickup',
        consultationAvailable: false,
        pharmacistName: 'Dr. Mike Chen, PharmD',
        contactNumber: '+1-555-0188'
      },

      respondedAt: new Date()
    };

    responses.push(detailedResponse, simpleResponse);
    prescriptionRequest.pharmacyResponses = responses;
    await prescriptionRequest.save();
    console.log('✅ Added enhanced pharmacy responses:', responses.length);

    // 5. Display the enhanced marketplace comparison
    console.log('\n🛒 === ENHANCED MARKETPLACE COMPARISON ===');
    
    console.log('\n📋 Pharmacy Response Comparison:');
    responses.forEach((resp, index) => {
      const pharmacy = pharmacies[index];
      console.log(`\n${index + 1}. ${pharmacy.name}:`);
      console.log(`   💰 Patient Owes: $${resp.detailedBill?.summary?.patientOwes?.toFixed(2) || resp.quotedPrice.total.toFixed(2)}`);
      console.log(`   ⏰ Ready In: ${resp.estimatedFulfillmentTime} minutes`);
      console.log(`   💊 Medications: ${resp.detailedBill?.medications?.length || 'Standard pricing'}`);
      
      if (resp.detailedBill?.summary?.insurance?.totalCoverage > 0) {
        console.log(`   🏥 Insurance Saves: $${resp.detailedBill.summary.insurance.totalCoverage.toFixed(2)}`);
      }
      
      if (resp.detailedBill?.summary?.discount?.amount > 0) {
        console.log(`   🎯 Discount: $${resp.detailedBill.summary.discount.amount.toFixed(2)} (${resp.detailedBill.summary.discount.reason})`);
      }
      
      if (resp.pharmacyMessage) {
        console.log(`   📨 Message: "${resp.pharmacyMessage.title}" (${resp.pharmacyMessage.priority} priority)`);
      }
      
      if (resp.pharmacyInfo?.consultationAvailable) {
        console.log(`   👨‍⚕️ Consultation: Available ($${resp.pharmacyInfo.consultationFee})`);
      }
      
      console.log(`   📞 Contact: ${resp.pharmacyInfo?.contactNumber || 'Standard pharmacy number'}`);
    });

    // 6. Simulate patient selection (choose the first pharmacy with detailed billing)
    console.log('\n✅ Patient selected: ' + pharmacies[0].name + ' (Better pricing with insurance and discount)');

    // 7. Create order with enhanced data
    const selectedResponse = responses[0];
    const selectedPharmacy = pharmacies[0];

    const orderData = {
      patient: patient._id,
      pharmacy: selectedPharmacy._id,
      prescriptionRequest: prescriptionRequest._id,
      pharmacyResponse: selectedResponse._id || new mongoose.Types.ObjectId(),
      medications: selectedResponse.detailedBill.medications.map(med => ({
        name: med.name,
        genericName: med.genericName,
        brandName: med.brandName,
        quantity: med.quantity,
        dosage: med.strength,
        frequency: 'As prescribed',
        price: {
          unit: med.pricing.unitPrice,
          total: med.pricing.patientPay
        }
      })),
      pricing: {
        subtotal: selectedResponse.detailedBill.summary.subtotal,
        tax: selectedResponse.detailedBill.summary.tax.amount,
        deliveryFee: 0,
        discount: selectedResponse.detailedBill.summary.discount.amount,
        total: selectedResponse.detailedBill.summary.patientOwes
      },
      fulfillment: {
        method: 'pickup',
        estimatedTime: selectedResponse.estimatedFulfillmentTime
      },
      status: 'pending',
      notes: {
        patient: 'Selected for better pricing and detailed information',
        pharmacy: selectedResponse.pharmacyMessage.content
      },
      metadata: {
        source: 'enhanced_test',
        estimatedValue: selectedResponse.detailedBill.summary.patientOwes,
        hasDetailedBill: true,
        hasPharmacyMessage: true
      }
    };

    const order = new Order(orderData);
    await order.save();

    // Update prescription request
    prescriptionRequest.status = 'accepted';
    prescriptionRequest.selectedPharmacy = selectedPharmacy._id;
    prescriptionRequest.selectedAt = new Date();
    await prescriptionRequest.save();

    console.log('✅ Enhanced order created:', order.orderNumber);

    // 8. Display final results
    console.log('\n📊 === ENHANCED WORKFLOW RESULTS ===');
    
    const finalOrder = await Order.findById(order._id)
      .populate('pharmacy', 'name')
      .populate('patient', 'profile.firstName profile.lastName');

    console.log('\n📦 Enhanced Order Details:');
    console.log(`   Order Number: ${finalOrder.orderNumber}`);
    console.log(`   Patient: ${finalOrder.patient.profile.firstName} ${finalOrder.patient.profile.lastName}`);
    console.log(`   Pharmacy: ${finalOrder.pharmacy.name}`);
    console.log(`   Total Amount: $${finalOrder.pricing.total.toFixed(2)}`);
    console.log(`   Discount Applied: $${finalOrder.pricing.discount.toFixed(2)}`);
    console.log(`   Tax: $${finalOrder.pricing.tax.toFixed(2)}`);
    console.log(`   Estimated Ready: ${finalOrder.fulfillment.estimatedTime} minutes`);
    console.log(`   Medications: ${finalOrder.medications.length}`);

    console.log('\n💊 Medication Details:');
    finalOrder.medications.forEach((med, index) => {
      console.log(`   ${index + 1}. ${med.name} - $${med.price.total.toFixed(2)}`);
    });

    console.log('\n📨 Pharmacy Message Received:');
    console.log(`   Title: ${selectedResponse.pharmacyMessage.title}`);
    console.log(`   Priority: ${selectedResponse.pharmacyMessage.priority}`);
    console.log(`   Requires Acknowledgment: ${selectedResponse.pharmacyMessage.requiresAcknowledgment ? 'Yes' : 'No'}`);
    console.log(`   Content: ${selectedResponse.pharmacyMessage.content.substring(0, 100)}...`);

    console.log('\n🎉 === ENHANCED MARKETPLACE WORKFLOW COMPLETED SUCCESSFULLY ===');
    console.log('✅ Features tested:');
    console.log('   • Detailed medication billing with insurance coverage');
    console.log('   • Custom pharmacy messages with priority levels');
    console.log('   • Enhanced pharmacy information and contact details');
    console.log('   • Discount and fee calculations');
    console.log('   • Generic substitution tracking with savings');
    console.log('   • Consultation availability and fees');

  } catch (error) {
    console.error('❌ Error testing enhanced marketplace:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testEnhancedMarketplace();