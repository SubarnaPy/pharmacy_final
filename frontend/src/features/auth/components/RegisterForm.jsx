import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearRegistrationSuccess } from '../authSlice';
import { Link } from 'react-router-dom';
import AddressMapSelector from '../../../components/Map/AddressMapSelector';
import { getCurrentLocation } from '../../../utils/locationUtils';
import { 
  UserIcon, 
  BuildingStorefrontIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  BanknotesIcon,
  CogIcon,
  HeartIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../../app/DarkModeContext';

// Component definitions outside the main component to prevent re-creation on each render
const PhoneInputField = ({ 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false 
}) => {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize phone number parsing only once
  useEffect(() => {
    if (!isInitialized) {
      if (value && value.includes(' ')) {
        const [code, number] = value.split(' ', 2);
        setCountryCode(code);
        setPhoneNumber(number || '');
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    onChange({ target: { value: `${newCode} ${phoneNumber}`.trim() } });
  };

  const handlePhoneNumberChange = (e) => {
    const newNumber = e.target.value.replace(/[^\d\-\s\(\)]/g, '');
    setPhoneNumber(newNumber);
    onChange({ target: { value: `${countryCode} ${newNumber}`.trim() } });
  };

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
        <PhoneIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
      </div>
      <div className="flex">
        <select
          value={countryCode}
          onChange={handleCountryCodeChange}
          className={`
            pl-12 pr-2 py-4 w-24
            border-2 border-r-0 rounded-l-2xl transition-all duration-300
            focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
            focus:border-blue-500 dark:focus:border-blue-400
            hover:border-gray-300 dark:hover:border-gray-600 
            bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
            border-gray-200 dark:border-gray-700
            ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
            text-gray-900 dark:text-gray-100 text-sm
            shadow-sm hover:shadow-md focus:shadow-lg
            dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
          `}
        >
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
          <option value="+33">🇫🇷 +33</option>
          <option value="+49">🇩🇪 +49</option>
          <option value="+81">🇯🇵 +81</option>
          <option value="+86">🇨🇳 +86</option>
          <option value="+91">🇮🇳 +91</option>
          <option value="+61">🇦🇺 +61</option>
          <option value="+7">🇷🇺 +7</option>
          <option value="+55">🇧🇷 +55</option>
        </select>
        <input
          type="tel"
          placeholder={placeholder}
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          required={required}
          className={`
            flex-1 pl-4 pr-4 py-4 
            border-2 border-l-0 rounded-r-2xl transition-all duration-300
            focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
            focus:border-blue-500 dark:focus:border-blue-400
            hover:border-gray-300 dark:hover:border-gray-600 
            bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
            border-gray-200 dark:border-gray-700
            ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
            placeholder:text-gray-400 dark:placeholder:text-gray-500 
            text-gray-900 dark:text-gray-100
            shadow-sm hover:shadow-md focus:shadow-lg
            dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
          `}
        />
      </div>
      {error && (
        <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
          <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

const InputField = ({ 
  icon: Icon, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword
}) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
      <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
    </div>
    <input
      type={showPasswordToggle ? (showPassword ? "text" : "password") : type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={`
        w-full pl-12 pr-${showPasswordToggle ? '12' : '4'} py-4 
        border-2 rounded-2xl transition-all duration-300
        focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
        focus:border-blue-500 dark:focus:border-blue-400
        hover:border-gray-300 dark:hover:border-gray-600 
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
        border-gray-200 dark:border-gray-700
        ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
        placeholder:text-gray-400 dark:placeholder:text-gray-500 
        text-gray-900 dark:text-gray-100
        shadow-sm hover:shadow-md focus:shadow-lg
        dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
      `}
    />
    {showPasswordToggle && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-r-2xl transition-colors z-10"
      >
        {showPassword ? (
          <EyeSlashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
        ) : (
          <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
        )}
      </button>
    )}
    {error && (
      <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
        <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
);

const SelectField = ({ icon: Icon, value, onChange, options, placeholder, error }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
      <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
    </div>
    <select
      value={value}
      onChange={onChange}
      className={`
        w-full pl-12 pr-4 py-4 appearance-none
        border-2 rounded-2xl transition-all duration-300
        focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
        focus:border-blue-500 dark:focus:border-blue-400
        hover:border-gray-300 dark:hover:border-gray-600 
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
        border-gray-200 dark:border-gray-700
        ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
        text-gray-900 dark:text-gray-100
        shadow-sm hover:shadow-md focus:shadow-lg
        dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
      `}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && (
      <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
        <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
);

const CheckboxGroup = ({ title, options, selected, onChange }) => (
  <div className="space-y-3">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</label>
    <div className="grid grid-cols-2 gap-3">
      {options.map(option => (
        <label key={option} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-200 group">
          <input
            type="checkbox"
            value={option}
            checked={selected.includes(option)}
            onChange={(e) => {
              const val = e.target.value;
              onChange(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
            }}
            className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{option}</span>
        </label>
      ))}
    </div>
  </div>
);

const FileUploadArea = ({ licenseDocs, setLicenseDocs, dragActive, handleDrag, handleDrop }) => (
  <div 
    className={`
      relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300
      ${dragActive ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
      ${licenseDocs.length > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600' : ''}
      backdrop-blur-sm
    `}
    onDragEnter={handleDrag}
    onDragLeave={handleDrag}
    onDragOver={handleDrag}
    onDrop={handleDrop}
  >
    <input
      type="file"
      multiple
      onChange={e => setLicenseDocs(Array.from(e.target.files))}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
    />
    <div className="text-center">
      <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drop your license documents here, or <span className="text-blue-600 dark:text-blue-400 font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          PDF, DOC, JPG, PNG up to 10MB each
        </p>
      </div>
      {licenseDocs.length > 0 && (
        <div className="mt-4 space-y-2">
          {licenseDocs.map((file, index) => (
            <div key={index} className="flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex justify-center mb-8">
    <div className="flex items-center space-x-4">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
              ${currentStep >= step.number 
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg transform scale-110' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }
            `}>
              {currentStep > step.number ? (
                <CheckCircleIcon className="h-6 w-6" />
              ) : (
                step.number
              )}
            </div>
            <div className="mt-2 text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`
              h-1 w-16 rounded transition-all duration-300
              ${currentStep > step.number ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

function RegisterForm() {
  const dispatch = useDispatch();
  const authStatus = useSelector(state => state.auth.status);
  const error = useSelector(state => state.auth.error);
  const registrationSuccess = useSelector(state => state.auth.registrationSuccess);
  const registrationMessage = useSelector(state => state.auth.registrationMessage);
  const { isDarkMode, toggleDarkMode } = useContext(DarkModeContext);
  
  // Basic form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Pharmacy registration fields - Enhanced
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDocs, setLicenseDocs] = useState([]);
  const [pharmacistName, setPharmacistName] = useState('');
  const [pharmacyType, setPharmacyType] = useState('retail');
  const [pharmacyDescription, setPharmacyDescription] = useState('');
  
  // Doctor registration fields
  const [medicalLicense, setMedicalLicense] = useState({
    number: '',
    issuingState: '',
    expiryDate: '',
    document: null
  });
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availability, setAvailability] = useState({
    monday: { available: true, startTime: '09:00', endTime: '17:00' },
    tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
    wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
    thursday: { available: true, startTime: '09:00', endTime: '17:00' },
    friday: { available: true, startTime: '09:00', endTime: '17:00' },
    saturday: { available: false, startTime: '09:00', endTime: '17:00' },
    sunday: { available: false, startTime: '09:00', endTime: '17:00' }
  });
  const [consultationTypes, setConsultationTypes] = useState({
    inPerson: true,
    video: true,
    phone: false
  });
  const [doctorBio, setDoctorBio] = useState('');
  const [education, setEducation] = useState([]);
  const [certifications, setCertifications] = useState([]);
  
  // Address fields
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [website, setWebsite] = useState('');
  
  // Services and capabilities
  const [services, setServices] = useState({
    consultations: false,
    homeDelivery: false,
    emergencyService: false,
    onlineOrdering: false,
    compounding: false,
    vaccinations: false,
    medicationSynchronization: false,
    healthScreenings: false
  });
  
  // Working hours - comprehensive
  const [workingHours, setWorkingHours] = useState({
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: true }
  });
  
  // Business settings
  const [deliveryRadius, setDeliveryRadius] = useState(15);
  const [acceptsInsurance, setAcceptsInsurance] = useState(true);
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [inventorySync, setInventorySync] = useState(false);
  const [bankDetails, setBankDetails] = useState('');
  
  // Legacy compatibility fields for existing components
  const [availableServices, setAvailableServices] = useState([]);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [location, setLocation] = useState(''); // Legacy location field
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isFormValid, setIsFormValid] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Location-related state
  const [coordinates, setCoordinates] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Password strength calculation
  useEffect(() => {
    const calculatePasswordStrength = (pwd) => {
      let strength = 0;
      if (pwd.length >= 8) strength += 1;
      if (/[a-z]/.test(pwd)) strength += 1;
      if (/[A-Z]/.test(pwd)) strength += 1;
      if (/[0-9]/.test(pwd)) strength += 1;
      if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
      return strength;
    };
    
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  // Form validation
  useEffect(() => {
    const errors = {};
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (password && password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    
    if (confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (phone && !/^[\+]?[1-9][\d\s\-\(\)]{8,15}$/.test(phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number with country code';
    }
    
    setFormErrors(errors);
    
    // Simplified form validation - only check basic required fields
    const isValid = email && password && confirmPassword && firstName && lastName && phone &&
                   Object.keys(errors).length === 0 && 
                   password === confirmPassword;
    
    setIsFormValid(isValid);
  }, [email, password, confirmPassword, firstName, lastName, phone]);

  // Clear registration success when component unmounts
  useEffect(() => {
    return () => {
      if (registrationSuccess) {
        dispatch(clearRegistrationSuccess());
      }
    };
  }, [dispatch, registrationSuccess]);

  // Location handling functions
  const handleLocationSelect = (locationData) => {
    setCoordinates({
      latitude: locationData.latitude,
      longitude: locationData.longitude
    });
    
    if (locationData.address) {
      setAddress({
        street: locationData.address.street || address.street,
        city: locationData.address.city || address.city,
        state: locationData.address.state || address.state,
        zipCode: locationData.address.zipCode || address.zipCode,
        country: locationData.address.country || address.country || 'United States'
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setCoordinates({
        latitude: location.latitude,
        longitude: location.longitude
      });
      setUseCurrentLocation(true);
    } catch (error) {
      console.error('Error getting current location:', error);
      let errorMessage = 'Unable to get your current location.';
      if (error.code === 1) {
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please check your internet connection or try again later.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      alert(errorMessage);
    } finally {
      setLoadingLocation(false);
    }
  };

  const steps = role === 'patient' 
    ? [
        { number: 1, title: 'Account Info', description: 'Basic account details' },
        { number: 2, title: 'Personal Info', description: 'Your personal information' }
      ]
    : role === 'doctor'
    ? [
        { number: 1, title: 'Account Info', description: 'Basic account details' },
        { number: 2, title: 'Personal Info', description: 'Your personal information' },
        { number: 3, title: 'Medical License', description: 'Professional credentials' },
        { number: 4, title: 'Specialization', description: 'Medical expertise and experience' },
        { number: 5, title: 'Practice Details', description: 'Clinic and consultation information' },
        { number: 6, title: 'Availability', description: 'Schedule and consultation types' }
      ]
    : [
        { number: 1, title: 'Account Info', description: 'Basic account details' },
        { number: 2, title: 'Personal Info', description: 'Your personal information' },
        { number: 3, title: 'Pharmacy Details', description: 'Basic pharmacy information' },
        { number: 4, title: 'Location & Contact', description: 'Address and contact details' },
        { number: 5, title: 'Services & Hours', description: 'Services and operating hours' },
        { number: 6, title: 'Documents & Setup', description: 'License documents and final setup' }
      ];

  const maxSteps = steps.length;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setLicenseDocs(Array.from(e.dataTransfer.files));
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-blue-500';
      case 5: return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'Very Weak';
      case 2: return 'Weak';
      case 3: return 'Fair';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return '';
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!email || !password || !confirmPassword || password !== confirmPassword) {
        return;
      }
    } else if (currentStep === 2) {
      if (!firstName || !lastName || !phone) {
        return;
      }
    } else if (currentStep === 3 && role === 'pharmacy') {
      if (!pharmacyName || !licenseNumber || !pharmacistName) {
        return;
      }
    } else if (currentStep === 3 && role === 'doctor') {
      if (!medicalLicense.number || !medicalLicense.issuingState) {
        return;
      }
    } else if (currentStep === 4 && role === 'pharmacy') {
      console.log('Validating Location & Contact step:', {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode
      });
      if (!address.street || !address.city || !address.state || !address.zipCode) {
        return;
      }
    } else if (currentStep === 4 && role === 'doctor') {
      if (!specialization || !yearsOfExperience) {
        return;
      }
    } else if (currentStep === 5 && role === 'pharmacy') {
      // Optional validation for Services & Hours step
      // No required fields for this step, user can proceed
    } else if (currentStep === 5 && role === 'doctor') {
      if (!clinicName || !consultationFee) {
        return;
      }
    } else if (currentStep === 6 && role === 'doctor') {
      // Check if at least one day has availability set
      const hasAvailability = Object.values(availability).some(day => 
        day.available && day.startTime && day.endTime
      );
      if (!hasAvailability) {
        alert('Please set availability for at least one day.');
        return;
      }
    }
    
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Final validation check before submission
    if (role === 'pharmacy') {
      const requiredPharmacyFields = [
        email, password, confirmPassword, firstName, lastName, phone,
        pharmacyName, licenseNumber, pharmacistName,
        address.street, address.city, address.state, address.zipCode, address.country
      ];
      
      if (!requiredPharmacyFields.every(field => field && field.trim() !== '')) {
        alert('Please fill in all required fields before submitting.');
        return;
      }
    } else if (role === 'doctor') {
      const requiredDoctorFields = [
        email, password, confirmPassword, firstName, lastName, phone,
        medicalLicense.number, medicalLicense.issuingState, specialization,
        yearsOfExperience, clinicName, consultationFee
      ];
      
      if (!requiredDoctorFields.every(field => field && field.toString().trim() !== '')) {
        alert('Please fill in all required fields before submitting.');
        return;
      }

      // Check if at least one day has availability set
      const hasAvailability = Object.values(availability).some(day => 
        day.available && day.startTime && day.endTime
      );
      if (!hasAvailability) {
        alert('Please set availability for at least one day.');
        return;
      }
    } else {
      const requiredPatientFields = [email, password, confirmPassword, firstName, lastName, phone];
      if (!requiredPatientFields.every(field => field && field.trim() !== '')) {
        alert('Please fill in all required fields before submitting.');
        return;
      }
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    
    const payload = { 
      email, 
      password, 
      role, 
      profile: { 
        firstName, 
        lastName, 
        phone 
      } 
    };

    if (role === 'patient') {
      payload.profile.dateOfBirth = dateOfBirth;
      // Add patient location if available
      if (coordinates) {
        payload.profile.address = {
          ...address,
          coordinates: [coordinates.longitude, coordinates.latitude] // MongoDB format: [lng, lat]
        };
      } else if (address.street || address.city) {
        payload.profile.address = address;
      }
    } else if (role === 'doctor') {
      payload.doctorInfo = {
        // Medical License Information
        medicalLicense: {
          number: medicalLicense.number,
          issuingState: medicalLicense.issuingState,
          expiryDate: medicalLicense.expiryDate,
          document: medicalLicense.document
        },
        
        // Professional Information
        specialization,
        yearsOfExperience: parseInt(yearsOfExperience),
        
        // Practice Details
        clinicName,
        clinicAddress: address,
        consultationFee: parseFloat(consultationFee),
        consultationTypes,
        bio: doctorBio,
        
        // Availability Schedule
        availability,
        
        // Location data if available
        ...(coordinates && {
          coordinates: [coordinates.longitude, coordinates.latitude]
        })
      };
    } else if (role === 'pharmacy') {
      payload.pharmacyInfo = {
        // Basic Info
        pharmacyName,
        licenseNumber,
        pharmacistName,
        pharmacyType,
        pharmacyDescription,
        
        // Location & Contact
        address: {
          ...address,
          coordinates: coordinates ? [coordinates.longitude, coordinates.latitude] : undefined
        },
        website,
        
        // Services & Operations
        services,
        workingHours,
        
        // Business Settings
        deliveryRadius,
        acceptsInsurance,
        insuranceProviders,
        specializations,
        inventorySync,
        bankDetails,
        
        // Legacy fields for compatibility
        location: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`,
        availableServices: Object.keys(services).filter(key => services[key]),
        openingTime: workingHours.monday?.open || '09:00',
        closingTime: workingHours.monday?.close || '18:00'
      };
      payload.licenseDocs = licenseDocs;
    }
    
    dispatch(register(payload));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Account Information</h3>
              <p className="text-gray-600 dark:text-gray-400">Create your account to get started</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500">
                  <input
                    type="radio"
                    name="role"
                    value="patient"
                    checked={role === 'patient'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  />
                  <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Patient</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">I need medical services</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-500">
                  <input
                    type="radio"
                    name="role"
                    value="doctor"
                    checked={role === 'doctor'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                  />
                  <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Doctor</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">I'm a medical professional</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-500">
                  <input
                    type="radio"
                    name="role"
                    value="pharmacy"
                    checked={role === 'pharmacy'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <BuildingStorefrontIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Pharmacy</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">I provide pharmaceutical services</div>
                  </div>
                </label>
              </div>

              <InputField
                icon={EnvelopeIcon}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={formErrors.email}
                required
              />

              <InputField
                icon={IdentificationIcon}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={formErrors.password}
                required
                showPasswordToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Password strength:</span>
                    <span className={`font-medium ${passwordStrength >= 4 ? 'text-green-600 dark:text-green-400' : passwordStrength >= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded ${
                          level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-200 dark:bg-gray-700'
                        } transition-all duration-200`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <InputField
                icon={IdentificationIcon}
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={formErrors.confirmPassword}
                required
                showPasswordToggle
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personal Information</h3>
              <p className="text-gray-600 dark:text-gray-400">Tell us about yourself</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField
                icon={UserIcon}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              
              <InputField
                icon={UserIcon}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <PhoneInputField
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={formErrors.phone}
              required
            />

            {role === 'patient' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-lg dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40"
                  />
                </div>

                {/* Location Selection for Patients */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Your Location (Optional)
                    </h4>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={loadingLocation}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {loadingLocation ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <MapPinIcon className="h-4 w-4" />
                      )}
                      <span>Use Current Location</span>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Adding your location helps us find nearby pharmacies and calculate delivery distances.
                  </p>
                  
                  <AddressMapSelector
                    onLocationSelect={handleLocationSelect}
                    initialPosition={coordinates ? [coordinates.latitude, coordinates.longitude] : null}
                    key={coordinates ? `${coordinates.latitude}-${coordinates.longitude}` : 'default'} // Force re-render on coordinates change
                    address={`${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.replace(/^,+|,+$/g, '').replace(/,+/g, ', ')}
                    height="300px"
                  />
                  
                  {/* Basic Address Fields for Patients */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      icon={MapPinIcon}
                      placeholder="City (Optional)"
                      value={address.city}
                      onChange={(e) => setAddress(prev => ({...prev, city: e.target.value}))}
                    />
                    
                    <InputField
                      icon={MapPinIcon}
                      placeholder="State (Optional)"
                      value={address.state}
                      onChange={(e) => setAddress(prev => ({...prev, state: e.target.value}))}
                    />
                  </div>
                  
                  {coordinates && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        📍 Location Set
                      </h5>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        We'll use this location to find pharmacies near you and estimate delivery times.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 3:
        if (role === 'doctor') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Medical License</h3>
                <p className="text-gray-600 dark:text-gray-400">Your professional credentials</p>
              </div>
              
              <InputField
                icon={ShieldCheckIcon}
                placeholder="Medical license number"
                value={medicalLicense.number}
                onChange={(e) => setMedicalLicense(prev => ({...prev, number: e.target.value}))}
                required
              />

              <SelectField
                icon={MapPinIcon}
                value={medicalLicense.issuingState}
                onChange={(e) => setMedicalLicense(prev => ({...prev, issuingState: e.target.value}))}
                placeholder="Issuing State"
                options={[
                  { value: 'AL', label: 'Alabama' },
                  { value: 'AK', label: 'Alaska' },
                  { value: 'AZ', label: 'Arizona' },
                  { value: 'AR', label: 'Arkansas' },
                  { value: 'CA', label: 'California' },
                  { value: 'CO', label: 'Colorado' },
                  { value: 'CT', label: 'Connecticut' },
                  { value: 'DE', label: 'Delaware' },
                  { value: 'FL', label: 'Florida' },
                  { value: 'GA', label: 'Georgia' },
                  { value: 'HI', label: 'Hawaii' },
                  { value: 'ID', label: 'Idaho' },
                  { value: 'IL', label: 'Illinois' },
                  { value: 'IN', label: 'Indiana' },
                  { value: 'IA', label: 'Iowa' },
                  { value: 'KS', label: 'Kansas' },
                  { value: 'KY', label: 'Kentucky' },
                  { value: 'LA', label: 'Louisiana' },
                  { value: 'ME', label: 'Maine' },
                  { value: 'MD', label: 'Maryland' },
                  { value: 'MA', label: 'Massachusetts' },
                  { value: 'MI', label: 'Michigan' },
                  { value: 'MN', label: 'Minnesota' },
                  { value: 'MS', label: 'Mississippi' },
                  { value: 'MO', label: 'Missouri' },
                  { value: 'MT', label: 'Montana' },
                  { value: 'NE', label: 'Nebraska' },
                  { value: 'NV', label: 'Nevada' },
                  { value: 'NH', label: 'New Hampshire' },
                  { value: 'NJ', label: 'New Jersey' },
                  { value: 'NM', label: 'New Mexico' },
                  { value: 'NY', label: 'New York' },
                  { value: 'NC', label: 'North Carolina' },
                  { value: 'ND', label: 'North Dakota' },
                  { value: 'OH', label: 'Ohio' },
                  { value: 'OK', label: 'Oklahoma' },
                  { value: 'OR', label: 'Oregon' },
                  { value: 'PA', label: 'Pennsylvania' },
                  { value: 'RI', label: 'Rhode Island' },
                  { value: 'SC', label: 'South Carolina' },
                  { value: 'SD', label: 'South Dakota' },
                  { value: 'TN', label: 'Tennessee' },
                  { value: 'TX', label: 'Texas' },
                  { value: 'UT', label: 'Utah' },
                  { value: 'VT', label: 'Vermont' },
                  { value: 'VA', label: 'Virginia' },
                  { value: 'WA', label: 'Washington' },
                  { value: 'WV', label: 'West Virginia' },
                  { value: 'WI', label: 'Wisconsin' },
                  { value: 'WY', label: 'Wyoming' }
                ]}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">License Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={medicalLicense.expiryDate}
                  onChange={(e) => setMedicalLicense(prev => ({...prev, expiryDate: e.target.value}))}
                  className="w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">License Documents</label>
                <FileUploadArea 
                  licenseDocs={licenseDocs}
                  setLicenseDocs={setLicenseDocs}
                  dragActive={dragActive}
                  handleDrag={handleDrag}
                  handleDrop={handleDrop}
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-800 dark:text-emerald-300">
                    <p className="font-medium mb-1">Document Verification</p>
                    <p>Please upload your medical license and any relevant certifications. Our team will verify these documents within 24-48 hours.</p>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (role === 'pharmacy') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Pharmacy Details</h3>
                <p className="text-gray-600 dark:text-gray-400">Information about your pharmacy</p>
              </div>
              
              <InputField
                icon={BuildingStorefrontIcon}
                placeholder="Pharmacy name"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                required
              />

              <InputField
                icon={DocumentTextIcon}
                placeholder="License number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">License Documents</label>
                <FileUploadArea 
                  licenseDocs={licenseDocs}
                  setLicenseDocs={setLicenseDocs}
                  dragActive={dragActive}
                  handleDrag={handleDrag}
                  handleDrop={handleDrop}
                />
              </div>

              <InputField
                icon={UserIcon}
                placeholder="Registered pharmacist name"
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
                required
              />

              <InputField
                icon={MapPinIcon}
                placeholder="Location/Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />

              <SelectField
                icon={BuildingStorefrontIcon}
                value={pharmacyType}
                onChange={(e) => setPharmacyType(e.target.value)}
                placeholder="Type of pharmacy"
                options={[
                  { value: 'community', label: 'Community Pharmacy' },
                  { value: 'hospital', label: 'Hospital Pharmacy' },
                  { value: 'retail', label: 'Retail Pharmacy' },
                  { value: 'online', label: 'Online Pharmacy' }
                ]}
              />
            </div>
          );
        }
        break;

      case 4:
        if (role === 'doctor') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Medical Specialization</h3>
                <p className="text-gray-600 dark:text-gray-400">Your medical expertise and experience</p>
              </div>
              
              <SelectField
                icon={ShieldCheckIcon}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Select your specialization"
                options={[
                  { value: 'general-medicine', label: 'General Medicine' },
                  { value: 'cardiology', label: 'Cardiology' },
                  { value: 'dermatology', label: 'Dermatology' },
                  { value: 'pediatrics', label: 'Pediatrics' },
                  { value: 'orthopedics', label: 'Orthopedics' },
                  { value: 'neurology', label: 'Neurology' },
                  { value: 'psychiatry', label: 'Psychiatry' },
                  { value: 'oncology', label: 'Oncology' },
                  { value: 'gynecology', label: 'Gynecology' },
                  { value: 'endocrinology', label: 'Endocrinology' },
                  { value: 'pulmonology', label: 'Pulmonology' },
                  { value: 'gastroenterology', label: 'Gastroenterology' },
                  { value: 'urology', label: 'Urology' },
                  { value: 'ophthalmology', label: 'Ophthalmology' },
                  { value: 'ent', label: 'ENT (Ear, Nose, Throat)' },
                  { value: 'emergency', label: 'Emergency Medicine' },
                  { value: 'anesthesiology', label: 'Anesthesiology' },
                  { value: 'radiology', label: 'Radiology' },
                  { value: 'pathology', label: 'Pathology' },
                  { value: 'family-medicine', label: 'Family Medicine' }
                ]}
                required
              />

              <SelectField
                icon={CalendarDaysIcon}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="Years of experience"
                options={[
                  { value: '0-1', label: '0-1 years (Resident/Fresh Graduate)' },
                  { value: '2-5', label: '2-5 years' },
                  { value: '6-10', label: '6-10 years' },
                  { value: '11-15', label: '11-15 years' },
                  { value: '16-20', label: '16-20 years' },
                  { value: '21+', label: '21+ years' }
                ]}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Professional Bio</label>
                <textarea
                  value={doctorBio}
                  onChange={(e) => setDoctorBio(e.target.value)}
                  placeholder="Tell patients about your background, expertise, and approach to healthcare..."
                  rows={4}
                  className="w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-lg resize-none"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-800 dark:text-emerald-300">
                    <p className="font-medium mb-1">Professional Profile</p>
                    <p>This information will be displayed to patients when they search for doctors. Make sure to highlight your expertise and experience.</p>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (role === 'pharmacy') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Location & Contact</h3>
                <p className="text-gray-600 dark:text-gray-400">Your pharmacy's address and contact information</p>
              </div>
              
              {/* Map Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Select Your Location
                  </h4>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={loadingLocation}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loadingLocation ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <MapPinIcon className="h-4 w-4" />
                    )}
                    <span>Use Current Location</span>
                  </button>
              </div>
              
              <AddressMapSelector
                onLocationSelect={handleLocationSelect}
                initialPosition={coordinates ? [coordinates.latitude, coordinates.longitude] : null}
                key={coordinates ? `${coordinates.latitude}-${coordinates.longitude}` : 'default'} // Force re-render on coordinates change
                address={`${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.replace(/^,+|,+$/g, '').replace(/,+/g, ', ')}
                height="350px"
              />
            </div>
            
            {/* Manual Address Input */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Address Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  icon={MapPinIcon}
                  placeholder="Street Address"
                  value={address.street}
                  onChange={(e) => setAddress(prev => ({...prev, street: e.target.value}))}
                  required
                />
                
                <InputField
                  icon={MapPinIcon}
                  placeholder="City"
                  value={address.city}
                  onChange={(e) => setAddress(prev => ({...prev, city: e.target.value}))}
                  required
                />
                
                <InputField
                  icon={MapPinIcon}
                  placeholder="State/Province"
                  value={address.state}
                  onChange={(e) => setAddress(prev => ({...prev, state: e.target.value}))}
                  required
                />
                
                <InputField
                  icon={MapPinIcon}
                  placeholder="ZIP/Postal Code"
                  value={address.zipCode}
                  onChange={(e) => setAddress(prev => ({...prev, zipCode: e.target.value}))}
                  required
                />
              </div>

              <InputField
                icon={MapPinIcon}
                placeholder="Country"
                value={address.country}
                onChange={(e) => setAddress(prev => ({...prev, country: e.target.value}))}
                required
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PhoneInputField
                  placeholder="Primary Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                
                <InputField
                  icon={EnvelopeIcon}
                  placeholder="Website (Optional)"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  type="url"
                />
              </div>
            </div>

            {/* Location Info Display */}
            {coordinates && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  📍 Location Coordinates
                </h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Latitude: {coordinates.latitude.toFixed(6)}, Longitude: {coordinates.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  This will help patients find you and calculate delivery distances accurately.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Pharmacy Description
              </label>
              <textarea
                value={pharmacyDescription}
                onChange={(e) => setPharmacyDescription(e.target.value)}
                placeholder="Tell customers about your pharmacy, specializations, and what makes you unique..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm resize-none"
              />
            </div>
          </div>
        );
        }
        return null;
      case 5:
        if (role === 'doctor') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Practice Details</h3>
                <p className="text-gray-600 dark:text-gray-400">Information about your clinic and consultation fees</p>
              </div>
              
              <InputField
                icon={BuildingStorefrontIcon}
                placeholder="Clinic/Hospital name (optional)"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />

              <InputField
                icon={CurrencyDollarIcon}
                type="number"
                placeholder="Consultation fee (USD)"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                required
              />

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Consultation Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                    <input
                      type="checkbox"
                      checked={consultationTypes.inPerson}
                      onChange={(e) => setConsultationTypes(prev => ({...prev, inPerson: e.target.checked}))}
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400 border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500"
                    />
                    <UserIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">In-Person</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <input
                      type="checkbox"
                      checked={consultationTypes.video}
                      onChange={(e) => setConsultationTypes(prev => ({...prev, video: e.target.checked}))}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <VideoCameraIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Video Call</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20">
                    <input
                      type="checkbox"
                      checked={consultationTypes.phone}
                      onChange={(e) => setConsultationTypes(prev => ({...prev, phone: e.target.checked}))}
                      className="w-4 h-4 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                    />
                    <PhoneIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Phone Call</span>
                  </label>
                </div>
              </div>

              {/* Location for Doctor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Practice Location (Optional)
                  </h4>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={loadingLocation}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loadingLocation ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <MapPinIcon className="h-4 w-4" />
                    )}
                    <span>Use Current Location</span>
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Adding your practice location helps patients find you for in-person consultations.
                </p>
                
                <AddressMapSelector
                  onLocationSelect={handleLocationSelect}
                  initialPosition={coordinates ? [coordinates.latitude, coordinates.longitude] : null}
                  key={coordinates ? `${coordinates.latitude}-${coordinates.longitude}` : 'default'}
                  address={`${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.replace(/^,+|,+$/g, '').replace(/,+/g, ', ')}
                  height="300px"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    icon={MapPinIcon}
                    placeholder="City (Optional)"
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({...prev, city: e.target.value}))}
                  />
                  
                  <InputField
                    icon={MapPinIcon}
                    placeholder="State (Optional)"
                    value={address.state}
                    onChange={(e) => setAddress(prev => ({...prev, state: e.target.value}))}
                  />
                </div>
              </div>
            </div>
          );
        } else if (role === 'pharmacy') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Services & Hours</h3>
                <p className="text-gray-600 dark:text-gray-400">Services and operational details</p>
              </div>
              
              <CheckboxGroup
                title="Available Services"
                options={['Prescription Fulfillment', 'Delivery', 'Consultation', 'Vaccination']}
                selected={availableServices}
                onChange={setAvailableServices}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Working Hours</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <label className="absolute -top-2 left-3 bg-white dark:bg-gray-700 px-1 text-xs text-gray-600 dark:text-gray-400">Opening Time</label>
                </div>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <label className="absolute -top-2 left-3 bg-white dark:bg-gray-700 px-1 text-xs text-gray-600 dark:text-gray-400">Closing Time</label>
                </div>
              </div>
            </div>

            <label className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={inventorySync}
                onChange={(e) => setInventorySync(e.target.checked)}
                className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div className="flex items-center space-x-2">
                <CogIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Enable Inventory Sync Option</span>
              </div>
            </label>

            <InputField
              icon={BanknotesIcon}
              placeholder="Bank details (for payout)"
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
            />
          </div>
        );
        }
        return null;
      case 6:
        if (role === 'doctor') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Availability Schedule</h3>
                <p className="text-gray-600 dark:text-gray-400">Set your working hours and availability</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Schedule</h4>
                {Object.entries(availability).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.available}
                          onChange={(e) => setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day], available: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                      <span className="font-medium text-gray-900 dark:text-gray-100 capitalize w-20">{day}</span>
                    </div>
                    {schedule.available && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day], startTime: e.target.value }
                          }))}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day], endTime: e.target.value }
                          }))}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Ready to Start!</h4>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-3">
                      You're all set to join our platform as a verified doctor. Once you submit your registration:
                    </p>
                    <ul className="text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
                      <li>• Your documents will be verified within 24-48 hours</li>
                      <li>• You'll receive login credentials via email</li>
                      <li>• Patients will be able to book consultations with you</li>
                      <li>• You can start earning from day one</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (role === 'pharmacy') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Services & Final Setup</h3>
                <p className="text-gray-600 dark:text-gray-400">Configure your services and complete registration</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Services Offered
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(services).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setServices(prev => ({...prev, [key]: e.target.checked}))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Comprehensive Working Hours
              </label>
              <div className="space-y-3">
                {Object.entries(workingHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <div className="w-20">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {day}
                      </span>
                    </div>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!hours.closed}
                        onChange={(e) => setWorkingHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], closed: !e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Open</span>
                    </label>
                    
                    {!hours.closed && (
                      <>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => setWorkingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], open: e.target.value }
                          }))}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => setWorkingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], close: e.target.value }
                          }))}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Business Settings
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-xl">
                  <input
                    type="checkbox"
                    checked={acceptsInsurance}
                    onChange={(e) => setAcceptsInsurance(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Accept Insurance
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Final Step
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Review your information and submit your pharmacy registration. 
                    Our team will review your application within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        }
        return null;

      default:
        return null;
    }
  };

  // If registration was successful, show success message
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-96 h-96 bg-green-400/20 dark:bg-green-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-8 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="max-w-md w-full relative">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/30 overflow-hidden">
            <div className="px-8 py-12 text-center">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl">
                  <CheckCircleIcon className="h-16 w-16 text-white" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent mb-4">
                Registration Successful!
              </h1>

              {/* Message */}
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                {registrationMessage || 'Please check your email for a verification link to activate your account.'}
              </p>

              {/* Email Check Instructions */}
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl mb-8">
                <div className="flex items-start space-x-3">
                  <EnvelopeIcon className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800 dark:text-green-300">
                    <p className="font-bold mb-2">Check Your Email</p>
                    <p>We've sent a verification link to <strong>{email}</strong></p>
                    <p className="mt-2">Click the link in the email to verify your account and complete the registration process.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <Link
                  to="/login"
                  className="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl transform hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
                >
                  <span>Continue to Login</span>
                </Link>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => dispatch(clearRegistrationSuccess())}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    try registering again
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-8 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-2xl mx-auto relative">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div className="px-8 py-12">
            {/* Header */}
            <div className="text-center mb-8 relative">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="absolute top-0 right-0 p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all duration-300 group backdrop-blur-sm"
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? (
                  <SunIcon className="h-6 w-6 group-hover:rotate-180 group-hover:scale-110 transition-all duration-300" />
                ) : (
                  <MoonIcon className="h-6 w-6 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                )}
              </button>

              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative group">
                <HeartIcon className="h-10 w-10 text-white drop-shadow-lg" />
                <SparklesIcon className="h-6 w-6 text-white/80 absolute -top-2 -right-2 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-teal-400 rounded-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:via-purple-400 dark:to-teal-400 bg-clip-text text-transparent mb-3">
                Create Your Account
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Join our healthcare platform today</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl animate-slideDown">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <StepIndicator steps={steps} currentStep={currentStep} />
              {renderStep()}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300 font-medium shadow-lg backdrop-blur-sm"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div></div>
                )}

                {currentStep < maxSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 dark:from-blue-500 dark:via-purple-500 dark:to-teal-500 text-white rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 dark:hover:from-blue-600 dark:hover:via-purple-600 dark:hover:to-teal-600 transition-all duration-300 font-medium shadow-xl transform hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
                  >
                    <span>Next</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={authStatus === 'loading'}
                    className={`
                      flex items-center space-x-3 px-8 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl
                      ${authStatus !== 'loading'
                        ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white transform hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {authStatus === 'loading' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRightIcon className="h-5 w-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-6 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">Already have an account?</span>
                </div>
              </div>

              <Link
                to="/login"
                className="w-full py-4 border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 flex items-center justify-center space-x-3 group shadow-lg backdrop-blur-sm"
              >
                <span>Sign In Instead</span>
                <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 PharmaConnect Healthcare Platform. All rights reserved.</p>
          <div className="mt-3 space-x-6">
            <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Terms of Service</Link>
            <span>•</span>
            <Link to="/help" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Help</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;
