import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/apiClient';
import {
  UserIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  PhoneIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  AcademicCapIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const DoctorFinder = () => {
  const { user } = useSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('medium');
  const [location, setLocation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxFee: '',
    experience: '',
    rating: '',
    availability: '',
    gender: ''
  });

  // Medical specialties
  const specialties = [
    { value: 'cardiology', label: 'Cardiology', icon: '❤️', description: 'Heart and cardiovascular conditions' },
    { value: 'dermatology', label: 'Dermatology', icon: '🔬', description: 'Skin, hair, and nail conditions' },
    { value: 'gastroenterology', label: 'Gastroenterology', icon: '🫀', description: 'Digestive system disorders' },
    { value: 'neurology', label: 'Neurology', icon: '🧠', description: 'Brain and nervous system' },
    { value: 'orthopedics', label: 'Orthopedics', icon: '🦴', description: 'Bone, joint, and muscle conditions' },
    { value: 'pediatrics', label: 'Pediatrics', icon: '👶', description: 'Children\'s health and development' },
    { value: 'psychiatry', label: 'Psychiatry', icon: '🧘', description: 'Mental health and behavioral disorders' },
    { value: 'gynecology', label: 'Gynecology', icon: '👩', description: 'Women\'s reproductive health' },
    { value: 'ophthalmology', label: 'Ophthalmology', icon: '👁️', description: 'Eye and vision disorders' },
    { value: 'ent', label: 'ENT', icon: '👂', description: 'Ear, nose, and throat conditions' },
    { value: 'general medicine', label: 'General Medicine', icon: '🩺', description: 'General health and primary care' },
    { value: 'emergency medicine', label: 'Emergency Medicine', icon: '🚨', description: 'Emergency and urgent care' }
  ];

  // Common conditions
  const commonConditions = [
    'Diabetes', 'Hypertension', 'Asthma', 'Arthritis', 'Migraine', 'Depression',
    'Anxiety', 'Back Pain', 'Skin Problems', 'Heart Disease', 'Allergies', 'GERD'
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Routine Care', description: 'Regular check-up or non-urgent consultation', color: 'green' },
    { value: 'medium', label: 'Moderate Urgency', description: 'Concerning symptoms that need attention', color: 'yellow' },
    { value: 'high', label: 'High Priority', description: 'Symptoms requiring prompt medical care', color: 'orange' },
    { value: 'urgent', label: 'Urgent Care', description: 'Serious symptoms needing immediate attention', color: 'red' }
  ];

  useEffect(() => {
    // Set user's location if available
    if (user?.profile?.address?.city) {
      setLocation(user.profile.address.city);
    }
  }, [user]);

  const searchDoctors = async () => {
    if (!searchQuery.trim() && !selectedSpecialty) {
      alert('Please enter a condition or select a specialty');
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.post('/chatbot/doctor-recommendations', {
        condition: searchQuery,
        specialty: selectedSpecialty,
        location: location,
        urgency: urgencyLevel
      });

      if (response.data.success) {
        setRecommendations(response.data.recommendations || []);
        setAvailableDoctors(response.data.available_doctors || []);
      }
    } catch (error) {
      console.error('Error searching doctors:', error);
      alert('Failed to search doctors. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const bookAppointment = (doctorId) => {
    // This would integrate with your appointment booking system
    window.location.href = `/book-appointment/${doctorId}`;
  };

  const contactDoctor = (doctorId) => {
    // This would open a chat or contact form
    console.log('Contact doctor:', doctorId);
  };

  const addConditionFromQuick = (condition) => {
    setSearchQuery(condition);
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      urgent: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[urgency] || colors.medium;
  };

  const filteredDoctors = availableDoctors.filter(doctor => {
    let passes = true;
    
    if (filters.maxFee && doctor.fee > parseInt(filters.maxFee)) passes = false;
    if (filters.experience && doctor.experience < parseInt(filters.experience)) passes = false;
    if (filters.rating && doctor.rating < parseFloat(filters.rating)) passes = false;
    if (filters.gender && doctor.gender !== filters.gender) passes = false;
    
    return passes;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find the Right Doctor</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Get AI-powered doctor recommendations based on your symptoms, condition, or specialty needs.
          Find verified doctors in your area with real-time availability.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Tell us what you need</h2>

        {/* Quick Conditions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Common Conditions (click to select)
          </label>
          <div className="flex flex-wrap gap-2">
            {commonConditions.map((condition) => (
              <button
                key={condition}
                onClick={() => addConditionFromQuick(condition)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-purple-100 hover:text-purple-700 transition-colors"
              >
                {condition}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your condition or symptoms
              </label>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows="3"
                placeholder="Example: I have recurring headaches and dizziness, or I need a cardiologist for heart check-up"
              />
            </div>

            {/* Specialty Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or select a specialty
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose a specialty...</option>
                {specialties.map((specialty) => (
                  <option key={specialty.value} value={specialty.value}>
                    {specialty.icon} {specialty.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your location
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your city"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Urgency Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How urgent is your need?
              </label>
              <div className="space-y-2">
                {urgencyLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setUrgencyLevel(level.value)}
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      urgencyLevel === level.value
                        ? getUrgencyColor(level.value)
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div className="text-xs text-gray-600">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Toggle */}
            <div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={filters.maxFee}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxFee: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="2000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Experience (years)
                    </label>
                    <input
                      type="number"
                      value={filters.experience}
                      onChange={(e) => setFilters(prev => ({ ...prev, experience: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Rating
                    </label>
                    <select
                      value={filters.rating}
                      onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Any</option>
                      <option value="4.0">4.0+</option>
                      <option value="4.5">4.5+</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={filters.gender}
                      onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-6">
          <button
            onClick={searchDoctors}
            disabled={(!searchQuery.trim() && !selectedSpecialty) || isSearching}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Finding Doctors...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                Find Doctors
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <AcademicCapIcon className="w-6 h-6 mr-2 text-blue-600" />
            AI Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900">{rec.specialty}</h4>
                    <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                    <p className="text-sm text-blue-600 mt-2">
                      <strong>Why recommended:</strong> {rec.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-900">
                      Match Score: {rec.match_score || 'High'}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getUrgencyColor(rec.urgency_level)}`}>
                      {rec.urgency_level} priority
                    </div>
                  </div>
                </div>
                
                {rec.relevant_keywords && rec.relevant_keywords.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-blue-600 mb-1">Relevant symptoms:</div>
                    <div className="flex flex-wrap gap-1">
                      {rec.relevant_keywords.map((keyword, kidx) => (
                        <span key={kidx} className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Doctors */}
      {filteredDoctors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserIcon className="w-6 h-6 mr-2 text-green-600" />
              Available Doctors ({filteredDoctors.length})
            </h3>
            {showFilters && (
              <button
                onClick={() => setFilters({ maxFee: '', experience: '', rating: '', availability: '', gender: '' })}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-lg transition-all">
                {/* Doctor Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{doctor.name}</h4>
                    <p className="text-purple-600 font-medium">{doctor.specialty}</p>
                    {doctor.allSpecializations && doctor.allSpecializations.length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        +{doctor.allSpecializations.length - 1} more specializations
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="font-medium">{doctor.rating || 'N/A'}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {doctor.totalReviews || 0} reviews
                    </div>
                  </div>
                </div>

                {/* Experience & Fee */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{doctor.experience}+ years</div>
                    <div className="text-xs text-gray-500">Experience</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">₹{doctor.fee}</div>
                    <div className="text-xs text-gray-500">Consultation Fee</div>
                  </div>
                </div>

                {/* Recommendation Reason */}
                {doctor.recommendationReason && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-xs font-medium text-green-800 mb-1">Why recommended:</div>
                    <div className="text-xs text-green-700">{doctor.recommendationReason}</div>
                  </div>
                )}

                {/* Availability */}
                <div className="mb-4 flex items-center">
                  <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Next available: {doctor.nextAvailable ? 
                      new Date(doctor.nextAvailable).toLocaleDateString() : 
                      'Call to check'
                    }
                  </span>
                </div>

                {/* Location */}
                <div className="mb-4 flex items-center">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{doctor.location || location}</span>
                </div>

                {/* Match Score */}
                {doctor.matchScore && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Match Score</span>
                      <span className="font-medium text-purple-600">{doctor.matchScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full" 
                        style={{ width: `${doctor.matchScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => bookAppointment(doctor.id)}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Book Appointment
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => contactDoctor(doctor.id)}
                      className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                    >
                      <PhoneIcon className="w-4 h-4 mr-1" />
                      Contact
                    </button>
                    
                    <button
                      className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                    >
                      <InformationCircleIcon className="w-4 h-4 mr-1" />
                      Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {availableDoctors.length !== filteredDoctors.length && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Showing {filteredDoctors.length} of {availableDoctors.length} doctors based on your filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {(searchQuery || selectedSpecialty) && !isSearching && availableDoctors.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No doctors found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any doctors matching your criteria. Try adjusting your search or location.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSpecialty('');
              setFilters({ maxFee: '', experience: '', rating: '', availability: '', gender: '' });
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Emergency Notice */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <strong>Emergency Notice:</strong> If you're experiencing a medical emergency, don't search for doctors online. 
            Call emergency services (108) or go to the nearest emergency room immediately.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorFinder;
