import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  EyeIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layout/DashboardLayout';
import PharmacyRegistration from '../components/Pharmacy/PharmacyRegistration';
import PrescriptionQueue from '../components/Pharmacy/PrescriptionQueue';
import PrescriptionViewer from '../components/Pharmacy/PrescriptionViewer';
import PharmacyChat from '../components/Pharmacy/PharmacyChat';
import VideoConsultation from '../components/Pharmacy/VideoConsultation';
import PharmacyProfile from '../components/Pharmacy/PharmacyProfile';
import InventoryManagement from '../components/Pharmacy/InventoryManagement';
import OrderManagement from '../components/Pharmacy/OrderManagement';
import TransactionDashboard from '../components/Pharmacy/TransactionDashboard';
import PrescriptionHistory from '../components/Pharmacy/PrescriptionHistory';
import PharmacySettings from '../components/Pharmacy/PharmacySettings';
import EnhancedDashboard from '../components/dashboard/EnhancedDashboard';

function PharmacyDashboard() {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    pendingRequests: 12,
    activeOrders: 28,
    totalFulfilled: 156,
    monthlyRevenue: 45000,
    averageRating: 4.8,
    totalCustomers: 234,
    lowStockItems: 5,
    unreadMessages: 4
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update activeSection based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/pharmacy' || path === '/pharmacy/') {
      setActiveSection('dashboard');
    } else {
      const section = path.split('/pharmacy/')[1];
      if (section) {
        setActiveSection(section);
      }
    }
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      setDashboardStats({
        pendingRequests: 12,
        activeOrders: 28,
        totalFulfilled: 156,
        monthlyRevenue: 45000,
        averageRating: 4.8,
        totalCustomers: 234,
        lowStockItems: 5,
        unreadMessages: 4
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color, trend, onClick, alert }) => (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
        ${alert ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}
      `}
    >
      {alert && (
        <div className="absolute top-2 right-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 animate-pulse" />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center mt-2">
              <span className="mr-1">↗</span>
              +{trend}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient, badge, urgent }) => (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
        ${urgent ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
      `}
    >
      {badge && (
        <div className={`absolute top-4 right-4 ${urgent ? 'bg-red-500' : 'bg-blue-500'} text-white text-xs font-bold px-2 py-1 rounded-full ${urgent ? 'animate-bounce' : 'animate-pulse'}`}>
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
          label="Pending Requests"
          value={dashboardStats.pendingRequests}
          icon={ClockIcon}
          color="bg-orange-500"
          onClick={() => navigate('/pharmacy/prescription-queue')}
          alert={dashboardStats.pendingRequests > 10}
        />
        <StatCard
          label="Active Orders"
          value={dashboardStats.activeOrders}
          icon={ShoppingCartIcon}
          color="bg-blue-500"
          trend={15}
          onClick={() => navigate('/pharmacy/order-management')}
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${dashboardStats.monthlyRevenue.toLocaleString()}`}
          icon={BanknotesIcon}
          color="bg-green-500"
          trend={22}
          onClick={() => navigate('/pharmacy/transactions')}
        />
        <StatCard
          label="Customer Rating"
          value={`${dashboardStats.averageRating}/5.0`}
          icon={StarIcon}
          color="bg-yellow-500"
        />
      </div>

      {/* Alerts & Notifications */}
      {(dashboardStats.lowStockItems > 0 || dashboardStats.unreadMessages > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
          <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Attention Required
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardStats.lowStockItems > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <ArchiveBoxIcon className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {dashboardStats.lowStockItems} items low in stock
                  </p>
                  <button 
                    onClick={() => navigate('/pharmacy/inventory')}
                    className="text-sm text-orange-600 hover:text-orange-800 underline"
                  >
                    Manage inventory
                  </button>
                </div>
              </div>
            )}
            {dashboardStats.unreadMessages > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {dashboardStats.unreadMessages} unread patient messages
                  </p>
                  <button 
                    onClick={() => navigate('/pharmacy/chat')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    View messages
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            icon={ClockIcon}
            title="Prescription Queue"
            description="Review incoming prescription requests"
            onClick={() => navigate('/pharmacy/prescription-queue')}
            gradient="bg-gradient-to-r from-orange-500 to-red-500"
            badge={dashboardStats.pendingRequests}
            urgent={dashboardStats.pendingRequests > 10}
          />
          <QuickActionCard
            icon={EyeIcon}
            title="Review Prescriptions"
            description="Validate and process prescriptions"
            onClick={() => navigate('/pharmacy/prescription-viewer')}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <QuickActionCard
            icon={ArchiveBoxIcon}
            title="Manage Inventory"
            description="Update stock levels and medications"
            onClick={() => navigate('/pharmacy/inventory')}
            gradient="bg-gradient-to-r from-green-500 to-emerald-500"
            badge={dashboardStats.lowStockItems > 0 ? dashboardStats.lowStockItems : null}
            urgent={dashboardStats.lowStockItems > 3}
          />
          <QuickActionCard
            icon={ShoppingCartIcon}
            title="Process Orders"
            description="Fulfill and track customer orders"
            onClick={() => navigate('/pharmacy/order-management')}
            gradient="bg-gradient-to-r from-purple-500 to-pink-500"
            badge={dashboardStats.activeOrders}
          />
          <QuickActionCard
            icon={ChatBubbleLeftRightIcon}
            title="Patient Chat"
            description="Communicate with patients"
            onClick={() => navigate('/pharmacy/chat')}
            gradient="bg-gradient-to-r from-indigo-500 to-purple-500"
            badge={dashboardStats.unreadMessages > 0 ? dashboardStats.unreadMessages : null}
          />
          <QuickActionCard
            icon={VideoCameraIcon}
            title="Video Consultation"
            description="Conduct virtual consultations"
            onClick={() => navigate('/pharmacy/video-consultation')}
            gradient="bg-gradient-to-r from-teal-500 to-cyan-500"
          />
          <QuickActionCard
            icon={BanknotesIcon}
            title="View Transactions"
            description="Track revenue and payments"
            onClick={() => navigate('/pharmacy/transactions')}
            gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
          />
          <QuickActionCard
            icon={ChartBarIcon}
            title="Analytics"
            description="View performance metrics"
            onClick={() => navigate('/pharmacy/analytics')}
            gradient="bg-gradient-to-r from-pink-500 to-rose-500"
          />
          <QuickActionCard
            icon={DocumentTextIcon}
            title="AI Pharmacy Tools"
            description="Advanced AI-powered pharmacy management tools"
            onClick={() => setActiveSection('ai-features')}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-600"
            badge="AI"
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Performance */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
            Today's Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Prescriptions Processed</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">18/24</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Orders Fulfilled</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">27/30</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Response Time</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">12 min avg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-green-500" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { action: 'Prescription processed', patient: 'John Doe', time: '5 min ago', type: 'success' },
              { action: 'Order shipped', patient: 'Sarah Johnson', time: '12 min ago', type: 'info' },
              { action: 'Low stock alert', item: 'Metformin 500mg', time: '25 min ago', type: 'warning' },
              { action: 'New message', patient: 'Mike Chen', time: '1 hour ago', type: 'message' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'info' ? 'bg-blue-500' :
                  activity.type === 'warning' ? 'bg-orange-500' :
                  'bg-purple-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {activity.patient || activity.item} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Orders Fulfilled</h4>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboardStats.totalFulfilled}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Total Customers</h4>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.totalCustomers}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active customers</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
          <TruckIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Delivery Rate</h4>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">98.5%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">On-time delivery</p>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'registration':
        return <PharmacyRegistration />;
      case 'prescription-queue':
        return <PrescriptionQueue />;
      case 'prescription-viewer':
        return <PrescriptionViewer />;
      case 'chat':
        return <PharmacyChat />;
      case 'video-consultation':
        return <VideoConsultation />;
      case 'inventory':
        return <InventoryManagement />;
      case 'order-management':
        return <OrderManagement />;
      case 'prescription-history':
        return <PrescriptionHistory />;
      case 'transactions':
        return <TransactionDashboard />;
      case 'profile':
        return <PharmacyProfile />;
      case 'settings':
        return <PharmacySettings />;
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
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="pharmacy"
      activeSection={activeSection}
      onSectionChange={(section) => {
        if (section === 'dashboard') {
          navigate('/pharmacy');
        } else {
          navigate(`/pharmacy/${section}`);
        }
      }}
      showWelcome={activeSection === 'dashboard'}
      welcomeMessage={`Welcome back, ${user?.profile?.pharmacyName || 'Pharmacy'}! 💊`}
    >
      <Routes>
        <Route index element={renderDashboardOverview()} />
        <Route path="profile" element={<PharmacyProfile />} />
        <Route path="registration" element={<PharmacyRegistration />} />
        <Route path="prescription-queue" element={<PrescriptionQueue />} />
        <Route path="prescription-viewer" element={<PrescriptionViewer />} />
        <Route path="prescription-history" element={<PrescriptionHistory />} />
        <Route path="inventory" element={<InventoryManagement />} />
        <Route path="order-management" element={<OrderManagement />} />
        <Route path="transactions" element={<TransactionDashboard />} />
        <Route path="chat" element={<PharmacyChat />} />
        <Route path="video-consultation" element={<VideoConsultation />} />
        <Route path="settings" element={<PharmacySettings />} />
        <Route path="analytics" element={<EnhancedDashboard />} />
        <Route 
          path="*" 
          element={
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Page Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400">This section is coming soon...</p>
            </div>
          } 
        />
      </Routes>
    </DashboardLayout>
  );
}

export default PharmacyDashboard;