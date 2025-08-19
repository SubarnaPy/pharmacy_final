import React, { useState } from 'react';
import {
    UserIcon,
    HeartIcon,
    ShieldCheckIcon,
    BuildingStorefrontIcon,
    ArrowRightIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import DoctorDashboard from '../../pages/DoctorDashboard';
import PatientDashboard from '../../pages/PatientDashboard';
import AdminDashboard from '../../pages/AdminDashboard';
import PharmacyDashboard from '../../pages/PharmacyDashboard';

const DashboardDemo = () => {
    const [selectedDashboard, setSelectedDashboard] = useState(null);

    const dashboardTypes = [
        {
            key: 'doctor',
            title: 'Doctor Dashboard',
            description: 'Healthcare provider portal with patient management, appointments, and analytics',
            icon: UserIcon,
            gradient: 'from-blue-500 to-cyan-500',
            features: [
                'Profile management with specializations',
                'Appointment scheduling and management',
                'Patient records and consultation history',
                'Earnings tracking and analytics',
                'Real-time notifications with badges'
            ]
        },
        {
            key: 'patient',
            title: 'Patient Dashboard',
            description: 'Patient portal for health management, prescriptions, and doctor consultations',
            icon: HeartIcon,
            gradient: 'from-emerald-500 to-teal-500',
            features: [
                'Health records and prescription management',
                'Doctor booking and consultations',
                'Pharmacy search and order tracking',
                'Medication reminders and refills',
                'Interactive notification system'
            ]
        },
        {
            key: 'admin',
            title: 'Admin Dashboard',
            description: 'System administration with user management, analytics, and security monitoring',
            icon: ShieldCheckIcon,
            gradient: 'from-purple-500 to-pink-500',
            features: [
                'User management and verification',
                'System health monitoring',
                'Analytics and reporting',
                'Security and compliance tracking',
                'Notification system management'
            ]
        },
        {
            key: 'pharmacy',
            title: 'Pharmacy Dashboard',
            description: 'Pharmacy management with prescription processing, inventory, and customer service',
            icon: BuildingStorefrontIcon,
            gradient: 'from-orange-500 to-red-500',
            features: [
                'Prescription queue and processing',
                'Inventory management with alerts',
                'Order fulfillment and tracking',
                'Patient communication and consultations',
                'Revenue tracking and analytics'
            ]
        }
    ];

    const DashboardCard = ({ dashboard }) => (
        <div
            onClick={() => setSelectedDashboard(dashboard.key)}
            className={`
        group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 cursor-pointer
        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2
        shadow-lg
      `}
        >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${dashboard.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

            {/* Icon */}
            <div className={`w-16 h-16 bg-gradient-to-r ${dashboard.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <dashboard.icon className="h-8 w-8 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {dashboard.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                {dashboard.description}
            </p>

            {/* Features */}
            <div className="space-y-2 mb-6">
                {dashboard.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{feature}</span>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                <span className="mr-2">Explore Dashboard</span>
                <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    );

    const renderSelectedDashboard = () => {
        switch (selectedDashboard) {
            case 'doctor':
                return <DoctorDashboard />;
            case 'patient':
                return <PatientDashboard />;
            case 'admin':
                return <AdminDashboard />;
            case 'pharmacy':
                return <PharmacyDashboard />;
            default:
                return null;
        }
    };

    if (selectedDashboard) {
        return (
            <div className="relative">
                {/* Back button */}
                <button
                    onClick={() => setSelectedDashboard(null)}
                    className="fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
                >
                    ← Back to Demo Selection
                </button>

                {renderSelectedDashboard()}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -left-32 w-64 h-64 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-cyan-400/10 dark:bg-cyan-600/5 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-6">
                        <SparklesIcon className="h-8 w-8 text-blue-500 mr-3" />
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Advanced Dashboard System
                        </h1>
                    </div>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        Experience our next-generation dashboard interface with advanced scrollable sidebars,
                        real-time notification counters, and interactive navigation for all user roles.
                    </p>
                </div>

                {/* Features Highlight */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 mb-12 border border-white/20 dark:border-gray-700/30 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                        ✨ Enhanced Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-white font-bold">📱</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Scrollable Sidebar</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Fully scrollable navigation with smooth animations</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-white font-bold">🔔</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Live Notifications</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Real-time notification badges and counters</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-white font-bold">🎨</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Interactive UI</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Hover effects, animations, and active states</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-white font-bold">📊</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Role-Based</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Customized navigation for each user type</p>
                        </div>
                    </div>
                </div>

                {/* Dashboard Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {dashboardTypes.map((dashboard) => (
                        <DashboardCard key={dashboard.key} dashboard={dashboard} />
                    ))}
                </div>

                {/* Technical Details */}
                <div className="mt-12 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                        🛠️ Technical Implementation
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Components</h3>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li>• AdvancedSidebar.jsx</li>
                                <li>• DashboardLayout.jsx</li>
                                <li>• Notification hooks</li>
                                <li>• Sidebar configurations</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Features</h3>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li>• Smooth scrolling</li>
                                <li>• Collapsible groups</li>
                                <li>• Badge notifications</li>
                                <li>• Active state tracking</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Animations</h3>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li>• CSS transitions</li>
                                <li>• Hover effects</li>
                                <li>• Loading states</li>
                                <li>• Responsive design</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardDemo;