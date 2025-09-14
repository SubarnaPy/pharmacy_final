import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  MicrophoneIcon,
  CameraIcon,
  BeakerIcon,
  HeartIcon,
  UserGroupIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import AdvancedFeaturesNavigation from './AdvancedFeaturesNavigation';

const EnhancedDashboard = ({ userRole, userProfile }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [quickStats, setQuickStats] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, [userRole, userProfile]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load real data from API
      const response = await fetch(`/api/dashboard/${userRole}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data || {});
        setQuickStats(data.stats || {});
        setRecentActivity(data.activity || []);
        setActiveAlerts(data.alerts || []);
      } else {
        console.error('Failed to load dashboard data');
        // No fallback data - show empty state
        setDashboardData({});
        setQuickStats({});
        setRecentActivity([]);
        setActiveAlerts([]);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action handlers
  const quickActions = {
    scanPill: () => navigate('/ar-pill-scanner?mode=scan'),
    voicePrescription: () => navigate('/prescriptions/create?mode=voice'),
    checkSymptoms: () => navigate('/symptom-checker'),
    viewAnalytics: () => navigate('/health-analytics/dashboard'),
    emergencyHelp: () => navigate('/emergency?type=medical'),
    trackMood: () => navigate('/mental-health/mood'),
    joinCommunity: () => navigate('/peer-support/community'),
    viewRewards: () => navigate('/health-rewards'),
    aiAssistant: () => navigate('/ai-assistant')
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userProfile?.name || 'User'}
              </h1>
              <p className="text-gray-600 mt-1">
                {userRole === 'patient' ? 'Your health journey continues' : 
                 userRole === 'doctor' ? 'Manage your patients with AI-powered insights' :
                 userRole === 'pharmacist' ? 'Ensure medication safety and accuracy' :
                 'System overview and administration'}
              </p>
            </div>
            
            {/* Quick Actions Bar */}
            <div className="flex items-center space-x-3">
              {userRole === 'patient' && (
                <>
                  <button
                    onClick={quickActions.scanPill}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <CameraIcon className="h-4 w-4" />
                    <span>Scan Pill</span>
                  </button>
                  <button
                    onClick={quickActions.trackMood}
                    className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <HeartIcon className="h-4 w-4" />
                    <span>Track Mood</span>
                  </button>
                </>
              )}
              
              {userRole === 'doctor' && (
                <>
                  <button
                    onClick={quickActions.voicePrescription}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MicrophoneIcon className="h-4 w-4" />
                    <span>Voice Rx</span>
                  </button>
                  <button
                    onClick={quickActions.viewAnalytics}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Analytics</span>
                  </button>
                </>
              )}
              
              <button
                onClick={quickActions.emergencyHelp}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Emergency</span>
              </button>
              
              <button
                onClick={quickActions.aiAssistant}
                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <SparklesIcon className="h-4 w-4" />
                <span>AI Assistant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <BellIcon className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
              </div>
              <div className="space-y-2">
                {activeAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <p className="text-gray-800">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userRole === 'patient' && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Health Score</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.healthScore}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Adherence Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.adherenceRate}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <TrophyIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Reward Points</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.rewardPoints}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <HeartIcon className="h-8 w-8 text-pink-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Mood Trend</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">{quickStats.moodTrend}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {userRole === 'doctor' && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.totalPatients}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">High-Risk Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.highriskPatients}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <SparklesIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">AI Insights</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.aiInsights}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <MicrophoneIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Voice Prescriptions</p>
                    <p className="text-2xl font-bold text-gray-900">{quickStats.voicePrescriptions}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Advanced Features Navigation */}
          <div className="lg:col-span-2">
            <AdvancedFeaturesNavigation 
              userRole={userRole} 
              userProfile={userProfile}
              className="mb-8"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map(activity => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All Activity
              </button>
            </div>

            {/* Quick Feature Access */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>
              <div className="space-y-3">
                {userRole === 'patient' && (
                  <>
                    <button
                      onClick={quickActions.checkSymptoms}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <HeartIcon className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium">Check Symptoms</span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={quickActions.joinCommunity}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <UserGroupIcon className="h-5 w-5 text-pink-600" />
                        <span className="text-sm font-medium">Join Community</span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={quickActions.viewRewards}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <TrophyIcon className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium">View Rewards</span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  </>
                )}

                {userRole === 'doctor' && (
                  <>
                    <button
                      onClick={() => navigate('/patients/high-risk')}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium">High-Risk Patients</span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={() => navigate('/drug-discovery')}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <BeakerIcon className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium">Drug Discovery</span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => navigate('/iot-devices')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-cyan-600" />
                    <span className="text-sm font-medium">Smart Devices</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* AI Assistant Quick Chat */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <SparklesIcon className="h-6 w-6 text-violet-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI Health Assistant</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Ask me anything about your health, medications, or symptoms.
              </p>
              <button
                onClick={quickActions.aiAssistant}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                <span>Start Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;