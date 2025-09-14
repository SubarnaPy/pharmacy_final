import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const ADVANCED_HEALTH_URL = `${BASE_URL}/advanced-health`;

// Create axios instance with common config
const apiClient = axios.create({
  baseURL: ADVANCED_HEALTH_URL,
  timeout: 30000, // 30 seconds for AI operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Advanced Health API Service
 * Handles all API calls for the 12 advanced healthcare features
 */
export const advancedHealthAPI = {
  
  // ==================== PREDICTIVE HEALTH ANALYTICS ====================
  
  /**
   * Generate health analytics for a patient
   */
  generateHealthAnalytics: async (patientId, options = {}) => {
    const response = await apiClient.post(`/health-analytics/generate/${patientId}`, options);
    return response.data;
  },

  /**
   * Get patient health dashboard
   */
  getHealthDashboard: async (patientId) => {
    const response = await apiClient.get(`/health-analytics/dashboard/${patientId}`);
    return response.data;
  },

  /**
   * Get patients needing attention (for doctors/admins)
   */
  getPatientsNeedingAttention: async (limit = 10, riskLevel = null) => {
    const params = new URLSearchParams({ limit });
    if (riskLevel) params.append('riskLevel', riskLevel);
    
    const response = await apiClient.get(`/health-analytics/attention?${params}`);
    return response.data;
  },

  // ==================== VOICE-TO-PRESCRIPTION ====================
  
  /**
   * Process voice text to structured prescription
   */
  processVoiceToPrescription: async (voiceText, doctorProfile, options = {}) => {
    const response = await apiClient.post('/voice/process-prescription', {
      voiceText,
      doctorProfile,
      options: {
        language: 'en',
        validateAuthenticity: true,
        enhanceText: true,
        ...options
      }
    });
    return response.data;
  },

  /**
   * Process real-time voice chunks
   */
  processRealTimeVoice: async (voiceChunks, doctorProfile, options = {}) => {
    const response = await apiClient.post('/voice/process-realtime', {
      voiceChunks,
      doctorProfile,
      options: {
        minConfidence: 0.8,
        autoComplete: true,
        enableCorrections: true,
        ...options
      }
    });
    return response.data;
  },

  /**
   * Get voice dictation templates
   */
  getVoiceTemplates: async () => {
    const response = await apiClient.get('/voice/templates');
    return response.data;
  },

  // ==================== AR PILL IDENTIFICATION ====================
  
  /**
   * Identify pills from image using AR
   */
  identifyPills: async (imageData, options = {}) => {
    const response = await apiClient.post('/ar-pills/identify', {
      imageData,
      options: {
        includeInteractions: true,
        includeDosageInfo: true,
        confidenceThreshold: 0.75,
        ...options
      }
    });
    return response.data;
  },

  /**
   * Process real-time pill scanning
   */
  processRealTimePillScanning: async (imageStream, options = {}) => {
    const response = await apiClient.post('/ar-pills/realtime-scan', {
      imageStream,
      options: {
        scanInterval: 2000,
        confidenceThreshold: 0.8,
        trackChanges: true,
        ...options
      }
    });
    return response.data;
  },

  // ==================== SMART SYMPTOM CHECKER ====================
  
  /**
   * Analyze symptoms and get AI recommendations
   */
  analyzeSymptoms: async (symptomData, patientProfile, options = {}) => {
    const response = await apiClient.post('/symptoms/analyze', {
      symptomData,
      patientProfile,
      options: {
        includeUrgency: true,
        includeTreatmentOptions: true,
        includePreventiveCare: true,
        trackOutcomes: true,
        ...options
      }
    });
    return response.data;
  },

  /**
   * Track prescription outcome for learning
   */
  trackPrescriptionOutcome: async (analysisId, prescriptionData, outcomeData) => {
    const response = await apiClient.post('/symptoms/track-outcome', {
      analysisId,
      prescriptionData,
      outcomeData
    });
    return response.data;
  },

  // ==================== AI DRUG DISCOVERY ====================
  
  /**
   * Find alternative medications
   */
  findAlternativeMedications: async (currentMedication, patientProfile, options = {}) => {
    const response = await apiClient.post('/drug-discovery/alternatives', {
      currentMedication,
      patientProfile,
      options: {
        budgetSensitive: false,
        reason: 'optimization',
        ...options
      }
    });
    return response.data;
  },

  /**
   * Get personalized medicine recommendations
   */
  getPersonalizedMedicine: async (patientProfile, treatmentGoals) => {
    const response = await apiClient.post('/drug-discovery/personalized', {
      patientProfile,
      treatmentGoals
    });
    return response.data;
  },

  /**
   * Find relevant clinical trials
   */
  findClinicalTrials: async (patientProfile, condition) => {
    const response = await apiClient.post('/drug-discovery/clinical-trials', {
      patientProfile,
      condition
    });
    return response.data;
  },

  // ==================== GAMIFIED HEALTH MANAGEMENT ====================
  
  /**
   * Record medication taken and earn points
   */
  recordMedicationTaken: async (medicationData) => {
    const response = await apiClient.post('/gamification/medication-taken', {
      medicationData
    });
    return response.data;
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (timeframe = 'monthly', limit = 10) => {
    const response = await apiClient.get(`/gamification/leaderboard?timeframe=${timeframe}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get personalized challenges
   */
  getPersonalizedChallenges: async (userId, healthData = {}) => {
    const response = await apiClient.get(`/gamification/challenges/${userId}`, {
      params: { healthData: JSON.stringify(healthData) }
    });
    return response.data;
  },

  // ==================== EMERGENCY PRESCRIPTION ====================
  
  /**
   * Handle emergency prescription request
   */
  requestEmergencyPrescription: async (emergencyData, patientProfile) => {
    const response = await apiClient.post('/emergency/request', {
      emergencyData,
      patientProfile
    });
    return response.data;
  },

  /**
   * Handle travel prescription request
   */
  requestTravelPrescription: async (travelData, patientProfile) => {
    const response = await apiClient.post('/emergency/travel-prescription', {
      travelData,
      patientProfile
    });
    return response.data;
  },

  /**
   * Activate disaster response (admin only)
   */
  activateDisasterResponse: async (disasterData, affectedArea) => {
    const response = await apiClient.post('/emergency/disaster-response', {
      disasterData,
      affectedArea
    });
    return response.data;
  },

  // ==================== MENTAL HEALTH INTEGRATION ====================
  
  /**
   * Record mood entry
   */
  recordMoodEntry: async (moodData) => {
    const response = await apiClient.post('/mental-health/mood-entry', {
      moodData
    });
    return response.data;
  },

  /**
   * Send message to AI therapy chatbot
   */
  sendTherapyMessage: async (message, sessionId = null) => {
    const response = await apiClient.post('/mental-health/therapy-chat', {
      message,
      sessionId
    });
    return response.data;
  },

  // ==================== COMPREHENSIVE HEALTH INTEGRATION ====================
  
  /**
   * Get comprehensive health dashboard
   */
  getComprehensiveDashboard: async (patientId) => {
    const response = await apiClient.get(`/health/comprehensive-dashboard/${patientId}`);
    return response.data;
  },

  /**
   * AI Health Assistant - intelligent query processing
   */
  askHealthAssistant: async (query, patientData = {}, context = '') => {
    const response = await apiClient.post('/health/ai-health-assistant', {
      query,
      patientData,
      context
    });
    return response.data;
  },

  /**
   * Integrate health data from multiple sources
   */
  integrateHealthData: async (healthData) => {
    const response = await apiClient.post('/health/integrate-data', healthData);
    return response.data;
  },

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Test API connectivity
   */
  testConnection: async () => {
    try {
      const response = await apiClient.get('/health/test');
      return { connected: true, data: response.data };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },

  /**
   * Get API status and feature availability
   */
  getSystemStatus: async () => {
    try {
      const response = await apiClient.get('/health/status');
      return response.data;
    } catch (error) {
      return { 
        status: 'error', 
        features: [], 
        error: error.message 
      };
    }
  }
};

// ==================== CONVENIENCE HOOKS ====================

/**
 * React hook for easy API usage
 */
export const useAdvancedHealthAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callAPI = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    loading,
    error,
    callAPI,
    api: advancedHealthAPI
  };
};

// ==================== FEATURE-SPECIFIC SHORTCUTS ====================

/**
 * Quick access functions for common operations
 */
export const quickActions = {
  
  // Voice prescription shortcut
  createVoicePrescription: async (voiceText, doctor) => {
    return advancedHealthAPI.processVoiceToPrescription(voiceText, doctor);
  },

  // Pill scanning shortcut
  scanPill: async (imageData, userMeds = []) => {
    return advancedHealthAPI.identifyPills(imageData, { userMedications: userMeds });
  },

  // Symptom checking shortcut
  checkSymptoms: async (symptoms, patient) => {
    const symptomData = {
      primarySymptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      duration: 'unknown',
      severity: 5
    };
    return advancedHealthAPI.analyzeSymptoms(symptomData, patient);
  },

  // Emergency request shortcut
  emergencyHelp: async (medication, location, patient) => {
    const emergencyData = {
      emergencyType: 'medical_emergency',
      medication: { name: medication },
      location,
      urgency: 'high',
      circumstances: 'Emergency medication access needed'
    };
    return advancedHealthAPI.requestEmergencyPrescription(emergencyData, patient);
  },

  // Mood tracking shortcut
  trackMood: async (mood, stress = 5) => {
    const moodData = {
      mood: {
        primary: mood,
        intensity: stress
      },
      stressLevel: stress,
      energyLevel: 5
    };
    return advancedHealthAPI.recordMoodEntry(moodData);
  }
};

export default advancedHealthAPI;