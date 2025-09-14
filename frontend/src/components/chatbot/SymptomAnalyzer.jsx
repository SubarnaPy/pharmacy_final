import React, { useState, useEffect, useRef, useCallback } from 'react';
// import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/apiClient';
import advancedSymptomAnalyzerAPI from '../../services/AdvancedSymptomAnalyzerAPI';
import {
  HeartIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  DocumentTextIcon,
  StarIcon,
  PhoneIcon,
  EyeIcon,
  ShieldCheckIcon,
  CameraIcon,
  MicrophoneIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  PresentationChartLineIcon,
  ExclamationCircleIcon,
  FireIcon,
  BoltIcon,
  SparklesIcon,
  ChartBarIcon,
  CircleStackIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const SymptomAnalyzer = () => {
  const { user } = useSelector(state => state.auth);
  const [symptoms, setSymptoms] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState({
    duration: '',
    severity: 'moderate',
    triggers: '',
    previousTreatment: '',
    medications: '',
    allergies: ''
  });
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  
  // Simple body part selection (removed 3D visualization)
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  
  // Symptom Progression Tracking
  const [progressionTracking, setProgressionTracking] = useState({
    enabled: true,
    timeline: [],
    patterns: [],
    trends: null,
    prediction: null,
    historicalData: [],
    trackingMode: 'continuous' // continuous, periodic, event-based
  });
  
  // Advanced Risk Assessment
  const [riskAssessment, setRiskAssessment] = useState({
    enabled: true,
    riskScore: 0,
    riskFactors: [],
    urgencyLevel: 'normal',
    predictions: [],
    recommendations: [],
    clinicalAlerts: []
  });
  
  // Clinical Decision Support System
  const [clinicalSupport, setClinicalSupport] = useState({
    enabled: true,
    differentialDiagnosis: [],
    recommendedTests: [],
    treatmentOptions: [],
    followUpPlan: null,
    specialistReferrals: [],
    evidenceLevel: 'moderate',
    clinicalPathways: []
  });
  
  // Multi-Modal Input Processing
  const [multiModalInput, setMultiModalInput] = useState({
    voiceRecording: { enabled: false, isRecording: false, transcript: '' },
    photoCapture: { enabled: true, capturedImages: [], analyzedImages: [] },
    videoRecording: { enabled: true, recordedVideos: [], analyzedVideos: [] },
    drawingInput: { enabled: true, drawings: [], bodyMarkings: [] }
  });
  
  // AI-Powered Advanced Analytics
  const [aiAnalytics, setAiAnalytics] = useState({
    emotionDetection: { enabled: true, currentEmotion: null, confidence: 0 },
    behaviorAnalysis: { enabled: true, patterns: [], insights: [] },
    biometricMonitoring: { enabled: false, vitals: {}, trends: {} },
    contextualAwareness: { enabled: true, environmentalFactors: [], lifestyle: {} }
  });
  
  // Real-time Monitoring
  const [realTimeMonitoring, setRealTimeMonitoring] = useState({
    enabled: false,
    webSocketConnection: null,
    liveVitals: {},
    alerts: [],
    continuousAssessment: false
  });
  
  // Refs for features
  const voiceRecorderRef = useRef(null);
  const webSocketRef = useRef(null);

  // Common symptoms for quick selection
  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Dizziness',
    'Chest pain', 'Shortness of breath', 'Stomach pain', 'Joint pain',
    'Back pain', 'Sore throat', 'Runny nose', 'Skin rash', 'Muscle aches'
  ];
  
  // Simple body parts for symptom selection
  const bodyParts = {
    head: { name: 'Head', commonSymptoms: ['headache', 'dizziness', 'migraine'] },
    neck: { name: 'Neck', commonSymptoms: ['neck pain', 'stiffness', 'swollen glands'] },
    chest: { name: 'Chest', commonSymptoms: ['chest pain', 'shortness of breath', 'palpitations'] },
    abdomen: { name: 'Abdomen', commonSymptoms: ['stomach pain', 'nausea', 'bloating'] },
    back: { name: 'Back', commonSymptoms: ['back pain', 'muscle aches', 'stiffness'] },
    arms: { name: 'Arms', commonSymptoms: ['arm pain', 'numbness', 'weakness'] },
    legs: { name: 'Legs', commonSymptoms: ['leg pain', 'swelling', 'numbness'] }
  };
  


  const severityLevels = [
    { value: 'mild', label: 'Mild - Barely noticeable', color: 'green', score: 1 },
    { value: 'moderate', label: 'Moderate - Uncomfortable', color: 'yellow', score: 2 },
    { value: 'severe', label: 'Severe - Very bothersome', color: 'orange', score: 3 },
    { value: 'extreme', label: 'Extreme - Unbearable', color: 'red', score: 4 }
  ];
  
  // Risk Assessment Levels
  const riskLevels = {
    low: { label: 'Low Risk', color: 'green', score: 1, priority: 'routine' },
    moderate: { label: 'Moderate Risk', color: 'yellow', score: 2, priority: 'attention' },
    high: { label: 'High Risk', color: 'orange', score: 3, priority: 'urgent' },
    critical: { label: 'Critical Risk', color: 'red', score: 4, priority: 'emergency' }
  };
  
  // Clinical Decision Support Pathways
  const clinicalPathways = {
    chest_pain: {
      name: 'Chest Pain Protocol',
      urgency: 'high',
      tests: ['ECG', 'Troponin', 'Chest X-ray'],
      differentials: ['MI', 'Angina', 'Pneumonia', 'GERD'],
      redFlags: ['crushing pain', 'radiation to arm', 'sweating']
    },
    headache: {
      name: 'Headache Assessment',
      urgency: 'moderate',
      tests: ['Neurological exam', 'CT/MRI if indicated'],
      differentials: ['Tension headache', 'Migraine', 'Cluster headache'],
      redFlags: ['sudden onset', 'fever', 'confusion']
    },
    abdominal_pain: {
      name: 'Abdominal Pain Workup',
      urgency: 'moderate',
      tests: ['CBC', 'Basic metabolic panel', 'Lipase', 'Ultrasound'],
      differentials: ['Appendicitis', 'Gallbladder', 'Gastritis'],
      redFlags: ['severe pain', 'guarding', 'fever']
    }
  };

  useEffect(() => {
    // Initialize basic features
    initializeAdvancedFeatures();
    
    // Initialize progression tracking
    initializeProgressionTracking();
    
    // Set up risk assessment system
    initializeRiskAssessment();
    
    // Initialize clinical decision support
    initializeClinicalSupport();
    
    // Initialize real-time monitoring if enabled
    if (realTimeMonitoring.enabled) {
      initializeRealTimeMonitoring();
    }
    
    // Cleanup function
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.stop();
      }
    };
  }, []);
  
  // Initialize advanced features
  const initializeAdvancedFeatures = useCallback(async () => {
    try {
      // Set user-specific configurations
      if (user?.profile) {
        // Load user's symptom history
        const symptomHistory = await loadSymptomHistory();
        setProgressionTracking(prev => ({
          ...prev,
          historicalData: symptomHistory
        }));
      }
      
      // Initialize AI analytics
      setAiAnalytics(prev => ({
        ...prev,
        emotionDetection: { ...prev.emotionDetection, enabled: true },
        behaviorAnalysis: { ...prev.behaviorAnalysis, enabled: true },
        contextualAwareness: { ...prev.contextualAwareness, enabled: true }
      }));
      
    } catch (error) {
      console.error('Failed to initialize advanced features:', error);
    }
  }, [user]);
  
  // Initialize Progression Tracking
  const initializeProgressionTracking = useCallback(() => {
    setProgressionTracking(prev => ({
      ...prev,
      enabled: true,
      trackingMode: 'continuous',
      timeline: [
        {
          timestamp: new Date().toISOString(),
          event: 'tracking_started',
          severity: additionalInfo.severity
        }
      ]
    }));
    
    console.log('✅ Symptom Progression Tracking initialized');
  }, [additionalInfo.severity]);
  
  // Initialize Risk Assessment
  const initializeRiskAssessment = useCallback(() => {
    setRiskAssessment(prev => ({
      ...prev,
      enabled: true,
      riskScore: 0,
      urgencyLevel: 'normal'
    }));
    
    console.log('✅ Advanced Risk Assessment initialized');
  }, []);
  
  // Initialize Clinical Decision Support
  const initializeClinicalSupport = useCallback(() => {
    setClinicalSupport(prev => ({
      ...prev,
      enabled: true,
      evidenceLevel: 'moderate'
    }));
    
    console.log('✅ Clinical Decision Support initialized');
  }, []);
  
  // Initialize Multi-Modal Input
  const initializeMultiModalInput = useCallback(() => {
    // Check for camera and microphone permissions
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setMultiModalInput(prev => ({
        ...prev,
        photoCapture: { ...prev.photoCapture, enabled: true },
        videoRecording: { ...prev.videoRecording, enabled: true },
        voiceRecording: { ...prev.voiceRecording, enabled: true }
      }));
    }
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      voiceRecorderRef.current = new SpeechRecognition();
      voiceRecorderRef.current.continuous = true;
      voiceRecorderRef.current.interimResults = true;
      
      voiceRecorderRef.current.onresult = handleVoiceRecognitionResult;
      voiceRecorderRef.current.onerror = handleVoiceRecognitionError;
    }
    
    console.log('✅ Multi-Modal Input initialized');
  }, []);
  
  // Initialize Real-Time Monitoring
  const initializeRealTimeMonitoring = useCallback(() => {
    if (realTimeMonitoring.enabled) {
      // Set up WebSocket connection for real-time monitoring
      const wsUrl = `ws://localhost:3001/ws/symptom-monitoring/${user?.id}`;
      webSocketRef.current = new WebSocket(wsUrl);
      
      webSocketRef.current.onopen = () => {
        console.log('✅ Real-time monitoring WebSocket connected');
      };
      
      webSocketRef.current.onmessage = handleRealTimeUpdate;
      webSocketRef.current.onerror = (error) => {
        console.log('WebSocket connection failed (optional feature)');
      };
    }
  }, [realTimeMonitoring.enabled, user?.id]);
  
  // Load symptom history from backend
  const loadSymptomHistory = async () => {
    try {
      const response = await apiClient.get('/patient/symptom-history');
      return response.data.history || [];
    } catch (error) {
      console.error('Failed to load symptom history:', error);
      return [];
    }
  };
  
  // Handle body part selection (simplified)
  const handleBodyPartSelection = (partName) => {
    const part = bodyParts[partName.toLowerCase()];
    if (part) {
      if (!selectedBodyParts.includes(partName)) {
        setSelectedBodyParts(prev => [...prev, partName]);
        
        // Add suggested symptoms for this body part
        const suggestedSymptoms = part.commonSymptoms.join(', ');
        if (!symptoms.includes(suggestedSymptoms)) {
          setSymptoms(prev => prev ? `${prev}, ${suggestedSymptoms}` : suggestedSymptoms);
        }
      }
    }
  };

  // Handle voice recognition results
  const handleVoiceRecognitionResult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    setMultiModalInput(prev => ({
      ...prev,
      voiceRecording: {
        ...prev.voiceRecording,
        transcript: transcript
      }
    }));
    
    // Auto-update symptoms with voice input
    setSymptoms(transcript);
  };
  
  // Handle voice recognition errors
  const handleVoiceRecognitionError = (error) => {
    console.error('Voice recognition error:', error);
    setMultiModalInput(prev => ({
      ...prev,
      voiceRecording: {
        ...prev.voiceRecording,
        isRecording: false
      }
    }));
  };
  
  // Handle real-time updates
  const handleRealTimeUpdate = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'vital_update') {
      setRealTimeMonitoring(prev => ({
        ...prev,
        liveVitals: { ...prev.liveVitals, ...data.vitals }
      }));
    } else if (data.type === 'alert') {
      setRealTimeMonitoring(prev => ({
        ...prev,
        alerts: [...prev.alerts, data.alert]
      }));
    }
  };
  
  // Start voice recording
  const startVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.start();
      setMultiModalInput(prev => ({
        ...prev,
        voiceRecording: { ...prev.voiceRecording, isRecording: true }
      }));
    }
  };
  
  // Stop voice recording
  const stopVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.stop();
      setMultiModalInput(prev => ({
        ...prev,
        voiceRecording: { ...prev.voiceRecording, isRecording: false }
      }));
    }
  };
  
  // Capture photo for analysis
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        setMultiModalInput(prev => ({
          ...prev,
          photoCapture: {
            ...prev.photoCapture,
            capturedImages: [...prev.capturedImages, {
              id: Date.now(),
              data: imageData,
              timestamp: new Date().toISOString(),
              analyzed: false
            }]
          }
        }));
        
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
    } catch (error) {
      console.error('Photo capture failed:', error);
      alert('Camera access denied or not available');
    }
  };

  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      alert('Please describe your symptoms');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Advanced pre-analysis with AI risk assessment
      const preAnalysis = await performPreAnalysisRiskAssessment();
      
      // Enhanced analysis payload with advanced features
      const analysisPayload = {
        symptoms: symptoms,
        additionalInfo: {
          ...additionalInfo,
          age: user?.profile?.age,
          gender: user?.profile?.gender,
          location: user?.profile?.address?.city
        },
        advancedFeatures: {
          selectedBodyParts: selectedBodyParts,
          progressionTracking: {
            timeline: progressionTracking.timeline,
            patterns: progressionTracking.patterns,
            historicalData: progressionTracking.historicalData,
            trackingMode: progressionTracking.trackingMode
          },
          multiModalInput: {
            voiceTranscript: multiModalInput.voiceRecording.transcript,
            capturedImages: multiModalInput.photoCapture.capturedImages,
            recordings: multiModalInput.videoRecording.recordedVideos,
            drawings: multiModalInput.drawingInput.drawings,
            bodyMarkings: multiModalInput.drawingInput.bodyMarkings
          },
          aiAnalytics: {
            currentEmotion: aiAnalytics.emotionDetection.currentEmotion,
            emotionConfidence: aiAnalytics.emotionDetection.confidence,
            behaviorPatterns: aiAnalytics.behaviorAnalysis.patterns,
            contextualFactors: aiAnalytics.contextualAwareness.environmentalFactors,
            lifestyleFactors: aiAnalytics.contextualAwareness.lifestyle
          },
          realTimeMonitoring: {
            enabled: realTimeMonitoring.enabled,
            continuousAssessment: realTimeMonitoring.continuousAssessment,
            liveVitals: realTimeMonitoring.liveVitals
          },
          preAnalysisRisk: preAnalysis
        }
      };
      
      console.log('🤖 Advanced AI Symptom Analysis:', analysisPayload);
      
      // Use the new advanced symptom analyzer API
      const response = await advancedSymptomAnalyzerAPI.analyzeSymptoms(analysisPayload);

      if (response.success) {
        const enhancedAnalysis = response.analysis;
        
        // Process with advanced AI features
        const processedAnalysis = await processAdvancedAnalysis(enhancedAnalysis);
        
        setAnalysis(processedAnalysis);
        
        // Update risk assessment based on analysis
        updateRiskAssessment(response.riskAnalysis);
        
        // Update clinical decision support
        updateClinicalSupport(response.clinicalRecommendations);
        
        // Update symptom progression tracking
        updateProgressionTracking(response.progressionInsights);
        
        // Update emotion analysis
        if (response.emotionAnalysis) {
          setAiAnalytics(prev => ({
            ...prev,
            emotionDetection: {
              ...prev.emotionDetection,
              currentEmotion: response.emotionAnalysis.primaryEmotion.emotion,
              confidence: response.emotionAnalysis.primaryEmotion.confidence
            }
          }));
        }
        
        // Find specialists with enhanced matching
        if (response.specialists && response.specialists.length > 0) {
          setAvailableDoctors(response.specialists);
        } else if (enhancedAnalysis.recommendations?.specialist_needed) {
          const specialists = await findEnhancedSpecialists(enhancedAnalysis);
          setAvailableDoctors(specialists);
        }
        
        // Real-time monitoring alerts
        if (response.riskAnalysis?.urgencyLevel === 'emergency' || response.riskAnalysis?.urgencyLevel === 'urgent') {
          triggerEmergencyAlert(response);
        }
        
        // Initialize real-time monitoring if enabled
        if (realTimeMonitoring.enabled && !realTimeMonitoring.webSocketConnection) {
          initializeAnalysisMonitoring(response.metadata?.analysisId);
        }
        
      }
    } catch (error) {
      console.error('Error in advanced symptom analysis:', error);
      alert('Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Perform pre-analysis risk assessment
  const performPreAnalysisRiskAssessment = async () => {
    try {
      // Analyze symptoms for immediate red flags
      const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe headache', 'confusion', 'unconscious'];
      const highRiskKeywords = ['blood', 'severe pain', 'can\'t move', 'numbness', 'vision loss'];
      
      const symptomsLower = symptoms.toLowerCase();
      let riskScore = 0;
      const detectedFlags = [];
      
      emergencyKeywords.forEach(keyword => {
        if (symptomsLower.includes(keyword)) {
          riskScore += 4;
          detectedFlags.push({ type: 'emergency', keyword, weight: 4 });
        }
      });
      
      highRiskKeywords.forEach(keyword => {
        if (symptomsLower.includes(keyword)) {
          riskScore += 2;
          detectedFlags.push({ type: 'high_risk', keyword, weight: 2 });
        }
      });
      
      // Factor in severity level
      const severityLevel = severityLevels.find(level => level.value === additionalInfo.severity);
      riskScore += severityLevel?.score || 1;
      
      // Factor in selected body parts
      selectedBodyParts.forEach(partName => {
        if (partName === 'Chest' || partName === 'Head') {
          riskScore += 1;
        }
      });
      
      const urgencyLevel = riskScore >= 6 ? 'emergency' : riskScore >= 4 ? 'high' : riskScore >= 2 ? 'moderate' : 'low';
      
      return {
        riskScore,
        urgencyLevel,
        detectedFlags,
        recommendsEmergencyAction: riskScore >= 6
      };
    } catch (error) {
      return { riskScore: 1, urgencyLevel: 'low', detectedFlags: [], recommendsEmergencyAction: false };
    }
  };
  
  // Process analysis with advanced AI features
  const processAdvancedAnalysis = async (rawAnalysis) => {
    try {
      // Enhanced analysis with AI insights
      const processed = {
        ...rawAnalysis,
        aiEnhancements: {
          confidenceScore: Math.min(100, (rawAnalysis.symptom_analysis?.accuracy || 70) + 15),
          bodySystemsAffected: mapSymptomsToBodySystems(rawAnalysis.symptom_analysis?.primary_symptoms || []),
          riskFactors: identifyRiskFactors(rawAnalysis),
          clinicalPathway: determineClinicalPathway(rawAnalysis),
          urgencyAssessment: assessUrgencyLevel(rawAnalysis),
          aiRecommendations: generateAIRecommendations(rawAnalysis)
        },
        visualizations: {
          bodyMap: generateBodyVisualization(rawAnalysis),
          riskChart: generateRiskVisualization(rawAnalysis),
          timeline: generateTimelineVisualization()
        }
      };
      
      return processed;
    } catch (error) {
      console.error('Advanced processing failed:', error);
      return rawAnalysis;
    }
  };
  
  // Map symptoms to body systems (simplified)
  const mapSymptomsToBodySystems = (symptoms) => {
    const systemMapping = [];
    // Simplified mapping without full anatomical systems
    const basicSystems = {
      'head': ['headache', 'dizziness', 'migraine'],
      'chest': ['chest pain', 'shortness of breath', 'palpitations'],
      'abdomen': ['stomach pain', 'nausea', 'bloating']
    };
    
    symptoms.forEach(symptom => {
      Object.entries(basicSystems).forEach(([system, relatedSymptoms]) => {
        if (relatedSymptoms.some(related => 
          symptom.toLowerCase().includes(related.toLowerCase())
        )) {
          systemMapping.push({ system, symptom, confidence: 0.8 });
        }
      });
    });
    return systemMapping;
  };
  
  // Identify risk factors
  const identifyRiskFactors = (analysis) => {
    const riskFactors = [];
    
    // Age-related risks
    if (user?.profile?.age > 65) {
      riskFactors.push({ factor: 'advanced_age', weight: 'moderate', description: 'Age over 65 increases health risks' });
    }
    
    // Symptom-based risks
    if (analysis.symptom_analysis?.severity_assessment === 'severe') {
      riskFactors.push({ factor: 'severe_symptoms', weight: 'high', description: 'Severe symptoms require prompt attention' });
    }
    
    // Multiple system involvement
    if (analysis.symptom_analysis?.body_systems_involved?.length > 2) {
      riskFactors.push({ factor: 'multi_system', weight: 'moderate', description: 'Multiple body systems affected' });
    }
    
    return riskFactors;
  };
  
  // Determine clinical pathway
  const determineClinicalPathway = (analysis) => {
    const primarySymptoms = analysis.symptom_analysis?.primary_symptoms || [];
    
    for (const [key, pathway] of Object.entries(clinicalPathways)) {
      if (primarySymptoms.some(symptom => 
        key.replace('_', ' ').toLowerCase().includes(symptom.toLowerCase())
      )) {
        return { ...pathway, pathwayId: key };
      }
    }
    
    return null;
  };
  
  // Assess urgency level
  const assessUrgencyLevel = (analysis) => {
    const severity = analysis.symptom_analysis?.severity_assessment;
    const redFlags = analysis.red_flags?.length || 0;
    
    if (redFlags > 2 || severity === 'critical') return 'emergency';
    if (redFlags > 0 || severity === 'severe') return 'high';
    if (severity === 'moderate') return 'moderate';
    return 'low';
  };
  
  // Generate AI recommendations
  const generateAIRecommendations = (analysis) => {
    return {
      immediateActions: [
        'Monitor symptoms closely',
        'Stay hydrated',
        'Rest appropriately'
      ],
      followUpTiming: analysis.timeline?.follow_up_timing || '24-48 hours if symptoms persist',
      preventiveMeasures: [
        'Maintain healthy lifestyle',
        'Follow medical advice',
        'Regular check-ups'
      ],
      aiConfidence: 85
    };
  };
  
  // Generate body visualization data
  const generateBodyVisualization = (analysis) => {
    return {
      affectedAreas: selectedBodyParts,
      systemHighlights: analysis.symptom_analysis?.body_systems_involved || [],
      painLevels: {}
    };
  };
  
  // Generate risk visualization
  const generateRiskVisualization = (analysis) => {
    return {
      riskScore: riskAssessment.riskScore,
      riskLevel: analysis.aiEnhancements?.urgencyAssessment || 'moderate',
      factors: analysis.aiEnhancements?.riskFactors || []
    };
  };
  
  // Generate timeline visualization
  const generateTimelineVisualization = () => {
    return {
      events: progressionTracking.timeline,
      patterns: progressionTracking.patterns,
      predictions: progressionTracking.prediction
    };
  };
  
  // Update risk assessment
  const updateRiskAssessment = (riskAnalysis) => {
    if (!riskAnalysis) return;
    
    setRiskAssessment(prev => ({
      ...prev,
      riskScore: riskAnalysis.riskScore || 0,
      urgencyLevel: riskAnalysis.urgencyLevel || 'low',
      riskFactors: riskAnalysis.riskFactors || [],
      clinicalAlerts: riskAnalysis.clinicalAlerts || [],
      recommendations: riskAnalysis.recommendations || {},
      followUpProtocol: riskAnalysis.followUpProtocol || {}
    }));
  };

  // Update clinical decision support
  const updateClinicalSupport = (clinicalRecommendations) => {
    if (!clinicalRecommendations) return;
    
    setClinicalSupport(prev => ({
      ...prev,
      differentialDiagnosis: clinicalRecommendations.differentialDiagnosis || [],
      recommendedTests: clinicalRecommendations.recommendedTests || [],
      treatmentOptions: clinicalRecommendations.treatmentOptions || [],
      specialistReferrals: clinicalRecommendations.specialistReferrals || [],
      clinicalPathways: clinicalRecommendations.clinicalPathways || [],
      recommendedPathway: clinicalRecommendations.recommendedPathway || null,
      evidenceLevel: clinicalRecommendations.evidenceLevel || 'moderate'
    }));
  };

  // Update progression tracking
  const updateProgressionTracking = (progressionInsights) => {
    if (!progressionInsights) return;
    
    setProgressionTracking(prev => ({
      ...prev,
      timeline: [...prev.timeline, progressionInsights.newEvent],
      patterns: progressionInsights.patterns || [],
      trends: progressionInsights.trends || null,
      prediction: progressionInsights.predictions || null,
      historicalData: [...prev.historicalData, {
        timestamp: new Date().toISOString(),
        symptoms: symptoms,
        analysis: progressionInsights
      }]
    }));
  };
  
  // Find enhanced specialists
  const findEnhancedSpecialists = async (analysis) => {
    try {
      const specialtyNeeded = analysis.recommendations?.specialist_needed;
      const location = user?.profile?.address?.city;
      
      // Enhanced search with AI matching
      const searchPayload = {
        specialty: specialtyNeeded,
        location: location,
        urgency: analysis.aiEnhancements?.urgencyAssessment || 'moderate',
        aiMatching: {
          symptoms: analysis.symptom_analysis?.primary_symptoms || [],
          bodySystemsAffected: analysis.aiEnhancements?.bodySystemsAffected || [],
          clinicalPathway: analysis.aiEnhancements?.clinicalPathway
        }
      };
      
      const response = await apiClient.post('/chatbot/doctor-recommendations', searchPayload);
      return response.data.available_doctors || [];
    } catch (error) {
      console.error('Enhanced specialist search failed:', error);
      return [];
    }
  };
  
  // Trigger emergency alert
  const triggerEmergencyAlert = (analysis) => {
    setRealTimeMonitoring(prev => ({
      ...prev,
      alerts: [
        ...prev.alerts,
        {
          id: Date.now(),
          type: 'emergency',
          severity: 'critical',
          message: 'Emergency medical attention may be required',
          timestamp: new Date().toISOString(),
          analysis: analysis.symptom_analysis,
          recommendedAction: 'Consider calling emergency services or visiting emergency room'
        }
      ]
    }));
    
    // Show emergency alert dialog
    if (confirm('⚠️ URGENT: Your symptoms may require immediate medical attention. Would you like to call emergency services?')) {
      window.open('tel:108'); // Emergency number
    }
  };

  // Initialize analysis-specific real-time monitoring
  const initializeAnalysisMonitoring = (analysisId) => {
    try {
      const socket = advancedSymptomAnalyzerAPI.initializeRealTimeMonitoring(
        (data) => {
          // Handle real-time updates
          if (data.type === 'risk_update') {
            setRiskAssessment(prev => ({
              ...prev,
              riskScore: data.riskScore,
              urgencyLevel: data.urgencyLevel,
              clinicalAlerts: [...prev.clinicalAlerts, ...data.alerts]
            }));
          } else if (data.type === 'progression_update') {
            setProgressionTracking(prev => ({
              ...prev,
              trends: data.trends,
              predictions: data.predictions
            }));
          } else if (data.type === 'alert') {
            setRealTimeMonitoring(prev => ({
              ...prev,
              alerts: [...prev.alerts, data.alert]
            }));
          }
        },
        (error) => {
          console.error('Real-time monitoring error:', error);
          setRealTimeMonitoring(prev => ({
            ...prev,
            enabled: false,
            webSocketConnection: null
          }));
        }
      );

      setRealTimeMonitoring(prev => ({
        ...prev,
        webSocketConnection: socket
      }));

      // Send initial data for monitoring
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'initialize_monitoring',
          analysisId,
          userId: user?.id,
          symptoms: symptoms,
          additionalInfo: additionalInfo
        }));
      }
    } catch (error) {
      console.error('Failed to initialize real-time monitoring:', error);
    }
  };

  // Cleanup real-time monitoring
  useEffect(() => {
    return () => {
      if (realTimeMonitoring.webSocketConnection) {
        realTimeMonitoring.webSocketConnection.close();
      }
    };
  }, [realTimeMonitoring.webSocketConnection]);

  const addSymptomFromQuick = (symptom) => {
    if (!symptoms.includes(symptom)) {
      setSymptoms(prev => prev ? `${prev}, ${symptom}` : symptom);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      mild: 'text-green-600 bg-green-50 border-green-200',
      moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      severe: 'text-orange-600 bg-orange-50 border-orange-200',
      urgent: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[severity] || colors.moderate;
  };

  const getUrgencyIcon = (severity) => {
    if (severity === 'urgent' || severity === 'severe') {
      return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
    return <HeartIcon className="w-5 h-5" />;
  };

  const bookAppointment = (doctorId) => {
    // This would integrate with your appointment booking system
    window.location.href = `/book-appointment/${doctorId}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Header with AI Features */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
          <HeartIcon className="w-10 h-10 text-blue-600" />
          {/* AI Features Indicators */}
          <div className="absolute -top-1 -right-1 flex space-x-1">
            {aiAnalytics.emotionDetection.enabled && (
              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <CpuChipIcon className="w-2 h-2 text-white" />
              </div>
            )}
            {realTimeMonitoring.enabled && (
              <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <BoltIcon className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center space-x-3">
          <span>Advanced AI Symptom Analyzer</span>
          <SparklesIcon className="w-8 h-8 text-purple-600" />
        </h1>
        <p className="text-gray-600 max-w-4xl mx-auto mb-6">
          Experience advanced healthcare analysis with AI-powered risk assessment, 
          clinical decision support, and symptom progression tracking. Our intelligent system combines 
          multiple AI technologies for comprehensive health insights.
        </p>
        
        {/* Advanced Features Status */}
        <div className="flex items-center justify-center space-x-8 mt-6">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              riskAssessment.enabled ? 'bg-orange-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <ShieldCheckIcon className="w-4 h-4 text-orange-600" />
            <span className="text-gray-600">Risk Assessment</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              clinicalSupport.enabled ? 'bg-purple-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <BeakerIcon className="w-4 h-4 text-purple-600" />
            <span className="text-gray-600">Clinical Decision Support</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              progressionTracking.enabled ? 'bg-indigo-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <PresentationChartLineIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-gray-600">Progression Tracking</span>
          </div>
        </div>
        
        {/* Real-time Analytics Display */}
        {riskAssessment.riskScore > 0 && (
          <div className="mt-6 inline-flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 rounded-full border border-blue-200">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                AI Risk Score: {riskAssessment.riskScore}/100
              </span>
            </div>
            <div className="text-sm text-purple-600">
              Urgency: {riskAssessment.urgencyLevel}
            </div>
            {clinicalSupport.differentialDiagnosis.length > 0 && (
              <div className="text-sm text-purple-600">
                • {clinicalSupport.differentialDiagnosis.length} possible causes identified
              </div>
            )}
          </div>
        )}
        
        {/* Emergency Alerts */}
        {realTimeMonitoring.alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {realTimeMonitoring.alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="inline-flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-full border border-red-200 text-red-800">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simple Body Parts Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
            Select Affected Body Parts
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the body parts where you're experiencing symptoms to help our AI provide better analysis.
          </p>
          
          {/* Body Parts Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(bodyParts).map(([key, part]) => (
              <button
                key={key}
                onClick={() => handleBodyPartSelection(part.name)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedBodyParts.includes(part.name)
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{part.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {part.commonSymptoms.slice(0, 2).join(', ')}
                </div>
              </button>
            ))}
          </div>
          
          {/* Selected Body Parts */}
          {selectedBodyParts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected Areas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedBodyParts.map((partName, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <span className="text-sm text-blue-800">{partName}</span>
                    <button
                      onClick={() => setSelectedBodyParts(prev => prev.filter(p => p !== partName))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Multi-Modal Input & AI Analytics */}
        <div className="space-y-6">
          {/* Voice Input */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MicrophoneIcon className="w-6 h-6 mr-2 text-green-600" />
              Voice Symptom Description
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={multiModalInput.voiceRecording.isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={!multiModalInput.voiceRecording.enabled}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    multiModalInput.voiceRecording.isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {multiModalInput.voiceRecording.isRecording ? (
                    <>
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <MicrophoneIcon className="w-4 h-4" />
                      <span>Start Voice Input</span>
                    </>
                  )}
                </button>
                
                {multiModalInput.voiceRecording.transcript && (
                  <div className="text-sm text-gray-600">
                    Transcript ready
                  </div>
                )}
              </div>
              
              {multiModalInput.voiceRecording.transcript && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Voice Transcript:</h4>
                  <p className="text-sm text-gray-600">{multiModalInput.voiceRecording.transcript}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Photo Capture */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CameraIcon className="w-6 h-6 mr-2 text-purple-600" />
              Visual Symptom Documentation
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={capturePhoto}
                disabled={!multiModalInput.photoCapture.enabled}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
              
              {multiModalInput.photoCapture.capturedImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Captured Images:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {multiModalInput.photoCapture.capturedImages.slice(0, 4).map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.data}
                          alt="Symptom documentation"
                          className="w-full h-20 object-cover rounded border"
                        />
                        <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                          {new Date(image.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* AI Emotion & Behavior Detection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CpuChipIcon className="w-6 h-6 mr-2 text-indigo-600" />
              AI Behavioral Analysis
            </h3>
            
            <div className="space-y-4">
              {/* Emotion Detection */}
              {aiAnalytics.emotionDetection.currentEmotion && (
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <h4 className="text-sm font-medium text-indigo-800 mb-1">Detected Emotion:</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-indigo-700">
                      {aiAnalytics.emotionDetection.currentEmotion.emotion}
                    </span>
                    <span className="text-xs text-indigo-600">
                      ({(aiAnalytics.emotionDetection.confidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                </div>
              )}
              
              {/* Behavior Patterns */}
              {aiAnalytics.behaviorAnalysis.patterns.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Behavioral Patterns:</h4>
                  <div className="space-y-1">
                    {aiAnalytics.behaviorAnalysis.patterns.slice(0, 3).map((pattern, index) => (
                      <div key={index} className="text-sm text-purple-700">
                        • {pattern}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Contextual Awareness */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Contextual Factors:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Time: {new Date().toLocaleTimeString()}</div>
                  <div>Session: Active</div>
                  <div>Environment: {aiAnalytics.contextualAwareness.environmentalFactors.length || 'Analyzing...'}</div>
                  <div>AI Status: {aiAnalytics.emotionDetection.enabled ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Describe Your Symptoms</h2>
        
        {/* Quick Symptoms */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Common Symptoms (click to add)
          </label>
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((symptom) => (
              <button
                key={symptom}
                onClick={() => addSymptomFromQuick(symptom)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        {/* Symptom Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your symptoms in detail
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="4"
            placeholder="Example: I have a persistent headache on the right side of my head for the past 2 days. It gets worse when I move and I feel nauseous..."
          />
        </div>

        {/* Severity Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How severe are your symptoms?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {severityLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setAdditionalInfo(prev => ({ ...prev, severity: level.value }))}
                className={`p-3 border rounded-lg text-left transition-all ${
                  additionalInfo.severity === level.value
                    ? `border-${level.color}-500 bg-${level.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{level.value.charAt(0).toUpperCase() + level.value.slice(1)}</div>
                <div className="text-xs text-gray-600">{level.label.split(' - ')[1]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Information Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowDetailedForm(!showDetailedForm)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showDetailedForm ? 'Hide' : 'Show'} Additional Information (Optional)
          </button>
        </div>

        {/* Detailed Form */}
        {showDetailedForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How long have you had these symptoms?
                </label>
                <input
                  type="text"
                  value={additionalInfo.duration}
                  onChange={(e) => setAdditionalInfo(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2 days, 1 week, 3 hours"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What triggers or worsens your symptoms?
                </label>
                <input
                  type="text"
                  value={additionalInfo.triggers}
                  onChange={(e) => setAdditionalInfo(prev => ({ ...prev, triggers: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., movement, eating, stress"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current medications or recent treatments
              </label>
              <input
                type="text"
                value={additionalInfo.medications}
                onChange={(e) => setAdditionalInfo(prev => ({ ...prev, medications: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Paracetamol, took rest, applied ice"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Known allergies
              </label>
              <input
                type="text"
                value={additionalInfo.allergies}
                onChange={(e) => setAdditionalInfo(prev => ({ ...prev, allergies: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Penicillin, Nuts, Shellfish"
              />
            </div>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={analyzeSymptoms}
          disabled={!symptoms.trim() || isAnalyzing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Analyzing Symptoms...
            </>
          ) : (
            <>
              <HeartIcon className="w-5 h-5 mr-2" />
              Analyze My Symptoms
            </>
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Main Analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                getSeverityColor(analysis.symptom_analysis?.severity_assessment)
              }`}>
                {getUrgencyIcon(analysis.symptom_analysis?.severity_assessment)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Analysis Results</h3>
                <p className="text-sm text-gray-600">
                  Severity: {analysis.symptom_analysis?.severity_assessment || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Primary Symptoms */}
            {analysis.symptom_analysis?.primary_symptoms && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Primary Symptoms Detected</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.symptom_analysis.primary_symptoms.map((symptom, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Possible Causes */}
            {analysis.symptom_analysis?.possible_causes && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <InformationCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Possible Causes
                </h4>
                <div className="space-y-2">
                  {analysis.symptom_analysis.possible_causes.slice(0, 5).map((cause, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">{cause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body Systems Involved */}
            {analysis.symptom_analysis?.body_systems_involved && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Body Systems Affected</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.symptom_analysis.body_systems_involved.map((system, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {system}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {analysis.recommendations && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <LightBulbIcon className="w-6 h-6 mr-2 text-yellow-600" />
                Recommendations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Immediate Actions */}
                {analysis.recommendations.immediate_actions && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                      Immediate Actions
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.immediate_actions.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Self-Care Measures */}
                {analysis.recommendations.self_care_measures && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <HeartIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Self-Care Measures
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.self_care_measures.map((measure, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* When to See Doctor */}
              {analysis.recommendations.when_to_see_doctor && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2" />
                    When to See a Doctor
                  </h4>
                  <p className="text-sm text-yellow-700">{analysis.recommendations.when_to_see_doctor}</p>
                </div>
              )}

              {/* Specialist Needed */}
              {analysis.recommendations.specialist_needed && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2" />
                    Recommended Specialist
                  </h4>
                  <p className="text-sm text-blue-700">{analysis.recommendations.specialist_needed}</p>
                </div>
              )}
            </div>
          )}

          {/* Warning Signs */}
          {analysis.red_flags && analysis.red_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
                Warning Signs - Seek Immediate Medical Attention
              </h3>
              <ul className="space-y-2">
                {analysis.red_flags.map((flag, index) => (
                  <li key={index} className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Available Doctors */}
          {availableDoctors.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="w-6 h-6 mr-2 text-purple-600" />
                Available Specialists Near You
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableDoctors.slice(0, 4).map((doctor, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                        <div className="flex items-center mt-1">
                          <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-600">
                            {doctor.rating}/5 ({doctor.totalReviews} reviews)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">₹{doctor.fee}</div>
                        <div className="text-xs text-gray-500">{doctor.experience}+ years</div>
                      </div>
                    </div>
                    
                    {doctor.recommendationReason && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <strong>Why recommended:</strong> {doctor.recommendationReason}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Next available: {doctor.nextAvailable ? 
                          new Date(doctor.nextAvailable).toLocaleDateString() : 
                          'Call to check'
                        }
                      </div>
                      <button
                        onClick={() => bookAppointment(doctor.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline & Follow-up */}
          {analysis.timeline && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="w-6 h-6 mr-2 text-indigo-600" />
                Timeline & Follow-up
              </h3>
              
              {analysis.timeline.if_symptoms_worsen && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-1">If symptoms worsen:</h4>
                  <p className="text-sm text-orange-700">{analysis.timeline.if_symptoms_worsen}</p>
                </div>
              )}
              
              {analysis.timeline.follow_up_timing && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-1">Follow-up timing:</h4>
                  <p className="text-sm text-green-700">{analysis.timeline.follow_up_timing}</p>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Important:</strong> This AI analysis is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns. If you're experiencing a medical emergency, call emergency services immediately.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomAnalyzer;
