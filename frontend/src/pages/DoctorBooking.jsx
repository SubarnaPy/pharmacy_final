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
import { DarkModeContext } from '../app/DarkModeContext';
import { fetchDoctors, fetchDoctorSlots, bookConsultation } from '../api/doctorAPI';

function DoctorBooking() {
  const { isDarkMode } = useContext(DarkModeContext);
  const { user } = useSelector(state => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
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
    loadDoctorSlots(doctor.id);
  };

  const handleSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedSlot(slot);
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Book Your Consultation
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Connect with experienced doctors for personalized healthcare
          </p>
        </div>

        {bookingSuccess && (
          <div className="mb-8 p-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl shadow-lg flex items-center animate-bounce">
            <div className="bg-white/20 p-3 rounded-full mr-4">
              <CheckCircleIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xl font-bold">Consultation Booked Successfully! 🎉</p>
              <p className="text-green-100">You will receive a confirmation email shortly.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctors List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Choose Your Doctor
              </h2>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {doctors.length} doctors available
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.isArray(doctors) && doctors.map(doctor => (
                <div
                  key={doctor.id}
                  onClick={() => handleDoctorSelect(doctor)}
                  className={`group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    selectedDoctor?.id === doctor.id
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl'
                      : isDarkMode
                      ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:bg-gray-700/50 text-white'
                      : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      selectedDoctor?.id === doctor.id
                        ? 'bg-white/20'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      <UserIcon className={`h-8 w-8 ${
                        selectedDoctor?.id === doctor.id ? 'text-white' : 'text-white'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-lg mb-1 ${
                        selectedDoctor?.id === doctor.id
                          ? 'text-white'
                          : isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {doctor.name}
                      </h3>
                      <p className={`text-sm mb-2 ${
                        selectedDoctor?.id === doctor.id
                          ? 'text-blue-100'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {doctor.specialty}
                      </p>
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center">
                          <StarIcon className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          <span>{doctor.rating}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 opacity-70" />
                          <span>{doctor.experience}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm opacity-80">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span className="truncate">{doctor.location}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      selectedDoctor?.id === doctor.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                    }`}>
                      ${doctor.consultationFee}
                    </div>
                  </div>
                  {selectedDoctor?.id === doctor.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="lg:col-span-1">
            <div className={`sticky top-8 p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700' : 'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg'}`}>
              {selectedDoctor ? (
                <>
                  <div className="text-center mb-6">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      <UserIcon className="h-10 w-10 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedDoctor.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedDoctor.specialty}
                    </p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                      'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                    }`}>
                      ${selectedDoctor.consultationFee} per session
                    </div>
                  </div>
                  
                  <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Available Slots
                  </h4>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading slots...</p>
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
                                className={`p-3 rounded-xl text-xs font-medium transition-all transform hover:scale-105 ${
                                  slot.available
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
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
                      <CalendarDaysIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No available slots</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <CalendarDaysIcon className="h-10 w-10" />
                  </div>
                  <h3 className="font-semibold mb-2">Select a Doctor</h3>
                  <p className="text-sm">Choose a doctor to view available time slots</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Confirmation Modal */}
        {bookingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`max-w-lg w-full p-8 rounded-3xl shadow-2xl transform transition-all ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <CalendarDaysIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Confirm Your Booking
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Please review your appointment details
                </p>
              </div>
              
              <div className={`p-6 rounded-2xl mb-6 space-y-4 ${
                isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Doctor</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Specialty</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor?.specialty}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Date</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedSlot?.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSlot?.time}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-gray-600">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Fee</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    ${selectedDoctor?.consultationFee}
                  </span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setBookingModal(false)}
                  className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all ${
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <VideoCameraIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Video Consultation</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>High-quality video calls with experienced doctors</p>
          </div>
          <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <ClockIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Flexible Scheduling</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Book appointments that fit your schedule</p>
          </div>
          <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Instant Confirmation</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Get immediate booking confirmation and reminders</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorBooking;