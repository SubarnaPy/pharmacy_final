import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import UserNotificationService from '../services/UserNotificationService.js';
import AppError from '../utils/AppError.js';
// import Pharmacy from '../models/Pharmacy.js';
// Legacy inventory models removed - now using Medicine schema with embedded pharmacy inventory
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import Notification from '../models/Notification.js';
import Chat from '../models/Chat.js';
import { validationUtils } from '../utils/authUtils.js';
import { sendEmail } from '../services/emailService.js';


/**
 * Register a new pharmacy
 */
export const registerPharmacy = async (req, res, next) => {
  try {
    const {
      name,
      chainName,
      description,
      address,
      coordinates,
      contact,
      licenses,
      operatingHours,
      services,
      delivery,
      insurance,
      staff,
      searchTags
    } = req.body;

    const userId = req.user._id;

    // Validate required fields
    if (!name || !address || !contact || !licenses || !operatingHours || !staff) {
      return next(new AppError('Missing required fields for pharmacy registration', 400));
    }

    // Check if user already has a pharmacy
    const existingPharmacy = await Pharmacy.findOne({ owner: userId });
    if (existingPharmacy) {
      return next(new AppError('User already has a registered pharmacy', 409));
    }

    // Check if pharmacy with same email exists
    const emailExists = await Pharmacy.findOne({ 'contact.email': contact.email.toLowerCase() });
    if (emailExists) {
      return next(new AppError('Pharmacy with this email already exists', 409));
    }

    // Validate coordinates
    if (!coordinates || coordinates.length !== 2) {
      return next(new AppError('Valid coordinates [longitude, latitude] are required', 400));
    }

    // Validate licenses
    if (!Array.isArray(licenses) || licenses.length === 0) {
      return next(new AppError('At least one license is required', 400));
    }

    // Check for duplicate license numbers
    for (const license of licenses) {
      const existingLicense = await Pharmacy.findOne({
        'licenses.licenseNumber': license.licenseNumber.toUpperCase()
      });
      if (existingLicense) {
        return next(new AppError(`License number ${license.licenseNumber} is already registered`, 409));
      }
    }

    // Validate operating hours
    if (!Array.isArray(operatingHours) || operatingHours.length !== 7) {
      return next(new AppError('Operating hours must be provided for all 7 days', 400));
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const providedDays = operatingHours.map(h => h.day);
    if (!days.every(day => providedDays.includes(day))) {
      return next(new AppError('Operating hours must include all days of the week', 400));
    }

    // Create pharmacy data
    const pharmacyData = {
      name: validationUtils.sanitizeInput(name),
      chainName: chainName ? validationUtils.sanitizeInput(chainName) : undefined,
      description: description ? validationUtils.sanitizeInput(description) : undefined,
      owner: userId,
      address: {
        street: validationUtils.sanitizeInput(address.street),
        city: validationUtils.sanitizeInput(address.city),
        state: validationUtils.sanitizeInput(address.state),
        zipCode: address.zipCode,
        country: address.country || 'United States'
      },
      location: {
        type: 'Point',
        coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
      },
      contact: {
        phone: contact.phone,
        fax: contact.fax,
        email: contact.email.toLowerCase(),
        website: contact.website
      },
      licenses: licenses.map(license => ({
        ...license,
        licenseNumber: license.licenseNumber.toUpperCase(),
        verificationStatus: 'pending'
      })),
      operatingHours,
      services: services || {},
      delivery: delivery || { isAvailable: false, zones: [] },
      insurance: insurance || {},
      staff,
      registrationStatus: 'submitted',
      searchTags: searchTags || []
    };

    // Create pharmacy
    const pharmacy = await Pharmacy.create(pharmacyData);

    // Add approval history entry
    pharmacy.approvalHistory.push({
      status: 'submitted',
      notes: 'Initial pharmacy registration submitted',
      timestamp: new Date()
    });
    await pharmacy.save();

    // Update user's pharmacy reference
    await User.findByIdAndUpdate(userId, {
      pharmacy: pharmacy._id,
      pharmacyDetails: {
        pharmacyName: pharmacy.name,
        licenseNumber: pharmacy.licenses[0]?.licenseNumber,
        verificationStatus: 'pending'
      }
    });

    // Caching disabled (Redis removed)

    // Send confirmation email to pharmacy (if email service is configured)
    try {
      if (sendEmail) {
        await sendEmail({
          to: pharmacy.contact.email,
          subject: 'Pharmacy Registration Received',
          template: 'pharmacyRegistrationConfirmation',
          data: {
            pharmacyName: pharmacy.name,
            registrationId: pharmacy._id,
            ownerName: req.user.profile?.firstName || 'User'
          }
        });
      }
    } catch (emailError) {
      console.warn('Failed to send registration confirmation email:', emailError.message);
    }

    // Send notifications for pharmacy registration
    try {
      // Welcome notification to pharmacy owner
      await UserNotificationService.sendWelcomeNotification(
        userId,
        'pharmacy',
        pharmacy.name
      );
      
      // Notify admins about new pharmacy registration
      const admins = await User.find({ role: 'admin', isActive: true });
      for (const admin of admins) {
        await UserNotificationService.sendNotification(admin._id, 'admin', {
          type: 'system_alert',
          category: 'info',
          title: 'New Pharmacy Registration',
          message: `${pharmacy.name} has registered and is pending review.`,
          actionUrl: `/admin/pharmacies/${pharmacy._id}/review`,
          actionText: 'Review Registration'
        });
      }
    } catch (notificationError) {
      console.warn('Failed to send pharmacy registration notifications:', notificationError.message);
    }

    // Remove sensitive data from response
    const pharmacyResponse = pharmacy.toObject();
    delete pharmacyResponse.apiIntegration;

    res.status(201).json({
      success: true,
      message: 'Pharmacy registration submitted successfully. It will be reviewed by our team.',
      data: {
        pharmacy: pharmacyResponse
      }
    });

  } catch (error) {
    console.error('Pharmacy registration error:', error);
    next(new AppError('Pharmacy registration failed', 500));
  }
};

/**
 * Get pharmacy registration status
 */
export const getPharmacyStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log("Getting pharmacy status for user:", userId);

    // First check if user has a pharmacy reference in their profile
    const user = await User.findById(userId).select('pharmacy profile').lean(); // Use lean() to avoid virtuals
    let pharmacy = null;
    console.log("User found:", !!user);
    console.log("User pharmacy reference:", user?.pharmacy);

    if (user && user.pharmacy) {
      // User has a pharmacy reference, get the pharmacy details
      pharmacy = await Pharmacy.findById(user.pharmacy)
        .select('_id registrationStatus approvalHistory isVerified approvedAt')
        .populate('approvalHistory.reviewer', 'profile.firstName profile.lastName')
        .lean();
    } else {
      // Fallback: check if user owns a pharmacy
      pharmacy = await Pharmacy.findOne({ owner: userId })
        .select('_id registrationStatus approvalHistory isVerified approvedAt')
        .populate('approvalHistory.reviewer', 'profile.firstName profile.lastName')
        .lean();

      // If found, update the user's pharmacy reference for future queries
      if (pharmacy && user) {
        await User.findByIdAndUpdate(userId, { pharmacy: pharmacy._id });
      }
    }

    if (!pharmacy) {
      console.log("No pharmacy found for user");
      return res.status(200).json({
        success: true,
        data: {
          hasPharmacy: false,
          status: null
        }
      });
    }

    console.log("Pharmacy found:", pharmacy._id);
    
    // Prepare response data safely
    const responseData = {
      _id: pharmacy._id,
      hasPharmacy: true,
      status: pharmacy.registrationStatus,
      isVerified: pharmacy.isVerified,
      approvedAt: pharmacy.approvedAt,
      approvalHistory: pharmacy.approvalHistory || []
    };

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get pharmacy status error:', error);
    next(new AppError('Failed to get pharmacy status', 500));
  }
};

/**
 * Update pharmacy information
 */
export const updatePharmacy = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Find pharmacy owned by user
    const pharmacy = await Pharmacy.findOne({ owner: userId });

    if (!pharmacy) {
      return next(new AppError('Pharmacy not found', 404));
    }

    // Don't allow updates if status is under review
    if (pharmacy.registrationStatus === 'under_review') {
      return next(new AppError('Cannot update pharmacy while under review', 400));
    }

    // Validate email uniqueness if being updated
    if (updates.contact && updates.contact.email && updates.contact.email.toLowerCase() !== pharmacy.contact.email) {
      const emailExists = await Pharmacy.findOne({
        'contact.email': updates.contact.email.toLowerCase(),
        _id: { $ne: pharmacy._id }
      });
      if (emailExists) {
        return next(new AppError('Email already exists for another pharmacy', 409));
      }
    }

    // Validate license numbers if being updated
    if (updates.licenses) {
      for (const license of updates.licenses) {
        if (license.licenseNumber) {
          const existingLicense = await Pharmacy.findOne({
            'licenses.licenseNumber': license.licenseNumber.toUpperCase(),
            _id: { $ne: pharmacy._id }
          });
          if (existingLicense) {
            return next(new AppError(`License number ${license.licenseNumber} is already registered`, 409));
          }
        }
      }
    }

    // Sanitize input data
    if (updates.name) updates.name = validationUtils.sanitizeInput(updates.name);
    if (updates.description) updates.description = validationUtils.sanitizeInput(updates.description);
    if (updates.address) {
      if (updates.address.street) updates.address.street = validationUtils.sanitizeInput(updates.address.street);
      if (updates.address.city) updates.address.city = validationUtils.sanitizeInput(updates.address.city);
      if (updates.address.state) updates.address.state = validationUtils.sanitizeInput(updates.address.state);
    }

    // Update coordinates if provided
    if (updates.coordinates) {
      if (!Array.isArray(updates.coordinates) || updates.coordinates.length !== 2) {
        return next(new AppError('Valid coordinates [longitude, latitude] are required', 400));
      }
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(updates.coordinates[0]), parseFloat(updates.coordinates[1])]
      };
      delete updates.coordinates;
    }

    // If critical information is being updated, reset verification status
    const criticalFields = ['licenses', 'contact.email', 'name', 'address'];
    const isCriticalUpdate = criticalFields.some(field => {
      const fieldParts = field.split('.');
      return fieldParts.reduce((obj, part) => obj && obj[part], updates) !== undefined;
    });

    if (isCriticalUpdate && pharmacy.isVerified) {
      updates.isVerified = false;
      updates.registrationStatus = 'submitted';

      // Add approval history entry
      if (!updates.approvalHistory) updates.approvalHistory = [...pharmacy.approvalHistory];
      updates.approvalHistory.push({
        status: 'submitted',
        notes: 'Pharmacy information updated - requires re-review',
        timestamp: new Date()
      });
    }

    // Update pharmacy
    const updatedPharmacy = await Pharmacy.findByIdAndUpdate(
      pharmacy._id,
      updates,
      { new: true, runValidators: true }
    );

    // Caching disabled (Redis removed)

    // Remove sensitive data from response
    const pharmacyResponse = updatedPharmacy.toObject();
    delete pharmacyResponse.apiIntegration;

    res.status(200).json({
      success: true,
      message: 'Pharmacy updated successfully',
      data: {
        pharmacy: pharmacyResponse
      }
    });

  } catch (error) {
    console.error('Update pharmacy error:', error);
    next(new AppError('Failed to update pharmacy', 500));
  }
};

