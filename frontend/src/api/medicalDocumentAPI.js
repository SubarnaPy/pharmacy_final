import apiClient from './apiClient.js';

// Medical Documents API
export const medicalDocumentAPI = {
  // Upload a medical document
  uploadDocument: (formData) => {
    return apiClient.post('/medical-documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Get user's medical documents
  getDocuments: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.documentType) queryParams.append('documentType', params.documentType);
    if (params.tags) queryParams.append('tags', params.tags);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.includeArchived) queryParams.append('includeArchived', params.includeArchived);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);

    const queryString = queryParams.toString();
    return apiClient.get(`/medical-documents${queryString ? `?${queryString}` : ''}`);
  },

  // Get single document
  getDocument: (id) => {
    return apiClient.get(`/medical-documents/${id}`);
  },

  // Update document
  updateDocument: (id, data) => {
    return apiClient.put(`/medical-documents/${id}`, data);
  },

  // Delete document
  deleteDocument: (id) => {
    return apiClient.delete(`/medical-documents/${id}`);
  },

  // Share document
  shareDocument: (id, shareData) => {
    return apiClient.post(`/medical-documents/${id}/share`, shareData);
  },

  // Revoke document sharing
  revokeSharing: (id, shareUserId) => {
    return apiClient.delete(`/medical-documents/${id}/share/${shareUserId}`);
  },

  // Archive/Unarchive document
  toggleArchive: (id, archive) => {
    return apiClient.patch(`/medical-documents/${id}/archive`, { archive });
  },

  // Get user statistics
  getStats: () => {
    return apiClient.get('/medical-documents/stats');
  },

  // Re-extract text from document
  reExtractText: (id) => {
    return apiClient.post(`/medical-documents/${id}/re-extract`);
  }
};

export default medicalDocumentAPI;
