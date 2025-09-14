// Single product upload

import mongoose from "mongoose";
import Medicine from "../../models/Medicine.js";
import Pharmacy from "../../models/Pharmacy.js";
import User from "../../models/User.js";
// import { fileUploadService } from "./fileUploadController.js";
import ApiError from "../../utils/AppError.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

// Helper function to normalize dosage forms
const normalizeDosageForm = (dosageForm) => {
  if (!dosageForm) return 'tablet';
  
  const normalized = dosageForm.toLowerCase().trim();
  
  // Mapping for common variations
  const dosageFormMap = {
    'chewable tablet': 'chewable tablet',
    'chewable tablets': 'chewable tablet',
    'effervescent tablet': 'effervescent tablet',
    'effervescent tablets': 'effervescent tablet',
    'dispersible tablet': 'dispersible tablet',
    'dispersible tablets': 'dispersible tablet',
    'extended release tablet': 'extended release tablet',
    'extended release tablets': 'extended release tablet',
    'film coated tablet': 'film coated tablet',
    'film coated tablets': 'film coated tablet',
    'tablets': 'tablet',
    'capsules': 'capsule',
    'syrups': 'syrup',
    'injections': 'injection',
    'creams': 'cream',
    'ointments': 'ointment',
    'gels': 'gel',
    'patches': 'patch',
    'inhalers': 'inhaler',
    'suppositories': 'suppository',
    'powders': 'powder',
    'solutions': 'solution',
    'suspensions': 'suspension',
    'lotions': 'lotion',
    'sprays': 'spray'
  };
  
  return dosageFormMap[normalized] || normalized;
};

// Helper function to check if user is authorized for pharmacy operations
const isUserAuthorizedForPharmacy = async (pharmacyId, userId) => {
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return { authorized: false, pharmacy: null, error: "Pharmacy not found" };
  }

  // Check if user is the owner
  if (pharmacy.owner.toString() === userId.toString()) {
    return { authorized: true, pharmacy, error: null };
  }

  // Check if user is associated with the pharmacy
  const user = await User.findById(userId);
  if (user && user.pharmacy && user.pharmacy.toString() === pharmacyId.toString()) {
    return { authorized: true, pharmacy, error: null };
  }

  return { authorized: false, pharmacy, error: "Unauthorized to access this pharmacy's inventory" };
};

