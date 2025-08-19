import React, { useState, useEffect } from 'react';
import { consultationAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaClock, FaVideo, FaUser, FaStickyNote, FaTimes } from 'react-icons/fa';

const ConsultationBook = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [bookingData, setBookingData] = useState({
    pharmacyId: '',
    consultationType: 'general',
    preferredDate: '',
    preferredTime: '',
    notes: '',
    symptoms: '',
    medications: '',
    urgency: 'normal'
  });

  const consultationTypes = [
    { value: 'general', label: 'General Consultation' },
    { value: 'medication_review', label: 'Medication Review' },
    { value: 'prescription_clarification', label: 'Prescription Clarification' },
    { value: 'side_effects', label: 'Side Effects Discussion' },
    { value: 'drug_interaction', label: 'Drug Interaction Check' },
    { value: 'health_screening', label: 'Health Screening' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const response = await consultationAPI.getConsultations();
      if (response.data.success) {
        setConsultations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to fetch consultations');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookingData.pharmacyId || !bookingData.preferredDate || !bookingData.preferredTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await consultationAPI.bookConsultation({
        ...bookingData,
        dateTime: new Date(`${bookingData.preferredDate}T${bookingData.preferredTime}`)
      });

      if (response.data.success) {
        toast.success('Consultation booked successfully!');
        setShowBookingForm(false);
        setBookingData({
          pharmacyId: '',
          consultationType: 'general',
          preferredDate: '',
          preferredTime: '',
          notes: '',
          symptoms: '',
          medications: '',
          urgency: 'normal'
        });
        fetchConsultations();
      }
    } catch (error) {
      console.error('Error booking consultation:', error);
      toast.error(error.response?.data?.message || 'Failed to book consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConsultation = async (consultationId) => {
    if (!window.confirm('Are you sure you want to cancel this consultation?')) {
      return;
    }

    try {
      const response = await consultationAPI.cancelConsultation(consultationId);
      if (response.data.success) {
        toast.success('Consultation cancelled successfully');
        fetchConsultations();
      }
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      toast.error('Failed to cancel consultation');
    }
  };

  const joinConsultation = (consultation) => {
    if (consultation.meetingLink) {
      window.open(consultation.meetingLink, '_blank');
    } else {
      toast.error('Meeting link not available yet');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canJoinConsultation = (consultation) => {
    const now = new Date();
    const consultationTime = new Date(consultation.dateTime);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    return consultation.status === 'confirmed' && 
           minutesDiff <= 15 && 
           minutesDiff >= -30 && 
           consultation.meetingLink;
  };

  const canCancelConsultation = (consultation) => {
    const now = new Date();
    const consultationTime = new Date(consultation.dateTime);
    const hoursDiff = (consultationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return ['pending', 'confirmed'].includes(consultation.status) && hoursDiff > 2;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Virtual Consultations</h2>
          <button
            onClick={() => setShowBookingForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Book New Consultation
          </button>
        </div>

        {/* Consultations List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading consultations...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No consultations found. Book your first consultation!</p>
            </div>
          ) : (
            consultations.map(consultation => (
              <div key={consultation._id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {consultation.consultationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        <p className="text-gray-600">{consultation.pharmacy?.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                        {consultation.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaCalendarAlt className="text-blue-500" />
                        <span>{new Date(consultation.dateTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaClock className="text-green-500" />
                        <span>{new Date(consultation.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {consultation.pharmacist && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaUser className="text-purple-500" />
                          <span>{consultation.pharmacist.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${urgencyLevels.find(u => u.value === consultation.urgency)?.color}`}>
                          {urgencyLevels.find(u => u.value === consultation.urgency)?.label}
                        </span>
                      </div>
                    </div>

                    {consultation.notes && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FaStickyNote className="text-gray-500" />
                          <span className="font-medium text-gray-700">Notes:</span>
                        </div>
                        <p className="text-gray-600 ml-6">{consultation.notes}</p>
                      </div>
                    )}

                    {consultation.symptoms && (
                      <div className="mb-4">
                        <span className="font-medium text-gray-700">Symptoms: </span>
                        <span className="text-gray-600">{consultation.symptoms}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 lg:ml-6 mt-4 lg:mt-0">
                    {canJoinConsultation(consultation) && (
                      <button
                        onClick={() => joinConsultation(consultation)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaVideo />
                        Join Meeting
                      </button>
                    )}

                    {canCancelConsultation(consultation) && (
                      <button
                        onClick={() => handleCancelConsultation(consultation._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedConsultation(consultation)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 whitespace-nowrap"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Book Consultation</h3>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pharmacy *
                  </label>
                  <input
                    type="text"
                    value={bookingData.pharmacyId}
                    onChange={(e) => setBookingData(prev => ({ ...prev, pharmacyId: e.target.value }))}
                    placeholder="Enter pharmacy name or ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultation Type *
                    </label>
                    <select
                      value={bookingData.consultationType}
                      onChange={(e) => setBookingData(prev => ({ ...prev, consultationType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {consultationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency Level
                    </label>
                    <select
                      value={bookingData.urgency}
                      onChange={(e) => setBookingData(prev => ({ ...prev, urgency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {urgencyLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.preferredDate}
                      onChange={(e) => setBookingData(prev => ({ ...prev, preferredDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time *
                    </label>
                    <select
                      value={bookingData.preferredTime}
                      onChange={(e) => setBookingData(prev => ({ ...prev, preferredTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symptoms/Concerns
                  </label>
                  <textarea
                    value={bookingData.symptoms}
                    onChange={(e) => setBookingData(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="Describe your symptoms or concerns"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    value={bookingData.medications}
                    onChange={(e) => setBookingData(prev => ({ ...prev, medications: e.target.value }))}
                    placeholder="List any medications you're currently taking"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information for the pharmacist"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Booking...' : 'Book Consultation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Details Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Consultation Details
                </h3>
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <p className="text-gray-600">
                      {selectedConsultation.consultationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedConsultation.status)}`}>
                      {selectedConsultation.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-600">
                      {new Date(selectedConsultation.dateTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span>
                    <p className="text-gray-600">
                      {new Date(selectedConsultation.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {selectedConsultation.pharmacy && (
                  <div>
                    <span className="font-medium text-gray-700">Pharmacy:</span>
                    <p className="text-gray-600">{selectedConsultation.pharmacy.name}</p>
                  </div>
                )}

                {selectedConsultation.pharmacist && (
                  <div>
                    <span className="font-medium text-gray-700">Pharmacist:</span>
                    <p className="text-gray-600">{selectedConsultation.pharmacist.name}</p>
                  </div>
                )}

                {selectedConsultation.symptoms && (
                  <div>
                    <span className="font-medium text-gray-700">Symptoms:</span>
                    <p className="text-gray-600">{selectedConsultation.symptoms}</p>
                  </div>
                )}

                {selectedConsultation.medications && (
                  <div>
                    <span className="font-medium text-gray-700">Medications:</span>
                    <p className="text-gray-600">{selectedConsultation.medications}</p>
                  </div>
                )}

                {selectedConsultation.notes && (
                  <div>
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="text-gray-600">{selectedConsultation.notes}</p>
                  </div>
                )}

                {selectedConsultation.prescription && (
                  <div>
                    <span className="font-medium text-gray-700">Prescription Given:</span>
                    <p className="text-gray-600">Yes</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-6">
                {canJoinConsultation(selectedConsultation) && (
                  <button
                    onClick={() => joinConsultation(selectedConsultation)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <FaVideo />
                    Join Meeting
                  </button>
                )}
                
                {canCancelConsultation(selectedConsultation) && (
                  <button
                    onClick={() => {
                      handleCancelConsultation(selectedConsultation._id);
                      setSelectedConsultation(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Cancel Consultation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationBook;
