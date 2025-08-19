import express from 'express';
import PharmacyMatchingService from '../services/PharmacyMatchingService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validation.js';
import { body, query } from 'express-validator';
import { calculateDistance, formatDistance, formatEstimatedTime } from '../utils/geospatial.js';

const router = express.Router();
const pharmacyMatchingService = new PharmacyMatchingService();

/**
 * @route   GET /api/v1/pharmacies/nearby
 * @desc    Find nearby pharmacies using geospatial queries
 * @access  Private
 */
router.get('/nearby',
  authenticate,
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    query('maxDistance')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max distance must be between 1 and 100 km'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { latitude, longitude, maxDistance = 25, limit = 20 } = req.query;
      const {
        requiredServices,
        medications,
        urgency = 'normal',
        acceptsInsurance,
        hasDelivery,
        isOpen24Hours
      } = req.query;

      const location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      const filters = {
        requiredServices: requiredServices ? requiredServices.split(',') : [],
        medications: medications ? medications.split(',') : [],
        urgency,
        acceptsInsurance: acceptsInsurance === 'true',
        hasDelivery: hasDelivery === 'true',
        isOpen24Hours: isOpen24Hours === 'true',
        limit: parseInt(limit)
      };

      const nearbyPharmacies = await pharmacyMatchingService.findNearbyPharmacies(
        location,
        parseInt(maxDistance),
        filters
      );

      // Filter by medication availability if requested
      let filteredPharmacies = nearbyPharmacies;
      if (filters.medications.length > 0) {
        filteredPharmacies = await pharmacyMatchingService.filterByMedicationAvailability(
          nearbyPharmacies,
          filters.medications
        );
      }

      res.json({
        success: true,
        data: {
          location,
          searchRadius: parseInt(maxDistance),
          totalFound: filteredPharmacies.length,
          pharmacies: filteredPharmacies.map(pharmacy => ({
            ...pharmacy,
            distanceFormatted: formatDistance(pharmacy.distanceKm),
            estimatedTimeFormatted: formatEstimatedTime(pharmacy.estimatedFulfillmentTime)
          }))
        },
        meta: {
          searchCriteria: filters,
          searchTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error finding nearby pharmacies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find nearby pharmacies',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/pharmacies/calculate-score
 * @desc    Calculate pharmacy score based on multiple factors
 * @access  Private
 */
router.post('/calculate-score',
  authenticate,
  [
    body('pharmacyId')
      .isMongoId()
      .withMessage('Valid pharmacy ID is required'),
    body('userLocation')
      .isObject()
      .withMessage('User location is required'),
    body('userLocation.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude is required'),
    body('userLocation.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { pharmacyId, userLocation, userPreferences = {} } = req.body;

      // Get pharmacy details
      const pharmacy = await req.app.get('db').collection('pharmacies').findOne({
        _id: new req.app.get('ObjectId')(pharmacyId)
      });

      if (!pharmacy) {
        return res.status(404).json({
          success: false,
          message: 'Pharmacy not found'
        });
      }

      // Calculate distance
      const distance = calculateDistance(
        pharmacy.location.coordinates[1], // latitude
        pharmacy.location.coordinates[0], // longitude
        userLocation.latitude,
        userLocation.longitude
      );

      // Calculate pharmacy score
      const score = pharmacyMatchingService.calculatePharmacyScore(
        pharmacy,
        distance,
        userPreferences
      );

      res.json({
        success: true,
        data: {
          pharmacyId,
          pharmacyName: pharmacy.name,
          distance,
          distanceFormatted: formatDistance(distance),
          score,
          scoreBreakdown: {
            distanceScore: Math.max(0, 100 - (distance / 25) * 100),
            ratingScore: (pharmacy.averageRating || 0) * 20,
            speedScore: Math.max(0, 100 - ((pharmacy.averageProcessingTime || 60) / 120) * 100),
            servicesScore: pharmacyMatchingService._calculateServicesScore(
              pharmacy.services,
              userPreferences.requiredServices
            ),
            availabilityScore: pharmacyMatchingService._calculateAvailabilityScore(pharmacy)
          }
        }
      });
    } catch (error) {
      console.error('Error calculating pharmacy score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate pharmacy score',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/pharmacies/notify-prescription-request
 * @desc    Notify selected pharmacies about prescription request
 * @access  Private
 */
router.post('/notify-prescription-request',
  authenticate,
  [
    body('pharmacyIds')
      .isArray({ min: 1 })
      .withMessage('At least one pharmacy ID is required'),
    body('pharmacyIds.*')
      .isMongoId()
      .withMessage('Valid pharmacy IDs are required'),
    body('prescriptionRequest')
      .isObject()
      .withMessage('Prescription request data is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { pharmacyIds, prescriptionRequest } = req.body;

      const notificationResults = await pharmacyMatchingService.notifyPharmacies(
        pharmacyIds,
        prescriptionRequest
      );

      res.json({
        success: true,
        data: notificationResults,
        message: `Notifications sent to ${notificationResults.notificationsSent} pharmacies`
      });
    } catch (error) {
      console.error('Error notifying pharmacies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to notify pharmacies',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/v1/pharmacies/recommendations
 * @desc    Get personalized pharmacy recommendations
 * @access  Private
 */
router.get('/recommendations',
  authenticate,
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      const userId = req.user.id;

      const location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      const preferences = {
        requiredServices: req.query.requiredServices?.split(',') || [],
        urgency: req.query.urgency || 'normal',
        acceptsInsurance: req.query.acceptsInsurance === 'true',
        hasDelivery: req.query.hasDelivery === 'true'
      };

      const recommendations = await pharmacyMatchingService.getPersonalizedRecommendations(
        userId,
        location,
        preferences
      );

      res.json({
        success: true,
        data: {
          userId,
          location,
          totalRecommendations: recommendations.length,
          recommendations: recommendations.map(pharmacy => ({
            ...pharmacy,
            distanceFormatted: formatDistance(pharmacy.distanceKm),
            estimatedTimeFormatted: formatEstimatedTime(pharmacy.estimatedFulfillmentTime)
          }))
        },
        meta: {
          basedOnHistory: true,
          preferences,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized recommendations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/pharmacies/check-medication-availability
 * @desc    Check medication availability across multiple pharmacies
 * @access  Private
 */
router.post('/check-medication-availability',
  authenticate,
  [
    body('pharmacyIds')
      .isArray({ min: 1 })
      .withMessage('At least one pharmacy ID is required'),
    body('medications')
      .isArray({ min: 1 })
      .withMessage('At least one medication is required'),
    body('medications.*')
      .isString()
      .notEmpty()
      .withMessage('Medication names must be non-empty strings')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { pharmacyIds, medications } = req.body;

      const availabilityResults = await Promise.all(
        pharmacyIds.map(async (pharmacyId) => {
          const availability = await pharmacyMatchingService._checkMedicationAvailability(
            pharmacyId,
            medications
          );

          const pharmacy = await req.app.get('db').collection('pharmacies').findOne({
            _id: new req.app.get('ObjectId')(pharmacyId)
          });

          return {
            pharmacyId,
            pharmacyName: pharmacy?.name || 'Unknown',
            medicationAvailability: availability,
            availableCount: availability.filter(med => med.available).length,
            totalRequested: medications.length,
            hasAllMedications: availability.every(med => med.available),
            totalEstimatedCost: availability.reduce((sum, med) => 
              sum + (med.available ? (med.price || 0) : 0), 0
            )
          };
        })
      );

      // Sort by availability (most available first)
      availabilityResults.sort((a, b) => {
        if (a.hasAllMedications && !b.hasAllMedications) return -1;
        if (!a.hasAllMedications && b.hasAllMedications) return 1;
        return b.availableCount - a.availableCount;
      });

      res.json({
        success: true,
        data: {
          medications,
          pharmacyCount: pharmacyIds.length,
          results: availabilityResults,
          summary: {
            pharmaciesWithAllMedications: availabilityResults.filter(r => r.hasAllMedications).length,
            averageAvailability: availabilityResults.reduce((sum, r) => 
              sum + (r.availableCount / r.totalRequested), 0
            ) / availabilityResults.length
          }
        }
      });
    } catch (error) {
      console.error('Error checking medication availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check medication availability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/v1/pharmacies/coverage-analysis
 * @desc    Analyze pharmacy coverage for a given area
 * @access  Private (Admin only)
 */
router.get('/coverage-analysis',
  authenticate,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      const {
        north,
        south,
        east,
        west,
        gridSize = 5,
        maxDistance = 10
      } = req.query;

      if (!north || !south || !east || !west) {
        return res.status(400).json({
          success: false,
          message: 'Bounding box coordinates (north, south, east, west) are required'
        });
      }

      const boundingBox = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      };

      // Generate coverage grid
      const { generateCoverageGrid } = await import('../utils/geospatial.js');
      const grid = generateCoverageGrid(boundingBox, parseInt(gridSize));

      // Get all pharmacies in the area
      const pharmacies = await req.app.get('db').collection('pharmacies').find({
        status: 'approved',
        isActive: true,
        location: {
          $geoWithin: {
            $box: [
              [boundingBox.west, boundingBox.south],
              [boundingBox.east, boundingBox.north]
            ]
          }
        }
      }).toArray();

      // Analyze coverage for each grid point
      const analysisResults = grid.map(gridPoint => {
        const nearbyPharmacies = pharmacies
          .map(pharmacy => ({
            ...pharmacy,
            distance: calculateDistance(
              gridPoint.latitude,
              gridPoint.longitude,
              pharmacy.location.coordinates[1],
              pharmacy.location.coordinates[0]
            )
          }))
          .filter(pharmacy => pharmacy.distance <= maxDistance)
          .sort((a, b) => a.distance - b.distance);

        return {
          ...gridPoint,
          covered: nearbyPharmacies.length > 0,
          nearestPharmacies: nearbyPharmacies.slice(0, 3),
          averageDistance: nearbyPharmacies.length > 0 ? 
            nearbyPharmacies.reduce((sum, p) => sum + p.distance, 0) / nearbyPharmacies.length : null,
          pharmacyCount: nearbyPharmacies.length
        };
      });

      const coverageStats = {
        totalGridPoints: grid.length,
        coveredPoints: analysisResults.filter(point => point.covered).length,
        coveragePercentage: (analysisResults.filter(point => point.covered).length / grid.length) * 100,
        averagePharmaciesPerPoint: analysisResults.reduce((sum, point) => sum + point.pharmacyCount, 0) / grid.length,
        undergreenPrescriptiondsAreas: analysisResults.filter(point => point.pharmacyCount === 0),
        wellCoveredAreas: analysisResults.filter(point => point.pharmacyCount >= 3)
      };

      res.json({
        success: true,
        data: {
          boundingBox,
          gridSize: parseInt(gridSize),
          maxDistance: parseInt(maxDistance),
          pharmacyCount: pharmacies.length,
          coverageAnalysis: analysisResults,
          statistics: coverageStats
        }
      });
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze pharmacy coverage',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;
