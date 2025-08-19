/**
 * Geospatial Utility Functions
 * Provides distance calculations and location-based utilities
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate estimated travel time between two points
 * @param {number} distance - Distance in kilometers
 * @param {string} transportMode - Mode of transport (walking, driving, cycling)
 * @returns {number} Estimated time in minutes
 */
export const calculateEstimatedTime = (distance, transportMode = 'driving') => {
  const speeds = {
    walking: 5,    // km/h
    cycling: 15,   // km/h
    driving: 40,   // km/h (accounting for city traffic)
    delivery: 30   // km/h (delivery vehicle in city)
  };
  
  const speed = speeds[transportMode] || speeds.driving;
  return Math.round((distance / speed) * 60); // Convert to minutes
};

/**
 * Check if a point is within a given radius of another point
 * @param {Object} center - Center point {latitude, longitude}
 * @param {Object} point - Point to check {latitude, longitude}
 * @param {number} radius - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
export const isWithinRadius = (center, point, radius) => {
  const distance = calculateDistance(
    center.latitude,
    center.longitude,
    point.latitude,
    point.longitude
  );
  
  return distance <= radius;
};

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
  const bearing = Math.atan2(y, x);
  
  return (toDegrees(bearing) + 360) % 360;
};

/**
 * Convert radians to degrees
 * @param {number} radians - Radians to convert
 * @returns {number} Degrees
 */
const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Find the center point of multiple coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} Center point {latitude, longitude}
 */
export const findCenterPoint = (coordinates) => {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];
  
  let x = 0;
  let y = 0;
  let z = 0;
  
  coordinates.forEach(coord => {
    const lat = toRadians(coord.latitude);
    const lon = toRadians(coord.longitude);
    
    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  });
  
  const total = coordinates.length;
  x /= total;
  y /= total;
  z /= total;
  
  const centralLon = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);
  
  return {
    latitude: toDegrees(centralLat),
    longitude: toDegrees(centralLon)
  };
};

/**
 * Create a bounding box around a center point
 * @param {Object} center - Center point {latitude, longitude}
 * @param {number} radius - Radius in kilometers
 * @returns {Object} Bounding box {north, south, east, west}
 */
export const createBoundingBox = (center, radius) => {
  const R = 6371; // Earth's radius in km
  
  const lat = toRadians(center.latitude);
  const lon = toRadians(center.longitude);
  
  const angular_radius = radius / R;
  
  const lat_min = lat - angular_radius;
  const lat_max = lat + angular_radius;
  
  const delta_lon = Math.asin(Math.sin(angular_radius) / Math.cos(lat));
  const lon_min = lon - delta_lon;
  const lon_max = lon + delta_lon;
  
  return {
    north: toDegrees(lat_max),
    south: toDegrees(lat_min),
    east: toDegrees(lon_max),
    west: toDegrees(lon_min)
  };
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
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} km`;
  } else {
    return `${Math.round(distance)} km`;
  }
};

/**
 * Format estimated time for display
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export const formatEstimatedTime = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
};

/**
 * Calculate delivery zones based on distance rings
 * @param {Object} center - Center point {latitude, longitude}
 * @param {Array} radiuses - Array of radius values in kilometers
 * @returns {Array} Array of delivery zones with pricing tiers
 */
export const calculateDeliveryZones = (center, radiuses = [5, 10, 15, 20]) => {
  return radiuses.map((radius, index) => ({
    zone: index + 1,
    name: `Zone ${index + 1}`,
    radius,
    description: radius <= 5 ? 'Local delivery' :
                radius <= 10 ? 'Standard delivery' :
                radius <= 15 ? 'Extended delivery' : 'Long distance delivery',
    estimatedTime: calculateEstimatedTime(radius, 'delivery'),
    baseFee: index * 2.5 + 2.5, // Progressive pricing
    boundingBox: createBoundingBox(center, radius)
  }));
};

/**
 * Find optimal meeting point between multiple locations
 * @param {Array} locations - Array of {latitude, longitude} objects
 * @param {Object} weights - Optional weights for each location
 * @returns {Object} Optimal meeting point {latitude, longitude}
 */
export const findOptimalMeetingPoint = (locations, weights = null) => {
  if (locations.length === 0) return null;
  if (locations.length === 1) return locations[0];
  
  // If no weights provided, use equal weights
  if (!weights) {
    weights = locations.map(() => 1);
  }
  
  let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let weightedLat = 0;
  let weightedLon = 0;
  
  locations.forEach((location, index) => {
    const weight = weights[index] / totalWeight;
    weightedLat += location.latitude * weight;
    weightedLon += location.longitude * weight;
  });
  
  return {
    latitude: weightedLat,
    longitude: weightedLon
  };
};

/**
 * Calculate route efficiency for multiple stops
 * @param {Object} origin - Starting point {latitude, longitude}
 * @param {Array} destinations - Array of destination points
 * @param {Object} destination - Final destination {latitude, longitude}
 * @returns {Object} Route efficiency metrics
 */
export const calculateRouteEfficiency = (origin, destinations, finalDestination) => {
  if (destinations.length === 0) {
    return {
      totalDistance: calculateDistance(origin.latitude, origin.longitude, finalDestination.latitude, finalDestination.longitude),
      totalTime: calculateEstimatedTime(calculateDistance(origin.latitude, origin.longitude, finalDestination.latitude, finalDestination.longitude)),
      efficiency: 100,
      stops: 0
    };
  }
  
  // Calculate direct route distance
  const directDistance = calculateDistance(
    origin.latitude, origin.longitude,
    finalDestination.latitude, finalDestination.longitude
  );
  
  // Calculate actual route distance through all stops
  let totalDistance = 0;
  let currentPoint = origin;
  
  // Add distances to each destination
  destinations.forEach(dest => {
    totalDistance += calculateDistance(
      currentPoint.latitude, currentPoint.longitude,
      dest.latitude, dest.longitude
    );
    currentPoint = dest;
  });
  
  // Add final leg to destination
  totalDistance += calculateDistance(
    currentPoint.latitude, currentPoint.longitude,
    finalDestination.latitude, finalDestination.longitude
  );
  
  const efficiency = (directDistance / totalDistance) * 100;
  const totalTime = calculateEstimatedTime(totalDistance, 'delivery');
  
  return {
    totalDistance: Math.round(totalDistance * 100) / 100,
    directDistance: Math.round(directDistance * 100) / 100,
    totalTime,
    efficiency: Math.round(efficiency),
    stops: destinations.length,
    timePerStop: destinations.length > 0 ? Math.round(totalTime / destinations.length) : 0
  };
};

/**
 * Generate geographic grid for coverage analysis
 * @param {Object} boundingBox - Area bounds {north, south, east, west}
 * @param {number} gridSize - Grid cell size in kilometers
 * @returns {Array} Array of grid points with coverage data
 */
export const generateCoverageGrid = (boundingBox, gridSize = 2) => {
  const grid = [];
  const latStep = (gridSize / 111); // Approximate degrees per km for latitude
  const lonStep = (gridSize / (111 * Math.cos(toRadians((boundingBox.north + boundingBox.south) / 2))));
  
  for (let lat = boundingBox.south; lat <= boundingBox.north; lat += latStep) {
    for (let lon = boundingBox.west; lon <= boundingBox.east; lon += lonStep) {
      grid.push({
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lon * 10000) / 10000,
        gridId: `${Math.round(lat * 100)}_${Math.round(lon * 100)}`,
        covered: false,
        nearestPharmacies: [],
        averageDistance: null
      });
    }
  }
  
  return grid;
};

export default {
  calculateDistance,
  calculateEstimatedTime,
  isWithinRadius,
  calculateBearing,
  findCenterPoint,
  createBoundingBox,
  validateCoordinates,
  formatDistance,
  formatEstimatedTime,
  calculateDeliveryZones,
  findOptimalMeetingPoint,
  calculateRouteEfficiency,
  generateCoverageGrid
};
