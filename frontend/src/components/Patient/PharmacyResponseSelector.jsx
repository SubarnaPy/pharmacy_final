import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import {
    CheckCircleIcon,
    ClockIcon,
    MapPinIcon,
    TruckIcon,
    CurrencyDollarIcon,
    StarIcon,
    PhoneIcon,
    XCircleIcon,
    ShoppingCartIcon,
    BuildingStorefrontIcon,
    HeartIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    EyeIcon
} from '@heroicons/react/24/outline';

function PharmacyResponseSelector({ prescriptionRequestId, onClose, onOrderCreated }) {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [creatingOrder, setCreatingOrder] = useState(false);

    // Utility function to safely format currency
    const safeCurrency = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    useEffect(() => {
        fetchPharmacyResponses();
    }, [prescriptionRequestId]);

    const fetchPharmacyResponses = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/prescription-requests/${prescriptionRequestId}/responses`);
            console.log('✅ Pharmacy responses received:', response.data);

            // Filter only accepted responses
            const acceptedResponses = response.data.data.filter(resp => resp.status === 'accepted');
            setResponses(acceptedResponses);
        } catch (error) {
            console.error('❌ Error fetching pharmacy responses:', error);
            toast.error('Failed to load pharmacy responses');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPharmacy = async (pharmacyResponse) => {
        try {
            setCreatingOrder(true);

            // Validate pharmacy data
            if (!pharmacyResponse.pharmacyId || !pharmacyResponse.pharmacyId._id) {
                console.error('❌ Invalid pharmacy data:', pharmacyResponse);
                toast.error('Invalid pharmacy data. Please refresh and try again.');
                return;
            }

            // Validate and normalize price data
            let normalizedPrice = pharmacyResponse.quotedPrice;
            
            // If price is missing or invalid, set a default
            if (!normalizedPrice) {
                console.warn('⚠️ No quoted price found, using default of 0');
                normalizedPrice = { total: 0 };
            } else if (typeof normalizedPrice === 'number') {
                // Convert number to object format
                normalizedPrice = { total: normalizedPrice };
            } else if (typeof normalizedPrice === 'object' && normalizedPrice !== null) {
                // Ensure total exists and is a number
                if (typeof normalizedPrice.total !== 'number') {
                    console.warn('⚠️ Invalid price total, using 0');
                    normalizedPrice.total = 0;
                }
            } else {
                console.warn('⚠️ Invalid price format, using default');
                normalizedPrice = { total: 0 };
            }

            // Create order with selected pharmacy
            const orderData = {
                prescriptionRequestId,
                selectedPharmacyId: pharmacyResponse.pharmacyId._id,
                pharmacyResponseId: pharmacyResponse._id,
                quotedPrice: normalizedPrice,
                estimatedFulfillmentTime: pharmacyResponse.estimatedFulfillmentTime || 60,
                notes: pharmacyResponse.notes || ''
            };

            console.log('🛒 Creating order with selected pharmacy:', orderData);
            const response = await apiClient.post('/orders/create-from-prescription', orderData);

            toast.success(`Order created with ${pharmacyResponse.pharmacyId?.name || 'selected pharmacy'}!`);
            onOrderCreated && onOrderCreated(response.data.data);
            onClose();
        } catch (error) {
            console.error('❌ Error creating order:', error);
            
            // Show more specific error messages
            if (error.response?.status === 400) {
                const errorMessage = error.response.data?.message || 'Validation failed';
                const validationErrors = error.response.data?.errors;
                
                if (validationErrors && validationErrors.length > 0) {
                    const priceError = validationErrors.find(err => err.field === 'quotedPrice');
                    if (priceError) {
                        toast.error('Invalid price data. Please contact the pharmacy to update their quote.');
                    } else {
                        toast.error(`Validation error: ${validationErrors[0].message}`);
                    }
                } else {
                    toast.error(errorMessage);
                }
            } else if (error.response?.status === 404) {
                toast.error('Prescription request or pharmacy not found');
            } else if (error.response?.status === 403) {
                toast.error('You are not authorized to create this order');
            } else {
                toast.error('Failed to create order. Please try again.');
            }
        } finally {
            setCreatingOrder(false);
        }
    };

    const formatPrice = (price) => {
        // Handle null, undefined, or empty values
        if (price === null || price === undefined || price === '') {
            return '$0.00';
        }

        // Handle object with total property
        if (typeof price === 'object' && price !== null) {
            if (price.total !== undefined && price.total !== null) {
                const total = parseFloat(price.total);
                return `$${isNaN(total) ? '0.00' : total.toFixed(2)}`;
            }
            // If object doesn't have total, try to extract a numeric value
            const numericValue = parseFloat(price.amount || price.value || price.price || 0);
            return `$${isNaN(numericValue) ? '0.00' : numericValue.toFixed(2)}`;
        }

        // Handle string values
        if (typeof price === 'string') {
            const numericValue = parseFloat(price.replace(/[^0-9.-]/g, '')); // Remove non-numeric characters except . and -
            return `$${isNaN(numericValue) ? '0.00' : numericValue.toFixed(2)}`;
        }

        // Handle numeric values
        if (typeof price === 'number') {
            return `$${isNaN(price) ? '0.00' : price.toFixed(2)}`;
        }

        // Fallback for any other type
        return '$0.00';
    };

    const formatFulfillmentTime = (time) => {
        if (time >= 60) {
            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${time}m`;
    };

    const PharmacyResponseCard = ({ response }) => {
        const [showDetailedBill, setShowDetailedBill] = useState(false);
        const [showPharmacyMessage, setShowPharmacyMessage] = useState(false);

        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-300 p-6 hover:shadow-lg ${selectedPharmacy?._id === response._id
                ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}>
                {/* Pharmacy Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                            <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {response.pharmacyId?.name || 'Unknown Pharmacy'}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPinIcon className="h-4 w-4" />
                                <span>{response.pharmacyId?.address
                                    ? [
                                        response.pharmacyId.address.street,
                                        response.pharmacyId.address.city,
                                        response.pharmacyId.address.state,
                                        response.pharmacyId.address.zipCode,
                                        response.pharmacyId.address.country
                                    ].filter(Boolean).join(', ')
                                    : 'Address not available'}</span>
                            </div>
                            {response?.pharmacyId?.rating && (
                                <div className="flex items-center space-x-1 mt-1">
                                    <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {/* {response?.pharmacyId?.rating.toFixed(1)} */}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({ 0} reviews)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {response.pharmacyMessage && (
                            <button
                                onClick={() => setShowPharmacyMessage(true)}
                                className={`p-2 rounded-lg transition-colors ${response.pharmacyMessage.priority === 'urgent' ? 'bg-red-100 text-red-600 animate-pulse' :
                                    response.pharmacyMessage.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}
                                title="Pharmacy has a message for you"
                            >
                                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </button>
                        )}
                        {selectedPharmacy?._id === response._id && (
                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Selected</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Response Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                    {response.detailedBill?.summary?.patientOwes ? 'You Pay' : 'Total Price'}
                                </p>
                                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {response.detailedBill?.summary?.patientOwes
                                        ? `$${(response.detailedBill.summary.patientOwes || 0).toFixed(2)}`
                                        : formatPrice(response.quotedPrice)
                                    }
                                </p>
                                {response.detailedBill?.summary?.insurance?.totalCoverage > 0 && (
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        Insurance saves: ${(response.detailedBill.summary.insurance.totalCoverage || 0).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <ClockIcon className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Ready In</p>
                                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    {formatFulfillmentTime(response.estimatedFulfillmentTime)}
                                </p>
                                {response.pharmacyInfo?.estimatedReadyTime && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        Ready by: {new Date(response.pharmacyInfo.estimatedReadyTime).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <TruckIcon className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Delivery</p>
                                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                    {response.deliveryOptions?.includes('delivery') ? 'Available' : 'Pickup Only'}
                                </p>
                                {response.detailedBill?.summary?.fees?.find(f => f.type === 'delivery') && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                        Fee: ${(response.detailedBill.summary.fees.find(f => f.type === 'delivery')?.amount || 0).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Bill Button */}
                {response.detailedBill && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowDetailedBill(!showDetailedBill)}
                            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        >
                            <DocumentTextIcon className="h-4 w-4" />
                            <span>{showDetailedBill ? 'Hide' : 'View'} Detailed Bill</span>
                        </button>
                    </div>
                )}

                {/* Detailed Bill Breakdown */}
                {showDetailedBill && response.detailedBill && (
                    <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Detailed Bill Breakdown</h4>

                        {/* Medications */}
                        <div className="space-y-3 mb-4">
                            {response.detailedBill.medications?.map((med, index) => (
                                <div key={index} className="border-b border-gray-200 dark:border-gray-600 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {med.brandName || med.name}
                                            </p>
                                            {med.genericName && med.brandName && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Generic: {med.genericName}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {med.strength} • Qty: {med.quantity?.prescribed} {med.quantity?.unit}
                                            </p>
                                            {med.substitution?.isSubstituted && (
                                                <p className="text-sm text-green-600 dark:text-green-400">
                                                    ✓ Generic substitution saves ${(med.substitution.savings || 0).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                ${(med.pricing?.totalPrice || 0).toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                ${(med.pricing?.unitPrice || 0).toFixed(2)} each
                                            </p>
                                            {med.pricing?.insuranceCoverage > 0 && (
                                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                                    Insurance: -${(med.pricing.insuranceCoverage || 0).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bill Summary */}
                        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>${(response.detailedBill.summary?.subtotal || 0).toFixed(2)}</span>
                                </div>

                                {response.detailedBill.summary?.discount?.amount > 0 && (
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>Discount ({response.detailedBill.summary.discount.reason}):</span>
                                        <span>-${(response.detailedBill.summary.discount.amount || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                {response.detailedBill.summary?.tax?.amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Tax ({response.detailedBill.summary.tax.rate}%):</span>
                                        <span>${(response.detailedBill.summary.tax.amount || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                {response.detailedBill.summary?.fees?.map((fee, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span>{fee.description || fee.type} Fee:</span>
                                        <span>${(fee.amount || 0).toFixed(2)}</span>
                                    </div>
                                ))}

                                {response.detailedBill.summary?.insurance?.totalCoverage > 0 && (
                                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                        <span>Insurance Coverage:</span>
                                        <span>-${(response.detailedBill.summary.insurance.totalCoverage || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-gray-600 pt-2">
                                    <span>You Pay:</span>
                                    <span>${(response.detailedBill.summary?.patientOwes || response.detailedBill.summary?.finalTotal || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pharmacy Message Preview */}
                {response.pharmacyMessage && (
                    <div className={`rounded-lg p-3 mb-4 border-l-4 ${response.pharmacyMessage.priority === 'urgent' ? 'bg-red-50 border-red-400 dark:bg-red-900/20' :
                        response.pharmacyMessage.priority === 'high' ? 'bg-orange-50 border-orange-400 dark:bg-orange-900/20' :
                            'bg-blue-50 border-blue-400 dark:bg-blue-900/20'
                        }`}>
                        <div className="flex items-start space-x-2">
                            <div className={`p-1 rounded ${response.pharmacyMessage.messageType === 'warning' ? 'bg-orange-100 text-orange-600' :
                                response.pharmacyMessage.messageType === 'info' ? 'bg-blue-100 text-blue-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {response.pharmacyMessage.messageType === 'warning' ? (
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                ) : (
                                    <InformationCircleIcon className="h-4 w-4" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {response.pharmacyMessage.title || 'Message from Pharmacy'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {response.pharmacyMessage.content}
                                </p>
                                <button
                                    onClick={() => setShowPharmacyMessage(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                >
                                    Read full message
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pharmacy Notes */}
                {response.notes && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Notes:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{response.notes}</p>
                    </div>
                )}

                {/* Special Instructions */}
                {response.pharmacyInfo?.specialInstructions && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Special Instructions:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">{response.pharmacyInfo.specialInstructions}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => window.open(`tel:${response.pharmacyInfo?.contactNumber || response.pharmacyId?.phone}`, '_self')}
                            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            disabled={!response.pharmacyInfo?.contactNumber && !response.pharmacyId?.phone}
                        >
                            <PhoneIcon className="h-4 w-4" />
                            <span>Call Pharmacy</span>
                        </button>

                        {response.pharmacyInfo?.consultationAvailable && (
                            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                                Consultation Available
                                {response.pharmacyInfo.consultationFee && ` ($${response.pharmacyInfo.consultationFee})`}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {response.detailedBill && (
                            <button
                                onClick={() => setShowDetailedBill(!showDetailedBill)}
                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <EyeIcon className="h-4 w-4 inline mr-1" />
                                View Bill
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setSelectedPharmacy(response);
                                handleSelectPharmacy(response);
                            }}
                            disabled={creatingOrder}
                            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${selectedPharmacy?._id === response._id
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
                                }`}
                        >
                            {creatingOrder && selectedPharmacy?._id === response._id ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Creating Order...</span>
                                </>
                            ) : (
                                <>
                                    <ShoppingCartIcon className="h-4 w-4" />
                                    <span>Approve & Order</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Pharmacy Message Modal */}
                {showPharmacyMessage && response.pharmacyMessage && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`p-2 rounded-lg ${response.pharmacyMessage.messageType === 'warning' ? 'bg-orange-100 text-orange-600' :
                                        response.pharmacyMessage.messageType === 'info' ? 'bg-blue-100 text-blue-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {response.pharmacyMessage.messageType === 'warning' ? (
                                            <ExclamationTriangleIcon className="h-5 w-5" />
                                        ) : (
                                            <InformationCircleIcon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {response.pharmacyMessage.title || 'Message from Pharmacy'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowPharmacyMessage(false)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <XCircleIcon className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {response.pharmacyMessage.content}
                                </p>
                            </div>

                            {response.pharmacyInfo?.pharmacistName && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    - {response.pharmacyInfo.pharmacistName}, Pharmacist
                                </div>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowPharmacyMessage(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                {response.pharmacyMessage.requiresAcknowledgment && (
                                    <button
                                        onClick={() => {
                                            setShowPharmacyMessage(false);
                                            // Here you could add logic to mark message as acknowledged
                                        }}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    >
                                        Acknowledge
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                            <ShoppingCartIcon className="h-6 w-6 mr-2 text-blue-600" />
                            Choose Your Pharmacy
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {responses.length} pharmacy{responses.length !== 1 ? 'ies' : 'y'} accepted your prescription request
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <XCircleIcon className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading pharmacy responses...</p>
                        </div>
                    ) : responses.length === 0 ? (
                        <div className="text-center py-12">
                            <HeartIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No Responses Yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Pharmacies are still reviewing your prescription. Please check back later.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Sorting/Filtering Options */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
                                    <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="price">Lowest Price</option>
                                        <option value="time">Fastest Fulfillment</option>
                                        <option value="rating">Highest Rating</option>
                                        <option value="distance">Nearest Location</option>
                                    </select>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    💡 Compare prices and delivery times to choose the best option
                                </div>
                            </div>

                            {/* Pharmacy Response Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {responses.map((response) => (
                                    <PharmacyResponseCard key={response._id} response={response} />
                                ))}
                            </div>

                            {/* Help Text */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    💡 How to Choose the Best Pharmacy
                                </h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Compare total prices including any delivery fees</li>
                                    <li>• Check fulfillment times if you need medications urgently</li>
                                    <li>• Consider pharmacy ratings and reviews from other patients</li>
                                    <li>• Look for delivery options if you prefer home delivery</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PharmacyResponseSelector;