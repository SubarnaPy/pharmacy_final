import mongoose from 'mongoose';
import { calculateDistance, calculateEstimatedTime } from '../utils/geospatial.js';
import Pharmacy from '../models/Pharmacy.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import NotificationService from './RealTimeNotificationService.js';

/**
 * Pharmacy Matching Algorithm Service
 * Handles geospatial queries, distance calculations, and pharmacy ranking
 */
class PharmacyMatchingService {
  constructor(io) {
    this.notificationService = new NotificationService(io);
  }

  /**
   * Find nearby pharmacies using geospatial queries
   * @param {Object} location - User's location {latitude, longitude}
   * @param {number} maxDistance - Maximum search radius in kilometers
   * @param {Object} filters - Additional filters (services, availability, etc.)
   * @returns {Array} Array of nearby pharmacies with distance and ranking
   */
  async findNearbyPharmacies(location, maxDistance = 25, filters = {}) {
    try {
      const { latitude, longitude } = location;
      
      // Build aggregation pipeline for geospatial query
      const pipeline = [
        // Geospatial stage - find pharmacies within radius
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            distanceField: 'distance',
            maxDistance: maxDistance * 1000, // Convert km to meters
            spherical: true,
            query: {
              status: 'approved',
              isActive: true,
              ...this._buildStatusFilters(filters)
            }
          }
        },
        
        // Lookup inventory data for availability checking
        {
          $lookup: {
            from: 'inventories',
            localField: '_id',
            foreignField: 'pharmacy',
            as: 'inventory'
          }
        },
        
        // Lookup pharmacy reviews and ratings
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'pharmacy',
            as: 'reviews'
          }
        },
        
        // Add calculated fields
        {
          $addFields: {
            distanceKm: { $divide: ['$distance', 1000] },
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: '$reviews' }, 0] },
                then: { $avg: '$reviews.rating' },
                else: 0
              }
            },
            totalReviews: { $size: '$reviews' },
            availableServices: {
              $filter: {
                input: [
                  { service: 'prescriptionFulfillment', available: '$services.prescriptionFulfillment' },
                  { service: 'consultation', available: '$services.consultation' },
                  { service: 'delivery', available: '$services.delivery' },
                  { service: 'vaccination', available: '$services.vaccination' },
                  { service: 'compounding', available: '$services.compounding' }
                ],
                cond: '$$this.available'
              }
            }
          }
        },
        
        // Apply service filters
        ...(filters.requiredServices ? [this._buildServiceFilter(filters.requiredServices)] : []),
        
        // Apply availability filters
        ...(filters.medications ? [await this._buildMedicationAvailabilityFilter(filters.medications)] : []),
        
        // Calculate pharmacy score
        {
          $addFields: {
            pharmacyScore: this._buildScoringFormula()
          }
        },
        
        // Sort by score (highest first)
        { $sort: { pharmacyScore: -1, distanceKm: 1 } },
        
        // Limit results
        { $limit: filters.limit || 50 },
        
        // Project final fields
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            location: 1,
            phone: 1,
            email: 1,
            services: 1,
            operatingHours: 1,
            distanceKm: { $round: ['$distanceKm', 2] },
            averageRating: { $round: ['$averageRating', 1] },
            totalReviews: 1,
            pharmacyScore: { $round: ['$pharmacyScore', 2] },
            estimatedFulfillmentTime: this._calculateEstimatedTime('$distanceKm', '$averageProcessingTime'),
            availableServices: 1,
            deliveryRadius: 1,
            acceptsInsurance: 1,
            lastActive: 1
          }
        }
      ];

      const nearbyPharmacies = await Pharmacy.aggregate(pipeline);
      
      // Add real-time availability and estimated times
      const enrichedPharmacies = await Promise.all(
        nearbyPharmacies.map(async (pharmacy) => {
          const availability = await this._checkRealTimeAvailability(pharmacy._id);
          const estimatedTime = await this._calculateDetailedEstimatedTime(
            pharmacy.distanceKm,
            pharmacy._id,
            filters.urgency || 'normal'
          );
          
          return {
            ...pharmacy,
            currentAvailability: availability,
            estimatedFulfillmentTime: estimatedTime,
            canDeliver: this._canDeliver(pharmacy, location),
            businessHours: this._getCurrentBusinessHours(pharmacy.operatingHours)
          };
        })
      );

      return enrichedPharmacies;
    } catch (error) {
      console.error('Error finding nearby pharmacies:', error);
      throw new Error('Failed to find nearby pharmacies');
    }
  }

  /**
   * Calculate pharmacy scoring based on multiple factors
   * @param {Object} pharmacy - Pharmacy data
   * @param {number} distance - Distance in kilometers
   * @param {Object} userPreferences - User preferences and requirements
   * @returns {number} Pharmacy score (0-100)
   */
  calculatePharmacyScore(pharmacy, distance, userPreferences = {}) {
    const weights = {
      distance: 0.3,
      rating: 0.25,
      speed: 0.2,
      services: 0.15,
      availability: 0.1
    };

    // Distance score (closer is better, max 25km)
    const distanceScore = Math.max(0, 100 - (distance / 25) * 100);

    // Rating score (0-5 stars converted to 0-100)
    const ratingScore = (pharmacy.averageRating || 0) * 20;

    // Speed score (based on average processing time)
    const avgProcessingTime = pharmacy.averageProcessingTime || 60; // minutes
    const speedScore = Math.max(0, 100 - (avgProcessingTime / 120) * 100);

    // Services score (percentage of required services available)
    const servicesScore = this._calculateServicesScore(pharmacy.services, userPreferences.requiredServices);

    // Availability score (based on current capacity and hours)
    const availabilityScore = this._calculateAvailabilityScore(pharmacy);

    // Calculate weighted total
    const totalScore = (
      distanceScore * weights.distance +
      ratingScore * weights.rating +
      speedScore * weights.speed +
      servicesScore * weights.services +
      availabilityScore * weights.availability
    );

    return Math.round(totalScore);
  }

  /**
   * Filter pharmacies by medication availability
   * @param {Array} pharmacies - List of pharmacies
   * @param {Array} medications - Required medications
   * @returns {Array} Filtered pharmacies with availability info
   */
  async filterByMedicationAvailability(pharmacies, medications) {
    if (!medications || medications.length === 0) {
      return pharmacies;
    }

    const results = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        const availability = await this._checkMedicationAvailability(pharmacy._id, medications);
        
        return {
          ...pharmacy,
          medicationAvailability: availability,
          hasAllMedications: availability.every(med => med.available),
          availableMedicationsCount: availability.filter(med => med.available).length,
          totalMedicationsRequested: medications.length
        };
      })
    );

    // Sort by availability (pharmacies with all meds first)
    return results.sort((a, b) => {
      if (a.hasAllMedications && !b.hasAllMedications) return -1;
      if (!a.hasAllMedications && b.hasAllMedications) return 1;
      return b.availableMedicationsCount - a.availableMedicationsCount;
    });
  }

  /**
   * Send notifications to selected pharmacies about prescription requests
   * @param {Array} pharmacyIds - Array of pharmacy IDs
   * @param {Object} prescriptionRequest - Prescription request data
   * @returns {Object} Notification results
   */
  async notifyPharmacies(pharmacyIds, prescriptionRequest) {
    try {
      const notifications = await Promise.all(
        pharmacyIds.map(async (pharmacyId) => {
          const pharmacy = await Pharmacy.findById(pharmacyId);
          if (!pharmacy) return null;

          // Create notification
          const notification = await this.notificationService.createNotification({
            type: 'prescription_request',
            recipient: pharmacyId,
            recipientType: 'pharmacy',
            title: 'New Prescription Request',
            message: `New prescription request from ${prescriptionRequest.patientName}`,
            data: {
              prescriptionRequestId: prescriptionRequest._id,
              patientId: prescriptionRequest.patient,
              urgency: prescriptionRequest.urgency,
              medications: prescriptionRequest.medications?.length || 0,
              estimatedValue: prescriptionRequest.estimatedValue
            },
            priority: prescriptionRequest.urgency === 'emergency' ? 'high' : 'medium'
          });

          // Send real-time notification via WebSocket
          await this.notificationService.sendRealTimeNotification(pharmacyId, notification);

          // Send email/SMS if enabled
          if (pharmacy.notificationPreferences?.email) {
            await this.notificationService.sendEmailNotification(pharmacy.email, notification);
          }

          if (pharmacy.notificationPreferences?.sms) {
            await this.notificationService.sendSMSNotification(pharmacy.phone, notification);
          }

          return {
            pharmacyId,
            notificationId: notification._id,
            status: 'sent'
          };
        })
      );

      return {
        success: true,
        notificationsSent: notifications.filter(n => n !== null).length,
        notifications: notifications.filter(n => n !== null)
      };
    } catch (error) {
      console.error('Error notifying pharmacies:', error);
      throw new Error('Failed to notify pharmacies');
    }
  }

  /**
   * Get pharmacy recommendations based on user history and preferences
   * @param {string} userId - User ID
   * @param {Object} location - Current location
   * @param {Object} preferences - User preferences
   * @returns {Array} Recommended pharmacies
   */
  async getPersonalizedRecommendations(userId, location, preferences = {}) {
    try {
      // Get user's prescription history
      const prescriptionHistory = await PrescriptionRequest.find({
        patient: userId,
        status: 'completed'
      })
      .populate('assignedPharmacy')
      .sort({ createdAt: -1 })
      .limit(10);

      // Get frequently used pharmacies
      const frequentPharmacies = this._analyzePharmacyUsage(prescriptionHistory);

      // Get nearby pharmacies
      const nearbyPharmacies = await this.findNearbyPharmacies(location, 15, preferences);

      // Combine and score recommendations
      const recommendations = nearbyPharmacies.map(pharmacy => {
        let recommendationScore = pharmacy.pharmacyScore;

        // Boost score for frequently used pharmacies
        const frequentPharmacy = frequentPharmacies.find(fp => 
          fp.pharmacyId.toString() === pharmacy._id.toString()
        );
        
        if (frequentPharmacy) {
          recommendationScore += (frequentPharmacy.usage * 10); // Boost by usage frequency
        }

        // Boost score for pharmacies with similar services to user's history
        const serviceMatch = this._calculateServiceMatchScore(
          pharmacy.services,
          this._getUserServicePreferences(prescriptionHistory)
        );
        recommendationScore += serviceMatch;

        return {
          ...pharmacy,
          recommendationScore: Math.round(recommendationScore),
          isFrequentlyUsed: !!frequentPharmacy,
          usageHistory: frequentPharmacy || null,
          serviceMatch: Math.round(serviceMatch)
        };
      });

      // Sort by recommendation score
      recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

      return recommendations.slice(0, 20); // Return top 20 recommendations
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw new Error('Failed to get personalized recommendations');
    }
  }

  // Private helper methods

  _buildStatusFilters(filters) {
    const statusFilters = {};

    if (filters.acceptsInsurance) {
      statusFilters.acceptsInsurance = true;
    }

    if (filters.hasDelivery) {
      statusFilters['services.delivery'] = true;
    }

    if (filters.isOpen24Hours) {
      statusFilters.is24Hours = true;
    }

    return statusFilters;
  }

  _buildServiceFilter(requiredServices) {
    const serviceConditions = requiredServices.map(service => ({
      [`services.${service}`]: true
    }));

    return {
      $match: {
        $and: serviceConditions
      }
    };
  }

  async _buildMedicationAvailabilityFilter(medications) {
    return {
      $match: {
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$inventory',
                  cond: {
                    $and: [
                      { $in: ['$$this.medication.name', medications] },
                      { $gt: ['$$this.currentStock', 0] }
                    ]
                  }
                }
              }
            },
            0
          ]
        }
      }
    };
  }

  _buildScoringFormula() {
    return {
      $add: [
        // Distance component (inverse relationship)
        { $multiply: [{ $subtract: [100, { $multiply: [{ $divide: ['$distanceKm', 25] }, 100] }] }, 0.3] },
        
        // Rating component
        { $multiply: [{ $multiply: ['$averageRating', 20] }, 0.25] },
        
        // Speed component (based on average processing time)
        { 
          $multiply: [
            { $subtract: [100, { $multiply: [{ $divide: [{ $ifNull: ['$averageProcessingTime', 60] }, 120] }, 100] }] },
            0.2
          ]
        },
        
        // Service availability component
        { $multiply: [{ $size: '$availableServices' }, 3] },
        
        // Review count component (more reviews = more reliable)
        { $multiply: [{ $min: [{ $divide: ['$totalReviews', 10] }, 10] }, 0.1] }
      ]
    };
  }

  _calculateEstimatedTime(distanceKm, avgProcessingTime) {
    return {
      $add: [
        { $ifNull: [avgProcessingTime, 60] }, // Processing time in minutes
        { $multiply: [distanceKm, 2] } // Travel time approximation
      ]
    };
  }

  async _checkRealTimeAvailability(pharmacyId) {
    try {
      const pharmacy = await Pharmacy.findById(pharmacyId);
      const currentHour = new Date().getHours();
      const currentDay = new Date().toLocaleLowerCase().slice(0, 3); // mon, tue, etc.

      const todayHours = pharmacy.operatingHours?.[currentDay];
      
      return {
        isOpen: this._isCurrentlyOpen(todayHours, currentHour),
        currentCapacity: pharmacy.currentCapacity || 100,
        estimatedWaitTime: this._calculateWaitTime(pharmacy.currentOrders || 0),
        nextOpenTime: this._getNextOpenTime(pharmacy.operatingHours)
      };
    } catch (error) {
      console.error('Error checking real-time availability:', error);
      return {
        isOpen: false,
        currentCapacity: 0,
        estimatedWaitTime: 0,
        nextOpenTime: null
      };
    }
  }

  async _calculateDetailedEstimatedTime(distance, pharmacyId, urgency) {
    try {
      const pharmacy = await Pharmacy.findById(pharmacyId);
      const baseProcessingTime = pharmacy.averageProcessingTime || 60;
      
      // Adjust for urgency
      const urgencyMultiplier = {
        emergency: 0.5,
        urgent: 0.7,
        normal: 1.0,
        routine: 1.2
      };

      const adjustedProcessingTime = baseProcessingTime * (urgencyMultiplier[urgency] || 1.0);
      
      // Add travel time if delivery is needed
      const travelTime = distance * 2; // Approximate 2 minutes per km
      
      // Add current queue wait time
      const queueTime = this._calculateWaitTime(pharmacy.currentOrders || 0);

      return Math.round(adjustedProcessingTime + travelTime + queueTime);
    } catch (error) {
      console.error('Error calculating detailed estimated time:', error);
      return 60; // Default fallback
    }
  }

  _canDeliver(pharmacy, userLocation) {
    if (!pharmacy.services?.delivery || !pharmacy.deliveryRadius) {
      return false;
    }

    const distance = calculateDistance(
      pharmacy.location.coordinates[1], // latitude
      pharmacy.location.coordinates[0], // longitude
      userLocation.latitude,
      userLocation.longitude
    );

    return distance <= pharmacy.deliveryRadius;
  }

  _getCurrentBusinessHours(operatingHours) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().slice(0, 3);
    return operatingHours?.[today] || null;
  }

  _calculateServicesScore(pharmacyServices, requiredServices) {
    if (!requiredServices || requiredServices.length === 0) {
      return 100; // No specific requirements
    }

    const availableRequiredServices = requiredServices.filter(service => 
      pharmacyServices?.[service] === true
    );

    return (availableRequiredServices.length / requiredServices.length) * 100;
  }

  _calculateAvailabilityScore(pharmacy) {
    const capacityScore = (pharmacy.currentCapacity || 100);
    const queueScore = Math.max(0, 100 - ((pharmacy.currentOrders || 0) * 10));
    
    return (capacityScore + queueScore) / 2;
  }

  async _checkMedicationAvailability(pharmacyId, medications) {
    try {
      const inventory = await mongoose.model('Inventory').find({
        pharmacy: pharmacyId,
        'medication.name': { $in: medications }
      }).populate('medication');

      return medications.map(medName => {
        const inventoryItem = inventory.find(item => 
          item.medication.name.toLowerCase() === medName.toLowerCase()
        );

        return {
          medicationName: medName,
          available: inventoryItem ? inventoryItem.currentStock > 0 : false,
          currentStock: inventoryItem?.currentStock || 0,
          price: inventoryItem?.price || null
        };
      });
    } catch (error) {
      console.error('Error checking medication availability:', error);
      return medications.map(medName => ({
        medicationName: medName,
        available: false,
        currentStock: 0,
        price: null
      }));
    }
  }

  _analyzePharmacyUsage(prescriptionHistory) {
    const pharmacyUsage = {};

    prescriptionHistory.forEach(prescription => {
      if (prescription.assignedPharmacy) {
        const pharmacyId = prescription.assignedPharmacy._id.toString();
        if (!pharmacyUsage[pharmacyId]) {
          pharmacyUsage[pharmacyId] = {
            pharmacyId: prescription.assignedPharmacy._id,
            pharmacyName: prescription.assignedPharmacy.name,
            usage: 0,
            lastUsed: prescription.createdAt,
            totalValue: 0
          };
        }
        pharmacyUsage[pharmacyId].usage++;
        pharmacyUsage[pharmacyId].totalValue += prescription.totalAmount || 0;
        
        if (prescription.createdAt > pharmacyUsage[pharmacyId].lastUsed) {
          pharmacyUsage[pharmacyId].lastUsed = prescription.createdAt;
        }
      }
    });

    return Object.values(pharmacyUsage).sort((a, b) => b.usage - a.usage);
  }

  _getUserServicePreferences(prescriptionHistory) {
    const serviceUsage = {};

    prescriptionHistory.forEach(prescription => {
      if (prescription.assignedPharmacy?.services) {
        Object.keys(prescription.assignedPharmacy.services).forEach(service => {
          if (prescription.assignedPharmacy.services[service]) {
            serviceUsage[service] = (serviceUsage[service] || 0) + 1;
          }
        });
      }
    });

    return serviceUsage;
  }

  _calculateServiceMatchScore(pharmacyServices, userServicePreferences) {
    if (!userServicePreferences || Object.keys(userServicePreferences).length === 0) {
      return 0;
    }

    let matchScore = 0;
    let totalPreferenceWeight = 0;

    Object.keys(userServicePreferences).forEach(service => {
      const preferenceWeight = userServicePreferences[service];
      totalPreferenceWeight += preferenceWeight;

      if (pharmacyServices?.[service]) {
        matchScore += preferenceWeight;
      }
    });

    return totalPreferenceWeight > 0 ? (matchScore / totalPreferenceWeight) * 20 : 0;
  }

  _isCurrentlyOpen(operatingHours, currentHour) {
    if (!operatingHours || !operatingHours.isOpen) {
      return false;
    }

    const openTime = parseInt(operatingHours.openTime.split(':')[0]);
    const closeTime = parseInt(operatingHours.closeTime.split(':')[0]);

    if (closeTime < openTime) {
      // Handles overnight hours (e.g., 22:00 to 06:00)
      return currentHour >= openTime || currentHour <= closeTime;
    }

    return currentHour >= openTime && currentHour <= closeTime;
  }

  _calculateWaitTime(currentOrders) {
    // Estimate 15 minutes per order in queue
    return Math.min(currentOrders * 15, 120); // Max 2 hours wait
  }

  _getNextOpenTime(operatingHours) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = new Date().getDay();
    
    for (let i = 0; i < 7; i++) {
      const dayIndex = (currentDay + i) % 7;
      const dayKey = days[dayIndex];
      const dayHours = operatingHours?.[dayKey];
      
      if (dayHours?.isOpen) {
        const nextOpen = new Date();
        nextOpen.setDate(nextOpen.getDate() + i);
        const [hours, minutes] = dayHours.openTime.split(':');
        nextOpen.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (i === 0 && nextOpen <= new Date()) {
          continue; // Skip today if time has passed
        }
        
        return nextOpen;
      }
    }
    
    return null; // No upcoming open times found
  }
}

export default PharmacyMatchingService;
