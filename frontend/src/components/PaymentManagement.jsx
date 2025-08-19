import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { 
  FaCreditCard, 
  FaPaypal, 
  FaUniversity, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaDownload,
  FaTimes,
  FaShieldAlt,
  FaHistory
} from 'react-icons/fa';

const PaymentManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('methods');
  const [paymentForm, setPaymentForm] = useState({
    type: 'card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    paypalEmail: '',
    bankAccountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    isDefault: false
  });

  const paymentTypes = [
    { value: 'card', label: 'Credit/Debit Card', icon: FaCreditCard },
    { value: 'paypal', label: 'PayPal', icon: FaPaypal },
    { value: 'bank', label: 'Bank Account', icon: FaUniversity }
  ];

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { value: month.toString().padStart(2, '0'), label: month.toString().padStart(2, '0') };
  });

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: year.toString(), label: year.toString() };
  });

  useEffect(() => {
    if (activeTab === 'methods') {
      fetchPaymentMethods();
    } else if (activeTab === 'history') {
      fetchTransactionHistory();
    }
  }, [activeTab]);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.getPaymentMethods();
      if (response.data.success) {
        setPaymentMethods(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.getTransactionHistory();
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      toast.error('Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const response = await paymentAPI.addPaymentMethod(paymentForm);
      if (response.data.success) {
        toast.success('Payment method added successfully');
        setShowAddPaymentForm(false);
        resetPaymentForm();
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const response = await paymentAPI.removePaymentMethod(methodId);
      if (response.data.success) {
        toast.success('Payment method deleted successfully');
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const setDefaultPaymentMethod = async (methodId) => {
    try {
      const response = await paymentAPI.setDefaultPaymentMethod(methodId);
      if (response.data.success) {
        toast.success('Default payment method updated');
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to update default payment method');
    }
  };

  const downloadReceipt = async (transactionId) => {
    try {
      const response = await paymentAPI.downloadReceipt(transactionId);
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${transactionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      type: 'card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      paypalEmail: '',
      bankAccountNumber: '',
      routingNumber: '',
      accountHolderName: '',
      isDefault: false
    });
  };

  const getPaymentMethodIcon = (type) => {
    const paymentType = paymentTypes.find(pt => pt.value === type);
    return paymentType ? paymentType.icon : FaCreditCard;
  };

  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    return `**** **** **** ${cardNumber.slice(-4)}`;
  };

  const getTransactionStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Management</h2>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { key: 'methods', label: 'Payment Methods', icon: FaCreditCard },
            { key: 'history', label: 'Transaction History', icon: FaHistory }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Methods Tab */}
        {activeTab === 'methods' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Saved Payment Methods</h3>
              <button
                onClick={() => setShowAddPaymentForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <FaPlus />
                Add Payment Method
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading payment methods...</p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <FaCreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No payment methods saved. Add your first payment method!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map(method => {
                  const IconComponent = getPaymentMethodIcon(method.type);
                  return (
                    <div key={method._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <IconComponent className="text-2xl text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {method.type === 'card' && maskCardNumber(method.cardNumber)}
                              {method.type === 'paypal' && method.paypalEmail}
                              {method.type === 'bank' && `****${method.bankAccountNumber?.slice(-4)}`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {method.type === 'card' && method.cardholderName}
                              {method.type === 'bank' && method.accountHolderName}
                              {method.type === 'paypal' && 'PayPal Account'}
                            </p>
                          </div>
                        </div>
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Default
                          </span>
                        )}
                      </div>

                      {method.type === 'card' && (
                        <p className="text-sm text-gray-600 mb-3">
                          Expires: {method.expiryMonth}/{method.expiryYear}
                        </p>
                      )}

                      <div className="flex gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => setDefaultPaymentMethod(method._id)}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePaymentMethod(method._id)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200 flex items-center gap-1"
                        >
                          <FaTrash className="text-xs" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Transaction History</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <FaHistory className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No transactions found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map(transaction => (
                  <div key={transaction._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-800">
                            Transaction #{transaction.transactionId || transaction._id.slice(-8)}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionStatusColor(transaction.status)}`}>
                            {transaction.status.replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="font-semibold text-gray-800">
                              ${transaction.amount?.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-medium text-gray-800">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment Method</p>
                            <p className="font-medium text-gray-800">
                              {transaction.paymentMethod?.type === 'card' && 
                                maskCardNumber(transaction.paymentMethod.cardNumber)
                              }
                              {transaction.paymentMethod?.type === 'paypal' && 'PayPal'}
                              {transaction.paymentMethod?.type === 'bank' && 'Bank Transfer'}
                            </p>
                          </div>
                        </div>

                        {transaction.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {transaction.description}
                          </p>
                        )}

                        {transaction.orderId && (
                          <p className="text-sm text-gray-600">
                            Order: #{transaction.orderId}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 md:mt-0 md:ml-6">
                        <button
                          onClick={() => setShowTransactionDetails(transaction)}
                          className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm"
                        >
                          <FaEye />
                          Details
                        </button>
                        
                        {transaction.status === 'completed' && (
                          <button
                            onClick={() => downloadReceipt(transaction._id)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
                          >
                            <FaDownload />
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {showAddPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Add Payment Method</h3>
                <button
                  onClick={() => {
                    setShowAddPaymentForm(false);
                    resetPaymentForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {paymentTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPaymentForm(prev => ({ ...prev, type: type.value }))}
                        className={`p-3 border rounded-lg flex flex-col items-center gap-2 ${
                          paymentForm.type === type.value
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <type.icon className="text-xl" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentForm.type === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cardNumber}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Month *
                        </label>
                        <select
                          value={paymentForm.expiryMonth}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, expiryMonth: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">MM</option>
                          {months.map(month => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year *
                        </label>
                        <select
                          value={paymentForm.expiryYear}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, expiryYear: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">YYYY</option>
                          {years.map(year => (
                            <option key={year.value} value={year.value}>
                              {year.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.cvv}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, cvv: e.target.value }))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cardholderName}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {paymentForm.type === 'paypal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayPal Email *
                    </label>
                    <input
                      type="email"
                      value={paymentForm.paypalEmail}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paypalEmail: e.target.value }))}
                      placeholder="your-email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {paymentForm.type === 'bank' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        value={paymentForm.accountHolderName}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankAccountNumber}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                          placeholder="Account Number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Routing Number *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.routingNumber}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, routingNumber: e.target.value }))}
                          placeholder="Routing Number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paymentForm.isDefault}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Set as default payment method</span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                  <FaShieldAlt className="text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Your payment information is encrypted and secure.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Payment Method'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPaymentForm(false);
                      resetPaymentForm();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setShowTransactionDetails(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Transaction ID:</span>
                    <p className="text-gray-600">
                      {showTransactionDetails.transactionId || showTransactionDetails._id}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getTransactionStatusColor(showTransactionDetails.status)}`}>
                      {showTransactionDetails.status.replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-600 font-semibold">
                      ${showTransactionDetails.amount?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-600">
                      {new Date(showTransactionDetails.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {showTransactionDetails.description && (
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600">{showTransactionDetails.description}</p>
                  </div>
                )}

                {showTransactionDetails.orderId && (
                  <div>
                    <span className="font-medium text-gray-700">Related Order:</span>
                    <p className="text-gray-600">#{showTransactionDetails.orderId}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {showTransactionDetails.status === 'completed' && (
                    <button
                      onClick={() => downloadReceipt(showTransactionDetails._id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <FaDownload />
                      Download Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
