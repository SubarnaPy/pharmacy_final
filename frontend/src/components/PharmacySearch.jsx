import React, { useState, useEffect, useCallback } from 'react';
import { pharmacyAPI, chatAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaSearch, FaMapMarkerAlt, FaClock, FaPhone, FaStar, FaComments, FaRoute } from 'react-icons/fa';

const PharmacySearch = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState({
    location: '',
    maxDistance: 10,
    sortBy: 'distance',
    services: []
  });
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [availableServices] = useState([
    'prescription_filling',
    'home_delivery',
    'consultation',
    'emergency_service',
    'insurance_accepted'
  ]);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          // Auto-search nearby pharmacies
          handleSearch({
            ...searchCriteria,
            location: `${position.coords.latitude},${position.coords.longitude}`
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.info('Please enter your location manually or allow location access');
        }
      );
    }
  }, []);

  const handleSearch = useCallback(async (criteria = searchCriteria) => {
    if (!criteria.location) {
      toast.error('Please provide a location');
      return;
    }

    setLoading(true);
    try {
      const response = await pharmacyAPI.searchPharmacies({
        location: criteria.location,
        maxDistance: criteria.maxDistance,
        sortBy: criteria.sortBy,
        services: criteria.services
      });

      if (response.data.success) {
        setPharmacies(response.data.data);
      }
    } catch (error) {
      console.error('Error searching pharmacies:', error);
      toast.error('Failed to search pharmacies');
    } finally {
      setLoading(false);
    }
  }, [searchCriteria]);

  const handleServiceToggle = (service) => {
    setSearchCriteria(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleStartChat = async (pharmacy) => {
    try {
      const response = await chatAPI.initializeChat(pharmacy._id);
      if (response.data.success) {
        toast.success('Chat started with ' + pharmacy.name);
        // Redirect to chat interface
        window.location.href = `/chat/${response.data.data.chatId}`;
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const getDirections = (pharmacy) => {
    if (userLocation && pharmacy.location.coordinates) {
      const [lng, lat] = pharmacy.location.coordinates;
      const url = `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      const address = encodeURIComponent(pharmacy.address);
      window.open(`https://www.google.com/maps/search/${address}`, '_blank');
    }
  };

  const formatDistance = (distance) => {
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const formatOperatingHours = (hours) => {
    if (!hours || hours.length === 0) return 'Hours not available';
    const today = new Date().getDay();
    const todayHours = hours.find(h => h.day === today);
    if (!todayHours) return 'Closed today';
    if (todayHours.is24Hours) return 'Open 24 hours';
    return `${todayHours.open} - ${todayHours.close}`;
  };

  const isPharmacyOpen = (hours) => {
    if (!hours || hours.length === 0) return false;
    const now = new Date();
    const today = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = hours.find(h => h.day === today);
    if (!todayHours) return false;
    if (todayHours.is24Hours) return true;
    
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Find Nearby Pharmacies</h2>

        {/* Search Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={searchCriteria.location}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter address or coordinates"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Distance (km)
              </label>
              <select
                value={searchCriteria.maxDistance}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, maxDistance: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FaSearch />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Service Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services
            </label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(service => (
                <button
                  key={service}
                  onClick={() => handleServiceToggle(service)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    searchCriteria.services.includes(service)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {pharmacies.map(pharmacy => (
          <div key={pharmacy._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">{pharmacy.name}</h3>
                  <div className="flex items-center gap-2">
                    {isPharmacyOpen(pharmacy.operatingHours) ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Open
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Closed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaMapMarkerAlt className="text-red-500" />
                    <span>{pharmacy.address}</span>
                    {pharmacy.distance && (
                      <span className="text-blue-600 font-medium">
                        ({formatDistance(pharmacy.distance)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <FaClock className="text-blue-500" />
                    <span>{formatOperatingHours(pharmacy.operatingHours)}</span>
                  </div>

                  {pharmacy.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaPhone className="text-green-500" />
                      <span>{pharmacy.phone}</span>
                    </div>
                  )}

                  {pharmacy.rating && (
                    <div className="flex items-center gap-2">
                      <FaStar className="text-yellow-500" />
                      <span className="font-medium">{pharmacy.rating.toFixed(1)}</span>
                      <span className="text-gray-500">
                        ({pharmacy.reviewCount || 0} reviews)
                      </span>
                    </div>
                  )}
                </div>

                {pharmacy.services && pharmacy.services.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {pharmacy.services.map(service => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                        >
                          {service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 lg:ml-6 mt-4 lg:mt-0">
                <button
                  onClick={() => handleStartChat(pharmacy)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <FaComments />
                  Start Chat
                </button>

                <button
                  onClick={() => getDirections(pharmacy)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <FaRoute />
                  Directions
                </button>

                <button
                  onClick={() => setSelectedPharmacy(pharmacy)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 whitespace-nowrap"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && pharmacies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No pharmacies found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pharmacy Details Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {selectedPharmacy.name}
                </h3>
                <button
                  onClick={() => setSelectedPharmacy(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Contact Information</h4>
                  <p className="text-gray-600">{selectedPharmacy.address}</p>
                  {selectedPharmacy.phone && (
                    <p className="text-gray-600">Phone: {selectedPharmacy.phone}</p>
                  )}
                  {selectedPharmacy.email && (
                    <p className="text-gray-600">Email: {selectedPharmacy.email}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Operating Hours</h4>
                  <div className="space-y-1">
                    {selectedPharmacy.operatingHours?.map(hour => (
                      <div key={hour.day} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][hour.day]}
                        </span>
                        <span className="text-gray-800">
                          {hour.is24Hours ? '24 Hours' : `${hour.open} - ${hour.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPharmacy.description && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedPharmacy.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleStartChat(selectedPharmacy)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <FaComments />
                    Start Chat
                  </button>
                  <button
                    onClick={() => getDirections(selectedPharmacy)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaRoute />
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacySearch;
