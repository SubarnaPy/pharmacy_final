import apiClient from '../../api/apiClient';

// Fetch nearby pharmacies based on coordinates
export const getNearbyPharmaciesAPI = ({ lat, lng }) => {
  return apiClient.get('/pharmacies/nearby', { params: { lat, lng } });
};
