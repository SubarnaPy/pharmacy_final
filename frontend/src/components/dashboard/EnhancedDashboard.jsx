import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  MicrophoneIcon, 
  ChartBarIcon, 
  CameraIcon, 
  BeakerIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import AdvancedFeaturesNavigation from '../common/AdvancedFeaturesNavigation';

// Import advanced feature components
import VoiceToPrescription from '../doctor/VoiceToPrescription';
// import ARPillScanner from '../Patient/ARPillScanner';

// Placeholder components for missing features
const SymptomCheckerComponent = ({ user }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">AI Symptom Checker</h3>
    <p className="text-gray-600">Advanced symptom analysis coming soon...</p>
  </div>
);

const HealthAnalyticsComponent = ({ user, data }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Health Analytics</h3>
    <p className="text-gray-600">AI-powered health insights coming soon...</p>
  </div>
);

const GamificationComponent = ({ user }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Health Challenges</h3>
    <p className="text-gray-600">Gamified health features coming soon...</p>
  </div>
);

const MoodTrackerComponent = ({ user }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Mood Tracker</h3>
    <p className="text-gray-600">AI mood analysis coming soon...</p>
  </div>
);

const EmergencyAccessComponent = ({ user }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Emergency Access</h3>
    <p className="text-gray-600">Emergency services integration coming soon...</p>
  </div>
);

const DrugDiscoveryComponent = ({ user }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Drug Discovery</h3>
    <p className="text-gray-600">AI drug discovery tools coming soon...</p>
  </div>
);

const ARPillScanner = ({ userMedications, onPillIdentified }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">AR Pill Scanner</h3>
    <p className="text-gray-600">Augmented reality pill identification coming soon...</p>
  </div>
);

// Mock Advanced Health API Service
const advancedHealthAPI = {
  generateAnalytics: async (userId) => ({ data: { overallHealthScore: 85, adherenceScore: 92 } }),
  getDoctorOverview: async (userId) => ({ data: { patientCount: 45, consultationsToday: 12 } })
};

const EnhancedDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const [activeFeature, setActiveFeature] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load user-specific health data
  useEffect(() => {
    loadHealthData();
  }, [user]);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      // Load different data based on user role
      if (user.role === 'patient') {
        // Load patient health analytics
        const analytics = await advancedHealthAPI.generateAnalytics(user.id);
        setHealthData(analytics.data);
      } else if (user.role === 'doctor') {
        // Load doctor's patient overview
        const overview = await advancedHealthAPI.getDoctorOverview(user.id);
        setHealthData(overview.data);
      }
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureSelect = (feature) => {
    setActiveFeature(feature);
  };

  const renderFeatureComponent = () => {
    if (!activeFeature) return null;

    switch (activeFeature.id) {
      case 'voice-prescription':
        return (
          <VoiceToPrescription 
            doctorProfile={user}
            onPrescriptionGenerated={(prescription) => {
              console.log('Prescription generated:', prescription);
              // Handle prescription creation
            }}
          />
        );

      case 'pill-scanner':
        return (
          <ARPillScanner 
            userMedications={user.medications || []}
            onPillIdentified={(result) => {
              console.log('Pill identified:', result);
              // Handle pill identification
            }}
          />
        );

      case 'symptom-checker':
        return <SymptomCheckerComponent user={user} />;

      case 'health-analytics':
        return <HealthAnalyticsComponent user={user} data={healthData} />;

      case 'health-challenges':
        return <GamificationComponent user={user} />;

      case 'mood-tracker':
        return <MoodTrackerComponent user={user} />;

      case 'emergency-access':
        return <EmergencyAccessComponent user={user} />;

      case 'drug-discovery':
        return <DrugDiscoveryComponent user={user} />;

      default:
        return <div>Feature not implemented yet</div>;
    }
  };

  return (
    <div className="enhanced-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.role === 'doctor' && 'AI Medical Tools'}
                {user?.role === 'patient' && 'AI Health Features'}
                {user?.role === 'pharmacy' && 'AI Pharmacy Tools'}
                {user?.role === 'admin' && 'AI Admin Tools'}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.profile?.firstName || user?.name || 'User'}! Explore our new AI-powered features.
              </p>
            </div>
            
            {/* Quick Stats */}
            {user?.role === 'patient' && healthData && (
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {healthData.overallHealthScore || '--'}
                  </div>
                  <div className="text-xs text-gray-600">Health Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {healthData.adherenceScore || '--'}%
                  </div>
                  <div className="text-xs text-gray-600">Adherence</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Advanced Features Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <AdvancedFeaturesNavigation 
                userRole={user?.role}
                userData={user}
                onFeatureSelect={handleFeatureSelect}
              />
            </div>

            {/* Traditional Features Quick Access */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4">Traditional Features</h3>
              <div className="space-y-2">
                {user?.role === 'doctor' && (
                  <>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      📋 View Patients
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      📝 Create Prescription
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      📅 Appointments
                    </button>
                  </>
                )}
                
                {user?.role === 'patient' && (
                  <>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      💊 My Prescriptions
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      🏥 Find Pharmacies
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                      📅 My Appointments
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeFeature ? (
              <div className="bg-white rounded-lg shadow-sm border">
                {/* Feature Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`${activeFeature.color} p-2 rounded-lg`}>
                        <activeFeature.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">
                          {activeFeature.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {activeFeature.description}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveFeature(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Feature Content */}
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading AI feature...</span>
                    </div>
                  ) : (
                    renderFeatureComponent()
                  )}
                </div>
              </div>
            ) : (
              /* Welcome/Overview Content */
              <div className="space-y-6">
                {/* AI Features Overview */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <SparklesIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">AI-Powered Healthcare Platform</h2>
                      <p className="text-blue-100">
                        Experience the future of healthcare with our advanced AI features
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/10 rounded-lg p-4">
                      <h3 className="font-medium mb-2">🎤 Voice Technology</h3>
                      <p className="text-sm text-blue-100">
                        Dictate prescriptions naturally with AI assistance
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <h3 className="font-medium mb-2">📸 AR Recognition</h3>
                      <p className="text-sm text-blue-100">
                        Identify pills and check interactions instantly
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <h3 className="font-medium mb-2">🧠 Mental Health</h3>
                      <p className="text-sm text-blue-100">
                        AI therapy assistant and mood tracking
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <h3 className="font-medium mb-2">📊 Predictive Analytics</h3>
                      <p className="text-sm text-blue-100">
                        Health insights and risk predictions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user?.role === 'doctor' && (
                      <>
                        <button 
                          onClick={() => handleFeatureSelect({ id: 'voice-prescription', name: 'Voice Prescription' })}
                          className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <MicrophoneIcon className="h-8 w-8 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">Start Voice Dictation</div>
                              <div className="text-sm text-gray-600">Create prescriptions by speaking</div>
                            </div>
                          </div>
                        </button>
                        <button className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition-colors">
                          <div className="flex items-center space-x-3">
                            <ChartBarIcon className="h-8 w-8 text-purple-600" />
                            <div>
                              <div className="font-medium text-gray-900">View Analytics</div>
                              <div className="text-sm text-gray-600">Patient health insights</div>
                            </div>
                          </div>
                        </button>
                      </>
                    )}

                    {user?.role === 'patient' && (
                      <>
                        <button 
                          onClick={() => handleFeatureSelect({ id: 'pill-scanner', name: 'AR Pill Scanner' })}
                          className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-4 text-left transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <CameraIcon className="h-8 w-8 text-indigo-600" />
                            <div>
                              <div className="font-medium text-gray-900">Scan Pills</div>
                              <div className="text-sm text-gray-600">Identify medications with AR</div>
                            </div>
                          </div>
                        </button>
                        <button className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors">
                          <div className="flex items-center space-x-3">
                            <BeakerIcon className="h-8 w-8 text-green-600" />
                            <div>
                              <div className="font-medium text-gray-900">Check Symptoms</div>
                              <div className="text-sm text-gray-600">Get AI health advice</div>
                            </div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Activity / Health Summary */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {user?.role === 'patient' ? 'Health Summary' : 'Recent Activity'}
                  </h3>
                  
                  {user?.role === 'patient' && healthData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {healthData.overallHealthScore || 0}
                        </div>
                        <div className="text-sm text-gray-600">Overall Health Score</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {healthData.adherenceScore || 0}%
                        </div>
                        <div className="text-sm text-gray-600">Medication Adherence</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {healthData.totalPoints || 0}
                        </div>
                        <div className="text-sm text-gray-600">Health Points</div>
                      </div>
                    </div>
                  )}

                  {!healthData && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Start using our AI features to see your health insights here!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;