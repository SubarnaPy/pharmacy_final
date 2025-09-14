import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import consultationService from '../../services/consultationService';

const PatientConsultations = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const statusColors = {
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rescheduled: 'bg-yellow-100 text-yellow-800'
  };

  const consultationTypeIcons = {
    video: VideoCameraIcon,
    phone: PhoneIcon,
    chat: ChatBubbleLeftRightIcon,
    email: EnvelopeIcon
  };

  useEffect(() => {
    loadConsultations();
  }, [selectedStatus]);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const response = await consultationService.getPatientConsultations(params);
      setConsultations(response.consultations || []);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultations');
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConsultation = async () => {
    if (!selectedConsultation || !cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      await consultationService.cancelConsultation(selectedConsultation._id, cancellationReason);
      toast.success('Consultation cancelled successfully');
      setShowModal(false);
      setCancellationReason('');
      setSelectedConsultation(null);
      loadConsultations();
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      toast.error('Failed to cancel consultation');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isUpcoming = (date, time) => {
    const consultationDateTime = new Date(`${date}T${time}`);
    return consultationDateTime > new Date();
  };

  const canCancel = (consultation) => {
    return consultation.status === 'confirmed' && isUpcoming(consultation.date, consultation.time);
  };

  const ConsultationCard = ({ consultation }) => {
    const Icon = consultationTypeIcons[consultation.consultationType] || VideoCameraIcon;
    const upcoming = isUpcoming(consultation.date, consultation.time);

    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {consultation.doctorId?.user?.profilePicture ? (
                  <img
                    src={consultation.doctorId.user.profilePicture}
                    alt="Doctor"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {consultation.doctorId?.user?.name || 'Doctor'}
                </h3>
                <p className="text-sm text-emerald-600">
                  {consultation.doctorId?.specializations?.[0] || 'General Medicine'}
                </p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{formatDate(consultation.date)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{formatTime(consultation.time)}</span>
                    {consultation.endTime && (
                      <span>- {formatTime(consultation.endTime)}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{consultation.consultationType}</span>
                  </div>
                </div>

                {consultation.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-1 mb-1">
                      <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Your Notes:</span>
                    </div>
                    <p className="text-sm text-gray-600">{consultation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[consultation.status] || 'bg-gray-100 text-gray-800'}`}>
                {consultation.status}
              </span>
              
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <CurrencyDollarIcon className="h-4 w-4" />
                <span>₹{consultation.consultationFee}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Booked on {new Date(consultation.createdAt).toLocaleDateString()}
            </div>

            <div className="flex space-x-2">
              {upcoming && consultation.status === 'confirmed' && (
                <>
                  {(consultation.consultationType === 'video' || consultation.consultationType === 'chat') && (
                    <button 
                      onClick={() => navigate(`/consultation/${consultation._id || consultation.id}`)}
                      className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Join Consultation
                    </button>
                  )}
                  
                  {canCancel(consultation) && (
                    <button
                      onClick={() => {
                        setSelectedConsultation(consultation);
                        setShowModal(true);
                      }}
                      className="px-3 py-1 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}

              {consultation.status === 'completed' && (
                <button className="px-3 py-1 border border-emerald-300 text-emerald-700 text-sm rounded-lg hover:bg-emerald-50 transition-colors">
                  Download Report
                </button>
              )}
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
          <h2 className="text-2xl font-bold text-gray-900">My Consultations</h2>
          <p className="text-gray-600">Manage your doctor appointments and consultations</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex space-x-2 overflow-x-auto">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'confirmed', label: 'Upcoming', icon: CalendarIcon },
          { key: 'completed', label: 'Completed', icon: CheckCircleIcon },
          { key: 'cancelled', label: 'Cancelled', icon: XCircleIcon }
        ].map(status => (
          <button
            key={status.key}
            onClick={() => setSelectedStatus(status.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedStatus === status.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.icon && <status.icon className="h-4 w-4" />}
            <span>{status.label}</span>
          </button>
        ))}
      </div>

      {/* Consultations List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-300 rounded mb-2 w-1/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No consultations found
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedStatus === 'all' 
              ? "You haven't booked any consultations yet." 
              : `No ${selectedStatus} consultations found.`
            }
          </p>
          <button
            onClick={() => window.location.href = '/patient/doctor-book'}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Book Your First Consultation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {consultations.map(consultation => (
            <ConsultationCard key={consultation._id} consultation={consultation} />
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {showModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cancel Consultation
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Are you sure you want to cancel your consultation with{' '}
                <strong>{selectedConsultation.doctorId?.user?.name}</strong> on{' '}
                {formatDate(selectedConsultation.date)} at {formatTime(selectedConsultation.time)}?
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Consultation
              </button>
              <button
                onClick={handleCancelConsultation}
                disabled={!cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientConsultations;
