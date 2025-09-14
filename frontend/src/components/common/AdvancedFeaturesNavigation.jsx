import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  MicrophoneIcon,
  CameraIcon,
  BeakerIcon,
  HeartIcon,
  UserGroupIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const AdvancedFeaturesNavigation = ({ userRole, userProfile, className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFeature, setActiveFeature] = useState(null);
  const [featuresStatus, setFeaturesStatus] = useState({});
  const [quickStats, setQuickStats] = useState({});

  // Define features with access control
  const advancedFeatures = {
    // Health Analytics & Insights
    healthAnalytics: {
      id: 'health-analytics',
      title: 'Health Analytics',
      subtitle: 'AI-powered health insights',
      icon: ChartBarIcon,
      color: 'blue',
      route: '/health-analytics',
      roles: ['patient', 'doctor', 'admin'],
      quickAction: 'View Dashboard',
      description: 'Predictive health analytics with medication adherence tracking'
    },

    // Voice Technology
    voicePrescription: {
      id: 'voice-prescription',
      title: 'Voice Prescription',
      subtitle: 'Multi-language voice dictation',
      icon: MicrophoneIcon,
      color: 'purple',
      route: '/voice-prescription',
      roles: ['doctor', 'admin'],
      quickAction: 'Start Dictation',
      description: 'Advanced voice-to-prescription with authentication'
    },

    // AR & Computer Vision
    arPillScanner: {
      id: 'ar-pills',
      title: 'AR Pill Scanner',
      subtitle: 'Camera-based pill identification',
      icon: CameraIcon,
      color: 'green',
      route: '/ar-pill-scanner',
      roles: ['patient', 'pharmacist', 'doctor'],
      quickAction: 'Scan Pills',
      description: 'Augmented reality pill identification with drug interactions'
    },

    // AI Drug Discovery
    drugDiscovery: {
      id: 'drug-discovery',
      title: 'Drug Discovery',
      subtitle: 'AI-powered alternatives',
      icon: BeakerIcon,
      color: 'indigo',
      route: '/drug-discovery',
      roles: ['doctor', 'pharmacist', 'admin'],
      quickAction: 'Find Alternatives',
      description: 'Alternative medications and personalized medicine recommendations'
    },

    // Symptom Analysis
    symptomChecker: {
      id: 'symptom-checker',
      title: 'Smart Symptoms',
      subtitle: 'AI symptom analysis',
      icon: HeartIcon,
      color: 'red',
      route: '/symptom-checker',
      roles: ['patient', 'doctor'],
      quickAction: 'Check Symptoms',
      description: 'Smart symptom checker with treatment mapping'
    },

    // Community & Support
    peerSupport: {
      id: 'peer-support',
      title: 'Peer Support',
      subtitle: 'Community connections',
      icon: UserGroupIcon,
      color: 'pink',
      route: '/peer-support',
      roles: ['patient'],
      quickAction: 'Join Community',
      description: 'Connect with patients having similar conditions'
    },

    // Gamification
    healthRewards: {
      id: 'health-rewards',
      title: 'Health Rewards',
      subtitle: 'Gamified wellness',
      icon: TrophyIcon,
      color: 'yellow',
      route: '/health-rewards',
      roles: ['patient'],
      quickAction: 'View Rewards',
      description: 'Medication adherence rewards and health challenges'
    },

    // Emergency Services
    emergencyNetwork: {
      id: 'emergency-network',
      title: 'Emergency Help',
      subtitle: 'Rapid prescription access',
      icon: ExclamationTriangleIcon,
      color: 'red',
      route: '/emergency',
      roles: ['patient', 'doctor', 'pharmacist', 'admin'],
      quickAction: 'Get Help',
      description: 'Emergency prescription network and disaster response'
    },

    // Drug Interactions
    drugInteractions: {
      id: 'drug-interactions',
      title: 'Drug Interactions',
      subtitle: 'Advanced safety checks',
      icon: ShieldCheckIcon,
      color: 'orange',
      route: '/drug-interactions',
      roles: ['patient', 'doctor', 'pharmacist'],
      quickAction: 'Check Safety',
      description: 'AI-powered drug interaction predictor with food interactions'
    },

    // IoT Integration
    iotIntegration: {
      id: 'iot-integration',
      title: 'Smart Devices',
      subtitle: 'Connected health',
      icon: DevicePhoneMobileIcon,
      color: 'cyan',
      route: '/iot-devices',
      roles: ['patient', 'doctor'],
      quickAction: 'Connect Devices',
      description: 'Smart medication dispensers and wearable integration'
    },

    // Mental Health
    mentalHealth: {
      id: 'mental-health',
      title: 'Mental Wellness',
      subtitle: 'AI therapy & mood tracking',
      icon: ChatBubbleLeftRightIcon,
      color: 'teal',
      route: '/mental-health',
      roles: ['patient', 'doctor'],
      quickAction: 'Track Mood',
      description: 'Mental health integration with AI therapy chatbot'
    },

    // AI Assistant
    aiAssistant: {
      id: 'ai-assistant',
      title: 'AI Health Assistant',
      subtitle: 'Intelligent health queries',
      icon: SparklesIcon,
      color: 'violet',
      route: '/ai-assistant',
      roles: ['patient', 'doctor', 'pharmacist'],
      quickAction: 'Ask AI',
      description: 'Comprehensive AI health assistant for intelligent queries'
    }
  };

  // Filter features based on user role
  const availableFeatures = Object.values(advancedFeatures).filter(
    feature => feature.roles.includes(userRole)
  );

  // Get color classes for styling
  const getColorClasses = (color, variant = 'default') => {
    const colorMap = {
      blue: {
        default: 'bg-blue-100 text-blue-800 border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: 'text-blue-600'
      },
      purple: {
        default: 'bg-purple-100 text-purple-800 border-purple-200',
        button: 'bg-purple-600 hover:bg-purple-700 text-white',
        icon: 'text-purple-600'
      },
      green: {
        default: 'bg-green-100 text-green-800 border-green-200',
        button: 'bg-green-600 hover:bg-green-700 text-white',
        icon: 'text-green-600'
      },
      red: {
        default: 'bg-red-100 text-red-800 border-red-200',
        button: 'bg-red-600 hover:bg-red-700 text-white',
        icon: 'text-red-600'
      },
      indigo: {
        default: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        icon: 'text-indigo-600'
      },
      pink: {
        default: 'bg-pink-100 text-pink-800 border-pink-200',
        button: 'bg-pink-600 hover:bg-pink-700 text-white',
        icon: 'text-pink-600'
      },
      yellow: {
        default: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        icon: 'text-yellow-600'
      },
      orange: {
        default: 'bg-orange-100 text-orange-800 border-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700 text-white',
        icon: 'text-orange-600'
      },
      cyan: {
        default: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        button: 'bg-cyan-600 hover:bg-cyan-700 text-white',
        icon: 'text-cyan-600'
      },
      teal: {
        default: 'bg-teal-100 text-teal-800 border-teal-200',
        button: 'bg-teal-600 hover:bg-teal-700 text-white',
        icon: 'text-teal-600'
      },
      violet: {
        default: 'bg-violet-100 text-violet-800 border-violet-200',
        button: 'bg-violet-600 hover:bg-violet-700 text-white',
        icon: 'text-violet-600'
      }
    };
    return colorMap[color]?.[variant] || colorMap.blue[variant];
  };

  // Handle feature navigation
  const handleFeatureClick = (feature) => {
    setActiveFeature(feature.id);
    navigate(feature.route);
  };

  // Quick action handlers
  const handleQuickAction = (feature) => {
    switch (feature.id) {
      case 'health-analytics':
        navigate('/health-analytics/dashboard');
        break;
      case 'voice-prescription':
        navigate('/prescriptions/create?mode=voice');
        break;
      case 'ar-pills':
        navigate('/ar-pill-scanner?mode=scan');
        break;
      case 'emergency-network':
        navigate('/emergency?type=medical');
        break;
      default:
        navigate(feature.route);
    }
  };

  // Load feature status and stats
  useEffect(() => {
    // This would typically load from your API
    setFeaturesStatus({
      'health-analytics': { available: true, newInsights: 3 },
      'voice-prescription': { available: true, templates: 12 },
      'ar-pills': { available: true, scans: 45 },
      'emergency-network': { available: true, requests: 2 },
      'mental-health': { available: true, sessions: 8 }
    });

    setQuickStats({
      healthScore: 85,
      adherenceRate: 92,
      activeAlerts: 1,
      completedChallenges: 3
    });
  }, []);

  return (
    <div className={`advanced-features-navigation bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Advanced Health Features</h2>
            <p className="text-blue-100 mt-1">
              AI-powered healthcare tools for {userRole === 'patient' ? 'patients' : userRole + 's'}
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            {userRole === 'patient' && (
              <>
                <div>
                  <div className="text-2xl font-bold">{quickStats.healthScore}%</div>
                  <div className="text-xs text-blue-100">Health Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{quickStats.adherenceRate}%</div>
                  <div className="text-xs text-blue-100">Adherence</div>
                </div>
              </>
            )}
            {(userRole === 'doctor' || userRole === 'admin') && (
              <>
                <div>
                  <div className="text-2xl font-bold">{quickStats.activeAlerts}</div>
                  <div className="text-xs text-blue-100">Active Alerts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-xs text-blue-100">AI Support</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="flex space-x-3">
            {/* Emergency Button */}
            <button
              onClick={() => handleQuickAction(advancedFeatures.emergencyNetwork)}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Emergency</span>
            </button>

            {/* Role-specific quick actions */}
            {userRole === 'patient' && (
              <>
                <button
                  onClick={() => handleQuickAction(advancedFeatures.arPillScanner)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <CameraIcon className="h-4 w-4" />
                  <span>Scan Pill</span>
                </button>
                <button
                  onClick={() => handleQuickAction(advancedFeatures.mentalHealth)}
                  className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  <span>Track Mood</span>
                </button>
              </>
            )}

            {userRole === 'doctor' && (
              <>
                <button
                  onClick={() => handleQuickAction(advancedFeatures.voicePrescription)}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <MicrophoneIcon className="h-4 w-4" />
                  <span>Voice Rx</span>
                </button>
                <button
                  onClick={() => handleQuickAction(advancedFeatures.healthAnalytics)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Analytics</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableFeatures.map((feature) => {
            const IconComponent = feature.icon;
            const isActive = activeFeature === feature.id;
            const status = featuresStatus[feature.id] || {};

            return (
              <div
                key={feature.id}
                className={`relative bg-white border-2 rounded-lg p-6 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                  isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleFeatureClick(feature)}
              >
                {/* Feature Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(feature.color, 'default')}`}>
                    <IconComponent className={`h-6 w-6 ${getColorClasses(feature.color, 'icon')}`} />
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center space-x-2">
                    {status.available && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                    {status.newInsights && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {status.newInsights}
                      </span>
                    )}
                  </div>
                </div>

                {/* Feature Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {feature.subtitle}
                  </p>
                  <p className="text-xs text-gray-500">
                    {feature.description}
                  </p>
                </div>

                {/* Feature Stats */}
                {status.scans && (
                  <div className="mb-4 text-xs text-gray-600">
                    <span className="font-medium">{status.scans}</span> scans completed
                  </div>
                )}
                {status.templates && (
                  <div className="mb-4 text-xs text-gray-600">
                    <span className="font-medium">{status.templates}</span> templates available
                  </div>
                )}
                {status.sessions && (
                  <div className="mb-4 text-xs text-gray-600">
                    <span className="font-medium">{status.sessions}</span> therapy sessions
                  </div>
                )}

                {/* Quick Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAction(feature);
                  }}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getColorClasses(feature.color, 'button')}`}
                >
                  {feature.quickAction}
                </button>

                {/* New Feature Badge */}
                {feature.id === 'ai-assistant' && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    NEW
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Cog6ToothIcon className="h-4 w-4" />
              <span>All features are AI-powered and HIPAA compliant</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              📚 User Guide
            </button>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              🎥 Video Tutorials
            </button>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              💬 Get Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeaturesNavigation;