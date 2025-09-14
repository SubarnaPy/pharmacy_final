import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Camera, 
  Search, 
  Upload, 
  MapPin, 
  Filter, 
  Star, 
  Clock, 
  ShoppingCart,
  Loader,
  X,
  ScanLine,
  Bot,
  Zap,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Eye,
  Heart
} from 'lucide-react';
import apiClient from '../api/apiClient';

const MedicineSearch = ({ onMedicineSelect, userLocation }) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('text');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [popularMedicines, setPopularMedicines] = useState([]);
  
  // Pharmacy selection state
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    therapeuticClass: '',
    dosageForm: '',
    manufacturer: '',
    priceRange: { min: '', max: '' },
    requiresPrescription: null,
    isPopular: false,
    minRating: 0
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // Sort options
  const [sortBy, setSortBy] = useState('relevance');
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  // Search configuration
  const searchTypes = [
    { value: 'text', label: 'Text Search', icon: Search },
    { value: 'image', label: 'Image Search', icon: Camera },
    { value: 'ingredient', label: 'By Ingredient', icon: Bot },
    { value: 'therapeutic', label: 'By Category', icon: Zap },
    { value: 'barcode', label: 'Barcode', icon: ScanLine }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest First' }
  ];

  // Note: Pharmacies are now automatically selected based on medicine ownership
  // No need to fetch all pharmacies for manual selection

  // Load popular medicines on component mount
  useEffect(() => {
    loadPopularMedicines();
  }, [selectedPharmacy]); // Reload when pharmacy changes

  // Auto-search on query change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && searchType === 'text') {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, filters, sortBy]);

  // Load popular medicines with pharmacy filter
  const loadPopularMedicines = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedPharmacy) {
        params.append('pharmacyId', selectedPharmacy);
      }
      
      const response = await apiClient.get(`/medicines/popular?limit=6&${params}`);
      
      if (response.data.success) {
        setPopularMedicines(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load popular medicines:', error);
    }
  };

  // Note: fetchPharmacyForMedicine function removed - pharmacy data now comes from search results

  // Enhanced medicine select handler with automatic pharmacy detection
  const handleMedicineClick = async (medicine) => {
    try {
      // Check if medicine already has pharmacy information from search results
      if (medicine.pharmacyId && typeof medicine.pharmacyId === 'object') {
        // Medicine already has populated pharmacy data
        let distance = null;
        if (userLocation && medicine.pharmacyId.address?.coordinates) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            medicine.pharmacyId.address.coordinates[1], // latitude
            medicine.pharmacyId.address.coordinates[0]  // longitude
          );
        }

        const enhancedMedicine = {
          ...medicine,
          autoSelectedPharmacy: {
            ...medicine.pharmacyId,
            distance: distance
          }
        };
        
        onMedicineSelect?.(enhancedMedicine);
      } else {
        // Fallback: use medicine data as-is (pharmacy will be auto-selected in backend)
        onMedicineSelect?.(medicine);
      }
    } catch (error) {
      console.error('Error in medicine selection:', error);
      onMedicineSelect?.(medicine);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  };

  // Main search function with pharmacy filter
  const handleSearch = async () => {
    if (!searchQuery.trim() && searchType !== 'image') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = {
        query: searchQuery,
        searchType,
        location: userLocation,
        filters: {
          ...filters,
          pharmacyId: selectedPharmacy // Add pharmacy filter
        },
        pagination,
        sortBy,
        includeAvailability: true,
        pharmacyPreferences: {
          preferredPaymentMethods: ['stripe', 'card', 'upi'],
          requireDelivery: false
        }
      };

      const response = await apiClient.post('/medicines/search', searchParams);

      if (response.data.success) {
        setSearchResults(response.data.data);
        setMedicines(response.data.data.results || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.total || 0
        }));
        
        if (response.data.data.imageAnalysis) {
          setAiAnalysis(response.data.data.imageAnalysis);
        }
      } else {
        setError(response.data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Camera functionality
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Convert to blob and send for analysis
    canvas.toBlob(async (blob) => {
      await analyzeImageBlob(blob);
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  // Image upload and analysis
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      analyzeImageBlob(file);
    }
  };

  const analyzeImageBlob = async (blob) => {
    setLoading(true);
    setError(null);
    setSearchType('image');

    try {
      const formData = new FormData();
      formData.append('image', blob);
      
      if (userLocation) {
        formData.append('location', JSON.stringify(userLocation));
      }
      
      formData.append('filters', JSON.stringify(filters));
      formData.append('pagination', JSON.stringify(pagination));
      formData.append('includeAvailability', 'true');

      const response = await apiClient.post('/medicines/search/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSearchResults(response.data.data);
        setMedicines(response.data.data.results || []);
        setAiAnalysis(response.data.data.imageAnalysis);
        
        if (response.data.data.imageAnalysis && response.data.data.imageAnalysis.medicineName) {
          setSearchQuery(response.data.data.imageAnalysis.medicineName);
        }
      } else {
        setError(response.data.message || 'Image analysis failed');
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter handlers
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      therapeuticClass: '',
      dosageForm: '',
      manufacturer: '',
      priceRange: { min: '', max: '' },
      requiresPrescription: null,
      isPopular: false,
      minRating: 0
    });
  };

  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      page: prev.page + 1
    }));
    handleSearch();
  };

  // Render AI Analysis Panel
  const renderAIAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">AI Analysis Results</h3>
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {Math.round((aiAnalysis.confidence?.overall || 0) * 100)}% Confidence
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Identified Medicine</p>
            <p className="font-medium text-gray-900">{aiAnalysis.medicineName || 'Unknown'}</p>
          </div>
          
          {aiAnalysis.composition && aiAnalysis.composition.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Ingredients</p>
              <p className="font-medium text-gray-900">
                {aiAnalysis.composition.map(comp => comp.activeIngredient).join(', ')}
              </p>
            </div>
          )}
          
          {aiAnalysis.visualFeatures && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Visual Features</p>
              <div className="flex gap-2 flex-wrap">
                {aiAnalysis.visualFeatures.color && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {aiAnalysis.visualFeatures.color}
                  </span>
                )}
                {aiAnalysis.visualFeatures.shape && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {aiAnalysis.visualFeatures.shape}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {aiAnalysis.databaseMatches && aiAnalysis.databaseMatches.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Database Matches</p>
              <p className="text-xs text-gray-700">
                Found {aiAnalysis.databaseMatches.length} similar medicine(s)
              </p>
            </div>
          )}
        </div>
        
        {aiAnalysis.safetyWarnings && aiAnalysis.safetyWarnings.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Safety Notes</span>
            </div>
            <ul className="text-xs text-yellow-700 space-y-1">
              {aiAnalysis.safetyWarnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render Medicine Card
  const renderMedicineCard = (medicine) => {
    const price = medicine.currentPrice || medicine.pricing?.sellingPrice || 0;
    const originalPrice = medicine.pricing?.mrp || price;
    const discount = medicine.pricing?.discountPercentage || 0;
    
    return (
      <div 
        key={medicine._id} 
        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        onClick={() => handleMedicineClick(medicine)}
      >
        <div className="flex gap-4">
          {/* Medicine Image */}
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {medicine.imageData?.primaryImage?.url ? (
              <img 
                src={medicine.imageData.primaryImage.url} 
                alt={medicine.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Camera className="w-8 h-8" />
              </div>
            )}
          </div>
          
          {/* Medicine Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 truncate">
                  {medicine.brandName}
                </h3>
                <p className="text-sm text-gray-600">{medicine.name}</p>
                {medicine.composition && medicine.composition.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {medicine.composition[0].activeIngredient} {medicine.composition[0].strength?.value}{medicine.composition[0].strength?.unit}
                  </p>
                )}
              </div>
              
              {medicine.isPopular && (
                <div className="flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </div>
              )}
            </div>
            
            {/* Price and Rating */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-green-600">₹{price.toFixed(2)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      ₹{originalPrice.toFixed(2)}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
              
              {medicine.analytics?.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">
                    {medicine.analytics.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Manufacturer and Availability */}
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{medicine.manufacturer?.name}</span>
              
              {medicine.availability && (
                <div className="flex items-center gap-1">
                  {medicine.availability.isAvailable ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-green-600">
                        Available at {medicine.availability.availableAt.length} pharmacy(s)
                      </span>
                    </>
                  ) : (
                    <span className="text-red-600">Out of stock</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Delivery Info and Pharmacy */}
            <div className="mt-2 space-y-1">
              {/* Auto-Selected Pharmacy Information */}
              {medicine.autoSelectedPharmacy && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-blue-600">
                    <MapPin className="w-3 h-3" />
                    <span>Available at {medicine.autoSelectedPharmacy.name}</span>
                  </div>
                  {medicine.autoSelectedPharmacy.distance && (
                    <span className="text-gray-500">
                      {medicine.autoSelectedPharmacy.distance} km away
                    </span>
                  )}
                </div>
              )}
              
              {/* Fallback Pharmacy Information */}
              {!medicine.autoSelectedPharmacy && medicine.pharmacyId && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <MapPin className="w-3 h-3" />
                  <span>
                    Available at {typeof medicine.pharmacyId === 'object' ? medicine.pharmacyId.name : 'Pharmacy'}
                  </span>
                </div>
              )}
              
              {/* Distance Information */}
              {medicine.distance && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {medicine.distance.distanceFormatted} away • Est. {medicine.distance.estimatedTime} min
                  </span>
                </div>
              )}
              
              {/* Delivery Info */}
              {medicine.estimatedDeliveryTime && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Clock className="w-3 h-3" />
                  Delivery in {medicine.estimatedDeliveryTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI-Powered Medicine Search
        </h1>
        <p className="text-gray-600">
          Search for medicines using text, camera, or upload an image for AI-powered identification
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Search Type Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {searchTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setSearchType(type.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  searchType === type.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Search Input and Actions */}
        <div className="flex gap-4 mb-4">
          {searchType !== 'image' ? (
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search medicines by ${searchType}...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Use Camera
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            {/* Pharmacy Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Pharmacy (Optional)
              </label>
              <select
                value={selectedPharmacy}
                onChange={(e) => setSelectedPharmacy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Pharmacies</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy._id} value={pharmacy._id}>
                    {pharmacy.name} - {pharmacy.address?.area || ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={filters.therapeuticClass}
                  onChange={(e) => updateFilter('therapeuticClass', e.target.value)}
                  placeholder="e.g., Antibiotic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form
                </label>
                <select
                  value={filters.dosageForm}
                  onChange={(e) => updateFilter('dosageForm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Forms</option>
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="cream">Cream</option>
                  <option value="drops">Drops</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range (₹)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.priceRange.min}
                    onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: e.target.value })}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    value={filters.priceRange.max}
                    onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: e.target.value })}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isPopular}
                    onChange={(e) => updateFilter('isPopular', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Popular only</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.requiresPrescription === false}
                    onChange={(e) => updateFilter('requiresPrescription', e.target.checked ? false : null)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">OTC medicines</span>
                </label>
              </div>
              
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Capture Medicine Image</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <button
              onClick={captureImage}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Capture & Analyze
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {renderAIAnalysis()}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {medicines.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Search Results ({pagination.total} found)
            </h2>
            
            {searchResults?.nearbyPharmacies && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {searchResults.nearbyPharmacies.length} nearby pharmacies
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {medicines.map(renderMedicineCard)}
          </div>
          
          {/* Load More */}
          {medicines.length < pagination.total && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      ) : !loading && searchQuery && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medicines found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters</p>
        </div>
      )}

      {/* Popular Medicines (shown when no search) */}
      {!searchQuery && !loading && popularMedicines.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Popular Medicines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularMedicines.map(renderMedicineCard)}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && medicines.length === 0 && (
        <div className="text-center py-12">
          <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchType === 'image' ? 'Analyzing image...' : 'Searching medicines...'}
          </h3>
          <p className="text-gray-600">
            {searchType === 'image' ? 'AI is identifying the medicine in your image' : 'Please wait while we find the best matches'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicineSearch;