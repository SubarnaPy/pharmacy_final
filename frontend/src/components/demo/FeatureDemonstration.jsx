import React, { useState } from 'react';
import {
  PlayIcon,
  CameraIcon,
  MicrophoneIcon,
  ChartBarIcon,
  HeartIcon,
  UserGroupIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const FeatureDemonstration = ({ userRole = 'patient' }) => {
  const [activeDemo, setActiveDemo] = useState(null);
  const [demoStep, setDemoStep] = useState(0);

  // Feature demonstrations with step-by-step walkthroughs
  const featureDemos = {
    // AR Pill Scanner Demo
    arPillScanner: {
      title: 'AR Pill Scanner',
      icon: CameraIcon,
      description: 'Identify medications using your camera',
      roles: ['patient', 'pharmacist', 'doctor'],
      steps: [
        {
          title: 'Enable Camera Access',
          description: 'Click "Start Camera" and allow camera permission',
          action: 'Grant camera access to begin scanning',
          visual: '📱 Camera Permission Dialog'
        },
        {
          title: 'Position Pills in Frame',
          description: 'Point camera at pills on a clean surface',
          action: 'Ensure good lighting and clear view of pills',
          visual: '📸 Camera viewfinder with pill detection overlay'
        },
        {
          title: 'Automatic Detection',
          description: 'AI identifies pills in real-time',
          action: 'Keep camera steady while AI processes',
          visual: '🎯 AR overlays showing pill identification'
        },
        {
          title: 'View Results',
          description: 'See medication details and interaction warnings',
          action: 'Review identified medications and safety alerts',
          visual: '📊 Detailed results with interaction analysis'
        }
      ]
    },

    // Voice Prescription Demo
    voicePrescription: {
      title: 'Voice-to-Prescription',
      icon: MicrophoneIcon,
      description: 'Create prescriptions using voice commands',
      roles: ['doctor'],
      steps: [
        {
          title: 'Enable Voice Mode',
          description: 'Click "Voice Mode" in prescription creation',
          action: 'Grant microphone access and select language',
          visual: '🎤 Microphone activation dialog'
        },
        {
          title: 'Dictate Prescription',
          description: 'Speak prescription details clearly',
          action: 'Say: "Prescribe Metformin 500mg twice daily with meals"',
          visual: '🗣️ Voice waveform and real-time transcription'
        },
        {
          title: 'AI Processing',
          description: 'AI converts speech to structured prescription',
          action: 'Wait for AI to process and structure the prescription',
          visual: '🤖 AI processing structured prescription data'
        },
        {
          title: 'Review & Confirm',
          description: 'Verify prescription details and send',
          action: 'Review AI-generated prescription and confirm',
          visual: '✅ Structured prescription ready for transmission'
        }
      ]
    },

    // Health Analytics Demo
    healthAnalytics: {
      title: 'Predictive Health Analytics',
      icon: ChartBarIcon,
      description: 'AI-powered health insights and predictions',
      roles: ['patient', 'doctor', 'admin'],
      steps: [
        {
          title: 'Access Dashboard',
          description: 'Navigate to Health Analytics section',
          action: 'Click "Health Analytics" from main menu',
          visual: '📊 Health analytics dashboard overview'
        },
        {
          title: 'View Health Score',
          description: 'See your current health score (85%)',
          action: 'Review overall health assessment',
          visual: '🎯 Health score visualization with trends'
        },
        {
          title: 'Medication Adherence',
          description: 'Track medication adherence patterns',
          action: 'View adherence calendar and recommendations',
          visual: '📅 Adherence calendar with improvement suggestions'
        },
        {
          title: 'AI Insights',
          description: 'Receive personalized health recommendations',
          action: 'Read AI-generated insights and action items',
          visual: '💡 Personalized recommendations and risk alerts'
        }
      ]
    },

    // Symptom Checker Demo
    symptomChecker: {
      title: 'Smart Symptom Checker',
      icon: HeartIcon,
      description: 'AI-powered symptom analysis and recommendations',
      roles: ['patient', 'doctor'],
      steps: [
        {
          title: 'Report Symptoms',
          description: 'Input your current symptoms',
          action: 'Select symptoms: headache, fatigue, mild fever',
          visual: '📝 Symptom input form with severity scales'
        },
        {
          title: 'AI Analysis',
          description: 'AI analyzes symptoms and medical history',
          action: 'Wait for AI to process symptom combination',
          visual: '🧠 AI analysis processing with medical knowledge'
        },
        {
          title: 'Differential Diagnosis',
          description: 'View possible conditions and likelihood',
          action: 'Review AI-suggested possible diagnoses',
          visual: '📋 Ranked list of possible conditions'
        },
        {
          title: 'Treatment Recommendations',
          description: 'Get treatment suggestions and next steps',
          action: 'Follow recommended actions or seek medical care',
          visual: '💊 Treatment recommendations and urgency indicators'
        }
      ]
    },

    // Mental Health Demo
    mentalHealth: {
      title: 'Mental Health Integration',
      icon: ChatBubbleLeftRightIcon,
      description: 'Mood tracking and AI therapy support',
      roles: ['patient', 'doctor'],
      steps: [
        {
          title: 'Daily Mood Check',
          description: 'Log your current mood and stress level',
          action: 'Rate mood (7/10) and stress level (4/10)',
          visual: '😊 Mood selection interface with emoji scales'
        },
        {
          title: 'AI Therapy Chat',
          description: 'Chat with AI therapy assistant',
          action: 'Type: "I\'m feeling anxious about work lately"',
          visual: '💬 Chat interface with supportive AI responses'
        },
        {
          title: 'Mood Correlation',
          description: 'See mood trends vs medication effects',
          action: 'View correlation between medication and mood',
          visual: '📈 Mood trends chart with medication markers'
        },
        {
          title: 'Crisis Support',
          description: 'Access immediate support if needed',
          action: 'AI detects distress and offers crisis resources',
          visual: '🆘 Crisis support resources and emergency contacts'
        }
      ]
    },

    // Gamification Demo
    gamification: {
      title: 'Health Rewards & Challenges',
      icon: TrophyIcon,
      description: 'Gamified health management with rewards',
      roles: ['patient'],
      steps: [
        {
          title: 'Mark Medication Taken',
          description: 'Record that you took your morning medication',
          action: 'Click "Mark as Taken" for Metformin 500mg',
          visual: '✅ Medication checklist with completion animation'
        },
        {
          title: 'Earn Points',
          description: 'Receive points for medication adherence',
          action: '+50 points added to your total (1,250 points)',
          visual: '⭐ Points animation and streak counter'
        },
        {
          title: 'Check Progress',
          description: 'View current challenges and achievements',
          action: 'See "7-day adherence streak" challenge progress',
          visual: '🏆 Progress bars and achievement badges'
        },
        {
          title: 'Redeem Rewards',
          description: 'Use points for health-related rewards',
          action: 'Redeem points for pharmacy discounts',
          visual: '🎁 Rewards catalog with available benefits'
        }
      ]
    },

    // Emergency Network Demo
    emergencyNetwork: {
      title: 'Emergency Prescription Network',
      icon: ExclamationTriangleIcon,
      description: 'Rapid emergency medication access',
      roles: ['patient', 'doctor', 'pharmacist'],
      steps: [
        {
          title: 'Emergency Request',
          description: 'Request emergency medication access',
          action: 'Click "Emergency Help" and select "Medical Emergency"',
          visual: '🚨 Emergency request form with urgency options'
        },
        {
          title: 'Location & Details',
          description: 'Provide location and medication details',
          action: 'Enter: "Need insulin, current location: downtown"',
          visual: '📍 Location map with nearby emergency pharmacies'
        },
        {
          title: 'Network Response',
          description: 'Emergency network coordinates response',
          action: 'Receive list of available emergency pharmacies',
          visual: '🏥 Real-time pharmacy availability and ETA'
        },
        {
          title: 'Rapid Fulfillment',
          description: 'Get medication from emergency pharmacy',
          action: 'Visit designated pharmacy for emergency pickup',
          visual: '⚡ Confirmation and pickup instructions'
        }
      ]
    }
  };

  // Filter demos by user role
  const availableDemos = Object.entries(featureDemos).filter(
    ([_, demo]) => demo.roles.includes(userRole)
  );

  const startDemo = (demoKey) => {
    setActiveDemo(demoKey);
    setDemoStep(0);
  };

  const nextStep = () => {
    const demo = featureDemos[activeDemo];
    if (demoStep < demo.steps.length - 1) {
      setDemoStep(demoStep + 1);
    } else {
      // Demo completed
      setActiveDemo(null);
      setDemoStep(0);
    }
  };

  const prevStep = () => {
    if (demoStep > 0) {
      setDemoStep(demoStep - 1);
    }
  };

  const closeDemo = () => {
    setActiveDemo(null);
    setDemoStep(0);
  };

  if (activeDemo) {
    const demo = featureDemos[activeDemo];
    const currentStep = demo.steps[demoStep];
    const progress = ((demoStep + 1) / demo.steps.length) * 100;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-hidden">
          {/* Demo Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <demo.icon className="h-8 w-8" />
                <div>
                  <h2 className="text-2xl font-bold">{demo.title} Demo</h2>
                  <p className="text-blue-100">{demo.description}</p>
                </div>
              </div>
              <button
                onClick={closeDemo}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Step {demoStep + 1} of {demo.steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-blue-400 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Demo Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Step Instructions */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentStep.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {currentStep.description}
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Your Action:</h4>
                  <p className="text-blue-800">{currentStep.action}</p>
                </div>

                {/* Demo Controls */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={prevStep}
                    disabled={demoStep === 0}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-400 text-gray-700 rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {demoStep === demo.steps.length - 1 ? 'Complete Demo' : 'Next Step'}
                  </button>
                  
                  <button
                    onClick={closeDemo}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Exit Demo
                  </button>
                </div>
              </div>

              {/* Visual Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">What You'll See:</h4>
                <div className="bg-gray-100 rounded-lg p-6 text-center min-h-64 flex items-center justify-center">
                  <div className="text-gray-600">
                    <div className="text-4xl mb-4">{currentStep.visual.split(' ')[0]}</div>
                    <p className="text-lg font-medium">{currentStep.visual}</p>
                    <p className="text-sm mt-2 opacity-75">
                      Interactive demo simulation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-demonstration bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Feature Demonstrations</h2>
        <p className="text-green-100">
          Interactive walkthroughs showing how to use each advanced healthcare feature
        </p>
      </div>

      {/* Demo Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableDemos.map(([key, demo]) => {
            const IconComponent = demo.icon;
            
            return (
              <div
                key={key}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{demo.title}</h3>
                    <p className="text-sm text-gray-600">{demo.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">
                    {demo.steps.length} steps • ~3 min walkthrough
                  </p>
                  <div className="text-xs text-gray-600">
                    Available for: {demo.roles.join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => startDemo(key)}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Start Demo</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">About These Demonstrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎯 Interactive Learning</h4>
              <p>Step-by-step walkthroughs that simulate real feature usage with guided instructions.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🛡️ Safe Environment</h4>
              <p>Practice using features without affecting real data or medical information.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📚 Complete Coverage</h4>
              <p>Demos available for all 12 advanced healthcare features based on your user role.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureDemonstration;