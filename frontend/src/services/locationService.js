import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Find nearby pharmacies based on user location
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {number} maxDistance - Maximum distance in kilometers (default: 1000)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise} API response with nearby pharmacies
 */
export const findNearbyPharmacies = async (latitude, longitude, maxDistance = 1000, limit = 10) => {
  try {
    const response = await api.get('/pharmacy/nearby', {
      params: {
        latitude,
        longitude,
        radius: maxDistance, // Backend expects 'radius' parameter
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error finding nearby pharmacies:', error);
    throw error;
  }
};

/**
 * Search pharmacies by various criteria
 * @param {Object} searchParams - Search parameters
 * @param {string} searchParams.query - Text search query
 * @param {number} searchParams.latitude - User's latitude
 * @param {number} searchParams.longitude - User's longitude
 * @param {number} searchParams.maxDistance - Maximum distance in km
 * @param {Array} searchParams.services - Required services
 * @param {number} searchParams.rating - Minimum rating
 * @param {number} searchParams.limit - Maximum results
 * @returns {Promise} API response with search results
 */
export const searchPharmacies = async (searchParams) => {
  try {
    const response = await api.get('/pharmacy/search', {
      params: searchParams
    });
    return response.data;
  } catch (error) {
    console.error('Error searching pharmacies:', error);
    throw error;
  }
};

/**
 * Get detailed information about a specific pharmacy
 * @param {string} pharmacyId - Pharmacy ID
 * @returns {Promise} API response with pharmacy details
 */
export const getPharmacyDetails = async (pharmacyId) => {
  try {
    const response = await api.get(`/pharmacy/${pharmacyId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting pharmacy details:', error);
    throw error;
  }
};

/**
 * Get pharmacy operating hours for a specific date
 * @param {string} pharmacyId - Pharmacy ID
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise} API response with operating hours
 */
export const getPharmacyHours = async (pharmacyId, date = null) => {
  try {
    const params = date ? { date } : {};
    const response = await api.get(`/pharmacy/${pharmacyId}/hours`, { params });
    return response.data;
  } catch (error) {
    console.error('Error getting pharmacy hours:', error);
    throw error;
  }
};

/**
 * Calculate delivery estimate between two points
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @param {string} pharmacyId - Pharmacy ID for delivery zone info
 * @returns {Promise} Delivery estimate information
 */
export const calculateDeliveryEstimate = async (origin, destination, pharmacyId) => {
  try {
    const response = await api.post(`/pharmacy/${pharmacyId}/delivery-estimate`, {
      origin,
      destination
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating delivery estimate:', error);
    throw error;
  }
};

/**
 * Get user's saved locations
 * @returns {Promise} API response with user's saved locations
 */
export const getUserLocations = async () => {
  try {
    const response = await api.get('/user/locations');
    return response.data;
  } catch (error) {
    console.error('Error getting user locations:', error);
    throw error;
  }
};

/**
 * Save a new location for the user
 * @param {Object} locationData - Location data
 * @param {string} locationData.name - Location name/label
 * @param {Object} locationData.address - Address object
 * @param {Array} locationData.coordinates - [longitude, latitude]
 * @param {boolean} locationData.isDefault - Whether this is the default location
 * @returns {Promise} API response
 */
export const saveUserLocation = async (locationData) => {
  try {
    const response = await api.post('/user/locations', locationData);
    return response.data;
  } catch (error) {
    console.error('Error saving user location:', error);
    throw error;
  }
};

/**
 * Update user's default location
 * @param {string} locationId - Location ID to set as default
 * @returns {Promise} API response
 */
export const setDefaultLocation = async (locationId) => {
  try {
    const response = await api.put(`/user/locations/${locationId}/default`);
    return response.data;
  } catch (error) {
    console.error('Error setting default location:', error);
    throw error;
  }
};

/**
 * Delete a saved location
 * @param {string} locationId - Location ID to delete
 * @returns {Promise} API response
 */
export const deleteUserLocation = async (locationId) => {
  try {
    const response = await api.delete(`/user/locations/${locationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user location:', error);
    throw error;
  }
};

/**
 * Geocode an address to get coordinates
 * @param {string} address - Address string to geocode
 * @returns {Promise} Geocoding results
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await api.post('/location/geocode', { address });
    return response.data;
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise} Address information
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await api.post('/location/reverse-geocode', { latitude, longitude });
    return response.data;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
};

export default {
  findNearbyPharmacies,
  searchPharmacies,
  getPharmacyDetails,
  getPharmacyHours,
  calculateDeliveryEstimate,
  getUserLocations,
  saveUserLocation,
  setDefaultLocation,
  deleteUserLocation,
  geocodeAddress,
  reverseGeocode
};
