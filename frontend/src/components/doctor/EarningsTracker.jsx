import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function EarningsTracker() {
  const [earningsData, setEarningsData] = useState({
    todayEarnings: 850,
    weeklyEarnings: 3400,
    monthlyEarnings: 12500,
    totalEarnings: 45600,
    pendingPayments: 1200,
    completedPayments: 11300
  });
  
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    // Mock data - replace with actual API calls
    setMonthlyData([
      { month: 'Jan', earnings: 8500, consultations: 34 },
      { month: 'Feb', earnings: 9200, consultations: 38 },
      { month: 'Mar', earnings: 11800, consultations: 47 },
      { month: 'Apr', earnings: 10500, consultations: 42 },
      { month: 'May', earnings: 13200, consultations: 53 },
      { month: 'Jun', earnings: 12800, consultations: 51 },
      { month: 'Jul', earnings: 14500, consultations: 58 },
      { month: 'Aug', earnings: 12500, consultations: 50 }
    ]);

    setWeeklyData([
      { day: 'Mon', earnings: 450, consultations: 6 },
      { day: 'Tue', earnings: 380, consultations: 5 },
      { day: 'Wed', earnings: 520, consultations: 7 },
      { day: 'Thu', earnings: 420, consultations: 6 },
      { day: 'Fri', earnings: 600, consultations: 8 },
      { day: 'Sat', earnings: 320, consultations: 4 },
      { day: 'Sun', earnings: 280, consultations: 4 }
    ]);

    setPaymentMethods([
      { name: 'Credit Card', value: 65, color: '#3B82F6' },
      { name: 'Insurance', value: 25, color: '#10B981' },
      { name: 'Cash', value: 7, color: '#F59E0B' },
      { name: 'Other', value: 3, color: '#8B5CF6' }
    ]);

    setRecentTransactions([
      {
        id: 1,
        patientName: 'Sarah Johnson',
        amount: 150,
        type: 'Video Consultation',
        status: 'completed',
        date: '2025-08-03',
        paymentMethod: 'Credit Card'
      },
      {
        id: 2,
        patientName: 'Michael Chen',
        amount: 200,
        type: 'In-Person Consultation',
        status: 'completed',
        date: '2025-08-03',
        paymentMethod: 'Insurance'
      },
      {
        id: 3,
        patientName: 'Emily Davis',
        amount: 100,
        type: 'Phone Consultation',
        status: 'pending',
        date: '2025-08-03',
        paymentMethod: 'Credit Card'
      },
      {
        id: 4,
        patientName: 'Robert Wilson',
        amount: 250,
        type: 'Comprehensive Exam',
        status: 'completed',
        date: '2025-08-02',
        paymentMethod: 'Cash'
      }
    ]);
  }, []);

  const StatCard = ({ title, value, change, icon: Icon, color, prefix = '$', suffix = '' }) => (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {change > 0 ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const TransactionRow = ({ transaction }) => (
    <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
          <CurrencyDollarIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.patientName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.type}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900 dark:text-gray-100">${transaction.amount}</p>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            transaction.status === 'completed' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {transaction.status}
          </span>
        </div>
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Earnings: ${payload[0].value.toLocaleString()}
          </p>
          {payload[1] && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Consultations: {payload[1].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Earnings Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor your income and financial performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Earnings"
          value={earningsData.todayEarnings}
          change={12}
          icon={CurrencyDollarIcon}
          color="bg-emerald-500"
        />
        <StatCard
          title="Weekly Earnings"
          value={earningsData.weeklyEarnings}
          change={8}
          icon={ChartBarIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="Monthly Earnings"
          value={earningsData.monthlyEarnings}
          change={-3}
          icon={TrendingUpIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Earnings"
          value={earningsData.totalEarnings}
          change={15}
          icon={BanknotesIcon}
          color="bg-indigo-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Trend */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Earnings Trend</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Earnings</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={selectedPeriod === 'week' ? weeklyData : monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey={selectedPeriod === 'week' ? 'day' : 'month'} 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Payment Methods</h3>
          <div className="flex flex-col lg:flex-row items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4 lg:mt-0 lg:ml-6">
              {paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: method.color }}
                  ></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {method.name}: {method.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
            Completed Payments
          </h3>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              ${earningsData.completedPayments.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">This month</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-yellow-500" />
            Pending Payments
          </h3>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              ${earningsData.pendingPayments.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting processing</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
          <button className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {recentTransactions.map(transaction => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Generate Report
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Payment Settings
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Advanced Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

export default EarningsTracker;
