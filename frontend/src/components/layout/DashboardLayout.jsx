import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Bars3Icon, ClockIcon } from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';
import AdvancedSidebar from '../common/AdvancedSidebar';
import NotificationBell from '../notifications/NotificationBell';
import { getSidebarConfig, getStaticSidebarConfig } from '../../config/sidebarConfigs';
import useSidebarNotifications from '../../hooks/useSidebarNotifications';
import useChatNotifications from '../../hooks/useChatNotifications';
import '../../styles/sidebar-animations.css';

const DashboardLayout = ({ 
  children, 
  userRole, 
  activeSection, 
  onSectionChange,
  pageTitle,
  showWelcome = false,
  welcomeMessage
}) => {
  const { isDarkMode } = useContext(DarkModeContext);
  const { user } = useSelector(state => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [sidebarConfig, setSidebarConfig] = useState(null);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);

  // Load sidebar configuration with dynamic data
  useEffect(() => {
    const loadSidebarConfig = async () => {
      try {
        setIsLoadingSidebar(true);
        // Use async function to get dynamic sidebar configuration
        const config = await getSidebarConfig(userRole, user?.id);
        setSidebarConfig(config);
      } catch (error) {
        console.error('Error loading sidebar config:', error);
        // Fallback to static configuration
        const staticConfig = getStaticSidebarConfig(userRole);
        setSidebarConfig(staticConfig);
      } finally {
        setIsLoadingSidebar(false);
      }
    };

    if (userRole && user?.id) {
      loadSidebarConfig();
    } else if (userRole) {
      // Load static config if user ID is not available yet
      const staticConfig = getStaticSidebarConfig(userRole);
      setSidebarConfig(staticConfig);
      setIsLoadingSidebar(false);
    }
  }, [userRole, user?.id]);

  // Get sidebar notifications
  const { 
    getNotificationCount, 
    getTotalNotifications 
  } = useSidebarNotifications(userRole || 'patient');

  // Get chat notifications
  const { totalUnread: chatTotalUnread } = useChatNotifications(userRole);

  // Update sidebar items with notification badges
  const sidebarItemsWithNotifications = React.useMemo(() => {
    if (!sidebarConfig || isLoadingSidebar) {
      return [];
    }

    const updateItemsWithBadges = (items) => {
      return items.map(item => {
        const updatedItem = { ...item };
        
        // Update badge count from notifications (legacy system)
        // Note: The dynamic sidebar already has badge counts from API
        const notificationCount = getNotificationCount(item.key);
        if (notificationCount > 0 && !updatedItem.badge) {
          // Only add notification badge if not already set by dynamic system
          updatedItem.badge = notificationCount;
        }

        // Add chat notification badges to conversation/chat related items
        if ((item.key === 'conversations' || item.key === 'chat' || item.key === 'messages') && chatTotalUnread > 0) {
          updatedItem.badge = (updatedItem.badge || 0) + chatTotalUnread;
        }

        // Recursively update children
        if (item.children) {
          updatedItem.children = updateItemsWithBadges(item.children);
        }

        return updatedItem;
      });
    };

    return updateItemsWithBadges(sidebarConfig.items);
  }, [sidebarConfig, isLoadingSidebar, getNotificationCount, chatTotalUnread]);

  // Update time every second
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle section change
  const handleSectionChange = (section) => {
    onSectionChange(section);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user?.profile?.firstName || user?.email || 'User';
  };

  // Get user role display
  const getUserRoleDisplay = () => {
    switch (userRole) {
      case 'doctor':
        return 'Healthcare Provider';
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
    
    const findItemByKey = (items, key) => {
      for (const item of items) {
        if (item.key === key) return item;
        if (item.children) {
          const found = findItemByKey(item.children, key);
          if (found) return found;
        }
      }
      return null;
    };

    const currentItem = findItemByKey(sidebarItemsWithNotifications, activeSection);
    return currentItem?.label || 'Dashboard';
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-cyan-400/10 dark:bg-cyan-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Advanced Sidebar */}
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
        <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/30">
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

      {/* Main Content Area */}
      <div className="lg:ml-80 min-h-screen">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 sticky top-0 z-30">
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