import React, { useState, useEffect } from 'react';
import { MapPinIcon, ClockIcon, PhoneIcon, StarIcon, TruckIcon } from '@heroicons/react/24/outline';
import { findNearbyPharmacies } from '../../services/locationService';
import { getCurrentLocation, formatDistance } from '../../utils/locationUtils';

const NearbyPharmacies = ({ 
  userLocation = null, 
  maxDistance = 25, 
  limit = 10,
  onPharmacySelect = null,
  showMap = true,
  className = ''
}) => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(userLocation);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      fetchNearbyPharmacies();
    }
  }, [currentLocation, maxDistance, limit]);

  const fetchNearbyPharmacies = async () => {
    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await findNearbyPharmacies(
        currentLocation.latitude,
        currentLocation.longitude,
        maxDistance,
        limit
      );

      if (response.success) {
        setPharmacies(response.data.pharmacies || []);
      } else {
        setError('Failed to fetch nearby pharmacies');
      }
    } catch (err) {
      console.error('Error fetching nearby pharmacies:', err);
      setError('Failed to load nearby pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch (err) {
      console.error('Error getting current location:', err);
      setError('Unable to get your current location. Please enable location services.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const formatOperatingHours = (operatingHours) => {
    if (!operatingHours || operatingHours.length === 0) return 'Hours not available';
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = operatingHours.find(hours => hours.day === today);
    
    if (!todayHours) return 'Hours not available';
    
    if (!todayHours.isOpen) return 'Closed today';
    
    return `${todayHours.openTime || '09:00'} - ${todayHours.closeTime || '18:00'}`;
  };

  const renderRating = (rating) => {
    if (!rating || !rating.averageRating) return 'No ratings';
    
    const stars = Math.floor(rating.averageRating);
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <StarIcon
              key={i}
              className={`h-4 w-4 ${
                i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {rating.averageRating.toFixed(1)} ({rating.totalReviews || 0})
        </span>
      </div>
    );
  };

  const renderServices = (services) => {
    if (!services) return null;
    
    const availableServices = Object.entries(services)
      .filter(([_, available]) => available)
      .map(([service, _]) => service.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim())
      .slice(0, 3); // Show only first 3 services

    if (availableServices.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {availableServices.map((service, index) => (
          <span
            key={index}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full"
          >
            {service}
          </span>
        ))}
      </div>
    );
  };

  if (!currentLocation) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Find Nearby Pharmacies
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Allow location access to find pharmacies near you
          </p>
          <button
            onClick={handleGetCurrentLocation}
            disabled={loadingLocation}
            className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loadingLocation ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <MapPinIcon className="h-4 w-4" />
            )}
            <span>Get Current Location</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nearby Pharmacies
          </h3>
          <button
            onClick={fetchNearbyPharmacies}
            disabled={loading}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {currentLocation && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Within {maxDistance} km of your location
          </p>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pharmacies.length > 0 ? (
          <div className="space-y-4">
            {pharmacies.map((pharmacy) => (
              <div
                key={pharmacy._id}
                className={`border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow ${
                  onPharmacySelect ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''
                }`}
                onClick={() => onPharmacySelect && onPharmacySelect(pharmacy)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {pharmacy.name}
                    </h4>
                    {pharmacy.distance && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 mt-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{formatDistance(pharmacy.distance.km)} away</span>
                      </div>
                    )}
                  </div>
                  {renderRating(pharmacy.rating)}
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {pharmacy.address?.street}, {pharmacy.address?.city}, {pharmacy.address?.state} {pharmacy.address?.zipCode}
                    </span>
                  </div>

                  {pharmacy.contact?.phone && (
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{pharmacy.contact.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{formatOperatingHours(pharmacy.operatingHours)}</span>
                  </div>

                  {pharmacy.services?.delivery && (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <TruckIcon className="h-4 w-4 flex-shrink-0" />
                      <span>Delivery available</span>
                    </div>
                  )}
                </div>

                {renderServices(pharmacy.services)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No pharmacies found
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Try increasing the search radius or check your location settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyPharmacies;
