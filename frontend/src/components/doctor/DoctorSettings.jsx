import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

function DoctorSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    profile: {
      firstName: 'Dr. Sarah',
      lastName: 'Wilson',
      email: 'dr.sarah@example.com',
      phone: '+1-555-0123',
      bio: 'Experienced dermatologist with 8+ years of practice.',
      profileImage: null
    },
    notifications: {
      appointmentReminders: true,
      patientMessages: true,
      paymentAlerts: true,
      marketingEmails: false,
      smsNotifications: true,
      weeklyReports: true
    },
    privacy: {
      profileVisibility: 'public',
      allowOnlineBooking: true,
      showRatings: true,
      shareWithInsurance: false,
      dataRetention: '5years'
    },
    availability: {
      timeZone: 'America/Los_Angeles',
      workingHours: {
        monday: { enabled: true, start: '08:00', end: '18:00' },
        tuesday: { enabled: true, start: '08:00', end: '18:00' },
        wednesday: { enabled: true, start: '08:00', end: '18:00' },
        thursday: { enabled: true, start: '08:00', end: '18:00' },
        friday: { enabled: true, start: '08:00', end: '16:00' },
        saturday: { enabled: true, start: '09:00', end: '13:00' },
        sunday: { enabled: false, start: '', end: '' }
      },
      bufferTime: 15,
      maxAdvanceBooking: 60
    },
    consultation: {
      videoEnabled: true,
      phoneEnabled: true,
      chatEnabled: true,
      inPersonEnabled: true,
      fees: {
        video: 150,
        phone: 100,
        chat: 75,
        inPerson: 200
      },
      duration: {
        video: 30,
        phone: 30,
        chat: 30,
        inPerson: 45
      }
    },
    payment: {
      acceptsCreditCard: true,
      acceptsInsurance: true,
      acceptsCash: true,
      defaultCurrency: 'USD',
      taxRate: 8.5,
      paymentTerms: '24hours'
    }
  });

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleNestedSettingChange = (category, parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...prev[category][parentKey],
          [childKey]: value
        }
      }
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
    { id: 'availability', label: 'Availability', icon: ClockIcon },
    { id: 'consultation', label: 'Consultation', icon: VideoCameraIcon },
    { id: 'payment', label: 'Payment', icon: CreditCardIcon }
  ];

  const SettingCard = ({ title, children, className = "" }) => (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      {children}
    </div>
  );

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
            <input
              type="text"
              value={settings.profile.firstName}
              onChange={(e) => handleSettingChange('profile', 'firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
            <input
              type="text"
              value={settings.profile.lastName}
              onChange={(e) => handleSettingChange('profile', 'lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={settings.profile.email}
              onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
            <input
              type="tel"
              value={settings.profile.phone}
              onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea
            value={settings.profile.bio}
            onChange={(e) => handleSettingChange('profile', 'bio', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </SettingCard>

      <SettingCard title="Security">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            Update Password
          </button>
        </div>
      </SettingCard>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Email Notifications">
        <div className="space-y-4">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {key === 'appointmentReminders' && 'Get notified about upcoming appointments'}
                  {key === 'patientMessages' && 'Receive notifications for new patient messages'}
                  {key === 'paymentAlerts' && 'Get alerts for payment confirmations and failures'}
                  {key === 'marketingEmails' && 'Receive promotional emails and newsletters'}
                  {key === 'smsNotifications' && 'Get SMS notifications for urgent matters'}
                  {key === 'weeklyReports' && 'Receive weekly practice performance reports'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );

  const renderAvailabilitySettings = () => (
    <div className="space-y-6">
      <SettingCard title="Working Hours">
        <div className="space-y-4">
          {Object.entries(settings.availability.workingHours).map(([day, hours]) => (
            <div key={day} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hours.enabled}
                    onChange={(e) => handleNestedSettingChange('availability', 'workingHours', day, { ...hours, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize w-20">{day}</span>
              </div>
              {hours.enabled && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={hours.start}
                    onChange={(e) => handleNestedSettingChange('availability', 'workingHours', day, { ...hours, start: e.target.value })}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours.end}
                    onChange={(e) => handleNestedSettingChange('availability', 'workingHours', day, { ...hours, end: e.target.value })}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Booking Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buffer Time (minutes)</label>
            <input
              type="number"
              value={settings.availability.bufferTime}
              onChange={(e) => handleSettingChange('availability', 'bufferTime', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Advance Booking (days)</label>
            <input
              type="number"
              value={settings.availability.maxAdvanceBooking}
              onChange={(e) => handleSettingChange('availability', 'maxAdvanceBooking', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderConsultationSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Consultation Types & Fees">
        <div className="space-y-4">
          {Object.entries(settings.consultation.fees).map(([type, fee]) => (
            <div key={type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.consultation[`${type}Enabled`]}
                    onChange={(e) => handleSettingChange('consultation', `${type}Enabled`, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {type === 'inPerson' ? 'In-Person' : type}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => handleNestedSettingChange('consultation', 'fees', type, parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ({settings.consultation.duration[type]} min)
                </span>
              </div>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your account and practice preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && renderProfileSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'availability' && renderAvailabilitySettings()}
          {activeTab === 'consultation' && renderConsultationSettings()}
          {/* Other tabs can be implemented similarly */}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default DoctorSettings;
