import api from '../utils/api';

class ConsultationService {
  // Get patient's own consultations (updated for new route structure)
  async getPatientConsultations(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.status) queryParams.append('status', params.status);
    if (params.consultationType) queryParams.append('consultationType', params.consultationType);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/consultations/my-bookings?${queryParams.toString()}`);
    return response.data.data; // Return the data object which contains consultations and pagination
  }

  // Get consultation details (updated for new route structure)
  async getConsultationDetails(consultationId) {
    const response = await api.get(`/consultations/${consultationId}/details`);
    return response.data;
  }

  // Cancel a consultation (updated for new route structure)
  async cancelConsultation(consultationId, reason = '') {
    const response = await api.patch(`/consultations/${consultationId}/cancel`, { reason });
    return response.data;
  }

  // Legacy methods for backward compatibility
  async cancelConsultationLegacy(consultationId, reason = '') {
    const response = await api.patch(`/consultations/${consultationId}/cancel-legacy`, { reason });
    return response.data;
  }

  // Reschedule a consultation
  async rescheduleConsultation(consultationId, newDate, newStartTime, newEndTime) {
    const response = await api.patch(`/consultations/${consultationId}/reschedule`, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime
    });
    return response.data;
  }

  // Add notes to consultation
  async addPatientNotes(consultationId, notes) {
    const response = await api.patch(`/consultations/${consultationId}/patient-notes`, { notes });
    return response.data;
  }
}

export default new ConsultationService();
