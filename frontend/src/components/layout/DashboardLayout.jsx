import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Bars3Icon, ClockIcon } from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';
import AdvancedSidebar from '../common/AdvancedSidebar';
import NotificationBell from '../notifications/NotificationBell';
import { getSidebarConfig, getStaticSidebarConfig } from '../../config/sidebarConfigs';
import useSidebarNotifications from '../../hooks/useSidebarNotifications';
import useChatNotifications from '../../hooks/useChatNotifications';

function DashboardLayout({ 
  children, 
  userRole, 
  activeSection, 
  onSectionChange,
  pageTitle,
  showWelcome = false,
  welcomeMessage
}) {
  // Place all hooks and logic here
  const { isDarkMode } = useContext(DarkModeContext);
  const { user } = useSelector(state => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [sidebarConfig, setSidebarConfig] = useState(null);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  const [sidebarItemsWithNotifications, setSidebarItemsWithNotifications] = useState([]);
  const [chatTotalUnread, setChatTotalUnread] = useState(0);

  // Example: useEffect for mounting
  useEffect(() => { setMounted(true); }, []);

  // Load sidebar config on mount
  useEffect(() => {
    // Use static config for now to ensure sidebar always loads
    const config = getStaticSidebarConfig(userRole);
    setSidebarConfig(config);
    setSidebarItemsWithNotifications(config.items || []);
    setIsLoadingSidebar(false);
  }, [userRole]);

  // Example: useEffect for time
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Example: sidebar toggle handler
  const handleSidebarToggle = () => setSidebarOpen(prev => !prev);
  const handleSectionChange = (section) => onSectionChange && onSectionChange(section);

  // Example: notification count
  const getTotalNotifications = () => 0; // Replace with real logic if needed

  // Example: get user display name
  const getUserDisplayName = () => user?.profile?.firstName || user?.email || 'User';
  // Example: get user role display
  const getUserRoleDisplay = () => {
    switch (userRole) {
      case 'doctor':
        return 'Doctor';
      case 'patient':
        return 'Patient';
      case 'admin':
        return 'System Administrator';
      case 'pharmacy':
        return 'Pharmacist';
      default:
        return 'User';
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    if (pageTitle) return pageTitle;
    // Add more logic if needed
    return 'Dashboard';
  };

  // ...existing return below...
  return (
    <div className={`dashboard-layout transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    } flex`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-cyan-400/10 dark:bg-cyan-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Advanced Sidebar */}
      <div className="z-40 fixed left-0 top-0">
        {!isLoadingSidebar && sidebarConfig ? (
          <AdvancedSidebar
            title={sidebarConfig.title}
            items={sidebarItemsWithNotifications}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isOpen={sidebarOpen}
            onToggle={handleSidebarToggle}
            userInfo={`${getUserDisplayName()} • ${getUserRoleDisplay()}`}
          />
        ) : (
          <div className="sidebar-container w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/30 h-screen fixed left-0 top-0 z-30">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="main-content-container transition-all duration-300 ease-in-out flex-1 min-h-screen ml-80">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 sticky top-0 z-20">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={handleSidebarToggle}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Bars3Icon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Page title and breadcrumb */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCurrentPageTitle()}
                </h1>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>{currentTime.toLocaleString()}</span>
                  {getTotalNotifications() + chatTotalUnread > 0 && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {getTotalNotifications() + chatTotalUnread} notifications
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-4">
              <NotificationBell />
              
              {/* User avatar */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getUserRoleDisplay()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {/* Welcome message */}
          {showWelcome && (
            <div className="mb-8 animate-fadeInUp">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                {welcomeMessage || `Welcome back, ${user?.profile?.firstName || 'User'}! 👋`}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {userRole === 'doctor' && 'Ready to help your patients today'}
                {userRole === 'patient' && 'Your health journey continues here'}
                {userRole === 'admin' && 'System overview and management'}
                {userRole === 'pharmacy' && 'Manage prescriptions and orders'}
              </p>
            </div>
          )}

          {/* Main content */}
          <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;