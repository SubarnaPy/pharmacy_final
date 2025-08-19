/**
 * Advanced Notification Center Component
 * Comprehensive notification management interface
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BellIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAdvancedNotifications } from '../../hooks/useAdvancedNotifications';
import NotificationItem from './NotificationItem';
import NotificationFilters from './NotificationFilters';
import NotificationPreferences from './NotificationPreferences';
import ConnectionStatus from './ConnectionStatus';

const NotificationCenter = ({ isOpen, onClose, className = '' }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    connectionStatus,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getFilteredNotifications,
    clearError,
    refresh
  } = useAdvancedNotifications();

  const [activeTab, setActiveTab] = useState('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = getFilteredNotifications(selectedFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, selectedFilter, searchQuery, getFilteredNotifications]);

  // Handle notification selection
  const handleNotificationSelect = (notificationId, selected) => {
    const newSelected = new Set(selectedNotifications);
    if (selected) {
      newSelected.add(notificationId);
    } else {
      newSelected.delete(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  // Handle bulk actions
  const handleBulkMarkAsRead = async () => {
    try {
      const promises = Array.from(selectedNotifications).map(id => markAsRead(id));
      await Promise.all(promises);
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedNotifications(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <BellIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
              <ConnectionStatus status={connectionStatus} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'notifications' ? 'preferences' : 'notifications')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'notifications' ? (
            <div className="h-full flex flex-col">
              {/* Search and Filters */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-1">
                    {[
                      { key: 'all', label: 'All', count: notifications.length },
                      { key: 'unread', label: 'Unread', count: unreadCount },
                      { key: 'high', label: 'Priority', count: notifications.filter(n => n.priority === 'high' || n.priority === 'critical').length }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedFilter(tab.key)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          selectedFilter === tab.key
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <NotificationFilters
                    onFilterChange={setSelectedFilter}
                    onClear={clearFilters}
                  />
                )}
              </div>

              {/* Bulk Actions */}
              {selectedNotifications.size > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedNotifications.size} selected
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleBulkMarkAsRead}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={() => setSelectedNotifications(new Set())}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                    <BellIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery || selectedFilter !== 'all' 
                        ? 'No notifications match your filters'
                        : 'No notifications yet'
                      }
                    </p>
                    {(searchQuery || selectedFilter !== 'all') && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        isSelected={selectedNotifications.has(notification.id)}
                        onSelect={(selected) => handleNotificationSelect(notification.id, selected)}
                        onMarkAsRead={() => markAsRead(notification.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <NotificationPreferences onBack={() => setActiveTab('notifications')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;