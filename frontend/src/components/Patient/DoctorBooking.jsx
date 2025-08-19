import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { 
  UserIcon,
  StarIcon,
  ClockIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  MapPinIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';
import { fetchDoctors, fetchDoctorSlots, bookConsultation } from '../../api/doctorAPI';

function DoctorBooking() {
  const { isDarkMode } = useContext(DarkModeContext);
  const { user } = useSelector(state => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [doctorModal, setDoctorModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetchDoctors();
      if (response.success && Array.isArray(response.data)) {
        setDoctors(response.data.filter(doctor => doctor.available));
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorSlots = async (doctorId) => {
    try {
      setLoading(true);
      const response = await fetchDoctorSlots(doctorId);
      if (response.success && Array.isArray(response.data)) {
        setAvailableSlots(response.data);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setDoctorModal(true);
    loadDoctorSlots(doctor.id);
  };

  const handleSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedSlot(slot);
      setDoctorModal(false);
      setBookingModal(true);
    }
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      const response = await bookConsultation({
        doctorId: selectedDoctor.id,
        slotId: selectedSlot._id
      });
      
      if (response.success) {
        setBookingSuccess(true);
        setBookingModal(false);
        
        // Update slot availability
        setAvailableSlots(prev => 
          prev.map(slot => 
            slot._id === selectedSlot._id 
              ? { ...slot, available: false }
              : slot
          )
        );
        
        setTimeout(() => setBookingSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error booking consultation:', error);
      alert('Failed to book consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupSlotsByDate = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Book Doctor Consultation
          </h1>
          <p className={`mt-2 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Find and book appointments with qualified healthcare professionals
          </p>
        </div>

        {bookingSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Consultation booked successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                You will receive a confirmation email shortly.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Doctors Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Doctors
              </h2>
              <div className={`px-3 py-1 rounded-md text-sm ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {doctors.length} doctors available
              </div>
            </div>
            
            {loading && doctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading doctors...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.isArray(doctors) && doctors.map(doctor => (
                  <div
                    key={doctor.id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                        'bg-emerald-100 dark:bg-emerald-900/30'
                      }`}>
                        <UserIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className={`font-semibold text-lg mb-2 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {doctor.name}
                      </h3>
                      <p className={`text-sm mb-3 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {doctor.specialty}
                      </p>
                      <div className="flex items-center justify-center space-x-1 mb-3">
                        <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{doctor.rating}</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>• {doctor.experience}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-md text-sm font-medium ${
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        ${doctor.consultationFee}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Confirmation Modal */}
        {bookingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-lg w-full p-6 rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Confirm Booking
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Please review your appointment details
                </p>
              </div>
              
              <div className={`p-4 rounded-lg mb-6 space-y-3 ${
                isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Doctor</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Specialty</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor?.specialty}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Date</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedSlot?.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSlot?.time}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Consultation Fee</span>
                  <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    ${selectedDoctor?.consultationFee}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setBookingModal(false)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBooking}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Details Modal */}
        {doctorModal && selectedDoctor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedDoctor.name}
                    </h2>
                    <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedDoctor.specialty}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDoctorModal(false)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Doctor Details */}
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Doctor Info */}
                <div className="lg:col-span-2 space-y-6">
                  <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Doctor Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <StarIcon className="h-5 w-5 text-yellow-500 fill-current" />
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.rating}</span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.experience}</span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Experience</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                          ${selectedDoctor.consultationFee}
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>per session</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="lg:col-span-1">
                  <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Available Time Slots
                    </h3>
                    
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading slots...</p>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {Object.entries(groupSlotsByDate(availableSlots)).map(([date, slots]) => (
                          <div key={date}>
                            <h5 className={`font-medium mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                              {slots.map(slot => (
                                <button
                                  key={slot._id}
                                  onClick={() => handleSlotSelect(slot)}
                                  disabled={!slot.available}
                                  className={`p-2 rounded-md text-xs font-medium transition-all ${
                                    slot.available
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                                  }`}
                                >
                                  <ClockIcon className="h-3 w-3 mx-auto mb-1" />
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No available slots</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`text-center p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-12 h-12 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <VideoCameraIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Video Consultation</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>High-quality video calls with experienced doctors</p>
          </div>
          <div className={`text-center p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Flexible Scheduling</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Book appointments that fit your schedule</p>
          </div>
          <div className={`text-center p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Instant Confirmation</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Get immediate booking confirmation and reminders</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorBooking;