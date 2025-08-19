/**
 * Admin Notification Dashboard Component
 * Comprehensive notification management for administrators
 */

import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PaperAirplaneIcon,
  Cog6ToothIcon,
  FunnelIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { 
  getNotificationAnalyticsAPI, 
  sendBulkNotificationAPI, 
  getSystemNotificationStatsAPI 
} from '../../features/notification/notificationAPI';
import { toast } from 'react-toastify';

const AdminNotificationDashboard = () => {
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    deliveryRate: 0,
    readRate: 0,
    channelBreakdown: {
      websocket: { sent: 0, delivered: 0, read: 0 },
      email: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 }
    },
    roleBreakdown: {
      patient: { sent: 0, delivered: 0, engagement: 0 },
      doctor: { sent: 0, delivered: 0, engagement: 0 },
      pharmacy: { sent: 0, delivered: 0, engagement: 0 },
      admin: { sent: 0, delivered: 0, engagement: 0 }
    }
  });

  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [showBulkSender, setShowBulkSender] = useState(false);

  // Bulk notification form state
  const [bulkNotification, setBulkNotification] = useState({
    title: '',
    message: '',
    type: 'system_announcement',
    priority: 'medium',
    recipients: 'all',
    channels: ['websocket'],
    scheduledFor: null
  });

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await getSystemNotificationStatsAPI();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
      setError('Failed to load notification statistics');
      // Mock data for development
      setStats({
        totalSent: 15420,
        totalDelivered: 14890,
        totalRead: 12340,
        totalFailed: 530,
        deliveryRate: 96.6,
        readRate: 82.9,
        channelBreakdown: {
          websocket: { sent: 8500, delivered: 8450, read: 7200 },
          email: { sent: 5200, delivered: 4980, opened: 3800, clicked: 1200, bounced: 220 },
          sms: { sent: 1720, delivered: 1460, failed: 260 }
        },
        roleBreakdown: {
          patient: { sent: 8900, delivered: 8600, engagement: 78 },
          doctor: { sent: 3200, delivered: 3100, engagement: 85 },
          pharmacy: { sent: 2800, delivered: 2700, engagement: 88 },
          admin: { sent: 520, delivered: 490, engagement: 92 }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await getNotificationAnalyticsAPI({ dateRange });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Mock analytics data
      setAnalytics([
        { date: '2025-01-10', sent: 1200, delivered: 1150, read: 980 },
        { date: '2025-01-11', sent: 1350, delivered: 1300, read: 1100 },
        { date: '2025-01-12', sent: 1100, delivered: 1050, read: 890 },
        { date: '2025-01-13', sent: 1450, delivered: 1400, read: 1200 },
        { date: '2025-01-14', sent: 1600, delivered: 1550, read: 1350 },
        { date: '2025-01-15', sent: 1800, delivered: 1750, read: 1500 },
        { date: '2025-01-16', sent: 2100, delivered: 2050, read: 1800 }
      ]);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkNotification.title || !bulkNotification.message) {
      toast.error('Please fill in title and message');
      return;
    }

    try {
      setLoading(true);
      await sendBulkNotificationAPI(bulkNotification);
      toast.success('Bulk notification sent successfully');
      setBulkNotification({
        title: '',
        message: '',
        type: 'system_announcement',
        priority: 'medium',
        recipients: 'all',
        channels: ['websocket'],
        scheduledFor: null
      });
      setShowBulkSender(false);
      fetchStats(); // Refresh stats
    } catch (error) {
      toast.error('Failed to send bulk notification');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend > 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(trend)}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage system-wide notifications
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={() => setShowBulkSender(!showBulkSender)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span>Send Bulk Notification</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Bulk Notification Sender */}
      {showBulkSender && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Send Bulk Notification
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={bulkNotification.title}
                onChange={(e) => setBulkNotification({...bulkNotification, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Notification title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={bulkNotification.type}
                onChange={(e) => setBulkNotification({...bulkNotification, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="system_announcement">System Announcement</option>
                <option value="maintenance_alert">Maintenance Alert</option>
                <option value="security_update">Security Update</option>
                <option value="feature_update">Feature Update</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={bulkNotification.priority}
                onChange={(e) => setBulkNotification({...bulkNotification, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipients
              </label>
              <select
                value={bulkNotification.recipients}
                onChange={(e) => setBulkNotification({...bulkNotification, recipients: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Users</option>
                <option value="patients">Patients Only</option>
                <option value="doctors">Doctors Only</option>
                <option value="pharmacies">Pharmacies Only</option>
                <option value="admins">Admins Only</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={bulkNotification.message}
              onChange={(e) => setBulkNotification({...bulkNotification, message: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Notification message"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Channels
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'websocket', label: 'In-App', icon: BellIcon },
                { key: 'email', label: 'Email', icon: EnvelopeIcon },
                { key: 'sms', label: 'SMS', icon: DevicePhoneMobileIcon }
              ].map(channel => (
                <label key={channel.key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkNotification.channels.includes(channel.key)}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...bulkNotification.channels, channel.key]
                        : bulkNotification.channels.filter(c => c !== channel.key);
                      setBulkNotification({...bulkNotification, channels});
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <channel.icon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{channel.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowBulkSender(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSend}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sent"
          value={stats.totalSent.toLocaleString()}
          icon={PaperAirplaneIcon}
          trend={12}
          color="blue"
        />
        <StatCard
          title="Delivery Rate"
          value={`${stats.deliveryRate}%`}
          subtitle={`${stats.totalDelivered.toLocaleString()} delivered`}
          icon={CheckCircleIcon}
          trend={2.5}
          color="green"
        />
        <StatCard
          title="Read Rate"
          value={`${stats.readRate}%`}
          subtitle={`${stats.totalRead.toLocaleString()} read`}
          icon={EyeIcon}
          trend={-1.2}
          color="purple"
        />
        <StatCard
          title="Failed"
          value={stats.totalFailed.toLocaleString()}
          subtitle={`${((stats.totalFailed / stats.totalSent) * 100).toFixed(1)}% failure rate`}
          icon={ExclamationTriangleIcon}
          trend={-5.8}
          color="red"
        />
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Channel Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <BellIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">In-App</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.channelBreakdown.websocket.sent.toLocaleString()} sent
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">
                  {((stats.channelBreakdown.websocket.delivered / stats.channelBreakdown.websocket.sent) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">delivery rate</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Email</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.channelBreakdown.email.sent.toLocaleString()} sent
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">
                  {((stats.channelBreakdown.email.delivered / stats.channelBreakdown.email.sent) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">delivery rate</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">SMS</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.channelBreakdown.sms.sent.toLocaleString()} sent
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-600">
                  {((stats.channelBreakdown.sms.delivered / stats.channelBreakdown.sms.sent) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">delivery rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            User Role Engagement
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.roleBreakdown).map(([role, data]) => (
              <div key={role} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{role}s</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {data.sent.toLocaleString()} notifications
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {data.engagement}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">engagement</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Trends
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Sent</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Delivered</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Read</span>
            </div>
          </div>
        </div>
        
        {/* Simple chart representation */}
        <div className="h-64 flex items-end justify-between space-x-2">
          {analytics.map((day, index) => (
            <div key={day.date} className="flex-1 flex flex-col items-center space-y-1">
              <div className="w-full flex flex-col items-center space-y-1">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(day.sent / Math.max(...analytics.map(d => d.sent))) * 200}px` }}
                  title={`Sent: ${day.sent}`}
                ></div>
                <div 
                  className="w-full bg-green-500"
                  style={{ height: `${(day.delivered / Math.max(...analytics.map(d => d.sent))) * 200}px` }}
                  title={`Delivered: ${day.delivered}`}
                ></div>
                <div 
                  className="w-full bg-purple-500 rounded-b"
                  style={{ height: `${(day.read / Math.max(...analytics.map(d => d.sent))) * 200}px` }}
                  title={`Read: ${day.read}`}
                ></div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationDashboard;