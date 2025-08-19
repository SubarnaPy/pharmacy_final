import apiClient from './apiClient';

// Single product upload
export const uploadSingleProduct = async (pharmacyId, data) => {
  return apiClient.post(`/inventory/pharmacy/${pharmacyId}/single-product`, data);
};

// CSV bulk upload
export const uploadInventoryCsv = async (pharmacyId, formData) => {
  return apiClient.post(`/inventory/pharmacy/${pharmacyId}/upload-csv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Get inventory items for a specific pharmacy
export const getPharmacyInventory = async (pharmacyId) => {
  return apiClient.get(`/inventory/medications?pharmacyId=${pharmacyId}`);
};
