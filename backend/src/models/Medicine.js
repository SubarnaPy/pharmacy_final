import mongoose from 'mongoose';

const { Schema } = mongoose;

// Medicine composition schema for detailed ingredient information
const compositionSchema = new Schema({
  activeIngredient: {
    type: String,
    required: [true, 'Active ingredient is required'],
    trim: true,
    index: true
  },
  strength: {
    value: {
      type: Number,
      required: [true, 'Strength value is required'],
      min: [0, 'Strength value cannot be negative']
    },
    unit: {
      type: String,
      required: [true, 'Strength unit is required'],
      enum: ['mg', 'g', 'mcg', 'ml', 'l', 'iu', 'units', '%']
    }
  },
  role: {
    type: String,
    enum: ['active', 'inactive', 'excipient', 'preservative'],
    default: 'active'
  }
}, { _id: false });

// Dosage form schema
const dosageFormSchema = new Schema({
  form: {
    type: String,
    required: [true, 'Dosage form is required'],
    enum: [
      'tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment',
      'gel', 'patch', 'inhaler', 'suppository', 'powder', 'solution', 'suspension',
      'lotion', 'spray', 'granules', 'sachets', 'vial', 'ampoule', 'chewable tablet',
      'effervescent tablet', 'dispersible tablet', 'extended release tablet', 'film coated tablet'
    ],
    index: true
  },
  route: {
    type: String,
    enum: [
      'oral', 'topical', 'injection', 'inhalation', 'rectal', 'vaginal',
      'nasal', 'ophthalmic', 'otic', 'sublingual', 'transdermal'
    ],
    required: [true, 'Route of administration is required']
  },
  packaging: {
    type: String,
    enum: ['strip', 'bottle', 'tube', 'box', 'sachet', 'vial', 'ampoule', 'inhaler_device']
  },
  unitsPerPackage: {
    type: Number,
    min: [1, 'Units per package must be at least 1'],
    default: 1
  }
}, { _id: false });

// Manufacturer information
const manufacturerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Manufacturer name is required'],
    trim: true,
    index: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  country: {
    type: String,
    required: [true, 'Country of manufacture is required'],
    trim: true
  },
  licenseNumber: String,
  gmpCertified: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Regulatory information
