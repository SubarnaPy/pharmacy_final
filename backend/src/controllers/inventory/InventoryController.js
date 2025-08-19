// Single product upload

import mongoose from "mongoose";
import { InventoryItem } from "../../models/Inventory.js";
import Pharmacy from "../../models/Pharmacy.js";
import User from "../../models/User.js";
// import { fileUploadService } from "./fileUploadController.js";
import ApiError from "../../utils/AppError.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

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
    
    // Create inventory item
    const inventoryItem = new InventoryItem({
      pharmacyId,
      medicineName: req.body.medicineName.trim(),
      brandName: req.body.brandName ? req.body.brandName.trim() : undefined,
      batchNumber: req.body.batchNumber.trim(),
      dosageForm: req.body.dosageForm.trim(),
      strength: req.body.strength ? req.body.strength.trim() : undefined,
      unitWeightOrVolume: req.body.unitWeightOrVolume ? parseFloat(req.body.unitWeightOrVolume) : undefined,
      unitMeasurement: req.body.unitMeasurement || undefined,
      quantityAvailable: quantity,
      pricePerUnit: parseFloat(req.body.pricePerUnit),
      expiryDate: new Date(req.body.expiryDate),
      manufacturer: req.body.manufacturer ? req.body.manufacturer.trim() : undefined,
      requiresPrescription: req.body.requiresPrescription !== undefined ? req.body.requiresPrescription : true,
      medicineImage: req.body.medicineImage || undefined,
      status: status
    });
    await inventoryItem.save();

    // Check for notifications
    const currentDate = new Date();
    const expiryDate = new Date(inventoryItem.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

    // Trigger low stock notification if item is low stock or out of stock
    if (status === 'low-stock' && req.notify) {
      await req.notify.trigger('inventory.low_stock', {
        medicationId: inventoryItem._id,
        medicationName: inventoryItem.medicineName,
        pharmacyId: pharmacyId,
        currentStock: quantity,
        batchNumber: inventoryItem.batchNumber,
        alertedAt: new Date()
      });
    }

    // Trigger expiry notification if medication is expiring soon (within 30 days)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && req.notify) {
      await req.notify.trigger('inventory.expired', {
        medicationId: inventoryItem._id,
        medicationName: inventoryItem.medicineName,
        pharmacyId: pharmacyId,
        batchNumber: inventoryItem.batchNumber,
        expiryDate: expiryDate,
        daysUntilExpiry: daysUntilExpiry,
        alertedAt: new Date()
      });
    }

    res.status(201).json({ success: true, message: "Inventory item added successfully", data: inventoryItem });
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
        // Check if item already exists (by medicine name and batch number)
        const existingItem = await InventoryItem.findOne({
          pharmacyId,
          medicineName: rowData.medicineName.trim(),
          batchNumber: rowData.batchNumber.trim()
        });

        const itemData = {
          pharmacyId,
          medicineName: rowData.medicineName.trim(),
          brandName: rowData.brandName ? rowData.brandName.trim() : undefined,
          batchNumber: rowData.batchNumber.trim(),
          dosageForm: rowData.dosageForm.trim(),
          strength: rowData.strength ? rowData.strength.trim() : undefined,
          unitWeightOrVolume: rowData.unitWeightOrVolume ? parseFloat(rowData.unitWeightOrVolume) : undefined,
          unitMeasurement: rowData.unitMeasurement || undefined,
          quantityAvailable: parseFloat(rowData.quantityAvailable),
          pricePerUnit: parseFloat(rowData.pricePerUnit),
          expiryDate: new Date(rowData.expiryDate),
          manufacturer: rowData.manufacturer ? rowData.manufacturer.trim() : undefined,
          requiresPrescription: rowData.requiresPrescription ? rowData.requiresPrescription.toLowerCase() === "true" : true,
          medicineImage: rowData.medicineImage || undefined,
          status: parseFloat(rowData.quantityAvailable) === 0 ? "out-of-stock" :
            parseFloat(rowData.quantityAvailable) <= 10 ? "low-stock" : "available"
        };

        if (existingItem) {
          // Update existing item
          Object.assign(existingItem, itemData);
          existingItem.lastUpdated = new Date();
          await existingItem.save();
          successful.push({
            medication: existingItem,
            action: 'updated',
            name: existingItem.medicineName
          });
        } else {
          // Create new item
          const newItem = new InventoryItem(itemData);
          await newItem.save();
          successful.push({
            medication: newItem,
            action: 'created',
            name: newItem.medicineName
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

    const inventoryItem = new InventoryItem({
      pharmacyId,
      medicineName: itemData.medicineName.trim(),
      brandName: itemData.brandName ? itemData.brandName.trim() : undefined,
      batchNumber: itemData.batchNumber.trim(),
      dosageForm: itemData.dosageForm.trim(),
      strength: itemData.strength ? itemData.strength.trim() : undefined,
      unitWeightOrVolume: itemData.unitWeightOrVolume ? parseFloat(itemData.unitWeightOrVolume) : undefined,
      unitMeasurement: itemData.unitMeasurement || undefined,
      quantityAvailable: parseFloat(itemData.quantityAvailable),
      pricePerUnit: parseFloat(itemData.pricePerUnit),
      expiryDate: new Date(itemData.expiryDate),
      manufacturer: itemData.manufacturer ? itemData.manufacturer.trim() : undefined,
      requiresPrescription: itemData.requiresPrescription !== undefined ? itemData.requiresPrescription : true,
      medicineImage: itemData.medicineImage || undefined,
      status: parseFloat(itemData.quantityAvailable) === 0 ? "out-of-stock" :
        parseFloat(itemData.quantityAvailable) <= 10 ? "low-stock" : "available"
    });

    await inventoryItem.save();

    return {
      success: true,
      message: "Inventory item added successfully",
      data: inventoryItem
    };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("Failed to add inventory item", 500);
  }
};

// Update inventory item
export const updateInventoryItem = async (itemId, userId, updateData) => {
  try {
    const inventoryItem = await InventoryItem.findById(itemId);
    if (!inventoryItem) {
      throw new ApiError("Inventory item not found", 404);
    }

    const authCheck = await isUserAuthorizedForPharmacy(inventoryItem.pharmacyId, userId);
    if (!authCheck.authorized) {
      throw new ApiError("Unauthorized to update this inventory item", 403);
    }

    const allowedUpdates = [
      "medicineName",
      "brandName",
      "batchNumber",
      "dosageForm",
      "strength",
      "unitWeightOrVolume",
      "unitMeasurement",
      "quantityAvailable",
      "pricePerUnit",
      "expiryDate",
      "manufacturer",
      "requiresPrescription",
      "medicineImage"
    ];

    const sanitizedUpdates = Object.keys(updateData)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    const previousStatus = inventoryItem.status;
    const previousQuantity = inventoryItem.quantityAvailable;

    if (sanitizedUpdates.quantityAvailable !== undefined) {
      sanitizedUpdates.status = parseFloat(sanitizedUpdates.quantityAvailable) === 0 ? "out-of-stock" :
        parseFloat(sanitizedUpdates.quantityAvailable) <= 10 ? "low-stock" : "available";
    }

    Object.assign(inventoryItem, sanitizedUpdates);
    inventoryItem.lastUpdated = new Date();

    await inventoryItem.save();

    // Check for low stock or expiry notifications
    const currentDate = new Date();
    const expiryDate = new Date(inventoryItem.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

    // Trigger low stock notification if status changed to low-stock or out-of-stock
    if (inventoryItem.status === 'low-stock' && previousStatus !== 'low-stock') {
      // Note: req object is not available here, so we'll need to pass it from the calling function
      // This is a limitation of the current structure - ideally this should be called from a controller method
    }

    // Trigger expiry notification if medication is expiring soon (within 30 days)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      // Note: Similar limitation as above
    }

    return {
      success: true,
      message: "Inventory item updated successfully",
      data: inventoryItem
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

    const query = { pharmacyId };

    if (medicineName) {
      query.$text = { $search: medicineName };
    }
    if (status) {
      query.status = status;
    }
    if (minQuantity) {
      query.quantityAvailable = { $gte: parseFloat(minQuantity) };
    }
    if (maxPrice) {
      query.pricePerUnit = { $lte: parseFloat(maxPrice) };
    }
    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription;
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      InventoryItem.find(query)
        .sort({ [sort]: order === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryItem.countDocuments(query)
    ]);

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
    const inventoryItem = await InventoryItem.findById(itemId);
    if (!inventoryItem) {
      throw new ApiError("Inventory item not found", 404);
    }

    const authCheck = await isUserAuthorizedForPharmacy(inventoryItem.pharmacyId, userId);
    if (!authCheck.authorized) {
      throw new ApiError("Unauthorized to delete this inventory item", 403);
    }

    await inventoryItem.deleteOne();

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
    const csvContent = header.join(',') + '\n';
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

    // Build query filters
    const query = {};

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

      query.pharmacyId = pharmacyId;
    } else if (req.user.role !== 'admin') {
      // For non-admin users, only show their own pharmacy's inventory
      const user = await User.findById(req.user._id);
      let userPharmacyId = null;

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

      if (userPharmacyId) {
        query.pharmacyId = userPharmacyId;
      } else {
        // User has no pharmacy, return empty results
        return res.status(200).json({
          success: true,
          message: "No inventory found",
          data: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        });
      }
    }

    // Add search filter
    if (search) {
      query.$or = [
        { medicineName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } }
      ];
    }

    // Add other filters
    if (status) {
      query.status = status;
    }
    if (minQuantity) {
      query.quantityAvailable = { $gte: parseFloat(minQuantity) };
    }
    if (maxPrice) {
      query.pricePerUnit = { $lte: parseFloat(maxPrice) };
    }
    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [medications, total] = await Promise.all([
      InventoryItem.find(query)
        .populate('pharmacyId', 'name address contact')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InventoryItem.countDocuments(query)
    ]);

    // Calculate summary statistics
    const summary = {
      total,
      available: await InventoryItem.countDocuments({ ...query, status: 'available' }),
      lowStock: await InventoryItem.countDocuments({ ...query, status: 'low-stock' }),
      outOfStock: await InventoryItem.countDocuments({ ...query, status: 'out-of-stock' }),
      totalValue: medications.reduce((sum, item) => sum + (item.quantityAvailable * item.pricePerUnit), 0)
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
