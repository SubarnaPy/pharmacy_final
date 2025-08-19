import apiClient from './apiClient';

// Fetch quick stats
export const fetchQuickStats = async () => {
  const response = await apiClient.get('/stats/quick');
  return response.data;
};

// Fetch recent prescriptions
export const fetchRecentPrescriptions = async () => {
  return { data: [] };
};

// Fetch upcoming appointments
export const fetchUpcomingAppointments = async () => {
  return { data: [] };
};