const regulatorySchema = new Schema({
  approvalNumber: {
    type: String,
    required: [true, 'Regulatory approval number is required'],
    trim: true,
    unique: true,
    index: true
  },
  approvalDate: {
    type: Date,
    required: [true, 'Approval date is required']
  },
  approvedBy: {
    type: String,
    required: [true, 'Approving authority is required'],
    enum: ['FDA', 'CDSCO', 'EMA', 'TGA', 'PMDA', 'Other']
  },
  scheduleClass: {
    type: String,
    enum: ['OTC', 'H', 'H1', 'X', 'G', 'Prescription'],
    default: 'Prescription'
  },
  isControlledSubstance: {
    type: Boolean,
    default: false
  },
  narcotic: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Price and availability tracking
const priceSchema = new Schema({
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  sellingPrice: {
    type: Number,
    min: [0, 'Selling price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  priceHistory: [{
    price: Number,
    date: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, { _id: false });

// Image and AI recognition data
const imageDataSchema = new Schema({
  primaryImage: {
    url: {
      type: String,
      required: [true, 'Primary image URL is required']
    },
    publicId: String, // Cloudinary public ID
    altText: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  additionalImages: [{
    url: String,
    publicId: String,
    type: {
      type: String,
      enum: ['package', 'tablet', 'label', 'strip', 'bottle'],
      default: 'package'
    },
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiRecognitionData: {
    visualFeatures: {
      color: String,
      shape: String,
      size: String,
      markings: [String],
      texture: String
    },
    ocrText: [String], // Text extracted from package/label
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    lastAnalyzed: Date,
    analysisVersion: {
      type: String,
      default: '1.0'
    }
  }
}, { _id: false });

// Therapeutic classification
const therapeuticSchema = new Schema({
  therapeuticClass: {
    type: String,
    required: [true, 'Therapeutic class is required'],
    trim: true,
    index: true
  },
  pharmacologicalClass: {
    type: String,
    trim: true,
    index: true
  },
  indication: {
    primary: [String],
    secondary: [String]
  },
  contraindications: [String],
  sideEffects: {
    common: [String],
    rare: [String],
    serious: [String]
  },
  interactions: {
    drugInteractions: [String],
    foodInteractions: [String],
    allergyWarnings: [String]
  }
}, { _id: false });

// Main Medicine Schema
const medicineSchema = new Schema({
  // Pharmacy Association - Direct reference to the owning pharmacy
  pharmacyId: {
    type: Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: [true, 'Pharmacy ID is required'],
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    maxlength: [200, 'Medicine name cannot exceed 200 characters'],
    index: 'text'
  },
  
  brandName: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    maxlength: [200, 'Brand name cannot exceed 200 characters'],
    index: 'text'
  },
  
  genericName: {
    type: String,
    required: [true, 'Generic name is required'],
    trim: true,
    maxlength: [200, 'Generic name cannot exceed 200 characters'],
    index: 'text'
  },
  
  alternativeNames: [{
    type: String,
    trim: true,
    maxlength: [200, 'Alternative name cannot exceed 200 characters']
  }],
  
  // Composition and Formulation
  composition: {
    type: [compositionSchema],
    required: [true, 'Medicine composition is required'],
    validate: {
      validator: function(composition) {
        return composition.length > 0;
      },
      message: 'At least one active ingredient is required'
    }
  },
  
  dosageForm: {
    type: dosageFormSchema,
    required: [true, 'Dosage form is required']
  },
  
  // Manufacturer and Regulatory
  manufacturer: {
    type: manufacturerSchema,
    required: [true, 'Manufacturer information is required']
  },
  
  regulatory: {
    type: regulatorySchema,
    required: [true, 'Regulatory information is required']
  },
  
  // Pricing and Commercial
  pricing: {
    type: priceSchema,
    required: [true, 'Pricing information is required']
  },
  
  // Visual and AI Data
  imageData: {
    type: imageDataSchema,
    required: [true, 'Primary image is required for AI recognition']
  },
  
  // Clinical Information
  therapeutic: {
    type: therapeuticSchema,
    required: [true, 'Therapeutic information is required']
  },
  
  // Inventory and Availability
  barcodes: [{
    type: {
      type: String,
      enum: ['EAN-13', 'UPC-A', 'Code-128', 'QR'],
      default: 'EAN-13'
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    primary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Storage and Handling
  storage: {
    temperature: {
      min: Number, // in Celsius
      max: Number,
      unit: {
        type: String,
        default: 'C'
      }
    },
    humidity: {
      max: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    lightSensitive: {
      type: Boolean,
      default: false
    },
    specialInstructions: [String]
  },
  
  // Pharmacy-Specific Inventory Management
  pharmacyInventory: [{
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    expiryDate: {
      type: Date,
      required: true
    },
    manufacturingDate: Date,
    unitWeightOrVolume: {
      type: Number,
      min: 0
    },
    unitMeasurement: {
      type: String,
      enum: ['mg', 'ml', 'g', 'l', 'units'],
      default: 'mg'
    },
    costPrice: {
      type: Number,
      min: 0
    },
    sellingPrice: {
      type: Number,
      min: 0,
      required: true
    },
    totalStockInGramsOrMl: {
      type: Number,
      default: 0
    },
    storageLocation: {
      type: String,
      trim: true
    },
    pharmacyNotes: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'low-stock', 'out-of-stock', 'expired', 'recalled'],
      default: 'available'
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 10
    },
    maxStockLevel: {
      type: Number,
      min: 0,
      default: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Search and Discovery
  searchTags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  aiSearchOptimization: {
    keywordDensity: [{
      keyword: String,
      frequency: Number,
      relevance: {
        type: Number,
        min: 0,
        max: 1
      }
    }],
    semanticTags: [String],
    searchBoost: {
      type: Number,
      min: 0,
      max: 5,
      default: 1
    }
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['active', 'discontinued', 'recalled', 'pending_approval', 'banned'],
    default: 'active',
    index: true
  },
  
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'needs_review'],
    default: 'verified',
    index: true
  },
  
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  verifiedAt: Date,
  
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  
  popularityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Analytics and Metrics
  analytics: {
    searchCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    purchaseCount: {
      type: Number,
      default: 0
    },
    lastSearched: Date,
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  }
  
}, {
  timestamps: true,
  collection: 'medicines',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimal search performance
medicineSchema.index({ 
  name: 'text', 
  brandName: 'text', 
  genericName: 'text', 
  'alternativeNames': 'text',
  searchTags: 'text',
  'aiSearchOptimization.semanticTags': 'text'
});

medicineSchema.index({ 'composition.activeIngredient': 1 });
medicineSchema.index({ 'dosageForm.form': 1, 'dosageForm.route': 1 });
medicineSchema.index({ 'manufacturer.name': 1 });
medicineSchema.index({ 'regulatory.scheduleClass': 1 });
medicineSchema.index({ 'therapeutic.therapeuticClass': 1 });
medicineSchema.index({ status: 1, verificationStatus: 1 });
medicineSchema.index({ isPopular: 1, popularityScore: -1 });
medicineSchema.index({ 'pricing.sellingPrice': 1 });
medicineSchema.index({ 'analytics.popularityScore': -1 });
medicineSchema.index({ 'barcodes.value': 1 });

// Pharmacy inventory specific indexes
medicineSchema.index({ 'pharmacyInventory.pharmacyId': 1 });
medicineSchema.index({ 'pharmacyInventory.batchNumber': 1 });
medicineSchema.index({ 'pharmacyInventory.status': 1 });
medicineSchema.index({ 'pharmacyInventory.expiryDate': 1 });
medicineSchema.index({ 'pharmacyInventory.quantityAvailable': 1 });

// Direct pharmacy association indexes
medicineSchema.index({ pharmacyId: 1 });
medicineSchema.index({ pharmacyId: 1, status: 1 });
medicineSchema.index({ pharmacyId: 1, 'therapeutic.therapeuticClass': 1 });
medicineSchema.index({ pharmacyId: 1, name: 1 });

// Virtual fields
medicineSchema.virtual('currentPrice').get(function() {
  return this.pricing.sellingPrice || this.pricing.mrp;
});

medicineSchema.virtual('discountAmount').get(function() {
  if (this.pricing.discountPercentage > 0) {
    return Math.round((this.pricing.mrp * this.pricing.discountPercentage) / 100);
  }
  return 0;
});

medicineSchema.virtual('isGeneric').get(function() {
  return this.name.toLowerCase() === this.genericName.toLowerCase();
});

medicineSchema.virtual('hasAIRecognition').get(function() {
  return this.imageData && 
         this.imageData.aiRecognitionData && 
         this.imageData.aiRecognitionData.aiConfidence > 0.7;
});

medicineSchema.virtual('primaryActiveIngredient').get(function() {
  const activeIngredients = this.composition.filter(comp => comp.role === 'active');
  return activeIngredients.length > 0 ? activeIngredients[0].activeIngredient : null;
});

// Instance methods
medicineSchema.methods.updateAnalytics = function(type = 'view') {
  switch(type) {
    case 'search':
      this.analytics.searchCount += 1;
      this.analytics.lastSearched = new Date();
      break;
    case 'view':
      this.analytics.viewCount += 1;
      break;
    case 'purchase':
      this.analytics.purchaseCount += 1;
      break;
  }
  
  // Update popularity score based on recent activity
  this.updatePopularityScore();
  
  return this.save();
};

medicineSchema.methods.updatePopularityScore = function() {
  const weights = {
    search: 1,
    view: 2,
    purchase: 5,
    rating: 10
  };
  
  const recentActivityBonus = this.analytics.lastSearched && 
    (Date.now() - this.analytics.lastSearched.getTime()) < (7 * 24 * 60 * 60 * 1000) ? 1.2 : 1;
  
  this.popularityScore = Math.min(100, 
    (this.analytics.searchCount * weights.search +
     this.analytics.viewCount * weights.view +
     this.analytics.purchaseCount * weights.purchase +
     this.analytics.averageRating * this.analytics.reviewCount * weights.rating) * recentActivityBonus
  );
  
  this.isPopular = this.popularityScore > 50;
};

medicineSchema.methods.addImage = function(imageUrl, imageType = 'package', description = '') {
  if (imageType === 'primary') {
    this.imageData.primaryImage = {
      url: imageUrl,
      altText: `${this.brandName} - ${this.dosageForm.form}`,
      uploadedAt: new Date()
    };
  } else {
    this.imageData.additionalImages.push({
      url: imageUrl,
      type: imageType,
      description: description,
      uploadedAt: new Date()
    });
  }
  
  return this.save();
};

medicineSchema.methods.updateAIRecognitionData = function(aiData) {
  this.imageData.aiRecognitionData = {
    ...this.imageData.aiRecognitionData,
    ...aiData,
    lastAnalyzed: new Date(),
    analysisVersion: '1.0'
  };
  
  return this.save();
};

// Pharmacy Inventory Management Methods
medicineSchema.methods.addPharmacyInventory = function(pharmacyId, inventoryData) {
  const newInventory = {
    pharmacyId,
    batchNumber: inventoryData.batchNumber,
    quantityAvailable: inventoryData.quantityAvailable || 0,
    expiryDate: inventoryData.expiryDate,
    manufacturingDate: inventoryData.manufacturingDate,
    unitWeightOrVolume: inventoryData.unitWeightOrVolume,
    unitMeasurement: inventoryData.unitMeasurement || 'mg',
    costPrice: inventoryData.costPrice || 0,
    sellingPrice: inventoryData.sellingPrice,
    storageLocation: inventoryData.storageLocation || '',
    pharmacyNotes: inventoryData.pharmacyNotes || '',
    reorderLevel: inventoryData.reorderLevel || 10,
    maxStockLevel: inventoryData.maxStockLevel || 100,
    status: this.calculateInventoryStatus(inventoryData.quantityAvailable, inventoryData.reorderLevel, inventoryData.expiryDate)
  };
  
  // Calculate total stock in grams/ml
  if (newInventory.unitWeightOrVolume && newInventory.quantityAvailable) {
    const multiplier = newInventory.unitMeasurement === 'mg' ? 0.001 : 1;
    newInventory.totalStockInGramsOrMl = newInventory.unitWeightOrVolume * newInventory.quantityAvailable * multiplier;
  }
  
  this.pharmacyInventory.push(newInventory);
  return this.save();
};

medicineSchema.methods.updatePharmacyInventory = function(pharmacyId, batchNumber, updateData) {
  const inventoryIndex = this.pharmacyInventory.findIndex(
    inv => inv.pharmacyId.toString() === pharmacyId.toString() && inv.batchNumber === batchNumber
  );
  
  if (inventoryIndex === -1) {
    throw new Error('Inventory record not found');
  }
  
  const inventory = this.pharmacyInventory[inventoryIndex];
  Object.assign(inventory, updateData);
  
  // Recalculate status
  inventory.status = this.calculateInventoryStatus(
    inventory.quantityAvailable, 
    inventory.reorderLevel, 
    inventory.expiryDate
  );
  
  // Recalculate total stock
  if (inventory.unitWeightOrVolume && inventory.quantityAvailable) {
    const multiplier = inventory.unitMeasurement === 'mg' ? 0.001 : 1;
    inventory.totalStockInGramsOrMl = inventory.unitWeightOrVolume * inventory.quantityAvailable * multiplier;
  }
  
  inventory.lastUpdated = new Date();
  return this.save();
};

medicineSchema.methods.removePharmacyInventory = function(pharmacyId, batchNumber) {
  this.pharmacyInventory = this.pharmacyInventory.filter(
    inv => !(inv.pharmacyId.toString() === pharmacyId.toString() && inv.batchNumber === batchNumber)
  );
  return this.save();
};

medicineSchema.methods.getPharmacyInventory = function(pharmacyId) {
  return this.pharmacyInventory.filter(
    inv => inv.pharmacyId.toString() === pharmacyId.toString()
  );
};

medicineSchema.methods.getTotalQuantityForPharmacy = function(pharmacyId) {
  return this.pharmacyInventory
    .filter(inv => inv.pharmacyId.toString() === pharmacyId.toString() && inv.status === 'available')
    .reduce((total, inv) => total + inv.quantityAvailable, 0);
};

medicineSchema.methods.calculateInventoryStatus = function(quantity, reorderLevel = 10, expiryDate) {
  if (quantity <= 0) return 'out-of-stock';
  
  if (expiryDate) {
    const daysToExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 0) return 'expired';
    if (daysToExpiry <= 30) return 'expiring-soon';
  }
  
  if (quantity <= reorderLevel) return 'low-stock';
  
  return 'available';
};

medicineSchema.methods.reserveQuantity = function(pharmacyId, batchNumber, quantity) {
  const inventory = this.pharmacyInventory.find(
    inv => inv.pharmacyId.toString() === pharmacyId.toString() && inv.batchNumber === batchNumber
  );
  
  if (!inventory) {
    throw new Error('Inventory record not found');
  }
  
  if (inventory.quantityAvailable < quantity) {
    throw new Error('Insufficient quantity available');
  }
  
  inventory.quantityAvailable -= quantity;
  inventory.reservedQuantity = (inventory.reservedQuantity || 0) + quantity;
  inventory.lastUpdated = new Date();
  
  // Update status
  inventory.status = this.calculateInventoryStatus(
    inventory.quantityAvailable, 
    inventory.reorderLevel, 
    inventory.expiryDate
  );
  
  return this.save();
};

medicineSchema.methods.releaseReservedQuantity = function(pharmacyId, batchNumber, quantity) {
  const inventory = this.pharmacyInventory.find(
    inv => inv.pharmacyId.toString() === pharmacyId.toString() && inv.batchNumber === batchNumber
  );
  
  if (!inventory) {
    throw new Error('Inventory record not found');
  }
  
  const releaseAmount = Math.min(quantity, inventory.reservedQuantity || 0);
  inventory.quantityAvailable += releaseAmount;
  inventory.reservedQuantity = (inventory.reservedQuantity || 0) - releaseAmount;
  inventory.lastUpdated = new Date();
  
  // Update status
  inventory.status = this.calculateInventoryStatus(
    inventory.quantityAvailable, 
    inventory.reorderLevel, 
    inventory.expiryDate
  );
  
  return this.save();
};

medicineSchema.methods.checkAvailability = async function(pharmacyIds = []) {
  // Check availability in pharmacy inventory within this medicine record
  const availableInventory = [];
  
  for (const inventory of this.pharmacyInventory) {
    // Filter by pharmacy IDs if provided
    if (pharmacyIds.length > 0 && !pharmacyIds.includes(inventory.pharmacyId.toString())) {
      continue;
    }
    
    // Only include available inventory
    if (['available', 'low-stock'].includes(inventory.status) && inventory.quantityAvailable > 0) {
      availableInventory.push({
        pharmacyId: inventory.pharmacyId,
        batchNumber: inventory.batchNumber,
        quantityAvailable: inventory.quantityAvailable,
        sellingPrice: inventory.sellingPrice,
        expiryDate: inventory.expiryDate,
        storageLocation: inventory.storageLocation,
        status: inventory.status
      });
    }
  }
  
  return availableInventory;
};

// Static methods
medicineSchema.statics.searchByText = function(searchTerm, options = {}) {
  const {
    limit = 20,
    skip = 0,
    sortBy = 'popularityScore',
    filters = {}
  } = options;
  
  const searchQuery = {
    $text: { $search: searchTerm },
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] },
    ...filters
  };
  
  // Add pharmacy filter if provided
  if (filters.pharmacyId) {
    searchQuery.pharmacyId = filters.pharmacyId;
  }
  
  return this.find(searchQuery)
    .populate('pharmacyId', 'name address contact')
    .sort({ score: { $meta: 'textScore' }, [sortBy]: -1 })
    .skip(skip)
    .limit(limit);
};

medicineSchema.statics.searchByIngredient = function(ingredient, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    'composition.activeIngredient': new RegExp(ingredient, 'i'),
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  })
  .sort({ popularityScore: -1 })
  .skip(skip)
  .limit(limit);
};

medicineSchema.statics.findByTherapeuticClass = function(therapeuticClass, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    'therapeutic.therapeuticClass': new RegExp(therapeuticClass, 'i'),
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  })
  .sort({ popularityScore: -1 })
  .skip(skip)
  .limit(limit);
};

medicineSchema.statics.findByBarcode = function(barcode) {
  return this.findOne({
    'barcodes.value': barcode,
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  });
};

medicineSchema.statics.getPopularMedicines = function(limit = 10, category = null, pharmacyId = null) {
  const query = {
    isPopular: true,
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  };
  
  if (category) {
    query['therapeutic.therapeuticClass'] = new RegExp(category, 'i');
  }
  
  if (pharmacyId) {
    query.pharmacyId = pharmacyId;
  }
  
  return this.find(query)
    .populate('pharmacyId', 'name address contact')
    .sort({ popularityScore: -1 })
    .limit(limit);
};

medicineSchema.statics.findSimilar = function(medicineId, limit = 5) {
  return this.findById(medicineId)
    .then(medicine => {
      if (!medicine) return [];
      
      return this.find({
        _id: { $ne: medicineId },
        $or: [
          { 'composition.activeIngredient': { $in: medicine.composition.map(c => c.activeIngredient) } },
          { 'therapeutic.therapeuticClass': medicine.therapeutic.therapeuticClass },
          { genericName: medicine.genericName }
        ],
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      })
      .sort({ popularityScore: -1 })
      .limit(limit);
    });
};

// Pharmacy Inventory Static Methods
medicineSchema.statics.findByPharmacyInventory = function(pharmacyId, options = {}) {
  const {
    status = null,
    searchTerm = null,
    minQuantity = null,
    maxPrice = null,
    requiresPrescription = null,
    page = 1,
    limit = 20,
    sort = 'name',
    order = 'asc'
  } = options;
  
  const query = {
    'pharmacyInventory.pharmacyId': pharmacyId,
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  };
  
  if (status) {
    query['pharmacyInventory.status'] = status;
  }
  
  if (searchTerm) {
    query.$or = [
      { name: new RegExp(searchTerm, 'i') },
      { brandName: new RegExp(searchTerm, 'i') },
      { genericName: new RegExp(searchTerm, 'i') },
      { 'manufacturer.name': new RegExp(searchTerm, 'i') }
    ];
  }
  
  if (minQuantity) {
    query['pharmacyInventory.quantityAvailable'] = { $gte: parseFloat(minQuantity) };
  }
  
  if (maxPrice) {
    query['pharmacyInventory.sellingPrice'] = { $lte: parseFloat(maxPrice) };
  }
  
  if (requiresPrescription !== null) {
    query['regulatory.scheduleClass'] = requiresPrescription ? { $ne: 'OTC' } : 'OTC';
  }
  
  const skip = (page - 1) * limit;
  const sortObj = {};
  
  switch(sort) {
    case 'name':
      sortObj.name = order === 'desc' ? -1 : 1;
      break;
    case 'price':
      sortObj['pharmacyInventory.sellingPrice'] = order === 'desc' ? -1 : 1;
      break;
    case 'quantity':
      sortObj['pharmacyInventory.quantityAvailable'] = order === 'desc' ? -1 : 1;
      break;
    case 'expiry':
      sortObj['pharmacyInventory.expiryDate'] = order === 'desc' ? -1 : 1;
      break;
    default:
      sortObj.name = 1;
  }
  
  return this.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .populate('pharmacyInventory.pharmacyId', 'name location');
};

medicineSchema.statics.countPharmacyInventory = function(pharmacyId, filters = {}) {
  const query = {
    'pharmacyInventory.pharmacyId': pharmacyId,
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] },
    ...filters
  };
  
  return this.countDocuments(query);
};

medicineSchema.statics.searchPharmacyInventory = function(pharmacyId, searchTerm, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  const query = {
    'pharmacyInventory.pharmacyId': pharmacyId,
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] },
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { brandName: new RegExp(searchTerm, 'i') },
      { genericName: new RegExp(searchTerm, 'i') },
      { 'composition.activeIngredient': new RegExp(searchTerm, 'i') },
      { 'manufacturer.name': new RegExp(searchTerm, 'i') }
    ]
  };
  
  return this.find(query)
    .sort({ popularityScore: -1 })
    .skip(skip)
    .limit(limit);
};

