import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, MapPin, Clock, Truck, Package, CreditCard, Upload,
  FileText, CheckCircle, AlertCircle, Loader, Plus, Minus, X, Star
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import apiClient from '../api/apiClient';

// Temporarily disable Stripe for testing - create empty promise
const stripePromise = Promise.resolve(null);

const MedicinePurchase = ({ medicines, userLocation, user, onOrderComplete, onBack }) => {
  const [cart, setCart] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [availablePharmacies, setAvailablePharmacies] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '', city: '', state: '', zipCode: '', country: 'India'
  });
  const [paymentMethod, setPaymentMethod] = useState('cod'); // Default to COD for testing
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);

  // Debug user authentication on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let parsedStoredUser = null;
    try {
      parsedStoredUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse stored user');
    }

    console.log('🔐 MedicinePurchase Authentication Debug:', {
      userProp: !!user,
      userName: user?.name || 'No name',
      userId: user?._id || 'No ID',
      userRole: user?.role || 'No role',
      hasToken: !!localStorage.getItem('token'),
      tokenLength: localStorage.getItem('token')?.length || 0,
      hasStoredUser: !!storedUser,
      storedUserName: parsedStoredUser?.name || 'No stored name',
      storedUserId: parsedStoredUser?._id || 'No stored ID',
      storedUserRole: parsedStoredUser?.role || 'No stored role'
    });
  }, [user]);

  // Initialize cart with auto-selected pharmacy information
  useEffect(() => {
    if (medicines?.length > 0) {
      const initialCart = medicines.map(medicine => ({
        medicine,
        quantity: 1,
        unitPrice: medicine.currentPrice || medicine.pricing?.sellingPrice || 0,
        requiresPrescription: medicine.regulatory?.scheduleClass !== 'OTC',
        autoSelectedPharmacy: medicine.autoSelectedPharmacy // Include pharmacy info
      }));
      setCart(initialCart);
    }
  }, [medicines]);

  // Group cart items by pharmacy
  const pharmacyGroups = React.useMemo(() => {
    const groups = new Map();
    
    cart.forEach((item, index) => {
      const pharmacyId = item.autoSelectedPharmacy?._id || 'unknown';
      const pharmacyName = item.autoSelectedPharmacy?.name || 'Unknown Pharmacy';
      
      if (!groups.has(pharmacyId)) {
        groups.set(pharmacyId, {
          pharmacy: item.autoSelectedPharmacy,
          items: [],
          subtotal: 0
        });
      }
      
      const group = groups.get(pharmacyId);
      group.items.push({ ...item, cartIndex: index });
      group.subtotal += item.unitPrice * item.quantity;
    });
    
    return Array.from(groups.values());
  }, [cart]);

  // Calculate totals for all pharmacy groups
  const calculations = React.useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const gst = Math.round(subtotal * 0.12);
    
    // Calculate delivery fee based on pharmacy groups
    let totalDeliveryFee = 0;
    if (deliveryMethod !== 'pickup') {
      pharmacyGroups.forEach(group => {
        const distance = group.pharmacy?.distance || 5;
        const groupDeliveryFee = deliveryMethod === 'express_delivery' ? 100 : 50;
        totalDeliveryFee += groupDeliveryFee;
      });
    }
    
    const platformFee = Math.round(subtotal * 0.025);
    const total = subtotal + gst + totalDeliveryFee + platformFee;
    
    return { 
      subtotal, 
      gst, 
      deliveryFee: totalDeliveryFee, 
      platformFee, 
      total,
      pharmacyCount: pharmacyGroups.length
    };
  }, [cart, deliveryMethod, pharmacyGroups]);

  const requiresPrescription = cart.some(item => item.requiresPrescription);

  // Cart operations
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Note: loadPharmacies function removed - automatic pharmacy selection is now used
  // Pharmacies are automatically selected based on which pharmacy owns each medicine

  // Handle prescription upload
  const handlePrescriptionUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      setPrescriptionFile(file);
    } else {
      setError('File size must be less than 10MB');
    }
  };

  // Create order with automatic pharmacy selection
  const createOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication first
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to place an order.');
      }

      // Get user information from prop or localStorage
      let currentUser = user;
      if (!currentUser) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            currentUser = JSON.parse(storedUser);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }

      if (!currentUser?._id) {
        throw new Error('User information not available. Please log in again.');
      }

      console.log('🔐 Using user for order:', {
        userId: currentUser._id,
        userName: currentUser.name,
        userType: currentUser.role
      });

      // Prepare medicines data for the new API
      const medicinesData = cart.map(item => ({
        medicineId: item.medicine._id,
        quantity: item.quantity
      }));

      // Get user location if available
      const patientLocation = userLocation ? {
        lat: userLocation.lat,
        lng: userLocation.lng
      } : null;

      const orderData = {
        medicines: medicinesData, // Using 'medicines' as expected by the new automatic pharmacy selection controller
        deliveryMethod,
        deliveryAddress: deliveryMethod !== 'pickup' ? deliveryAddress : null,
        paymentMethod,
        prescriptionFile: prescriptionFile ? await convertToBase64(prescriptionFile) : null,
        patientNotes: '',
        isUrgent: deliveryMethod === 'express_delivery',
        patientLocation
      };

      console.log('� Sending order data:', orderData);

      // Use apiClient instead of fetch for better error handling and auth
      const response = await apiClient.post('/medicines/purchase', orderData);

      console.log('📝 Order API Response:', {
        success: response.data.success,
        message: response.data.message
      });

      if (response.data.success) {
        setOrderSummary(response.data.data);
        setStep(5);
        
        // Show success message with auto-selected pharmacies
        const pharmacyInfo = response.data.data.autoSelectedPharmacies.map(p => 
          `${p.pharmacyName}${p.distance ? ` (${p.distance} km away)` : ''}`
        ).join(', ');
        
        if (onOrderComplete) {
          onOrderComplete(response.data.data);
        }
        
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Order failed');
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      setError(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  // Payment component
  const PaymentStep = () => {
    // For now, we'll only support COD since Stripe is disabled
    const stripe = null;
    const elements = null;

    const handlePayment = async () => {
      if (paymentMethod === 'cod') {
        await createOrder();
        return;
      }

      if (!stripe || !elements) return;

      try {
        const order = await createOrder();
        if (!order?.clientSecret) return;

        const { error, paymentIntent } = await stripe.confirmCardPayment(order.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: user?.name, email: user?.email }
          }
        });

        if (error) {
          setError(error.message);
        } else if (paymentIntent.status === 'succeeded') {
          const response = await fetch('/api/medicines/confirm-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              paymentId: order.paymentId,
              paymentIntentId: paymentIntent.id
            })
          });

          const data = await response.json();
          if (data.success) {
            setStep(5);
            onOrderComplete?.(data.data);
          }
        }
      } catch (error) {
        setError('Payment failed');
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Payment</h2>
        
        <div className="space-y-3">
          {/* Stripe payment temporarily disabled for testing */}
          {false && (
          <label className="flex items-center p-4 border rounded-lg cursor-pointer">
            <input
              type="radio"
              value="stripe"
              checked={paymentMethod === 'stripe'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <CreditCard className="w-5 h-5 mr-3" />
            <span>Credit/Debit Card</span>
          </label>
          )}
          
          <label className="flex items-center p-4 border rounded-lg cursor-pointer">
            <input
              type="radio"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <Package className="w-5 h-5 mr-3" />
            <span>Cash on Delivery</span>
          </label>
        </div>

        {paymentMethod === 'stripe' && (
          <div className="border rounded-lg p-4">
            <p className="text-gray-500 text-center py-4">
              Credit card payment temporarily disabled. Please use Cash on Delivery.
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{calculations.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (12%)</span>
              <span>₹{calculations.gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>₹{calculations.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>₹{calculations.platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>₹{calculations.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading || (!stripe && paymentMethod === 'stripe')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Pay ₹${calculations.total.toFixed(2)}`}
        </button>
      </div>
    );
  };

  // Render components based on step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Shopping Cart</h2>
            {cart.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg"></div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.medicine.brandName}</h3>
                  <p className="text-gray-600">{item.medicine.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(index, item.quantity - 1)}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3">{item.quantity}</span>
                  <button onClick={() => updateQuantity(index, item.quantity + 1)}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{(item.unitPrice * item.quantity).toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(index)}>
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Auto-Selected Pharmacies</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Pharmacies automatically selected based on medicine availability and proximity
                </span>
              </div>
              <p className="text-blue-700 text-sm">
                Your order will be split across multiple pharmacies if needed to ensure all medicines are available.
              </p>
            </div>
            
            {Object.entries(pharmacyGroups).map(([pharmacyId, group]) => (
              <div key={pharmacyId} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{group.pharmacy?.name || 'Unknown Pharmacy'}</h3>
                    {group.pharmacy?.address && (
                      <>
                        <p className="text-gray-600">
                          {group.pharmacy.address.street}, {group.pharmacy.address.city}
                        </p>
                        {group.pharmacy.address.area && (
                          <p className="text-sm text-gray-500">{group.pharmacy.address.area}</p>
                        )}
                      </>
                    )}
                    {group.pharmacy?.distance && (
                      <p className="text-sm text-blue-600 font-medium">
                        📍 {group.pharmacy.distance} away
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Auto-Selected
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Medicines from this pharmacy:</h4>
                  {group.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                      <div>
                        <span className="font-medium">{item.medicine.name}</span>
                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-medium">₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center font-semibold pt-2 border-t">
                    <span>Subtotal ({group.items.length} items):</span>
                    <span>₹{group.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total for all pharmacies:</span>
                <span>₹{calculations.total.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Includes medicines from {Object.keys(pharmacyGroups).length} pharmacy(ies)
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Delivery Options</h2>
            <div className="space-y-3">
              {['pickup', 'delivery', 'express_delivery'].map((method) => (
                <label key={method} className="flex items-center p-4 border rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    value={method}
                    checked={deliveryMethod === method}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{method.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">
                      {method === 'pickup' ? 'Free - 30 mins' : 
                       method === 'delivery' ? '₹50 - 2-4 hours' : '₹100 - 1-2 hours'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {deliveryMethod !== 'pickup' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                    className="p-3 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="p-3 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="p-3 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={deliveryAddress.zipCode}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="p-3 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {requiresPrescription && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Upload Prescription *</h3>
                {!prescriptionFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p>Click to upload prescription</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 flex justify-between items-center">
                    <span>{prescriptionFile.name}</span>
                    <button onClick={() => setPrescriptionFile(null)}>
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePrescriptionUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        );

      case 4:
        return <PaymentStep />;

      case 5:
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600">Your order has been confirmed and will be processed shortly.</p>
            {orderSummary && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  {orderSummary.orders && orderSummary.orders.length > 0 ? (
                    // Multiple orders created (one per pharmacy)
                    orderSummary.orders.map((order, index) => (
                      <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                        <p className="font-semibold">Order #{order.orderId}</p>
                        <p className="text-sm text-gray-600">
                          Pharmacy: {order.pharmacyName}
                          {order.distance && (
                            <span className="text-blue-600"> ({order.distance} km away)</span>
                          )}
                        </p>
                        <p className="text-sm">Amount: ₹{order.totalAmount}</p>
                        <p className="text-xs text-gray-500">
                          {order.items?.length || 0} item(s)
                        </p>
                      </div>
                    ))
                  ) : (
                    // Single order or legacy format
                    <>
                      <p className="font-semibold">Order ID: {orderSummary.orderId}</p>
                      <p>Total: ₹{orderSummary.amount || orderSummary.totalAmount}</p>
                      {orderSummary.autoSelectedPharmacies && orderSummary.autoSelectedPharmacies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Auto-selected Pharmacies:</p>
                          {orderSummary.autoSelectedPharmacies.map((pharmacy, index) => (
                            <p key={index} className="text-sm text-gray-600">
                              • {pharmacy.pharmacyName}
                              {pharmacy.distance && (
                                <span className="text-blue-600"> ({pharmacy.distance} km away)</span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Pharmacies automatically selected based on medicine availability and proximity
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step indicator */}
      <div className="flex justify-center mb-8">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= stepNumber ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 5 && <div className="w-8 h-0.5 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      {step < 5 && (
        <div className="flex justify-between mt-8">
          <button
            onClick={step === 1 ? onBack : () => setStep(step - 1)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {step === 1 ? 'Back to Search' : 'Previous'}
          </button>
          
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 3 && deliveryMethod !== 'pickup' && !deliveryAddress.street) ||
                (step === 3 && requiresPrescription && !prescriptionFile)
              }
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicinePurchase;