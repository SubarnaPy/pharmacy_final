import React, { useState, useEffect } from 'react';
import { 
  DocumentCheckIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  DocumentIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import EditableField from '../../forms/EditableField';
import DocumentUploader from '../../forms/DocumentUploader';
import useDoctorProfile from '../../../hooks/useDoctorProfile';
import apiClient from '../../../api/apiClient';
import useProfileValidation from '../../../hooks/useProfileValidation';

const MedicalLicenseSection = ({ 
  doctorId, 
  isEditable = true, 
  onSave,
  onError 
}) => {
  const { profileData, updateProfileSection, loading } = useDoctorProfile(doctorId);
  const { validateMedicalLicense, validationErrors } = useProfileValidation();
  
  const [licenseData, setLicenseData] = useState({
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    isVerified: false,
    verificationDate: null,
    documents: []
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localErrors, setLocalErrors] = useState([]);
  const [showRenewalNotification, setShowRenewalNotification] = useState(false);

  // Initialize license data from profile
  useEffect(() => {
    if (profileData?.medicalLicense) {
      setLicenseData(profileData.medicalLicense);
      checkRenewalNotification(profileData.medicalLicense.expiryDate);
    }
  }, [profileData]);

  // Check if license renewal notification should be shown
  const checkRenewalNotification = (expiryDate) => {
    if (!expiryDate) return;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    // Show notification if license expires within 90 days
    setShowRenewalNotification(daysUntilExpiry <= 90 && daysUntilExpiry > 0);
  };

  // Handle field changes
  const handleFieldChange = (field, value) => {
    const updatedData = { ...licenseData, [field]: value };
    setLicenseData(updatedData);
    
    // Clear local errors for this field
    setLocalErrors(prev => prev.filter(error => error.field !== field));
    
    // Check renewal notification for expiry date changes
    if (field === 'expiryDate') {
      checkRenewalNotification(value);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (file, options = {}) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('documentType', 'license');
      formData.append('doctorId', doctorId);

      // Call API to upload document
      const response = await apiClient.post(`/doctors/${doctorId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Return the uploaded document data
      const uploadedDocument = response.data.data.uploadedDocuments[0];
      
      return {
        id: uploadedDocument.publicId,
        fileName: uploadedDocument.fileName,
        fileUrl: uploadedDocument.fileUrl,
        uploadedAt: uploadedDocument.uploadedAt,
        status: 'success'
      };
    } catch (error) {
      console.error('Document upload failed:', error);
      throw error;
    }
  };

  // Handle document deletion
  const handleDocumentDelete = async (document) => {
    try {
      await apiClient.delete(`/doctors/${doctorId}/documents/${document.id}`);

      // Remove document from local state
      setLicenseData(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== document.id)
      }));
    } catch (error) {
      console.error('Document deletion failed:', error);
      onError?.(error.message);
    }
  };

  // Handle document preview
  const handleDocumentPreview = (document) => {
    const url = document.fileUrl || document.url;
    if (url) {
      // For PDFs, we might want to add viewer parameters
      const viewerUrl = url.includes('.pdf') ? `${url}#view=FitH` : url;
      window.open(viewerUrl, '_blank');
    } else {
      alert('Document URL not available. Please try re-uploading the document.');
    }
  };

  // Handle documents change from uploader
  const handleDocumentsChange = (documents) => {
    const normalized = Array.isArray(documents) ? documents : [];
    setLicenseData(prev => ({
      ...prev,
      documents: normalized
    }));
  };

  // Validate license data
  const validateLicenseData = () => {
    const isValid = validateMedicalLicense(licenseData);
    // Map hook's validationErrors object to array of { field, message }
    const fields = ['licenseNumber', 'issuingAuthority', 'issueDate', 'expiryDate'];
    const mapped = fields
      .filter((field) => validationErrors[field])
      .map((field) => ({ field, message: validationErrors[field] }));
    setLocalErrors(mapped);
    return isValid;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateLicenseData()) {
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileSection('medicalLicense', licenseData);
      setIsEditing(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save license data:', error);
      onError?.(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profileData?.medicalLicense) {
      setLicenseData(profileData.medicalLicense);
    }
    setIsEditing(false);
    setLocalErrors([]);
  };

  // Get verification status display
  const getVerificationStatus = () => {
    if (licenseData.isVerified) {
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
        text: 'Verified',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    } else if (licenseData.documents.length > 0) {
      return {
        icon: <ClockIcon className="h-5 w-5 text-yellow-500" />,
        text: 'Under Review',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      };
    } else {
      return {
        icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
        text: 'Not Verified',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    }
  };

  // Get expiry status
  const getExpiryStatus = () => {
    if (!licenseData.expiryDate) return null;
    
    const expiry = new Date(licenseData.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return {
        icon: <XCircleIcon className="h-4 w-4 text-red-500" />,
        text: 'Expired',
        color: 'text-red-600 dark:text-red-400'
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        icon: <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />,
        text: `Expires in ${daysUntilExpiry} days`,
        color: 'text-red-600 dark:text-red-400'
      };
    } else if (daysUntilExpiry <= 90) {
      return {
        icon: <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />,
        text: `Expires in ${daysUntilExpiry} days`,
        color: 'text-yellow-600 dark:text-yellow-400'
      };
    } else {
      return {
        icon: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
        text: `Valid for ${daysUntilExpiry} days`,
        color: 'text-green-600 dark:text-green-400'
      };
    }
  };

  const verificationStatus = getVerificationStatus();
  const expiryStatus = getExpiryStatus();
  const allErrors = [
    ...Object.entries(validationErrors || {}).map(([field, message]) => ({ field, message })),
    ...localErrors
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Medical License & Credentials
            </h3>
          </div>
          
          {/* Verification Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${verificationStatus.bgColor} ${verificationStatus.borderColor} ${verificationStatus.color}`}>
            {verificationStatus.icon}
            {verificationStatus.text}
          </div>
        </div>
      </div>

      {/* Renewal Notification */}
      {showRenewalNotification && (
        <div className="mx-6 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                License Renewal Required
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Your medical license expires soon. Please renew your license and upload the updated documents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* License Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            label="License Number"
            value={licenseData.licenseNumber}
            onChange={(value) => handleFieldChange('licenseNumber', value)}
            isEditing={isEditing}
            required
            placeholder="Enter license number"
            error={allErrors.find(e => e.field === 'licenseNumber')?.message}
          />

          <EditableField
            label="Issuing Authority"
            value={licenseData.issuingAuthority}
            onChange={(value) => handleFieldChange('issuingAuthority', value)}
            isEditing={isEditing}
            required
            placeholder="e.g., Medical Council of India"
            error={allErrors.find(e => e.field === 'issuingAuthority')?.message}
          />

          <EditableField
            label="Issue Date"
            type="date"
            value={licenseData.issueDate ? new Date(licenseData.issueDate).toISOString().split('T')[0] : ''}
            onChange={(value) => handleFieldChange('issueDate', value)}
            isEditing={isEditing}
            required
            error={allErrors.find(e => e.field === 'issueDate')?.message}
          />

          <div className="space-y-2">
            <EditableField
              label="Expiry Date"
              type="date"
              value={licenseData.expiryDate ? new Date(licenseData.expiryDate).toISOString().split('T')[0] : ''}
              onChange={(value) => handleFieldChange('expiryDate', value)}
              isEditing={isEditing}
              required
              error={allErrors.find(e => e.field === 'expiryDate')?.message}
            />
            {expiryStatus && (
              <div className={`flex items-center gap-2 text-sm ${expiryStatus.color}`}>
                {expiryStatus.icon}
                {expiryStatus.text}
              </div>
            )}
          </div>
        </div>

        {/* Verification Information */}
        {licenseData.isVerified && licenseData.verificationDate && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  License Verified
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Verified on {new Date(licenseData.verificationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DocumentIcon className="h-5 w-5" />
            License Documents
          </h4>
          
          <DocumentUploader
            value={Array.isArray(licenseData.documents) ? licenseData.documents.map((doc, idx) => ({
              id: doc.id || doc._id || `${idx}`,
              name: doc.fileName || doc.name || `Document ${idx + 1}`,
              size: doc.fileSize || 0,
              type: doc.mimeType || (doc.fileUrl?.endsWith('.pdf') ? 'application/pdf' : undefined),
              url: doc.fileUrl || doc.url,
              status: 'success'
            })) : []}
            onChange={handleDocumentsChange}
            onUpload={handleDocumentUpload}
            onDelete={handleDocumentDelete}
            onPreview={handleDocumentPreview}
            label=""
            accept=".pdf,.jpg,.jpeg,.png"
            maxFiles={3}
            maxFileSize={10 * 1024 * 1024} // 10MB
            allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
            disabled={!isEditable || isSaving}
            required={!licenseData.isVerified}
            uploadText="Upload license documents (PDF or images)"
            className="border-dashed border-2 border-gray-300 dark:border-gray-600"
          />
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload clear images or PDF copies of your medical license. Supported formats: PDF, JPG, PNG. Max file size: 10MB.
          </p>
        </div>

        {/* Error Display */}
        {allErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {allErrors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditable && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || allErrors.length > 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                Edit License Information
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalLicenseSection;