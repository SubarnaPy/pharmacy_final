import apiClient from '../api/apiClient';
import { io } from 'socket.io-client';

class AdvancedSymptomAnalyzerAPI {
  
  /**
   * Perform comprehensive symptom analysis
   * @param {Object} data - Symptom analysis data
   * @returns {Promise} API response
   */
  async analyzeSymptoms(data) {
    try {
      const response = await apiClient.post('/symptom-analyzer/analyze', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Process multi-modal input (voice, images, video, drawings)
   * @param {FormData} formData - Multi-modal data
   * @returns {Promise} API response
   */
  async processMultiModalInput(formData) {
    try {
      const response = await apiClient.post('/symptom-analyzer/process-multimodal', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get symptom history for a user
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getSymptomHistory(params = {}) {
    try {
      const response = await apiClient.get('/symptom-analyzer/history', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update symptom progression tracking
   * @param {Object} data - Progression data
   * @returns {Promise} API response
   */
  async updateProgression(data) {
    try {
      const response = await apiClient.post('/symptom-analyzer/progression', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get clinical recommendations for symptoms
   * @param {Object} data - Symptom data
   * @returns {Promise} API response
   */
  async getClinicalRecommendations(data) {
    try {
      const response = await apiClient.post('/symptom-analyzer/clinical-recommendations', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Initialize real-time monitoring WebSocket connection
   * @param {Function} onMessage - Message handler
   * @param {Function} onError - Error handler
   * @returns {Socket} Socket.IO instance
   */
  initializeRealTimeMonitoring(onMessage, onError) {
    try {
      // Use Socket.IO instead of WebSocket for better compatibility
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      
      // Connect to the symptom monitoring namespace
      const socket = io(`${serverUrl}/symptom-monitoring`, {
        transports: ['websocket', 'polling'],
        autoConnect: true
      });
      
      socket.on('connect', () => {
        console.log('Real-time monitoring connected');
      });
      
      socket.on('authenticated', (data) => {
        console.log('Symptom monitoring authenticated:', data);
        onMessage({ type: 'authenticated', data });
      });
      
      socket.on('vitals_alert', (data) => {
        onMessage({ type: 'vitals_alert', data });
      });
      
      socket.on('risk_update', (data) => {
        onMessage({ type: 'risk_update', data });
      });
      
      socket.on('emergency_alert', (data) => {
        onMessage({ type: 'emergency_alert', data });
      });
      
      socket.on('monitoring_check', (data) => {
        onMessage({ type: 'monitoring_check', data });
      });
      
      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
        if (onError) onError(error);
      });
      
      socket.on('disconnect', () => {
        console.log('Real-time monitoring disconnected');
      });
      
      return socket;
    } catch (error) {
      console.error('Failed to initialize real-time monitoring:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Get available specialists based on symptoms
   * @param {Object} params - Search parameters
   * @returns {Promise} API response
   */
  async getAvailableSpecialists(params) {
    try {
      const response = await apiClient.get('/symptom-analyzer/specialists', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit feedback for analysis
   * @param {string} analysisId - Analysis ID
   * @param {Object} feedback - Feedback data
   * @returns {Promise} API response
   */
  async submitFeedback(analysisId, feedback) {
    try {
      const response = await apiClient.post(`/symptom-analyzer/feedback/${analysisId}`, feedback);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get analytics and insights for user
   * @param {Object} params - Analytics parameters
   * @returns {Promise} API response
   */
  async getAnalytics(params = {}) {
    try {
      const response = await apiClient.get('/symptom-analyzer/analytics', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Record voice input and get analysis
   * @param {Blob} audioBlob - Audio data
   * @returns {Promise} API response
   */
  async analyzeVoiceInput(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-input.wav');
      
      const response = await apiClient.post('/symptom-analyzer/voice-analysis', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Analyze medical images
   * @param {File[]} images - Image files
   * @returns {Promise} API response
   */
  async analyzeImages(images) {
    try {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image);
      });
      
      const response = await apiClient.post('/symptom-analyzer/image-analysis', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get body visualization data
   * @param {Object} bodyParts - Selected body parts
   * @returns {Promise} API response
   */
  async getBodyVisualizationData(bodyParts) {
    try {
      const response = await apiClient.post('/symptom-analyzer/body-visualization', { bodyParts });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update monitoring data for real-time analysis
   * @param {Object} monitoringData - Real-time monitoring data
   * @returns {Promise} API response
   */
  async updateMonitoringData(monitoringData) {
    try {
      const response = await apiClient.post('/symptom-analyzer/monitoring-update', monitoringData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get AI-powered insights and recommendations
   * @param {Object} data - Analysis data
   * @returns {Promise} API response
   */
  async getAIInsights(data) {
    try {
      const response = await apiClient.post('/symptom-analyzer/ai-insights', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - API error
   * @returns {Object} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        status,
        message: data.message || 'An error occurred',
        details: data.details || null,
        code: data.code || 'UNKNOWN_ERROR'
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        status: 0,
        message: 'Network error - please check your connection',
        details: null,
        code: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      return {
        status: 0,
        message: error.message || 'An unexpected error occurred',
        details: null,
        code: 'UNEXPECTED_ERROR'
      };
    }
  }
}

// Create and export a singleton instance
const advancedSymptomAnalyzerAPI = new AdvancedSymptomAnalyzerAPI();
export default advancedSymptomAnalyzerAPI;
