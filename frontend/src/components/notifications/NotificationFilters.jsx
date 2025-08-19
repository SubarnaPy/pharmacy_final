/**
 * Notification Filters Component
 * Advanced filtering options for notifications
 */

import React, { useState } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const NotificationFilters = ({ onFilterChange, onClear, currentFilters = {} }) => {
  const [filters, setFilters] = useState({
    category: currentFilters.category || 'all',
    priority: currentFilters.priority || 'all',
    status: currentFilters.status || 'all',
    dateRange: currentFilters.dateRange || 'all',
    type: currentFilters.type || 'all'
  });

  const categories = [
    { value: 'all', label: 'All Categories', icon: TagIcon },
    { value: 'medical', label: 'Medical', icon: BellIcon },
    { value: 'administrative', label: 'Administrative', icon: ClockIcon },
    { value: 'system', label: 'System', icon: ExclamationTriangleIcon },
    { value: 'marketing', label: 'Marketing', icon: CheckCircleIcon }
  ];

  const priorities = [
    { value: 'all', label: 'All Priorities' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'low', label: 'Low', color: 'text-gray-600' }
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
    { value: 'archived', label: 'Archived' }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const notificationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'prescription_created', label: 'Prescription Created' },
    { value: 'order_status_changed', label: 'Order Status' },
    { value: 'appointment_reminder', label: 'Appointment' },
    { value: 'payment_processed', label: 'Payment' },
    { value: 'medication_reminder', label: 'Medication' },
    { value: 'system_maintenance', label: 'Maintenance' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      category: 'all',
      priority: 'all',
      status: 'all',
      dateRange: 'all',
      type: 'all'
    };
    setFilters(clearedFilters);
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advanced Filters
          </span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <XMarkIcon className="h-3 w-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dateRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {notificationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400">Active filters:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (value === 'all') return null;
            
            const filterLabels = {
              category: categories.find(c => c.value === value)?.label,
              priority: priorities.find(p => p.value === value)?.label,
              status: statuses.find(s => s.value === value)?.label,
              dateRange: dateRanges.find(d => d.value === value)?.label,
              type: notificationTypes.find(t => t.value === value)?.label
            };

            return (
              <span
                key={key}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs"
              >
                <span>{filterLabels[key]}</span>
                <button
                  onClick={() => handleFilterChange(key, 'all')}
                  className="hover:text-blue-600 dark:hover:text-blue-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationFilters;