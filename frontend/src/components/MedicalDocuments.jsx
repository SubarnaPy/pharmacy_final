import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUpload, 
  FaFile, 
  FaImage,
  FaFilePdf,
  FaSearch, 
  FaFilter,
  FaEye,
  FaDownload,
  FaShare,
  FaArchive,
  FaTrash,
  FaEdit,
  FaSync,
  FaPlus,
  FaTags,
  FaCalendar,
  FaUser,
  FaHospital,
  FaStethoscope,
  FaSpinner,
  FaCheckCircle,
  FaTimes,
} from 'react-icons/fa';
import medicalDocumentAPI from '../api/medicalDocumentAPI';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentDetailsModal from './DocumentDetailsModal';

const MedicalDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    documentType: '',
    search: '',
    status: '',
    tags: '',
    includeArchived: false
  });
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  // Document types for filtering and upload
  const documentTypes = [
    { value: 'medical_report', label: 'Medical Report' },
    { value: 'lab_result', label: 'Lab Result' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'insurance_card', label: 'Insurance Card' },
    { value: 'vaccination_record', label: 'Vaccination Record' },
    { value: 'allergy_card', label: 'Allergy Card' },
    { value: 'medical_history', label: 'Medical History' },
    { value: 'diagnostic_image', label: 'Diagnostic Image' },
    { value: 'discharge_summary', label: 'Discharge Summary' },
    { value: 'referral_letter', label: 'Referral Letter' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [filters, pagination.currentPage]);

  // Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => doc.status === 'processing' || doc.status === 'uploading');
    
    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing for processing documents...');
        fetchDocuments();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await medicalDocumentAPI.getDocuments({
        ...filters,
        page: pagination.currentPage,
        limit: 12
      });

      if (response.data.success) {
        setDocuments(response.data.data || []);
        setPagination({
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1,
          totalCount: response.data.totalCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await medicalDocumentAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats if API fails
      setStats({
        summary: {
          totalDocuments: 0,
          archivedDocuments: 0,
          activeDocuments: 0,
          totalFileSize: 0,
          documentTypes: [],
          averageAccessCount: 0,
          lastUpload: null
        },
        typeBreakdown: []
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleViewDocument = async (document) => {
    try {
      console.log('🔍 View button clicked for document:', document);
      const documentId = document.id || document._id;
      console.log('📄 Document ID:', documentId);
      
      if (!documentId) {
        console.error('❌ Document ID is missing');
        toast.error('Document ID is missing');
        return;
      }

      console.log('🌐 Making API call to get document details...');
      const response = await medicalDocumentAPI.getDocument(documentId);
      console.log('📊 API Response:', response);
      
      if (response.data.success) {
        // The document data is nested under response.data.data, not response.data.document
        const documentData = response.data.data || response.data.document;
        console.log('✅ Document details received:', documentData);
        setSelectedDocument(documentData);
        setShowDetailsModal(true);
        console.log('🎭 Modal should now be visible');
      } else {
        console.error('❌ API call failed:', response.data);
        toast.error('Failed to load document details');
      }
    } catch (error) {
      console.error('💥 Error fetching document details:', error);
      toast.error('Failed to load document details');
    }
  };

  const handleArchiveDocument = async (documentId, archive = true) => {
    try {
      const response = await medicalDocumentAPI.updateDocument(documentId, { isArchived: archive });
      if (response.data.success) {
        toast.success(`Document ${archive ? 'archived' : 'unarchived'} successfully`);
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await medicalDocumentAPI.deleteDocument(documentId);
      if (response.data.success) {
        toast.success('Document deleted successfully');
        fetchDocuments();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocumentIcon = (mimeType) => {
    if (mimeType && mimeType.startsWith('image/')) {
      return <FaImage className="text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FaFilePdf className="text-red-500" />;
    }
    return <FaFile className="text-gray-500" />;
  };

  const getStatusBadge = (document) => {
    let status = 'completed'; // default status
    
    if (document.isArchived) {
      status = 'archived';
    } else if (document.status === 'processing') {
      status = 'processing';
    } else if (document.status === 'uploading') {
      status = 'uploading';
    } else if (document.status === 'failed') {
      status = 'failed';
    } else if (document.status === 'completed') {
      status = 'completed';
    }

    const statusConfig = {
      uploading: { 
        color: 'bg-yellow-100 text-yellow-800', 
        label: 'Uploading',
        icon: <FaSpinner className="animate-spin inline mr-1" />
      },
      processing: { 
        color: 'bg-blue-100 text-blue-800', 
        label: 'Processing Text...',
        icon: <FaSpinner className="animate-spin inline mr-1" />
      },
      completed: { 
        color: 'bg-green-100 text-green-800', 
        label: 'Completed',
        icon: <FaCheckCircle className="inline mr-1" />
      },
      failed: { 
        color: 'bg-red-100 text-red-800', 
        label: 'Failed',
        icon: <FaTimes className="inline mr-1" />
      },
      archived: { 
        color: 'bg-gray-100 text-gray-800', 
        label: 'Archived',
        icon: <FaArchive className="inline mr-1" />
      }
    };

    const config = statusConfig[status] || statusConfig.completed;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading medical documents...</p>
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
            <FaFile className="text-emerald-500" />
            Medical Documents
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchDocuments();
                fetchStats();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              title="Refresh documents"
            >
              <FaSync /> Refresh
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              <FaPlus /> Upload Document
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.summary.activeDocuments || 0}</div>
              <div className="text-sm text-blue-700">Active Documents</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.summary.totalDocuments || 0}</div>
              <div className="text-sm text-green-700">Total Documents</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.summary.documentTypes?.length || 0}</div>
              <div className="text-sm text-purple-700">Document Types</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {stats.summary.totalFileSize ? (stats.summary.totalFileSize / (1024 * 1024)).toFixed(1) : 0} MB
              </div>
              <div className="text-sm text-orange-700">Total Storage</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
            <select
              value={filters.documentType}
              onChange={(e) => handleFilterChange('documentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Types</option>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="uploading">Uploading</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includeArchived}
                  onChange={(e) => handleFilterChange('includeArchived', e.target.checked)}
                  className="mr-2"
                />
                Include Archived
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="fixed top-4 right-4 bg-black text-white p-2 text-xs rounded z-50">
        Modal: {showDetailsModal ? 'SHOW' : 'HIDE'} | 
        Doc: {selectedDocument ? 'SET' : 'NULL'}
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FaFile className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Documents Found</h3>
          <p className="text-gray-500 mb-6">Upload your first medical document to get started.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((document) => (
              <DocumentCard
                key={document.id || document._id}
                document={document}
                onView={() => handleViewDocument(document)}
                onArchive={(archive) => handleArchiveDocument(document.id || document._id, archive)}
                onDelete={() => handleDeleteDocument(document.id || document._id)}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: i + 1 }))}
                    className={`px-3 py-2 border rounded-md ${
                      pagination.currentPage === i + 1
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            fetchDocuments();
            fetchStats();
            // Set up a delayed refresh to catch OCR completion
            setTimeout(() => {
              fetchDocuments();
            }, 10000); // Refresh again after 10 seconds for OCR status
          }}
          documentTypes={documentTypes}
        />
      )}

      {/* Document Details Modal */}
      {(() => {
        console.log('🎭 Modal render check:', { showDetailsModal, selectedDocument: !!selectedDocument });
        return null;
      })()}
      {showDetailsModal && selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          onClose={() => {
            console.log('🚪 Closing modal');
            setShowDetailsModal(false);
            setSelectedDocument(null);
          }}
          onUpdate={(updatedDocument) => {
            console.log('📝 Document updated:', updatedDocument);
            // Update the document in the list
            setDocuments(prevDocs => 
              prevDocs.map(doc => 
                (doc.id || doc._id) === (updatedDocument.id || updatedDocument._id) ? updatedDocument : doc
              )
            );
            setSelectedDocument(updatedDocument);
          }}
          onDelete={(deletedId) => {
            console.log('🗑️ Document deleted:', deletedId);
            // Remove the document from the list
            setDocuments(prevDocs => 
              prevDocs.filter(doc => (doc.id || doc._id) !== deletedId)
            );
            fetchStats();
            setShowDetailsModal(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ document, onView, onArchive, onDelete, getDocumentIcon, getStatusBadge }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getDocumentIcon(document.mimeType)}
        </div>
        {getStatusBadge(document)}
      </div>

      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{document.title}</h3>
      
      <div className="text-sm text-gray-600 mb-3">
        <p><strong>Type:</strong> {document.documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
        <p><strong>Size:</strong> {formatFileSize(document.fileSize)}</p>
        <p><strong>Uploaded:</strong> {formatDate(document.createdAt)}</p>
      </div>

      {document.tags && document.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {document.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{document.tags.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm"
        >
          <FaEye className="inline mr-1" /> View
        </button>
        
        <button
          onClick={() => onArchive(!document.isArchived)}
          className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          title={document.isArchived ? 'Unarchive' : 'Archive'}
        >
          <FaArchive />
        </button>
        
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          title="Delete"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

export default MedicalDocuments;
