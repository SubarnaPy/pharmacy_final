import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  XMarkIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  BoltIcon,
  GlobeAltIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BeakerIcon,
  ChartBarIcon,
  ArrowPathIcon,
  EyeIcon,
  MicrophoneIcon,
  BuildingOffice2Icon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  MapIcon,
  GlobeAsiaAustraliaIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const DoctorFinder = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
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
    gender: '',
    languages: '',
    consultationType: '',
    insurance: ''
  });
  
  // Enhanced search results state
  const [searchResults, setSearchResults] = useState({
    databaseDoctors: [],
    internetDoctors: [],
    searchType: null, // 'database', 'internet', 'hybrid'
    searchQuery: '',
    totalResults: 0
  });
  
  // Map integration state
  const [mapIntegration, setMapIntegration] = useState({
    enabled: true,
    selectedClinic: null,
    clinicLocations: [],
    mapInstance: null,
    userLocation: null
  });
  
  // Chat window state for results
  const [chatResults, setChatResults] = useState({
    visible: false,
    messages: [],
    isTyping: false,
    currentContext: null
  });
  
  // Doctor details modal
  const [doctorModal, setDoctorModal] = useState({
    visible: false,
    doctor: null,
    source: null, // 'database' or 'internet'
    bookingAvailable: false
  });
  
  // Advanced features state
  const [aiMatching, setAiMatching] = useState({ enabled: true, confidence: 0, criteria: [] });
  const [realTimeAvailability, setRealTimeAvailability] = useState({ enabled: true, lastUpdate: null });
  const [virtualConsultation, setVirtualConsultation] = useState({ available: [], selected: null });
  const [smartRecommendations, setSmartRecommendations] = useState({ personalized: [], trending: [] });
  const [matchingAnalytics, setMatchingAnalytics] = useState({ factors: [], score: 0 });
  const [voiceSearch, setVoiceSearch] = useState({ enabled: false, listening: false });
  const recognitionRef = useRef(null);

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

  // Enhanced urgency levels with AI assessment
  const urgencyLevels = [
    { 
      value: 'low', 
      label: 'Routine Care', 
      description: 'Regular check-up or non-urgent consultation', 
      color: 'green',
      aiPriority: 1,
      waitTimeExpected: '1-2 weeks',
      virtualConsultationRecommended: true
    },
    { 
      value: 'medium', 
      label: 'Moderate Urgency', 
      description: 'Concerning symptoms that need attention', 
      color: 'yellow',
      aiPriority: 2,
      waitTimeExpected: '3-7 days',
      virtualConsultationRecommended: true
    },
    { 
      value: 'high', 
      label: 'High Priority', 
      description: 'Symptoms requiring prompt medical care', 
      color: 'orange',
      aiPriority: 3,
      waitTimeExpected: '1-3 days',
      virtualConsultationRecommended: false
    },
    { 
      value: 'urgent', 
      label: 'Urgent Care', 
      description: 'Serious symptoms needing immediate attention', 
      color: 'red',
      aiPriority: 4,
      waitTimeExpected: 'Same day',
      virtualConsultationRecommended: false
    },
    { 
      value: 'emergency', 
      label: 'Emergency', 
      description: 'Life-threatening symptoms requiring emergency care', 
      color: 'red',
      aiPriority: 5,
      waitTimeExpected: 'Immediate',
      virtualConsultationRecommended: false
    }
  ];

  useEffect(() => {
    // Set user's location if available
    if (user?.profile?.address?.city) {
      setLocation(user.profile.address.city);
    }
    
    // Initialize advanced features
    initializeAdvancedFeatures();
    
    // Set up voice search if available
    initializeVoiceSearch();
  }, [user]);
  
  // Initialize advanced AI features
  const initializeAdvancedFeatures = async () => {
    try {
      // Initialize AI matching system
      setAiMatching(prev => ({
        ...prev,
        enabled: true,
        criteria: ['symptoms', 'location', 'urgency', 'preferences']
      }));
      
      // Load personalized recommendations
      const personalizedRecs = await loadPersonalizedRecommendations();
      setSmartRecommendations(prev => ({
        ...prev,
        personalized: personalizedRecs
      }));
      
      // Initialize real-time availability tracking
      setRealTimeAvailability(prev => ({
        ...prev,
        enabled: true,
        lastUpdate: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Failed to initialize advanced features:', error);
    }
  };
  
  // Initialize voice search capability
  const initializeVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setVoiceSearch(prev => ({ ...prev, listening: false }));
        
        // Auto-trigger search after voice input
        setTimeout(() => {
          searchDoctorsWithAI(transcript);
        }, 500);
      };

      recognitionRef.current.onerror = () => {
        setVoiceSearch(prev => ({ ...prev, listening: false }));
      };

      recognitionRef.current.onend = () => {
        setVoiceSearch(prev => ({ ...prev, listening: false }));
      };
      
      setVoiceSearch(prev => ({ ...prev, enabled: true }));
    }
  };
  
  // Load personalized recommendations
  const loadPersonalizedRecommendations = async () => {
    try {
      // Simulate personalized recommendations based on user profile
      const userAge = user?.profile?.age;
      const userGender = user?.profile?.gender;
      const userHistory = user?.medicalHistory || [];
      
      const recommendations = [];
      
      if (userAge > 50) {
        recommendations.push({ specialty: 'cardiology', reason: 'Preventive cardiac screening recommended', priority: 'medium' });
      }
      
      if (userGender === 'female' && userAge > 25) {
        recommendations.push({ specialty: 'gynecology', reason: 'Regular reproductive health check-up', priority: 'low' });
      }
      
      if (userHistory.includes('diabetes') || userHistory.includes('hypertension')) {
        recommendations.push({ specialty: 'endocrinology', reason: 'Chronic condition management', priority: 'high' });
      }
      
      return recommendations;
    } catch (error) {
      return [];
    }
  };
  
  // Start voice search
  const startVoiceSearch = () => {
    if (recognitionRef.current && voiceSearch.enabled) {
      setVoiceSearch(prev => ({ ...prev, listening: true }));
      recognitionRef.current.start();
    }
  };
  
  // Stop voice search
  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceSearch(prev => ({ ...prev, listening: false }));
    }
  };

  const searchDoctorsWithAI = async (query = searchQuery) => {
    if (!query.trim() && !selectedSpecialty) {
      alert('Please enter a condition or select a specialty');
      return;
    }

    setIsSearching(true);
    setChatResults(prev => ({ ...prev, visible: true, isTyping: true }));
    
    try {
      // Enhanced search with AI matching and hybrid search
      const searchPayload = {
        condition: query,
        specialty: selectedSpecialty,
        location: location,
        urgency: urgencyLevel,
        searchType: 'hybrid', // Search both database and internet
        aiMatching: {
          enabled: aiMatching.enabled,
          userProfile: {
            age: user?.profile?.age,
            gender: user?.profile?.gender,
            medicalHistory: user?.medicalHistory || [],
            preferences: user?.preferences || {},
            location: user?.profile?.address?.city || location
          },
          filters: filters,
          consultationType: filters.consultationType || 'any'
        },
        internetSearch: {
          enabled: true,
          includeClinicLocations: true,
          radiusKm: 50,
          preferredLanguages: ['English'],
          includeOnlineConsultation: true
        }
      };
      
      console.log('🔍 AI-Enhanced Hybrid Doctor Search:', searchPayload);
      
      // Show typing indicator in chat
      setChatResults(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: Date.now(),
          type: 'system',
          content: 'AI is searching doctors in database and internet...',
          timestamp: new Date().toISOString()
        }]
      }));
      
      const response = await apiClient.post('/chatbot/doctor-recommendations', searchPayload);

      if (response.data.success) {
        const {
          recommendations = [],
          available_doctors = [],
          internet_doctors = [],
          search_analytics = {},
          clinic_locations = []
        } = response.data;
        
        // Process results
        const databaseDoctors = available_doctors.map(doctor => ({
          ...doctor,
          source: 'database',
          bookingAvailable: true,
          aiRecommended: doctor.aiMatchingScore >= 70
        }));
        
        const internetDoctors = internet_doctors.map(doctor => ({
          ...doctor,
          source: 'internet',
          bookingAvailable: false,
          aiRecommended: false,
          clinicLocation: doctor.clinic_address,
          onlineProfile: doctor.profile_url,
          verificationStatus: doctor.verification || 'unverified'
        }));
        
        // Update search results
        setSearchResults({
          databaseDoctors,
          internetDoctors,
          searchType: 'hybrid',
          searchQuery: query,
          totalResults: databaseDoctors.length + internetDoctors.length
        });
        
        // Update legacy state for compatibility
        setRecommendations(recommendations);
        setAvailableDoctors([...databaseDoctors, ...internetDoctors]);
        
        // Update map integration with clinic locations
        if (clinic_locations.length > 0) {
          setMapIntegration(prev => ({
            ...prev,
            clinicLocations: clinic_locations,
            selectedClinic: null
          }));
        }
        
        // Create enhanced chat response
        await createEnhancedChatResponse({
          databaseDoctors,
          internetDoctors,
          query,
          analytics: search_analytics,
          clinicLocations: clinic_locations
        });
        
        // Update AI matching analytics
        setMatchingAnalytics({
          factors: search_analytics.matchingFactors || ['specialty', 'location', 'availability'],
          score: search_analytics.matchingScore || 85,
          totalResults: databaseDoctors.length + internetDoctors.length,
          aiRecommended: databaseDoctors.filter(d => d.aiRecommended).length,
          internetResults: internetDoctors.length,
          databaseResults: databaseDoctors.length
        });
        
        // Update real-time availability
        setRealTimeAvailability(prev => ({
          ...prev,
          lastUpdate: new Date().toISOString()
        }));
        
      }
    } catch (error) {
      console.error('Error in AI-enhanced doctor search:', error);
      
      // Show error in chat
      setChatResults(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: Date.now(),
          type: 'error',
          content: 'Sorry, I encountered an error while searching for doctors. Please try again.',
          timestamp: new Date().toISOString()
        }],
        isTyping: false
      }));
      
      alert('Failed to search doctors. Please try again.');
    } finally {
      setIsSearching(false);
      setChatResults(prev => ({ ...prev, isTyping: false }));
    }
  };
  
  // Create enhanced chat response with doctor cards
  const createEnhancedChatResponse = async ({ databaseDoctors, internetDoctors, query, analytics, clinicLocations }) => {
    const messages = [];
    
    // Summary message
    const totalResults = databaseDoctors.length + internetDoctors.length;
    let summaryContent = `Found ${totalResults} doctors for "${query}".`;
    
    if (databaseDoctors.length > 0) {
      summaryContent += ` ${databaseDoctors.length} available for booking in our network.`;
    }
    
    if (internetDoctors.length > 0) {
      summaryContent += ` ${internetDoctors.length} additional specialists found online.`;
    }
    
    messages.push({
      id: Date.now(),
      type: 'summary',
      content: summaryContent,
      timestamp: new Date().toISOString()
    });
    
    // Database doctors (bookable)
    if (databaseDoctors.length > 0) {
      messages.push({
        id: Date.now() + 1,
        type: 'doctors_section',
        title: '📋 Available for Booking',
        doctors: databaseDoctors.slice(0, 5),
        source: 'database',
        canBook: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Internet doctors (external)
    if (internetDoctors.length > 0) {
      messages.push({
        id: Date.now() + 2,
        type: 'doctors_section',
        title: '🌐 Found Online',
        doctors: internetDoctors.slice(0, 5),
        source: 'internet',
        canBook: false,
        hasLocations: clinicLocations.length > 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Add map section if clinic locations available
    if (clinicLocations.length > 0) {
      messages.push({
        id: Date.now() + 3,
        type: 'map_section',
        title: '📍 Clinic Locations',
        locations: clinicLocations,
        timestamp: new Date().toISOString()
      });
    }
    
    // AI insights
    if (analytics.insights) {
      messages.push({
        id: Date.now() + 4,
        type: 'ai_insights',
        title: '🤖 AI Recommendations',
        insights: analytics.insights,
        timestamp: new Date().toISOString()
      });
    }
    
    setChatResults(prev => ({
      ...prev,
      messages: [...prev.messages, ...messages],
      currentContext: { query, totalResults, analytics }
    }));
  };
  
  // Handle booking navigation
  const handleBookDoctor = (doctor) => {
    if (doctor.source === 'database' && doctor.bookingAvailable) {
      // Navigate to booking page with doctor pre-selected
      navigate('/patient/doctor-booking', {
        state: {
          selectedDoctor: doctor,
          fromAISearch: true,
          searchContext: {
            query: searchResults.searchQuery,
            aiRecommended: doctor.aiRecommended
          }
        }
      });
    } else {
      alert('This doctor is not available for direct booking. Please contact them through their provided information.');
    }
  };
  
  // Show doctor details modal
  const showDoctorDetails = (doctor) => {
    setDoctorModal({
      visible: true,
      doctor,
      source: doctor.source,
      bookingAvailable: doctor.bookingAvailable
    });
  };
  
  // Open clinic location on map
  const openClinicOnMap = (clinic) => {
    setMapIntegration(prev => ({
      ...prev,
      selectedClinic: clinic
    }));
    
    // Create map URL for external opening
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`;
    window.open(mapUrl, '_blank');
  };
  
  // Get doctor verification badge
  const getDoctorVerificationBadge = (doctor) => {
    if (doctor.source === 'database') {
      return {
        icon: <ShieldCheckIcon className="w-4 h-4" />,
        text: 'Verified',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else {
      return {
        icon: <GlobeAltIcon className="w-4 h-4" />,
        text: 'Online Profile',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }
  };
  
  // Process AI matching results
  const processAIMatchingResults = async (doctors, recommendations) => {
    return doctors.map(doctor => {
      // Calculate AI matching score
      let aiScore = 0;
      let aiFactors = [];
      
      // Location matching
      if (doctor.location && location && doctor.location.toLowerCase().includes(location.toLowerCase())) {
        aiScore += 20;
        aiFactors.push('location_match');
      }
      
      // Specialty relevance
      const relevantRecommendation = recommendations.find(rec => 
        rec.specialty?.toLowerCase() === doctor.specialty?.toLowerCase()
      );
      if (relevantRecommendation) {
        aiScore += 30;
        aiFactors.push('specialty_relevance');
      }
      
      // Rating and experience bonus
      if (doctor.rating >= 4.5) {
        aiScore += 15;
        aiFactors.push('high_rating');
      }
      
      if (doctor.experience >= 10) {
        aiScore += 10;
        aiFactors.push('experienced');
      }
      
      // Virtual consultation capability
      const selectedSpecialtyData = specialties.find(s => s.value === selectedSpecialty);
      if (selectedSpecialtyData?.virtualConsultationAvailable && doctor.virtualConsultationAvailable) {
        aiScore += 15;
        aiFactors.push('virtual_consultation');
      }
      
      // Emergency availability for urgent cases
      if (urgencyLevel === 'urgent' || urgencyLevel === 'emergency') {
        if (doctor.emergencyAvailable) {
          aiScore += 25;
          aiFactors.push('emergency_available');
        }
      }
      
      return {
        ...doctor,
        aiMatchingScore: Math.min(100, aiScore),
        aiMatchingFactors: aiFactors,
        aiRecommended: aiScore >= 70,
        virtualConsultationAvailable: selectedSpecialtyData?.virtualConsultationAvailable && doctor.virtualConsultationAvailable,
        realTimeAvailable: Math.random() > 0.3, // Simulate real-time availability
        nextAvailableSlot: doctor.nextAvailable || generateNextAvailableSlot(urgencyLevel),
        consultationTypes: [
          'in-person',
          ...(doctor.virtualConsultationAvailable ? ['video-call', 'phone-call'] : [])
        ]
      };
    }).sort((a, b) => {
      // Sort by AI matching score, then by rating
      if (b.aiMatchingScore !== a.aiMatchingScore) {
        return b.aiMatchingScore - a.aiMatchingScore;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  };
  
  // Generate next available slot based on urgency
  const generateNextAvailableSlot = (urgency) => {
    const now = new Date();
    let nextSlot = new Date(now);
    
    switch (urgency) {
      case 'emergency':
        nextSlot.setHours(now.getHours() + 1);
        break;
      case 'urgent':
        nextSlot.setDate(now.getDate() + 1);
        break;
      case 'high':
        nextSlot.setDate(now.getDate() + 3);
        break;
      case 'medium':
        nextSlot.setDate(now.getDate() + 7);
        break;
      default:
        nextSlot.setDate(now.getDate() + 14);
    }
    
    return nextSlot.toISOString();
  };

  const bookAppointment = (doctorId, consultationType = 'in-person') => {
    // Enhanced appointment booking with consultation type
    const bookingUrl = `/book-appointment/${doctorId}?type=${consultationType}&ai_matched=true`;
    window.location.href = bookingUrl;
  };
  
  const bookVirtualConsultation = (doctorId, type = 'video-call') => {
    // Book virtual consultation
    const virtualBookingUrl = `/virtual-consultation/${doctorId}?type=${type}&priority=${urgencyLevel}`;
    window.location.href = virtualBookingUrl;
  };
  
  const startInstantConsultation = (doctorId) => {
    // Start immediate virtual consultation if available
    if (confirm('Start instant virtual consultation now? This will connect you immediately with the doctor.')) {
      window.open(`/instant-consultation/${doctorId}?session=${Date.now()}`, '_blank');
    }
  };

  const contactDoctor = (doctorId, method = 'chat') => {
    // Enhanced contact options
    switch (method) {
      case 'chat':
        window.open(`/doctor-chat/${doctorId}`, '_blank');
        break;
      case 'video':
        bookVirtualConsultation(doctorId, 'video-call');
        break;
      case 'phone':
        bookVirtualConsultation(doctorId, 'phone-call');
        break;
      default:
        console.log('Contact doctor:', doctorId);
    }
  };
  
  const viewDoctorProfile = (doctorId) => {
    // Open detailed doctor profile
    window.open(`/doctor-profile/${doctorId}?from=ai_search`, '_blank');
  };
  
  const checkRealTimeAvailability = async (doctorId) => {
    try {
      const response = await apiClient.get(`/doctors/${doctorId}/availability/realtime`);
      return response.data;
    } catch (error) {
      console.error('Failed to check real-time availability:', error);
      return { available: false, nextSlot: null };
    }
  };

  const addConditionFromQuick = (condition) => {
    setSearchQuery(condition);
    // Auto-trigger AI search when condition is selected
    setTimeout(() => {
      searchDoctorsWithAI(condition);
    }, 100);
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
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
          <UserIcon className="w-8 h-8 text-purple-600" />
          {aiMatching.enabled && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-2">
          <span>Find the Right Doctor</span>
          <SparklesIcon className="w-6 h-6 text-purple-600" />
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto mb-4">
          Get AI-powered doctor recommendations with smart matching, real-time availability, 
          and virtual consultation options. Find verified doctors based on your symptoms, 
          condition, or specialty needs.
        </p>
        
        {/* Advanced Features Status */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              aiMatching.enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-gray-600">AI Matching</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              realTimeAvailability.enabled ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-gray-600">Real-time Availability</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <VideoCameraIcon className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Virtual Consultations</span>
          </div>
          
          {voiceSearch.enabled && (
            <div className="flex items-center space-x-2 text-sm">
              <MicrophoneIcon className={`w-4 h-4 ${
                voiceSearch.listening ? 'text-red-500 animate-pulse' : 'text-purple-600'
              }`} />
              <span className="text-gray-600">Voice Search</span>
            </div>
          )}
        </div>
        
        {/* AI Matching Analytics Display */}
        {matchingAnalytics.score > 0 && (
          <div className="mt-4 inline-flex items-center space-x-4 bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2 rounded-full border border-purple-200">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                AI Match Score: {matchingAnalytics.score}%
              </span>
            </div>
            <div className="text-sm text-purple-600">
              {matchingAnalytics.totalResults} doctors found
            </div>
            {matchingAnalytics.aiRecommended > 0 && (
              <div className="text-sm text-purple-600">
                • {matchingAnalytics.aiRecommended} AI recommended
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Search Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <span>Tell us what you need</span>
            {aiMatching.enabled && (
              <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                AI Enhanced
              </div>
            )}
          </h2>
          
          {/* Voice Search Toggle */}
          {voiceSearch.enabled && (
            <button
              onClick={voiceSearch.listening ? stopVoiceSearch : startVoiceSearch}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                voiceSearch.listening 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <MicrophoneIcon className={`w-4 h-4 ${
                voiceSearch.listening ? 'animate-pulse' : ''
              }`} />
              <span className="text-sm font-medium">
                {voiceSearch.listening ? 'Listening...' : 'Voice Search'}
              </span>
            </button>
          )}
        </div>

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
            onClick={() => searchDoctorsWithAI()}
            disabled={(!searchQuery.trim() && !selectedSpecialty) || isSearching}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <span>AI Searching Database + Internet...</span>
                <CpuChipIcon className="w-5 h-5 animate-pulse" />
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span>Database + Internet Search</span>
                <GlobeAltIcon className="w-4 h-4" />
                <SparklesIcon className="w-5 h-5" />
              </>
            )}
          </button>
          
          {/* Quick Search Tips */}
          <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <BoltIcon className="w-3 h-3" />
              <span>Database + Web search</span>
            </div>
            <div className="flex items-center space-x-1">
              <ShieldCheckIcon className="w-3 h-3" />
              <span>Instant booking</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapIcon className="w-3 h-3" />
              <span>Clinic locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Chat Results Interface */}
      {chatResults.visible && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2" />
                AI Search Results
              </h3>
              <button
                onClick={() => setChatResults(prev => ({ ...prev, visible: false }))}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {chatResults.currentContext && (
              <p className="text-purple-100 text-sm mt-2">
                Search: "{chatResults.currentContext.query}" • {chatResults.currentContext.totalResults} results found
              </p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4 space-y-4">
              {chatResults.messages.map((message) => (
                <div key={message.id} className="animate-fade-in">
                  {message.type === 'summary' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Search Summary</span>
                      </div>
                      <p className="text-blue-800 mt-2">{message.content}</p>
                    </div>
                  )}
                  
                  {message.type === 'doctors_section' && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          {message.source === 'database' ? (
                            <>
                              <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-600" />
                              {message.title}
                            </>
                          ) : (
                            <>
                              <GlobeAltIcon className="w-5 h-5 mr-2 text-blue-600" />
                              {message.title}
                            </>
                          )}
                        </h4>
                        <span className="text-sm text-gray-500">{message.doctors.length} doctors</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {message.doctors.map((doctor, idx) => (
                          <DoctorCard
                            key={idx}
                            doctor={doctor}
                            onBook={handleBookDoctor}
                            onShowDetails={showDoctorDetails}
                            onOpenMap={openClinicOnMap}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'map_section' && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 flex items-center mb-4">
                        <MapIcon className="w-5 h-5 mr-2 text-red-600" />
                        {message.title}
                      </h4>
                      <ClinicMapView locations={message.locations} onSelectClinic={setMapIntegration} />
                    </div>
                  )}
                  
                  {message.type === 'ai_insights' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 flex items-center mb-3">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {message.title}
                      </h4>
                      <div className="space-y-2">
                        {message.insights.map((insight, idx) => (
                          <div key={idx} className="text-sm text-purple-800">
                            • {insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <XMarkIcon className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Error</span>
                      </div>
                      <p className="text-red-800 mt-2">{message.content}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {chatResults.isTyping && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">AI is processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      
      {/* Doctor Details Modal */}
      {doctorModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Doctor Details</h3>
                <button
                  onClick={() => setDoctorModal({ visible: false, doctor: null, source: null, bookingAvailable: false })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              {doctorModal.doctor && (
                <div className="space-y-6">
                  {/* Doctor Header */}
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900">{doctorModal.doctor.name}</h4>
                      <p className="text-purple-600 font-medium">{doctorModal.doctor.specialty}</p>
                      
                      {/* Source Badge */}
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm border mt-2 ${
                        doctorModal.source === 'database' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {doctorModal.source === 'database' ? (
                          <ShieldCheckIcon className="w-4 h-4" />
                        ) : (
                          <GlobeAltIcon className="w-4 h-4" />
                        )}
                        <span>{doctorModal.source === 'database' ? 'Verified in Database' : 'Found Online'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Doctor Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">Basic Information</h5>
                      
                      {doctorModal.doctor.experience && (
                        <div className="flex items-center space-x-2">
                          <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">{doctorModal.doctor.experience}+ years experience</span>
                        </div>
                      )}
                      
                      {doctorModal.doctor.rating && (
                        <div className="flex items-center space-x-2">
                          <StarIcon className="w-5 h-5 text-yellow-400" />
                          <span className="text-sm text-gray-600">{doctorModal.doctor.rating} ({doctorModal.doctor.totalReviews || 0} reviews)</span>
                        </div>
                      )}
                      
                      {doctorModal.doctor.fee && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Consultation Fee: ₹{doctorModal.doctor.fee}</span>
                        </div>
                      )}
                      
                      {doctorModal.doctor.location && (
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">{doctorModal.doctor.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Contact & Online Info */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">Contact Information</h5>
                      
                      {doctorModal.doctor.phone && (
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">{doctorModal.doctor.phone}</span>
                        </div>
                      )}
                      
                      {doctorModal.doctor.onlineProfile && (
                        <div className="flex items-center space-x-2">
                          <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400" />
                          <a
                            href={doctorModal.doctor.onlineProfile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View Online Profile
                          </a>
                        </div>
                      )}
                      
                      {doctorModal.doctor.verificationStatus && (
                        <div className="flex items-center space-x-2">
                          <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Status: {doctorModal.doctor.verificationStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Clinic Location for Internet Doctors */}
                  {doctorModal.doctor.clinicLocation && (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900">Clinic Location</h5>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{doctorModal.doctor.clinicLocation}</p>
                          </div>
                          <button
                            onClick={() => openClinicOnMap({ address: doctorModal.doctor.clinicLocation })}
                            className="ml-2 flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <MapIcon className="w-4 h-4" />
                            <span>View on Map</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Recommendation Reason */}
                  {doctorModal.doctor.aiRecommended && doctorModal.doctor.recommendationReason && (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900 flex items-center">
                        <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                        AI Recommendation
                      </h5>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-800">{doctorModal.doctor.recommendationReason}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-4 border-t border-gray-200">
                    {doctorModal.bookingAvailable ? (
                      <button
                        onClick={() => {
                          handleBookDoctor(doctorModal.doctor);
                          setDoctorModal({ visible: false, doctor: null, source: null, bookingAvailable: false });
                        }}
                        className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                      >
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        Book Appointment
                      </button>
                    ) : (
                      <div className="flex-1 bg-gray-100 text-gray-500 py-3 px-4 rounded-lg flex items-center justify-center">
                        <span>Contact doctor directly for appointment</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setDoctorModal({ visible: false, doctor: null, source: null, bookingAvailable: false })}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Doctor Card Component for Chat Results
const DoctorCard = ({ doctor, onBook, onShowDetails, onOpenMap }) => {
  const badge = doctor.source === 'database' ? {
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    text: 'Verified',
    className: 'bg-green-100 text-green-800 border-green-200'
  } : {
    icon: <GlobeAltIcon className="w-4 h-4" />,
    text: 'Online Profile',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all">
      {/* Doctor Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900">{doctor.name}</h5>
          <p className="text-purple-600 text-sm font-medium">{doctor.specialty}</p>
          
          {/* Source Badge */}
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border mt-2 ${badge.className}`}>
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        </div>
        
        <div className="text-right">
          {doctor.rating && (
            <div className="flex items-center">
              <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="text-sm font-medium">{doctor.rating}</span>
            </div>
          )}
          {doctor.experience && (
            <div className="text-xs text-gray-500 mt-1">{doctor.experience}+ years</div>
          )}
        </div>
      </div>
      
      {/* Doctor Details */}
      <div className="space-y-2 mb-4">
        {doctor.fee && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Fee:</span> ₹{doctor.fee}
          </div>
        )}
        
        {doctor.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>{doctor.location}</span>
          </div>
        )}
        
        {doctor.clinicLocation && (
          <div className="flex items-center text-sm text-blue-600 cursor-pointer hover:text-blue-800"
               onClick={() => onOpenMap && onOpenMap(doctor)}>
            <MapIcon className="w-4 h-4 mr-1" />
            <span className="underline">View clinic location</span>
          </div>
        )}
        
        {doctor.aiRecommended && (
          <div className="flex items-center text-sm text-purple-600">
            <SparklesIcon className="w-4 h-4 mr-1" />
            <span>AI Recommended</span>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-2">
        {doctor.source === 'database' && doctor.bookingAvailable ? (
          <button
            onClick={() => onBook(doctor)}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Book Appointment
          </button>
        ) : (
          <button
            onClick={() => onShowDetails(doctor)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            View Details
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onShowDetails(doctor)}
            className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
          >
            <InformationCircleIcon className="w-4 h-4 mr-1" />
            Profile
          </button>
          
          {doctor.onlineProfile && (
            <button
              onClick={() => window.open(doctor.onlineProfile, '_blank')}
              className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
              Online
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Clinic Map View Component
const ClinicMapView = ({ locations, onSelectClinic }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    if (onSelectClinic) {
      onSelectClinic(prev => ({
        ...prev,
        selectedClinic: location
      }));
    }
  };
  
  const openInGoogleMaps = (location) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
    window.open(mapUrl, '_blank');
  };
  
  return (
    <div className="space-y-4">
      {/* Location List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((location, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedLocation?.id === location.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => handleLocationClick(location)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h6 className="font-semibold text-gray-900">{location.clinicName}</h6>
                <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                
                {location.phone && (
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <PhoneIcon className="w-4 h-4 mr-1" />
                    <span>{location.phone}</span>
                  </div>
                )}
                
                {location.distance && (
                  <div className="text-xs text-purple-600 mt-1">
                    {location.distance} away
                  </div>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openInGoogleMaps(location);
                }}
                className="ml-2 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="Open in Google Maps"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
            </div>
            
            {location.hours && (
              <div className="mt-3 text-xs text-gray-500">
                <ClockIcon className="w-3 h-3 inline mr-1" />
                {location.hours}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Map Placeholder */}
      {selectedLocation && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h6 className="font-semibold text-gray-900">Map View</h6>
            <button
              onClick={() => openInGoogleMaps(selectedLocation)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
              Open in Google Maps
            </button>
          </div>
          
          {/* Map Placeholder - In a real app, you'd integrate Google Maps or similar */}
          <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Map integration for</p>
              <p className="text-sm font-medium">{selectedLocation.clinicName}</p>
              <p className="text-xs mt-1">{selectedLocation.address}</p>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <button
              onClick={() => openInGoogleMaps(selectedLocation)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Get Directions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorFinder;
