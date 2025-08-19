/**
 * Connection Status Component
 * Shows real-time connection status for notifications
 */

import React from 'react';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const ConnectionStatus = ({ status, lastConnected, reconnectAttempts = 0 }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircleIcon,
          text: 'Connected',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'connecting':
        return {
          icon: ArrowPathIcon,
          text: 'Connecting...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          animate: true
        };
      case 'disconnected':
        return {
          icon: XCircleIcon,
          text: 'Disconnected',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'failed':
        return {
          icon: ExclamationTriangleIcon,
          text: 'Connection Failed',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
      case 'offline':
        return {
          icon: WifiIcon,
          text: 'Offline',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
      default:
        return {
          icon: ClockIcon,
          text: 'Unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-md border ${config.bgColor} ${config.borderColor}`}>
      <Icon 
        className={`h-3 w-3 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
      
      {/* Show reconnect attempts if any */}
      {reconnectAttempts > 0 && status === 'connecting' && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (Attempt {reconnectAttempts})
        </span>
      )}
      
      {/* Show last connected time if disconnected */}
      {status === 'disconnected' && lastConnected && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Last: {new Date(lastConnected).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;