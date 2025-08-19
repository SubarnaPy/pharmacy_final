import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  Squares2X2Icon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

function TransactionDashboard() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    revenueGrowth: 0,
    topPaymentMethod: 'credit_card'
  });

  useEffect(() => {
    fetchTransactions();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    filterTransactions();
    calculateAnalytics();
  }, [transactions, dateRange, paymentMethodFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Mock data
      setTransactions([
        {
          _id: '1',
          transactionId: 'TXN-2024-001',
          prescriptionId: 'RX-2024-001',
          patient: {
            profile: { firstName: 'John', lastName: 'Doe' },
            contact: { email: 'john@example.com' }
          },
          amount: 45.50,
          paymentMethod: 'credit_card',
          paymentStatus: 'completed',
          items: [
            { name: 'Amoxicillin 500mg', quantity: 21, price: 25.50 },
            { name: 'Ibuprofen 400mg', quantity: 10, price: 20.00 }
          ],
          tax: 3.64,
          discount: 0,
          fees: 1.36,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          insuranceClaim: {
            provider: 'Blue Cross',
            claimNumber: 'BC-2024-001',
            coveredAmount: 30.00,
            patientResponsibility: 15.50
          }
        },
        {
          _id: '2',
          transactionId: 'TXN-2024-002',
          prescriptionId: 'RX-2024-002',
          patient: {
            profile: { firstName: 'Jane', lastName: 'Smith' },
            contact: { email: 'jane@example.com' }
          },
          amount: 25.00,
          paymentMethod: 'debit_card',
          paymentStatus: 'completed',
          items: [
            { name: 'Lisinopril 10mg', quantity: 30, price: 25.00 }
          ],
          tax: 2.00,
          discount: 5.00,
          fees: 0.75,
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          insuranceClaim: null
        },
        {
          _id: '3',
          transactionId: 'TXN-2024-003',
          prescriptionId: 'RX-2024-003',
          patient: {
            profile: { firstName: 'Bob', lastName: 'Johnson' },
            contact: { email: 'bob@example.com' }
          },
          amount: 120.75,
          paymentMethod: 'cash',
          paymentStatus: 'completed',
          items: [
            { name: 'Metformin 1000mg', quantity: 90, price: 120.75 }
          ],
          tax: 9.66,
          discount: 10.00,
          fees: 0,
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          insuranceClaim: {
            provider: 'Aetna',
            claimNumber: 'AET-2024-001',
            coveredAmount: 96.60,
            patientResponsibility: 24.15
          }
        },
        {
          _id: '4',
          transactionId: 'TXN-2024-004',
          prescriptionId: null,
          patient: {
            profile: { firstName: 'Alice', lastName: 'Brown' },
            contact: { email: 'alice@example.com' }
          },
          amount: 35.99,
          paymentMethod: 'insurance',
          paymentStatus: 'pending',
          items: [
            { name: 'Vitamin D3', quantity: 1, price: 15.99 },
            { name: 'Multivitamin', quantity: 1, price: 20.00 }
          ],
          tax: 2.88,
          discount: 0,
          fees: 0,
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          insuranceClaim: {
            provider: 'United Health',
            claimNumber: 'UH-2024-001',
            coveredAmount: 28.79,
            patientResponsibility: 7.20,
            status: 'processing'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/transactions/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data || analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      const now = new Date();
      
      let dateMatch = true;
      switch (dateRange) {
        case 'today':
          dateMatch = transactionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          dateMatch = transactionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateMatch = transactionDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          dateMatch = transactionDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }

      const paymentMatch = paymentMethodFilter === 'all' || transaction.paymentMethod === paymentMethodFilter;

      return dateMatch && paymentMatch;
    });

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredTransactions(filtered);
  };

  const calculateAnalytics = () => {
    const completedTransactions = filteredTransactions.filter(t => t.paymentStatus === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = completedTransactions.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate growth (mock calculation)
    const revenueGrowth = Math.random() * 20 - 10; // Random between -10% and +10%

    // Find top payment method
    const paymentMethods = {};
    completedTransactions.forEach(t => {
      paymentMethods[t.paymentMethod] = (paymentMethods[t.paymentMethod] || 0) + 1;
    });
    const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) => 
      paymentMethods[a] > paymentMethods[b] ? a : b, 'credit_card');

    setAnalytics({
      totalRevenue,
      totalTransactions,
      averageTransaction,
      revenueGrowth,
      topPaymentMethod
    });
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCardIcon className="h-5 w-5" />;
      case 'cash':
        return <BanknotesIcon className="h-5 w-5" />;
      case 'insurance':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      default:
        return <CurrencyDollarIcon className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Transaction ID', 'Patient', 'Amount', 'Payment Method', 'Status', 'Date'],
      ...filteredTransactions.map(t => [
        t.transactionId,
        `${t.patient.profile.firstName} ${t.patient.profile.lastName}`,
        `$${t.amount}`,
        t.paymentMethod.replace('_', ' '),
        t.paymentStatus,
        new Date(t.timestamp).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Transactions exported successfully');
  };

  const TransactionCard = ({ transaction }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            {getPaymentMethodIcon(transaction.paymentMethod)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {transaction.transactionId}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(transaction.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.paymentStatus)}`}>
          {transaction.paymentStatus.charAt(0).toUpperCase() + transaction.paymentStatus.slice(1)}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Patient:</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {transaction.patient.profile.firstName} {transaction.patient.profile.lastName}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Items:</p>
          <div className="space-y-1">
            {transaction.items.slice(0, 2).map((item, index) => (
              <p key={index} className="text-sm text-gray-900 dark:text-white">
                • {item.name} (×{item.quantity}) - ${item.price}
              </p>
            ))}
            {transaction.items.length > 2 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                +{transaction.items.length - 2} more items
              </p>
            )}
          </div>
        </div>

        {transaction.insuranceClaim && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
              Insurance: {transaction.insuranceClaim.provider}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Covered: ${transaction.insuranceClaim.coveredAmount} | 
              Patient: ${transaction.insuranceClaim.patientResponsibility}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Total: </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ${transaction.amount}
            </span>
          </div>
          
          <button
            onClick={() => {
              setSelectedTransaction(transaction);
              setShowDetailModal(true);
            }}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            <span className="text-sm">Details</span>
          </button>
        </div>
      </div>
    </div>
  );

  const DetailModal = ({ transaction, isOpen, onClose }) => {
    if (!isOpen || !transaction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Transaction Details
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.paymentMethod.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.paymentStatus)}`}>
                    {transaction.paymentStatus.charAt(0).toUpperCase() + transaction.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Patient Information</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.patient.profile.firstName} {transaction.patient.profile.lastName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.patient.contact.email}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h3>
                <div className="space-y-3">
                  {transaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">${item.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {transaction.insuranceClaim && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Insurance Claim</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Provider</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{transaction.insuranceClaim.provider}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Claim Number</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{transaction.insuranceClaim.claimNumber}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Covered Amount</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">${transaction.insuranceClaim.coveredAmount}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Patient Responsibility</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">${transaction.insuranceClaim.patientResponsibility}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Payment Summary</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${(transaction.amount - transaction.tax - transaction.fees + transaction.discount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${transaction.tax}</span>
                  </div>
                  {transaction.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="font-medium text-green-600">-${transaction.discount}</span>
                    </div>
                  )}
                  {transaction.fees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Processing Fee:</span>
                      <span className="font-medium text-gray-900 dark:text-white">${transaction.fees}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="font-bold text-xl text-gray-900 dark:text-white">${transaction.amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            💰 Transaction Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor payments and financial analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Toggle Button */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TableCellsIcon className="h-4 w-4" />
              <span>Table</span>
            </button>
          </div>
        
        <button
          onClick={exportTransactions}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${analytics.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${analytics.averageTransaction.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              analytics.revenueGrowth >= 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {analytics.revenueGrowth >= 0 ? (
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth</p>
              <p className={`text-2xl font-bold ${
                analytics.revenueGrowth >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Payment Methods</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="cash">Cash</option>
            <option value="insurance">Insurance</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Transactions for the selected period will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTransactions.map((transaction) => (
            <TransactionCard key={transaction._id} transaction={transaction} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal 
        transaction={selectedTransaction}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}

export default TransactionDashboard;
