import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import {
  DocumentTextIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

function PrescriptionHistory() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPrescriptionHistory();
  }, []);

  useEffect(() => {
    filterPrescriptions();
  }, [prescriptions, searchTerm, statusFilter, dateFilter]);

  const fetchPrescriptionHistory = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching prescription history...');
      const response = await apiClient.get('/prescription-requests/pharmacy/accepted');
      console.log('✅ Prescription history received:', response.data);
      
      setPrescriptions(response.data.data || []);
    } catch (error) {
      console.error('❌ Error fetching prescription history:', error);
      toast.error(`Failed to fetch prescription history: ${error.response?.data?.message || error.message}`);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPrescriptions = () => {
    if (!Array.isArray(prescriptions)) return;
    let filtered = prescriptions.filter(prescription => {
      const matchesSearch = 
        prescription.prescriptionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${prescription.patient.profile.firstName} ${prescription.patient.profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.medications.some(med => med.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const prescriptionDate = new Date(prescription.submittedAt);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = prescriptionDate.toDateString() === now.toDateString();
            break;
          case 'week':
            matchesDate = prescriptionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            matchesDate = prescriptionDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            matchesDate = prescriptionDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    setFilteredPrescriptions(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const exportHistory = () => {
    const csvContent = [
      ['Prescription ID', 'Patient', 'Doctor', 'Status', 'Submitted Date', 'Total Amount', 'Delivery Method'],
      ...filteredPrescriptions.map(p => [
        p.prescriptionId,
        `${p.patient.profile.firstName} ${p.patient.profile.lastName}`,
        `${p.doctor.profile.firstName} ${p.doctor.profile.lastName}`,
        p.status,
        new Date(p.submittedAt).toLocaleDateString(),
        `$${p.totalAmount}`,
        p.deliveryMethod
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prescription-history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('History exported successfully');
  };

  const PrescriptionCard = ({ prescription }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(prescription.status)}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {prescription.prescriptionId}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(prescription.submittedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
          {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <UserIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Patient:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {prescription.patient.profile.firstName} {prescription.patient.profile.lastName}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Doctor:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {prescription.doctor.profile.firstName} {prescription.doctor.profile.lastName}
          </span>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Medications ({prescription.medications.length}):
          </p>
          <div className="space-y-1">
            {prescription.medications.slice(0, 2).map((med, index) => (
              <p key={index} className="text-sm text-gray-900 dark:text-white">
                • {med.name} - {med.quantity} units
              </p>
            ))}
            {prescription.medications.length > 2 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                +{prescription.medications.length - 2} more medications
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Total: </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ${prescription.totalAmount}
            </span>
          </div>
          
          <button
            onClick={() => {
              setSelectedPrescription(prescription);
              setShowDetailModal(true);
            }}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            <span className="text-sm">View Details</span>
          </button>
        </div>
      </div>
    </div>
  );

  const DetailModal = ({ prescription, isOpen, onClose }) => {
    if (!isOpen || !prescription) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Prescription Details
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Prescription Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600 dark:text-gray-400">ID:</span> {prescription.prescriptionId}</p>
                    <p><span className="text-gray-600 dark:text-gray-400">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                        {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                      </span>
                    </p>
                    <p><span className="text-gray-600 dark:text-gray-400">Submitted:</span> {new Date(prescription.submittedAt).toLocaleString()}</p>
                    {prescription.processedAt && (
                      <p><span className="text-gray-600 dark:text-gray-400">Processed:</span> {new Date(prescription.processedAt).toLocaleString()}</p>
                    )}
                    {prescription.fulfilledAt && (
                      <p><span className="text-gray-600 dark:text-gray-400">Fulfilled:</span> {new Date(prescription.fulfilledAt).toLocaleString()}</p>
                    )}
                    <p><span className="text-gray-600 dark:text-gray-400">Delivery:</span> {prescription.deliveryMethod}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Patient Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600 dark:text-gray-400">Name:</span> {prescription.patient.profile.firstName} {prescription.patient.profile.lastName}</p>
                    <p><span className="text-gray-600 dark:text-gray-400">Phone:</span> {prescription.patient.contact.phone}</p>
                    <p><span className="text-gray-600 dark:text-gray-400">Email:</span> {prescription.patient.contact.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Doctor Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600 dark:text-gray-400">Name:</span> {prescription.doctor.profile.firstName} {prescription.doctor.profile.lastName}</p>
                  <p><span className="text-gray-600 dark:text-gray-400">Specialization:</span> {prescription.doctor.specialization}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Medications
              </h3>
              <div className="space-y-4">
                {prescription.medications.map((med, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {med.name}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-600 dark:text-gray-400">Dosage:</span> {med.dosage}</p>
                          <p><span className="text-gray-600 dark:text-gray-400">Frequency:</span> {med.frequency}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600 dark:text-gray-400">Duration:</span> {med.duration}</p>
                        <p><span className="text-gray-600 dark:text-gray-400">Quantity:</span> {med.quantity}</p>
                        <p><span className="text-gray-600 dark:text-gray-400">Instructions:</span> {med.instructions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {prescription.notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Notes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  {prescription.notes}
                </p>
              </div>
            )}

            {prescription.rejectionReason && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Rejection Reason
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {prescription.rejectionReason}
                </p>
              </div>
            )}

            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Amount: ${prescription.totalAmount}
              </p>
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
            🗂️ Prescription History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage historical prescription records
          </p>
        </div>
        
        <button
          onClick={exportHistory}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Array.isArray(prescriptions) ? prescriptions.length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Fulfilled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Array.isArray(prescriptions) ? prescriptions.filter(p => p.status === 'fulfilled').length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Array.isArray(prescriptions) ? prescriptions.filter(p => p.status === 'pending').length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">$</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Array.isArray(prescriptions) ? prescriptions.reduce((total, p) => total + (p.totalAmount || 0), 0).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search prescriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Prescription List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Prescriptions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria' : 'Prescription history will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionCard key={prescription._id} prescription={prescription} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal 
        prescription={selectedPrescription}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}

export default PrescriptionHistory;
