import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import {
    ClockIcon,
    CheckCircleIcon,
    TruckIcon,
    XCircleIcon,
    EyeIcon,
    PencilIcon,
    PhoneIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    UserIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon,
    PrinterIcon,
    ArrowPathIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';

function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'all',
        searchTerm: ''
    });
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Order status options for pharmacy
    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-500', icon: ClockIcon },
        { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircleIcon },
        { value: 'preparing', label: 'Preparing', color: 'bg-orange-500', icon: ArrowPathIcon },
        { value: 'ready', label: 'Ready for Pickup', color: 'bg-green-500', icon: CheckCircleIcon },
        { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500', icon: TruckIcon },
        { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500', icon: CheckCircleIcon },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500', icon: XCircleIcon }
    ];

    useEffect(() => {
        fetchOrders();
    }, [filters, sortBy, sortOrder]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                status: filters.status !== 'all' ? filters.status : '',
                dateRange: filters.dateRange !== 'all' ? filters.dateRange : '',
                search: filters.searchTerm,
                sortBy,
                sortOrder,
                limit: 50
            });

            const response = await apiClient.get(`/orders/pharmacy/orders?${params}`);
            setOrders(response.data.data || []);
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            toast.error(`Failed to load orders: ${error.response?.data?.message || error.message}`);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus, notes = '') => {
        try {
            setUpdatingStatus(true);
            await apiClient.put(`/orders/${orderId}/status`, {
                status: newStatus,
                notes,
                updatedBy: 'pharmacy'
            });

            // Update local state
            setOrders(orders.map(order => 
                order._id === orderId 
                    ? { ...order, status: newStatus, updatedAt: new Date() }
                    : order
            ));

            toast.success(`Order status updated to ${statusOptions.find(s => s.value === newStatus)?.label}`);
            setShowOrderDetails(false);
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            toast.error('Failed to update order status');
        } finally {
            setUpdatingStatus(false);
        }
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

    const OrderCard = ({ order }) => {
        const statusInfo = getStatusInfo(order.status);
        const StatusIcon = statusInfo.icon;

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
                                {order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(order.createdAt)}
                            </p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Patient Info */}
                <div className="flex items-center space-x-2 mb-3">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {order.patient?.profile?.firstName} {order.patient?.profile?.lastName}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {order.patient?.contact?.phone}
                    </span>
                </div>

                {/* Medications */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Medications ({order.prescriptionRequest?.medications?.length || 0}):
                    </p>
                    <div className="space-y-1">
                        {order.prescriptionRequest?.medications?.slice(0, 2).map((med, index) => (
                            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                • {med.name} - Qty: {
                                    typeof med.quantity === 'object' 
                                        ? `${med.quantity.prescribed} ${med.quantity.unit || ''}`.trim()
                                        : med.quantity
                                }
                            </p>
                        ))}
                        {order.prescriptionRequest?.medications?.length > 2 && (
                            <p className="text-sm text-gray-500">
                                +{order.prescriptionRequest.medications.length - 2} more...
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
                                {formatCurrency(order.totalAmount)}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <TruckIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {order.deliveryMethod}
                            </span>
                        </div>
                    </div>
                    {order.estimatedReadyTime && (
                        <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-500">
                                Ready: {formatDate(order.estimatedReadyTime)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <EyeIcon className="h-4 w-4" />
                        <span>View Details</span>
                    </button>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => window.open(`tel:${order.patient?.contact?.phone}`, '_self')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Call Patient"
                        >
                            <PhoneIcon className="h-4 w-4" />
                        </button>
                        
                        <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                            disabled={updatingStatus}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {statusOptions.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
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
                        {/* Patient Information */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Patient Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.patient?.profile?.firstName} {selectedOrder.patient?.profile?.lastName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.patient?.contact?.phone}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.patient?.contact?.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Method</p>
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {selectedOrder.deliveryMethod}
                                    </p>
                                </div>
                            </div>
                            {selectedOrder.deliveryMethod === 'delivery' && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.deliveryAddress}
                                    </p>
                                </div>
                            )}
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
                                                Qty: {
                                                    typeof med.quantity === 'object' 
                                                        ? `${med.quantity.prescribed} ${med.quantity.unit || ''}`.trim()
                                                        : med.quantity
                                                }
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {med.instructions}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Status & Timeline */}
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Status</h3>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${getStatusInfo(selectedOrder.status).color}`}>
                                            <CheckCircleIcon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {getStatusInfo(selectedOrder.status).label}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Updated: {formatDate(selectedOrder.updatedAt || selectedOrder.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <select
                                        value={selectedOrder.status}
                                        onChange={(e) => updateOrderStatus(selectedOrder._id, e.target.value)}
                                        disabled={updatingStatus}
                                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <p className="text-gray-700 dark:text-gray-300">{selectedOrder.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.open(`tel:${selectedOrder.patient?.contact?.phone}`, '_self')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <PhoneIcon className="h-4 w-4" />
                                    <span>Call Patient</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                    <span>Message</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
                                    <PrinterIcon className="h-4 w-4" />
                                    <span>Print</span>
                                </button>
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage and track prescription orders</p>
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
                    <p className="text-gray-600 dark:text-gray-400">Orders will appear here when patients place them.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.map(order => (
                        <OrderCard key={order._id} order={order} />
                    ))}
                </div>
            )}

            {/* Order Details Modal */}
            {showOrderDetails && <OrderDetailsModal />}
        </div>
    );
}

export default OrderManagement;