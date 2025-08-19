import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/apiClient';
import {
  HeartIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  DocumentTextIcon,
  StarIcon,
  PhoneIcon
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

  // Common symptoms for quick selection
  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Dizziness',
    'Chest pain', 'Shortness of breath', 'Stomach pain', 'Joint pain',
    'Back pain', 'Sore throat', 'Runny nose', 'Skin rash', 'Muscle aches'
  ];

  const severityLevels = [
    { value: 'mild', label: 'Mild - Barely noticeable', color: 'green' },
    { value: 'moderate', label: 'Moderate - Uncomfortable', color: 'yellow' },
    { value: 'severe', label: 'Severe - Very bothersome', color: 'orange' },
    { value: 'extreme', label: 'Extreme - Unbearable', color: 'red' }
  ];

  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      alert('Please describe your symptoms');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiClient.post('/chatbot/analyze-symptoms', {
        symptoms: symptoms,
        additionalInfo: {
          ...additionalInfo,
          age: user?.profile?.age,
          gender: user?.profile?.gender,
          location: user?.profile?.address?.city
        }
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        if (response.data.available_specialists) {
          setAvailableDoctors(response.data.available_specialists);
        }
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      alert('Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HeartIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Symptom Analyzer</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Describe your symptoms and get AI-powered analysis to understand potential causes 
          and receive recommendations for next steps.
        </p>
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
