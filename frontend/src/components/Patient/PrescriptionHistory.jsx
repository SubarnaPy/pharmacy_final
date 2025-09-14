import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaHistory, 
  FaPrescriptionBottleAlt, 
  FaEye, 
  FaDownload,
  FaSearch, 
  FaFilter,
  FaCalendar,
  FaHospital,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaFileImage,
  FaFilePdf,
  FaUser,
  FaMapMarkerAlt,
  FaTags,
  FaPlus,
  FaSync
} from 'react-icons/fa';
import apiClient from '../../api/apiClient';

const PrescriptionHistory = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    fulfilled: 0
  });

  useEffect(() => {
    fetchPrescriptionHistory();
  }, []);

  useEffect(() => {
    filterPrescriptions();
    calculateStats();
  }, [prescriptions, searchTerm, statusFilter, dateFilter]);

  const fetchPrescriptionHistory = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching patient prescription history...');
      
      const response = await apiClient.get('/prescription-requests/my-requests', {
        params: {
          limit: 100,
          sort: '-createdAt'
        }
      });

      if (response.data.success) {
        console.log('✅ Prescription history received:', response.data.data);
        setPrescriptions(response.data.data || []);
      } else {
        console.warn('⚠️ API returned success: false');
        setPrescriptions([]);
      }
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
      // Search filter
      const matchesSearch = !searchTerm || 
        prescription.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.medications?.some(med => 
          med.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        prescription.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all' && prescription.createdAt) {
        const prescriptionDate = new Date(prescription.createdAt);
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
          case 'year':
            matchesDate = prescriptionDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredPrescriptions(filtered);
  };

  const calculateStats = () => {
    const stats = {
      total: prescriptions.length,
      pending: prescriptions.filter(p => p.status === 'pending').length,
      accepted: prescriptions.filter(p => p.status === 'accepted').length,
      rejected: prescriptions.filter(p => p.status === 'rejected').length,
      fulfilled: prescriptions.filter(p => p.status === 'fulfilled').length
    };
    setStats(stats);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'accepted':
        return <FaCheckCircle className="text-green-500" />;
      case 'rejected':
        return <FaTimesCircle className="text-red-500" />;
      case 'fulfilled':
        return <FaCheckCircle className="text-blue-500" />;
      case 'processing':
        return <FaSpinner className="text-blue-500 animate-spin" />;
      default:
        return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      accepted: { color: 'bg-green-100 text-green-800', label: 'Accepted' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      fulfilled: { color: 'bg-blue-100 text-blue-800', label: 'Fulfilled' },
      processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleDownloadPrescription = (prescription) => {
    if (prescription.prescriptionImage) {
      window.open(prescription.prescriptionImage, '_blank');
    } else {
      toast.warning('No prescription image available for download');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading prescription history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-emerald-500" />
            Prescription History
          </h1>
          <button
            onClick={fetchPrescriptionHistory}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <FaSync /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-sm text-green-700">Accepted</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-red-700">Rejected</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.fulfilled}</div>
            <div className="text-sm text-blue-700">Fulfilled</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search prescriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FaPrescriptionBottleAlt className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Prescriptions Found</h3>
          <p className="text-gray-500 mb-6">
            {prescriptions.length === 0 
              ? "You haven't uploaded any prescriptions yet." 
              : "No prescriptions match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription._id}
              prescription={prescription}
              onView={() => handleViewDetails(prescription)}
              onDownload={() => handleDownloadPrescription(prescription)}
              getStatusIcon={getStatusIcon}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPrescription && (
        <PrescriptionDetailsModal
          prescription={selectedPrescription}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPrescription(null);
          }}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

// Prescription Card Component
const PrescriptionCard = ({ 
  prescription, 
  onView, 
  onDownload, 
  getStatusIcon, 
  getStatusBadge, 
  formatDate 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <FaPrescriptionBottleAlt className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {prescription.requestNumber || `Request #${prescription._id?.slice(-6)}`}
            </h3>
            <p className="text-sm text-gray-600">
              Submitted {formatDate(prescription.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(prescription.status)}
          {getStatusBadge(prescription.status)}
        </div>
      </div>

      {/* Medications */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Medications:</h4>
        <div className="flex flex-wrap gap-2">
          {prescription.medications?.slice(0, 3).map((med, index) => (
            <span 
              key={index} 
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {med.name || med.genericName} {med.dosage}
            </span>
          ))}
          {prescription.medications?.length > 3 && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              +{prescription.medications.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Doctor Info */}
      {prescription.doctor && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaUser className="text-gray-400" />
            <span>Dr. {prescription.doctor.name}</span>
            {prescription.doctor.specialization && (
              <>
                <span>•</span>
                <span>{prescription.doctor.specialization}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pharmacy Responses */}
      {prescription.pharmacyResponses && prescription.pharmacyResponses.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-700 mb-2">Pharmacy Responses:</h5>
          <div className="space-y-1">
            {prescription.pharmacyResponses.slice(0, 2).map((response, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <FaHospital className="inline mr-1" />
                  {response.pharmacy?.businessName || 'Pharmacy'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  response.responseType === 'accept' 
                    ? 'bg-green-100 text-green-800' 
                    : response.responseType === 'reject'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {response.responseType || 'pending'}
                </span>
              </div>
            ))}
            {prescription.pharmacyResponses.length > 2 && (
              <p className="text-xs text-gray-500">
                +{prescription.pharmacyResponses.length - 2} more responses
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={onView}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm"
        >
          <FaEye className="inline mr-1" /> View Details
        </button>
        {prescription.prescriptionImage && (
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            <FaDownload className="inline mr-1" /> Download
          </button>
        )}
      </div>
    </div>
  );
};

// Prescription Details Modal Component
const PrescriptionDetailsModal = ({ prescription, onClose, formatDateTime }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Prescription Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimesCircle size={24} />
            </button>
          </div>

          {/* Prescription Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Request Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Request Number:</strong> {prescription.requestNumber}</p>
                <p><strong>Status:</strong> {prescription.status}</p>
                <p><strong>Submitted:</strong> {formatDateTime(prescription.createdAt)}</p>
                {prescription.updatedAt !== prescription.createdAt && (
                  <p><strong>Last Updated:</strong> {formatDateTime(prescription.updatedAt)}</p>
                )}
              </div>
            </div>

            {prescription.doctor && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Doctor Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> Dr. {prescription.doctor.name}</p>
                  {prescription.doctor.specialization && (
                    <p><strong>Specialization:</strong> {prescription.doctor.specialization}</p>
                  )}
                  {prescription.doctor.hospitalName && (
                    <p><strong>Hospital:</strong> {prescription.doctor.hospitalName}</p>
                  )}
                  {prescription.doctor.licenseNumber && (
                    <p><strong>License:</strong> {prescription.doctor.licenseNumber}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Medications */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Medications</h3>
            <div className="space-y-3">
              {prescription.medications?.map((med, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-800">
                    {med.name || med.genericName}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {med.dosage && <span><strong>Dosage:</strong> {med.dosage} </span>}
                    {med.frequency && <span><strong>Frequency:</strong> {med.frequency} </span>}
                    {med.duration && <span><strong>Duration:</strong> {med.duration}</span>}
                  </div>
                  {med.instructions && (
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Instructions:</strong> {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pharmacy Responses */}
          {prescription.pharmacyResponses && prescription.pharmacyResponses.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Pharmacy Responses</h3>
              <div className="space-y-3">
                {prescription.pharmacyResponses.map((response, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-800">
                        {response.pharmacy?.businessName || 'Pharmacy'}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        response.responseType === 'accept' 
                          ? 'bg-green-100 text-green-800' 
                          : response.responseType === 'reject'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {response.responseType || 'pending'}
                      </span>
                    </div>
                    {response.estimatedCost && (
                      <p className="text-sm text-gray-600">
                        <strong>Estimated Cost:</strong> ₹{response.estimatedCost}
                      </p>
                    )}
                    {response.estimatedTime && (
                      <p className="text-sm text-gray-600">
                        <strong>Estimated Time:</strong> {response.estimatedTime}
                      </p>
                    )}
                    {response.notes && (
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {response.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Responded: {formatDateTime(response.responseDate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescription Image */}
          {prescription.prescriptionImage && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Prescription Image</h3>
              <div className="border rounded-lg p-4">
                <img 
                  src={prescription.prescriptionImage} 
                  alt="Prescription"
                  className="max-w-full h-auto rounded"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionHistory;
