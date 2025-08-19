import React, { useState, useEffect } from 'react';
import { orderAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaBox, FaMapMarkerAlt, FaClock, FaEye, FaPhone, FaDownload, FaStar } from 'react-icons/fa';

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingFilter, setTrackingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  const orderStatuses = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Order Date' },
    { value: 'status', label: 'Status' },
    { value: 'total', label: 'Total Amount' }
  ];

  useEffect(() => {
    fetchOrders();
  }, [trackingFilter, sortBy]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getOrders({
        status: trackingFilter === 'all' ? undefined : trackingFilter,
        sortBy: sortBy,
        sortOrder: 'desc'
      });
      
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getOrderDetails = async (orderId) => {
    try {
      const response = await orderAPI.getOrderDetails(orderId);
      if (response.data.success) {
        setSelectedOrder(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to fetch order details');
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const response = await orderAPI.downloadInvoice(orderId);
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready_for_pickup': return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusProgress = (status) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const formatOrderDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstimatedDelivery = (order) => {
    if (order.estimatedDeliveryDate) {
      return new Date(order.estimatedDeliveryDate).toLocaleDateString();
    }
    
    // Calculate estimated delivery based on order date and status
    const orderDate = new Date(order.createdAt);
    let estimatedDays = 3; // Default 3 days
    
    if (order.deliveryMethod === 'express') estimatedDays = 1;
    else if (order.deliveryMethod === 'standard') estimatedDays = 3;
    else if (order.deliveryMethod === 'pickup') return 'Ready for pickup';
    
    const estimated = new Date(orderDate);
    estimated.setDate(estimated.getDate() + estimatedDays);
    return estimated.toLocaleDateString();
  };

  const canTrackOrder = (order) => {
    return order.trackingNumber && ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status);
  };

  const trackOrder = (order) => {
    if (order.trackingUrl) {
      window.open(order.trackingUrl, '_blank');
    } else {
      toast.info('Tracking information will be available once the order is confirmed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Order Tracking</h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {orderStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <FaBox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No orders found.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Order #{order.orderNumber || order._id.slice(-8)}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaClock className="text-blue-500" />
                      <div>
                        <p className="text-sm">Ordered</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {formatOrderDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMapMarkerAlt className="text-red-500" />
                      <div>
                        <p className="text-sm">Delivery</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {getEstimatedDelivery(order)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <FaBox className="text-green-500" />
                      <div>
                        <p className="text-sm">Items</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {order.items?.length || 0} item(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <div>
                        <p className="text-sm">Total</p>
                        <p className="font-semibold text-gray-800">
                          ${order.total?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!['cancelled', 'delivered'].includes(order.status) && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Order Progress</span>
                        <span>{Math.round(getStatusProgress(order.status))}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${getStatusProgress(order.status)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Pharmacy Info */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Pharmacy:</span> {order.pharmacy?.name || 'N/A'}
                    </p>
                    {order.pharmacy?.phone && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Contact:</span> {order.pharmacy.phone}
                      </p>
                    )}
                  </div>

                  {/* Tracking Number */}
                  {order.trackingNumber && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Tracking Number:</span> {order.trackingNumber}
                      </p>
                    </div>
                  )}

                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            {item.medicationName} - {item.quantity} x ${item.price?.toFixed(2)}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-sm text-blue-600 cursor-pointer" onClick={() => getOrderDetails(order._id)}>
                            + {order.items.length - 2} more items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 lg:ml-6 mt-4 lg:mt-0">
                  {canTrackOrder(order) && (
                    <button
                      onClick={() => trackOrder(order)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                    >
                      <FaMapMarkerAlt />
                      Track Order
                    </button>
                  )}

                  {order.pharmacy?.phone && (
                    <a
                      href={`tel:${order.pharmacy.phone}`}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap text-center"
                    >
                      <FaPhone />
                      Call Pharmacy
                    </a>
                  )}

                  <button
                    onClick={() => getOrderDetails(order._id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <FaEye />
                    View Details
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      onClick={() => downloadInvoice(order._id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
                    >
                      <FaDownload />
                      Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  Order Details - #{selectedOrder.orderNumber || selectedOrder._id.slice(-8)}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Status */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium">{formatOrderDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Delivery Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Method:</span>
                        <span className="ml-2 font-medium">
                          {selectedOrder.deliveryMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Address:</span>
                        <p className="ml-2 font-medium">{selectedOrder.deliveryAddress}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Estimated Delivery:</span>
                        <span className="ml-2 font-medium">{getEstimatedDelivery(selectedOrder)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Pharmacy Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{selectedOrder.pharmacy?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Address:</span>
                        <p className="ml-2 font-medium">{selectedOrder.pharmacy?.address}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-medium">{selectedOrder.pharmacy?.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.medicationName}</p>
                          <p className="text-sm text-gray-600">{item.dosage}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      ${selectedOrder.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Order Timeline */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Order Timeline</h4>
                    <div className="space-y-2">
                      {selectedOrder.statusHistory.map((status, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {status.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(status.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  {canTrackOrder(selectedOrder) && (
                    <button
                      onClick={() => trackOrder(selectedOrder)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <FaMapMarkerAlt />
                      Track Order
                    </button>
                  )}
                  
                  {selectedOrder.status === 'delivered' && (
                    <>
                      <button
                        onClick={() => downloadInvoice(selectedOrder._id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                      >
                        <FaDownload />
                        Download Invoice
                      </button>
                      
                      <button
                        onClick={() => {
                          // Handle review submission
                          toast.info('Review feature coming soon!');
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
                      >
                        <FaStar />
                        Leave Review
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
