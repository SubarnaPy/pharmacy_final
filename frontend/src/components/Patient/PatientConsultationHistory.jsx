import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  VideoCameraIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/react/24/outline';
import consultationService from '../../services/consultationService';

const PatientConsultationHistory = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    consultationType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const consultationModeIcons = {
    chat: <ChatBubbleLeftIcon className="h-5 w-5" />,
    video: <VideoCameraIcon className="h-5 w-5" />,
    phone: <PhoneIcon className="h-5 w-5" />,
    email: <EnvelopeIcon className="h-5 w-5" />,
    inPerson: <BuildingOfficeIcon className="h-5 w-5" />
  };

  const statusIcons = {
    pending: <PendingIcon className="h-5 w-5 text-yellow-500" />,
    confirmed: <CheckCircleIcon className="h-5 w-5 text-blue-500" />,
    completed: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
    cancelled: <XCircleIcon className="h-5 w-5 text-red-500" />
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchConsultations();
  }, [pagination.page, filters]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await consultationService.getPatientConsultations(queryParams);
      
      if (response.success) {
        setConsultations(response.data.consultations);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch consultations');
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to load consultation history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      consultationType: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewConsultationDetails = async (consultationId) => {
    try {
      const response = await consultationService.getConsultationDetails(consultationId);
      if (response.success) {
        setSelectedConsultation(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error fetching consultation details:', error);
      toast.error('Failed to load consultation details');
    }
  };

  const cancelConsultation = async (consultationId) => {
    if (!window.confirm('Are you sure you want to cancel this consultation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await consultationService.cancelConsultation(consultationId);
      if (response.success) {
        toast.success('Consultation cancelled successfully');
        fetchConsultations();
        if (selectedConsultation && selectedConsultation._id === consultationId) {
          setSelectedConsultation(null);
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      toast.error(error.message || 'Failed to cancel consultation');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const canCancelConsultation = (consultation) => {
    if (consultation.status === 'cancelled' || consultation.status === 'completed') {
      return false;
    }
    
    const consultationDateTime = new Date(`${consultation.appointmentDate}T${consultation.appointmentTime}`);
    const now = new Date();
    const timeDiff = consultationDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    return hoursDiff >= 2; // Must be at least 2 hours in advance
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Consultation History</h1>
          <p className="text-gray-600">View and manage your past and upcoming consultations</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
              <select
                value={filters.consultationType}
                onChange={(e) => handleFilterChange('consultationType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="chat">Chat</option>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="inPerson">In Person</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* Consultations List */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading consultations...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No consultations found</p>
              <p className="text-gray-500 text-sm mt-2">
                {Object.values(filters).some(filter => filter) 
                  ? "Try adjusting your filters or book a new consultation"
                  : "Book your first consultation to get started"
                }
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {consultations.map((consultation) => (
                  <motion.div
                    key={consultation._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Dr. {consultation.doctorId?.name || 'Unknown Doctor'}
                          </h3>
                          <p className="text-gray-600">{consultation.doctorId?.specialization}</p>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {formatDate(consultation.appointmentDate)}
                            </div>
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {formatTime(consultation.appointmentTime)}
                            </div>
                            <div className="flex items-center">
                              {consultationModeIcons[consultation.consultationType]}
                              <span className="ml-1 capitalize">{consultation.consultationType}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[consultation.status]}`}>
                          <div className="flex items-center">
                            {statusIcons[consultation.status]}
                            <span className="ml-1 capitalize">{consultation.status}</span>
                          </div>
                        </span>
                        
                        <button
                          onClick={() => viewConsultationDetails(consultation._id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        {canCancelConsultation(consultation) && (
                          <button
                            onClick={() => cancelConsultation(consultation._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                            title="Cancel Consultation"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {consultation.symptoms && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Symptoms: </span>
                        {consultation.symptoms}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} consultations
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-md">
                      {pagination.page} of {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Consultation Details Modal */}
      <AnimatePresence>
        {selectedConsultation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Consultation Details</h2>
                  <button
                    onClick={() => setSelectedConsultation(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Doctor Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Doctor Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Name</p>
                        <p className="text-gray-900">Dr. {selectedConsultation.doctorId?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Specialization</p>
                        <p className="text-gray-900">{selectedConsultation.doctorId?.specialization}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-gray-900">{selectedConsultation.doctorId?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-gray-900">{selectedConsultation.doctorId?.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Appointment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date</p>
                        <p className="text-gray-900">{formatDate(selectedConsultation.appointmentDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Time</p>
                        <p className="text-gray-900">{formatTime(selectedConsultation.appointmentTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Consultation Type</p>
                        <div className="flex items-center">
                          {consultationModeIcons[selectedConsultation.consultationType]}
                          <span className="ml-2 capitalize text-gray-900">
                            {selectedConsultation.consultationType}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedConsultation.status]}`}>
                          {statusIcons[selectedConsultation.status]}
                          <span className="ml-1 capitalize">{selectedConsultation.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Information</h3>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{selectedConsultation.consultationFee}
                    </p>
                  </div>

                  {/* Symptoms */}
                  {selectedConsultation.symptoms && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Symptoms</h3>
                      <p className="text-gray-900">{selectedConsultation.symptoms}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    {canCancelConsultation(selectedConsultation) && (
                      <button
                        onClick={() => cancelConsultation(selectedConsultation._id)}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                      >
                        Cancel Consultation
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedConsultation(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientConsultationHistory;
