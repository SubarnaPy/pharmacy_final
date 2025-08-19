import api from '../utils/api';

class ConsultationManagementService {
  // Get all consultations for current user (patient or doctor)
  async getConsultations(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.consultationType) queryParams.append('consultationType', params.consultationType);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/consultations?${queryParams.toString()}`);
    return response.data;
  }

  // Get patient consultation history
  async getPatientConsultations(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.consultationType) queryParams.append('consultationType', params.consultationType);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/consultations/my-bookings?${queryParams.toString()}`);
    return response.data;
  }

  // Get doctor's consultations
  async getDoctorConsultations(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.consultationType) queryParams.append('consultationType', params.consultationType);
    if (params.date) queryParams.append('date', params.date);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/consultations/my-consultations?${queryParams.toString()}`);
    return response.data;
  }

  // Get consultation details
  async getConsultationDetails(consultationId) {
    const response = await api.get(`/consultations/${consultationId}/details`);
    return response.data;
  }

  // Start consultation
  async startConsultation(consultationId) {
    const response = await api.patch(`/consultations/${consultationId}/start`);
    return response.data;
  }

  // End consultation
  async endConsultation(consultationId, notes = '') {
    const response = await api.patch(`/consultations/${consultationId}/end`, { notes });
    return response.data;
  }

  // Cancel consultation
  async cancelConsultation(consultationId, reason = '') {
    const response = await api.patch(`/consultations/${consultationId}/cancel`, { reason });
    return response.data;
  }

  // Reschedule consultation
  async rescheduleConsultation(consultationId, newDate, newTime) {
    const response = await api.patch(`/consultations/${consultationId}/reschedule`, {
      appointmentDate: newDate,
      appointmentTime: newTime
    });
    return response.data;
  }

  // Add consultation notes
  async addConsultationNotes(consultationId, notes, type = 'doctor') {
    const response = await api.patch(`/consultations/${consultationId}/notes`, {
      notes,
      type // 'doctor' or 'patient'
    });
    return response.data;
  }

  // Get upcoming consultations
  async getUpcomingConsultations() {
    const response = await api.get('/consultations/upcoming');
    return response.data;
  }

  // Get today's consultations
  async getTodaysConsultations() {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get(`/consultations/today?date=${today}`);
    return response.data;
  }

  // Join consultation room
  async joinConsultationRoom(consultationId) {
    const response = await api.post(`/consultations/${consultationId}/join`);
    return response.data;
  }

  // Leave consultation room
  async leaveConsultationRoom(consultationId) {
    const response = await api.post(`/consultations/${consultationId}/leave`);
    return response.data;
  }

  // Get consultation statistics
  async getConsultationStats() {
    const response = await api.get('/consultations/stats');
    return response.data;
  }

  // Upload consultation files
  async uploadConsultationFile(consultationId, file, type = 'document') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post(`/consultations/${consultationId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  // Send prescription during consultation
  async sendPrescription(consultationId, prescriptionData) {
    const response = await api.post(`/consultations/${consultationId}/prescription`, prescriptionData);
    return response.data;
  }

  // Mark consultation as completed
  async completeConsultation(consultationId, summary, prescription = null) {
    const response = await api.patch(`/consultations/${consultationId}/complete`, {
      summary,
      prescription
    });
    return response.data;
  }

  // Rate consultation (patient)
  async rateConsultation(consultationId, rating, review = '') {
    const response = await api.post(`/consultations/${consultationId}/rate`, {
      rating,
      review
    });
    return response.data;
  }

  // Get consultation room token for video call
  async getConsultationRoomToken(consultationId) {
    const response = await api.get(`/consultations/${consultationId}/room-token`);
    return response.data;
  }

  // Send consultation reminder
  async sendConsultationReminder(consultationId) {
    const response = await api.post(`/consultations/${consultationId}/remind`);
    return response.data;
  }

  // Get consultation history with filters
  async getConsultationHistory(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    const response = await api.get(`/consultations/history?${queryParams.toString()}`);
    return response.data;
  }

  // Export consultation data
  async exportConsultationData(consultationId, format = 'pdf') {
    const response = await api.get(`/consultations/${consultationId}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export default new ConsultationManagementService();