/**
 * Get pharmacy details
 */
export const getPharmacyDetails = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get pharmacy from database (caching disabled)
    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate('owner', 'firstName lastName email')
      .populate('approvalHistory.reviewer', 'firstName lastName');

    if (!pharmacy) {
      return next(new AppError('Pharmacy not found', 404));
    }

    // Check permissions
    const isOwner = pharmacy.owner._id?.toString() === userId || pharmacy.owner.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin && pharmacy.registrationStatus !== 'approved') {
      return next(new AppError('Pharmacy not found or access denied', 404));
    }

    // Filter response based on user permissions
    const pharmacyResponse = { ...pharmacy };

    if (!isOwner && !isAdmin) {
      // Public view - hide sensitive information
      delete pharmacyResponse.approvalHistory;
      delete pharmacyResponse.apiIntegration;
      delete pharmacyResponse.notifications;
      delete pharmacyResponse.verificationDocuments;
    }

    res.status(200).json({
      success: true,
      data: {
        pharmacy: pharmacyResponse
      }
    });

  } catch (error) {
    console.error('Get pharmacy details error:', error);
    next(new AppError('Failed to get pharmacy details', 500));
  }
};

/**
 * Search pharmacies (public endpoint)
 */
export const searchPharmacies = async (req, res, next) => {
  try {
    const {
      search,
      latitude,
      longitude,
      radius = 10,
      services,
      insurance,
      sortBy = 'distance',
      page = 1,
      limit = 20
    } = req.query;

    const query = {
      isActive: true,
      isVerified: true,
      registrationStatus: 'approved'
    };

    let pharmacies;

    // Location-based search
    if (latitude && longitude) {
      const coordinates = [parseFloat(longitude), parseFloat(latitude)];
      pharmacies = await Pharmacy.findNearby(coordinates, parseInt(radius), query);
    }
    // Text search
    else if (search) {
      pharmacies = await Pharmacy.searchByText(search, query);
    }
    // General search
    else {
      pharmacies = await Pharmacy.find(query);
    }

    // Apply additional filters
    if (services) {
      const serviceFilters = Array.isArray(services) ? services : [services];
      pharmacies = pharmacies.filter(pharmacy =>
        serviceFilters.every(service => pharmacy.services[service] === true)
      );
    }

    if (insurance) {
      const insuranceFilters = Array.isArray(insurance) ? insurance : [insurance];
      pharmacies = pharmacies.filter(pharmacy =>
        insuranceFilters.some(ins => pharmacy.insurance.acceptedInsurances.includes(ins))
      );
    }

    // Calculate distances if coordinates provided
    if (latitude && longitude) {
      const coordinates = [parseFloat(longitude), parseFloat(latitude)];
      pharmacies = pharmacies.map(pharmacy => {
        const distance = pharmacy.calculateDistance(coordinates);
        const estimatedTime = pharmacy.getEstimatedFulfillmentTime();
        return {
          ...pharmacy.toObject(),
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          estimatedFulfillmentTime: estimatedTime
        };
      });
    }

    // Sort results
    switch (sortBy) {
      case 'rating':
        pharmacies.sort((a, b) => b.rating.averageRating - a.rating.averageRating);
        break;
      case 'name':
        pharmacies.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'distance':
      default:
        if (latitude && longitude) {
          pharmacies.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        break;
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedPharmacies = pharmacies.slice(startIndex, endIndex);

    // Filter response for public consumption
    const publicPharmacies = paginatedPharmacies.map(pharmacy => {
      const publicData = {
        _id: pharmacy._id,
        name: pharmacy.name,
        chainName: pharmacy.chainName,
        description: pharmacy.description,
        address: pharmacy.address,
        contact: {
          phone: pharmacy.contact.phone,
          website: pharmacy.contact.website
          // Email is hidden for privacy
        },
        operatingHours: pharmacy.operatingHours,
        services: pharmacy.services,
        delivery: {
          isAvailable: pharmacy.delivery.isAvailable,
          emergencyDelivery: pharmacy.delivery.emergencyDelivery
        },
        insurance: pharmacy.insurance,
        rating: pharmacy.rating,
        distance: pharmacy.distance,
        estimatedFulfillmentTime: pharmacy.estimatedFulfillmentTime,
        isOpen: pharmacy.isOpen
      };
      return publicData;
    });

    res.status(200).json({
      success: true,
      data: {
        pharmacies: publicPharmacies,
        pagination: {
          currentPage: parseInt(page),
          totalResults: pharmacies.length,
          totalPages: Math.ceil(pharmacies.length / parseInt(limit)),
          hasNext: endIndex < pharmacies.length,
          hasPrev: startIndex > 0
        }
      }
    });

  } catch (error) {
    console.error('Search pharmacies error:', error);
    next(new AppError('Failed to search pharmacies', 500));
  }
};

/**
 * Get nearby pharmacies
 */
export const getNearbyPharmacies = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return next(new AppError('Latitude and longitude are required', 400));
    }

    const coordinates = [parseFloat(longitude), parseFloat(latitude)];

    const pharmacies = await Pharmacy.findNearby(coordinates, parseInt(radius))
      .select('name address contact.phone operatingHours services delivery rating location')
      .lean();

    // Add distance and availability info
    const pharmaciesWithInfo = pharmacies.map(pharmacy => ({
      ...pharmacy,
      distance: Math.round(
        Pharmacy.schema.methods.calculateDistance.call(
          { location: { coordinates: pharmacy.location.coordinates } },
          coordinates
        ) * 10
      ) / 10,
      isOpen: Pharmacy.schema.virtuals.isOpen.get.call({ operatingHours: pharmacy.operatingHours })
    }));

    res.status(200).json({
      success: true,
      data: {
        pharmacies: pharmaciesWithInfo,
        searchCenter: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        radiusKm: parseInt(radius)
      }
    });

  } catch (error) {
    console.error('Get nearby pharmacies error:', error);
    next(new AppError('Failed to get nearby pharmacies', 500));
  }
};

/**
 * Get pharmacy dashboard statistics
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get pharmacy for this user
    const pharmacy = await Pharmacy.findOne({ owner: userId });
    if (!pharmacy) {
      return next(new AppError('Pharmacy not found for this user', 404));
    }

    // Get prescription request statistics
    const totalRequests = await PrescriptionRequest.countDocuments({
      'targetPharmacies.pharmacyId': pharmacy._id
    });

    const pendingRequests = await PrescriptionRequest.countDocuments({
      'targetPharmacies.pharmacyId': pharmacy._id,
      status: { $in: ['draft', 'pending', 'submitted'] }
    });

    const acceptedRequests = await PrescriptionRequest.countDocuments({
      'pharmacyResponses.pharmacyId': pharmacy._id,
      'pharmacyResponses.status': 'accepted'
    });

    const fulfilledRequests = await PrescriptionRequest.countDocuments({
      'selectedPharmacy.pharmacyId': pharmacy._id,
      status: 'fulfilled'
    });

    // Calculate monthly revenue (mock for now)
    const monthlyRevenue = fulfilledRequests * 35; // Average $35 per prescription

    // Get inventory count (if inventory model exists)
    let totalInventoryItems = 0;
    let lowStockItems = 0;
    
    try {
      // Legacy inventory system removed - using Medicine schema with embedded pharmacy inventory
      const { Medicine } = await import('../models/Medicine.js');
      totalInventoryItems = await Inventory.countDocuments({
        pharmacyId: pharmacy._id
      });

      lowStockItems = await Inventory.countDocuments({
        pharmacyId: pharmacy._id,
        currentStock: { $lte: 10 }
      });
    } catch (error) {
      console.log('Inventory model not available, using mock data');
      totalInventoryItems = 150;
      lowStockItems = 5;
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        pendingRequests,
        activeOrders: acceptedRequests,
        totalFulfilled: fulfilledRequests,
        monthlyRevenue,
        averageRating: pharmacy.rating?.averageRating || 4.5,
        totalCustomers: totalRequests,
        inventoryStats: {
          totalItems: totalInventoryItems,
          lowStockItems
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get dashboard stats:', error.message);
    next(new AppError('Failed to retrieve dashboard statistics', 500));
  }
};

export default {
  registerPharmacy,
  getPharmacyStatus,
  updatePharmacy,
  getPharmacyDetails,
  searchPharmacies,
  getNearbyPharmacies,
  getDashboardStats
};
