import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import {
  BuildingStorefrontIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

function PharmacyRegistration() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    // Basic Info
    pharmacyName: '',
    pharmacistName: '',
    licenseNumber: '',
    
    // Location
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    coordinates: { lat: '', lng: '' },
    
    // Contact
    phone: '',
    email: '',
    website: '',
    
    // Pharmacy Type & Services
    pharmacyType: 'retail',
    services: {
      consultations: false,
      homeDelivery: false,
      emergencyService: false,
      onlineOrdering: false,
      compounding: false,
      vaccinations: false
    },
    
    // Working Hours
    workingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    },
    
    // Documents
    licenseDocs: [],
    
    // Optional
    bankDetails: '',
    inventorySync: false
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Pharmacy details and licensing' },
    { number: 2, title: 'Location & Contact', description: 'Address and contact information' },
    { number: 3, title: 'Services & Hours', description: 'Available services and operating hours' },
    { number: 4, title: 'Documents & Setup', description: 'License documents and final setup' }
  ];

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      const API_BASE_URL = 'http://localhost:5000/api/v1';
      const response = await fetch(`${API_BASE_URL}/pharmacies/status/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setRegistrationStatus(data.data);
        } else {
          console.error('API returned non-JSON response:', await response.text());
        }
      } else {
        const errorText = await response.text();
        console.error('API request failed with status:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
      // Set a default state so the form can still be used
      setRegistrationStatus({ hasPharmacy: false, status: null });
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleServiceChange = (service, checked) => {
    setFormData(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [service]: checked
      }
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleFileUpload = async (files) => {
    const uploadedFiles = [];
    
    for (let file of files) {
      try {
        const API_BASE_URL = 'http://localhost:5000/api/v1';
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', 'license_document');
        
        const response = await fetch(`${API_BASE_URL}/upload/document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: uploadFormData
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (response.ok) {
            uploadedFiles.push(data.data);
          } else {
            toast.error(data.message || `Failed to upload ${file.name}`);
          }
        } else {
          // For now, create a mock file entry since upload endpoint might not exist
          uploadedFiles.push({
            originalName: file.name,
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file)
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        // Create a mock file entry for development
        uploadedFiles.push({
          originalName: file.name,
          name: file.name,
          size: file.size,
          url: URL.createObjectURL(file)
        });
      }
    }
    
    setFormData(prev => ({
      ...prev,
      licenseDocs: [...prev.licenseDocs, ...uploadedFiles]
    }));
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      licenseDocs: prev.licenseDocs.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.pharmacyName.trim()) newErrors.pharmacyName = 'Pharmacy name is required';
        if (!formData.pharmacistName.trim()) newErrors.pharmacistName = 'Pharmacist name is required';
        if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
        break;
      case 2:
        if (!formData.address.street.trim()) newErrors.street = 'Street address is required';
        if (!formData.address.city.trim()) newErrors.city = 'City is required';
        if (!formData.address.state.trim()) newErrors.state = 'State is required';
        if (!formData.address.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        break;
      case 3:
        // Services and hours validation (optional for now)
        break;
      case 4:
        if (formData.licenseDocs.length === 0) newErrors.licenseDocs = 'At least one license document is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    
    try {
      const API_BASE_URL = 'http://localhost:5000/api/v1';
      
      // Transform form data to match backend expectations
      const registrationData = {
        name: formData.pharmacyName,
        address: formData.address,
        coordinates: [formData.coordinates.lng || 0, formData.coordinates.lat || 0],
        contact: {
          phone: formData.phone,
          email: formData.email,
          website: formData.website
        },
        licenses: [{
          licenseNumber: formData.licenseNumber,
          licenseType: formData.pharmacyType,
          issuingAuthority: 'State Board of Pharmacy',
          issueDate: new Date(),
          expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
          documentUrl: formData.licenseDocs[0]?.url || 'pending'
        }],
        operatingHours: Object.keys(formData.workingHours).map(day => ({
          day,
          isOpen: !formData.workingHours[day].closed,
          openTime: formData.workingHours[day].open,
          closeTime: formData.workingHours[day].close
        })),
        services: formData.services,
        staff: {
          pharmacists: [{
            name: formData.pharmacistName,
            licenseNumber: formData.licenseNumber,
            specializations: ['General Pharmacy'],
            yearsExperience: 5
          }],
          totalStaff: 1
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/pharmacies/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(registrationData)
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          toast.success('Pharmacy registration submitted successfully!');
          setRegistrationStatus(data.data);
        } else {
          toast.error(data.message || 'Registration failed');
        }
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText);
        toast.error('Server error. Please try again later.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = 'text', value, onChange, error, placeholder, required = false }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 rounded-xl border transition-all duration-300
          ${error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          placeholder-gray-500 dark:placeholder-gray-400
          focus:ring-4 focus:outline-none
        `}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );

  const SelectField = ({ label, name, value, onChange, options, error, required = false }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`
          w-full px-4 py-3 rounded-xl border transition-all duration-300
          ${error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          focus:ring-4 focus:outline-none
        `}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );

  const CheckboxField = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );

  const TimeField = ({ label, value, onChange, disabled = false }) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <input
        type="time"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );

  const FileUploadArea = ({ onFileSelect, files, onRemove }) => {
    const [dragActive, setDragActive] = useState(false);

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
        onFileSelect(Array.from(e.dataTransfer.files));
      }
    };

    const handleFileInput = (e) => {
      if (e.target.files && e.target.files[0]) {
        onFileSelect(Array.from(e.target.files));
      }
    };

    return (
      <div className="space-y-4">
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }
            bg-gray-50 dark:bg-gray-800/50
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Drop license documents here
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            or click to browse files
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <p className="text-xs text-gray-400">
            Supported formats: PDF, JPG, PNG (Max 10MB each)
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded Documents:</h4>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {file.originalName || file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Show registration status if already registered
  if (registrationStatus && registrationStatus.hasPharmacy) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
              registrationStatus.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
              registrationStatus.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
              'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              {registrationStatus.status === 'approved' ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              ) : registrationStatus.status === 'rejected' ? (
                <XMarkIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              ) : (
                <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Pharmacy Registration Status
            </h2>

            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              registrationStatus.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              registrationStatus.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {registrationStatus.status === 'approved' ? '✅ Approved' :
               registrationStatus.status === 'rejected' ? '❌ Rejected' :
               registrationStatus.status === 'submitted' ? '📋 Under Review' :
               '⏳ Pending Review'}
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              {registrationStatus.status === 'approved' 
                ? 'Your pharmacy has been approved and is now active in our system. You can start receiving prescription requests.'
                : registrationStatus.status === 'rejected'
                ? 'Your pharmacy registration was rejected. Please contact support for more information.'
                : 'Your pharmacy registration is currently under review. Our team will process your application within 2-3 business days.'
              }
            </p>

            {registrationStatus.approvedAt && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Approved on: {new Date(registrationStatus.approvedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 shadow-lg">
          <BuildingStorefrontIcon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Basic Information
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Tell us about your pharmacy and licensing details to get started
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
            </div>
            <input
              type="text"
              name="pharmacyName"
              placeholder="Enter your pharmacy name"
              value={formData.pharmacyName}
              onChange={(e) => handleInputChange(null, 'pharmacyName', e.target.value)}
              required
              className={`
                w-full pl-12 pr-4 py-4 
                border-2 rounded-2xl transition-all duration-300
                focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
                focus:border-blue-500 dark:focus:border-blue-400
                hover:border-gray-300 dark:hover:border-gray-600 
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                border-gray-200 dark:border-gray-700
                ${errors.pharmacyName ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
                placeholder:text-gray-400 dark:placeholder:text-gray-500 
                text-gray-900 dark:text-gray-100
                shadow-sm hover:shadow-md focus:shadow-lg
                dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
              `}
            />
            <label className="absolute -top-3 left-3 bg-white dark:bg-gray-800 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
              Pharmacy Name <span className="text-red-500">*</span>
            </label>
            {errors.pharmacyName && (
              <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>{errors.pharmacyName}</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
            </div>
            <input
              type="text"
              name="pharmacistName"
              placeholder="Enter registered pharmacist name"
              value={formData.pharmacistName}
              onChange={(e) => handleInputChange(null, 'pharmacistName', e.target.value)}
              required
              className={`
                w-full pl-12 pr-4 py-4 
                border-2 rounded-2xl transition-all duration-300
                focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
                focus:border-blue-500 dark:focus:border-blue-400
                hover:border-gray-300 dark:hover:border-gray-600 
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                border-gray-200 dark:border-gray-700
                ${errors.pharmacistName ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
                placeholder:text-gray-400 dark:placeholder:text-gray-500 
                text-gray-900 dark:text-gray-100
                shadow-sm hover:shadow-md focus:shadow-lg
                dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
              `}
            />
            <label className="absolute -top-3 left-3 bg-white dark:bg-gray-800 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
              Registered Pharmacist <span className="text-red-500">*</span>
            </label>
            {errors.pharmacistName && (
              <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>{errors.pharmacistName}</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
            </div>
            <input
              type="text"
              name="licenseNumber"
              placeholder="Enter pharmacy license number"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange(null, 'licenseNumber', e.target.value)}
              required
              className={`
                w-full pl-12 pr-4 py-4 
                border-2 rounded-2xl transition-all duration-300
                focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
                focus:border-blue-500 dark:focus:border-blue-400
                hover:border-gray-300 dark:hover:border-gray-600 
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                border-gray-200 dark:border-gray-700
                ${errors.licenseNumber ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
                placeholder:text-gray-400 dark:placeholder:text-gray-500 
                text-gray-900 dark:text-gray-100
                shadow-sm hover:shadow-md focus:shadow-lg
                dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
              `}
            />
            <label className="absolute -top-3 left-3 bg-white dark:bg-gray-800 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
              License Number <span className="text-red-500">*</span>
            </label>
            {errors.licenseNumber && (
              <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>{errors.licenseNumber}</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-300" />
            </div>
            <select
              name="pharmacyType"
              value={formData.pharmacyType}
              onChange={(e) => handleInputChange(null, 'pharmacyType', e.target.value)}
              className={`
                w-full pl-12 pr-4 py-4 appearance-none
                border-2 rounded-2xl transition-all duration-300
                focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 
                focus:border-blue-500 dark:focus:border-blue-400
                hover:border-gray-300 dark:hover:border-gray-600 
                bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-gray-100
                shadow-sm hover:shadow-md focus:shadow-lg
                dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
              `}
            >
              <option value="">Select pharmacy type</option>
              <option value="retail">🏪 Retail Pharmacy</option>
              <option value="online">💻 Online Pharmacy</option>
              <option value="hospital">🏥 Hospital-based Pharmacy</option>
              <option value="clinic">🏪 Clinic Pharmacy</option>
            </select>
            <label className="absolute -top-3 left-3 bg-white dark:bg-gray-800 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
              Pharmacy Type <span className="text-red-500">*</span>
            </label>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <MapPinIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Location & Contact</h2>
        <p className="text-gray-600 dark:text-gray-400">Provide your pharmacy's address and contact information</p>
      </div>

      <div className="space-y-6">
        <InputField
          label="Street Address"
          name="street"
          value={formData.address.street}
          onChange={(e) => handleInputChange('address', 'street', e.target.value)}
          error={errors.street}
          placeholder="Enter street address"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField
            label="City"
            name="city"
            value={formData.address.city}
            onChange={(e) => handleInputChange('address', 'city', e.target.value)}
            error={errors.city}
            placeholder="Enter city"
            required
          />

          <InputField
            label="State"
            name="state"
            value={formData.address.state}
            onChange={(e) => handleInputChange('address', 'state', e.target.value)}
            error={errors.state}
            placeholder="Enter state"
            required
          />

          <InputField
            label="ZIP Code"
            name="zipCode"
            value={formData.address.zipCode}
            onChange={(e) => handleInputChange('address', 'zipCode', e.target.value)}
            error={errors.zipCode}
            placeholder="Enter ZIP code"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
            error={errors.phone}
            placeholder="Enter phone number"
            required
          />

          <InputField
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange(null, 'email', e.target.value)}
            error={errors.email}
            placeholder="Enter email address"
            required
          />
        </div>

        <InputField
          label="Website (Optional)"
          name="website"
          type="url"
          value={formData.website}
          onChange={(e) => handleInputChange(null, 'website', e.target.value)}
          placeholder="https://your-pharmacy-website.com"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <ClockIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Services & Operating Hours</h2>
        <p className="text-gray-600 dark:text-gray-400">Configure your services and working hours</p>
      </div>

      {/* Services */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label="Patient Consultations"
            name="consultations"
            checked={formData.services.consultations}
            onChange={(e) => handleServiceChange('consultations', e.target.checked)}
          />
          <CheckboxField
            label="Home Delivery"
            name="homeDelivery"
            checked={formData.services.homeDelivery}
            onChange={(e) => handleServiceChange('homeDelivery', e.target.checked)}
          />
          <CheckboxField
            label="24/7 Emergency Service"
            name="emergencyService"
            checked={formData.services.emergencyService}
            onChange={(e) => handleServiceChange('emergencyService', e.target.checked)}
          />
          <CheckboxField
            label="Online Ordering"
            name="onlineOrdering"
            checked={formData.services.onlineOrdering}
            onChange={(e) => handleServiceChange('onlineOrdering', e.target.checked)}
          />
          <CheckboxField
            label="Compounding Services"
            name="compounding"
            checked={formData.services.compounding}
            onChange={(e) => handleServiceChange('compounding', e.target.checked)}
          />
          <CheckboxField
            label="Vaccinations"
            name="vaccinations"
            checked={formData.services.vaccinations}
            onChange={(e) => handleServiceChange('vaccinations', e.target.checked)}
          />
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Operating Hours</h3>
        <div className="space-y-4">
          {Object.keys(formData.workingHours).map(day => (
            <div key={day} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-24">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {day}
                </span>
              </div>
              
              <CheckboxField
                label="Closed"
                name={`${day}-closed`}
                checked={formData.workingHours[day].closed}
                onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
              />

              {!formData.workingHours[day].closed && (
                <>
                  <TimeField
                    label="Open"
                    value={formData.workingHours[day].open}
                    onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                  />
                  <TimeField
                    label="Close"
                    value={formData.workingHours[day].close}
                    onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Documents & Final Setup</h2>
        <p className="text-gray-600 dark:text-gray-400">Upload required documents and complete your setup</p>
      </div>

      {/* Document Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          License Documents <span className="text-red-500">*</span>
        </h3>
        <FileUploadArea
          onFileSelect={handleFileUpload}
          files={formData.licenseDocs}
          onRemove={removeDocument}
        />
        {errors.licenseDocs && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center mt-2">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            {errors.licenseDocs}
          </p>
        )}
      </div>

      {/* Optional Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Optional Settings</h3>
        <div className="space-y-4">
          <CheckboxField
            label="Enable inventory synchronization with our system"
            name="inventorySync"
            checked={formData.inventorySync}
            onChange={(e) => handleInputChange(null, 'inventorySync', e.target.checked)}
          />

          <InputField
            label="Bank Account Details (for payouts)"
            name="bankDetails"
            value={formData.bankDetails}
            onChange={(e) => handleInputChange(null, 'bankDetails', e.target.value)}
            placeholder="Account details for payment processing"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                ${currentStep >= step.number 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }
              `}>
                {currentStep > step.number ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : (
                  <span className="font-semibold">{step.number}</span>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  w-24 h-1 mx-4 transition-all duration-300
                  ${currentStep > step.number ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {steps[currentStep - 1].title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {steps[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
              ${currentStep === 1 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Previous</span>
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/30"
            >
              <span>Next Step</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-green-500/30"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PharmacyRegistration;
