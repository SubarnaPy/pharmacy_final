/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Calculate distance in miles
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export const calculateDistanceInMiles = (lat1, lng1, lat2, lng2) => {
  const distanceInKm = calculateDistance(lat1, lng1, lat2, lng2);
  return distanceInKm * 0.621371; // Convert km to miles
};

/**
 * Find nearest pharmacies to a given location
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @param {Array} pharmacies - Array of pharmacy objects with location data
 * @param {number} maxDistance - Maximum distance in kilometers (default: 1000)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Array} Array of pharmacies with distance information, sorted by distance
 */
export const findNearestPharmacies = (userLocation, pharmacies, maxDistance = 1000, limit = 10) => {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return [];
  }

  const pharmaciesWithDistance = pharmacies
    .filter(pharmacy => {
      // Ensure pharmacy has valid location data
      return pharmacy.location && 
             pharmacy.location.coordinates && 
             pharmacy.location.coordinates.length === 2;
    })
    .map(pharmacy => {
      const [lng, lat] = pharmacy.location.coordinates; // MongoDB stores as [lng, lat]
      const distance = calculateDistance(
        userLocation.latitude, 
        userLocation.longitude, 
        lat, 
        lng
      );
      
      return {
        ...pharmacy,
        distance: {
          km: Math.round(distance * 100) / 100, // Round to 2 decimal places
          miles: Math.round(distance * 0.621371 * 100) / 100
        }
      };
    })
    .filter(pharmacy => pharmacy.distance.km <= maxDistance)
    .sort((a, b) => a.distance.km - b.distance.km)
    .slice(0, limit);

  return pharmaciesWithDistance;
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if coordinates are valid
 */
export const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @param {string} unit - Unit preference ('km' or 'miles')
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance, unit = 'km') => {
  if (unit === 'miles') {
    const miles = distance * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
  return `${distance.toFixed(1)} km`;
};

/**
 * Get user's current location using browser geolocation API
 * @returns {Promise<Object>} Promise resolving to {latitude, longitude} or null
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  });
};

/**
 * Geocode an address to get coordinates
 * @param {string} address - Address string
 * @returns {Promise<Object>} Promise resolving to location data
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        address: {
          street: result.display_name.split(',')[0]?.trim() || '',
          city: result.address?.city || result.address?.town || '',
          state: result.address?.state || '',
          zipCode: result.address?.postcode || '',
          country: result.address?.country || 'United States'
        }
      };
    }
    
    throw new Error('Address not found');
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Promise resolving to address data
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    
    if (data) {
      return {
        formattedAddress: data.display_name,
        address: {
          street: data.display_name.split(',')[0]?.trim() || '',
          city: data.address?.city || data.address?.town || '',
          state: data.address?.state || '',
          zipCode: data.address?.postcode || '',
          country: data.address?.country || 'United States'
        }
      };
    }
    
    throw new Error('Location not found');
  } catch (error) {
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
};
