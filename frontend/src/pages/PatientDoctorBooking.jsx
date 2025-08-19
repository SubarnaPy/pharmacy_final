import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

const PatientDoctorBooking = () => {
  // State management
  const { user } = useSelector(state => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    specialization: 'all',
    consultationType: 'video',
    minRating: 0,
    maxFee: '',
    sortBy: 'rating'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Specializations list
  const specializations = [
    'All Specializations',
    'General Medicine',
    'Cardiology', 
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'Dermatology',
    'Psychiatry',
    'Ophthalmology',
    'ENT',
    'Radiology',
    'Pathology',
    'Anesthesiology',
    'Emergency Medicine',
    'Internal Medicine',
    'Surgery',
    'Oncology',
    'Endocrinology',
    'Gastroenterology',
    'Nephrology',
    'Pulmonology',
    'Rheumatology'
  ];

  // Consultation type icons
  const consultationIcons = {
    video: VideoCameraIcon,
    phone: PhoneIcon,
    chat: ChatBubbleLeftRightIcon,
    email: EnvelopeIcon,
    inPerson: MapPinIcon
  };

  // Consultation type labels
  const consultationLabels = {
    video: 'Video Call',
    phone: 'Phone Call',
    chat: 'Chat',
    email: 'Email',
    inPerson: 'In-Person'
  };

  // Load available doctors
  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Current user:', user); // Debug user state
      
      const params = new URLSearchParams();
      if (filters.specialization !== 'all') params.append('specialization', filters.specialization);
      params.append('consultationType', filters.consultationType);
      if (filters.minRating > 0) params.append('minRating', filters.minRating);
      if (filters.maxFee) params.append('maxFee', filters.maxFee);
      params.append('sortBy', filters.sortBy);

      const response = await api.get(`/doctors/available?${params.toString()}`);
      
      console.log('API Response:', response);
      
      // Handle different response structures
      let doctorsList = [];
      if (response.data?.doctors) {
        doctorsList = response.data.doctors;
      } else if (response.data?.data?.doctors) {
        doctorsList = response.data.data.doctors;
      } else if (response.doctors) {
        doctorsList = response.doctors;
      } else if (Array.isArray(response.data)) {
        doctorsList = response.data;
      } else if (Array.isArray(response)) {
        doctorsList = response;
      } else {
        console.warn('Unexpected response structure:', response);
        doctorsList = [];
      }
      
      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        doctorsList = doctorsList.filter(doctor =>
          doctor.name?.toLowerCase().includes(searchTerm) ||
          doctor.specializations?.some(spec => spec.toLowerCase().includes(searchTerm)) ||
          doctor.workplace?.toLowerCase().includes(searchTerm)
        );
      }
      
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Failed to load available doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load doctor available slots
  const loadDoctorSlots = useCallback(async (doctorId) => {
    setSlotsLoading(true);
    try {
      const response = await api.get(`/doctors/${doctorId}/available-slots?days=14`);
      console.log('Slots API Response:', response);
      
      // Handle different response structures
      let slots = [];
      if (response.data?.slots) {
        slots = response.data.slots;
      } else if (response.data?.data?.slots) {
        slots = response.data.data.slots;
      } else if (response.slots) {
        slots = response.slots;
      } else if (Array.isArray(response.data)) {
        slots = response.data;
      } else if (Array.isArray(response)) {
        slots = response;
      } else {
        console.warn('Unexpected slots response structure:', response);
        slots = [];
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading doctor slots:', error);
      toast.error('Failed to load available time slots');
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // Handle doctor selection
  const handleDoctorSelect = useCallback(async (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    
    // Auto-select the first available consultation mode if current selection is not available
    if (doctor.consultationModes && doctor.consultationModes.length > 0) {
      const currentTypeAvailable = doctor.consultationModes.some(mode => mode.type === filters.consultationType);
      if (!currentTypeAvailable) {
        // Set to the first available consultation mode
        const firstAvailable = doctor.consultationModes[0].type;
        setFilters(prev => ({ ...prev, consultationType: firstAvailable }));
        // Load slots with the new consultation type
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure state is updated
        await loadDoctorSlots(doctor.id);
        return;
      }
    }
    
    await loadDoctorSlots(doctor.id);
  }, [loadDoctorSlots, filters.consultationType]);

  // Handle slot selection
  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  }, []);

  // Handle booking confirmation
  const handleBookingConfirm = async () => {
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Please select a doctor and time slot');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast.error('Please log in to book appointments');
      return;
    }

    // Check if user has patient role
    if (user.role !== 'patient') {
      toast.error('Only patients can book appointments');
      return;
    }

    // Check if selected consultation type is available for this doctor
    const selectedMode = selectedDoctor.consultationModes?.find(mode => mode.type === filters.consultationType);
    if (!selectedMode) {
      toast.error(`${consultationLabels[filters.consultationType]} is not available with this doctor`);
      return;
    }

    setBookingLoading(true);
    try {
      const bookingData = {
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        consultationType: filters.consultationType,
        notes: bookingNotes
      };

      console.log('Booking data:', bookingData);
      console.log('User:', user);

      const response = await api.post(`/doctors/${selectedDoctor.id}/book`, bookingData);
      
      setBookingSuccess(response.data.data);
      setShowBookingModal(false);
      setSelectedSlot(null);
      setBookingNotes('');
      
      // Reload slots to reflect booking
      await loadDoctorSlots(selectedDoctor.id);
      
      toast.success('Consultation booked successfully!');
      
    } catch (error) {
      console.error('Error booking consultation:', error);
      const message = error.response?.data?.message || 'Failed to book consultation';
      toast.error(message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // If consultation type changes and we have a selected doctor, reload slots
    if (key === 'consultationType' && selectedDoctor) {
      loadDoctorSlots(selectedDoctor.id);
    }
  }, [selectedDoctor, loadDoctorSlots]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
  }, [filters]);

  // Load doctors when filters change
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Format consultation modes for display
  const formatConsultationModes = (modes) => {
    return modes.map(mode => {
      const Icon = consultationIcons[mode.type];
      return (
        <div key={mode.type} className="flex items-center space-x-1">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{mode.type}</span>
          <span className="text-sm text-gray-500">₹{mode.fee}</span>
        </div>
      );
    });
  };

  // Render doctor card
  const DoctorCard = ({ doctor }) => (
    <motion.div
      layoutId={`doctor-${doctor.id}`}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {doctor.profilePicture ? (
              <img
                src={doctor.profilePicture}
                alt={doctor.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-emerald-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {doctor.name}
              </h3>
              <div className="flex items-center space-x-1">
                <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-700">
                  {doctor.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  ({doctor.totalReviews})
                </span>
              </div>
            </div>

            <p className="text-sm text-emerald-600 font-medium mt-1">
              {doctor.primarySpecialty}
            </p>

            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <BriefcaseIcon className="h-4 w-4" />
                <span>{doctor.experience} years exp</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPinIcon className="h-4 w-4" />
                <span className="truncate">{doctor.workplace}</span>
              </div>
            </div>

            {doctor.qualifications && doctor.qualifications.length > 0 && (
              <div className="flex items-center space-x-1 mt-2">
                <AcademicCapIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {doctor.qualifications.map(q => q.degree).join(', ')}
                </span>
              </div>
            )}

            <div className="mt-3">
              <p className="text-sm text-gray-600 line-clamp-2">
                {doctor.bio || 'Experienced healthcare professional providing quality medical care.'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Consultation fees:</span>
                </div>
                <div className="mt-1 space-y-1">
                  {doctor.consultationModes?.slice(0, 3).map(mode => {
                    const Icon = consultationIcons[mode.type];
                    return (
                      <div key={mode.type} className="flex items-center space-x-2 text-sm">
                        <Icon className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">{consultationLabels[mode.type]}:</span>
                        <span className="font-semibold text-green-600">₹{mode.fee}</span>
                      </div>
                    );
                  })}
                  {doctor.consultationModes?.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{doctor.consultationModes.length - 3} more options
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDoctorSelect(doctor)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Book Now
              </button>
            </div>

            <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Available via:</span>
              {doctor.consultationModes?.slice(0, 3).map(mode => {
                const Icon = consultationIcons[mode.type];
                return (
                  <Icon key={mode.type} className="h-4 w-4 text-gray-400" />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Book Doctor Consultation
                </h1>
                <p className="text-sm text-gray-600">
                  Find and book appointments with verified doctors
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors, specializations, hospitals..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-white p-4 rounded-lg border border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    <select
                      value={filters.specialization}
                      onChange={(e) => handleFilterChange('specialization', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {specializations.map(spec => (
                        <option key={spec} value={spec === 'All Specializations' ? 'all' : spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultation Type
                    </label>
                    <select
                      value={filters.consultationType}
                      onChange={(e) => handleFilterChange('consultationType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                      <option value="chat">Chat</option>
                      <option value="email">Email</option>
                      <option value="inPerson">In-Person</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Rating
                    </label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange('minRating', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="0">Any Rating</option>
                      <option value="3">3+ Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="4.5">4.5+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Fee (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="Any amount"
                      value={filters.maxFee}
                      onChange={(e) => handleFilterChange('maxFee', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="rating">Highest Rated</option>
                      <option value="experience">Most Experienced</option>
                      <option value="fee_low">Lowest Fee</option>
                      <option value="fee_high">Highest Fee</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctors List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded mb-2 w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded mb-4 w-1/2"></div>
                          <div className="h-8 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No doctors found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or filters to find available doctors.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map(doctor => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            )}
          </div>

          {/* Doctor Details & Slot Selection */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {selectedDoctor ? (
                <div className="bg-white rounded-xl shadow-lg">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Book with {selectedDoctor.name}
                    </h3>
                    <p className="text-emerald-600">{selectedDoctor.primarySpecialty}</p>
                    
                    {/* Available Consultation Modes */}
                    {selectedDoctor.consultationModes && selectedDoctor.consultationModes.length > 0 ? (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Consultation Mode
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedDoctor.consultationModes.map(mode => {
                            const Icon = consultationIcons[mode.type];
                            const isSelected = filters.consultationType === mode.type;
                            return (
                              <button
                                key={mode.type}
                                onClick={() => handleFilterChange('consultationType', mode.type)}
                                className={`p-3 border rounded-lg text-left transition-all ${
                                  isSelected 
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <Icon className={`h-5 w-5 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    <div>
                                      <div className="font-medium text-sm">
                                        {consultationLabels[mode.type]}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {mode.duration ? `${mode.duration} min` : 'Flexible timing'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    ₹{mode.fee}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Show warning if selected consultation type is not available */}
                        {!selectedDoctor.consultationModes.some(mode => mode.type === filters.consultationType) && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="text-yellow-600 text-sm">
                                ⚠️ {consultationLabels[filters.consultationType]} is not available with this doctor. Please select an available consultation mode.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-sm text-gray-600">
                          No consultation modes available for this doctor.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {slotsLoading ? (
                      <div className="animate-pulse">
                        <div className="space-y-3">
                          {[...Array(5)].map((_, index) => (
                            <div key={index} className="h-10 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          No available slots found for this doctor.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Available Time Slots</h4>
                        {availableSlots.map(dateSlots => (
                          <div key={dateSlots.date}>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              {dateSlots.formattedDate}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {dateSlots.slots.map(slot => (
                                <button
                                  key={slot.id}
                                  onClick={() => handleSlotSelect(slot)}
                                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                                >
                                  {slot.startTime}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Doctor
                  </h3>
                  <p className="text-gray-600">
                    Choose a doctor from the list to view available appointment slots.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && selectedSlot && selectedDoctor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Booking
                </h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Appointment Details</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
                    <p><strong>Date:</strong> {new Date(selectedSlot.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {selectedSlot.startTime} - {selectedSlot.endTime}</p>
                    <div className="flex items-center space-x-2">
                      <strong>Type:</strong>
                      <div className="flex items-center space-x-1">
                        {React.createElement(consultationIcons[filters.consultationType], { 
                          className: "h-4 w-4 text-emerald-600" 
                        })}
                        <span>{consultationLabels[filters.consultationType]}</span>
                      </div>
                    </div>
                    <p><strong>Fee:</strong> ₹{selectedDoctor.consultationModes?.find(m => m.type === filters.consultationType)?.fee || 0}</p>
                    {selectedDoctor.consultationModes?.find(m => m.type === filters.consultationType)?.duration && (
                      <p><strong>Duration:</strong> {selectedDoctor.consultationModes.find(m => m.type === filters.consultationType).duration} minutes</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describe your symptoms or any specific concerns..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookingConfirm}
                    disabled={bookingLoading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Booking...' : `Confirm Booking`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {bookingSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-md w-full p-6 text-center"
            >
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Booking Confirmed!
              </h3>
              <p className="text-gray-600 mb-6">
                Your consultation with {bookingSuccess.bookingDetails?.doctorName} has been booked successfully.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Appointment Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Date:</strong> {bookingSuccess.bookingDetails?.date}</p>
                  <p><strong>Time:</strong> {bookingSuccess.bookingDetails?.time}</p>
                  <p><strong>Type:</strong> {bookingSuccess.bookingDetails?.consultationType}</p>
                  <p><strong>Fee:</strong> ₹{bookingSuccess.bookingDetails?.fee}</p>
                </div>
              </div>

              <button
                onClick={() => setBookingSuccess(null)}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientDoctorBooking;