export const uploadSingleProduct = async (req, res, next) => {
  try {
    const { pharmacyId } = req.body;
    const userId = req.user._id || req.user.id;
    // Validate required fields
    const requiredFields = ["medicineName", "batchNumber", "dosageForm", "quantityAvailable", "pricePerUnit", "expiryDate"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }
    // Check pharmacy and authorization
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
      return res.status(statusCode).json({ success: false, message: authCheck.error });
    }
    const pharmacy = authCheck.pharmacy;
    
    const quantity = parseFloat(req.body.quantityAvailable);
    const status = quantity === 0 ? "out-of-stock" : quantity <= 10 ? "low-stock" : "available";
    
    // Find existing medicine by name, brand, or generic name
    let medicine = await Medicine.findOne({
      $or: [
        { name: new RegExp(req.body.medicineName, 'i') },
        { brandName: new RegExp(req.body.medicineName, 'i') },
        { genericName: new RegExp(req.body.medicineName, 'i') }
      ],
      status: 'active'
    });

    if (medicine) {
      // Add pharmacy inventory to existing medicine
      const inventoryData = {
        batchNumber: req.body.batchNumber.trim(),
        quantityAvailable: quantity,
        expiryDate: new Date(req.body.expiryDate),
        manufacturingDate: req.body.manufacturingDate ? new Date(req.body.manufacturingDate) : undefined,
        unitWeightOrVolume: req.body.unitWeightOrVolume ? parseFloat(req.body.unitWeightOrVolume) : undefined,
        unitMeasurement: req.body.unitMeasurement || 'mg',
        costPrice: req.body.costPrice ? parseFloat(req.body.costPrice) : undefined,
        sellingPrice: parseFloat(req.body.pricePerUnit),
        storageLocation: req.body.storageLocation || '',
        pharmacyNotes: req.body.pharmacyNotes || '',
        reorderLevel: req.body.reorderLevel || 10,
        maxStockLevel: req.body.maxStockLevel || 100
      };

      await medicine.addPharmacyInventory(pharmacyId, inventoryData);
    } else {
      // Create new medicine with pharmacy inventory
      medicine = new Medicine({
        // Set pharmacy association
        pharmacyId: pharmacyId,
        
        name: req.body.medicineName.trim(),
        brandName: req.body.brandName ? req.body.brandName.trim() : req.body.medicineName.trim(),
        genericName: req.body.genericName || req.body.medicineName.trim(),
        
        composition: [{
          activeIngredient: req.body.activeIngredient || req.body.medicineName.trim(),
          strength: {
            value: req.body.unitWeightOrVolume || 1,
            unit: req.body.unitMeasurement || 'mg'
          },
          role: 'active'
        }],
        
        dosageForm: {
          form: req.body.dosageForm.toLowerCase().trim(),
          route: req.body.route || 'oral',
          unitsPerPackage: 1
        },
        
        manufacturer: {
          name: req.body.manufacturer || 'Unknown',
          country: 'India',
          gmpCertified: false
        },
        
        regulatory: {
          approvalNumber: req.body.approvalNumber || `REG-${Date.now()}`,
          approvalDate: new Date(),
          approvedBy: 'CDSCO',
          scheduleClass: req.body.requiresPrescription ? 'Prescription' : 'OTC',
          isControlledSubstance: req.body.isControlledSubstance || false
        },
        
        pricing: {
          mrp: parseFloat(req.body.pricePerUnit),
          sellingPrice: parseFloat(req.body.pricePerUnit),
          currency: 'INR'
        },
        
        imageData: {
          primaryImage: {
            url: req.body.medicineImage || '/default-medicine.jpg',
            altText: `${req.body.medicineName} - ${req.body.dosageForm}`
          },
          aiRecognitionData: {
            aiConfidence: 0
          }
        },
        
        therapeutic: {
          therapeuticClass: req.body.therapeuticClass || 'General',
          indication: {
            primary: req.body.indications ? req.body.indications.split(',') : []
          }
        },
        
        pharmacyInventory: [{
          pharmacyId: pharmacyId,
          batchNumber: req.body.batchNumber.trim(),
          quantityAvailable: quantity,
          expiryDate: new Date(req.body.expiryDate),
          manufacturingDate: req.body.manufacturingDate ? new Date(req.body.manufacturingDate) : undefined,
          unitWeightOrVolume: req.body.unitWeightOrVolume ? parseFloat(req.body.unitWeightOrVolume) : undefined,
          unitMeasurement: req.body.unitMeasurement || 'mg',
          costPrice: req.body.costPrice ? parseFloat(req.body.costPrice) : undefined,
          sellingPrice: parseFloat(req.body.pricePerUnit),
          storageLocation: req.body.storageLocation || '',
          pharmacyNotes: req.body.pharmacyNotes || '',
          reorderLevel: req.body.reorderLevel || 10,
          maxStockLevel: req.body.maxStockLevel || 100,
          status: status
        }],
        
        status: 'active',
        verificationStatus: 'verified'
      });
      
      await medicine.save();
    }

    // Check for notifications
    const currentDate = new Date();
    const expiryDate = new Date(req.body.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

    // Trigger low stock notification if item is low stock or out of stock
    if (status === 'low-stock' && req.notify) {
      await req.notify.trigger('inventory.low_stock', {
        medicationId: medicine._id,
        medicationName: medicine.name,
        pharmacyId: pharmacyId,
        currentStock: quantity,
        batchNumber: req.body.batchNumber,
        alertedAt: new Date()
      });
    }

    // Trigger expiry notification if medication is expiring soon (within 30 days)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && req.notify) {
      await req.notify.trigger('inventory.expired', {
        medicationId: medicine._id,
        medicationName: medicine.name,
        pharmacyId: pharmacyId,
        batchNumber: req.body.batchNumber,
        expiryDate: expiryDate,
        daysUntilExpiry: daysUntilExpiry,
        alertedAt: new Date()
      });
    }

    res.status(201).json({ 
      success: true, 
      message: "Medicine inventory added successfully", 
      data: {
        medicineId: medicine._id,
        name: medicine.name,
        brandName: medicine.brandName,
        pharmacyInventory: medicine.getPharmacyInventory(pharmacyId)
      }
    });
  } catch (error) {
    next(error);
  }
};

// CSV upload for bulk inventory
export const uploadInventoryCsv = async (req, res, next) => {
  try {
    const { pharmacyId } = req.body;
    const userId = req.user._id || req.user.id;

    // Validate pharmacyId is provided
    if (!pharmacyId) {
      return res.status(400).json({ success: false, message: "Pharmacy ID is required for CSV upload" });
    }

    // Check pharmacy and authorization
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
      return res.status(statusCode).json({ success: false, message: authCheck.error });
    }
    const pharmacy = authCheck.pharmacy;
    // Parse CSV file
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No CSV file uploaded" });
    }

    const csvData = [];
    const successful = [];
    const failed = [];
    const stream = Readable.from(req.file.buffer);

    await new Promise((resolve, reject) => {
      let rowIndex = 0;
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          rowIndex++;
          try {
            validateCsvRow(row);
            csvData.push({ ...row, rowIndex });
          } catch (error) {
            failed.push({
              row: rowIndex,
              data: row,
              error: error.message
            });
          }
        })
        .on("end", resolve)
        .on("error", (error) => reject(new ApiError("Failed to parse CSV file", 400)));
    });

    // Process valid CSV data
    for (const rowData of csvData) {
      try {
        // Check if medicine already exists
        let medicine = await Medicine.findOne({
          $or: [
            { name: new RegExp(rowData.medicineName, 'i') },
            { brandName: new RegExp(rowData.medicineName, 'i') },
            { genericName: new RegExp(rowData.medicineName, 'i') }
          ],
          status: 'active'
        });

        if (medicine) {
          // Check if this pharmacy already has this batch
          const existingInventory = medicine.pharmacyInventory.find(
            inv => inv.pharmacyId.toString() === pharmacyId.toString() && 
                   inv.batchNumber === rowData.batchNumber.trim()
          );

          if (existingInventory) {
            // Update existing pharmacy inventory
            await medicine.updatePharmacyInventory(pharmacyId, rowData.batchNumber.trim(), {
              quantityAvailable: parseFloat(rowData.quantityAvailable),
              sellingPrice: parseFloat(rowData.pricePerUnit),
              expiryDate: new Date(rowData.expiryDate),
              storageLocation: rowData.storageLocation || '',
              pharmacyNotes: rowData.pharmacyNotes || ''
            });
            successful.push({
              medication: medicine,
              action: 'updated',
              name: medicine.name
            });
          } else {
            // Add new pharmacy inventory to existing medicine
            const inventoryData = {
              batchNumber: rowData.batchNumber.trim(),
              quantityAvailable: parseFloat(rowData.quantityAvailable),
              expiryDate: new Date(rowData.expiryDate),
              unitWeightOrVolume: rowData.unitWeightOrVolume ? parseFloat(rowData.unitWeightOrVolume) : undefined,
              unitMeasurement: rowData.unitMeasurement || 'mg',
              costPrice: rowData.costPrice ? parseFloat(rowData.costPrice) : undefined,
              sellingPrice: parseFloat(rowData.pricePerUnit),
              storageLocation: rowData.storageLocation || '',
              pharmacyNotes: rowData.pharmacyNotes || ''
            };
            await medicine.addPharmacyInventory(pharmacyId, inventoryData);
            successful.push({
              medication: medicine,
              action: 'created',
              name: medicine.name
            });
          }
        } else {
          // Create new medicine with pharmacy inventory
          medicine = new Medicine({
            // Set pharmacy association
            pharmacyId: pharmacyId,
            
            name: rowData.medicineName.trim(),
            brandName: rowData.brandName ? rowData.brandName.trim() : rowData.medicineName.trim(),
            genericName: rowData.genericName || rowData.medicineName.trim(),
            
            composition: [{
              activeIngredient: rowData.activeIngredient || rowData.medicineName.trim(),
              strength: {
                value: rowData.unitWeightOrVolume || 1,
                unit: rowData.unitMeasurement || 'mg'
              },
              role: 'active'
            }],
            
            dosageForm: {
              form: normalizeDosageForm(rowData.dosageForm),
              route: rowData.route || 'oral',
              unitsPerPackage: 1
            },
            
            manufacturer: {
              name: rowData.manufacturer || 'Unknown',
              country: 'India',
              gmpCertified: false
            },
            
            regulatory: {
              approvalNumber: `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              approvalDate: new Date(),
              approvedBy: 'CDSCO',
              scheduleClass: rowData.requiresPrescription ? 'Prescription' : 'OTC'
            },
            
            pricing: {
              mrp: parseFloat(rowData.pricePerUnit),
              sellingPrice: parseFloat(rowData.pricePerUnit),
              currency: 'INR'
            },
            
            imageData: {
              primaryImage: {
                url: rowData.medicineImage || '/default-medicine.jpg',
                altText: `${rowData.medicineName} - ${rowData.dosageForm}`
              },
              aiRecognitionData: { aiConfidence: 0 }
            },
            
            therapeutic: {
              therapeuticClass: rowData.therapeuticClass || 'General',
              indication: { primary: [] }
            },
            
            pharmacyInventory: [{
              pharmacyId: pharmacyId,
              batchNumber: rowData.batchNumber.trim(),
              quantityAvailable: parseFloat(rowData.quantityAvailable),
              expiryDate: new Date(rowData.expiryDate),
              unitWeightOrVolume: rowData.unitWeightOrVolume ? parseFloat(rowData.unitWeightOrVolume) : undefined,
              unitMeasurement: rowData.unitMeasurement || 'mg',
              costPrice: rowData.costPrice ? parseFloat(rowData.costPrice) : undefined,
              sellingPrice: parseFloat(rowData.pricePerUnit),
              storageLocation: rowData.storageLocation || '',
              pharmacyNotes: rowData.pharmacyNotes || '',
              status: parseFloat(rowData.quantityAvailable) === 0 ? "out-of-stock" :
                      parseFloat(rowData.quantityAvailable) <= 10 ? "low-stock" : "available"
            }],
            
            status: 'active',
            verificationStatus: 'verified'
          });
          
          await medicine.save();
          successful.push({
            medication: medicine,
            action: 'created',
            name: medicine.name
          });
        }
      } catch (error) {
        failed.push({
          row: rowData.rowIndex,
          data: rowData,
          error: error.message
        });
      }
    }

    const summary = {
      created: successful.filter(item => item.action === 'created').length,
      updated: successful.filter(item => item.action === 'updated').length,
      errors: failed.length
    };

    res.status(201).json({
      success: true,
      message: "CSV processing completed",
      data: {
        totalProcessed: csvData.length + failed.length,
        uploadedItems: successful.length,
        successful,
        failed,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};


// Helper function to validate CSV row data
const validateCsvRow = (row) => {
  const requiredFields = ["medicineName", "batchNumber", "dosageForm", "quantityAvailable", "pricePerUnit", "expiryDate"];

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === "") {
      throw new ApiError(`Missing required field: ${field}`, 400);
    }
  }

  // Validate numeric fields
  if (isNaN(parseFloat(row.quantityAvailable)) || parseFloat(row.quantityAvailable) < 0) {
    throw new ApiError("Invalid quantityAvailable: must be a non-negative number", 400);
  }
  if (isNaN(parseFloat(row.pricePerUnit)) || parseFloat(row.pricePerUnit) <= 0) {
    throw new ApiError("Invalid pricePerUnit: must be a positive number", 400);
  }

  // Validate expiry date
  if (isNaN(Date.parse(row.expiryDate))) {
    throw new ApiError("Invalid expiryDate: must be a valid date", 400);
  }

  // Validate dosage form - check if normalized form is valid
  const validDosageForms = [
    'tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment',
    'gel', 'patch', 'inhaler', 'suppository', 'powder', 'solution', 'suspension',
    'lotion', 'spray', 'granules', 'sachets', 'vial', 'ampoule', 'chewable tablet',
    'effervescent tablet', 'dispersible tablet', 'extended release tablet', 'film coated tablet'
  ];
  
  const normalizedDosageForm = normalizeDosageForm(row.dosageForm);
  if (!validDosageForms.includes(normalizedDosageForm)) {
    throw new ApiError(`Invalid dosageForm: '${row.dosageForm}' is not a valid dosage form`, 400);
  }

  // Validate optional numeric fields
  if (row.unitWeightOrVolume && (isNaN(parseFloat(row.unitWeightOrVolume)) || parseFloat(row.unitWeightOrVolume) <= 0)) {
    throw new ApiError("Invalid unitWeightOrVolume: must be a positive number", 400);
  }

  // Validate unitMeasurement
  if (row.unitMeasurement && !["mg", "ml"].includes(row.unitMeasurement)) {
    throw new ApiError("Invalid unitMeasurement: must be 'mg' or 'ml'", 400);
  }

  return true;
};

// Helper function to process CSV data
const processCsvData = async (csvData, pharmacyId) => {
  const inventoryItems = csvData.map(row => ({
    pharmacyId,
    medicineName: row.medicineName.trim(),
    brandName: row.brandName ? row.brandName.trim() : undefined,
    batchNumber: row.batchNumber.trim(),
    dosageForm: row.dosageForm.trim(),
    strength: row.strength ? row.strength.trim() : undefined,
    unitWeightOrVolume: row.unitWeightOrVolume ? parseFloat(row.unitWeightOrVolume) : undefined,
    unitMeasurement: row.unitMeasurement || undefined,
    quantityAvailable: parseFloat(row.quantityAvailable),
    pricePerUnit: parseFloat(row.pricePerUnit),
    expiryDate: new Date(row.expiryDate),
    manufacturer: row.manufacturer ? row.manufacturer.trim() : undefined,
    requiresPrescription: row.requiresPrescription ? row.requiresPrescription.toLowerCase() === "true" : true,
    medicineImage: row.medicineImage || undefined,
    status: parseFloat(row.quantityAvailable) === 0 ? "out-of-stock" :
      parseFloat(row.quantityAvailable) <= 10 ? "low-stock" : "available"
  }));

  return inventoryItems;
};

// Upload CSV file for bulk inventory import

// Add single inventory item
export const addInventoryItem = async (pharmacyId, userId, itemData) => {
  try {
    // Verify pharmacy and user authorization
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
      throw new ApiError(authCheck.error, statusCode);
    }
    const pharmacy = authCheck.pharmacy;

    // Validate item data
    const requiredFields = ["medicineName", "batchNumber", "dosageForm", "quantityAvailable", "pricePerUnit", "expiryDate"];
    for (const field of requiredFields) {
      if (!itemData[field]) {
        throw new ApiError(`Missing required field: ${field}`, 400);
      }
    }

    // Find existing medicine
    let medicine = await Medicine.findOne({
      $or: [
        { name: new RegExp(itemData.medicineName, 'i') },
        { brandName: new RegExp(itemData.medicineName, 'i') },
        { genericName: new RegExp(itemData.medicineName, 'i') }
      ],
      status: 'active'
    });

    if (medicine) {
      // Add pharmacy inventory to existing medicine
      const inventoryData = {
        batchNumber: itemData.batchNumber.trim(),
        quantityAvailable: parseFloat(itemData.quantityAvailable),
        expiryDate: new Date(itemData.expiryDate),
        unitWeightOrVolume: itemData.unitWeightOrVolume ? parseFloat(itemData.unitWeightOrVolume) : undefined,
        unitMeasurement: itemData.unitMeasurement || 'mg',
        costPrice: itemData.costPrice ? parseFloat(itemData.costPrice) : undefined,
        sellingPrice: parseFloat(itemData.pricePerUnit),
        storageLocation: itemData.storageLocation || '',
        pharmacyNotes: itemData.pharmacyNotes || '',
        reorderLevel: itemData.reorderLevel || 10,
        maxStockLevel: itemData.maxStockLevel || 100
      };

      await medicine.addPharmacyInventory(pharmacyId, inventoryData);
    } else {
      // Create new medicine with pharmacy inventory
      medicine = new Medicine({
        // Set pharmacy association
        pharmacyId: pharmacyId,
        
        name: itemData.medicineName.trim(),
        brandName: itemData.brandName ? itemData.brandName.trim() : itemData.medicineName.trim(),
        genericName: itemData.genericName || itemData.medicineName.trim(),
        
        composition: [{
          activeIngredient: itemData.activeIngredient || itemData.medicineName.trim(),
          strength: {
            value: itemData.unitWeightOrVolume || 1,
            unit: itemData.unitMeasurement || 'mg'
          },
          role: 'active'
        }],
        
        dosageForm: {
          form: itemData.dosageForm.toLowerCase().trim(),
          route: itemData.route || 'oral',
          unitsPerPackage: 1
        },
        
        manufacturer: {
          name: itemData.manufacturer || 'Unknown',
          country: 'India',
          gmpCertified: false
        },
        
        regulatory: {
          approvalNumber: `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          approvalDate: new Date(),
          approvedBy: 'CDSCO',
          scheduleClass: itemData.requiresPrescription ? 'Prescription' : 'OTC'
        },
        
        pricing: {
          mrp: parseFloat(itemData.pricePerUnit),
          sellingPrice: parseFloat(itemData.pricePerUnit),
          currency: 'INR'
        },
        
        imageData: {
          primaryImage: {
            url: itemData.medicineImage || '/default-medicine.jpg',
            altText: `${itemData.medicineName} - ${itemData.dosageForm}`
          },
          aiRecognitionData: { aiConfidence: 0 }
        },
        
        therapeutic: {
          therapeuticClass: itemData.therapeuticClass || 'General',
          indication: { primary: [] }
        },
        
        pharmacyInventory: [{
          pharmacyId: pharmacyId,
          batchNumber: itemData.batchNumber.trim(),
          quantityAvailable: parseFloat(itemData.quantityAvailable),
          expiryDate: new Date(itemData.expiryDate),
          unitWeightOrVolume: itemData.unitWeightOrVolume ? parseFloat(itemData.unitWeightOrVolume) : undefined,
          unitMeasurement: itemData.unitMeasurement || 'mg',
          costPrice: itemData.costPrice ? parseFloat(itemData.costPrice) : undefined,
          sellingPrice: parseFloat(itemData.pricePerUnit),
          storageLocation: itemData.storageLocation || '',
          pharmacyNotes: itemData.pharmacyNotes || '',
          reorderLevel: itemData.reorderLevel || 10,
          maxStockLevel: itemData.maxStockLevel || 100
        }],
        
        status: 'active',
        verificationStatus: 'pending'
      });
      
      await medicine.save();
    }

    return {
      success: true,
      message: "Medicine inventory added successfully",
      data: {
        medicineId: medicine._id,
        name: medicine.name,
        brandName: medicine.brandName,
        pharmacyInventory: medicine.getPharmacyInventory(pharmacyId)
      }
    };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("Failed to add inventory item", 500);
  }
};

// Update inventory item
export const updateInventoryItem = async (itemId, userId, updateData) => {
  try {
    // Find medicine by itemId (which should be medicine._id) 
    const medicine = await Medicine.findById(itemId);
    if (!medicine) {
      throw new ApiError("Medicine not found", 404);
    }

    // Extract pharmacy and batch info from updateData
    const { pharmacyId, batchNumber, ...inventoryUpdates } = updateData;
    
    if (!pharmacyId || !batchNumber) {
      throw new ApiError("Pharmacy ID and batch number are required for inventory updates", 400);
    }

    // Check authorization
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      throw new ApiError("Unauthorized to update this inventory item", 403);
    }

    const allowedUpdates = [
      "quantityAvailable",
      "sellingPrice",
      "costPrice",
      "expiryDate",
      "storageLocation",
      "pharmacyNotes",
      "reorderLevel",
      "maxStockLevel"
    ];

    const sanitizedUpdates = Object.keys(inventoryUpdates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = inventoryUpdates[key];
        return obj;
      }, {});

    // Update the pharmacy inventory
    await medicine.updatePharmacyInventory(pharmacyId, batchNumber, sanitizedUpdates);
    
    // Get updated inventory for response
    const updatedInventory = medicine.getPharmacyInventory(pharmacyId);
    const updatedItem = updatedInventory.find(inv => inv.batchNumber === batchNumber);

    return {
      success: true,
      message: "Inventory item updated successfully",
      data: {
        medicineId: medicine._id,
        name: medicine.name,
        brandName: medicine.brandName,
        updatedInventory: updatedItem
      }
    };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("Failed to update inventory item", 500);
  }
};

// Get pharmacy inventory
export const getPharmacyInventory = async (pharmacyId, userId, searchOptions = {}, paginationOptions = {}) => {
  try {
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
      throw new ApiError(authCheck.error, statusCode);
    }
    const pharmacy = authCheck.pharmacy;

    const {
      medicineName,
      status,
      minQuantity,
      maxPrice,
      requiresPrescription
    } = searchOptions;

    const {
      page = 1,
      limit = 10,
      sort = "lastUpdated",
      order = "desc"
    } = paginationOptions;

    // Build aggregation pipeline to get pharmacy inventory from Medicine model
    const matchStage = {
      "pharmacyInventory.pharmacyId": new mongoose.Types.ObjectId(pharmacyId),
      status: 'active'
    };

    if (medicineName) {
      matchStage.$or = [
        { name: { $regex: medicineName, $options: 'i' } },
        { brandName: { $regex: medicineName, $options: 'i' } },
        { genericName: { $regex: medicineName, $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$pharmacyInventory" },
      { $match: { "pharmacyInventory.pharmacyId": new mongoose.Types.ObjectId(pharmacyId) } }
    ];

    // Add additional filters for pharmacy inventory
    const inventoryFilters = {};
    if (status) {
      inventoryFilters["pharmacyInventory.status"] = status;
    }
    if (minQuantity) {
      inventoryFilters["pharmacyInventory.quantityAvailable"] = { $gte: parseFloat(minQuantity) };
    }
    if (maxPrice) {
      inventoryFilters["pharmacyInventory.sellingPrice"] = { $lte: parseFloat(maxPrice) };
    }
    if (requiresPrescription !== undefined) {
      inventoryFilters["regulatory.scheduleClass"] = requiresPrescription === 'true' ? 'Prescription' : 'OTC';
    }

    if (Object.keys(inventoryFilters).length > 0) {
      pipeline.push({ $match: inventoryFilters });
    }

    // Add projection to shape the output
    pipeline.push({
      $project: {
        _id: "$_id",
        medicineName: "$name",
        brandName: "$brandName",
        genericName: "$genericName",
        dosageForm: "$dosageForm.form",
        strength: "$composition.strength",
        manufacturer: "$manufacturer.name",
        batchNumber: "$pharmacyInventory.batchNumber",
        quantityAvailable: "$pharmacyInventory.quantityAvailable",
        expiryDate: "$pharmacyInventory.expiryDate",
        manufacturingDate: "$pharmacyInventory.manufacturingDate",
        pricePerUnit: "$pharmacyInventory.sellingPrice",
        costPrice: "$pharmacyInventory.costPrice",
        status: "$pharmacyInventory.status",
        storageLocation: "$pharmacyInventory.storageLocation",
        reorderLevel: "$pharmacyInventory.reorderLevel",
        maxStockLevel: "$pharmacyInventory.maxStockLevel",
        requiresPrescription: {
          $cond: { if: { $eq: ["$regulatory.scheduleClass", "Prescription"] }, then: true, else: false }
        },
        lastUpdated: "$pharmacyInventory.lastUpdated"
      }
    });

    // Add sorting
    const sortOptions = {};
    sortOptions[sort] = order === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortOptions });

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    
    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });

    const [results, countResult] = await Promise.all([
      Medicine.aggregate(pipeline),
      Medicine.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      success: true,
      message: "Inventory retrieved successfully",
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        totalStockValue: results.reduce((acc, item) => acc + (item.quantityAvailable * item.pricePerUnit), 0),
        lowStockItems: results.filter(item => item.status === "low-stock").length,
        outOfStockItems: results.filter(item => item.status === "out-of-stock").length
      }
    };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("Failed to retrieve inventory", 500);
  }
};

