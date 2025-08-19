import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  WifiIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import useOfflineState from '../../../hooks/useOfflineState.js';

const ProfileErrorHandler = ({ 
  error, 
  onRetry, 
  onDismiss, 
  sectionName,
  showOfflineStatus = true,
  showRetryHistory = false,
  retryCount = 0,
  maxRetries = 3
}) => {
  const { isOnline, queuedOperations } = useOfflineState();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryHistory, setRetryHistory] = useState([]);

  // Handle retry with history tracking
  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    const retryAttempt = {
      timestamp: Date.now(),
      attempt: retryCount + 1
    };

    try {
      await onRetry();
      setRetryHistory(prev => [...prev, { ...retryAttempt, success: true }]);
    } catch (retryError) {
      setRetryHistory(prev => [...prev, { ...retryAttempt, success: false, error: retryError.message }]);
    } finally {
      setIsRetrying(false);
    }
  };

  // Get error type and styling
  const getErrorInfo = () => {
    if (!error) return null;

    const errorMessage = error?.response?.data?.message || error?.message || 'An unexpected error occurred';
    const errorCode = error?.response?.status || error?.code;

    // Network errors
    if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network') || !isOnline) {
      return {
        type: 'network',
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        icon: WifiIcon,
        color: 'orange',
        canRetry: true
      };
    }

    // Validation errors
    if (errorCode === 400 || errorMessage.includes('validation')) {
      return {
        type: 'validation',
        title: 'Validation Error',
        message: errorMessage,
        icon: ExclamationTriangleIcon,
        color: 'yellow',
        canRetry: false
      };
    }

    // Server errors
    if (errorCode >= 500) {
      return {
        type: 'server',
        title: 'Server Error',
        message: 'The server encountered an error. Please try again in a moment.',
        icon: XCircleIcon,
        color: 'red',
        canRetry: true
      };
    }

    // Authentication errors
    if (errorCode === 401 || errorCode === 403) {
      return {
        type: 'auth',
        title: 'Authentication Error',
        message: 'Your session has expired. Please refresh the page and try again.',
        icon: ExclamationTriangleIcon,
        color: 'red',
        canRetry: false
      };
    }

    // Generic error
    return {
      type: 'generic',
      title: 'Error',
      message: errorMessage,
      icon: XCircleIcon,
      color: 'red',
      canRetry: true
    };
  };

  const errorInfo = getErrorInfo();
  if (!errorInfo) return null;

  const colorClasses = {
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-500',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-500',
      title: 'text-orange-800 dark:text-orange-200',
      text: 'text-orange-700 dark:text-orange-300',
      button: 'bg-orange-600 hover:bg-orange-700 text-white'
    }
  };

  const colors = colorClasses[errorInfo.color];
  const IconComponent = errorInfo.icon;

  return (
    <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${colors.icon}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${colors.title}`}>
            {errorInfo.title}
            {sectionName && ` in ${sectionName}`}
          </h3>
          
          <div className={`mt-2 text-sm ${colors.text}`}>
            <p>{errorInfo.message}</p>
            
            {/* Offline status */}
            {showOfflineStatus && !isOnline && (
              <div className="mt-2 flex items-center gap-2">
                <WifiIcon className="h-4 w-4" />
                <span>You are currently offline. Changes will be saved when connection is restored.</span>
              </div>
            )}

            {/* Queued operations */}
            {queuedOperations.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span>{queuedOperations.length} operation{queuedOperations.length > 1 ? 's' : ''} queued</span>
              </div>
            )}

            {/* Retry information */}
            {retryCount > 0 && (
              <p className="mt-2">
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}

            {/* Retry history */}
            {showRetryHistory && retryHistory.length > 0 && (
              <div className="mt-3">
                <p className="font-medium mb-2">Retry History:</p>
                <div className="space-y-1">
                  {retryHistory.map((attempt, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {attempt.success ? (
                        <CheckCircleIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span>
                        Attempt {attempt.attempt} at {new Date(attempt.timestamp).toLocaleTimeString()}
                        {!attempt.success && ` - ${attempt.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            {errorInfo.canRetry && onRetry && retryCount < maxRetries && (
              <button
                onClick={handleRetry}
                disabled={isRetrying || !isOnline}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${colors.button} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            )}

            {retryCount >= maxRetries && (
              <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileErrorHandler;