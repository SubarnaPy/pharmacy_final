import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaTimes, 
  FaDownload, 
  FaEdit, 
  FaTrash, 
  FaShare, 
  FaEye, 
  FaEyeSlash,
  FaCalendar,
  FaTags,
  FaFileImage,
  FaFilePdf,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import medicalDocumentAPI from '../api/medicalDocumentAPI';

const DocumentDetailsModal = ({ document, onClose, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: document?.title || '',
    description: document?.description || '',
    tags: document?.tags?.join(', ') || '',
    isPrivate: document?.isPrivate || true
  });
  const [ocrProcessing, setOcrProcessing] = useState(false);

  useEffect(() => {
    if (document) {
      setEditForm({
        title: document.title || '',
        description: document.description || '',
        tags: document.tags?.join(', ') || '',
        isPrivate: document.isPrivate || true
      });
      
      // Check if OCR is still processing
      if (document.status === 'processing') {
        setOcrProcessing(true);
        // Poll for OCR completion
        const pollInterval = setInterval(async () => {
          try {
            const documentId = document._id || document.id;
            const response = await medicalDocumentAPI.getDocument(documentId);
            const updatedDocument = response.data.data || response.data.document;
            if (response.data.success && updatedDocument.status !== 'processing') {
              setOcrProcessing(false);
              onUpdate(updatedDocument);
              clearInterval(pollInterval);
            }
          } catch (error) {
            console.error('Error polling OCR status:', error);
            clearInterval(pollInterval);
            setOcrProcessing(false);
          }
        }, 3000);

        return () => clearInterval(pollInterval);
      }
    }
  }, [document]);

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const updateData = {
        title: editForm.title,
        description: editForm.description,
        tags: editForm.tags, // Send as comma-separated string, not array
        isPrivate: editForm.isPrivate
      };

      console.log('📝 Update data being sent:', updateData);

      const documentId = document._id || document.id;
      const response = await medicalDocumentAPI.updateDocument(documentId, updateData);
      
      if (response.data.success) {
        toast.success('Document updated successfully');
        const updatedDocument = response.data.data || response.data.document;
        onUpdate(updatedDocument);
        setEditing(false);
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const documentId = document._id || document.id;
      const response = await medicalDocumentAPI.deleteDocument(documentId);
      
      if (response.data.success) {
        toast.success('Document deleted successfully');
        onDelete(documentId);
        onClose();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, '_blank');
    } else {
      toast.error('File URL not available');
    }
  };

  const handleShare = async () => {
    // TODO: Implement sharing functionality
    toast.info('Sharing feature will be implemented soon');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (document?.mimeType?.startsWith('image/')) {
      return <FaFileImage className="text-blue-500 text-2xl" />;
    } else if (document?.mimeType === 'application/pdf') {
      return <FaFilePdf className="text-red-500 text-2xl" />;
    }
    return <FaFileImage className="text-gray-500 text-2xl" />;
  };

  const getOCRStatusBadge = () => {
    const status = document?.status;
    
    switch (status) {
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaSpinner className="animate-spin" />
            Processing...
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheckCircle />
            Text Extracted
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaExclamationTriangle />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-4">
              {getFileIcon()}
              <div>
                {editing ? (
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="text-2xl font-bold text-gray-800 border-b-2 border-emerald-500 bg-transparent focus:outline-none"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-800">{document.title}</h2>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    document.isPrivate 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {document.isPrivate ? (
                      <>
                        <FaEyeSlash className="inline mr-1" />
                        Private
                      </>
                    ) : (
                      <>
                        <FaEye className="inline mr-1" />
                        Shared
                      </>
                    )}
                  </span>
                  {getOCRStatusBadge()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <FaDownload />
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Share"
                  >
                    <FaShare />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          {/* Document Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <p className="text-gray-900 capitalize">{document.documentType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                {editing ? (
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="text-gray-900">{document.description || 'No description provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaTags className="inline mr-1" />
                  Tags
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="tags"
                    value={editForm.tags}
                    onChange={handleEditChange}
                    placeholder="Enter tags separated by commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {document.tags && document.tags.length > 0 ? (
                      document.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No tags</p>
                    )}
                  </div>
                )}
              </div>

              {editing && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isPrivate"
                      checked={editForm.isPrivate}
                      onChange={handleEditChange}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Keep document private
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Information
                </label>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Size:</strong> {formatFileSize(document.fileSize)}</p>
                  <p><strong>Type:</strong> {document.mimeType}</p>
                  <p><strong>Original Name:</strong> {document.originalFileName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendar className="inline mr-1" />
                  Dates
                </label>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Uploaded:</strong> {formatDate(document.createdAt)}</p>
                  {document.updatedAt !== document.createdAt && (
                    <p><strong>Modified:</strong> {formatDate(document.updatedAt)}</p>
                  )}
                </div>
              </div>

              {document.ocrMetadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Extraction
                  </label>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Status:</strong> {document.status}</p>
                    {document.ocrMetadata.extractionDate && (
                      <p><strong>Processed:</strong> {formatDate(document.ocrMetadata.extractionDate)}</p>
                    )}
                    {document.ocrMetadata.confidence && (
                      <p><strong>Confidence:</strong> {document.ocrMetadata.confidence.toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Text */}
          {document.extractedText && (
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Extracted Text
              </label>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {document.extractedText}
                </pre>
              </div>
            </div>
          )}

          {/* OCR Processing Status */}
          {ocrProcessing && (
            <div className="border-t pt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FaSpinner className="animate-spin text-yellow-600" />
                  <span className="text-yellow-800 font-medium">
                    Text extraction is in progress...
                  </span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  This may take a few moments. The page will update automatically when complete.
                </p>
              </div>
            </div>
          )}

          {/* OCR Error */}
          {document.status === 'failed' && (
            <div className="border-t pt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-600" />
                  <span className="text-red-800 font-medium">
                    Text extraction failed
                  </span>
                </div>
                {document.ocrMetadata?.error && (
                  <p className="text-red-700 text-sm mt-1">
                    {document.ocrMetadata.error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailsModal;