// Delete inventory item
export const deleteInventoryItem = async (itemId, userId) => {
  try {
    // Find the medicine that contains this inventory item
    const medicine = await Medicine.findOne({
      "pharmacyInventory._id": itemId
    });
    
    if (!medicine) {
      throw new ApiError("Inventory item not found", 404);
    }

    // Get the pharmacy inventory item to check authorization
    const inventoryItem = medicine.pharmacyInventory.find(
      item => item._id.toString() === itemId
    );
    
    if (!inventoryItem) {
      throw new ApiError("Inventory item not found", 404);
    }

    const authCheck = await isUserAuthorizedForPharmacy(inventoryItem.pharmacyId, userId);
    if (!authCheck.authorized) {
      throw new ApiError("Unauthorized to delete this inventory item", 403);
    }

    // Remove the pharmacy inventory item from the medicine
    await Medicine.findOneAndUpdate(
      { "pharmacyInventory._id": itemId },
      { $pull: { pharmacyInventory: { _id: itemId } } }
    );

    return {
      success: true,
      message: "Inventory item deleted successfully"
    };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("Failed to delete inventory item", 500);
  }
};

// Download CSV template for inventory upload
export const downloadCsvTemplate = async (req, res, next) => {
  try {
    // Define the CSV header row
    const header = [
      'medicineName',
      'brandName',
      'batchNumber',
      'dosageForm',
      'strength',
      'unitWeightOrVolume',
      'unitMeasurement',
      'quantityAvailable',
      'pricePerUnit',
      'expiryDate',
      'manufacturer',
      'requiresPrescription',
      'medicineImage'
    ];
    
    // Add sample data with valid values and comments
    const sampleRows = [
      '# Sample data - Delete these rows before uploading',
      '# Valid dosageForm values: tablet, capsule, syrup, injection, drops, cream, ointment, gel, patch, inhaler, suppository, powder, solution, suspension, lotion, spray, granules, sachets, vial, ampoule',
      '# Valid unitMeasurement values: mg, g, mcg, ml, l, iu, units, %',
      '# Date format: YYYY-MM-DD',
      '# Boolean values: true or false',
      'Paracetamol,Dolo 650,BATCH001,tablet,650mg,650,mg,100,12.50,2025-12-31,Micro Labs,false,',
      'Amoxicillin,Augmentin 625,BATCH002,tablet,625mg,625,mg,50,85.00,2025-06-30,GlaxoSmithKline,true,',
      'Cough Syrup,Benadryl,BATCH003,syrup,100ml,100,ml,25,125.00,2024-12-31,Johnson & Johnson,false,'
    ];
    
    const csvContent = header.join(',') + '\n' + sampleRows.join('\n') + '\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="medication_upload_template.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Get all medications with filters and pagination
export const getMedications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      pharmacyId,
      status,
      minQuantity,
      maxPrice,
      requiresPrescription,
      sortBy = 'lastUpdated',
      sortOrder = 'desc'
    } = req.query;

    let userPharmacyId = null;

    // If pharmacyId is provided, filter by pharmacy
    if (pharmacyId) {
      // If user is not admin, check authorization
      if (req.user.role !== 'admin') {
        const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, req.user._id);
        if (!authCheck.authorized) {
          const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
          return res.status(statusCode).json({ success: false, message: authCheck.error });
        }
      }
      userPharmacyId = pharmacyId;
    } else if (req.user.role !== 'admin') {
      // For non-admin users, only show their own pharmacy's inventory
      const user = await User.findById(req.user._id);

      if (user && user.pharmacy) {
        userPharmacyId = user.pharmacy;
      } else {
        // Fallback: check if user owns a pharmacy
        const userPharmacy = await Pharmacy.findOne({ owner: req.user._id });
        if (userPharmacy) {
          userPharmacyId = userPharmacy._id;
          // Update user reference
          await User.findByIdAndUpdate(req.user._id, { pharmacy: userPharmacy._id });
        }
      }

      if (!userPharmacyId) {
        // User has no pharmacy, return empty results
        return res.status(200).json({
          success: true,
          message: "No inventory found",
          data: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        });
      }
    }

    // Build aggregation pipeline
    const pipeline = [];

    // Match medicines with pharmacy inventory
    const matchStage = {
      status: 'active',
      pharmacyInventory: { $exists: true, $ne: [] }
    };

    // If userPharmacyId is specified, filter by pharmacy
    if (userPharmacyId) {
      matchStage['pharmacyInventory.pharmacyId'] = new mongoose.Types.ObjectId(userPharmacyId);
    }

    pipeline.push({ $match: matchStage });

    // Unwind pharmacy inventory to filter individual items
    pipeline.push({ $unwind: '$pharmacyInventory' });

    // Add pharmacy filter again after unwind if needed
    if (userPharmacyId) {
      pipeline.push({
        $match: {
          'pharmacyInventory.pharmacyId': new mongoose.Types.ObjectId(userPharmacyId)
        }
      });
    }

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { brandName: { $regex: search, $options: 'i' } },
            { genericName: { $regex: search, $options: 'i' } },
            { 'manufacturer.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add other filters
    const additionalFilters = {};
    if (status) {
      additionalFilters['pharmacyInventory.status'] = status;
    }
    if (minQuantity) {
      additionalFilters['pharmacyInventory.quantityAvailable'] = { $gte: parseFloat(minQuantity) };
    }
    if (maxPrice) {
      additionalFilters['pharmacyInventory.sellingPrice'] = { $lte: parseFloat(maxPrice) };
    }
    if (requiresPrescription !== undefined) {
      additionalFilters['regulatory.scheduleClass'] = requiresPrescription === 'true' ? 'Prescription' : 'OTC';
    }

    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    // Project the fields we need
    pipeline.push({
      $project: {
        _id: '$_id',
        medicineId: '$_id',
        inventoryId: '$pharmacyInventory._id',
        medicineName: '$name',
        brandName: '$brandName',
        genericName: '$genericName',
        dosageForm: '$dosageForm.form',
        manufacturer: '$manufacturer.name',
        batchNumber: '$pharmacyInventory.batchNumber',
        quantityAvailable: '$pharmacyInventory.quantityAvailable',
        expiryDate: '$pharmacyInventory.expiryDate',
        manufacturingDate: '$pharmacyInventory.manufacturingDate',
        pricePerUnit: '$pharmacyInventory.sellingPrice',
        costPrice: '$pharmacyInventory.costPrice',
        status: '$pharmacyInventory.status',
        storageLocation: '$pharmacyInventory.storageLocation',
        reorderLevel: '$pharmacyInventory.reorderLevel',
        maxStockLevel: '$pharmacyInventory.maxStockLevel',
        requiresPrescription: {
          $cond: { if: { $eq: ['$regulatory.scheduleClass', 'Prescription'] }, then: true, else: false }
        },
        lastUpdated: '$pharmacyInventory.lastUpdated',
        pharmacyId: '$pharmacyInventory.pharmacyId'
      }
    });

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Add sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortOptions });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    // Execute aggregation
    const [medications, countResult] = await Promise.all([
      Medicine.aggregate(pipeline),
      Medicine.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: matchStage },
      { $unwind: '$pharmacyInventory' }
    ];

    if (userPharmacyId) {
      summaryPipeline.push({
        $match: {
          'pharmacyInventory.pharmacyId': new mongoose.Types.ObjectId(userPharmacyId)
        }
      });
    }

    if (Object.keys(additionalFilters).length > 0) {
      summaryPipeline.push({ $match: additionalFilters });
    }

    summaryPipeline.push({
      $group: {
        _id: null,
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ['$pharmacyInventory.status', 'available'] }, 1, 0] }
        },
        lowStock: {
          $sum: { $cond: [{ $eq: ['$pharmacyInventory.status', 'low-stock'] }, 1, 0] }
        },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$pharmacyInventory.status', 'out-of-stock'] }, 1, 0] }
        },
        totalValue: {
          $sum: {
            $multiply: ['$pharmacyInventory.quantityAvailable', '$pharmacyInventory.sellingPrice']
          }
        }
      }
    });

    const summaryResult = await Medicine.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      total: 0,
      available: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0
    };

    res.status(200).json({
      success: true,
      message: "Medications retrieved successfully",
      data: medications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary
    });

  } catch (error) {
    console.error('Error getting medications:', error);
    next(error);
  }
};

// Get medicines by pharmacy ID
export const getMedicinesByPharmacy = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      inStock = false,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query for pharmacy-specific medicines
    const query = {
      pharmacyId: pharmacyId,
      status: 'active'
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query['therapeutic.therapeuticClass'] = { $regex: category, $options: 'i' };
    }

    if (inStock === 'true') {
      query['pharmacyInventory'] = {
        $elemMatch: {
          pharmacyId: pharmacyId,
          quantityAvailable: { $gt: 0 },
          status: { $in: ['available', 'low-stock'] }
        }
      };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const medicines = await Medicine.find(query)
      .populate('pharmacyId', 'name address contact')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Medicine.countDocuments(query);

    res.status(200).json({
      success: true,
      data: medicines,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacy medicines:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pharmacy medicines',
      error: error.message
    });
  }
};

// Search medicines within a specific pharmacy
export const searchPharmacyMedicines = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { q: searchTerm, limit = 20, skip = 0 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const medicines = await Medicine.searchPharmacyInventory(
      pharmacyId,
      searchTerm,
      { limit: parseInt(limit), skip: parseInt(skip) }
    );

    res.status(200).json({
      success: true,
      data: medicines
    });
  } catch (error) {
    console.error('Error searching pharmacy medicines:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search pharmacy medicines',
      error: error.message
    });
  }
};

// Get pharmacy inventory statistics
export const getPharmacyInventoryStats = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const userId = req.user._id || req.user.id;

    // Check authorization
    const authCheck = await isUserAuthorizedForPharmacy(pharmacyId, userId);
    if (!authCheck.authorized) {
      const statusCode = authCheck.error === "Pharmacy not found" ? 404 : 403;
      return res.status(statusCode).json({ success: false, message: authCheck.error });
    }

    const stats = await Medicine.getPharmacyInventoryStats(pharmacyId);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalItems: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        expiringItems: 0
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacy inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory statistics',
      error: error.message
    });
  }
};

// Get pharmacy details with distance calculation for medicine
export const getPharmacyForMedicine = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const { userLatitude, userLongitude } = req.query;

    // Get medicine with pharmacy details
    const medicine = await Medicine.findById(medicineId)
      .populate('pharmacyId', 'name address contact location operatingHours rating')
      .lean();

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    if (!medicine.pharmacyId) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found for this medicine'
      });
    }

    // Calculate distance if user location is provided
    let distanceInfo = null;
    if (userLatitude && userLongitude && medicine.pharmacyId.location?.coordinates) {
      const pharmacyCoords = medicine.pharmacyId.location.coordinates;
      const distance = calculateDistance(
        parseFloat(userLatitude),
        parseFloat(userLongitude),
        pharmacyCoords[1], // pharmacy latitude
        pharmacyCoords[0]  // pharmacy longitude
      );
      
      distanceInfo = {
        distanceKm: Math.round(distance * 10) / 10,
        distanceFormatted: distance < 1 
          ? `${Math.round(distance * 1000)}m` 
          : `${Math.round(distance * 10) / 10}km`,
        estimatedTime: Math.ceil(distance / 40 * 60) // Assuming 40km/h average speed
      };
    }

    res.status(200).json({
      success: true,
      data: {
        medicine: {
          _id: medicine._id,
          name: medicine.name,
          brandName: medicine.brandName
        },
        pharmacy: {
          ...medicine.pharmacyId,
          distance: distanceInfo
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacy for medicine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pharmacy details',
      error: error.message
    });
  }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}
