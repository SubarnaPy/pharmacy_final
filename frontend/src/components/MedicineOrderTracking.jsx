import React, { useState, useEffect } from 'react';
import {
  Package, Truck, Clock, CheckCircle, MapPin, Phone,
  RefreshCw, AlertCircle, FileText, User
} from 'lucide-react';
import apiClient from '../api/apiClient';

const MedicineOrderTracking = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
      const interval = setInterval(loadOrderDetails, 30000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const response = await apiClient.get(`/medicines/orders/${orderId}`);
      
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'pending': { color: 'yellow', text: 'Order Placed', icon: Clock },
      'processing': { color: 'blue', text: 'Processing', icon: Package },
      'prepared': { color: 'purple', text: 'Ready', icon: CheckCircle },
      'out_for_delivery': { color: 'orange', text: 'Out for Delivery', icon: Truck },
      'delivered': { color: 'green', text: 'Delivered', icon: CheckCircle },
      'completed': { color: 'green', text: 'Completed', icon: CheckCircle }
    };
    return configs[status] || { color: 'gray', text: status, icon: Package };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-medium">Loading order details...</h3>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Order</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button onClick={loadOrderDetails} className="bg-red-600 text-white px-4 py-2 rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const isDelivery = order.medicineOrderDetails?.deliveryMethod === 'delivery';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button onClick={onBack} className="text-blue-600 mb-4">← Back to Orders</button>
        <h1 className="text-3xl font-bold">Order #{order._id.slice(-8).toUpperCase()}</h1>
        <p className="text-gray-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-${statusConfig.color}-100 flex items-center justify-center`}>
              <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{statusConfig.text}</h2>
              <p className="text-gray-600">
                {order.medicineOrderDetails?.estimatedDeliveryTime}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(order.amount)}</p>
            <p className="text-sm text-gray-600">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between relative">
          {['placed', 'processing', 'prepared', isDelivery ? 'delivered' : 'picked_up'].map((step, index) => {
            const isCompleted = ['pending', 'processing', 'prepared', 'delivered', 'picked_up', 'completed'].indexOf(order.status) >= index;
            return (
              <div key={step} className="flex flex-col items-center relative">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-200 border-gray-300'
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                </div>
                <p className="text-xs mt-2 text-center max-w-20">
                  {step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ')}
                </p>
                {index < 3 && (
                  <div className={`absolute top-4 left-8 w-full h-0.5 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} style={{ width: 'calc(100% - 2rem)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pharmacy Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Pharmacy Details
          </h3>
          
          {order.pharmacy ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{order.pharmacy.name}</p>
                <p className="text-sm text-gray-600">
                  {order.pharmacy.address?.street}<br/>
                  {order.pharmacy.address?.city}, {order.pharmacy.address?.state}
                  {order.pharmacy.address?.zipCode && ` - ${order.pharmacy.address.zipCode}`}
                </p>
                {order.pharmacy.address?.area && (
                  <p className="text-xs text-gray-500">{order.pharmacy.address.area}</p>
                )}
              </div>
              
              {order.pharmacy.contact && (
                <div className="space-y-2">
                  {order.pharmacy.contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a 
                        href={`tel:${order.pharmacy.contact.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {order.pharmacy.contact.phone}
                      </a>
                    </div>
                  )}
                  
                  {order.pharmacy.contact.email && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <a 
                        href={`mailto:${order.pharmacy.contact.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {order.pharmacy.contact.email}
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {order.pharmacy.operatingHours && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-1">Operating Hours</p>
                  <p className="text-xs text-gray-600">
                    {order.pharmacy.operatingHours.open} - {order.pharmacy.operatingHours.close}
                  </p>
                </div>
              )}
              
              {order.pharmacy.rating && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${
                          i < Math.floor(order.pharmacy.rating.averageRating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300'
                        }`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">
                      {order.pharmacy.rating.averageRating.toFixed(1)} 
                      ({order.pharmacy.rating.totalReviews} reviews)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Pharmacy information not available</p>
            </div>
          )}
        </div>
        {/* Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.medicineOrderDetails?.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium">{item.medicine?.brandName || 'Medicine'}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(order.breakdown?.medicineTotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>{formatCurrency(order.breakdown?.deliveryFee || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST</span>
              <span>{formatCurrency(order.breakdown?.gst || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery/Pickup Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isDelivery ? 'Delivery Information' : 'Pickup Information'}
          </h3>
          
          {isDelivery ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium">Delivery Address</p>
                  <p className="text-sm text-gray-600">
                    {order.medicineOrderDetails?.deliveryAddress?.street}<br/>
                    {order.medicineOrderDetails?.deliveryAddress?.city}, {order.medicineOrderDetails?.deliveryAddress?.state} {order.medicineOrderDetails?.deliveryAddress?.zipCode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Delivery Method: {order.medicineOrderDetails?.deliveryMethod?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {order.medicineOrderDetails?.estimatedDeliveryTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    Estimated: {order.medicineOrderDetails.estimatedDeliveryTime}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Pickup from Pharmacy</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Please visit the pharmacy during operating hours to collect your order.
                    </p>
                  </div>
                </div>
              </div>
              
              {order.medicineOrderDetails?.pickupCode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Pickup Code</p>
                  <p className="font-mono text-lg font-bold text-gray-900">
                    {order.medicineOrderDetails.pickupCode}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Show this code at the pharmacy to collect your order
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Prescription Info */}
          {order.requiresPrescription && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Prescription: {order.medicineOrderDetails?.prescriptionUpload?.verified ? 
                    <span className="text-green-600 font-medium">Verified ✓</span> : 
                    <span className="text-yellow-600 font-medium">Under Review</span>
                  }
                </span>
              </div>
              
              {order.medicineOrderDetails?.prescriptionUpload?.notes && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  <strong>Pharmacist Note:</strong> {order.medicineOrderDetails.prescriptionUpload.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <button 
          onClick={loadOrderDetails}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Status'}
        </button>
        
        {order.pharmacy?.contact?.phone && (
          <a
            href={`tel:${order.pharmacy.contact.phone}`}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call Pharmacy
          </a>
        )}
        
        {order.status === 'prepared' && !isDelivery && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Your order is ready for pickup!
            </span>
          </div>
        )}
        
        {(order.status === 'delivered' || order.status === 'completed') && (
          <button className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Download Invoice
          </button>
        )}
      </div>
    </div>
  );
};

export default MedicineOrderTracking;