medicineSchema.statics.getPharmacyInventoryStats = function(pharmacyId) {
  return this.aggregate([
    { $match: { 'pharmacyInventory.pharmacyId': mongoose.Types.ObjectId(pharmacyId) } },
    { $unwind: '$pharmacyInventory' },
    { $match: { 'pharmacyInventory.pharmacyId': mongoose.Types.ObjectId(pharmacyId) } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$pharmacyInventory.quantityAvailable' },
        totalValue: {
          $sum: {
            $multiply: ['$pharmacyInventory.quantityAvailable', '$pharmacyInventory.sellingPrice']
          }
        },
        lowStockItems: {
          $sum: {
            $cond: [{ $eq: ['$pharmacyInventory.status', 'low-stock'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$pharmacyInventory.status', 'out-of-stock'] }, 1, 0]
          }
        },
        expiringItems: {
          $sum: {
            $cond: [{ $eq: ['$pharmacyInventory.status', 'expiring-soon'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

medicineSchema.statics.findAvailableForPharmacy = function(pharmacyId, medicationName, requiredQuantity = 1) {
  const query = {
    'pharmacyInventory.pharmacyId': pharmacyId,
    'pharmacyInventory.status': { $in: ['available', 'low-stock'] },
    'pharmacyInventory.quantityAvailable': { $gte: requiredQuantity },
    status: 'active',
    verificationStatus: { $in: ['verified', 'pending'] }
  };
  
  if (medicationName) {
    query.$or = [
      { name: new RegExp(medicationName, 'i') },
      { brandName: new RegExp(medicationName, 'i') },
      { genericName: new RegExp(medicationName, 'i') }
    ];
  }
  
  return this.find(query)
    .sort({ 'pharmacyInventory.expiryDate': 1 }) // Use items expiring first
    .populate('pharmacyInventory.pharmacyId', 'name location');
};

// Pre-save middleware
medicineSchema.pre('save', function(next) {
  // Auto-calculate selling price if not provided
  if (!this.pricing.sellingPrice && this.pricing.mrp && this.pricing.discountPercentage) {
    this.pricing.sellingPrice = Math.round(
      this.pricing.mrp - (this.pricing.mrp * this.pricing.discountPercentage / 100)
    );
  }
  
  // Auto-generate search tags
  const tags = [
    this.name.toLowerCase(),
    this.brandName.toLowerCase(),
    this.genericName.toLowerCase(),
    ...this.composition.map(c => c.activeIngredient.toLowerCase()),
    this.therapeutic.therapeuticClass.toLowerCase(),
    this.dosageForm.form.toLowerCase()
  ];
  
  this.searchTags = [...new Set([...this.searchTags, ...tags])];
  
  // Update popularity score
  this.updatePopularityScore();
  
  // Process pharmacy inventory items
  this.pharmacyInventory.forEach(inventory => {
    // Auto-calculate total stock in grams/ml
    if (inventory.unitWeightOrVolume && inventory.quantityAvailable) {
      const multiplier = inventory.unitMeasurement === 'mg' ? 0.001 : 1;
      inventory.totalStockInGramsOrMl = inventory.unitWeightOrVolume * inventory.quantityAvailable * multiplier;
    }
    
    // Auto-calculate status
    inventory.status = this.calculateInventoryStatus(
      inventory.quantityAvailable,
      inventory.reorderLevel,
      inventory.expiryDate
    );
    
    // Update lastUpdated if not set
    if (!inventory.lastUpdated) {
      inventory.lastUpdated = new Date();
    }
  });
  
  next();
});

// Export the model
const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;