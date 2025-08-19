/**
 * Notification Preferences Component
 * Comprehensive notification settings management
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ClockIcon,
  ShieldCheckIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  MoonIcon,
  SunIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useNotificationPreferences } from '../../hooks/useAdvancedNotifications';
import { toast } from 'react-toastify';

const NotificationPreferences = ({ onBack }) => {
  const {
    preferences,
    isLoading,
    error,
    updatePreferences,
    updateChannelPreference,
    updateCategoryPreference,
    updateQuietHours
  } = useNotificationPreferences();

  const [localPreferences, setLocalPreferences] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(JSON.parse(JSON.stringify(preferences)));
    }
  }, [preferences]);

  const handleChannelToggle = (channel, enabled) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      channels: {
        ...localPreferences.channels,
        [channel]: {
          ...localPreferences.channels[channel],
          enabled
        }
      }
    };

    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleCategoryToggle = (category, enabled) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          enabled
        }
      }
    };

    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleCategoryChannels = (category, channels) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          channels
        }
      }
    };

    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (quietHours) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      globalSettings: {
        ...localPreferences.globalSettings,
        quietHours
      }
    };

    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleGlobalSettingChange = (setting, value) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      globalSettings: {
        ...localPreferences.globalSettings,
        [setting]: value
      }
    };

    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPreferences || !hasChanges) return;

    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      setHasChanges(false);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update preferences: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences(JSON.parse(JSON.stringify(preferences)));
      setHasChanges(false);
    }
  };

  if (isLoading || !localPreferences) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const channels = [
    {
      key: 'websocket',
      label: 'In-App Notifications',
      description: 'Real-time notifications within the application',
      icon: BellIcon,
      color: 'text-blue-500'
    },
    {
      key: 'email',
      label: 'Email Notifications',
      description: 'Notifications sent to your email address',
      icon: EnvelopeIcon,
      color: 'text-green-500'
    },
    {
      key: 'sms',
      label: 'SMS Notifications',
      description: 'Text messages sent to your phone',
      icon: DevicePhoneMobileIcon,
      color: 'text-purple-500'
    }
  ];

  const categories = [
    {
      key: 'medical',
      label: 'Medical Notifications',
      description: 'Prescription updates, medication reminders, health alerts',
      icon: ShieldCheckIcon,
      color: 'text-red-500'
    },
    {
      key: 'administrative',
      label: 'Administrative',
      description: 'Account updates, billing, appointments',
      icon: ClockIcon,
      color: 'text-blue-500'
    },
    {
      key: 'system',
      label: 'System Notifications',
      description: 'Maintenance, updates, security alerts',
      icon: InformationCircleIcon,
      color: 'text-gray-500'
    },
    {
      key: 'marketing',
      label: 'Marketing & Promotions',
      description: 'Special offers, newsletters, product updates',
      icon: GlobeAltIcon,
      color: 'text-green-500'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notification Preferences
          </h2>
        </div>

        {hasChanges && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Global Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Global Settings
          </h3>
          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BellIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Enable Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Master switch for all notifications
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.globalSettings?.enabled ?? true}
                  onChange={(e) => handleGlobalSettingChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <MoonIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Quiet Hours
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Suppress non-critical notifications during these hours
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.globalSettings?.quietHours?.enabled ?? false}
                    onChange={(e) => handleQuietHoursChange({
                      ...localPreferences.globalSettings?.quietHours,
                      enabled: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {localPreferences.globalSettings?.quietHours?.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={localPreferences.globalSettings?.quietHours?.startTime || '22:00'}
                      onChange={(e) => handleQuietHoursChange({
                        ...localPreferences.globalSettings?.quietHours,
                        startTime: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={localPreferences.globalSettings?.quietHours?.endTime || '08:00'}
                      onChange={(e) => handleQuietHoursChange({
                        ...localPreferences.globalSettings?.quietHours,
                        endTime: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Channels */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Delivery Channels
          </h3>
          <div className="space-y-4">
            {channels.map(channel => (
              <div key={channel.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <channel.icon className={`h-5 w-5 ${channel.color}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {channel.label}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {channel.description}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.channels?.[channel.key]?.enabled ?? true}
                    onChange={(e) => handleChannelToggle(channel.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Categories */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Notification Categories
          </h3>
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.key} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {category.label}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localPreferences.categories?.[category.key]?.enabled ?? true}
                      onChange={(e) => handleCategoryToggle(category.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {localPreferences.categories?.[category.key]?.enabled && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery channels for this category:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {channels.map(channel => (
                        <label key={channel.key} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localPreferences.categories?.[category.key]?.channels?.includes(channel.key) ?? true}
                            onChange={(e) => {
                              const currentChannels = localPreferences.categories?.[category.key]?.channels || channels.map(c => c.key);
                              const newChannels = e.target.checked
                                ? [...currentChannels.filter(c => c !== channel.key), channel.key]
                                : currentChannels.filter(c => c !== channel.key);
                              handleCategoryChannels(category.key, newChannels);
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {channel.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Test Notifications
          </h3>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Send test notifications to verify your settings are working correctly.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Test In-App
              </button>
              <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                Test Email
              </button>
              <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                Test SMS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;