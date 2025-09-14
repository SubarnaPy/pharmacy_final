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
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  HeartIcon,
  EyeIcon,
  ShieldCheckIcon,
  TrophyIcon,
  ClockIcon as TimeIcon
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { DarkModeContext } from '../../app/DarkModeContext';
import { fetchDoctors, fetchDoctorSlots, bookConsultation } from '../../api/doctorAPI';
import styles from './DoctorBooking.module.css';

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
  const [searchFilter, setSearchFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [favoritesDoctors, setFavoritesDoctors] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  const toggleFavorite = (doctorId) => {
    setFavoritesDoctors(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(doctorId)) {
        newFavorites.delete(doctorId);
      } else {
        newFavorites.add(doctorId);
      }
      return newFavorites;
    });
  };

  const getConsultationModeIcon = (mode) => {
    switch (mode) {
      case 'video': return <VideoCameraIcon className="h-4 w-4" />;
      case 'phone': return <PhoneIcon className="h-4 w-4" />;
      case 'chat': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      case 'inPerson': return <UserIcon className="h-4 w-4" />;
      default: return <VideoCameraIcon className="h-4 w-4" />;
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         doctor.specializations.some(spec => spec.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchesSpecialty = !specialtyFilter || doctor.specializations.includes(specialtyFilter);
    return matchesSearch && matchesSpecialty;
  });

  const allSpecialties = [...new Set(doctors.flatMap(doctor => doctor.specializations || []))];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarSolidIcon
        key={index}
        className={`h-4 w-4 ${
          index < Math.floor(rating) 
            ? 'text-yellow-400' 
            : index < rating 
              ? 'text-yellow-300' 
              : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="text-center mb-6">
            <h1 className={`text-3xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Find Your Perfect Doctor
            </h1>
            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Connect with qualified healthcare professionals and book appointments that fit your schedule
            </p>
          </div>

          {/* Search and Filter Section */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row gap-3 items-center">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search doctors by name or specialty..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All Specialties</option>
                {allSpecialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'grid'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'list'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {bookingSuccess && (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-base font-semibold text-green-800 dark:text-green-200">
                  Consultation Booked Successfully! 🎉
                </h3>
                <p className="text-xs text-green-700 dark:text-green-300">
                  You will receive a confirmation email shortly with appointment details.
                </p>
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Available Doctors
            </h2>
            <div className={`px-3 py-1 rounded-lg text-sm ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
            </div>
          </div>
              
              {loading && doctors.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${styles.shimmer} ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Finding the Best Doctors for You...
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Please wait while we fetch qualified healthcare professionals
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                  : "space-y-3"
                }>
              {Array.isArray(filteredDoctors) && filteredDoctors.map(doctor => (
                viewMode === 'grid' ? (
                  // Grid View Card
                  <div
                    key={doctor.id}
                    className={`${styles.doctorCard} group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg border transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden ${
                      isDarkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                    } ${styles['btn-hover-shadow']}`}
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    {/* Gradient Header */}
                    <div className="h-16 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(doctor.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                      >
                        {favoritesDoctors.has(doctor.id) ? (
                          <HeartSolidIcon className="h-4 w-4 text-red-500" />
                        ) : (
                          <HeartIcon className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>

                    <div className="px-4 pb-4 -mt-8 relative">
                      {/* Profile Image */}
                      <div className="flex justify-center mb-3">
                        <div className={`w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center border-3 border-white dark:border-gray-800 shadow-md ${styles.floatingElement}`}>
                          {doctor.profileImage ? (
                            <img 
                              src={doctor.profileImage} 
                              alt={doctor.name}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <UserIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                      </div>

                      {/* Doctor Info */}
                      <div className="text-center mb-3">
                        <h3 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Dr. {doctor.name}
                        </h3>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {doctor.specialty}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {doctor.experience} • {doctor.location}
                        </p>
                      </div>

                      {/* Rating and Stats */}
                      <div className="flex items-center justify-center space-x-1 mb-3">
                        <div className="flex items-center space-x-1">
                          {renderStars(doctor.rating)}
                        </div>
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {doctor.rating}
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({doctor.totalReviews} reviews)
                        </span>
                      </div>

                      {/* Consultation Modes */}
                      <div className="flex justify-center space-x-1 mb-3">
                        {Object.entries(doctor.consultationModes || {}).filter(([_, mode]) => mode.available).slice(0, 3).map(([type, mode]) => (
                          <div
                            key={type}
                            className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                            title={`${type.charAt(0).toUpperCase() + type.slice(1)} - $${mode.fee}`}
                          >
                            <div className="h-3 w-3">
                              {getConsultationModeIcon(type)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Fee */}
                      <div className="text-center">
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ${doctor.consultationFee}
                        </span>
                        <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          /session
                        </span>
                      </div>
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                ) : (
                  // List View Card
                  <div
                    key={doctor.id}
                    className={`group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isDarkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        {/* Profile Image */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            {doctor.profileImage ? (
                              <img 
                                src={doctor.profileImage} 
                                alt={doctor.name}
                                className="w-full h-full rounded-xl object-cover"
                              />
                            ) : (
                              <UserIcon className="h-6 w-6 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Dr. {doctor.name}
                              </h3>
                              <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {doctor.specialty}
                              </p>
                              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <TimeIcon className="h-3 w-3" />
                                  <span>{doctor.experience}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  <span>{doctor.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <UserGroupIcon className="h-3 w-3" />
                                  <span>{doctor.stats?.patientsSeen || 0} patients</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(doctor.id);
                                }}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                {favoritesDoctors.has(doctor.id) ? (
                                  <HeartSolidIcon className="h-4 w-4 text-red-500" />
                                ) : (
                                  <HeartIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                              <div className="text-right">
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  ${doctor.consultationFee}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  per session
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Rating and Consultation Modes */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                {renderStars(doctor.rating)}
                                <span className={`text-xs font-medium ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {doctor.rating} ({doctor.totalReviews} reviews)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              {Object.entries(doctor.consultationModes || {}).filter(([_, mode]) => mode.available).map(([type, mode]) => (
                                <div
                                  key={type}
                                  className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                                  title={`${type.charAt(0).toUpperCase() + type.slice(1)} - $${mode.fee}`}
                                >
                                  <div className="h-3 w-3">
                                    {getConsultationModeIcon(type)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bio Preview */}
                          {doctor.bio && (
                            <p className={`text-xs mt-2 ${styles['line-clamp-2']} ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {doctor.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
                ))}
              </div>
            )}

            {/* No Doctors Found */}
            {!loading && filteredDoctors.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No Doctors Found
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Try adjusting your search criteria or filters to find more doctors.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Booking Confirmation Modal */}
        {bookingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {/* Header with Gradient */}
              <div className="h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-xl relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CalendarDaysIcon className="h-8 w-8 text-white mx-auto mb-1" />
                    <h3 className="text-lg font-bold text-white">
                      Confirm Your Appointment
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className={`text-center mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Please review your appointment details before confirming
                </p>
                
                {/* Doctor Summary Card */}
                <div className={`p-4 rounded-lg mb-6 border-2 border-dashed ${
                  isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      {selectedDoctor?.profileImage ? (
                        <img 
                          src={selectedDoctor.profileImage} 
                          alt={selectedDoctor.name}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <UserIcon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Dr. {selectedDoctor?.name}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {selectedDoctor?.specialty}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        {renderStars(selectedDoctor?.rating || 0)}
                        <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({selectedDoctor?.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className={`space-y-3 mb-6 ${
                  isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                } p-4 rounded-lg`}>
                  <h4 className={`text-base font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Appointment Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</p>
                        <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {new Date(selectedSlot?.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ClockIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time</p>
                        <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedSlot?.time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <VideoCameraIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type</p>
                        <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Video Consultation
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPinIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Location</p>
                        <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDoctor?.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Consultation Fee</span>
                      <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${selectedDoctor?.consultationFee}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Platform Fee</span>
                      <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        $5.00
                      </span>
                    </div>
                    <div className={`flex justify-between items-center text-base font-bold pt-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Total Amount</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ${(parseFloat(selectedDoctor?.consultationFee || 0) + 5).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setBookingModal(false)}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all transform hover:scale-105 text-sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Confirm & Pay ${(parseFloat(selectedDoctor?.consultationFee || 0) + 5).toFixed(2)}
                      </>
                    )}
                  </button>
                </div>

                {/* Security Note */}
                <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Your payment is secure and protected. You can cancel up to 2 hours before the appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Doctor Details Modal */}
        {doctorModal && selectedDoctor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`max-w-5xl w-full h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {/* Modal Header with Gradient - Fixed */}
              <div className="relative h-24 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 flex-shrink-0">
                <button
                  onClick={() => setDoctorModal(false)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
                
                {/* Doctor Profile Header */}
                <div className="absolute bottom-0 left-4 transform translate-y-1/2">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center border-3 border-white dark:border-gray-800 shadow-lg">
                    {selectedDoctor.profileImage ? (
                      <img 
                        src={selectedDoctor.profileImage} 
                        alt={selectedDoctor.name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <UserIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                </div>

                <div className="absolute bottom-4 left-24">
                  <h2 className="text-xl font-bold text-white mb-1">
                    Dr. {selectedDoctor.name}
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    {selectedDoctor.specialty}
                  </p>
                </div>

                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(selectedDoctor.id);
                    }}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    {favoritesDoctors.has(selectedDoctor.id) ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-400" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className={`flex-1 overflow-y-auto ${styles.scrollable}`}>
                <div className="pt-12 px-6 pb-6">
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center mb-1">
                          {renderStars(selectedDoctor.rating)}
                        </div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDoctor.rating}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({selectedDoctor.totalReviews} reviews)
                        </div>
                      </div>
                      
                      <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <TrophyIcon className={`h-6 w-6 mx-auto mb-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDoctor.experienceYears}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Years Experience
                        </div>
                      </div>
                      
                      <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <UserGroupIcon className={`h-6 w-6 mx-auto mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDoctor.stats?.patientsSeen || 0}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Patients Treated
                        </div>
                      </div>
                      
                      <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <ClockIcon className={`h-6 w-6 mx-auto mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDoctor.stats?.responseTime || 15}m
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Avg Response
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column - Doctor Details */}
                      <div className="lg:col-span-2 space-y-4">
                        {/* About Section */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className={`text-base font-bold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <UserIcon className="h-4 w-4 mr-2 text-emerald-500" />
                            About Dr. {selectedDoctor.name}
                          </h3>
                          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {selectedDoctor.bio || 'Experienced healthcare professional dedicated to providing quality medical care.'}
                          </p>
                          
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <h4 className={`font-semibold mb-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Current Position
                              </h4>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {selectedDoctor.currentPosition || 'Senior Doctor'}
                              </p>
                            </div>
                            <div>
                              <h4 className={`font-semibold mb-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Location
                              </h4>
                              <p className={`text-xs flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {selectedDoctor.location}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Specializations */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className={`text-base font-bold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <ShieldCheckIcon className="h-4 w-4 mr-2 text-blue-500" />
                            Specializations
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {(selectedDoctor.specializations || []).map((specialty, index) => (
                              <span
                                key={index}
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isDarkMode 
                                    ? 'bg-blue-900/30 text-blue-300 border border-blue-800' 
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Consultation Modes */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className={`text-base font-bold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <VideoCameraIcon className="h-4 w-4 mr-2 text-emerald-500" />
                            Available Consultation Types
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(selectedDoctor.consultationModes || {}).filter(([_, mode]) => mode.available).map(([type, mode]) => (
                              <div
                                key={type}
                                className={`p-3 rounded-lg border ${
                                  isDarkMode 
                                    ? 'bg-gray-600/30 border-gray-600' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <div className="h-3 w-3">
                                      {getConsultationModeIcon(type)}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className={`font-semibold capitalize text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {type === 'inPerson' ? 'In-Person' : type}
                                    </h4>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      ${mode.fee} • {mode.duration || 30} min
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Booking */}
                      <div className="lg:col-span-1">
                        <div className={`sticky top-0 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className={`text-base font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Book Appointment
                          </h3>
                          
                          <div className="text-center mb-4">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                              ${selectedDoctor.consultationFee}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              per consultation
                            </div>
                          </div>
                          
                          {loading ? (
                            <div className="text-center py-6">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading available slots...</p>
                            </div>
                          ) : availableSlots.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                              {Object.entries(groupSlotsByDate(availableSlots)).map(([date, slots]) => (
                                <div key={date}>
                                  <h5 className={`font-semibold mb-2 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                        className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                          slot.available
                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transform hover:scale-105'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500'
                                        }`}
                                      >
                                        <div className="flex flex-col items-center">
                                          <ClockIcon className="h-3 w-3 mb-1" />
                                          {slot.time}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs font-medium mb-1">No Available Slots</p>
                              <p className="text-xs">Please check back later or contact the doctor directly</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Enhanced Features Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Why Choose Our Platform?
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Experience the future of healthcare with our comprehensive digital health platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className={`group text-center p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
              isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-emerald-600' : 'bg-white border-gray-200 hover:border-emerald-400'
            }`}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <VideoCameraIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                HD Video Consultations
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Crystal clear video calls with experienced doctors from the comfort of your home
              </p>
            </div>

            <div className={`group text-center p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
              isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-blue-600' : 'bg-white border-gray-200 hover:border-blue-400'
            }`}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                24/7 Availability
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Book appointments that fit your schedule, with flexible timing options
              </p>
            </div>

            <div className={`group text-center p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
              isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400'
            }`}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Secure & Private
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                End-to-end encryption ensures your health data remains completely confidential
              </p>
            </div>

            <div className={`group text-center p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
              isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-green-600' : 'bg-white border-gray-200 hover:border-green-400'
            }`}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <CheckCircleIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Instant Confirmation
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Get immediate booking confirmation with automated reminders and notifications
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`mt-16 p-8 rounded-2xl ${
            isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  500+
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Verified Doctors
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  10K+
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Happy Patients
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  24/7
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Support Available
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  98%
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Satisfaction Rate
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default DoctorBooking;

