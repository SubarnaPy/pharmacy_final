import React from 'react';
import { 
  CheckCircleIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  WifiIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const ProfileSaveStatus = ({ 
  saveStatus, 
  sectionName,
  showDetails = false,
  className = ''
}) => {
  const {
    isSaving,
    isRetrying,
    retryCount,
    lastSave,
    isOnline,
    queuedSaves,
    successRate
  } = saveStatus;

  // Determine current status
  const getStatus = () => {
    if (isSaving && !isRetrying) {
      return {
        type: 'saving',
        message: 'Saving...',
        icon: ArrowPathIcon,
        color: 'blue',
        animate: true
      };
    }

    if (isRetrying) {
      return {
        type: 'retrying',
        message: `Retrying... (${retryCount}/3)`,
        icon: ArrowPathIcon,
        color: 'orange',
        animate: true
      };
    }

    if (!isOnline) {
      return {
        type: 'offline',
        message: queuedSaves > 0 ? `${queuedSaves} changes queued` : 'Offline',
        icon: WifiIcon,
        color: 'gray',
        animate: false
      };
    }

    if (queuedSaves > 0) {
      return {
        type: 'queued',
        message: `${queuedSaves} changes queued`,
        icon: ClockIcon,
        color: 'orange',
        animate: false
      };
    }

    if (lastSave) {
      if (lastSave.success) {
        return {
          type: 'saved',
          message: 'Saved',
          icon: CheckCircleIcon,
          color: 'green',
          animate: false
        };
      } else {
        return {
          type: 'error',
          message: 'Save failed',
          icon: ExclamationTriangleIcon,
          color: 'red',
          animate: false
        };
      }
    }

    return {
      type: 'idle',
      message: 'Ready',
      icon: CloudIcon,
      color: 'gray',
      animate: false
    };
  };

  const status = getStatus();
  const IconComponent = status.icon;

  const colorClasses = {
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800'
    },
    green: {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800'
    },
    orange: {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800'
    },
    red: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800'
    },
    gray: {
      text: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800'
    }
  };

  const colors = colorClasses[status.color];

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Status indicator */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm ${colors.bg} ${colors.border} border`}>
        <IconComponent 
          className={`h-4 w-4 ${colors.text} ${status.animate ? 'animate-spin' : ''}`} 
        />
        <span className={`font-medium ${colors.text}`}>
          {status.message}
        </span>
      </div>

      {/* Detailed information */}
      {showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {lastSave && (
            <span>
              Last {lastSave.success ? 'saved' : 'failed'} {formatTimeAgo(lastSave.timestamp)}
            </span>
          )}
          
          {successRate < 100 && lastSave && (
            <span className="ml-2">
              ({Math.round(successRate)}% success rate)
            </span>
          )}
        </div>
      )}

      {/* Connection status */}
      {!isOnline && (
        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <WifiIcon className="h-3 w-3" />
          <span>Offline</span>
        </div>
      )}
    </div>
  );
};

export default ProfileSaveStatus;