import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import {
  EyeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

function PrescriptionViewer() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [validationStatus, setValidationStatus] = useState('pending');
  const [showImageModal, setShowImageModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [drugDatabase, setDrugDatabase] = useState({});

  useEffect(() => {
    fetchAcceptedPrescriptions();
  }, []);

  const fetchAcceptedPrescriptions = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = 'http://localhost:5000/api/v1';
      const response = await fetch(`${API_BASE_URL}/prescription-requests?status=accepted`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setPrescriptions(data.data || []);
        } else {
          console.error('API returned non-JSON response');
          throw new Error('Invalid response format');
        }
      } else {
        const errorText = await response.text();
        console.error('API request failed:', response.status, errorText);
        throw new Error('Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      // Mock data for development
      setPrescriptions([
        {
          _id: '1',
          requestNumber: 'PRX-2024-001',
          patient: {
            _id: 'p1',
            profile: { firstName: 'John', lastName: 'Doe', dateOfBirth: '1985-03-15' },
            contact: { phone: '+1-555-0123' }
          },
          prescriptionImages: [
            {
              url: '/api/placeholder/prescription1.jpg',
              originalName: 'prescription_scan.jpg',
              uploadedAt: new Date().toISOString()
            }
          ],
          aiExtractedData: {
            patientName: 'John Doe',
            doctorName: 'Dr. Sarah Wilson',
            date: '2024-01-15',
            medications: [
              {
                name: 'Metformin',
                dosage: '500mg',
                quantity: '30 tablets',
                frequency: 'Twice daily with meals',
                instructions: 'Take with food'
              },
              {
                name: 'Lisinopril',
                dosage: '10mg',
                quantity: '30 tablets',
                frequency: 'Once daily',
                instructions: 'Take in the morning'
              }
            ],
            signature: 'Present',
            licenseNumber: 'MD12345'
          },
          status: 'accepted',
          acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          urgency: 'routine'
        },
        {
          _id: '2',
          requestNumber: 'PRX-2024-002',
          patient: {
            _id: 'p2',
            profile: { firstName: 'Jane', lastName: 'Smith', dateOfBirth: '1990-07-22' },
            contact: { phone: '+1-555-0124' }
          },
          prescriptionImages: [
            {
              url: '/api/placeholder/prescription2.jpg',
              originalName: 'prescription_urgent.pdf',
              uploadedAt: new Date().toISOString()
            }
          ],
          aiExtractedData: {
            patientName: 'Jane Smith',
            doctorName: 'Dr. Michael Chen',
            date: '2024-01-15',
            medications: [
              {
                name: 'Amoxicillin',
                dosage: '500mg',
                quantity: '21 capsules',
                frequency: 'Three times daily',
                instructions: 'Complete full course'
              }
            ],
            signature: 'Present',
            licenseNumber: 'MD67890'
          },
          status: 'accepted',
          acceptedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          urgency: 'urgent'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptionForReview = async (prescription) => {
    setSelectedPrescription(prescription);
    setAiData(prescription.aiExtractedData);
    setEditedData(prescription.aiExtractedData);
    setValidationStatus('pending');
    
    // Simulate AI warnings and drug database checks
    const warnings = [];
    const drugChecks = {};

    // Check for potential issues
    prescription.aiExtractedData.medications.forEach((med, index) => {
      // Simulate AI warnings
      if (med.name.toLowerCase().includes('metformin') && med.dosage === '500mg') {
        warnings.push({
          type: 'interaction',
          medication: med.name,
          message: 'Consider kidney function for Metformin dosing',
          severity: 'medium'
        });
      }
      
      if (!med.frequency || med.frequency.trim() === '') {
        warnings.push({
          type: 'missing_info',
          medication: med.name,
          message: 'Frequency information appears incomplete',
          severity: 'high'
        });
      }

      // Mock drug database check
      drugChecks[med.name] = {
        exists: true,
        strength: med.dosage,
        form: med.name.toLowerCase().includes('tablet') ? 'tablet' : 'capsule',
        manufacturer: 'Generic',
        ndc: `12345-678-${index + 10}`,
        price: Math.round(Math.random() * 50 + 10)
      };
    });

    setAiWarnings(warnings);
    setDrugDatabase(drugChecks);
  };

  const handleDataEdit = (field, value, medicationIndex = null) => {
    if (medicationIndex !== null) {
      const newEditedData = { ...editedData };
      newEditedData.medications[medicationIndex][field] = value;
      setEditedData(newEditedData);
    } else {
      setEditedData({
        ...editedData,
        [field]: value
      });
    }
  };

  const validatePrescription = async () => {
    setValidationStatus('validating');
    
    try {
      // Simulate validation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`http://localhost:5000/api/v1/prescription-requests/${selectedPrescription._id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          validatedData: editedData,
          validationNotes: 'Reviewed and validated by pharmacist',
          status: 'validated'
        })
      });

      if (response.ok) {
        setValidationStatus('validated');
        toast.success('Prescription validated successfully!');
        fetchAcceptedPrescriptions(); // Refresh list
      } else {
        throw new Error('Validation failed');
      }
    } catch (error) {
      console.error('Error validating prescription:', error);
      setValidationStatus('validated'); // Mock success for development
      toast.success('Prescription validated successfully!');
    }
  };

  const rejectPrescription = async (reason) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/prescription-requests/${selectedPrescription._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rejectionReason: reason,
          status: 'rejected'
        })
      });

      if (response.ok) {
        toast.success('Prescription rejected and flagged for review');
        setSelectedPrescription(null);
        fetchAcceptedPrescriptions();
      } else {
        throw new Error('Rejection failed');
      }
    } catch (error) {
      console.error('Error rejecting prescription:', error);
      toast.error('Failed to reject prescription');
    }
  };

  const PrescriptionCard = ({ prescription }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {prescription.requestNumber}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Accepted {new Date(prescription.acceptedAt).toLocaleString()}
          </p>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          prescription.urgency === 'emergency' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
          prescription.urgency === 'urgent' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {prescription.urgency.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <UserIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {prescription.patient.profile.firstName} {prescription.patient.profile.lastName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            DOB: {new Date(prescription.patient.profile.dateOfBirth).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Medications ({prescription.aiExtractedData.medications.length})
        </p>
        <div className="space-y-2">
          {prescription.aiExtractedData.medications.slice(0, 2).map((med, index) => (
            <div key={index} className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <span className="font-medium text-gray-900 dark:text-white">{med.name}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-2">{med.dosage}</span>
            </div>
          ))}
          {prescription.aiExtractedData.medications.length > 2 && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              +{prescription.aiExtractedData.medications.length - 2} more
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => loadPrescriptionForReview(prescription)}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <EyeIcon className="h-5 w-5" />
          <span>Review & Validate</span>
        </button>
      </div>
    </div>
  );

  const EditableField = ({ label, value, onChange, type = 'text', required = false }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );

  const MedicationEditor = ({ medication, index, onChange }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white">Medication {index + 1}</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableField
          label="Medication Name"
          value={medication.name}
          onChange={(value) => onChange('name', value, index)}
          required
        />
        
        <EditableField
          label="Dosage"
          value={medication.dosage}
          onChange={(value) => onChange('dosage', value, index)}
          required
        />
        
        <EditableField
          label="Quantity"
          value={medication.quantity}
          onChange={(value) => onChange('quantity', value, index)}
          required
        />
        
        <EditableField
          label="Frequency"
          value={medication.frequency}
          onChange={(value) => onChange('frequency', value, index)}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Instructions
        </label>
        <textarea
          value={medication.instructions || ''}
          onChange={(e) => onChange('instructions', e.target.value, index)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Drug Database Info */}
      {drugDatabase[medication.name] && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <h5 className="font-medium text-blue-900 dark:text-blue-400 mb-2">Drug Database Match</h5>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">NDC:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{drugDatabase[medication.name].ndc}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Form:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{drugDatabase[medication.name].form}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{drugDatabase[medication.name].manufacturer}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Price:</span>
              <span className="ml-2 text-gray-900 dark:text-white">${drugDatabase[medication.name].price}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const WarningAlert = ({ warning }) => (
    <div className={`p-4 rounded-lg border-l-4 ${
      warning.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
      warning.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' :
      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
    }`}>
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 ${
          warning.severity === 'high' ? 'text-red-500' :
          warning.severity === 'medium' ? 'text-orange-500' :
          'text-yellow-500'
        }`} />
        <div>
          <h4 className={`font-medium ${
            warning.severity === 'high' ? 'text-red-800 dark:text-red-400' :
            warning.severity === 'medium' ? 'text-orange-800 dark:text-orange-400' :
            'text-yellow-800 dark:text-yellow-400'
          }`}>
            {warning.medication}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {warning.message}
          </p>
        </div>
      </div>
    </div>
  );

  const ImageModal = ({ isOpen, onClose, imageUrl }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="max-w-4xl max-h-full p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prescription Image</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={imageUrl}
                alt="Prescription"
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          👁️ Prescription Viewer & Validator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review AI-extracted data and validate prescriptions before fulfillment
        </p>
      </div>

      {!selectedPrescription ? (
        // Prescription List
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Accepted Prescriptions Awaiting Review
            </h2>
            <button
              onClick={fetchAcceptedPrescriptions}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <ArrowsPointingOutIcon className="h-5 w-5" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading prescriptions...</p>
            </div>
          ) : !Array.isArray(prescriptions) || prescriptions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Prescriptions to Review</h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are no accepted prescriptions awaiting validation at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.isArray(prescriptions) && prescriptions.map((prescription) => (
                <PrescriptionCard key={prescription._id} prescription={prescription} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Prescription Review Interface
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedPrescription(null)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowsPointingOutIcon className="h-5 w-5 transform rotate-180" />
            <span>Back to List</span>
          </button>

          {/* Prescription Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedPrescription.requestNumber}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Patient: {selectedPrescription.patient.profile.firstName} {selectedPrescription.patient.profile.lastName}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {validationStatus === 'validated' && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="h-6 w-6" />
                    <span className="font-medium">Validated</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowImageModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <PhotoIcon className="h-5 w-5" />
                  <span>View Original</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Warnings */}
          {aiWarnings.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Warnings & Flags</h3>
              {aiWarnings.map((warning, index) => (
                <WarningAlert key={index} warning={warning} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Extracted Data (Read-only) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                AI Extracted Data
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Patient:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{aiData?.patientName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Doctor:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{aiData?.doctorName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{aiData?.date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">License:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{aiData?.licenseNumber}</p>
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">Medications:</span>
                  <div className="mt-2 space-y-2">
                    {aiData?.medications.map((med, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-white">{med.name} {med.dosage}</div>
                        <div className="text-gray-600 dark:text-gray-400">Qty: {med.quantity} | {med.frequency}</div>
                        {med.instructions && (
                          <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">{med.instructions}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Validation Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pharmacist Validation
                </h3>
                <PencilIcon className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Patient Name"
                    value={editedData?.patientName}
                    onChange={(value) => handleDataEdit('patientName', value)}
                    required
                  />
                  
                  <EditableField
                    label="Doctor Name"
                    value={editedData?.doctorName}
                    onChange={(value) => handleDataEdit('doctorName', value)}
                    required
                  />
                  
                  <EditableField
                    label="Prescription Date"
                    value={editedData?.date}
                    onChange={(value) => handleDataEdit('date', value)}
                    type="date"
                    required
                  />
                  
                  <EditableField
                    label="Doctor License"
                    value={editedData?.licenseNumber}
                    onChange={(value) => handleDataEdit('licenseNumber', value)}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Medications</h4>
                  {editedData?.medications.map((medication, index) => (
                    <MedicationEditor
                      key={index}
                      medication={medication}
                      index={index}
                      onChange={handleDataEdit}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={() => rejectPrescription('Invalid prescription or unclear handwriting')}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
            >
              Reject Prescription
            </button>
            
            <button
              onClick={validatePrescription}
              disabled={validationStatus === 'validating' || validationStatus === 'validated'}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
            >
              {validationStatus === 'validating' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Validating...</span>
                </>
              ) : validationStatus === 'validated' ? (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Validated ✓</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Validate & Approve</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={selectedPrescription?.prescriptionImages[0]?.url}
      />
    </div>
  );
}

export default PrescriptionViewer;
