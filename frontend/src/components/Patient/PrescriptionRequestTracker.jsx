import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import PharmacyResponseSelector from './PharmacyResponseSelector';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
  BellIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

function PrescriptionRequestTracker() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showPharmacySelector, setShowPharmacySelector] = useState(false);

  useEffect(() => {
    fetchPrescriptionRequests();
  }, []);

  const fetchPrescriptionRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/prescription-requests/my-requests');
      console.log('✅ My prescription requests:', response.data);
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('❌ Error fetching prescription requests:', error);
      toast.error('Failed to load prescription requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <DocumentTextIcon className="h-4 w-4" />;
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'accepted': return <CheckCircleIcon className="h-4 w-4" />;
      case 'declined': return <XCircleIcon className="h-4 w-4" />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
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

  const handleViewResponses = (requestId) => {
    setSelectedRequestId(requestId);
    setShowPharmacySelector(true);
  };

  const handleOrderCreated = (order) => {
    toast.success('Order created successfully!');
    fetchPrescriptionRequests(); // Refresh the list
  };

  const PrescriptionRequestCard = ({ request }) => {
    const responseCount = request.pharmacyResponses?.filter(r => r.status === 'accepted').length || 0;
    const hasResponses = responseCount > 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {request.requestNumber}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Submitted {formatTimeAgo(request.createdAt)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)}
              <span className="ml-1">{request.status.toUpperCase()}</span>
            </span>
            {hasResponses && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium animate-pulse">
                <BellIcon className="h-3 w-3 mr-1" />
                {responseCount} Response{responseCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Medications */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Medications ({request.medications?.length || 0})
          </h4>
          <div className="space-y-2">
            {request.medications?.slice(0, 2).map((medication, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">
                  {medication.name || medication.brandName}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Qty: {medication.quantity?.prescribed || 'N/A'}
                </span>
              </div>
            ))}
            {(request.medications?.length || 0) > 2 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                +{request.medications.length - 2} more medications
              </p>
            )}
          </div>
        </div>

        {/* Request Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Urgency:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
              request.preferences?.urgency === 'emergency' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              request.preferences?.urgency === 'urgent' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {(request.preferences?.urgency || 'routine').toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
              {request.preferences?.deliveryMethod || 'pickup'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {request.targetPharmacies?.length || 0} pharmacies notified
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate(`/patient/prescription/${request._id}`)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {hasResponses ? (
              <button
                onClick={() => handleViewResponses(request._id)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>Choose Pharmacy ({responseCount})</span>
              </button>
            ) : (
              <button
                disabled
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center space-x-2"
              >
                <ClockIcon className="h-4 w-4" />
                <span>Waiting for Responses</span>
              </button>
            )}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Prescription Requests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your prescription requests and choose from pharmacy responses
          </p>
        </div>
        <button
          onClick={fetchPrescriptionRequests}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading your prescription requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Prescription Requests
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You haven't submitted any prescription requests yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => (
            <PrescriptionRequestCard key={request._id} request={request} />
          ))}
        </div>
      )}

      {/* Pharmacy Response Selector Modal */}
      {showPharmacySelector && selectedRequestId && (
        <PharmacyResponseSelector
          prescriptionRequestId={selectedRequestId}
          onClose={() => {
            setShowPharmacySelector(false);
            setSelectedRequestId(null);
          }}
          onOrderCreated={handleOrderCreated}
        />
      )}
    </div>
  );
}

export default PrescriptionRequestTracker;