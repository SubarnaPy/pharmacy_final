import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationMarker({ position, setPosition, onLocationSelect }) {
  const map = useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      onLocationSelect({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    },
  });

  useEffect(() => {
    map.locate();
  }, [map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

const AddressMapSelector = ({
  onLocationSelect,
  initialPosition = null,
  address = '',
  className = '',
  height = '400px'
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(address);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Default position (center of US)
  const defaultCenter = [39.8283, -98.5795];
  const mapCenter = position || defaultCenter;

  // Debounced search function
  const searchAddress = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Using Nominatim API (OpenStreetMap's geocoding service) - completely free
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us`
      );
      const data = await response.json();

      const results = data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: {
          street: item.display_name.split(',')[0]?.trim() || '',
          city: item.address?.city || item.address?.town || item.address?.village || '',
          state: item.address?.state || '',
          zipCode: item.address?.postcode || '',
          country: item.address?.country || 'United States'
        }
      }));

      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAddress(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAddress]);

  const handleSearchResultClick = (result) => {
    const newPosition = [result.lat, result.lon];
    setPosition(newPosition);
    setSearchQuery(result.display_name);
    setShowResults(false);

    onLocationSelect({
      latitude: result.lat,
      longitude: result.lon,
      address: result.address,
      fullAddress: result.display_name
    });
  };

  const handleLocationSelect = (coords) => {
    // Reverse geocoding to get address from coordinates
    reverseGeocode(coords.latitude, coords.longitude);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data) {
        const address = {
          street: data.display_name.split(',')[0]?.trim() || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          state: data.address?.state || '',
          zipCode: data.address?.postcode || '',
          country: data.address?.country || 'United States'
        };

        setSearchQuery(data.display_name);

        onLocationSelect({
          latitude: lat,
          longitude: lng,
          address: address,
          fullAddress: data.display_name
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for an address..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSearchResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={position ? 15 : 4}
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            onLocationSelect={handleLocationSelect}
          />
        </MapContainer>
      </div>

      {/* Selected Location Info */}
      {position && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Selected Location
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Latitude: {position[0].toFixed(6)}, Longitude: {position[1].toFixed(6)}
          </p>
          {searchQuery && (
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Address: {searchQuery}
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Click on the map to select a location or search for an address above.
      </div>
    </div>
  );
};

export default AddressMapSelector;
