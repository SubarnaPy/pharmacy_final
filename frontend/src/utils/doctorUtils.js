/**
 * Utility functions for doctor profile handling
 */

/**
 * Safely extract doctor ID from user object
 * @param {Object} user - User object from auth state
 * @returns {string|null} - Doctor ID or null if not found
 */
export const getDoctorId = (user) => {
  if (!user) return null;
  
  const doctorProfile = user.doctorProfile;
  
  if (!doctorProfile) return null;
  
  // If doctorProfile is a string (just the ID)
  if (typeof doctorProfile === 'string') {
    return doctorProfile;
  }
  
  // If doctorProfile is an object (populated)
  if (typeof doctorProfile === 'object') {
    return doctorProfile._id || doctorProfile.id || null;
  }
  
  return null;
};

/**
 * Check if user has a valid doctor profile
 * @param {Object} user - User object from auth state
 * @returns {boolean} - True if user has a valid doctor profile
 */
export const hasValidDoctorProfile = (user) => {
  return getDoctorId(user) !== null;
};

/**
 * Get doctor profile object if populated
 * @param {Object} user - User object from auth state
 * @returns {Object|null} - Doctor profile object or null
 */
export const getDoctorProfile = (user) => {
  if (!user || !user.doctorProfile) return null;
  
  // If doctorProfile is an object (populated)
  if (typeof user.doctorProfile === 'object') {
    return user.doctorProfile;
  }
  
  return null;
};