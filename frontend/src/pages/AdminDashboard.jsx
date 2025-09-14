import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BellIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layout/DashboardLayout';
import AdminNotificationDashboard from '../components/admin/AdminNotificationDashboard';
import EnhancedDashboard from '../components/dashboard/EnhancedDashboard';

function AdminDashboard() {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 15420,
    totalDoctors: 1250,
    totalPharmacies: 890,
    totalPatients: 13280,
    totalPrescriptions: 45670,
    totalOrders: 38920,
    totalRevenue: 2450000,
    systemHealth: 98.5,
    pendingVerifications: 7,
    securityAlerts: 4
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // TODO: Replace with actual API call
      setDashboardStats({
        totalUsers: 15420,
        totalDoctors: 1250,
        totalPharmacies: 890,
        totalPatients: 13280,
        totalPrescriptions: 45670,
        totalOrders: 38920,
        totalRevenue: 2450000,
        systemHealth: 98.5,
        pendingVerifications: 7,
        securityAlerts: 4
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick }) => (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ↗ +{trend}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient, badge }) => (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
      `}
    >
      {badge && (
        <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
          {badge}
        </div>
      )}

      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
      
      <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={dashboardStats.totalUsers.toLocaleString()}
          subtitle={`${dashboardStats.totalPatients.toLocaleString()} patients`}
          icon={UserGroupIcon}
          color="bg-blue-500"
          trend={12}
          onClick={() => setActiveSection('all-users')}
        />
        <StatCard
          title="Active Doctors"
          value={dashboardStats.totalDoctors.toLocaleString()}
          subtitle="Verified professionals"
          icon={HeartIcon}
          color="bg-green-500"
          trend={8}
          onClick={() => setActiveSection('doctors')}
        />
        <StatCard
          title="Partner Pharmacies"
          value={dashboardStats.totalPharmacies.toLocaleString()}
          subtitle="Registered pharmacies"
          icon={BuildingStorefrontIcon}
          color="bg-purple-500"
          trend={15}
          onClick={() => setActiveSection('pharmacies')}
        />
        <StatCard
          title="Total Revenue"
          value={`$${(dashboardStats.totalRevenue / 1000000).toFixed(1)}M`}
          subtitle="This month"
          icon={CurrencyDollarIcon}
          color="bg-yellow-500"
          trend={22}
          onClick={() => setActiveSection('financial-reports')}
        />
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Health */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <HeartIcon className="h-5 w-5 mr-2 text-green-500" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Overall Health</span>
              <span className="text-2xl font-bold text-green-600">{dashboardStats.systemHealth}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${dashboardStats.systemHealth}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">API Services</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Database</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-400">Payment Gateway</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  25 new user registrations
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  142 prescriptions processed
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <BellIcon className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  1,250 notifications sent
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            icon={UserGroupIcon}
            title="User Management"
            description="Manage system users and permissions"
            onClick={() => setActiveSection('all-users')}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <QuickActionCard
            icon={ShieldCheckIcon}
            title="User Verification"
            description="Review pending user verifications"
            onClick={() => setActiveSection('user-verification')}
            gradient="bg-gradient-to-r from-green-500 to-emerald-500"
            badge={dashboardStats.pendingVerifications}
          />
          <QuickActionCard
            icon={BellIcon}
            title="Notification System"
            description="Manage system notifications"
            onClick={() => setActiveSection('notifications')}
            gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <QuickActionCard
            icon={ChartBarIcon}
            title="Analytics & Reports"
            description="View system analytics and insights"
            onClick={() => setActiveSection('user-analytics')}
            gradient="bg-gradient-to-r from-orange-500 to-red-500"
          />
          <QuickActionCard
            icon={ExclamationTriangleIcon}
            title="Security Monitoring"
            description="Monitor security events and alerts"
            onClick={() => setActiveSection('security-logs')}
            gradient="bg-gradient-to-r from-red-500 to-pink-500"
            badge={dashboardStats.securityAlerts}
          />
          <QuickActionCard
            icon={HeartIcon}
            title="System Health"
            description="Monitor system performance"
            onClick={() => setActiveSection('system-health')}
            gradient="bg-gradient-to-r from-teal-500 to-cyan-500"
          />
          <QuickActionCard
            icon={ChartBarIcon}
            title="AI Admin Tools"
            description="Advanced AI-powered admin features and analytics"
            onClick={() => setActiveSection('ai-features')}
            gradient="bg-gradient-to-r from-indigo-500 to-purple-600"
            badge="AI"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <DocumentTextIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Total Prescriptions</h4>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {dashboardStats.totalPrescriptions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Orders Completed</h4>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {dashboardStats.totalOrders.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Success rate: 98.5%</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <ShieldCheckIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Security Score</h4>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">A+</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Excellent security</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <HeartIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">System Uptime</h4>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">99.9%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Last 30 days</p>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'notifications':
        return <AdminNotificationDashboard />;
      case 'ai-features':
        return <EnhancedDashboard />;
      default:
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace('-', ' ')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">This section is coming soon...</p>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="admin"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      showWelcome={activeSection === 'dashboard'}
      welcomeMessage={`Welcome back, ${user?.profile?.firstName || 'Admin'}! 🛡️`}
    >
      {renderActiveSection()}
    </DashboardLayout>
  );
}

export default AdminDashboard;