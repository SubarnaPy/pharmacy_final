/**
 * Notification Widget Component
 * Compact notification display for dashboard integration
 */

import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAdvancedNotifications } from '../../hooks/useAdvancedNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const NotificationWidget = ({ 
  title = "Recent Notifications",
  maxItems = 5,
  showHeader = true,
  compact = false,
  className = ""
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    getFilteredNotifications
  } = useAdvancedNotifications();

  const [displayNotifications, setDisplayNotifications] = useState([]);

  useEffect(() => {
    // Get recent notifications, prioritizing unread ones
    const unreadNotifications = getFilteredNotifications('unread');
    const readNotifications = getFilteredNotifications('read');
    
    const combined = [
      ...unreadNotifications.slice(0, Math.min(maxItems, unreadNotifications.length)),
      ...readNotifications.slice(0, Math.max(0, maxItems - unreadNotifications.length))
    ].slice(0, maxItems);

    setDisplayNotifications(combined);
  }, [notifications, maxItems, getFilteredNotifications]);

  const getNotificationIcon = (type, priority) => {
    if (priority === 'critical') {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    }

    switch (type) {
      case 'prescription_created':
      case 'prescription_ready':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
      case 'order_delivered':
      case 'order_shipped':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'appointment_reminder':
        return <ClockIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default: return 'border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to notification URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  if (isLoading && displayNotifications.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {showHeader && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <Link
              to="/notifications"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className={compact ? "p-2" : "p-4"}>
        {displayNotifications.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  border-l-4 p-3 rounded-r-lg cursor-pointer transition-all duration-200 hover:shadow-sm
                  ${getPriorityColor(notification.priority)}
                  ${!notification.readAt ? 'shadow-sm' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`text-sm font-medium ${
                        !notification.readAt 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.readAt && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm ${
                      !notification.readAt 
                        ? 'text-gray-800 dark:text-gray-200' 
                        : 'text-gray-600 dark:text-gray-400'
                    } ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      
                      {!notification.readAt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
                        >
                          <EyeIcon className="h-3 w-3" />
                          <span>Mark as read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {displayNotifications.length > 0 && !showHeader && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/notifications"
            className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationWidget;