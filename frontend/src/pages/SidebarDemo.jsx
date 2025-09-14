import React, { useState } from 'react';
import {
  HomeIcon,
  UserIcon,
  CogIcon,
  BellIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  BeakerIcon,
  CameraIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layout/DashboardLayout';

const SidebarDemo = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Demo sidebar configuration with advanced features
  const demoSidebarItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      description: 'Overview and insights',
      icon: HomeIcon,
      badge: 0,
      isNew: false
    },
    {
      key: 'ai-features',
      label: 'AI Features',
      description: 'Powered by advanced AI',
      icon: SparklesIcon,
      badge: 3,
      isNew: true,
      children: [
        {
          key: 'symptom-checker',
          label: 'Symptom Checker',
          description: 'AI-powered diagnosis',
          icon: HeartIcon,
          badge: 1
        },
        {
          key: 'pill-scanner',
          label: 'AR Pill Scanner',
          description: 'Scan pills with camera',
          icon: CameraIcon,
          isNew: true
        },
        {
          key: 'voice-prescription',
          label: 'Voice Commands',
          description: 'Voice-powered prescriptions',
          icon: MicrophoneIcon,
          badge: 2
        }
      ]
    },
    {
      key: 'health-management',
      label: 'Health Management',
      description: 'Manage your health data',
      icon: ClipboardDocumentIcon,
      children: [
        {
          key: 'prescriptions',
          label: 'Prescriptions',
          description: 'Manage prescriptions',
          icon: DocumentTextIcon,
          badge: 5
        },
        {
          key: 'appointments',
          label: 'Appointments',
          description: 'Schedule and manage',
          icon: CalendarIcon,
          badge: 2
        },
        {
          key: 'health-records',
          label: 'Health Records',
          description: 'Medical history',
          icon: ChartBarIcon
        }
      ]
    },
    {
      key: 'communications',
      label: 'Communications',
      description: 'Chat and video calls',
      icon: ChatBubbleLeftRightIcon,
      badge: 8,
      children: [
        {
          key: 'messages',
          label: 'Messages',
          description: 'Chat with doctors',
          icon: ChatBubbleLeftRightIcon,
          badge: 8
        },
        {
          key: 'video-calls',
          label: 'Video Consultations',
          description: 'Video appointments',
          icon: VideoCameraIcon,
          badge: 1
        }
      ]
    },
    {
      key: 'research',
      label: 'Research & Trials',
      description: 'Clinical research',
      icon: BeakerIcon,
      isNew: true,
      children: [
        {
          key: 'clinical-trials',
          label: 'Clinical Trials',
          description: 'Join research studies',
          icon: BeakerIcon,
          isNew: true
        },
        {
          key: 'drug-discovery',
          label: 'Drug Discovery',
          description: 'Latest discoveries',
          icon: MagnifyingGlassIcon
        }
      ]
    },
    {
      key: 'profile',
      label: 'Profile',
      description: 'Personal information',
      icon: UserIcon
    },
    {
      key: 'notifications',
      label: 'Notifications',
      description: 'Alerts and messages',
      icon: BellIcon,
      badge: 17
    },
    {
      key: 'security',
      label: 'Security & Privacy',
      description: 'Data protection settings',
      icon: ShieldCheckIcon
    },
    {
      key: 'settings',
      label: 'Settings',
      description: 'App preferences',
      icon: CogIcon
    }
  ];

  const renderContent = () => {
    const activeItem = findActiveItem(demoSidebarItems, activeSection);
    
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Sidebar Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            Showcasing the advanced sidebar features and beautiful UI
          </p>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Section: {activeItem?.label || 'Unknown'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {activeItem?.description || 'No description available'}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                title="🎨 Beautiful Design"
                description="Modern glassmorphism design with smooth animations and micro-interactions"
              />
              <FeatureCard
                title="🔍 Smart Search"
                description="Real-time search functionality to quickly find features"
              />
              <FeatureCard
                title="📱 Responsive"
                description="Fully responsive design that works on all device sizes"
              />
              <FeatureCard
                title="🌙 Dark Mode"
                description="Beautiful dark mode with smooth transitions"
              />
              <FeatureCard
                title="⚡ Collapse Mode"
                description="Collapsible sidebar with tooltip hints for space efficiency"
              />
              <FeatureCard
                title="🔔 Notifications"
                description="Real-time notification badges with animated indicators"
              />
              <FeatureCard
                title="✨ Animations"
                description="Smooth animations and transitions throughout the interface"
              />
              <FeatureCard
                title="🎯 Hover Effects"
                description="Interactive hover states with visual feedback"
              />
              <FeatureCard
                title="📊 Nested Navigation"
                description="Multi-level navigation with smooth expand/collapse"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500" />
              Key Features
            </h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Interactive mouse tracking with gradient effects</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Staggered animations for better visual hierarchy</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Smart auto-expansion of parent groups</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Accessibility-friendly with reduced motion support</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Quick actions footer for common tasks</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BeakerIcon className="h-6 w-6 mr-2 text-blue-500" />
              Technical Improvements
            </h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Advanced CSS animations with cubic-bezier timing</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Backdrop blur effects for modern glass aesthetics</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Proper z-index management for layering</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Optimized performance with React best practices</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Enhanced TypeScript support for better DX</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const findActiveItem = (items, key) => {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children) {
        const found = findActiveItem(item.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <DashboardLayout
      userRole="patient"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      pageTitle="Sidebar Demo"
      showWelcome={true}
      welcomeMessage="🎨 Enhanced Sidebar Demo"
    >
      {renderContent()}
    </DashboardLayout>
  );
};

const FeatureCard = ({ title, description }) => (
  <div className="p-4 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/30 dark:border-gray-600/30 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-300 group">
    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
      {title}
    </h4>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

export default SidebarDemo;
