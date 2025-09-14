import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  XMarkIcon,
  EyeIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ShieldCheckIcon,
  TruckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Import the tab components from pharmacy (we can reuse them)
import { MedicationsTab, AIAnalysisTab } from '../Pharmacy/PrescriptionTabs';
import { RiskAssessmentTab, QualityMetricsTab } from '../Pharmacy/RiskQualityTabs';

function DetailedPrescriptionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchPrescriptionDetails();
  }, [id]);

  const fetchPrescriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/prescription-requests/${id}`);
      console.log('✅ Patient prescription details:', response.data);
      setPrescriptionData(response.data.data || response.data);
    } catch (error) {
      console.error('❌ Error fetching prescription details:', error);
      toast.error('Failed to load prescription details');
      // No fallback data - show proper error state
      setPrescriptionData(null);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
    { id: 'medications', name: 'Medications', icon: BeakerIcon },
    { id: 'ai-analysis', name: 'AI Analysis', icon: ShieldCheckIcon },
    { id: 'risk-assessment', name: 'Risk Assessment', icon: ExclamationTriangleIcon },
    { id: 'quality-metrics', name: 'Quality Metrics', icon: StarIcon }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading prescription details...</p>
        </div>
      </div>
    );
  }

  if (!prescriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-950 flex items-center justify-center">
        <div className="text-center p-8">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Prescription Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The prescription you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/patient')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/patient')}
              className="p-2 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                My Prescription Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete information about your prescription request
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescriptionData.status)}`}>
              {prescriptionData.status?.charAt(0).toUpperCase() + prescriptionData.status?.slice(1)}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Prescription Image and Basic Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Image */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Prescription Image
                    </h3>
                    <div className="relative">
                      <img
                        src={prescriptionData.prescriptionImageUrl}
                        alt="Prescription"
                        className="w-full h-96 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setShowImageModal(true)}
                      />
                      <button
                        onClick={() => setShowImageModal(true)}
                        className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      >
                        <EyeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Request Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Patient:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {prescriptionData.patientId?.firstName} {prescriptionData.patientId?.lastName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {new Date(prescriptionData.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <TruckIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                            {prescriptionData.preferences?.deliveryMethod || 'pickup'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <ClockIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Urgency:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                            {prescriptionData.preferences?.urgency || 'normal'}
                          </span>
                        </div>
                      </div>

                      {prescriptionData.preferences?.notes && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">Notes:</span>
                              <p className="text-blue-600 dark:text-blue-400 mt-1">
                                {prescriptionData.preferences.notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Processing Summary */}
                {prescriptionData.aiProcessingResults && (
                  <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />
                      <span>AI Analysis Summary</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {prescriptionData.aiProcessingResults.medications?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Medications</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {prescriptionData.aiProcessingResults.qualityMetrics?.confidence || 0}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">AI Confidence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {prescriptionData.aiProcessingResults.riskAssessment?.overall || 'Low'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Risk Level</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'medications' && prescriptionData.aiProcessingResults && (
              <MedicationsTab data={prescriptionData.aiProcessingResults} />
            )}

            {activeTab === 'ai-analysis' && prescriptionData.aiProcessingResults && (
              <AIAnalysisTab data={prescriptionData.aiProcessingResults} />
            )}

            {activeTab === 'risk-assessment' && prescriptionData.aiProcessingResults && (
              <RiskAssessmentTab data={prescriptionData.aiProcessingResults} />
            )}

            {activeTab === 'quality-metrics' && prescriptionData.aiProcessingResults && (
              <QualityMetricsTab data={prescriptionData.aiProcessingResults} />
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prescription Image
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={prescriptionData.prescriptionImageUrl}
                alt="Prescription"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DetailedPrescriptionView;
