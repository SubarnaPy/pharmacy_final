/**
 * Notification Bell Component
 * Enhanced notification bell for navbar with real-time updates
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  BellIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useSimpleNotifications } from '../../hooks/useSimpleNotifications';
import NotificationItem from './NotificationItem';
import ConnectionStatus from './ConnectionStatus';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef(null);

  // Use simple notification system instead of advanced WebSocket system
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    refresh,
    clearError
  } = useSimpleNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get recent notifications (last 5 or all if showAll is true)
  const displayNotifications = showAll 
    ? notifications 
    : notifications.slice(0, 5);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && error) {
      clearError();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  const getNotificationIcon = (type, priority) => {
    if (priority === 'critical') {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    }

    switch (type) {
      // Prescription notifications
      case 'prescription_created':
      case 'prescription_ready':
      case 'patient_prescription_uploaded':
      case 'prescription_response_received':
      case 'prescription_request':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
      
      case 'pharmacy_prescription_request':
      case 'pharmacy_response_submitted':
        return <InformationCircleIcon className="h-4 w-4 text-green-500" />;
      
      // Order notifications
      case 'order_delivered':
      case 'order_shipped':
      case 'order_confirmed':
      case 'patient_order_placed':
      case 'pharmacy_order_received':
        return <CheckIcon className="h-4 w-4 text-green-500" />;
      
      // Appointment notifications
      case 'appointment_reminder':
      case 'doctor_booking_confirmed':
      case 'doctor_new_appointment':
      case 'patient_appointment_booked':
        return <ClockIcon className="h-4 w-4 text-purple-500" />;
      
      // Payment notifications
      case 'payment_successful':
      case 'order_payment_received':
        return <CheckIcon className="h-4 w-4 text-green-500" />;
      
      case 'payment_failed':
      case 'payment_pending':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-3 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700/70 rounded-2xl transition-all duration-300 group backdrop-blur-sm"
        title="Notifications"
      >
        <BellIcon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse font-bold shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        <div className="absolute -bottom-1 -right-1">
          <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionStatus === 'failed' ? 'bg-red-500' :
            'bg-gray-400'
          }`}></div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <BellIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <ConnectionStatus status={connectionStatus} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <CheckIcon className="h-4 w-4 inline mr-2" />
                Mark All as Read ({unreadCount})
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <BellIcon className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                      !notification.readAt ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => {
                      if (!notification.readAt) {
                        markAsRead(notification.id);
                      }
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
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
                        } line-clamp-2`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {notifications.length > 5 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    {showAll ? 'Show Less' : `View All (${notifications.length})`}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;