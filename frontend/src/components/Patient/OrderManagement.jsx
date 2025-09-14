import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import PatientChat from './PatientChat';
import {
    ClockIcon,
    CheckCircleIcon,
    TruckIcon,
    XCircleIcon,
    EyeIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    BuildingStorefrontIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    PhoneIcon,
    StarIcon,
    ArrowPathIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    HeartIcon,
    PrinterIcon,
    ShareIcon,
    ArrowLeftIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [showChatModal, setShowChatModal] = useState(false);
    const [selectedOrderForChat, setSelectedOrderForChat] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'all',
        searchTerm: ''
    });

    // Order status options for patient view
    const statusOptions = [
        { value: 'pending', label: 'Order Placed', color: 'bg-yellow-500', icon: ClockIcon, description: 'Your order has been placed and is being processed' },
        { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircleIcon, description: 'Pharmacy has confirmed your order' },
        { value: 'preparing', label: 'Preparing', color: 'bg-orange-500', icon: ArrowPathIcon, description: 'Your medications are being prepared' },
        { value: 'ready', label: 'Ready for Pickup', color: 'bg-green-500', icon: CheckCircleIcon, description: 'Your order is ready for pickup' },
        { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500', icon: TruckIcon, description: 'Your order is on the way' },
        { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500', icon: CheckCircleIcon, description: 'Order has been delivered successfully' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500', icon: XCircleIcon, description: 'Order has been cancelled' }
    ];

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                status: filters.status !== 'all' ? filters.status : '',
                dateRange: filters.dateRange !== 'all' ? filters.dateRange : '',
                search: filters.searchTerm,
                limit: 50
            });

            const response = await apiClient.get(`/orders/my-orders?${params}`);
            const ordersData = response.data.data || [];
            
            // Sanitize orders data to prevent rendering objects as React children
            const sanitizedOrders = ordersData.map(order => ({
                ...order,
                pharmacy: order.pharmacy ? {
                    ...order.pharmacy,
                    rating: typeof order.pharmacy.rating === 'object' && order.pharmacy.rating !== null
                        ? order.pharmacy.rating.averageRating || order.pharmacy.rating.rating || 4.5
                        : order.pharmacy.rating
                } : null,
                prescriptionRequest: order.prescriptionRequest ? {
                    ...order.prescriptionRequest,
                    medications: order.prescriptionRequest.medications?.map(med => ({
                        ...med,
                        quantity: typeof med.quantity === 'object' && med.quantity !== null
                            ? (med.quantity.prescribed || med.quantity.value || med.quantity.amount || 1)
                            : (med.quantity || 1)
                    })) || []
                } : null
            }));
            
            setOrders(sanitizedOrders);
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            toast.error('Failed to load orders');
            // No fallback data - show proper error state
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;

        try {
            await apiClient.put(`/orders/${orderId}/cancel`);
            setOrders(orders.map(order => 
                order._id === orderId 
                    ? { ...order, status: 'cancelled', canCancel: false }
                    : order
            ));
            toast.success('Order cancelled successfully');
        } catch (error) {
            console.error('❌ Error cancelling order:', error);
            toast.error('Failed to cancel order');
        }
    };

    const submitRating = async () => {
        if (!selectedOrder || rating === 0) {
            toast.error('Please provide a rating');
            return;
        }

        try {
            await apiClient.post(`/orders/${selectedOrder._id}/rate`, {
                rating,
                review
            });

            setOrders(orders.map(order => 
                order._id === selectedOrder._id 
                    ? { ...order, rating, review, canRate: false }
                    : order
            ));

            toast.success('Thank you for your feedback!');
            setShowRatingModal(false);
            setRating(0);
            setReview('');
        } catch (error) {
            console.error('❌ Error submitting rating:', error);
            toast.error('Failed to submit rating');
        }
    };

    const openChatWithPharmacy = (order) => {
        setSelectedOrderForChat(order);
        setShowChatModal(true);
    };

    const getStatusInfo = (status) => {
        return statusOptions.find(s => s.value === status) || statusOptions[0];
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    const formatCurrency = (amount) => {
        return `$${(amount || 0).toFixed(2)}`;
    };

    // Safe rating formatter to handle different rating formats
    const formatRating = (rating) => {
        if (typeof rating === 'number') {
            return rating.toFixed(1);
        }
        if (typeof rating === 'object' && rating !== null) {
            if (rating.averageRating !== undefined) {
                return rating.averageRating.toFixed(1);
            }
            if (rating.rating !== undefined) {
                return rating.rating.toFixed(1);
            }
        }
        return '4.5'; // Default fallback
    };

    const getEstimatedDelivery = (order) => {
        if (order.status === 'delivered') {
            return `Delivered on ${formatDate(order.deliveredAt)}`;
        }
        if (order.estimatedReadyTime) {
            return `Expected: ${formatDate(order.estimatedReadyTime)}`;
        }
        return 'Estimating...';
    };

    const OrderCard = ({ order }) => {
        const statusInfo = getStatusInfo(order.status);
        const StatusIcon = statusInfo.icon;

        // Safety check to ensure no objects are rendered as React children
        const safeOrder = {
            ...order,
            pharmacy: order.pharmacy ? {
                ...order.pharmacy,
                rating: formatRating(order.pharmacy.rating)
            } : null,
            prescriptionRequest: order.prescriptionRequest ? {
                ...order.prescriptionRequest,
                medications: order.prescriptionRequest.medications?.map(med => ({
                    ...med,
                    quantity: typeof med.quantity === 'object' && med.quantity !== null
                        ? String(med.quantity.prescribed || med.quantity.value || med.quantity.amount || 1)
                        : String(med.quantity || 1)
                })) || []
            } : null
        };

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                            <StatusIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {safeOrder.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(safeOrder.createdAt)}
                            </p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Pharmacy Info */}
                <div className="flex items-center space-x-2 mb-3">
                    <BuildingStorefrontIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {safeOrder.pharmacy?.name}
                    </span>
                    {safeOrder.pharmacy?.rating && (
                        <>
                            <span className="text-xs text-gray-500">•</span>
                            <div className="flex items-center space-x-1">
                                <StarIcon className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {safeOrder.pharmacy.rating}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Medications */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Medications ({safeOrder.prescriptionRequest?.medications?.length || 0}):
                    </p>
                    <div className="space-y-1">
                        {safeOrder.prescriptionRequest?.medications?.slice(0, 2).map((med, index) => {
                            const safeName = String(med.name || 'Unknown medication');
                            const safeQuantity = String(med.quantity || '1');
                            return (
                                <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                    • {safeName} - Qty: {safeQuantity}
                                </p>
                            );
                        })}
                        {safeOrder.prescriptionRequest?.medications?.length > 2 && (
                            <p className="text-sm text-gray-500">
                                +{safeOrder.prescriptionRequest.medications.length - 2} more...
                            </p>
                        )}
                    </div>
                </div>

                {/* Order Details */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatCurrency(safeOrder.totalAmount)}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <TruckIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {safeOrder.deliveryMethod}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status Description */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {statusInfo.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {getEstimatedDelivery(safeOrder)}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => {
                            setSelectedOrder(safeOrder);
                            setShowOrderDetails(true);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <EyeIcon className="h-4 w-4" />
                        <span>View Details</span>
                    </button>

                    <div className="flex items-center space-x-2">
                        {safeOrder.canRate && (
                            <button
                                onClick={() => {
                                    setSelectedOrder(safeOrder);
                                    setShowRatingModal(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            >
                                <StarIcon className="h-4 w-4" />
                                <span>Rate</span>
                            </button>
                        )}
                        
                        {safeOrder.canCancel && (
                            <button
                                onClick={() => cancelOrder(safeOrder._id)}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <XCircleIcon className="h-4 w-4" />
                                <span>Cancel</span>
                            </button>
                        )}

                        <button
                            onClick={() => window.open(`tel:${safeOrder.pharmacy?.phone}`, '_self')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Call Pharmacy"
                        >
                            <PhoneIcon className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => openChatWithPharmacy(safeOrder)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Chat with Pharmacy"
                        >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const OrderDetailsModal = () => {
        if (!selectedOrder) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Order Details - {selectedOrder.orderNumber}
                        </h2>
                        <button
                            onClick={() => setShowOrderDetails(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <XCircleIcon className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Order Status */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className={`p-2 rounded-lg ${getStatusInfo(selectedOrder.status).color}`}>
                                    <CheckCircleIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {getStatusInfo(selectedOrder.status).label}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {getStatusInfo(selectedOrder.status).description}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">
                                {getEstimatedDelivery(selectedOrder)}
                            </p>
                            {selectedOrder.trackingNumber && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>Tracking Number:</strong> {selectedOrder.trackingNumber}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pharmacy Information */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Pharmacy Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.pharmacy?.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.pharmacy?.phone}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.pharmacy?.address}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Medications */}
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Medications</h3>
                            <div className="space-y-3">
                                {selectedOrder.prescriptionRequest?.medications?.map((med, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900 dark:text-white">{med.name}</h4>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Qty: {String(med.quantity || 1)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {med.instructions}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Delivery Information */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Delivery Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Method</p>
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {selectedOrder.deliveryMethod}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(selectedOrder.totalAmount)}
                                    </p>
                                </div>
                                {selectedOrder.deliveryMethod === 'delivery' && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedOrder.deliveryAddress}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.open(`tel:${selectedOrder.pharmacy?.phone}`, '_self')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <PhoneIcon className="h-4 w-4" />
                                    <span>Call Pharmacy</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                    <span>Message</span>
                                </button>
                                {selectedOrder.canRate && (
                                    <button
                                        onClick={() => {
                                            setShowOrderDetails(false);
                                            setShowRatingModal(true);
                                        }}
                                        className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                                    >
                                        <StarIcon className="h-4 w-4" />
                                        <span>Rate Order</span>
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowOrderDetails(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const RatingModal = () => {
        if (!selectedOrder) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Rate Your Experience
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            How was your experience with {selectedOrder.pharmacy?.name}?
                        </p>
                        
                        {/* Star Rating */}
                        <div className="flex items-center space-x-1 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-1 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                >
                                    <StarIcon className={`h-8 w-8 ${star <= rating ? 'fill-current' : ''}`} />
                                </button>
                            ))}
                        </div>

                        {/* Review Text */}
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share your experience (optional)"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 resize-none"
                            rows={3}
                        />

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowRatingModal(false);
                                    setRating(0);
                                    setReview('');
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRating}
                                disabled={rating === 0}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Submit Rating
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Chat Modal Component
    const ChatModal = () => {
        if (!showChatModal || !selectedOrderForChat) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full h-[80vh] flex flex-col">
                    {/* Chat Modal Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => {
                                    setShowChatModal(false);
                                    setSelectedOrderForChat(null);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
                            </button>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Chat for Order #{selectedOrderForChat.orderNumber}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedOrderForChat.pharmacy?.name || 'Pharmacy'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowChatModal(false);
                                setSelectedOrderForChat(null);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-hidden">
                        <PatientChat 
                            isEmbedded={true}
                            orderId={selectedOrderForChat._id}
                            orderNumber={selectedOrderForChat.orderNumber}
                            pharmacyId={selectedOrderForChat.pharmacy?._id}
                            pharmacyName={selectedOrderForChat.pharmacy?.name}
                            onClose={() => {
                                setShowChatModal(false);
                                setSelectedOrderForChat(null);
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Error boundary component
    const ErrorBoundary = ({ children }) => {
        try {
            return children;
        } catch (error) {
            console.error('❌ Rendering error in OrderManagement:', error);
            return (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-200">
                        Error rendering order data. Please refresh the page.
                    </p>
                </div>
            );
        }
    };

    return (
        <ErrorBoundary>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h1>
                        <p className="text-gray-600 dark:text-gray-400">Track and manage your prescription orders</p>
                    </div>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <FunnelIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                    </div>
                    
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <option value="all">All Status</option>
                        {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>

                    <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={filters.searchTerm}
                                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
                    <p className="text-gray-600 dark:text-gray-400">Your prescription orders will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.map(order => (
                        <OrderCard key={order._id} order={order} />
                    ))}
                </div>
            )}

                {/* Modals */}
                {showOrderDetails && <OrderDetailsModal />}
                {showRatingModal && <RatingModal />}
                {showChatModal && <ChatModal />}
            </div>
        </ErrorBoundary>
    );
}

export default OrderManagement;