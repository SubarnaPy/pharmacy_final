import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchDoctors = async () => {
  try {
    const response = await api.get('v1/doctors/booking');
    return response.data;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

export const fetchDoctorSlots = async (doctorId) => {
  try {
    const response = await api.get(`v1/doctors/${doctorId}/slots`);
    return response.data;
  } catch (error) {
    console.error('Error fetching doctor slots:', error);
    throw error;
  }
};

export const bookConsultation = async (bookingData) => {
  try {
    const response = await api.post('v1/consultations/book', bookingData);
    return response.data;
  } catch (error) {
    console.error('Error booking consultation:', error);
    throw error;
  }
};

export const getPatientBookings = async (patientId) => {
  try {
    const response = await api.get(`v1/consultations/patient/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient bookings:', error);
    throw error;
  }
};