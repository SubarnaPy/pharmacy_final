/**
 * Individual Notification Item Component
 * Displays a single notification with actions and status
 */

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  HeartIcon,
  TruckIcon,
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  BellIcon,
  ChevronRightIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ 
  notification, 
  isSelected = false, 
  onSelect, 
  onMarkAsRead,
  onDelete,
  showCheckbox = false,
  compact = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get icon based on notification type
  const getNotificationIcon = (type, priority) => {
    const iconClass = "h-5 w-5";
    
    if (priority === 'critical') {
      return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    }

    switch (type) {
      // Prescription notifications
      case 'prescription_created':
      case 'prescription_ready':
      case 'prescription_expired':
      case 'patient_prescription_uploaded':
      case 'prescription_response_received':
      case 'prescription_shared_with_pharmacy':
      case 'prescription_request':
        return <DocumentTextIcon className={`${iconClass} text-blue-500`} />;
      
      case 'pharmacy_prescription_request':
      case 'pharmacy_response_submitted':
        return <DocumentTextIcon className={`${iconClass} text-green-500`} />;
      
      // Order notifications
      case 'order_delivered':
      case 'order_shipped':
      case 'order_confirmed':
      case 'order_status_updated':
      case 'delivery_update':
        return <TruckIcon className={`${iconClass} text-green-500`} />;
      
      case 'patient_order_placed':
      case 'pharmacy_order_received':
      case 'pharmacy_order_processed':
      case 'order_payment_received':
        return <TruckIcon className={`${iconClass} text-blue-500`} />;
      
      // Appointment notifications
      case 'appointment_reminder':
      case 'appointment_scheduled':
      case 'appointment_cancelled':
      case 'doctor_booking_confirmed':
      case 'doctor_new_appointment':
      case 'doctor_appointment_cancelled':
      case 'doctor_consultation_request':
      case 'patient_appointment_booked':
      case 'patient_consultation_scheduled':
        return <CalendarDaysIcon className={`${iconClass} text-purple-500`} />;
      
      // Payment notifications
      case 'payment_successful':
      case 'payment_failed':
      case 'payment_refunded':
      case 'payment_pending':
      case 'payment_due':
      case 'invoice_generated':
        return <CurrencyDollarIcon className={`${iconClass} text-yellow-500`} />;
      
      // User/Profile notifications
      case 'user_registered':
      case 'profile_updated':
      case 'profile_completed':
      case 'verification_required':
      case 'verification_completed':
        return <UserIcon className={`${iconClass} text-indigo-500`} />;
      
      // Medical reminders
      case 'medication_reminder':
      case 'refill_reminder':
      case 'health_checkup_reminder':
        return <HeartIcon className={`${iconClass} text-pink-500`} />;
      
      // Security notifications
      case 'security_alert':
      case 'login_attempt':
      case 'password_reset':
        return <ShieldCheckIcon className={`${iconClass} text-red-500`} />;
      
      // System notifications
      case 'system_maintenance':
      case 'system_update':
      case 'system_alert':
      case 'system_announcement':
        return <InformationCircleIcon className={`${iconClass} text-gray-500`} />;
      
      // Chat/Support notifications
      case 'chat_message_received':
      case 'chat_started':
      case 'support_ticket_created':
      case 'support_ticket_resolved':
        return <BellIcon className={`${iconClass} text-indigo-500`} />;
      
      default:
        return <BellIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  // Get priority styling
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'critical':
        return {
          border: 'border-l-4 border-red-500',
          bg: 'bg-red-50 dark:bg-red-900/10',
          badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        };
      case 'high':
        return {
          border: 'border-l-4 border-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
        };
      case 'medium':
        return {
          border: 'border-l-4 border-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        };
      default:
        return {
          border: 'border-l-4 border-gray-300 dark:border-gray-600',
          bg: '',
          badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        };
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async () => {
    if (notification.readAt || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onMarkAsRead();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle action click
  const handleActionClick = (action) => {
    if (action.url) {
      window.location.href = action.url;
    }
    if (action.onClick) {
      action.onClick();
    }
    if (!notification.readAt) {
      handleMarkAsRead();
    }
  };

  const priorityStyles = getPriorityStyles(notification.priority);
  const isUnread = !notification.readAt;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div 
      className={`
        relative p-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50
        ${priorityStyles.border} ${priorityStyles.bg}
        ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900/20' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        )}

        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type, notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${
                  isUnread 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {notification.title}
                </h4>
                
                {/* Unread indicator */}
                {isUnread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}

                {/* Priority badge */}
                {(notification.priority === 'high' || notification.priority === 'critical') && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityStyles.badge}`}>
                    {notification.priority === 'critical' ? 'Critical' : 'High Priority'}
                  </span>
                )}
              </div>

              {/* Message */}
              <p className={`text-sm ${
                isUnread 
                  ? 'text-gray-800 dark:text-gray-200' 
                  : 'text-gray-600 dark:text-gray-400'
              } ${compact ? 'line-clamp-2' : ''}`}>
                {notification.message}
              </p>

              {/* Metadata */}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {timeAgo}
                </span>
                
                {notification.category && (
                  <span className="capitalize">{notification.category}</span>
                )}
                
                {notification.source && (
                  <span>{notification.source}</span>
                )}
              </div>

              {/* Actions */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex items-center space-x-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleActionClick(action)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                    >
                      {action.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Expandable content */}
              {notification.details && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <ChevronRightIcon className={`h-3 w-3 mr-1 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                    {isExpanded ? 'Show less' : 'Show details'}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {typeof notification.details === 'string' 
                          ? notification.details 
                          : JSON.stringify(notification.details, null, 2)
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-1 ml-4">
              {/* Mark as read */}
              {isUnread && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={isProcessing}
                  className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                  title="Mark as read"
                >
                  {isProcessing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Delete */}
              {onDelete && (
                <button
                  onClick={() => onDelete(notification.id)}
                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete notification"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Read status indicator */}
      {notification.readAt && (
        <div className="absolute top-2 right-2">
          <CheckCircleIcon className="h-4 w-4 text-green-500" title="Read" />
        </div>
      )}
    </div>
  );
};

export default NotificationItem;