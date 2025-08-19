/**
 * Role-based access control middleware
 * Validates user roles for different endpoints
 */

/**
 * Validate that user has patient role
 */
export const validatePatientRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Patient role required.',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error('❌ Role validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during role validation'
    });
  }
};

/**
 * Validate that user has doctor role
 */
export const validateDoctorRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Doctor role required.',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error('❌ Role validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during role validation'
    });
  }
};

/**
 * Validate that user has pharmacy role
 */
export const validatePharmacyRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== 'pharmacy') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Pharmacy role required.',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error('❌ Role validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during role validation'
    });
  }
};

/**
 * Validate that user has admin role
 */
export const validateAdminRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error('❌ Role validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during role validation'
    });
  }
};

/**
 * Validate that user has one of multiple allowed roles
 */
export const validateRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          userRole: req.user.role,
          allowedRoles
        });
      }

      next();
    } catch (error) {
      console.error('❌ Role validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during role validation'
      });
    }
  };
};

/**
 * Validate that user can access patient-related resources
 * (either the patient themselves or a doctor/admin)
 */
export const validatePatientAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { role, id } = req.user;
    const patientId = req.params.patientId || req.params.userId || req.body.patientId;

    // Admins can access all patient data
    if (role === 'admin') {
      return next();
    }

    // Doctors can access patient data (with proper authorization logic)
    if (role === 'doctor') {
      // In a real implementation, you'd check if the doctor has access to this patient
      return next();
    }

    // Patients can only access their own data
    if (role === 'patient') {
      if (patientId && patientId !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own data.'
        });
      }
      return next();
    }

    // Default deny
    return res.status(403).json({
      success: false,
      error: 'Access denied. Insufficient permissions.',
      userRole: role
    });

  } catch (error) {
    console.error('❌ Patient access validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during access validation'
    });
  }
};
