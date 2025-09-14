import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ArrowRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import consultationManagementService from '../../services/consultationManagementService';

const ConsultationDashboard = ({ userRole = 'patient' }) => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    consultationType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });

  const consultationModeIcons = {
    video: <VideoCameraIcon className="h-5 w-5" />,
    phone: <PhoneIcon className="h-5 w-5" />,
    chat: <ChatBubbleLeftIcon className="h-5 w-5" />,
    email: <DocumentTextIcon className="h-5 w-5" />,
    inPerson: <UserIcon className="h-5 w-5" />
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusIcons = {
    pending: <ClockIcon className="h-4 w-4" />,
    confirmed: <CheckCircleIcon className="h-4 w-4" />,
    active: <PlayIcon className="h-4 w-4" />,
    completed: <CheckCircleIcon className="h-4 w-4" />,
    cancelled: <XCircleIcon className="h-4 w-4" />
  };

  useEffect(() => {
    fetchConsultations();
    fetchStats();
  }, [activeTab, filters]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        status: activeTab === 'all' ? '' : activeTab
      };

      let response;
      if (userRole === 'patient') {
        response = await consultationManagementService.getPatientConsultations(params);
      } else {
        response = await consultationManagementService.getDoctorConsultations(params);
      }

      console.log('🔍 ConsultationDashboard received:', response);
      if (response.success) {
        const consultationData = response.data.consultations || response.data;
        console.log('🔍 Setting consultations:', consultationData);
        setConsultations(consultationData);
      } else if (Array.isArray(response)) {
        // Handle direct array response
        console.log('🔍 Setting consultations (direct array):', response);
        setConsultations(response);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to load consultations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await consultationManagementService.getConsultationStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStartConsultation = async (consultation) => {
    try {
      // First update the consultation status to active
      const response = await consultationManagementService.startConsultation(consultation._id);
      if (response.success) {
        toast.success('Consultation started');
        fetchConsultations(); // Refresh the list
        
        // Then navigate to the appropriate room
        if (consultation.consultationType === 'video' || consultation.consultationType === 'phone') {
          navigate(`/consultation/${consultation._id}`);
        } else if (consultation.consultationType === 'chat') {
          navigate(`/consultation/${consultation._id}/chat`);
        }
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Failed to start consultation');
    }
  };

  const handleJoinConsultation = async (consultation) => {
    try {
      if (consultation.consultationType === 'video' || consultation.consultationType === 'phone') {
        navigate(`/consultation/${consultation._id}/room`);
      } else if (consultation.consultationType === 'chat') {
        navigate(`/consultation/${consultation._id}/chat`);
      }
    } catch (error) {
      console.error('Error joining consultation:', error);
      toast.error('Failed to join consultation');
    }
  };

  const handleEndConsultation = async (consultationId) => {
    if (!confirm('Are you sure you want to end this consultation?')) return;

    try {
      const response = await consultationManagementService.endConsultation(consultationId);
      if (response.success) {
        toast.success('Consultation ended');
        fetchConsultations();
      }
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast.error('Failed to end consultation');
    }
  };

  const handleCancelConsultation = async (consultationId) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      const response = await consultationManagementService.cancelConsultation(consultationId, reason);
      if (response.success) {
        toast.success('Consultation cancelled');
        fetchConsultations();
      }
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      toast.error(error.message || 'Failed to cancel consultation');
    }
  };

  const formatDateTime = (date, time) => {
    const consultationDate = new Date(`${date}T${time}`);
    return consultationDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const canStartConsultation = (consultation) => {
    return consultation.status === 'confirmed';
  };

  const canJoinConsultation = (consultation) => {
    return consultation.status === 'active';
  };

  const canCancelConsultation = (consultation) => {
    if (consultation.status === 'cancelled' || consultation.status === 'completed') {
      return false;
    }
    
    const now = new Date();
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const timeDiff = consultationDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 2; // Can cancel at least 2 hours before
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {userRole === 'patient' ? 'My Consultations' : 'Doctor Consultations'}
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your {userRole === 'patient' ? 'appointments' : 'patient consultations'} and join video calls
              </p>
            </div>
            
            {userRole === 'patient' && (
              <button
                onClick={() => navigate('/patient/doctor-book')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Book New Consultation
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                {['all', 'pending', 'confirmed', 'active', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize rounded-md transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 py-4 border-b border-gray-200 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={filters.consultationType}
                      onChange={(e) => setFilters({ ...filters, consultationType: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="video">Video</option>
                      <option value="phone">Phone</option>
                      <option value="chat">Chat</option>
                      <option value="email">Email</option>
                      <option value="inPerson">In Person</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Consultations List */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading consultations...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No consultations found</p>
              <p className="text-gray-500 text-sm mt-2">
                {userRole === 'patient' ? 'Book your first consultation to get started' : 'No consultations scheduled'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {consultations.map((consultation) => (
                <motion.div
                  key={consultation._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          {consultationModeIcons[consultation.consultationType] || <UserIcon className="h-6 w-6 text-blue-600" />}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {userRole === 'patient' 
                              ? `Dr. ${consultation.doctorId?.name || 'Unknown Doctor'}`
                              : consultation.patientId?.name || 'Unknown Patient'
                            }
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[consultation.status]}`}>
                            {statusIcons[consultation.status]}
                            <span className="ml-1 capitalize">{consultation.status}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center">
                            <CalendarDaysIcon className="h-4 w-4 mr-1" />
                            {formatDateTime(consultation.date, consultation.time)}
                          </div>
                          <div className="flex items-center">
                            {consultationModeIcons[consultation.consultationType]}
                            <span className="ml-1 capitalize">{consultation.consultationType}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-600 font-semibold">₹{consultation.consultationFee}</span>
                          </div>
                        </div>

                        {consultation.symptoms && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Symptoms: </span>
                            {consultation.symptoms}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Join/Start Consultation Button */}
                      {canStartConsultation(consultation) && userRole === 'doctor' && (
                        <button
                          onClick={() => handleStartConsultation(consultation)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Start
                        </button>
                      )}

                      {canJoinConsultation(consultation) && (
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          {consultation.consultationType === 'video' ? (
                            <>
                              <VideoCameraIcon className="h-4 w-4 mr-1" />
                              Join Video
                            </>
                          ) : consultation.consultationType === 'phone' ? (
                            <>
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              Join Call
                            </>
                          ) : (
                            <>
                              <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                              Join Chat
                            </>
                          )}
                        </button>
                      )}

                      {canStartConsultation(consultation) && userRole === 'patient' && (
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <ArrowRightIcon className="h-4 w-4 mr-1" />
                          Join
                        </button>
                      )}

                      {/* View Details Button */}
                      <button
                        onClick={() => setSelectedConsultation(consultation)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      {/* Cancel Button */}
                      {canCancelConsultation(consultation) && (
                        <button
                          onClick={() => handleCancelConsultation(consultation._id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}

                      {/* End Consultation Button */}
                      {consultation.status === 'active' && userRole === 'doctor' && (
                        <button
                          onClick={() => handleEndConsultation(consultation._id)}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center"
                        >
                          <StopIcon className="h-4 w-4 mr-1" />
                          End
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Details content goes here */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {userRole === 'patient' ? 'Doctor' : 'Patient'}
                      </label>
                      <p className="text-gray-900">
                        {userRole === 'patient' 
                          ? `Dr. ${selectedConsultation.doctorId?.name}`
                          : selectedConsultation.patientId?.name
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedConsultation.status]}`}>
                        {statusIcons[selectedConsultation.status]}
                        <span className="ml-1 capitalize">{selectedConsultation.status}</span>
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                      <p className="text-gray-900">
                        {formatDateTime(selectedConsultation.appointmentDate, selectedConsultation.appointmentTime)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <div className="flex items-center">
                        {consultationModeIcons[selectedConsultation.consultationType]}
                        <span className="ml-2 capitalize">{selectedConsultation.consultationType}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fee</label>
                      <p className="text-green-600 font-semibold">₹{selectedConsultation.consultationFee}</p>
                    </div>
                  </div>

                  {selectedConsultation.symptoms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Symptoms</label>
                      <p className="text-gray-900">{selectedConsultation.symptoms}</p>
                    </div>
                  )}

                  {selectedConsultation.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="text-gray-900">{selectedConsultation.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConsultationDashboard;
