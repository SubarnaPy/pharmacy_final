import React, { useState, useRef, useEffect } from 'react';
import { prescriptionAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaUpload, FaEye, FaDownload, FaTimes, FaMapMarkerAlt, FaHospitalAlt, FaCheckCircle } from 'react-icons/fa';

const PrescriptionUpload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [prescriptionRequest, setPrescriptionRequest] = useState(null);
  const [matchingPharmacies, setMatchingPharmacies] = useState([]);
  const [showPharmacySelection, setShowPharmacySelection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingOptions, setProcessingOptions] = useState({
    useMultipleOCREngines: true,
    validateMedications: true,
    checkInteractions: true,
    detectAnomalies: true,
    saveToDatabase: true
  });
  const fileInputRef = useRef();

  // Get user's location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
        toast.success('Location detected successfully');
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationLoading(false);
        toast.error('Unable to get your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, TIFF, BMP) or PDF');
        return;
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!userLocation) {
      toast.error('Location is required to find nearby pharmacies');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('prescription', file);
    formData.append('latitude', userLocation.latitude);
    formData.append('longitude', userLocation.longitude);
    
    // Add processing options
    Object.keys(processingOptions).forEach(key => {
      formData.append(key, processingOptions[key]);
    });

    try {
      const response = await prescriptionAPI.processAndCreateRequest(formData);
      if (response.data.success) {
        setResult(response.data.data.processingResult);
        setPrescriptionRequest(response.data.data.prescriptionRequest);
        setMatchingPharmacies(response.data.data.matchingPharmacies);
        
        toast.success(
          `Prescription processed successfully! Found ${response.data.data.totalPharmaciesFound} nearby pharmacies.`
        );
        
        if (response.data.data.matchingPharmacies.length > 0) {
          setShowPharmacySelection(true);
        }
      }
    } catch (error) {
      console.error('Error processing prescription:', error);
      toast.error(error.response?.data?.message || 'Failed to process prescription');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitToPharmacies = async () => {
    if (!prescriptionRequest) {
      toast.error('No prescription request found');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await prescriptionAPI.submitPrescriptionRequest(prescriptionRequest._id);
      if (response.data.success) {
        toast.success(
          `Prescription request submitted to ${response.data.data.successCount} pharmacies!`
        );
        
        // Update the prescription request status
        setPrescriptionRequest(prev => ({
          ...prev,
          status: 'submitted',
          submittedAt: new Date()
        }));
        
        // Show success state
        setShowPharmacySelection(true);
      }
    } catch (error) {
      console.error('Error submitting to pharmacies:', error);
      toast.error(error.response?.data?.message || 'Failed to submit to pharmacies');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setPrescriptionRequest(null);
    setMatchingPharmacies([]);
    setShowPharmacySelection(false);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOptionChange = (option, value) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Prescription</h2>

        {/* Location Status */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-blue-600" />
              <span className="font-medium text-blue-800">Location Status:</span>
            </div>
            {!userLocation && (
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {locationLoading ? 'Detecting...' : 'Get Location'}
              </button>
            )}
          </div>
          <div className="mt-2">
            {locationLoading ? (
              <span className="text-blue-600">Detecting your location...</span>
            ) : userLocation ? (
              <span className="text-green-600">
                ✓ Location detected (will find pharmacies within 1000km)
              </span>
            ) : (
              <span className="text-orange-600">
                ⚠ Location required to find nearby pharmacies
              </span>
            )}
          </div>
        </div>

        {/* File Upload Area */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            {!file ? (
              <div>
                <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  Drop your prescription image here or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supported formats: JPEG, PNG, TIFF, BMP, PDF (Max size: 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/tiff,image/bmp,application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!userLocation}
                >
                  Choose File
                </button>
                {!userLocation && (
                  <p className="text-xs text-orange-600 mt-2">
                    Please enable location first
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
                
                {preview && (
                  <div className="mb-4">
                    <img
                      src={preview}
                      alt="Prescription preview"
                      className="max-w-sm max-h-64 mx-auto rounded-md shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Processing Options */}
        {file && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(processingOptions).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handleOptionChange(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {file && (
          <div className="mb-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Process Prescription'}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Results</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Status</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : result.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {result.status}
                  </span>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Confidence Score</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(result.confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round((result.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              {result.extractedData && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Extracted Information</h4>
                  <div className="space-y-3">
                    {result.extractedData.medications && (
                      <div>
                        <h5 className="font-medium text-gray-700">Medications:</h5>
                        <ul className="list-disc list-inside text-gray-600 ml-4">
                          {result.extractedData.medications.map((med, index) => (
                            <li key={index}>
                              {med.name} - {med.dosage} ({med.frequency})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.extractedData.doctor && (
                      <div>
                        <h5 className="font-medium text-gray-700">Doctor:</h5>
                        <p className="text-gray-600 ml-4">{result.extractedData.doctor}</p>
                      </div>
                    )}
                    
                    {result.extractedData.date && (
                      <div>
                        <h5 className="font-medium text-gray-700">Date:</h5>
                        <p className="text-gray-600 ml-4">
                          {new Date(result.extractedData.date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-red-800 mb-3">Warnings</h4>
                  <ul className="list-disc list-inside text-red-600 space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex gap-4">
                {result.reportUrl && (
                  <a
                    href={result.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <FaEye /> View Report
                  </a>
                )}
                
                {result.downloadUrl && (
                  <a
                    href={result.downloadUrl}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <FaDownload /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prescription Request and Pharmacy Selection */}
        {prescriptionRequest && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                Prescription Processed Successfully
              </h3>
              
              <div className="mb-4">
                <p className="text-green-700">
                  Your prescription has been processed and saved. We found {matchingPharmacies.length} nearby pharmacies that can fulfill your prescription.
                </p>
              </div>

              {matchingPharmacies.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <FaHospitalAlt />
                    Matching Pharmacies (within 1000km)
                  </h4>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {matchingPharmacies.map((pharmacy) => (
                      <div key={pharmacy._id} className="bg-white border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-800">{pharmacy.name}</h5>
                            <p className="text-sm text-gray-600 mt-1">{pharmacy.address}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>📍 {pharmacy.distance?.toFixed(1)} km away</span>
                              <span>📞 {pharmacy.phoneNumber}</span>
                              {pharmacy.email && <span>✉️ {pharmacy.email}</span>}
                            </div>
                            {pharmacy.availableMedications && (
                              <div className="mt-2">
                                <p className="text-xs text-green-600">
                                  ✓ All required medications in stock
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Available
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleSubmitToPharmacies}
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting to Pharmacies...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle />
                          Submit Request to All {matchingPharmacies.length} Pharmacies
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Your prescription request will be sent to all matching pharmacies. They will review and respond with approval or rejection.
                    </p>
                  </div>
                </div>
              )}

              {matchingPharmacies.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-orange-600 mb-2">
                    No pharmacies found within 1000km that have all required medications in stock.
                  </p>
                  <p className="text-sm text-gray-600">
                    Please try expanding your search radius or contact pharmacies directly.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show pharmacy selection result */}
        {showPharmacySelection && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaCheckCircle className="text-blue-600" />
                Request Submitted Successfully
              </h3>
              
              <div className="mb-4">
                <p className="text-blue-700">
                  Your prescription request has been sent to {matchingPharmacies.length} pharmacies. 
                  You will be notified when pharmacies respond to your request.
                </p>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    // Reset the form for a new upload
                    setFile(null);
                    setPreview(null);
                    setResult(null);
                    setPrescriptionRequest(null);
                    setMatchingPharmacies([]);
                    setShowPharmacySelection(false);
                    setIsSubmitting(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Upload Another Prescription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionUpload;
