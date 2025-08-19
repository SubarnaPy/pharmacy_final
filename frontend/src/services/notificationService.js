import React from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

class NotificationService {
  constructor() {
    this.defaultOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };
  }

  // Success notifications
  success(message, options = {}) {
    return toast.success(message, {
      ...this.defaultOptions,
      ...options,
      icon: ({ theme, type }) => React.createElement(CheckCircleIcon, { className: "h-5 w-5 text-green-500" })
    });
  }

  // Error notifications with retry functionality
  error(message, options = {}) {
    const { onRetry, retryText = 'Retry', ...toastOptions } = options;

    const content = React.createElement('div',
      { className: "flex items-center justify-between w-full" },
      React.createElement('span', { className: "flex-1" }, message),
      onRetry && React.createElement('button', {
        onClick: () => {
          onRetry();
          toast.dismiss();
        },
        className: "ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
      },
        React.createElement(ArrowPathIcon, { className: "h-3 w-3" }),
        retryText
      )
    );

    return toast.error(content, {
      ...this.defaultOptions,
      autoClose: onRetry ? false : 5000, // Don't auto-close if retry is available
      ...toastOptions,
      icon: ({ theme, type }) => React.createElement(XCircleIcon, { className: "h-5 w-5 text-red-500" })
    });
  }

  // Warning notifications
  warning(message, options = {}) {
    return toast.warning(message, {
      ...this.defaultOptions,
      ...options,
      icon: ({ theme, type }) => React.createElement(ExclamationTriangleIcon, { className: "h-5 w-5 text-yellow-500" })
    });
  }

  // Info notifications
  info(message, options = {}) {
    return toast.info(message, {
      ...this.defaultOptions,
      ...options,
      icon: ({ theme, type }) => React.createElement(InformationCircleIcon, { className: "h-5 w-5 text-blue-500" })
    });
  }

  // Profile-specific notifications
  profileSaved(sectionName) {
    return this.success(`${sectionName} updated successfully`);
  }

  profileSaveError(sectionName, error, onRetry) {
    const message = error?.response?.data?.message || error?.message || `Failed to update ${sectionName}`;
    return this.error(message, { onRetry });
  }

  profileValidationError(errors) {
    const errorCount = Array.isArray(errors) ? errors.length : Object.keys(errors).length;
    const message = `Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} before saving`;
    return this.warning(message);
  }

  documentUploadSuccess(fileName) {
    return this.success(`${fileName} uploaded successfully`);
  }

  documentUploadError(fileName, error, onRetry) {
    const message = `Failed to upload ${fileName}: ${error?.message || 'Unknown error'}`;
    return this.error(message, { onRetry });
  }

  offlineMode() {
    return this.warning('You are offline. Changes will be saved when connection is restored.', {
      autoClose: false,
      toastId: 'offline-mode' // Prevent duplicate offline notifications
    });
  }

  onlineMode() {
    toast.dismiss('offline-mode');
    return this.info('Connection restored. Syncing changes...', {
      autoClose: 3000
    });
  }

  syncSuccess(changesCount) {
    return this.success(`${changesCount} change${changesCount > 1 ? 's' : ''} synced successfully`);
  }

  syncError(changesCount, onRetry) {
    return this.error(`Failed to sync ${changesCount} change${changesCount > 1 ? 's' : ''}`, {
      onRetry,
      retryText: 'Sync Now'
    });
  }

  // Batch operations
  batchSuccess(operation, count) {
    return this.success(`${operation} completed for ${count} item${count > 1 ? 's' : ''}`);
  }

  batchError(operation, failedCount, totalCount, onRetry) {
    return this.error(`${operation} failed for ${failedCount} of ${totalCount} items`, { onRetry });
  }

  // Dismiss specific toast
  dismiss(toastId) {
    toast.dismiss(toastId);
  }

  // Dismiss all toasts
  dismissAll() {
    toast.dismiss();
  }

  // Update existing toast
  update(toastId, options) {
    toast.update(toastId, options);
  }

  // Promise-based notifications for async operations
  promise(promise, messages = {}) {
    const {
      pending = 'Processing...',
      success = 'Operation completed successfully',
      error = 'Operation failed'
    } = messages;

    return toast.promise(promise, {
      pending: {
        render: pending,
        icon: false
      },
      success: {
        render: success,
        icon: ({ theme, type }) => React.createElement(CheckCircleIcon, { className: "h-5 w-5 text-green-500" })
      },
      error: {
        render: ({ data }) => {
          const message = data?.response?.data?.message || data?.message || error;
          return message;
        },
        icon: ({ theme, type }) => React.createElement(XCircleIcon, { className: "h-5 w-5 text-red-500" })
      }
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;