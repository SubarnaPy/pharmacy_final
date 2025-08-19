import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendEmail } from '../services/emailService.js';


/**
 * Get all pharmacies for admin review
 */
export const getAllPharmacies = async (req, res, next) => {
  try {
    const {
      status,
      verified,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.registrationStatus = status;
    }
    
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'licenses.licenseNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort order
    const sortOrder = order === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    // Execute query
    const [pharmacies, total] = await Promise.all([
      Pharmacy.find(query)
        .populate('owner', 'firstName lastName email')
        .populate('approvalHistory.reviewer', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Pharmacy.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        pharmacies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalResults: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: skip > 0
        }
      }
    });

  } catch (error) {
    console.error('Get all pharmacies error:', error);
    next(new AppError('Failed to get pharmacies', 500));
  }
};

/**
 * Get pharmacy statistics for admin dashboard
 */
export const getPharmacyStats = async (req, res, next) => {
  try {
    // Get basic statistics
    const [statusStats, verificationStats, recentRegistrations] = await Promise.all([
      Pharmacy.aggregate([
        {
          $group: {
            _id: '$registrationStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      Pharmacy.aggregate([
        {
          $group: {
            _id: '$isVerified',
            count: { $sum: 1 }
          }
        }
      ]),
      Pharmacy.find({ registrationStatus: 'submitted' })
        .populate('owner', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name owner createdAt registrationStatus')
    ]);

    // Get monthly registration trends
    const monthlyStats = await Pharmacy.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$registrationStatus', 'approved'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get license type distribution
    const licenseStats = await Pharmacy.aggregate([
      { $unwind: '$licenses' },
      {
        $group: {
          _id: '$licenses.licenseType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top-rated pharmacies
    const topRated = await Pharmacy.find({
      registrationStatus: 'approved',
      'rating.averageRating': { $gte: 4.0 }
    })
      .sort({ 'rating.averageRating': -1, 'rating.totalReviews': -1 })
      .limit(5)
      .select('name rating location address');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: statusStats.reduce((sum, stat) => sum + stat.count, 0),
          byStatus: statusStats,
          byVerification: verificationStats
        },
        trends: {
          monthly: monthlyStats,
          licenses: licenseStats
        },
        recent: recentRegistrations,
        topRated
      }
    });

  } catch (error) {
    console.error('Get pharmacy stats error:', error);
    next(new AppError('Failed to get pharmacy statistics', 500));
  }
};

/**
 * Review and approve/reject pharmacy
 */
export const reviewPharmacy = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { action, notes, licenseVerifications } = req.body;
    const adminId = req.user.userId;

    if (!['approve', 'reject', 'request_info'].includes(action)) {
      return next(new AppError('Invalid action. Must be approve, reject, or request_info', 400));
    }

    // Find pharmacy
    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate('owner', 'firstName lastName email');

    if (!pharmacy) {
      return next(new AppError('Pharmacy not found', 404));
    }

    if (pharmacy.registrationStatus === 'approved') {
      return next(new AppError('Pharmacy is already approved', 400));
    }

    // Update pharmacy status
    let newStatus;
    let emailTemplate;
    let emailSubject;
    
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        pharmacy.isVerified = true;
        pharmacy.approvedAt = new Date();
        emailTemplate = 'pharmacyApproved';
        emailSubject = 'Pharmacy Registration Approved';
        
        // Update license verification status
        if (licenseVerifications) {
          pharmacy.licenses.forEach((license, index) => {
            if (licenseVerifications[index]) {
              license.verificationStatus = licenseVerifications[index].status;
              license.verificationNotes = licenseVerifications[index].notes;
              license.verifiedBy = adminId;
              license.verifiedAt = new Date();
            }
          });
        } else {
          // Auto-verify all licenses if not specified
          pharmacy.licenses.forEach(license => {
            license.verificationStatus = 'verified';
            license.verifiedBy = adminId;
            license.verifiedAt = new Date();
          });
        }
        break;
        
      case 'reject':
        newStatus = 'rejected';
        pharmacy.isVerified = false;
        emailTemplate = 'pharmacyRejected';
        emailSubject = 'Pharmacy Registration Rejected';
        break;
        
      case 'request_info':
        newStatus = 'submitted'; // Keep in submitted status
        emailTemplate = 'pharmacyInfoRequested';
        emailSubject = 'Additional Information Required for Pharmacy Registration';
        break;
    }

    pharmacy.registrationStatus = newStatus;

    // Add approval history entry
    pharmacy.approvalHistory.push({
      status: newStatus,
      reviewer: adminId,
      notes: notes || `Pharmacy ${action}d by admin`,
      timestamp: new Date()
    });

    await pharmacy.save();

    // Caching disabled (Redis removed)

    // Send notification email to pharmacy owner
    try {
      const admin = await User.findById(adminId);
      
      await sendEmail({
        to: pharmacy.owner.email,
        subject: emailSubject,
        template: emailTemplate,
        data: {
          pharmacyName: pharmacy.name,
          ownerName: pharmacy.owner.firstName,
          adminName: admin ? admin.firstName : 'Administrator',
          notes: notes || '',
          reviewDate: new Date().toLocaleDateString(),
          loginLink: `${process.env.FRONTEND_URL}/dashboard`
        }
      });
    } catch (emailError) {
      console.error('Failed to send review notification email:', emailError);
    }

    // If approved, send welcome email with next steps
    if (action === 'approve') {
      try {
        await sendEmail({
          to: pharmacy.owner.email,
          subject: 'Welcome to Our Pharmacy Network!',
          template: 'pharmacyWelcome',
          data: {
            pharmacyName: pharmacy.name,
            ownerName: pharmacy.owner.firstName,
            dashboardLink: `${process.env.FRONTEND_URL}/pharmacy/dashboard`,
            supportEmail: process.env.SUPPORT_EMAIL
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Pharmacy ${action}d successfully`,
      data: {
        pharmacy: {
          _id: pharmacy._id,
          name: pharmacy.name,
          registrationStatus: pharmacy.registrationStatus,
          isVerified: pharmacy.isVerified,
          approvedAt: pharmacy.approvedAt
        }
      }
    });

  } catch (error) {
    console.error('Review pharmacy error:', error);
    next(new AppError('Failed to review pharmacy', 500));
  }
};

/**
 * Suspend or reactivate pharmacy
 */
export const togglePharmacyStatus = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user.userId;

    if (!['suspend', 'reactivate'].includes(action)) {
      return next(new AppError('Invalid action. Must be suspend or reactivate', 400));
    }

    // Find pharmacy
    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate('owner', 'firstName lastName email');

    if (!pharmacy) {
      return next(new AppError('Pharmacy not found', 404));
    }

    const previousStatus = pharmacy.registrationStatus;
    
    if (action === 'suspend') {
      if (pharmacy.registrationStatus === 'suspended') {
        return next(new AppError('Pharmacy is already suspended', 400));
      }
      pharmacy.registrationStatus = 'suspended';
      pharmacy.isActive = false;
    } else {
      if (pharmacy.registrationStatus !== 'suspended') {
        return next(new AppError('Pharmacy is not suspended', 400));
      }
      pharmacy.registrationStatus = 'approved';
      pharmacy.isActive = true;
    }

    // Add approval history entry
    pharmacy.approvalHistory.push({
      status: pharmacy.registrationStatus,
      reviewer: adminId,
      notes: reason || `Pharmacy ${action}d by admin`,
      timestamp: new Date()
    });

    await pharmacy.save();

    // Caching disabled (Redis removed)

    // Send notification email
    try {
      const admin = await User.findById(adminId);
      const template = action === 'suspend' ? 'pharmacySuspended' : 'pharmacyReactivated';
      const subject = action === 'suspend' ? 'Pharmacy Account Suspended' : 'Pharmacy Account Reactivated';
      
      await sendEmail({
        to: pharmacy.owner.email,
        subject,
        template,
        data: {
          pharmacyName: pharmacy.name,
          ownerName: pharmacy.owner.firstName,
          adminName: admin ? admin.firstName : 'Administrator',
          reason: reason || '',
          actionDate: new Date().toLocaleDateString(),
          supportEmail: process.env.SUPPORT_EMAIL
        }
      });
    } catch (emailError) {
      console.error('Failed to send status change notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: `Pharmacy ${action}d successfully`,
      data: {
        pharmacy: {
          _id: pharmacy._id,
          name: pharmacy.name,
          registrationStatus: pharmacy.registrationStatus,
          isActive: pharmacy.isActive,
          previousStatus
        }
      }
    });

  } catch (error) {
    console.error('Toggle pharmacy status error:', error);
    next(new AppError('Failed to update pharmacy status', 500));
  }
};

/**
 * Get pharmacy for review (detailed admin view)
 */
export const getPharmacyForReview = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;

    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate('owner', 'firstName lastName email createdAt')
      .populate('approvalHistory.reviewer', 'firstName lastName')
      .populate('verificationDocuments.verifiedBy', 'firstName lastName');

    if (!pharmacy) {
      return next(new AppError('Pharmacy not found', 404));
    }

    // Get additional verification information
    const verificationInfo = {
      licenseValidation: await validateLicenses(pharmacy.licenses),
      documentCompleteness: calculateDocumentCompleteness(pharmacy),
      riskFactors: await assessRiskFactors(pharmacy)
    };

    res.status(200).json({
      success: true,
      data: {
        pharmacy,
        verification: verificationInfo
      }
    });

  } catch (error) {
    console.error('Get pharmacy for review error:', error);
    next(new AppError('Failed to get pharmacy for review', 500));
  }
};

/**
 * Bulk approve/reject pharmacies
 */
export const bulkReviewPharmacies = async (req, res, next) => {
  try {
    const { pharmacyIds, action, notes } = req.body;
    const adminId = req.user.userId;

    if (!Array.isArray(pharmacyIds) || pharmacyIds.length === 0) {
      return next(new AppError('Pharmacy IDs array is required', 400));
    }

    if (!['approve', 'reject'].includes(action)) {
      return next(new AppError('Invalid action. Must be approve or reject', 400));
    }

    const results = [];
    
    for (const pharmacyId of pharmacyIds) {
      try {
        const pharmacy = await Pharmacy.findById(pharmacyId);
        
        if (!pharmacy) {
          results.push({ pharmacyId, success: false, error: 'Pharmacy not found' });
          continue;
        }

        if (pharmacy.registrationStatus === 'approved') {
          results.push({ pharmacyId, success: false, error: 'Already approved' });
          continue;
        }

        // Update status
        pharmacy.registrationStatus = action === 'approve' ? 'approved' : 'rejected';
        if (action === 'approve') {
          pharmacy.isVerified = true;
          pharmacy.approvedAt = new Date();
          
          // Auto-verify licenses
          pharmacy.licenses.forEach(license => {
            license.verificationStatus = 'verified';
            license.verifiedBy = adminId;
            license.verifiedAt = new Date();
          });
        }

        // Add approval history
        pharmacy.approvalHistory.push({
          status: pharmacy.registrationStatus,
          reviewer: adminId,
          notes: notes || `Bulk ${action} by admin`,
          timestamp: new Date()
        });

        await pharmacy.save();

        // Caching disabled (Redis removed)

        results.push({ pharmacyId, success: true, status: pharmacy.registrationStatus });

      } catch (error) {
        results.push({ pharmacyId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Bulk review completed. ${successCount} successful, ${failureCount} failed.`,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Bulk review pharmacies error:', error);
    next(new AppError('Failed to bulk review pharmacies', 500));
  }
};

// Helper functions
async function validateLicenses(licenses) {
  const validations = [];
  
  for (const license of licenses) {
    const validation = {
      licenseNumber: license.licenseNumber,
      isValid: true,
      issues: []
    };

    // Check expiry date
    if (license.expiryDate < new Date()) {
      validation.isValid = false;
      validation.issues.push('License has expired');
    }

    // Check if expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    if (license.expiryDate < thirtyDaysFromNow) {
      validation.issues.push('License expires within 30 days');
    }

    // Check for duplicate license numbers in database
    const duplicateCount = await Pharmacy.countDocuments({
      'licenses.licenseNumber': license.licenseNumber
    });
    
    if (duplicateCount > 1) {
      validation.isValid = false;
      validation.issues.push('Duplicate license number found');
    }

    validations.push(validation);
  }

  return validations;
}

function calculateDocumentCompleteness(pharmacy) {
  const requiredFields = [
    'name', 'address', 'contact.email', 'contact.phone', 
    'licenses', 'operatingHours', 'staff'
  ];
  
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const fieldParts = field.split('.');
    const value = fieldParts.reduce((obj, part) => obj && obj[part], pharmacy);
    
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        completedFields++;
      } else if (!Array.isArray(value)) {
        completedFields++;
      }
    }
  });

  return {
    completionPercentage: Math.round((completedFields / requiredFields.length) * 100),
    missingFields: requiredFields.filter(field => {
      const fieldParts = field.split('.');
      const value = fieldParts.reduce((obj, part) => obj && obj[part], pharmacy);
      return value === undefined || value === null || value === '' || 
             (Array.isArray(value) && value.length === 0);
    })
  };
}

async function assessRiskFactors(pharmacy) {
  const riskFactors = [];

  // Check if owner has multiple pharmacy registrations
  const ownerPharmacyCount = await Pharmacy.countDocuments({ owner: pharmacy.owner });
  if (ownerPharmacyCount > 1) {
    riskFactors.push('Owner has multiple pharmacy registrations');
  }

  // Check if pharmacy address is in high-risk area (this would need external data)
  // For now, just placeholder logic
  const highRiskZipCodes = ['90210', '10001']; // Example high-risk areas
  if (highRiskZipCodes.includes(pharmacy.address.zipCode)) {
    riskFactors.push('Located in high-risk area');
  }

  // Check license issue date (too recent might be suspicious)
  const recentLicenses = pharmacy.licenses.filter(license => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return license.issueDate > thirtyDaysAgo;
  });

  if (recentLicenses.length > 0) {
    riskFactors.push('Recently issued license (within 30 days)');
  }

  return riskFactors;
}

export default {
  getAllPharmacies,
  getPharmacyStats,
  reviewPharmacy,
  togglePharmacyStatus,
  getPharmacyForReview,
  bulkReviewPharmacies
};
