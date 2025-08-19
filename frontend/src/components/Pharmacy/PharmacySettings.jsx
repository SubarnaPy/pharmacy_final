import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

function PharmacySettings() {
  const { isDarkMode, toggleDarkMode } = useContext(DarkModeContext);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching pharmacy settings...');
      const response = await apiClient.get('/pharmacies/me/settings');
      console.log('✅ Settings received:', response.data);
      
      setSettings(response.data.data || {});
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      toast.error(`Failed to fetch settings: ${error.response?.data?.message || error.message}`);
      // Set default settings structure if API fails
      setSettings({
        general: {
          autoAcceptOrders: false,
          orderTimeout: 30,
          maxDailyOrders: 100,
          requireInsuranceVerification: true,
          allowPartialFulfillment: true,
          defaultDeliveryRadius: 15,
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en'
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          newOrderAlerts: true,
          lowStockAlerts: true,
          expiredMedicationAlerts: true,
          paymentConfirmations: true,
          weeklyReports: true,
          monthlyReports: true
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 60,
          requirePasswordChange: 90,
          allowRememberDevice: false,
          loginAttemptLimit: 3,
          ipWhitelist: [],
          auditLogging: true
        },
        integrations: {
          paymentGateway: 'stripe',
          insuranceProvider: 'change_healthcare',
          ehr: 'epic',
          pos: 'square',
          deliveryService: 'uber_eats',
          smsProvider: 'twilio',
          emailProvider: 'sendgrid'
        },
        business: {
          taxRate: 8.5,
          processingFee: 2.5,
          deliveryFee: 5.99,
          freeDeliveryMinimum: 50.00,
          refundPolicy: 'within_24_hours',
          cancellationPolicy: 'before_processing',
          insuranceBilling: true,
          automatedInventory: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (category, newSettings) => {
    try {
      console.log('🔍 Updating pharmacy settings...', { category, newSettings });
      const response = await apiClient.put('/pharmacies/me/settings', {
        category,
        settings: newSettings
      });
      console.log('✅ Settings updated successfully:', response.data);
      
      setSettings(prev => ({
        ...prev,
        [category]: newSettings
      }));
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      toast.error(`Failed to update settings: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleToggle = (category, setting) => {
    const newSettings = {
      ...settings[category],
      [setting]: !settings[category][setting]
    };
    updateSettings(category, newSettings);
  };

  const handleInputChange = (category, setting, value) => {
    const newSettings = {
      ...settings[category],
      [setting]: value
    };
    updateSettings(category, newSettings);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully');
      } else {
        toast.error('Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const GeneralTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Order Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto-accept Orders</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically accept incoming prescription orders
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.general?.autoAcceptOrders || false}
                onChange={() => handleToggle('general', 'autoAcceptOrders')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.general?.orderTimeout || 30}
              onChange={(e) => handleInputChange('general', 'orderTimeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Daily Orders
            </label>
            <input
              type="number"
              value={settings.general?.maxDailyOrders || 100}
              onChange={(e) => handleInputChange('general', 'maxDailyOrders', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Require Insurance Verification</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verify insurance before processing orders
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.general?.requireInsuranceVerification || false}
                onChange={() => handleToggle('general', 'requireInsuranceVerification')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Delivery Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Delivery Radius (miles)
            </label>
            <input
              type="number"
              value={settings.general?.defaultDeliveryRadius || 15}
              onChange={(e) => handleInputChange('general', 'defaultDeliveryRadius', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={settings.general?.currency || 'USD'}
                onChange={(e) => handleInputChange('general', 'currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={settings.general?.timezone || 'America/New_York'}
                onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Appearance
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Switch between light and dark themes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Notification Channels
        </h3>
        
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', icon: EnvelopeIcon },
            { key: 'smsNotifications', label: 'SMS Notifications', icon: DevicePhoneMobileIcon },
            { key: 'pushNotifications', label: 'Push Notifications', icon: BellIcon }
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-gray-400" />
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications?.[key] || false}
                  onChange={() => handleToggle('notifications', key)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Alert Types
        </h3>
        
        <div className="space-y-4">
          {[
            { key: 'newOrderAlerts', label: 'New Order Alerts' },
            { key: 'lowStockAlerts', label: 'Low Stock Alerts' },
            { key: 'expiredMedicationAlerts', label: 'Expired Medication Alerts' },
            { key: 'paymentConfirmations', label: 'Payment Confirmations' },
            { key: 'weeklyReports', label: 'Weekly Reports' },
            { key: 'monthlyReports', label: 'Monthly Reports' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <p className="font-medium text-gray-900 dark:text-white">{label}</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications?.[key] || false}
                  onChange={() => handleToggle('notifications', key)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Password & Authentication
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.twoFactorAuth || false}
                onChange={() => handleToggle('security', 'twoFactorAuth')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Change Password</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Security Preferences
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.security?.sessionTimeout || 60}
              onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Login Attempt Limit
            </label>
            <input
              type="number"
              value={settings.security?.loginAttemptLimit || 3}
              onChange={(e) => handleInputChange('security', 'loginAttemptLimit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Audit Logging</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep detailed logs of all system activities
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security?.auditLogging || false}
                onChange={() => handleToggle('security', 'auditLogging')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const BusinessTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Pricing & Fees
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.business?.taxRate || 8.5}
              onChange={(e) => handleInputChange('business', 'taxRate', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Processing Fee (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.business?.processingFee || 2.5}
              onChange={(e) => handleInputChange('business', 'processingFee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Fee ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.business?.deliveryFee || 5.99}
              onChange={(e) => handleInputChange('business', 'deliveryFee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Free Delivery Minimum ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.business?.freeDeliveryMinimum || 50.00}
              onChange={(e) => handleInputChange('business', 'freeDeliveryMinimum', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Business Policies
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refund Policy
            </label>
            <select
              value={settings.business?.refundPolicy || 'within_24_hours'}
              onChange={(e) => handleInputChange('business', 'refundPolicy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="within_24_hours">Within 24 Hours</option>
              <option value="within_7_days">Within 7 Days</option>
              <option value="no_refunds">No Refunds</option>
              <option value="case_by_case">Case by Case</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cancellation Policy
            </label>
            <select
              value={settings.business?.cancellationPolicy || 'before_processing'}
              onChange={(e) => handleInputChange('business', 'cancellationPolicy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="before_processing">Before Processing</option>
              <option value="within_1_hour">Within 1 Hour</option>
              <option value="no_cancellation">No Cancellation</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Insurance Billing</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enable automatic insurance billing
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.business?.insuranceBilling || false}
                onChange={() => handleToggle('business', 'insuranceBilling')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Automated Inventory</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically update inventory levels
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.business?.automatedInventory || false}
                onChange={() => handleToggle('business', 'automatedInventory')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          ⚙️ Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your pharmacy management system preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', name: 'General', icon: CogIcon },
            { id: 'notifications', name: 'Notifications', icon: BellIcon },
            { id: 'security', name: 'Security', icon: ShieldCheckIcon },
            { id: 'business', name: 'Business', icon: BuildingStorefrontIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'business' && <BusinessTab />}
        </>
      )}
    </div>
  );
}

export default PharmacySettings;
