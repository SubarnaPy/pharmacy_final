import apiClient from '../../api/apiClient';

// Upload prescription file and trigger OCR
export const uploadPrescriptionAPI = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/prescriptions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Fetch OCR result for a given prescription ID or job
export const fetchOcrResultAPI = (prescriptionId) => {
  return apiClient.get(`/prescriptions/${prescriptionId}/ocr`);
};

// Fetch prescription details including OCR and metadata
export const fetchPrescriptionAPI = (id) => {
  return apiClient.get(`/prescriptions/${id}`);
};

// Fetch prescription history for current patient
export const fetchHistoryAPI = () => {
  return apiClient.get('/prescriptions');
};
