/**
 * Enhanced Notifications Page
 * Full-featured notification management interface
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  BellIcon,
  Cog6ToothIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAdvancedNotifications } from '../hooks/useAdvancedNotifications';
import NotificationItem from '../components/notifications/NotificationItem';
import NotificationFilters from '../components/notifications/NotificationFilters';
import NotificationPreferences from '../components/notifications/NotificationPreferences';
import ConnectionStatus from '../components/notifications/ConnectionStatus';
import { toast } from 'react-toastify';

const Notifications = () => {
  const { user } = useSelector(state => state.auth);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch notifications on component mount and when filters change
  useEffect(() => {
    const fetchOptions = {
      page: currentPage,
      limit: pageSize,
      status: selectedFilter === 'all' ? undefined : selectedFilter,
      search: searchQuery.trim() || undefined,
      sortBy,
      sortOrder
    };

    fetchNotifications(fetchOptions);
  }, [currentPage, pageSize, selectedFilter, searchQuery, sortBy, sortOrder, fetchNotifications]);

  // Filter and search notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = getFilteredNotifications(selectedFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'desc') {
        return new Date(bValue) - new Date(aValue);
      } else {
        return new Date(aValue) - new Date(bValue);
      }
    });
  }, [notifications, selectedFilter, searchQuery, sortBy, sortOrder, getFilteredNotifications]);

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

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

  // Handle select all
  const handleSelectAll = (selected) => {
    if (selected) {
      const allIds = new Set(paginatedNotifications.map(n => n.id));
      setSelectedNotifications(allIds);
    } else {
      setSelectedNotifications(new Set());
    }
  };

  // Handle bulk actions
  const handleBulkMarkAsRead = async () => {
    try {
      const promises = Array.from(selectedNotifications).map(id => markAsRead(id));
      await Promise.all(promises);
      setSelectedNotifications(new Set());
      toast.success(`Marked ${selectedNotifications.size} notifications as read`);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedNotifications.size} notifications?`)) {
      return;
    }

    try {
      // TODO: Implement bulk delete API
      setSelectedNotifications(new Set());
      toast.success(`Deleted ${selectedNotifications.size} notifications`);
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setSelectedNotifications(new Set());
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success('Notifications refreshed');
    } catch (error) {
      toast.error('Failed to refresh notifications');
    }
  };

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedNotifications(new Set());
    setCurrentPage(1);
  };

  if (activeTab === 'preferences') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NotificationPreferences onBack={() => setActiveTab('notifications')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <BellIcon className="h-8 w-8 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Notifications
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    Welcome back, {user?.profile?.firstName || 'User'}
                  </p>
                  <ConnectionStatus status={connectionStatus} />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Notification Settings"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                  { key: 'high', label: 'Priority', count: notifications.filter(n => n.priority === 'high' || n.priority === 'critical').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedFilter(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedFilter === tab.key
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Advanced Filters"
              >
                <FunnelIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mb-6">
              <NotificationFilters
                onFilterChange={setSelectedFilter}
                onClear={clearFilters}
              />
            </div>
          )}

          {/* Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <EyeIcon className="h-4 w-4 inline mr-1" />
                  Mark as Read
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 inline mr-1" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedNotifications(new Set())}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {notifications.length > 0 && unreadCount > 0 && selectedNotifications.size === 0 && (
            <div className="mb-6">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <CheckIcon className="h-4 w-4 inline mr-2" />
                Mark All as Read ({unreadCount})
              </button>
            </div>
          )}

          {/* Bulk Selection */}
          {paginatedNotifications.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Select all on this page
                </span>
              </label>

              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <BellIcon className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchQuery || selectedFilter !== 'all' 
                  ? 'No notifications match your filters'
                  : 'No notifications yet'
                }
              </p>
              <p className="text-sm">
                {searchQuery || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'New notifications will appear here'
                }
              </p>
              {(searchQuery || selectedFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onSelect={(selected) => handleNotificationSelect(notification.id, selected)}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    showCheckbox={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-gray-500">...</span>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === totalPages
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;