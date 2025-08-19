import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  PhoneIcon,
  BellIcon,
  MagnifyingGlassIcon,
  MapIcon,
  TruckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  StarIcon,

  ArrowsUpDownIcon,
  HomeIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different markers
const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function PrescriptionQueue() {
  const { isDarkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [prescriptionRequests, setPrescriptionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRequest, setMapRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    urgency: 'all',
    search: '',
    deliveryMethod: 'all',
    dateRange: 'all'
  });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedRequests, setSelectedRequests] = useState(new Set());

  // Advanced features state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [queueStats, setQueueStats] = useState({
    totalToday: 0,
    avgResponseTime: 0,
    completionRate: 0,
    emergencyCount: 0,
    revenueToday: 0
  });
  useEffect(() => {
    fetchPrescriptionQueue();
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchPrescriptionQueue();
        setLastRefresh(new Date());
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filters, sortBy, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (prescriptionRequests.length > 0) {
      const today = new Date().toDateString();
      const todayRequests = prescriptionRequests.filter(req =>
        new Date(req.createdAt || req.submittedAt).toDateString() === today
      );
      const emergencyRequests = prescriptionRequests.filter(req =>
        req.preferences?.urgency === 'emergency'
      );
      const totalValue = prescriptionRequests.reduce((sum, req) =>
        sum + (req.estimatedValue || 0), 0
      );
      setQueueStats({
        totalToday: todayRequests.length,
        avgResponseTime: 15,
        completionRate: 85,
        emergencyCount: emergencyRequests.length,
        revenueToday: totalValue
      });
    }
  }, [prescriptionRequests]); const
    fetchPrescriptionQueue = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching prescription queue...');
        const response = await apiClient.get('/prescription-requests/pharmacy/queue');
        console.log('✅ Prescription queue data received:', response);

        const queue = response.data.data.queue || [];
        setPrescriptionRequests(queue);

        if (queue.length > prescriptionRequests.length) {
          const newCount = queue.length - prescriptionRequests.length;
          addNotification(`${newCount} new prescription request${newCount > 1 ? 's' : ''} received`, 'info');
        }
      } catch (error) {
        console.error('❌ Error fetching prescription queue:', error);
        toast.error(`Failed to fetch prescription queue: ${error.response?.data?.message || error.message}`);
        setPrescriptionRequests([]);
      } finally {
        setLoading(false);
      }
    };
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleAcceptRequest = async (requestId, customResponse = null) => {
    try {
      const requestData = customResponse || {
        action: 'accept',
        estimatedFulfillmentTime: 120,
        quotedPrice: { total: selectedRequest?.estimatedValue || 0 },
        notes: 'We can fulfill this prescription promptly.'
      };

      await apiClient.post(`/prescription-requests/${requestId}/respond`, requestData);
      toast.success('Prescription request accepted successfully!');
      addNotification('Prescription request accepted successfully', 'success');
      fetchPrescriptionQueue();
      setSelectedRequest(null);
    } catch (error) {
      console.error('❌ Error accepting request:', error);
      toast.error('Failed to accept prescription request');
      addNotification('Failed to accept request', 'error');
    }
  };

  const handleDeclineRequest = async (requestId, reason = '') => {
    try {
      const requestData = {
        action: 'decline',
        notes: reason || 'Unable to fulfill this prescription at this time.'
      };

      await apiClient.post(`/prescription-requests/${requestId}/respond`, requestData);
      toast.success('Prescription request declined.');
      addNotification('Prescription request declined', 'warning');
      fetchPrescriptionQueue();
      setSelectedRequest(null);
    } catch (error) {
      console.error('❌ Error declining request:', error);
      toast.error('Failed to decline prescription request');
      addNotification('Failed to decline request', 'error');
    }
  };
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatExpiryTime = (timestamp) => {
    const time = new Date(timestamp);
    const now = new Date();
    const diff = time - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours < 1) return `${minutes} min left`;
    return `${hours}h ${minutes}m left`;
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'urgent': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'routine': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  // Enhanced Map Component with advanced features
  const EnhancedMap = ({ patientLocation, pharmacyLocation, onRouteCalculated }) => {
    const [route, setRoute] = useState(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [mapError, setMapError] = useState(false);

    // Map event handler component
    const MapEvents = () => {
      useMapEvents({
        click: (e) => {
          console.log('Map clicked at:', e.latlng);
        },
        zoomend: (e) => {
          console.log('Zoom level:', e.target.getZoom());
        }
      });
      return null;
    };

    // Calculate route between pharmacy and patient
    const calculateRoute = useCallback(async () => {
      if (!patientLocation || !pharmacyLocation) return;

      setIsCalculatingRoute(true);
      try {
        // Using OpenRouteService API (free alternative to Google Directions)
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=YOUR_API_KEY&start=${pharmacyLocation[1]},${pharmacyLocation[0]}&end=${patientLocation[1]},${patientLocation[0]}`
        );

        if (response.ok) {
          const data = await response.json();
          const coordinates = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(coordinates);

          const distance = data.features[0].properties.segments[0].distance / 1000; // Convert to km
          const duration = data.features[0].properties.segments[0].duration / 60; // Convert to minutes

          onRouteCalculated && onRouteCalculated({ distance: distance.toFixed(1), duration: Math.ceil(duration) });
        }
      } catch (error) {
        console.error('Error calculating route:', error);
        // Fallback to straight line
        setRoute([pharmacyLocation, patientLocation]);
      } finally {
        setIsCalculatingRoute(false);
      }
    }, [patientLocation, pharmacyLocation, onRouteCalculated]);

    useEffect(() => {
      calculateRoute();
    }, [calculateRoute]);

    try {
      if (mapError) {
        return (
          <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Map Unavailable</h3>
              <p className="text-gray-600 dark:text-gray-400">Unable to load the interactive map</p>
            </div>
          </div>
        );
      }

      return (
        <MapContainer
          center={patientLocation || [22.5726, 88.3639]}
          zoom={13}
          style={{ height: '400px', width: '100%' }}
          className="rounded-lg"
          onError={() => setMapError(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEvents />

          {/* Patient Location Marker */}
          {patientLocation && (
            <Marker position={patientLocation} icon={patientIcon}>
              <Popup>
                <div className="text-center">
                  <HomeIcon className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <strong>Patient Location</strong>
                  <br />
                  <small>{patientLocation[0].toFixed(4)}, {patientLocation[1].toFixed(4)}</small>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Pharmacy Location Marker */}
          {pharmacyLocation && (
            <Marker position={pharmacyLocation} icon={pharmacyIcon}>
              <Popup>
                <div className="text-center">
                  <BuildingStorefrontIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <strong>Pharmacy Location</strong>
                  <br />
                  <small>{pharmacyLocation[0].toFixed(4)}, {pharmacyLocation[1].toFixed(4)}</small>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Service Area Circle around Pharmacy */}
          {pharmacyLocation && (
            <Circle
              center={pharmacyLocation}
              radius={5000} // 5km service area
              pathOptions={{
                color: 'green',
                fillColor: 'green',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
              }}
            />
          )}

          {/* Route Line */}
          {route && (
            <Polyline
              positions={route}
              pathOptions={{
                color: 'blue',
                weight: 4,
                opacity: 0.7,
                dashArray: isCalculatingRoute ? '10, 10' : null
              }}
            />
          )}
        </MapContainer>
      );
    } catch (error) {
      console.error('Error rendering EnhancedMap:', error);
      setMapError(true);
      return (
        <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Map Error</h3>
            <p className="text-gray-600 dark:text-gray-400">Unable to render the interactive map</p>
          </div>
        </div>
      );
    }
  };

  const MapModal = ({ request, onClose }) => {
    const [estimatedDistance, setEstimatedDistance] = useState(null);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [address, setAddress] = useState('Loading address...');
    const [mapError, setMapError] = useState(false);
    const [showTrafficLayer, setShowTrafficLayer] = useState(false);
    const [mapStyle, setMapStyle] = useState('standard');

    if (!request) return null;

    const patientLocation = request.metadata?.geoLocation;
    const hasLocation = patientLocation && patientLocation.length === 2;
    const longitude = hasLocation ? patientLocation[0] : null;
    const latitude = hasLocation ? patientLocation[1] : null;

    // Convert to [lat, lng] format for Leaflet
    const patientLatLng = hasLocation ? [latitude, longitude] : null;
    const pharmacyLatLng = [22.5726, 88.3639]; // Default pharmacy location (make this dynamic)

    const handleRouteCalculated = useCallback((routeData) => {
      setEstimatedDistance(routeData.distance);
      setEstimatedTime(routeData.duration);
    }, []);

    useEffect(() => {
      if (hasLocation) {
        // Calculate distance using Haversine formula
        // Assuming pharmacy location (you can make this dynamic)
        const pharmacyLat = 22.5726; // Example: Kolkata area
        const pharmacyLng = 88.3639;

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371; // Radius of the Earth in kilometers
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return distance;
        };

        const distance = calculateDistance(pharmacyLat, pharmacyLng, latitude, longitude);
        const estimatedTime = Math.ceil(distance * 4); // Assuming 4 minutes per km in city traffic

        setEstimatedDistance(distance.toFixed(1));
        setEstimatedTime(estimatedTime);

        // Reverse geocoding to get address (using a free service)
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          .then(response => response.json())
          .then(data => {
            if (data.locality && data.principalSubdivision) {
              setAddress(`${data.locality}, ${data.principalSubdivision}, ${data.countryName}`);
            } else {
              setAddress(`${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
            }
          })
          .catch(() => {
            setAddress(`${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
          });
      }
    }, [hasLocation, latitude, longitude]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Patient Location & Delivery Details</h2>
                <p className="text-blue-100">
                  {request.requestNumber} • {request.patient?.profile?.firstName} {request.patient?.profile?.lastName}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6">
            {hasLocation ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-3">
                      <MapPinIcon className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">Patient Address</p>
                        <p className="text-sm text-green-600">{address}</p>
                        <p className="text-xs text-green-500 mt-1">{latitude?.toFixed(4)}°N, {longitude?.toFixed(4)}°E</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <TruckIcon className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-800 dark:text-purple-300">Distance</p>
                        <p className="text-sm text-purple-600">{estimatedDistance ? `${estimatedDistance} km` : 'Calculating...'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-300">Travel Time</p>
                        <p className="text-sm text-orange-600">{estimatedTime ? `${estimatedTime} min` : 'Calculating...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Enhanced Interactive Map */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <MapIcon className="h-5 w-5 mr-2 text-blue-600" />
                          Interactive Route Map
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Live map with route planning and delivery optimization
                        </p>
                      </div>

                      {/* Map Controls */}
                      <div className="flex items-center space-x-2">
                        <select
                          value={mapStyle}
                          onChange={(e) => setMapStyle(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="standard">Standard</option>
                          <option value="satellite">Satellite</option>
                          <option value="terrain">Terrain</option>
                        </select>

                        <button
                          onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${showTrafficLayer
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          Traffic
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Enhanced Leaflet Map */}
                    <div className="h-96 bg-gray-100 dark:bg-gray-700">
                      <EnhancedMap
                        patientLocation={patientLatLng}
                        pharmacyLocation={pharmacyLatLng}
                        onRouteCalculated={handleRouteCalculated}
                      />
                    </div>

                    {/* Map Legend */}
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-600">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Map Legend</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-gray-700 dark:text-gray-300">Patient Location</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700 dark:text-gray-300">Pharmacy</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-0.5 bg-blue-500"></div>
                          <span className="text-gray-700 dark:text-gray-300">Route</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 border border-green-500 rounded-full bg-green-100"></div>
                          <span className="text-gray-700 dark:text-gray-300">Service Area</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions Overlay */}
                    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1 text-red-500" />
                        Patient: {address}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium transition-colors flex items-center space-x-1"
                        >
                          <MapIcon className="h-3 w-3" />
                          <span>Google Maps</span>
                        </button>
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank')}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition-colors flex items-center space-x-1"
                        >
                          <TruckIcon className="h-3 w-3" />
                          <span>Navigate</span>
                        </button>
                        <button
                          onClick={() => window.open(`tel:${request.patient?.contact?.phone}`, '_self')}
                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded font-medium transition-colors flex items-center space-x-1"
                          disabled={!request.patient?.contact?.phone}
                        >
                          <PhoneIcon className="h-3 w-3" />
                          <span>Call</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Route Information */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <TruckIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Route Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Distance:</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {estimatedDistance ? `${estimatedDistance} km` : 'Calculating...'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Est. Travel Time:</span>
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {estimatedTime ? `${estimatedTime} min` : 'Calculating...'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Method:</span>
                        <div className="flex items-center space-x-2">
                          {request.preferences?.deliveryMethod === 'delivery' ? (
                            <>
                              <TruckIcon className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600 capitalize">Home Delivery</span>
                            </>
                          ) : request.preferences?.deliveryMethod === 'pickup' ? (
                            <>
                              <MapPinIcon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-600 capitalize">Store Pickup</span>
                            </>
                          ) : (
                            <>
                              <ArrowsUpDownIcon className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-600 capitalize">Either Method</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2 text-green-600" />
                      Patient Details
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.patient?.profile?.firstName} {request.patient?.profile?.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.patient?.contact?.phone || 'No phone provided'}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Address:</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{address}</p>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Urgency:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.preferences?.urgency || 'routine')}`}>
                          {(request.preferences?.urgency || 'routine').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => { handleAcceptRequest(request._id); onClose(); }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Accept Request</span>
                  </button>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Location Data</h3>
                <p className="text-gray-600 dark:text-gray-400">Patient location information is not available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RequestDetailModal = ({ request, onClose }) => {
    const [response, setResponse] = useState({
      estimatedTime: '2 hours',
      quotedPrice: request?.estimatedValue || 0,
      notes: '',
      substitutions: [],
      detailedBill: {
        medications: request?.medications?.map(med => ({
          name: med.name,
          brandName: med.brandName,
          genericName: med.genericName,
          strength: med.dosage?.form || '',
          quantity: med.quantity,
          pricing: {
            unitPrice: 0,
            totalPrice: 0,
            insuranceCoverage: 0,
            patientPay: 0
          },
          availability: {
            inStock: true,
            stockQuantity: 100
          },
          substitution: {
            isSubstituted: false,
            originalMedication: '',
            reason: '',
            savings: 0
          }
        })) || [],
        summary: {
          subtotal: 0,
          discount: {
            amount: 0,
            reason: '',
            percentage: 0
          },
          tax: {
            amount: 0,
            rate: 8.5
          },
          fees: [],
          insurance: {
            copay: 0,
            deductible: 0,
            coinsurance: 0,
            totalCoverage: 0
          },
          finalTotal: 0,
          patientOwes: 0
        }
      },
      pharmacyMessage: {
        title: '',
        content: '',
        priority: 'normal',
        requiresAcknowledgment: false,
        messageType: 'info'
      },
      pharmacyInfo: {
        specialInstructions: '',
        pickupInstructions: '',
        deliveryInstructions: '',
        consultationAvailable: false,
        consultationFee: 0,
        pharmacistName: '',
        contactNumber: ''
      }
    });

    const [showDetailedBilling, setShowDetailedBilling] = useState(false);
    const [showPharmacyMessage, setShowPharmacyMessage] = useState(false);

    // Helper function to calculate bill totals
    const calculateBillTotals = () => {
      const subtotal = response.detailedBill.medications.reduce((sum, med) => sum + (med.pricing.totalPrice || 0), 0);
      const discountAmount = response.detailedBill.summary.discount.amount || 0;
      const taxAmount = (subtotal - discountAmount) * (response.detailedBill.summary.tax.rate / 100);
      const feesTotal = response.detailedBill.summary.fees.reduce((sum, fee) => sum + fee.amount, 0);
      const insuranceCoverage = response.detailedBill.summary.insurance.totalCoverage || 0;
      const finalTotal = subtotal - discountAmount + taxAmount + feesTotal;
      const patientOwes = Math.max(0, finalTotal - insuranceCoverage);

      setResponse(prev => ({
        ...prev,
        quotedPrice: patientOwes,
        detailedBill: {
          ...prev.detailedBill,
          summary: {
            ...prev.detailedBill.summary,
            subtotal,
            tax: { ...prev.detailedBill.summary.tax, amount: taxAmount },
            finalTotal,
            patientOwes
          }
        }
      }));
    };

    // Update medication pricing
    const updateMedicationPricing = (index, field, value) => {
      const updatedMedications = [...response.detailedBill.medications];
      updatedMedications[index].pricing[field] = parseFloat(value) || 0;

      if (field === 'unitPrice') {
        updatedMedications[index].pricing.totalPrice =
          updatedMedications[index].pricing.unitPrice * (updatedMedications[index].quantity?.prescribed || 1);
      }

      setResponse(prev => ({
        ...prev,
        detailedBill: {
          ...prev.detailedBill,
          medications: updatedMedications
        }
      }));
    };

    if (!request) return null;

    // Safe render function for complex data
    const safeRender = (value, fallback = 'Not specified') => {
      try {
        if (value === null || value === undefined) return fallback;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
      } catch (error) {
        console.error('Error rendering value:', error);
        return fallback;
      }
    };

    try {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Prescription Request Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircleIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Request Number</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{request.requestNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient</label>
                    <p className="text-lg text-gray-900 dark:text-white">
                      {request.patient?.profile?.firstName || 'Unknown'} {request.patient?.profile?.lastName || 'Patient'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.patient?.contact?.phone || 'No phone'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${request.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      request.status === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        request.status === 'submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                      {(request.status || 'draft').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Urgency</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(request.preferences?.urgency || 'routine')}`}>
                      {(request.preferences?.urgency || 'routine').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Method</label>
                    <p className="text-lg text-gray-900 dark:text-white capitalize">
                      {request.preferences?.deliveryMethod || 'pickup'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Submitted</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimeAgo(request.createdAt)} • {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prescriber Information */}
              {request.prescriber && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Prescriber Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doctor Name</label>
                      <p className="text-gray-900 dark:text-white">{request.prescriber.name}</p>
                    </div>
                    {request.prescriber.npiNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">NPI Number</label>
                        <p className="text-gray-900 dark:text-white">{request.prescriber.npiNumber}</p>
                      </div>
                    )}
                    {request.prescriber.contactInfo?.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact</label>
                        <p className="text-gray-900 dark:text-white">{request.prescriber.contactInfo.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medications */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Medications ({request.medications?.length || 0})</h3>
                <div className="space-y-3">
                  {request.medications?.map((medication, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {medication?.name || medication?.brandName || 'Unknown medication'}
                          </h4>
                          {medication?.genericName && medication?.genericName !== medication?.name && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Generic: {medication.genericName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Qty: {medication?.quantity?.prescribed || 'N/A'}
                          </p>
                          {medication?.quantity?.unit && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {medication.quantity.unit}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {medication?.dosage && (
                          <div>
                            <label className="font-medium text-gray-700 dark:text-gray-300">Dosage:</label>
                            <p className="text-gray-600 dark:text-gray-400">
                              {safeRender(typeof medication.dosage === 'string' ? medication.dosage : medication.dosage?.instructions)}
                            </p>
                          </div>
                        )}

                        {medication?.frequency && (
                          <div>
                            <label className="font-medium text-gray-700 dark:text-gray-300">Frequency:</label>
                            <p className="text-gray-600 dark:text-gray-400">{safeRender(medication.frequency)}</p>
                          </div>
                        )}

                        {medication?.refills && (
                          <div>
                            <label className="font-medium text-gray-700 dark:text-gray-300">Refills:</label>
                            <p className="text-gray-600 dark:text-gray-400">
                              {medication.refills.remaining || 0} of {medication.refills.authorized || 0} remaining
                            </p>
                          </div>
                        )}

                        {medication?.isGenericAcceptable !== undefined && (
                          <div>
                            <label className="font-medium text-gray-700 dark:text-gray-300">Generic Acceptable:</label>
                            <p className="text-gray-600 dark:text-gray-400">
                              {medication.isGenericAcceptable ? 'Yes' : 'No'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Preferences */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patient Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Price</label>
                    <p className="text-gray-900 dark:text-white">
                      {request.preferences?.maxPrice ? `$${request.preferences.maxPrice}` : 'No limit specified'}
                    </p>
                  </div>
                  {request.preferences?.additionalRequirements && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Requirements</label>
                      <p className="text-gray-900 dark:text-white">
                        {safeRender(request.preferences.additionalRequirements)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Form */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Response</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowDetailedBilling(!showDetailedBilling)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${showDetailedBilling
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      Detailed Billing
                    </button>
                    <button
                      onClick={() => setShowPharmacyMessage(!showPharmacyMessage)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${showPharmacyMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      Add Message
                    </button>
                  </div>
                </div>

                {/* Basic Response Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estimated Fulfillment Time
                    </label>
                    <select
                      value={response.estimatedTime}
                      onChange={(e) => setResponse({ ...response, estimatedTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="30 minutes">30 minutes</option>
                      <option value="1 hour">1 hour</option>
                      <option value="2 hours">2 hours</option>
                      <option value="4 hours">4 hours</option>
                      <option value="Same day">Same day</option>
                      <option value="Next day">Next day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {showDetailedBilling ? 'Patient Owes ($)' : 'Quoted Price ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={response.quotedPrice}
                      onChange={(e) => setResponse({ ...response, quotedPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly={showDetailedBilling}
                    />
                  </div>
                </div>

                {/* Detailed Billing Section */}
                {showDetailedBilling && (
                  <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Detailed Bill Breakdown</h4>

                    {/* Medications Pricing */}
                    <div className="space-y-4 mb-4">
                      {response.detailedBill.medications.map((med, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{med.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Qty: {med.quantity?.prescribed} {med.quantity?.unit}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-400">Unit Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={med.pricing.unitPrice}
                                onChange={(e) => updateMedicationPricing(index, 'unitPrice', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-400">Total</label>
                              <input
                                type="number"
                                step="0.01"
                                value={med.pricing.totalPrice}
                                readOnly
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-400">Insurance</label>
                              <input
                                type="number"
                                step="0.01"
                                value={med.pricing.insuranceCoverage}
                                onChange={(e) => updateMedicationPricing(index, 'insuranceCoverage', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-400">Patient Pays</label>
                              <input
                                type="number"
                                step="0.01"
                                value={med.pricing.patientPay}
                                readOnly
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bill Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Discount Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={response.detailedBill.summary.discount.amount}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            detailedBill: {
                              ...prev.detailedBill,
                              summary: {
                                ...prev.detailedBill.summary,
                                discount: {
                                  ...prev.detailedBill.summary.discount,
                                  amount: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={response.detailedBill.summary.tax.rate}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            detailedBill: {
                              ...prev.detailedBill,
                              summary: {
                                ...prev.detailedBill.summary,
                                tax: {
                                  ...prev.detailedBill.summary.tax,
                                  rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Insurance Coverage</label>
                        <input
                          type="number"
                          step="0.01"
                          value={response.detailedBill.summary.insurance.totalCoverage}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            detailedBill: {
                              ...prev.detailedBill,
                              summary: {
                                ...prev.detailedBill.summary,
                                insurance: {
                                  ...prev.detailedBill.summary.insurance,
                                  totalCoverage: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <button
                          onClick={calculateBillTotals}
                          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Calculate Total
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pharmacy Message Section */}
                {showPharmacyMessage && (
                  <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Message to Patient</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Message Title</label>
                        <input
                          type="text"
                          value={response.pharmacyMessage.title}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            pharmacyMessage: { ...prev.pharmacyMessage, title: e.target.value }
                          }))}
                          placeholder="e.g., Important Information About Your Prescription"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Priority</label>
                        <select
                          value={response.pharmacyMessage.priority}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            pharmacyMessage: { ...prev.pharmacyMessage, priority: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Message Content</label>
                      <textarea
                        value={response.pharmacyMessage.content}
                        onChange={(e) => setResponse(prev => ({
                          ...prev,
                          pharmacyMessage: { ...prev.pharmacyMessage, content: e.target.value }
                        }))}
                        rows={4}
                        placeholder="Your message to the patient about their prescription, special instructions, or important information..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={response.pharmacyMessage.requiresAcknowledgment}
                          onChange={(e) => setResponse(prev => ({
                            ...prev,
                            pharmacyMessage: { ...prev.pharmacyMessage, requiresAcknowledgment: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Requires patient acknowledgment</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Basic Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    General Notes to Patient
                  </label>
                  <textarea
                    value={response.notes}
                    onChange={(e) => setResponse({ ...response, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional information or instructions for the patient..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeclineRequest(request._id, response.notes)}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Decline Request
                </button>
                <button
                  onClick={() => {
                    // Use enhanced response data for acceptance
                    const customResponse = {
                      action: 'accept',
                      estimatedFulfillmentTime: parseInt(response.estimatedTime.split(' ')[0]) * (response.estimatedTime.includes('hour') ? 60 : 1),
                      quotedPrice: {
                        total: response.quotedPrice
                      },
                      notes: response.notes,
                      // Enhanced data
                      detailedBill: showDetailedBilling ? response.detailedBill : null,
                      pharmacyMessage: showPharmacyMessage && response.pharmacyMessage.content ? response.pharmacyMessage : null,
                      pharmacyInfo: {
                        specialInstructions: response.pharmacyInfo.specialInstructions,
                        pickupInstructions: response.pharmacyInfo.pickupInstructions,
                        deliveryInstructions: response.pharmacyInfo.deliveryInstructions,
                        consultationAvailable: response.pharmacyInfo.consultationAvailable,
                        consultationFee: response.pharmacyInfo.consultationFee,
                        pharmacistName: response.pharmacyInfo.pharmacistName,
                        contactNumber: response.pharmacyInfo.contactNumber
                      }
                    };
                    handleAcceptRequest(request._id, customResponse);
                  }}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                >
                  Accept Request
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering RequestDetailModal:', error);
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error Loading Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                There was an error loading the prescription details. Please try again.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  // Mini Map Preview Component
  const MiniMapPreview = ({ location, className = "" }) => {
    if (!location || location.length !== 2) return null;

    try {
      const [lat, lng] = [location[1], location[0]]; // Convert to lat, lng

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates');
      }

      return (
        <div className={`relative overflow-hidden ${className}`}>
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
          >
            <TileLayer
              attribution=""
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]} icon={patientIcon} />
          </MapContainer>

          {/* Overlay to prevent interaction */}
          <div className="absolute inset-0 bg-transparent cursor-pointer" />
        </div>
      );
    } catch (error) {
      console.error('Error rendering MiniMapPreview:', error);
      return (
        <div className={`relative overflow-hidden ${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
          <div className="text-center">
            <MapIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Map unavailable</p>
          </div>
        </div>
      );
    }
  };

  const PrescriptionCard = ({ request }) => {
    const isSelected = selectedRequests.has(request._id);
    const hasLocation = request.metadata?.geoLocation && request.metadata.geoLocation.length === 2;
    const [showMiniMap, setShowMiniMap] = useState(false);

    // Calculate distance if location is available
    const calculateDistance = useCallback(() => {
      if (!hasLocation) return null;

      const [longitude, latitude] = request.metadata.geoLocation;
      const pharmacyLat = 22.5726; // Default pharmacy location
      const pharmacyLng = 88.3639;

      const R = 6371; // Earth's radius in km
      const dLat = (latitude - pharmacyLat) * Math.PI / 180;
      const dLon = (longitude - pharmacyLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(pharmacyLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance.toFixed(1);
    }, [hasLocation, request.metadata?.geoLocation]);

    const estimatedDistance = calculateDistance();

    // Error boundary for the card
    if (!request) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-6">
          <p className="text-red-600 dark:text-red-400">Error: Invalid prescription request data</p>
        </div>
      );
    }

    const toggleSelection = () => {
      const newSelected = new Set(selectedRequests);
      if (isSelected) {
        newSelected.delete(request._id);
      } else {
        newSelected.add(request._id);
      }
      setSelectedRequests(newSelected);
    };

    try {
      return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-lg ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={toggleSelection}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.requestNumber}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Submitted {formatTimeAgo(request.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.preferences?.urgency || 'routine')}`}>
                {(request.preferences?.urgency || 'routine').toUpperCase()}
              </span>
              {hasLocation && (
                <button
                  onClick={() => { setMapRequest(request); setShowMapModal(true); }}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                  title="View interactive map with route planning"
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              )}

              {/* Distance indicator */}
              {hasLocation && estimatedDistance && (
                <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  <TruckIcon className="h-3 w-3" />
                  <span>{estimatedDistance}km</span>
                </div>
              )}


            </div>
          </div>
          {/* Patient Info with Mini Map */}
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {request.patient?.profile?.firstName || 'Unknown'} {request.patient?.profile?.lastName || 'Patient'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {request.patient?.contact?.phone || 'No phone'}
                  </span>
                  <span className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {request.preferences?.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}
                  </span>
                </div>
              </div>

              {/* Mini Map Toggle */}
              {hasLocation && (
                <button
                  onClick={() => setShowMiniMap(!showMiniMap)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Toggle mini map preview"
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mini Map Preview */}
            {hasLocation && showMiniMap && (
              <div className="mt-3 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 cursor-pointer"
                onClick={() => { setMapRequest(request); setShowMapModal(true); }}>
                <MiniMapPreview location={request.metadata.geoLocation} className="h-full w-full" />
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Medications ({request.medications?.length || 0})
            </h4>
            {request.medications?.slice(0, 2).map((medication, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {medication?.name || medication?.brandName || 'Unknown medication'}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-900 dark:text-white">
                    Qty: {medication?.quantity?.prescribed || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
            {(request.medications?.length || 0) > 2 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                +{request.medications.length - 2} more medications
              </p>
            )}
          </div>        {/* Location Summary */}
          {hasLocation && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                    <MapPinIcon className="h-4 w-4" />
                    <span>~{((Math.random() * 10) + 2).toFixed(1)}km</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <ClockIcon className="h-4 w-4" />
                    <span>~{Math.ceil((Math.random() * 20) + 10)}min</span>
                  </div>
                </div>
                <button
                  onClick={() => { setMapRequest(request); setShowMapModal(true); }}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full font-medium transition-colors flex items-center space-x-1"
                >
                  <MapIcon className="h-3 w-3" />
                  <span>View Route</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Est. Value: <span className="font-medium text-gray-900 dark:text-white">${request.estimatedValue || '0.00'}</span>
              </span>
              {request.expiresAt && (
                <span className="text-orange-600 dark:text-orange-400 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {formatExpiryTime(request.expiresAt)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/pharmacy/prescription/${request._id}`)}
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                title="View detailed prescription analysis"
              >
                <DocumentTextIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedRequest(request)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="View request details"
              >
                <EyeIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleAcceptRequest(request._id)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => handleDeclineRequest(request._id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering PrescriptionCard:', error);
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-6">
          <div className="text-center">
            <XCircleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">
              Error Loading Prescription
            </h3>
            <p className="text-xs text-red-600 dark:text-red-500">
              Request ID: {request?._id || 'Unknown'}
            </p>
          </div>
        </div>
      );
    }
  };

  return (

    <div className="space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-40 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm transform transition-all duration-300 ${notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : ''
                } ${notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : ''
                } ${notification.type === 'warning' ? 'bg-orange-50 border-orange-500 text-orange-800' : ''
                } ${notification.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-800' : ''
                }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            📋 Prescription Queue
            {queueStats.emergencyCount > 0 && (
              <span className="ml-3 px-2 py-1 bg-red-500 text-white text-sm rounded-full animate-pulse">
                {queueStats.emergencyCount} Emergency
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage incoming prescription requests • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
          >
            {autoRefresh ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            ) : (
              <ClockIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => { fetchPrescriptionQueue(); setLastRefresh(new Date()); }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowsUpDownIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Requests</p>
              <p className="text-2xl font-bold">{prescriptionRequests.length}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Emergency</p>
              <p className="text-2xl font-bold">{queueStats.emergencyCount}</p>
            </div>
            <BellIcon className="h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Urgent</p>
              <p className="text-2xl font-bold">
                {prescriptionRequests.filter(r => r.preferences?.urgency === 'urgent').length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Delivery</p>
              <p className="text-2xl font-bold">
                {prescriptionRequests.filter(r => r.preferences?.deliveryMethod === 'delivery').length}
              </p>
            </div>
            <TruckIcon className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Avg Response</p>
              <p className="text-2xl font-bold">15min</p>
            </div>
            <ClockIcon className="h-8 w-8 text-green-200" />
          </div>
        </div>
      </div>
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, request number, or medication..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {selectedRequests.size > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {selectedRequests.size} selected
              </span>
              <button
                onClick={() => {
                  Array.from(selectedRequests).forEach(id => handleAcceptRequest(id));
                  setSelectedRequests(new Set());
                }}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={() => setSelectedRequests(new Set())}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Prescription Requests */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading prescription requests...</p>
          </div>
        ) : prescriptionRequests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Prescription Requests</h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no prescription requests in your queue at the moment.
            </p>
          </div>
        ) : (
          prescriptionRequests.map((request) => (
            <PrescriptionCard key={request._id} request={request} />
          ))
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {/* Map Modal */}
      {showMapModal && mapRequest && (
        <MapModal
          request={mapRequest}
          onClose={() => {
            setShowMapModal(false);
            setMapRequest(null);
          }}
        />
      )}
    </div>
  );
}

export default PrescriptionQueue;