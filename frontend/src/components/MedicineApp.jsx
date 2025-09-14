import React, { useState, useEffect } from 'react';
import { Pill, ShoppingBag, Clock, User, MapPin } from 'lucide-react';
import MedicineSearch from './MedicineSearch.jsx';
import MedicinePurchase from './MedicinePurchase.jsx';
import MedicineOrderTracking from './MedicineOrderTracking.jsx';
import apiClient from '../api/apiClient';

const MedicineApp = ({ user }) => {
  const [currentView, setCurrentView] = useState('search'); // 'search', 'purchase', 'tracking', 'orders'
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  // Pharmacy context state
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [availablePharmacies, setAvailablePharmacies] = useState([]);
  const [pharmacyContext, setPharmacyContext] = useState({
    selectedPharmacyId: null,
    filterByPharmacy: false,
    nearbyPharmacies: []
  });

  // Load nearby pharmacies when location is available - DISABLED for automatic pharmacy selection
  useEffect(() => {
    // Automatic pharmacy selection is now used - no need to load nearby pharmacies manually
    console.log('User location available, but using automatic pharmacy selection');
  }, [userLocation]);

  // Note: Pharmacy discovery is now handled automatically during order creation
  // based on which pharmacy uploaded each medicine. No need for manual nearby pharmacy loading.
  const loadNearbyPharmacies = async () => {
    // This function is deprecated - automatic pharmacy selection is now used
    console.log('Automatic pharmacy selection is now active - no manual pharmacy loading needed');
  };

  const handlePharmacySelect = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setPharmacyContext(prev => ({
      ...prev,
      selectedPharmacyId: pharmacy?._id,
      filterByPharmacy: !!pharmacy
    }));
  };

  // Get user location on component mount
  useEffect(() => {
    getUserLocation();
    if (user) {
      loadRecentOrders();
    }
  }, [user]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            coordinates: [position.coords.longitude, position.coords.latitude],
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn('Failed to get location:', error);
          // Use default location or ask user to input manually
          setUserLocation({
            coordinates: [77.2090, 28.6139], // Default to Delhi
            accuracy: null
          });
        }
      );
    }
  };

  const loadRecentOrders = async () => {
    try {
      const response = await apiClient.get('/medicines/orders/my?limit=5');
      
      if (response.data.success) {
        setRecentOrders(response.data.data.orders);
      }
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  };

  const handleMedicineSelect = async (medicine) => {
    try {
      // Automatically get pharmacy details for the selected medicine
      if (medicine._id && userLocation) {
        const params = new URLSearchParams({
          userLatitude: userLocation.coordinates[1],
          userLongitude: userLocation.coordinates[0]
        });
        
        const response = await apiClient.get(`/inventory/medicine/${medicine._id}/pharmacy?${params}`);
        
        if (response.data.success) {
          if (response.data.success && response.data.data.pharmacy) {
            const pharmacyWithDistance = response.data.data.pharmacy;
            
            // Automatically select the pharmacy for this medicine
            setSelectedPharmacy(pharmacyWithDistance);
            setPharmacyContext(prev => ({
              ...prev,
              selectedPharmacyId: pharmacyWithDistance._id,
              filterByPharmacy: true
            }));
            
            // Add distance info to the medicine
            const medicineWithPharmacy = {
              ...medicine,
              selectedPharmacy: pharmacyWithDistance,
              distance: pharmacyWithDistance.distance
            };
            
            setSelectedMedicines([medicineWithPharmacy]);
          } else {
            // Fallback if pharmacy info not available
            setSelectedMedicines([medicine]);
          }
        } else {
          console.warn('Failed to fetch pharmacy details for medicine');
          setSelectedMedicines([medicine]);
        }
      } else {
        // Fallback if no medicine ID or location
        setSelectedMedicines([medicine]);
      }
    } catch (error) {
      console.error('Error fetching pharmacy for medicine:', error);
      setSelectedMedicines([medicine]);
    }
    
    setCurrentView('purchase');
  };

  const handleAddToCart = (medicine) => {
    setSelectedMedicines(prev => {
      const existing = prev.find(m => m._id === medicine._id);
      if (existing) {
        return prev.map(m => 
          m._id === medicine._id 
            ? { ...m, quantity: (m.quantity || 1) + 1 }
            : m
        );
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const handleOrderComplete = (orderData) => {
    console.log('🎯 Order completion data:', orderData);
    
    // Extract the first order ID from the orders array
    const firstOrder = orderData.orders?.[0]?.order;
    const orderId = firstOrder?._id || firstOrder?.orderNumber;
    
    console.log('📋 Setting order ID for tracking:', orderId);
    
    if (orderId) {
      setCurrentOrderId(orderId);
      setCurrentView('tracking');
    } else {
      console.error('❌ No order ID found in response:', orderData);
      // Fallback to orders view
      setCurrentView('orders');
    }
    
    setSelectedMedicines([]);
    loadRecentOrders(); // Refresh recent orders
  };

  const handleViewOrder = (orderId) => {
    setCurrentOrderId(orderId);
    setCurrentView('tracking');
  };

  const renderNavigation = () => (
    <div className="bg-white shadow-sm border-b mb-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Pill className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">MediSearch AI</h1>
            </div>
            
            <nav className="flex gap-6">
              <button
                onClick={() => setCurrentView('search')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'search' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Pill className="w-4 h-4" />
                Search
              </button>
              
              {selectedMedicines.length > 0 && (
                <button
                  onClick={() => setCurrentView('purchase')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'purchase' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Cart ({selectedMedicines.length})
                </button>
              )}
              
              <button
                onClick={() => setCurrentView('orders')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'orders' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                My Orders
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Pharmacy Selection */}
            {availablePharmacies.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Pharmacy:</label>
                <select
                  value={selectedPharmacy?._id || ''}
                  onChange={(e) => {
                    const pharmacy = availablePharmacies.find(p => p._id === e.target.value);
                    handlePharmacySelect(pharmacy);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Pharmacies</option>
                  {availablePharmacies.map((pharmacy) => (
                    <option key={pharmacy._id} value={pharmacy._id}>
                      {pharmacy.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {userLocation && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                Location detected
              </div>
            )}
            
            {user && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrdersList = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
      
      {recentOrders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600 mb-6">Start by searching for medicines</p>
          <button
            onClick={() => setCurrentView('search')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Search Medicines
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div 
              key={order._id} 
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewOrder(order._id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()} • {order.medicineOrderDetails?.items?.length || 0} items
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ₹{order.amount?.toFixed(2)}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {order.medicineOrderDetails?.deliveryMethod === 'pickup' ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      Pickup from {order.pharmacy?.name}
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Delivery • {order.medicineOrderDetails?.estimatedDeliveryTime}
                    </>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewOrder(order._id);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Track Order →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'search':
        return (
          <MedicineSearch
            onMedicineSelect={handleMedicineSelect}
            onAddToCart={handleAddToCart}
            userLocation={userLocation}
            selectedMedicines={selectedMedicines}
            pharmacyContext={pharmacyContext}
            selectedPharmacy={selectedPharmacy}
            autoSelectPharmacy={true}
          />
        );
      
      case 'purchase':
        return (
          <MedicinePurchase
            medicines={selectedMedicines}
            userLocation={userLocation}
            user={user}
            onOrderComplete={handleOrderComplete}
            onBack={() => setCurrentView('search')}
          />
        );
      
      case 'tracking':
        return (
          <MedicineOrderTracking
            orderId={currentOrderId}
            onBack={() => setCurrentView('orders')}
          />
        );
      
      case 'orders':
        return renderOrdersList();
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      {renderCurrentView()}
    </div>
  );
};

export default MedicineApp;