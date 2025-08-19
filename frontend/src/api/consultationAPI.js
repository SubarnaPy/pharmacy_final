import apiClient from './apiClient';

// Get all consultations for current user
export const getMyConsultations = async () => {
  try {
    const response = await apiClient.get('/consultations/my-consultations');
    return response.data;
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return { success: false, data: [] };
  }
};

// Join consultation room
export const joinConsultation = async (consultationId) => {
  try {
    const response = await apiClient.get(`/consultations/${consultationId}/join`);
    return response.data;
  } catch (error) {
    console.error('Error joining consultation:', error);
    throw error;
  }
};

// Start consultation (doctor only)
export const startConsultation = async (consultationId) => {
  try {
    const response = await apiClient.patch(`/consultations/${consultationId}/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting consultation:', error);
    throw error;
  }
};

// End consultation
export const endConsultation = async (consultationId) => {
  try {
    const response = await apiClient.patch(`/consultations/${consultationId}/end`);
    return response.data;
  } catch (error) {
    console.error('Error ending consultation:', error);
    throw error;
  }
};

// Get or create doctor profile
export const getDoctorProfile = async () => {
  try {
    const response = await apiClient.get('/consultations/doctor-profile');
    return response.data;
  } catch (error) {
    console.error('Error getting doctor profile:', error);
    throw error;
  }
};

// Create doctor profile
export const createDoctorProfile = async () => {
  try {
    const response = await apiClient.post('/consultations/create-doctor-profile');
    return response.data;
  } catch (error) {
    console.error('Error creating doctor profile:', error);
    throw error;
  }
};