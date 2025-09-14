import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PlayIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  LanguageIcon,
  DocumentTextIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

const VoiceToPrescription = ({ doctorProfile, onPrescriptionGenerated, className = '' }) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [language, setLanguage] = useState('en-US');
  const [voiceChunks, setVoiceChunks] = useState([]);
  const [realTimeMode, setRealTimeMode] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  // Voice configuration
  const voiceConfig = {
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    language: language
  };

  // Supported languages
  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)', medical: true },
    { code: 'en-GB', name: 'English (UK)', medical: true },
    { code: 'es-ES', name: 'Spanish', medical: true },
    { code: 'fr-FR', name: 'French', medical: true },
    { code: 'de-DE', name: 'German', medical: false },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', medical: false }
  ];

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = voiceConfig.continuous;
      recognition.interimResults = voiceConfig.interimResults;
      recognition.maxAlternatives = voiceConfig.maxAlternatives;
      recognition.lang = voiceConfig.language;

      // Event handlers
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let totalConfidence = 0;
        let resultCount = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          if (result.isFinal) {
            finalTranscript += transcript + ' ';
            totalConfidence += confidence;
            resultCount++;

            // Add to voice chunks for real-time processing
            if (realTimeMode) {
              const chunk = {
                id: Date.now() + Math.random(),
                text: transcript,
                confidence: confidence,
                timestamp: new Date(),
                isFinal: true
              };
              setVoiceChunks(prev => [...prev, chunk]);
            }
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setConfidence(resultCount > 0 ? totalConfidence / resultCount : 0);
        }

        // Update interim results
        if (interimTranscript) {
          setTranscript(prev => prev + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('🎤 Voice recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
      };

    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, realTimeMode]);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setVoiceChunks([]);
      setError(null);
      recognitionRef.current.start();
    }
  }, [isListening]);

  // Stop voice recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Process voice to prescription
  const processToPrescription = async () => {
    if (!transcript.trim()) {
      setError('No voice input to process');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/voice/process-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          voiceText: transcript,
          doctorProfile: doctorProfile,
          options: {
            language: language.split('-')[0],
            translateToEnglish: language !== 'en-US',
            validateAuthenticity: true,
            enhanceText: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setResults(result.data);
        if (onPrescriptionGenerated) {
          onPrescriptionGenerated(result.data);
        }
      } else {
        throw new Error(result.message || 'Processing failed');
      }

    } catch (error) {
      console.error('❌ Voice processing error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Real-time processing
  const processRealTimeChunks = async () => {
    if (voiceChunks.length === 0) return;

    try {
      const response = await fetch('/api/voice/process-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          voiceChunks: voiceChunks,
          doctorProfile: doctorProfile,
          options: {
            minConfidence: 0.8,
            autoComplete: true,
            enableCorrections: true
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setResults(result.data);
      }
    } catch (error) {
      console.error('❌ Real-time processing error:', error);
    }
  };

  // Auto-process real-time chunks
  useEffect(() => {
    if (realTimeMode && voiceChunks.length > 0) {
      const timer = setTimeout(processRealTimeChunks, 2000);
      return () => clearTimeout(timer);
    }
  }, [voiceChunks, realTimeMode]);

  // Clear all data
  const clearAll = () => {
    setTranscript('');
    setResults(null);
    setError(null);
    setVoiceChunks([]);
    setConfidence(0);
  };

  // Use dictation template
  const useDictationTemplate = (template) => {
    setTranscript(template);
  };

  // Dictation templates
  const templates = {
    antibiotic: "Prescribing Amoxicillin 500mg, take one capsule three times daily for 7 days with food",
    painkiller: "Prescribing Ibuprofen 400mg, take one tablet every 6 hours as needed for pain, maximum 4 tablets per day",
    hypertension: "Prescribing Amlodipine 5mg, take one tablet once daily in the morning for blood pressure control"
  };

  return (
    <div className={`voice-to-prescription bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MicrophoneIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Voice-to-Prescription</h3>
            <p className="text-sm text-gray-600">Dictate prescriptions with AI assistance</p>
          </div>
        </div>
        
        {/* Language Selector */}
        <div className="flex items-center space-x-3">
          <LanguageIcon className="h-5 w-5 text-gray-500" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isListening}
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} {lang.medical && '(Medical)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {/* Start/Stop Recording */}
          {!isListening ? (
            <button
              onClick={startListening}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              <PlayIcon className="h-5 w-5" />
              <span>Start Dictation</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <StopIcon className="h-5 w-5" />
              <span>Stop Dictation</span>
            </button>
          )}

          {/* Process Button */}
          <button
            onClick={processToPrescription}
            disabled={!transcript.trim() || isProcessing || isListening}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>{isProcessing ? 'Processing...' : 'Generate Prescription'}</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={clearAll}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            disabled={isListening || isProcessing}
          >
            <span>Clear</span>
          </button>
        </div>

        {/* Real-time Mode Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="realtime"
            checked={realTimeMode}
            onChange={(e) => setRealTimeMode(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isListening}
          />
          <label htmlFor="realtime" className="text-sm text-gray-700">Real-time Processing</label>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => useDictationTemplate(template)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              disabled={isListening || isProcessing}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Recording Status */}
        {isListening && (
          <div className="flex items-center space-x-2 text-green-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}

        {/* Confidence Score */}
        {confidence > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Confidence:</span>
            <div className="flex items-center space-x-1">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${confidence > 0.8 ? 'bg-green-500' : confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
            </div>
          </div>
        )}

        {/* Real-time Chunks */}
        {realTimeMode && voiceChunks.length > 0 && (
          <div className="text-sm text-blue-600">
            {voiceChunks.length} chunk(s) processed
          </div>
        )}
      </div>

      {/* Voice Transcript */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Voice Transcript:
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Start dictating or use a template..."
          rows={6}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isListening}
        />
        <div className="text-xs text-gray-500 mt-1">
          {transcript.length} characters • {transcript.split(' ').filter(w => w.length > 0).length} words
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-700 font-medium">Error:</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 font-medium">Processing voice to prescription...</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircleIcon className="h-6 w-6" />
            <span className="font-medium">Prescription Generated Successfully</span>
          </div>

          {/* Prescription Data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Generated Prescription:</h4>
            
            {/* Medications */}
            {results.prescription?.medications?.map((med, index) => (
              <div key={index} className="bg-white rounded-md p-3 mb-3 border border-gray-200">
                <div className="font-medium text-gray-900">{med.name}</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Strength: {med.strength}</div>
                  <div>Dosage: {med.dosage}</div>
                  <div>Frequency: {med.frequency}</div>
                  <div>Duration: {med.duration}</div>
                  {med.instructions && <div>Instructions: {med.instructions}</div>}
                  <div className="text-xs text-blue-600">Confidence: {Math.round(med.confidence * 100)}%</div>
                </div>
              </div>
            ))}

            {/* Quality Metrics */}
            {results.prescription?.qualityMetrics && (
              <div className="bg-blue-50 rounded-md p-3 mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Quality Assessment:</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Completeness: {Math.round(results.prescription.qualityMetrics.completeness)}%</div>
                  <div>Clarity: {Math.round(results.prescription.qualityMetrics.clarity)}%</div>
                  <div>Medical Accuracy: {Math.round(results.prescription.qualityMetrics.medicalAccuracy)}%</div>
                  <div>Overall Quality: {Math.round(results.prescription.qualityMetrics.overallQuality)}%</div>
                </div>
              </div>
            )}

            {/* Authentication Results */}
            {results.authentication && (
              <div className={`rounded-md p-3 mt-4 ${results.authentication.isAuthentic ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <h5 className="font-medium text-gray-900 mb-2">Voice Authentication:</h5>
                <div className="text-sm space-y-1">
                  <div>Status: {results.authentication.isAuthentic ? 'Verified' : 'Needs Review'}</div>
                  <div>Confidence: {Math.round(results.authentication.confidence * 100)}%</div>
                  <div>Risk Level: {results.authentication.riskLevel}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceToPrescription;