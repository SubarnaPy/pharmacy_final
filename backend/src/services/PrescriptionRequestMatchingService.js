import Pharmacy from '../models/Pharmacy.js';
import { InventoryItem } from '../models/Inventory.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import Notification from '../models/Notification.js';

/**
 * Service to handle prescription request creation and pharmacy matching
 */
class PrescriptionRequestMatchingService {
  constructor() {
    console.log('✅ Prescription Request Matching Service initialized');
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Normalize medicine name for matching
   * @param {string} name - Medicine name
   * @returns {string} Normalized name
   */
  normalizeMedicineName(name) {
    if (!name) {
      console.log(`⚠️ normalizeMedicineName: Empty/null name provided`);
      return '';
    }

    const original = name;
    const step1 = name.toLowerCase();
    const step2 = step1.trim();
    const step3 = step2.replace(/[^a-z0-9\s]/g, '');
    const final = step3.replace(/\s+/g, ' ').trim(); // Normalize multiple spaces to single space

    if (original !== final) {
      console.log(`🔄 Medicine name normalization: "${original}" -> "${final}"`);
    }

    return final;
  }

  /**
   * Create prescription request from processed prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @param {string} patientId - Patient user ID
   * @param {Object} patientLocation - Patient's location {latitude, longitude}
   * @returns {Object} Created prescription request with matched pharmacies
   */
  async createPrescriptionRequestFromUpload(prescriptionData, patientId, patientLocation) {
    try {
      console.log('🔄 Creating prescription request from uploaded prescription');

      // Extract medications from prescription data
      const medications = this.extractMedicationsFromPrescription(prescriptionData);

      if (medications.length === 0) {
        throw new Error('No medications found in prescription');
      }

      // Find matching pharmacies within 1000km that have ALL required medications
      const matchingPharmacies = await this.findMatchingPharmacies(medications, patientLocation, 1000);

      console.log(`\n📊 Matching pharmacies result:`);
      console.log(`   🏥 Total matching pharmacies: ${matchingPharmacies.length}`);
      matchingPharmacies.forEach((pharmacy, index) => {
        console.log(`   ${index + 1}. ${pharmacy.name} (ID: ${pharmacy._id}) - ${pharmacy.distance}km away`);
      });

      // Create prescription request with target pharmacies and structured data
      const requestData = {
        patient: patientId,
        medications: medications,
        preferences: {
          deliveryMethod: 'either',
          deliveryAddress: null
        },
        targetPharmacies: matchingPharmacies.map((pharmacy, index) => ({
          pharmacyId: pharmacy._id,
          notifiedAt: new Date(),
          priority: index + 1,
          matchScore: pharmacy.availabilityScore || 100
        })),
        
        // Prescription image and file information
        prescriptionImage: prescriptionData.prescriptionImage || prescriptionData.cloudinaryUpload?.secure_url || '',
        cloudinaryId: prescriptionData.cloudinaryId || prescriptionData.cloudinaryUpload?.public_id || '',
        originalFilename: prescriptionData.originalFilename || prescriptionData.originalFile?.originalname || '',
        fileType: prescriptionData.fileType || prescriptionData.originalFile?.mimetype || '',
        fileSize: prescriptionData.fileSize || prescriptionData.originalFile?.size || 0,
        
        // Structured prescription data from Gemini AI
        prescriptionStructuredData: {
          // Doctor information
          doctor: this.extractDoctorInfo(prescriptionData),
          
          // Patient information
          patientInfo: this.extractPatientInfo(prescriptionData),
          
          // Enhanced medication information
          medicationsDetailed: this.extractDetailedMedications(prescriptionData),
          
          // AI processing results
          aiProcessing: this.extractAIProcessingResults(prescriptionData),
          
          // Drug interactions
          drugInteractions: this.extractDrugInteractions(prescriptionData),
          
          // Dosage validations
          dosageValidations: this.extractDosageValidations(prescriptionData),
          
          // Risk assessment
          riskAssessment: this.extractRiskAssessment(prescriptionData),
          
          // OCR data
          ocrData: this.extractOCRData(prescriptionData),
          
          // Processing metadata
          processingId: prescriptionData.processingId || `PROC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          processingTime: prescriptionData.processingTime || 0,
          processingStatus: prescriptionData.processingStatus || 'completed'
        },
        
        metadata: {
          geoLocation: [patientLocation.longitude, patientLocation.latitude],
          source: 'prescription_upload'
        },
        status: 'draft',
        isActive: true
      };

      console.log(`\n📝 Creating prescription request with data:`);
      console.log(`   📋 Patient: ${patientId}`);
      console.log(`   💊 Medications: ${medications.length}`);
      console.log(`   🏥 Target pharmacies: ${matchingPharmacies.length}`);
      console.log(`   📍 Patient location: [${patientLocation.longitude}, ${patientLocation.latitude}]`);
      
      console.log(`   🎯 Target pharmacies that will be notified:`);
      matchingPharmacies.slice(0, 5).forEach((pharmacy, index) => {
        console.log(`     ${index + 1}. ${pharmacy?.name || 'Unknown'} (ID: ${pharmacy._id}) - Priority: ${index + 1}`);
      });

      let prescriptionRequest;
      try {
        prescriptionRequest = await PrescriptionRequest.create(requestData);
        console.log(`✅ Prescription request created successfully`);
      } catch (createError) {
        console.error(`❌ Error creating prescription request:`, createError);
        if (createError.name === 'ValidationError') {
          console.error(`📋 Validation errors:`, createError.errors);
        }
        throw createError;
      }

      console.log(`✅ Created prescription request ${prescriptionRequest._id} with ${matchingPharmacies.length} potential pharmacies`);
      
      // Automatically submit the request to pharmacies if there are matches
      if (matchingPharmacies.length > 0) {
        console.log(`📤 Auto-submitting prescription request to ${matchingPharmacies.length} pharmacies...`);
        
        try {
          // Update status to submitted
          prescriptionRequest.status = 'submitted';
          await prescriptionRequest.save();
          
          // Send notifications to pharmacies (simplified version)
          await this.notifyPharmaciesOfNewRequest(prescriptionRequest, matchingPharmacies);
          
          console.log(`✅ Prescription request submitted successfully to pharmacies`);
        } catch (notificationError) {
          console.error(`⚠️ Failed to notify pharmacies:`, notificationError.message);
          // Don't fail the entire operation if notifications fail
        }
      }
      
      console.log(`🔍 Prescription request created and submitted. Pharmacies can now respond.`);

      return {
        prescriptionRequest,
        matchingPharmacies: matchingPharmacies.slice(0, 10), // Return top 10 matches
        totalPharmaciesFound: matchingPharmacies.length
      };

    } catch (error) {
      console.error('❌ Failed to create prescription request from upload:', error.message);
      throw error;
    }
  }

  /**
   * Find pharmacies that can fulfill the prescription requirements
   * @param {Array} medications - Array of medication objects
   * @param {Object} patientLocation - Patient's location
   * @param {number} maxDistance - Maximum distance in kilometers
   * @returns {Array} Array of matching pharmacies
   */
  async findMatchingPharmacies(medications, patientLocation, maxDistance = 1000) {
    try {
      console.log(`🔍 Finding pharmacies within ${maxDistance}km that can fulfill prescription`);

      // Get all active pharmacies
      console.log(`🔍 Searching for pharmacies with criteria:`);
      console.log(`   - registrationStatus: 'approved'`);
      console.log(`   - isVerified: true`);

      const pharmacies = await Pharmacy.find({
        registrationStatus: 'approved',
        isVerified: true
      }).select('name address location contact owner');

      console.log(`📊 Database query results:`);
      console.log(`   - Total pharmacies found: ${pharmacies.length}`);

      if (pharmacies.length === 0) {
        console.log(`⚠️ No approved and verified pharmacies found in database!`);
        console.log(`🔍 Let's check what pharmacies exist with any status:`);

        const allPharmacies = await Pharmacy.find({}).select('name registrationStatus isVerified isActive');
        console.log(`   - Total pharmacies in database: ${allPharmacies.length}`);

        if (allPharmacies.length > 0) {
          console.log(`📋 Pharmacy statuses:`);
          allPharmacies.forEach((p, idx) => {
            console.log(`     ${idx + 1}. ${p.name}: status=${p.registrationStatus}, verified=${p.isVerified}, active=${p.isActive}`);
          });

          // Try with relaxed criteria for testing
          console.log(`🔄 Trying with relaxed criteria (any active pharmacy)...`);
          const relaxedPharmacies = await Pharmacy.find({
            isActive: { $ne: false }
          }).select('name address location contact owner registrationStatus isVerified');

          console.log(`   - Pharmacies with relaxed criteria: ${relaxedPharmacies.length}`);

          if (relaxedPharmacies.length > 0) {
            console.log(`⚠️ Using relaxed criteria for testing purposes`);
            // Use relaxed pharmacies for now
            pharmacies.push(...relaxedPharmacies);
          }
        } else {
          console.log(`❌ No pharmacies exist in the database at all!`);
          console.log(`💡 Suggestion: Create some test pharmacies first`);
        }
      }

      const matchingPharmacies = [];
      const requiredMedicines = medications.map(med => this.normalizeMedicineName(med.name)).filter(name => name);

      console.log(`💊 Required medicines (${requiredMedicines.length}):`, requiredMedicines.map((med, index) => `${index + 1}. "${med}"`).join('\n  '));

      for (const pharmacy of pharmacies) {
        try {
          console.log(`\n🏥 Processing pharmacy: ${pharmacy.name} (ID: ${pharmacy._id})`);

          // Check if pharmacy has location data
          if (!pharmacy.location || !pharmacy.location.coordinates) {
            console.warn(`⚠️ Pharmacy ${pharmacy.name} has no location data - SKIPPING`);
            continue;
          }

          // Calculate distance
          const [pharmLon, pharmLat] = pharmacy.location.coordinates;
          const distance = this.calculateDistance(
            patientLocation.latitude,
            patientLocation.longitude,
            pharmLat,
            pharmLon
          );

          console.log(`📍 Distance from patient: ${distance.toFixed(2)}km`);

          // Skip if too far
          if (distance > maxDistance) {
            console.log(`❌ Too far (>${maxDistance}km) - SKIPPING`);
            continue;
          }

          // Check inventory for all required medicines
          console.log(`📦 Checking inventory for pharmacy ${pharmacy.name} (ID: ${pharmacy._id})`);

          const inventoryItems = await InventoryItem.find({
            pharmacyId: pharmacy._id,
            quantityAvailable: { $gt: 0 },
            status: { $in: ['available', 'low-stock'] }
          }).select('medicineName quantityAvailable pricePerUnit status');

          console.log(`📦 Pharmacy inventory query results: ${inventoryItems.length} items in stock`);

          // If no items found, check if there are ANY items for this pharmacy
          if (inventoryItems.length === 0) {
            console.log(`⚠️ No items found with current criteria. Checking all inventory for this pharmacy...`);

            const allInventoryItems = await InventoryItem.find({
              pharmacyId: pharmacy._id
            }).select('medicineName quantityAvailable pricePerUnit status');

            console.log(`   - Total inventory items (any status): ${allInventoryItems.length}`);

            if (allInventoryItems.length > 0) {
              console.log(`   📋 All inventory items for ${pharmacy.name}:`);
              allInventoryItems.forEach((item, idx) => {
                console.log(`     ${idx + 1}. "${item.medicineName}" (Qty: ${item.quantityAvailable}, Status: ${item.status})`);
              });
            } else {
              console.log(`   📭 No inventory items exist for this pharmacy at all`);
            }
          }

          // Normalize inventory medicine names for comparison
          const inventoryMedicines = inventoryItems.map((item, index) => {
            const normalized = this.normalizeMedicineName(item.medicineName);
            console.log(`  ${index + 1}. "${item.medicineName}" -> normalized: "${normalized}" (Qty: ${item.quantityAvailable}, Price: $${item.pricePerUnit}, Status: ${item.status})`);
            return {
              original: item.medicineName,
              normalized: normalized,
              quantity: item.quantityAvailable,
              price: item.pricePerUnit,
              status: item.status,
              itemId: item._id
            };
          });

          if (inventoryMedicines.length === 0) {
            console.log(`  📭 No medicines in stock at ${pharmacy.name} matching criteria`);
          }

          // Check if all required medicines are available
          console.log(`\n🔍 Matching required medicines against pharmacy inventory:`);
          const availableMedications = [];
          const missingMedications = [];

          for (let i = 0; i < requiredMedicines.length; i++) {
            const requiredMed = requiredMedicines[i];
            console.log(`\n  🎯 Looking for: "${requiredMed}"`);

            // Try different matching strategies
            let found = null;
            let matchType = '';

            // Strategy 1: Exact normalized match
            found = inventoryMedicines.find(inv => inv.normalized === requiredMed);
            if (found) {
              matchType = 'exact';
            } else {
              // Strategy 2: Inventory contains required medicine name
              found = inventoryMedicines.find(inv => inv.normalized.includes(requiredMed));
              if (found) {
                matchType = 'inventory_contains_required';
              } else {
                // Strategy 3: Required medicine name contains inventory name
                found = inventoryMedicines.find(inv => requiredMed.includes(inv.normalized));
                if (found) {
                  matchType = 'required_contains_inventory';
                }
              }
            }

            if (found) {
              console.log(`    ✅ MATCH FOUND (${matchType}): "${found.original}" (normalized: "${found.normalized}")`);
              console.log(`       📊 Stock: ${found.quantity} units, Price: $${found.price}, Status: ${found.status}`);

              availableMedications.push({
                required: requiredMed,
                available: found.original,
                quantity: found.quantity,
                price: found.price,
                status: found.status,
                matchType: matchType,
                inventoryId: found.itemId
              });
            } else {
              console.log(`    ❌ NO MATCH FOUND`);
              console.log(`       🔍 Tried matching "${requiredMed}" against:`);
              inventoryMedicines.forEach((inv, idx) => {
                console.log(`         ${idx + 1}. "${inv.normalized}" (from "${inv.original}")`);
              });
              missingMedications.push(requiredMed);
            }
          }

          console.log(`\n📋 Matching Summary for ${pharmacy.name}:`);
          console.log(`   ✅ Available: ${availableMedications.length}/${requiredMedicines.length} medicines`);
          console.log(`   ❌ Missing: ${missingMedications.length} medicines`);

          if (availableMedications.length > 0) {
            console.log(`   📦 Available medicines:`);
            availableMedications.forEach((med, idx) => {
              console.log(`     ${idx + 1}. "${med.required}" -> "${med.available}" (${med.matchType} match)`);
            });
          }

          if (missingMedications.length > 0) {
            console.log(`   🚫 Missing medicines: ${missingMedications.map(med => `"${med}"`).join(', ')}`);
          }

          // Only include pharmacy if ALL medicines are available
          if (missingMedications.length === 0 && availableMedications.length > 0) {
            const availabilityScore = (availableMedications.length / requiredMedicines.length) * 100;

            matchingPharmacies.push({
              _id: pharmacy._id,
              name: pharmacy.name,
              address: `${pharmacy.address.street}, ${pharmacy.address.city}, ${pharmacy.address.state}`,
              phoneNumber: pharmacy.contact?.phone,
              email: pharmacy.contact?.email,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
              availableMedications,
              totalMedicationsMatched: availableMedications.length,
              owner: pharmacy.owner,
              location: pharmacy.location,
              availabilityScore: availabilityScore,
              estimatedFulfillmentTime: '2-4 hours' // Default estimate
            });

            console.log(`🎉 ✅ PHARMACY QUALIFIED: ${pharmacy.name}`);
            console.log(`   📍 Distance: ${distance.toFixed(1)}km`);
            console.log(`   📊 Availability Score: ${availabilityScore.toFixed(1)}%`);
            console.log(`   💊 All ${requiredMedicines.length} medicines available`);

          } else {
            console.log(`🚫 ❌ PHARMACY REJECTED: ${pharmacy.name}`);
            console.log(`   📊 Available: ${availableMedications.length}/${requiredMedicines.length} medicines`);
            if (missingMedications.length > 0) {
              console.log(`   🚫 Missing medicines: ${missingMedications.map(med => `"${med}"`).join(', ')}`);
            }
          }

        } catch (pharmError) {
          console.error(`💥 ❌ ERROR processing pharmacy ${pharmacy.name}:`, pharmError.message);
          console.error(`   Stack trace:`, pharmError.stack);
        }
      }

      // Sort by distance
      matchingPharmacies.sort((a, b) => a.distance - b.distance);

      console.log(`\n🏆 FINAL RESULTS:`);
      console.log(`   🎯 Total matching pharmacies: ${matchingPharmacies.length}`);
      console.log(`   📋 Required medicines: ${requiredMedicines.length}`);
      console.log(`   🏥 Total pharmacies checked: ${pharmacies.length}`);

      if (matchingPharmacies.length > 0) {
        console.log(`\n📊 Top matching pharmacies (sorted by distance):`);
        matchingPharmacies.slice(0, 5).forEach((pharmacy, index) => {
          console.log(`   ${index + 1}. ${pharmacy.name} - ${pharmacy.distance}km away (${pharmacy.availabilityScore.toFixed(1)}% match)`);
        });
      } else {
        console.log(`\n⚠️ No pharmacies found that have ALL required medicines in stock within ${maxDistance}km`);

        // If no matching pharmacies found, let's do some debugging
        console.log(`\n🔍 DEBUGGING: Why no pharmacies matched?`);

        // Check total inventory items in database
        const totalInventoryItems = await InventoryItem.countDocuments();
        console.log(`   📦 Total inventory items in database: ${totalInventoryItems}`);

        if (totalInventoryItems === 0) {
          console.log(`   ❌ No inventory items exist in the database!`);
          console.log(`   💡 Suggestion: Add some inventory items to pharmacies first`);
        } else {
          // Check inventory by pharmacy
          const inventoryByPharmacy = await InventoryItem.aggregate([
            {
              $group: {
                _id: '$pharmacyId',
                count: { $sum: 1 },
                availableCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ['$quantityAvailable', 0] },
                          { $in: ['$status', ['available', 'low-stock']] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]);

          console.log(`   📊 Inventory distribution by pharmacy:`);
          inventoryByPharmacy.forEach((inv, idx) => {
            console.log(`     ${idx + 1}. Pharmacy ${inv._id}: ${inv.availableCount}/${inv.count} items available`);
          });

          // Check if any inventory items match our required medicines
          console.log(`\n   🔍 Checking if any inventory items match required medicines:`);
          for (const requiredMed of requiredMedicines) {
            const matchingItems = await InventoryItem.find({
              $or: [
                { medicineName: new RegExp(requiredMed, 'i') },
                { medicineName: new RegExp(requiredMed.replace(/\s+/g, '.*'), 'i') }
              ]
            }).select('medicineName pharmacyId quantityAvailable status');

            console.log(`     "${requiredMed}": ${matchingItems.length} potential matches found`);
            matchingItems.forEach((item, idx) => {
              console.log(`       ${idx + 1}. "${item.medicineName}" at pharmacy ${item.pharmacyId} (Qty: ${item.quantityAvailable}, Status: ${item.status})`);
            });
          }
        }
      }

      return matchingPharmacies;

    } catch (error) {
      console.error('❌ Error finding matching pharmacies:', error);
      throw new Error('Failed to find matching pharmacies');
    }
  }

  /**
   * Check medication availability in a pharmacy's inventory
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array} medications - Array of medication objects
   * @returns {Array} Array of availability information
   */
  async checkMedicationAvailability(pharmacyId, medications) {
    try {
      const availabilityResults = await Promise.all(
        medications.map(async (medication) => {
          try {
            // Search for medication in pharmacy inventory using InventoryItem model
            const inventoryItems = await InventoryItem.find({
              pharmacyId: pharmacyId,
              $or: [
                { medicineName: new RegExp(medication.name, 'i') },
                { brandName: new RegExp(medication.name, 'i') }
              ],
              quantityAvailable: { $gt: 0 },
              status: { $in: ['available', 'low-stock'] }
            }).select('medicineName brandName quantityAvailable pricePerUnit');

            const isAvailable = inventoryItems.length > 0;
            const bestMatch = inventoryItems[0];

            return {
              requestedMedication: medication.name,
              isAvailable,
              availableAlternatives: inventoryItems.map(item => ({
                name: item.medicineName,
                brandName: item.brandName,
                currentStock: item.quantityAvailable,
                unitPrice: item.pricePerUnit
              })),
              estimatedPrice: bestMatch?.pricePerUnit || 0,
              stockLevel: bestMatch?.quantityAvailable || 0
            };

          } catch (error) {
            console.error(`Error checking availability for ${medication.name}:`, error.message);
            return {
              requestedMedication: medication.name,
              isAvailable: false,
              availableAlternatives: [],
              estimatedPrice: 0,
              stockLevel: 0
            };
          }
        })
      );

      return availabilityResults;

    } catch (error) {
      console.error('❌ Error checking medication availability:', error.message);
      throw error;
    }
  }

  /**
   * Submit prescription request to matching pharmacies
   * @param {string} prescriptionRequestId - Prescription request ID
   * @returns {Object} Submission results
   */
  async submitToPharmacies(prescriptionRequestId) {
    try {
      const prescriptionRequest = await PrescriptionRequest.findById(prescriptionRequestId)
        .populate('patient', 'profile contact');

      if (!prescriptionRequest) {
        throw new Error('Prescription request not found');
      }

      if (prescriptionRequest.status === 'submitted') {
        // Request already submitted, return current state gracefully
        console.log(`ℹ️ Prescription request ${requestId} is already submitted`);
        
        // Get current pharmacies
        const targetPharmacyIds = prescriptionRequest.targetPharmacies?.map(tp => tp.pharmacyId) || [];
        const pharmacies = await Pharmacy.find({
          _id: { $in: targetPharmacyIds },
          isActive: true
        });

        return {
          prescriptionRequest,
          notificationResults: [],
          successCount: pharmacies.length,
          failureCount: 0,
          message: 'Prescription request was already submitted',
          alreadySubmitted: true
        };
      }

      if (prescriptionRequest.status !== 'draft') {
        throw new Error('Prescription request has already been submitted');
      }

      // Get pharmacy details for matching pharmacies
      const pharmacies = await Pharmacy.find({
        _id: { $in: prescriptionRequest.matchingPharmacies }
      }).populate('owner', 'profile');

      // Update status to submitted
      prescriptionRequest.status = 'submitted';
      prescriptionRequest.submittedAt = new Date();
      await prescriptionRequest.save();

      // Create notifications for each pharmacy
      const notificationResults = [];
      let successCount = 0;
      let failureCount = 0;

      for (const pharmacy of pharmacies) {
        try {
          // Create notification for pharmacy owner
          const notification = await Notification.create({
            user: pharmacy.owner._id,
            type: 'pharmacy',
            title: 'New Prescription Request',
            message: `New prescription request from ${prescriptionRequest.patient.profile?.firstName || 'Patient'} requires your review`,
            data: {
              prescriptionRequestId: prescriptionRequest._id,
              patientName: `${prescriptionRequest.patient.profile?.firstName || ''} ${prescriptionRequest.patient.profile?.lastName || ''}`.trim(),
              medicationCount: prescriptionRequest.medications.length,
              urgency: prescriptionRequest.preferences?.urgency || 'routine'
            },
            priority: prescriptionRequest.preferences?.urgency === 'emergency' ? 'urgent' : 'normal',
            relatedRequest: prescriptionRequest._id,
            relatedPharmacy: pharmacy._id
          });

          notificationResults.push({
            pharmacyId: pharmacy._id,
            pharmacyName: pharmacy.name,
            notificationId: notification._id,
            status: 'sent'
          });

          successCount++;
          console.log(`✅ Notification sent to ${pharmacy.name}`);

        } catch (notifError) {
          console.error(`❌ Failed to notify ${pharmacy.name}:`, notifError.message);

          notificationResults.push({
            pharmacyId: pharmacy._id,
            pharmacyName: pharmacy.name,
            status: 'failed',
            error: notifError.message
          });

          failureCount++;
        }
      }

      console.log(`📊 Submission complete: ${successCount} success, ${failureCount} failed`);

      return {
        prescriptionRequest,
        notificationResults,
        successCount,
        failureCount,
        totalPharmacies: pharmacies.length
      };

    } catch (error) {
      console.error('❌ Failed to submit prescription request to pharmacies:', error.message);
      throw error;
    }
  }

  /**
   * Extract medications from processed prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Array} Array of medication objects
   */
  extractMedicationsFromPrescription(prescriptionData) {
    console.log(`\n💊 Extracting medications from prescription data:`);
    console.log(`   📋 Prescription ID: ${prescriptionData._id}`);
    console.log(`   🔍 Available fields:`, Object.keys(prescriptionData));

    const medications = [];

    if (prescriptionData.medications && Array.isArray(prescriptionData.medications)) {
      console.log(`   📦 Found medications array with ${prescriptionData.medications.length} items`);

      prescriptionData.medications.forEach((med, index) => {
        console.log(`\n   ${index + 1}. Processing medication:`, {
          name: med.name,
          genericName: med.genericName,
          brandName: med.brandName,
          dosage: med.dosage,
          strength: med.strength,
          quantity: med.quantity
        });

        const extractedName = med.name || med.genericName || med.brandName;
        console.log(`      🎯 Extracted name: "${extractedName}"`);

        medications.push({
          name: extractedName,
          quantity: this.parseQuantity(med.quantity?.prescribed || med.quantity) || 30, // Default to 30
          dosage: med.dosage || med.strength || '1 tablet',
          unit: med.quantity?.unit || 'tablets',
          prescribed: this.parseQuantity(med.quantity?.prescribed || med.quantity),
          instructions: med.instructions,
          form: med.form,
          frequency: med.frequency,
          duration: med.duration
        });
      });
    } else {
      console.log(`   ⚠️ No medications array found or it's not an array`);
    }

    // Fallback: extract from legacy fields
    if (medications.length === 0 && prescriptionData.medicine) {
      console.log(`   🔄 Using fallback: legacy medicine field "${prescriptionData.medicine}"`);
      medications.push({
        name: prescriptionData.medicine,
        quantity: 30, // Default quantity
        dosage: prescriptionData.dosage || '1 tablet',
        unit: 'tablets',
        prescribed: 30,
        instructions: 'As prescribed'
      });
    }

    console.log(`\n   ✅ Final extracted medications (${medications.length}):`);
    medications.forEach((med, index) => {
      console.log(`     ${index + 1}. "${med.name}" (${med.dosage || 'no dosage'}, ${med.quantity || 0} ${med.unit || 'units'})`);
    });

    if (medications.length === 0) {
      console.log(`   ❌ No medications could be extracted from prescription data!`);
    }

    return medications;
  }

  /**
   * Determine urgency level based on prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {string} Urgency level
   */
  determineUrgency(prescriptionData) {
    // Check for emergency indicators
    const emergencyKeywords = ['emergency', 'urgent', 'stat', 'asap', 'immediate'];
    const riskLevel = prescriptionData.aiProcessing?.riskAssessment?.riskLevel;

    if (riskLevel === 'critical' || riskLevel === 'high') {
      return 'emergency';
    }

    // Check extracted text for urgency indicators
    const rawText = prescriptionData.ocrData?.rawText || '';
    if (emergencyKeywords.some(keyword => rawText.toLowerCase().includes(keyword))) {
      return 'urgent';
    }

    return 'routine';
  }

  /**
   * Parse quantity from various formats
   * @param {string|number} quantity - Quantity string or number
   * @returns {number} Parsed quantity
   */
  parseQuantity(quantity) {
    if (typeof quantity === 'number') {
      return quantity;
    }

    if (typeof quantity === 'string') {
      const match = quantity.match(/(\d+)/);
      return match ? parseInt(match[1]) : 30; // Default to 30
    }

    return 30; // Default quantity
  }

  /**
   * Notify pharmacies of a new prescription request
   * @param {Object} prescriptionRequest - The prescription request
   * @param {Array} pharmacies - Array of pharmacy objects
   */
  async notifyPharmaciesOfNewRequest(prescriptionRequest, pharmacies) {
    try {
      console.log(`📢 Notifying ${pharmacies.length} pharmacies of new prescription request`);

      const notificationPromises = pharmacies.map(async (pharmacy) => {
        try {
          // Create a notification record using the new notification structure
          const notification = new Notification({
            type: 'prescription_request',
            category: 'medical',
            priority: 'medium',
            recipients: [{
              userId: pharmacy.owner || pharmacy._id,
              userRole: 'pharmacy',
              deliveryChannels: ['websocket', 'email']
            }],
            content: {
              title: 'New Prescription Request',
              message: `New prescription request with ${prescriptionRequest.medications.length} medications`,
              actionUrl: `/pharmacy/prescriptions/${prescriptionRequest._id}`,
              actionText: 'Review Request',
              metadata: {
                prescriptionRequestId: prescriptionRequest._id,
                medicationCount: prescriptionRequest.medications.length,
                patientLocation: prescriptionRequest.metadata?.geoLocation,
                urgency: 'normal'
              }
            },
            relatedEntities: [{
              entityType: 'prescription',
              entityId: prescriptionRequest._id
            }]
          });

          await notification.save();
          
          console.log(`✅ Notified pharmacy: ${pharmacy.name}`);
          return { pharmacyId: pharmacy._id, status: 'sent' };

        } catch (error) {
          console.error(`❌ Failed to notify pharmacy ${pharmacy.name}:`, error.message);
          return { pharmacyId: pharmacy._id, status: 'failed', error: error.message };
        }
      });

      const results = await Promise.all(notificationPromises);
      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.filter(r => r.status === 'failed').length;

      console.log(`📊 Notification results: ${successCount} sent, ${failureCount} failed`);
      
      return {
        successCount,
        failureCount,
        results
      };

    } catch (error) {
      console.error('❌ Failed to notify pharmacies:', error.message);
      throw error;
    }
  }

  /**
   * Extract doctor information from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Object} Doctor information
   */
  extractDoctorInfo(prescriptionData) {
    // Try multiple paths for doctor info
    let doctorInfo = {};
    
    if (prescriptionData.aiProcessing?.extractedStructuredData?.prescriberInfo) {
      const prescriber = prescriptionData.aiProcessing.extractedStructuredData.prescriberInfo;
      doctorInfo = {
        name: prescriber.name || '',
        title: prescriber.title || '',
        qualifications: prescriber.qualifications || (prescriber.title ? [prescriber.title] : []),
        registrationNumber: prescriber.registrationNumber || prescriber.license || '',
        license: prescriber.license || prescriber.registrationNumber || '',
        contact: prescriber.contact || '',
        email: prescriber.email || '',
        hospital: prescriber.hospital || '',
        address: prescriber.address || '',
        signature: prescriber.signature || false,
        signatureImage: prescriber.signatureImage || ''
      };
    } else if (prescriptionData.aiProcessing?.geminiResults?.analysis?.prescriberInfo) {
      const prescriber = prescriptionData.aiProcessing.geminiResults.analysis.prescriberInfo;
      doctorInfo = {
        name: prescriber.name || '',
        title: prescriber.title || '',
        qualifications: prescriber.qualifications || (prescriber.title ? [prescriber.title] : []),
        registrationNumber: prescriber.registrationNumber || prescriber.license || '',
        license: prescriber.license || prescriber.registrationNumber || '',
        contact: prescriber.contact || '',
        email: prescriber.email || '',
        hospital: prescriber.hospital || '',
        address: prescriber.address || '',
        signature: prescriber.signature || false,
        signatureImage: prescriber.signatureImage || ''
      };
    } else if (prescriptionData.doctor) {
      doctorInfo = {
        name: prescriptionData.doctor.name || '',
        title: prescriptionData.doctor.title || '',
        qualifications: prescriptionData.doctor.qualifications || (prescriptionData.doctor.title ? [prescriptionData.doctor.title] : []),
        registrationNumber: prescriptionData.doctor.registrationNumber || prescriptionData.doctor.license || '',
        license: prescriptionData.doctor.license || prescriptionData.doctor.registrationNumber || '',
        contact: prescriptionData.doctor.contact || '',
        email: prescriptionData.doctor.email || '',
        hospital: prescriptionData.doctor.hospital || '',
        address: prescriptionData.doctor.address || '',
        signature: prescriptionData.doctor.signature || false,
        signatureImage: prescriptionData.doctor.signatureImage || ''
      };
    }
    
    return doctorInfo;
  }

  /**
   * Extract patient information from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Object} Patient information
   */
  extractPatientInfo(prescriptionData) {
    let patientInfo = {};
    
    if (prescriptionData.aiProcessing?.extractedStructuredData?.patientInfo) {
      const patient = prescriptionData.aiProcessing.extractedStructuredData.patientInfo;
      patientInfo = {
        name: patient.name || '',
        age: patient.age || '',
        gender: patient.gender || '',
        weight: patient.weight || '',
        height: patient.height || '',
        allergies: patient.allergies || [],
        medicalHistory: patient.medicalHistory || [],
        currentConditions: patient.currentConditions || [],
        emergencyContact: patient.emergencyContact || '',
        insuranceInfo: patient.insuranceInfo || ''
      };
    } else if (prescriptionData.aiProcessing?.geminiResults?.analysis?.patientInfo) {
      const patient = prescriptionData.aiProcessing.geminiResults.analysis.patientInfo;
      patientInfo = {
        name: patient.name || '',
        age: patient.age || '',
        gender: patient.gender || '',
        weight: patient.weight || '',
        height: patient.height || '',
        allergies: patient.allergies || [],
        medicalHistory: patient.medicalHistory || [],
        currentConditions: patient.currentConditions || [],
        emergencyContact: patient.emergencyContact || '',
        insuranceInfo: patient.insuranceInfo || ''
      };
    } else if (prescriptionData.patientInfo) {
      patientInfo = {
        name: prescriptionData.patientInfo.name || '',
        age: prescriptionData.patientInfo.age || '',
        gender: prescriptionData.patientInfo.gender || '',
        weight: prescriptionData.patientInfo.weight || '',
        height: prescriptionData.patientInfo.height || '',
        allergies: prescriptionData.patientInfo.allergies || [],
        medicalHistory: prescriptionData.patientInfo.medicalHistory || [],
        currentConditions: prescriptionData.patientInfo.currentConditions || [],
        emergencyContact: prescriptionData.patientInfo.emergencyContact || '',
        insuranceInfo: prescriptionData.patientInfo.insuranceInfo || ''
      };
    }
    
    return patientInfo;
  }

  /**
   * Extract detailed medications from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Array} Detailed medications array
   */
  extractDetailedMedications(prescriptionData) {
    let medications = [];
    
    // Try multiple paths for medications
    if (prescriptionData.aiProcessing?.extractedStructuredData?.medications) {
      medications = prescriptionData.aiProcessing.extractedStructuredData.medications;
    } else if (prescriptionData.aiProcessing?.geminiResults?.analysis?.medications) {
      medications = prescriptionData.aiProcessing.geminiResults.analysis.medications;
    } else if (prescriptionData.medications) {
      medications = prescriptionData.medications;
    }
    
    return medications.map(med => ({
      name: med.name || med.medication || '',
      genericName: med.genericName || med.generic || '',
      brandName: med.brandName || med.brand || '',
      dosage: med.dosage || med.dose || '',
      strength: med.strength || '',
      frequency: med.frequency || '',
      route: med.route || 'Oral',
      duration: med.duration || '',
      instructions: med.instructions || med.direction || '',
      indication: med.indication || '',
      confidence: med.confidence || 0,
      alternatives: med.alternatives || [],
      contraindications: med.contraindications || []
    }));
  }

  /**
   * Extract AI processing results from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Object} AI processing results
   */
  extractAIProcessingResults(prescriptionData) {
    let aiProcessing = {
      medicationsFound: 0,
      validMedications: 0,
      unknownMedications: 0,
      hasInteractions: false,
      hasAnomalies: false,
      overallConfidence: 0,
      qualityLevel: 'unknown',
      geminiResults: {},
      geminiRawResponse: {},
      processingMethod: 'gemini_2.5_flash_enhanced',
      processingSteps: [],
      enhancementApplied: false,
      qualityMetrics: {
        clarity: 0,
        completeness: 0,
        legibility: 0,
        overallQuality: 0,
        ambiguousFields: [],
        missingFields: [],
        warningFlags: []
      }
    };
    
    if (prescriptionData.aiProcessing) {
      aiProcessing = {
        medicationsFound: prescriptionData.aiProcessing.medicationsFound || 0,
        validMedications: prescriptionData.aiProcessing.validMedications || 0,
        unknownMedications: prescriptionData.aiProcessing.unknownMedications || 0,
        hasInteractions: prescriptionData.aiProcessing.hasInteractions || false,
        hasAnomalies: prescriptionData.aiProcessing.hasAnomalies || false,
        overallConfidence: prescriptionData.aiProcessing.overallConfidence || 0,
        qualityLevel: prescriptionData.aiProcessing.qualityLevel || 'unknown',
        geminiResults: prescriptionData.aiProcessing.geminiResults || {},
        geminiRawResponse: prescriptionData.aiProcessing.geminiRawResponse || {},
        processingMethod: prescriptionData.aiProcessing.processingMethod || 'gemini_2.5_flash_enhanced',
        processingSteps: prescriptionData.aiProcessing.processingSteps || [],
        enhancementApplied: prescriptionData.aiProcessing.enhancementApplied || false,
        qualityMetrics: {
          clarity: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.clarity || 0,
          completeness: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.completeness || 0,
          legibility: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.legibility || 0,
          overallQuality: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.overallQuality || 0,
          ambiguousFields: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.ambiguousFields || [],
          missingFields: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.missingFields || [],
          warningFlags: prescriptionData.aiProcessing.extractedStructuredData?.qualityMetrics?.warningFlags || []
        }
      };
    }
    
    return aiProcessing;
  }

  /**
   * Extract drug interactions from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Array} Drug interactions array
   */
  extractDrugInteractions(prescriptionData) {
    let interactions = [];
    
    if (prescriptionData.aiProcessing?.drugInteractions) {
      interactions = prescriptionData.aiProcessing.drugInteractions;
    } else if (prescriptionData.drugInteractions) {
      interactions = prescriptionData.drugInteractions;
    }
    
    return interactions.map(interaction => ({
      medications: interaction.medications || [],
      severity: interaction.severity || 'unknown',
      interactionType: interaction.interactionType || interaction.type || 'unknown',
      clinicalEffect: interaction.clinicalEffect || '',
      mechanism: interaction.mechanism || '',
      management: interaction.management || '',
      monitoring: interaction.monitoring || '',
      confidence: interaction.confidence || 0
    }));
  }

  /**
   * Extract enhanced dosage validations from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Array} Dosage validations array
   */
  extractDosageValidations(prescriptionData) {
    let validations = [];
    
    if (prescriptionData.aiProcessing?.dosageValidations) {
      validations = prescriptionData.aiProcessing.dosageValidations;
    } else if (prescriptionData.dosageValidations) {
      validations = prescriptionData.dosageValidations;
    }
    
    return validations.map(validation => ({
      medication: validation.medication || '',
      prescribedDose: validation.prescribedDose || validation.dosage || '',
      standardDose: validation.standardDose || '',
      isAppropriate: validation.isAppropriate || false,
      ageAppropriate: validation.ageAppropriate !== undefined ? validation.ageAppropriate : true,
      weightAppropriate: validation.weightAppropriate !== undefined ? validation.weightAppropriate : true,
      indicationAppropriate: validation.indicationAppropriate !== undefined ? validation.indicationAppropriate : true,
      warnings: validation.warnings || [],
      adjustmentNeeded: validation.adjustmentNeeded || false,
      adjustmentReason: validation.adjustmentReason || '',
      confidence: validation.confidence || 0
    }));
  }

  /**
   * Extract risk assessment from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Object} Risk assessment
   */
  extractRiskAssessment(prescriptionData) {
    let riskAssessment = {
      overallRiskLevel: 'moderate',
      summary: '',
      patientSafetyRisks: [],
      prescriptionQualityRisks: [],
      clinicalRisks: [],
      regulatoryLegalRisks: [],
      riskStratification: 'moderate',
      recommendations: {
        immediateSafetyInterventions: [],
        enhancedMonitoringProtocols: [],
        patientCounselingPriorities: [],
        prescriberConsultationsNeeded: [],
        alternativeTherapeuticOptions: []
      }
    };
    
    if (prescriptionData.aiProcessing?.riskAssessment) {
      const risk = prescriptionData.aiProcessing.riskAssessment;
      riskAssessment = {
        overallRiskLevel: risk.overallRiskLevel || risk.riskLevel || 'moderate',
        summary: risk.summary || '',
        patientSafetyRisks: this.extractRiskArray(risk.patientSafetyRisks),
        prescriptionQualityRisks: this.extractRiskArray(risk.prescriptionQualityRisks),
        clinicalRisks: this.extractRiskArray(risk.clinicalRisks),
        regulatoryLegalRisks: this.extractRiskArray(risk.regulatoryLegalRisks),
        riskStratification: risk.riskStratification || risk.overallRiskLevel || 'moderate',
        recommendations: {
          immediateSafetyInterventions: Array.isArray(risk.recommendations?.immediateSafetyInterventions) ? risk.recommendations.immediateSafetyInterventions : [],
          enhancedMonitoringProtocols: Array.isArray(risk.recommendations?.enhancedMonitoringProtocols) ? risk.recommendations.enhancedMonitoringProtocols : [],
          patientCounselingPriorities: Array.isArray(risk.recommendations?.patientCounselingPriorities) ? risk.recommendations.patientCounselingPriorities : [],
          prescriberConsultationsNeeded: Array.isArray(risk.recommendations?.prescriberConsultationsNeeded) ? risk.recommendations.prescriberConsultationsNeeded : [],
          alternativeTherapeuticOptions: Array.isArray(risk.recommendations?.alternativeTherapeuticOptions) ? risk.recommendations.alternativeTherapeuticOptions : []
        }
      };
    }
    
    return riskAssessment;
  }

  /**
   * Extract OCR data from prescription data
   * @param {Object} prescriptionData - Processed prescription data
   * @returns {Object} OCR data
   */
  extractOCRData(prescriptionData) {
    let ocrData = {
      engine: '',
      confidence: 0,
      rawText: '',
      enhancedText: '',
      textLength: 0,
      wordsFound: 0,
      linesFound: 0,
      processingTime: 0
    };
    
    if (prescriptionData.ocrData) {
      ocrData = {
        engine: prescriptionData.ocrData.engine || '',
        confidence: prescriptionData.ocrData.confidence || 0,
        rawText: prescriptionData.ocrData.rawText || '',
        enhancedText: prescriptionData.ocrData.enhancedText || '',
        textLength: prescriptionData.ocrData.textLength || 0,
        wordsFound: prescriptionData.ocrData.wordsFound || 0,
        linesFound: prescriptionData.ocrData.linesFound || 0,
        processingTime: prescriptionData.ocrData.processingTime || 0
      };
    }
    
    return ocrData;
  }

  /**
   * Extract risk array from various formats
   * @param {any} risks - Risks in various formats
   * @returns {Array<Object>} - Array of risk objects
   */
  extractRiskArray(risks) {
    if (!risks || !Array.isArray(risks)) {
      return [];
    }

    return risks.map(risk => {
      if (typeof risk === 'string') {
        return {
          risk: risk,
          severity: 'moderate',
          details: '',
          mitigation: ''
        };
      }
      
      if (risk && typeof risk === 'object') {
        return {
          risk: risk.risk || risk.title || risk.category || 'Unknown Risk',
          severity: risk.severity || 'moderate',
          details: risk.details || risk.description || risk.explanation || '',
          mitigation: risk.mitigation || risk.recommendation || risk.action || ''
        };
      }
      
      return {
        risk: String(risk),
        severity: 'moderate',
        details: '',
        mitigation: ''
      };
    });
  }
}

export default PrescriptionRequestMatchingService;
