import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import MedicineImageRecognitionService from './ai/MedicineImageRecognitionService.js';

class MedicineSearchService {
  constructor() {
    this.imageRecognitionService = new MedicineImageRecognitionService();
    this.defaultSearchRadius = 50; // 50km default radius
    this.maxResults = 50;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.searchCache = new Map();
    
    console.log('🚀 [MedicineSearchService] Service initialized');
    console.log('📆 [MedicineSearchService] Configuration:', {
      defaultSearchRadius: this.defaultSearchRadius,
      maxResults: this.maxResults,
      cacheTimeout: this.cacheTimeout
    });
    
    // Log database stats for debugging (async, don't wait for it)
    this.logDatabaseStats().catch(error => {
      console.error('⚠️ [MedicineSearchService] Failed to log database stats during initialization:', error.message);
    });
  }

  /**
   * Comprehensive medicine search with multiple search modes
   * @param {object} searchParams - Search parameters
   * @returns {Promise<object>} Search results with medicines and availability
   */
  async searchMedicines(searchParams) {
    try {
      console.log('🔍 [MedicineSearchService] Starting search with params:', {
        query: searchParams.query,
        searchType: searchParams.searchType,
        filters: searchParams.filters,
        pagination: searchParams.pagination
      });

      const {
        query,
        searchType = 'text', // 'text', 'image', 'barcode', 'ingredient', 'therapeutic'
        imageData,
        location,
        filters = {},
        pagination = { page: 1, limit: 20 },
        sortBy = 'relevance',
        includeAvailability = true,
        pharmacyPreferences = {}
      } = searchParams;

      // Generate cache key
      const cacheKey = this.generateCacheKey(searchParams);
      console.log('🔑 [MedicineSearchService] Generated cache key:', cacheKey);
      
      // Check cache first
      if (this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('📦 [MedicineSearchService] Returning cached results');
          return cached.data;
        }
        console.log('⏰ [MedicineSearchService] Cache expired, performing fresh search');
      }

      let searchResults;
      console.log('🎯 [MedicineSearchService] Executing search type:', searchType);

      // Execute search based on type
      switch (searchType) {
        case 'image':
          console.log('🖼️ [MedicineSearchService] Starting image search');
          searchResults = await this.searchByImage(imageData, filters, pagination);
          break;
        case 'barcode':
          console.log('📊 [MedicineSearchService] Starting barcode search for:', query);
          searchResults = await this.searchByBarcode(query, filters);
          break;
        case 'ingredient':
          console.log('🧪 [MedicineSearchService] Starting ingredient search for:', query);
          searchResults = await this.searchByIngredient(query, filters, pagination);
          break;
        case 'therapeutic':
          console.log('💊 [MedicineSearchService] Starting therapeutic search for:', query);
          searchResults = await this.searchByTherapeuticClass(query, filters, pagination);
          break;
        case 'text':
        default:
          console.log('📝 [MedicineSearchService] Starting text search for:', query);
          searchResults = await this.searchByText(query, filters, pagination, sortBy);
          break;
      }

      console.log('📊 [MedicineSearchService] Search completed. Results:', {
        success: searchResults.success,
        totalResults: searchResults.total,
        resultsCount: searchResults.results?.length || 0,
        searchMethod: searchResults.searchMethod
      });

      // Enhance results with availability and pharmacy data
      if (includeAvailability && location) {
        console.log('🏥 [MedicineSearchService] Enhancing results with pharmacy availability');
        searchResults = await this.enhanceWithAvailability(
          searchResults, 
          location, 
          pharmacyPreferences
        );
      }

      // Apply final sorting and filtering
      const finalResults = this.applyFinalProcessing(searchResults, sortBy, filters);
      console.log('✅ [MedicineSearchService] Final processing completed. Total results:', finalResults.total);

      // Cache results
      this.searchCache.set(cacheKey, {
        data: finalResults,
        timestamp: Date.now()
      });
      console.log('💾 [MedicineSearchService] Results cached for future use');

      return finalResults;

    } catch (error) {
      console.error('❌ [MedicineSearchService] Medicine search failed:', error);
      console.error('🔍 [MedicineSearchService] Search params that caused error:', searchParams);
      return {
        success: false,
        error: error.message,
        results: [],
        total: 0
      };
    }
  }

  /**
   * Search medicines by text query with advanced matching
   */
  async searchByText(query, filters = {}, pagination = {}, sortBy = 'relevance') {
    try {
      console.log('📝 [searchByText] Starting text search with:', {
        query,
        filters,
        pagination,
        sortBy
      });

      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;
      console.log('📄 [searchByText] Pagination settings:', { page, limit, skip });

      // First try text search
      let results = [];
      let totalCount = 0;
      let searchMethod = 'text';

      try {
        console.log('⚙️ [searchByText] Building text search pipeline...');
        
        const filterQuery = this.buildFilterQuery(filters);
        console.log('🔍 [searchByText] Filter query:', filterQuery);
        
        const matchStage = {
          $text: { $search: query },
          status: 'active',
          verificationStatus: { $in: ['verified', 'pending'] },
          ...filterQuery
        };
        console.log('🎯 [searchByText] Match stage for aggregation:', matchStage);
        
        // Build search pipeline for text search
        const searchPipeline = [
          {
            $match: matchStage
          },
          {
            $addFields: {
              textScore: { $meta: 'textScore' },
              relevanceScore: {
                $add: [
                  { $meta: 'textScore' },
                  { $multiply: ['$popularityScore', 0.01] },
                  { $cond: [{ $eq: ['$isPopular', true] }, 0.5, 0] }
                ]
              }
            }
          }
        ];

        // Apply sorting
        const sortStage = this.buildSortStage(sortBy);
        searchPipeline.push(sortStage);
        console.log('🔄 [searchByText] Added sort stage:', sortStage);

        // Add pagination
        searchPipeline.push({ $skip: skip });
        searchPipeline.push({ $limit: limit });
        console.log('📄 [searchByText] Added pagination: skip', skip, 'limit', limit);

        // Add lookup for related data
        searchPipeline.push(...this.buildLookupStages());
        
        console.log('▶️ [searchByText] Executing aggregation pipeline...');
        // Execute search
        results = await Medicine.aggregate(searchPipeline);
        console.log('📊 [searchByText] Aggregation results count:', results.length);
        
        // Get total count
        console.log('🔢 [searchByText] Getting total count with same match criteria...');
        const countQuery = {
          $text: { $search: query },
          status: 'active',
          verificationStatus: { $in: ['verified', 'pending'] },
          ...filterQuery
        };
        console.log('🔍 [searchByText] Count query:', countQuery);
        
        totalCount = await Medicine.countDocuments(countQuery);
        console.log('📊 [searchByText] Total count from countDocuments:', totalCount);

        console.log(`🔍 [searchByText] Text search for "${query}" found ${results.length} results (total: ${totalCount})`);

      } catch (textSearchError) {
        console.warn('🚨 [searchByText] Text search failed, falling back to regex search:', textSearchError.message);
        console.error('🔴 [searchByText] Text search error details:', textSearchError);
        results = [];
        totalCount = 0;
      }

      // If text search returns no results, use fallback regex search
      if (results.length === 0) {
        console.log(`🔄 [searchByText] Using fallback regex search for "${query}"`);
        searchMethod = 'regex_fallback';
        
        const regexQuery = {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { brandName: { $regex: query, $options: 'i' } },
            { genericName: { $regex: query, $options: 'i' } },
            { 'alternativeNames': { $elemMatch: { $regex: query, $options: 'i' } } },
            { 'searchTags': { $elemMatch: { $regex: query, $options: 'i' } } },
            { 'composition.activeIngredient': { $regex: query, $options: 'i' } }
          ],
          status: 'active',
          verificationStatus: { $in: ['verified', 'pending'] },
          ...this.buildFilterQuery(filters)
        };
        
        console.log('🔍 [searchByText] Regex query:', regexQuery);

        // Execute fallback search
        console.log('▶️ [searchByText] Executing regex fallback search...');
        results = await Medicine.find(regexQuery)
          .populate('pharmacyId', 'name address contact')
          .skip(skip)
          .limit(limit)
          .sort({ popularityScore: -1, name: 1 })
          .lean();

        console.log('📊 [searchByText] Regex search results count:', results.length);
        
        totalCount = await Medicine.countDocuments(regexQuery);
        console.log('📊 [searchByText] Regex search total count:', totalCount);
        
        console.log(`🔍 [searchByText] Regex fallback search for "${query}" found ${results.length} results (total: ${totalCount})`);
        
        // Log first few results for debugging
        if (results.length > 0) {
          console.log('📄 [searchByText] First few results:');
          results.slice(0, 3).forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.name} - Status: ${result.status}, Verification: ${result.verificationStatus}`);
          });
        }
      }

      // Update search analytics
      await this.updateSearchAnalytics(query, results.length);

      const searchResult = {
        success: true,
        results,
        total: totalCount,
        page,
        limit,
        searchType: 'text',
        searchMethod,
        query,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ [searchByText] Search completed successfully:', {
        success: searchResult.success,
        resultsCount: searchResult.results.length,
        total: searchResult.total,
        searchMethod: searchResult.searchMethod,
        query: searchResult.query
      });

      return searchResult;

    } catch (error) {
      console.error('❌ [searchByText] All search methods failed:', error);
      console.error('🔴 [searchByText] Error stack:', error.stack);
      throw new Error(`Text search failed: ${error.message}`);
    }
  }

  /**
   * Search medicines by image using AI recognition
   */
  async searchByImage(imageData, filters = {}, pagination = {}) {
    try {
      // First, analyze the image to identify the medicine
      const imageAnalysis = await this.imageRecognitionService.analyzeMedicineImage(imageData, {
        includeComposition: true,
        includeTherapeutic: true,
        includeManufacturer: true,
        visualFeatureAnalysis: true
      });

      if (!imageAnalysis.success) {
        throw new Error('Image analysis failed');
      }

      let searchResults = [];

      // If we have high confidence in identification, search for specific medicine
      if (imageAnalysis.confidence > 0.7 && imageAnalysis.analysis.medicineName) {
        const specificResults = await this.searchByText(
          imageAnalysis.analysis.medicineName,
          filters,
          pagination
        );
        searchResults = specificResults.results || [];
      }

      // Also perform visual similarity search
      const visualSimilarResults = await this.imageRecognitionService.findVisualSimilarMedicines(
        imageData,
        { limit: 10, minSimilarity: 0.6 }
      );

      // Merge results, prioritizing AI-identified medicines
      if (visualSimilarResults.success && visualSimilarResults.results.length > 0) {
        const visualMedicines = visualSimilarResults.results.map(item => ({
          ...item.medicine.toObject(),
          similarityScore: item.similarityScore,
          matchedFeatures: item.matchedFeatures,
          searchSource: 'visual_similarity'
        }));

        // Merge and deduplicate
        const mergedResults = this.mergeSearchResults(searchResults, visualMedicines);
        searchResults = mergedResults;
      }

      return {
        success: true,
        results: searchResults.slice(0, pagination.limit || 20),
        total: searchResults.length,
        imageAnalysis: imageAnalysis.analysis,
        confidence: imageAnalysis.confidence,
        searchType: 'image',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Image search failed: ${error.message}`);
    }
  }

  /**
   * Search medicines by barcode
   */
  async searchByBarcode(barcode, filters = {}) {
    try {
      const medicine = await Medicine.findByBarcode(barcode);
      
      if (!medicine) {
        return {
          success: true,
          results: [],
          total: 0,
          searchType: 'barcode',
          message: 'No medicine found with this barcode'
        };
      }

      // Apply filters if any
      const matchesFilters = this.checkMedicineAgainstFilters(medicine, filters);
      
      const results = matchesFilters ? [medicine] : [];

      return {
        success: true,
        results,
        total: results.length,
        searchType: 'barcode',
        barcode,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Barcode search failed: ${error.message}`);
    }
  }

  /**
   * Search medicines by active ingredient
   */
  async searchByIngredient(ingredient, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      
      const results = await Medicine.searchByIngredient(ingredient, {
        limit,
        skip: (page - 1) * limit
      });

      // Apply additional filters
      const filteredResults = results.filter(medicine => 
        this.checkMedicineAgainstFilters(medicine, filters)
      );

      // Get total count
      const totalCount = await Medicine.countDocuments({
        'composition.activeIngredient': new RegExp(ingredient, 'i'),
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] },
        ...this.buildFilterQuery(filters)
      });

      return {
        success: true,
        results: filteredResults,
        total: totalCount,
        page,
        limit,
        searchType: 'ingredient',
        ingredient,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Ingredient search failed: ${error.message}`);
    }
  }

  /**
   * Search medicines by therapeutic class
   */
  async searchByTherapeuticClass(therapeuticClass, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      
      const results = await Medicine.findByTherapeuticClass(therapeuticClass, {
        limit,
        skip: (page - 1) * limit
      });

      // Apply additional filters
      const filteredResults = results.filter(medicine => 
        this.checkMedicineAgainstFilters(medicine, filters)
      );

      return {
        success: true,
        results: filteredResults,
        total: filteredResults.length,
        page,
        limit,
        searchType: 'therapeutic',
        therapeuticClass,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Therapeutic class search failed: ${error.message}`);
    }
  }

  /**
   * Get medicine suggestions and recommendations
   */
  async getMedicineSuggestions(medicineId, options = {}) {
    try {
      const { 
        includeAlternatives = true,
        includeGeneric = true,
        includeSimilar = true,
        limit = 10 
      } = options;

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        throw new Error('Medicine not found');
      }

      const suggestions = {
        alternatives: [],
        genericVersions: [],
        similarMedicines: [],
        recommendations: []
      };

      // Find alternative medicines (same therapeutic class)
      if (includeAlternatives) {
        suggestions.alternatives = await Medicine.findByTherapeuticClass(
          medicine.therapeutic.therapeuticClass,
          { limit: 5 }
        ).then(results => results.filter(med => med._id.toString() !== medicineId));
      }

      // Find generic versions (same active ingredient but different brand)
      if (includeGeneric) {
        const activeIngredients = medicine.composition
          .filter(comp => comp.role === 'active')
          .map(comp => comp.activeIngredient);

        suggestions.genericVersions = await Medicine.find({
          'composition.activeIngredient': { $in: activeIngredients },
          _id: { $ne: medicineId },
          'pricing.sellingPrice': { $lt: medicine.pricing.sellingPrice },
          status: 'active',
          verificationStatus: 'verified'
        })
        .sort({ 'pricing.sellingPrice': 1 })
        .limit(5);
      }

      // Find similar medicines
      if (includeSimilar) {
        suggestions.similarMedicines = await Medicine.findSimilar(medicineId, 5);
      }

      // Generate AI-powered recommendations
      suggestions.recommendations = await this.generateAIRecommendations(medicine);

      return {
        success: true,
        medicine,
        suggestions,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to get suggestions: ${error.message}`);
    }
  }

  /**
   * Enhance search results with pharmacy availability
   */
  async enhanceWithAvailability(searchResults, location, pharmacyPreferences = {}) {
    try {
      const { coordinates, radius = this.defaultSearchRadius } = location;
      const {
        preferredPaymentMethods = [],
        requireDelivery = false,
        maxDistance = radius
      } = pharmacyPreferences;

      // Find nearby pharmacies
      const nearbyPharmacies = await Pharmacy.findNearby(
        coordinates,
        maxDistance,
        {
          isActive: true,
          isVerified: true,
          registrationStatus: 'approved'
        }
      );

      // Filter pharmacies by preferences
      let filteredPharmacies = nearbyPharmacies;
      
      if (preferredPaymentMethods.length > 0) {
        filteredPharmacies = filteredPharmacies.filter(pharmacy =>
          preferredPaymentMethods.some(method => 
            pharmacy.getActivePaymentMethods().includes(method)
          )
        );
      }

      if (requireDelivery) {
        filteredPharmacies = filteredPharmacies.filter(pharmacy => 
          pharmacy.hasActiveDelivery
        );
      }

      const pharmacyIds = filteredPharmacies.map(p => p._id);

      // Enhance each medicine with availability data
      const enhancedResults = await Promise.all(
        searchResults.results.map(async (medicine) => {
          const availability = await this.getMedicineAvailability(
            medicine,
            pharmacyIds
          );

          return {
            ...medicine,
            availability,
            nearbyPharmaciesCount: availability.availableAt.length,
            bestPrice: availability.priceRange?.min || null,
            estimatedDeliveryTime: this.calculateEstimatedDelivery(
              availability.availableAt,
              filteredPharmacies
            )
          };
        })
      );

      return {
        ...searchResults,
        results: enhancedResults,
        nearbyPharmacies: filteredPharmacies.map(pharmacy => ({
          id: pharmacy._id,
          name: pharmacy.name,
          distance: pharmacy.calculateDistance(coordinates),
          paymentMethods: pharmacy.getActivePaymentMethods(),
          hasDelivery: pharmacy.hasActiveDelivery,
          rating: pharmacy.rating.averageRating
        }))
      };

    } catch (error) {
      console.error('Failed to enhance with availability:', error);
      return searchResults; // Return original results if enhancement fails
    }
  }

  /**
   * Get availability of a specific medicine across pharmacies
   */
  async getMedicineAvailability(medicine, pharmacyIds = []) {
    try {
      // Since aggregation results are plain objects, implement availability check directly
      const availableInventory = [];
      
      if (medicine.pharmacyInventory && Array.isArray(medicine.pharmacyInventory)) {
        for (const inventory of medicine.pharmacyInventory) {
          // Filter by pharmacy IDs if provided
          if (pharmacyIds.length > 0 && !pharmacyIds.includes(inventory.pharmacyId?.toString())) {
            continue;
          }
          
          // Only include available inventory
          if (['available', 'low-stock'].includes(inventory.status) && inventory.quantityAvailable > 0) {
            availableInventory.push({
              pharmacyId: inventory.pharmacyId,
              pricePerUnit: inventory.pricePerUnit,
              quantityAvailable: inventory.quantityAvailable,
              status: inventory.status,
              expiryDate: inventory.expiryDate
            });
          }
        }
      }
      
      const availableAt = availableInventory.map(inventory => ({
        pharmacy: inventory.pharmacyId,
        price: inventory.pricePerUnit,
        quantity: inventory.quantityAvailable,
        status: inventory.status,
        expiryDate: inventory.expiryDate
      }));

      const prices = availableAt.map(item => item.price).filter(price => price > 0);
      
      return {
        isAvailable: availableInventory.length > 0,
        availableAt,
        totalQuantity: availableInventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
        priceRange: prices.length > 0 ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          average: prices.reduce((sum, price) => sum + price, 0) / prices.length
        } : null
      };

    } catch (error) {
      console.error('Failed to get medicine availability:', error);
      return {
        isAvailable: false,
        availableAt: [],
        totalQuantity: 0,
        priceRange: null
      };
    }
  }

  /**
   * Build filter query for MongoDB
   */
  buildFilterQuery(filters) {
    const query = {};
    console.log('🔧 [buildFilterQuery] Input filters:', filters);

    if (filters.therapeuticClass && filters.therapeuticClass.trim() !== '') {
      query['therapeutic.therapeuticClass'] = new RegExp(filters.therapeuticClass, 'i');
      console.log('🔧 [buildFilterQuery] Added therapeutic class filter:', filters.therapeuticClass);
    }

    if (filters.dosageForm && filters.dosageForm.trim() !== '') {
      query['dosageForm.form'] = filters.dosageForm;
      console.log('🔧 [buildFilterQuery] Added dosage form filter:', filters.dosageForm);
    }

    if (filters.manufacturer && filters.manufacturer.trim() !== '') {
      query['manufacturer.name'] = new RegExp(filters.manufacturer, 'i');
      console.log('🔧 [buildFilterQuery] Added manufacturer filter:', filters.manufacturer);
    }

    // FIXED: Properly validate price range inputs to avoid empty string filters
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      
      // Convert to numbers and validate
      const minPrice = min !== undefined && min !== null && min !== '' ? Number(min) : null;
      const maxPrice = max !== undefined && max !== null && max !== '' ? Number(max) : null;
      
      // Only add valid price filters
      if (minPrice !== null && !isNaN(minPrice) && minPrice >= 0) {
        query['pricing.sellingPrice'] = { ...query['pricing.sellingPrice'], $gte: minPrice };
        console.log('🔧 [buildFilterQuery] Added min price filter:', minPrice);
      }
      
      if (maxPrice !== null && !isNaN(maxPrice) && maxPrice > 0) {
        query['pricing.sellingPrice'] = { ...query['pricing.sellingPrice'], $lte: maxPrice };
        console.log('🔧 [buildFilterQuery] Added max price filter:', maxPrice);
      }
      
      // Log if price range was skipped due to invalid values
      if ((min !== undefined && min !== null && min !== '' && (isNaN(Number(min)) || Number(min) < 0)) ||
          (max !== undefined && max !== null && max !== '' && (isNaN(Number(max)) || Number(max) <= 0))) {
        console.log('⚠️ [buildFilterQuery] Skipped invalid price range filters - min:', min, 'max:', max);
      }
    }

    // FIXED: Only apply prescription filter when explicitly requested
    // Don't filter by prescription status when requiresPrescription is null/undefined
    if (filters.requiresPrescription === true) {
      query['regulatory.scheduleClass'] = { $ne: 'OTC' };
      console.log('🔧 [buildFilterQuery] Added prescription required filter');
    } else if (filters.requiresPrescription === false) {
      query['regulatory.scheduleClass'] = 'OTC';
      console.log('🔧 [buildFilterQuery] Added OTC only filter');
    } else {
      console.log('🔧 [buildFilterQuery] No prescription filter applied (allowing both OTC and prescription medicines)');
    }

    if (filters.isPopular === true) {
      query.isPopular = true;
      console.log('🔧 [buildFilterQuery] Added popular filter');
    }

    console.log('🔧 [buildFilterQuery] Final query:', query);
    return query;
  }

  /**
   * Build sort stage for aggregation pipeline
   */
  buildSortStage(sortBy) {
    switch (sortBy) {
      case 'price_low':
        return { $sort: { 'pricing.sellingPrice': 1, relevanceScore: -1 } };
      case 'price_high':
        return { $sort: { 'pricing.sellingPrice': -1, relevanceScore: -1 } };
      case 'popularity':
        return { $sort: { popularityScore: -1, relevanceScore: -1 } };
      case 'rating':
        return { $sort: { 'analytics.averageRating': -1, relevanceScore: -1 } };
      case 'newest':
        return { $sort: { createdAt: -1, relevanceScore: -1 } };
      case 'relevance':
      default:
        return { $sort: { relevanceScore: -1, popularityScore: -1 } };
    }
  }

  /**
   * Build lookup stages for additional data
   */
  buildLookupStages() {
    return [
      // Lookup pharmacy information
      {
        $lookup: {
          from: 'pharmacies',
          localField: 'pharmacyId',
          foreignField: '_id',
          as: 'pharmacyId',
          pipeline: [
            {
              $project: {
                name: 1,
                address: 1,
                contact: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      // Unwind pharmacy array to object (since it's a single reference)
      {
        $unwind: {
          path: '$pharmacyId',
          preserveNullAndEmptyArrays: true
        }
      },
      // Project the fields we need
      {
        $project: {
          name: 1,
          brandName: 1,
          genericName: 1,
          composition: 1,
          dosageForm: 1,
          manufacturer: 1,
          pricing: 1,
          imageData: 1,
          therapeutic: 1,
          popularityScore: 1,
          isPopular: 1,
          analytics: 1,
          textScore: 1,
          relevanceScore: 1,
          status: 1,
          verificationStatus: 1,
          pharmacyId: 1  // Include pharmacy information
        }
      }
    ];
  }

  /**
   * Check if medicine matches given filters
   */
  checkMedicineAgainstFilters(medicine, filters) {
    if (filters.therapeuticClass && 
        !medicine.therapeutic.therapeuticClass.toLowerCase().includes(filters.therapeuticClass.toLowerCase())) {
      return false;
    }

    if (filters.dosageForm && medicine.dosageForm.form !== filters.dosageForm) {
      return false;
    }

    if (filters.priceRange) {
      const price = medicine.currentPrice;
      if (filters.priceRange.min && price < filters.priceRange.min) return false;
      if (filters.priceRange.max && price > filters.priceRange.max) return false;
    }

    return true;
  }

  /**
   * Merge and deduplicate search results from different sources
   */
  mergeSearchResults(textResults, visualResults) {
    const merged = [...textResults];
    const existingIds = new Set(textResults.map(med => med._id?.toString()));

    visualResults.forEach(visualMed => {
      const medId = visualMed._id?.toString();
      if (!existingIds.has(medId)) {
        merged.push(visualMed);
        existingIds.add(medId);
      }
    });

    // Sort by relevance/similarity scores
    return merged.sort((a, b) => {
      const scoreA = a.relevanceScore || a.similarityScore || 0;
      const scoreB = b.relevanceScore || b.similarityScore || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Apply final processing to search results
   */
  applyFinalProcessing(searchResults, sortBy, filters) {
    let results = searchResults.results || [];

    // Apply any additional filtering
    if (filters.minRating) {
      results = results.filter(med => 
        (med.analytics?.averageRating || 0) >= filters.minRating
      );
    }

    // Update total count
    const total = results.length;

    return {
      ...searchResults,
      results,
      total,
      appliedFilters: filters,
      sortBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate cache key for search results
   */
  generateCacheKey(searchParams) {
    const { query, searchType, filters, pagination, location } = searchParams;
    return `search:${searchType}:${query}:${JSON.stringify({ filters, pagination, location })}`;
  }

  /**
   * Update search analytics
   */
  async updateSearchAnalytics(query, resultCount) {
    try {
      console.log(`📊 [updateSearchAnalytics] Recording search: "${query}" -> ${resultCount} results`);
      
      // Log search statistics for monitoring
      const timestamp = new Date();
      console.log(`🕰 [updateSearchAnalytics] Search timestamp: ${timestamp.toISOString()}`);
      console.log(`📈 [updateSearchAnalytics] Query length: ${query.length} characters`);
      console.log(`🎯 [updateSearchAnalytics] Success rate: ${resultCount > 0 ? 'SUCCESS' : 'NO_RESULTS'}`);
      
      // Update search count for medicines in results
      // This could be enhanced to track search trends
      console.log(`📋 [updateSearchAnalytics] Search performed: "${query}" returned ${resultCount} results`);
      
      // You could add more analytics here, such as:
      // - Storing search queries in database
      // - Tracking popular search terms
      // - Monitoring search performance
      
    } catch (error) {
      console.error('❌ [updateSearchAnalytics] Failed to update search analytics:', error);
    }
  }

  /**
   * Calculate estimated delivery time based on pharmacy capabilities
   */
  calculateEstimatedDelivery(availableAt, pharmacies) {
    if (availableAt.length === 0) return null;

    const pharmacyMap = new Map(pharmacies.map(p => [p._id.toString(), p]));
    
    let minDeliveryTime = Infinity;
    
    availableAt.forEach(availability => {
      const pharmacy = pharmacyMap.get(availability.pharmacy._id.toString());
      if (pharmacy && pharmacy.hasActiveDelivery) {
        const estimatedTime = pharmacy.getEstimatedFulfillmentTime();
        minDeliveryTime = Math.min(minDeliveryTime, estimatedTime);
      }
    });

    return minDeliveryTime === Infinity ? null : `${minDeliveryTime} minutes`;
  }

  /**
   * Generate AI-powered recommendations
   */
  async generateAIRecommendations(medicine) {
    try {
      // This could be enhanced with more sophisticated AI recommendations
      const recommendations = [];

      // Price-based recommendation
      if (medicine.pricing.discountPercentage > 10) {
        recommendations.push({
          type: 'discount',
          message: `Currently ${medicine.pricing.discountPercentage}% off - great value!`,
          priority: 'high'
        });
      }

      // Popularity recommendation
      if (medicine.isPopular) {
        recommendations.push({
          type: 'popular',
          message: 'Popular choice among customers',
          priority: 'medium'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Get search statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.searchCache.size,
      cacheTimeout: this.cacheTimeout,
      lastClearTime: new Date().toISOString()
    };
  }

  /**
   * Debug method to log database statistics
   */
  async logDatabaseStats() {
    try {
      console.log('\n📊 [Database Statistics] Starting database analysis...');
      
      // Total medicine count
      const totalMedicines = await Medicine.countDocuments();
      console.log(`📊 [Database] Total medicines: ${totalMedicines}`);
      
      // Status breakdown
      const activeCount = await Medicine.countDocuments({ status: 'active' });
      const inactiveCount = await Medicine.countDocuments({ status: { $ne: 'active' } });
      console.log(`📊 [Database] Active medicines: ${activeCount}`);
      console.log(`📊 [Database] Inactive medicines: ${inactiveCount}`);
      
      // Verification status breakdown
      const verifiedCount = await Medicine.countDocuments({ verificationStatus: 'verified' });
      const pendingCount = await Medicine.countDocuments({ verificationStatus: 'pending' });
      const rejectedCount = await Medicine.countDocuments({ verificationStatus: 'rejected' });
      console.log(`📊 [Database] Verified medicines: ${verifiedCount}`);
      console.log(`📊 [Database] Pending medicines: ${pendingCount}`);
      console.log(`📊 [Database] Rejected medicines: ${rejectedCount}`);
      
      // Search-ready medicines (active + verified/pending)
      const searchReadyCount = await Medicine.countDocuments({
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      });
      console.log(`🔍 [Database] Search-ready medicines: ${searchReadyCount}`);
      
      // Test specific Augmentin search
      console.log('\n🔍 [Database] Testing Augmentin queries...');
      
      // Simple name search
      const augmentinByName = await Medicine.countDocuments({
        name: { $regex: 'Augmentin', $options: 'i' },
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      });
      console.log(`🔍 [Database] Augmentin by name (no filters): ${augmentinByName}`);
      
      // Check prescription status distribution
      const otcCount = await Medicine.countDocuments({ 'regulatory.scheduleClass': 'OTC' });
      const prescriptionCount = await Medicine.countDocuments({ 'regulatory.scheduleClass': { $ne: 'OTC' } });
      console.log(`📊 [Database] OTC medicines: ${otcCount}`);
      console.log(`📊 [Database] Prescription medicines: ${prescriptionCount}`);
      
      // Sample medicines for verification
      if (totalMedicines > 0) {
        console.log('\n📄 [Database] Sample medicines:');
        const samples = await Medicine.find()
          .limit(5)
          .select('name brandName genericName status verificationStatus regulatory.scheduleClass')
          .lean();
        
        samples.forEach((medicine, index) => {
          console.log(`  ${index + 1}. "${medicine.name}" - Status: ${medicine.status}, Verification: ${medicine.verificationStatus}, Schedule: ${medicine.regulatory?.scheduleClass || 'N/A'}`);
        });
      }
      
      // Check for indexes
      console.log('\n📋 [Database] Checking search indexes...');
      const indexes = await Medicine.collection.indexes();
      const textIndexes = indexes.filter(index => index.name.includes('text') || JSON.stringify(index.key).includes('text'));
      console.log(`📋 [Database] Total indexes: ${indexes.length}`);
      console.log(`🔍 [Database] Text indexes: ${textIndexes.length}`);
      
      if (textIndexes.length > 0) {
        textIndexes.forEach((index, i) => {
          console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } else {
        console.warn('⚠️ [Database] No text indexes found! This explains why text search is failing.');
      }
      
      console.log('📊 [Database Statistics] Analysis completed\n');
      
    } catch (error) {
      console.error('❌ [Database Statistics] Failed to get database stats:', error);
    }
  }

  /**
   * Test method to verify basic search functionality
   */
  async testBasicSearch(query = 'Augmentin') {
    try {
      console.log(`\n🧪 [Test] Testing basic search for "${query}"...`);
      
      // Test 1: Simple name search without any filters
      const simpleResults = await Medicine.find({
        name: { $regex: query, $options: 'i' },
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      }).limit(5);
      console.log(`🧪 [Test] Simple name search results: ${simpleResults.length}`);
      
      // Test 2: Multiple field search without filters
      const multiFieldResults = await Medicine.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brandName: { $regex: query, $options: 'i' } },
          { genericName: { $regex: query, $options: 'i' } }
        ],
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      }).limit(5);
      console.log(`🧪 [Test] Multi-field search results: ${multiFieldResults.length}`);
      
      if (multiFieldResults.length > 0) {
        console.log('🧪 [Test] Found medicines:');
        multiFieldResults.forEach((med, i) => {
          console.log(`  ${i + 1}. ${med.name} - Schedule: ${med.regulatory?.scheduleClass}`);
        });
      }
      
      // Test 3: Text search if indexes exist
      try {
        const textResults = await Medicine.find({
          $text: { $search: query },
          status: 'active',
          verificationStatus: { $in: ['verified', 'pending'] }
        }).limit(5);
        console.log(`🧪 [Test] Text search results: ${textResults.length}`);
      } catch (error) {
        console.log(`🧪 [Test] Text search failed: ${error.message}`);
      }
      
      console.log('🧪 [Test] Basic search test completed\n');
      
    } catch (error) {
      console.error('❌ [Test] Basic search test failed:', error);
    }
  }
}

export default MedicineSearchService;