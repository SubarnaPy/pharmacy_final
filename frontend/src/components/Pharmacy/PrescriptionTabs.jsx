import React, { useState } from 'react';
import {
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BugAntIcon,
  HeartIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  StarIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Medications Tab Component
export const MedicationsTab = ({ prescription }) => {
  const [expandedMedication, setExpandedMedication] = useState(null);

  const getMedicationRiskColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Medications Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <BeakerIcon className="h-6 w-6 mr-2 text-blue-600" />
            Medications ({prescription?.medications?.length || 0})
          </h2>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">High Confidence</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Medium Confidence</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Low Confidence</span>
            </div>
          </div>
        </div>

        {/* Medications List */}
        <div className="space-y-4">
          {prescription?.medications?.map((medication, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Medication Header */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {medication?.name || medication?.brandName || 'Unknown Medication'}
                      </h3>
                      {medication?.confidence && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMedicationRiskColor(medication.confidence)}`}>
                          {Math.round(medication.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    
                    {medication?.genericName && medication?.genericName !== medication?.name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <strong>Generic:</strong> {medication.genericName}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-6 mt-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Dosage:</strong> {medication?.dosage || 'Not specified'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Quantity:</strong> {medication?.quantity?.prescribed || 'Not specified'} {medication?.quantity?.unit || ''}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Frequency:</strong> {medication?.frequency || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedMedication(expandedMedication === index ? null : index)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {expandedMedication === index ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Medication Details */}
              {expandedMedication === index && (
                <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Basic Information</h4>
                      
                      {medication?.strength && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Strength</label>
                          <p className="text-gray-900 dark:text-white">{medication.strength}</p>
                        </div>
                      )}
                      
                      {medication?.route && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Route</label>
                          <p className="text-gray-900 dark:text-white">{medication.route}</p>
                        </div>
                      )}
                      
                      {medication?.duration && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                          <p className="text-gray-900 dark:text-white">{medication.duration}</p>
                        </div>
                      )}
                      
                      {medication?.indication && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Indication</label>
                          <p className="text-gray-900 dark:text-white">{medication.indication}</p>
                        </div>
                      )}
                    </div>

                    {/* Instructions & Warnings */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Instructions & Warnings</h4>
                      
                      {medication?.instructions && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Special Instructions</label>
                          <p className="text-gray-900 dark:text-white">{medication.instructions}</p>
                        </div>
                      )}
                      
                      {medication?.sideEffects && medication.sideEffects.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Common Side Effects</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medication.sideEffects.map((effect, idx) => (
                              <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                {effect}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {medication?.contraindications && medication.contraindications.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contraindications</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medication.contraindications.map((contra, idx) => (
                              <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                ⚠️ {contra}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alternatives & Refills */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Additional Information</h4>
                      
                      {medication?.alternatives && medication.alternatives.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Alternative Medications</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medication.alternatives.map((alt, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {medication?.quantity?.refills && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Refills</label>
                          <p className="text-gray-900 dark:text-white">
                            {medication.quantity.refills.remaining || 0} of {medication.quantity.refills.authorized || 0} remaining
                          </p>
                        </div>
                      )}
                      
                      {medication?.isGenericAcceptable !== undefined && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Generic Substitution</label>
                          <div className="flex items-center space-x-2">
                            {medication.isGenericAcceptable ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                <span className="text-green-600 text-sm">Acceptable</span>
                              </>
                            ) : (
                              <>
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                                <span className="text-red-600 text-sm">Not acceptable</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {(!prescription?.medications || prescription.medications.length === 0) && (
          <div className="text-center py-8">
            <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Medications Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No medications were detected in this prescription.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Analysis Tab Component
export const AIAnalysisTab = ({ prescription }) => {
  const [expandedSection, setExpandedSection] = useState('gemini-results');

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const aiProcessing = prescription?.prescriptionStructuredData?.aiProcessing;

  return (
    <div className="space-y-6">
      {/* AI Processing Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <CpuChipIcon className="h-6 w-6 mr-2 text-blue-600" />
          AI Processing Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Overall Confidence</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(aiProcessing?.overallConfidence || 0)}`}>
                  {aiProcessing?.overallConfidence ? `${Math.round(aiProcessing.overallConfidence * 100)}%` : 'N/A'}
                </p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-300">Quality Level</p>
                <p className={`text-lg font-bold capitalize ${getQualityColor(aiProcessing?.qualityLevel)}`}>
                  {aiProcessing?.qualityLevel || 'Unknown'}
                </p>
              </div>
              <StarIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Medications Found</p>
                <p className="text-2xl font-bold text-purple-600">
                  {prescription?.medications?.length || 0}
                </p>
              </div>
              <BeakerIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Processing Time</p>
                <p className="text-lg font-bold text-orange-600">
                  {aiProcessing?.processingTime ? `${(aiProcessing.processingTime / 1000).toFixed(1)}s` : 'N/A'}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gemini AI Results */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('gemini-results')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-green-600" />
            Gemini AI Analysis Results
          </h3>
          {expandedSection === 'gemini-results' ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>
        
        {expandedSection === 'gemini-results' && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Processing Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Processing Information</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing ID</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {aiProcessing?.geminiResults?.processingId || 'Not available'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing Method</label>
                    <p className="text-gray-900 dark:text-white">
                      {aiProcessing?.processingMethod || 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing Steps</label>
                    {aiProcessing?.processingSteps ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aiProcessing.processingSteps.map((step, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {step.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">Not available</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Enhancement Applied</label>
                    <div className="flex items-center space-x-2">
                      {aiProcessing?.enhancementApplied ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 text-sm">Yes</span>
                        </>
                      ) : (
                        <>
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-600 text-sm">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Results */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Analysis Results</h4>
                
                {/* Show actual medications data */}
                <div className="space-y-3">
                  {/* Medications Analysis */}
                  {prescription?.medications && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Medications Detected</label>
                      <div className="space-y-2 mt-1">
                        {prescription.medications.map((med, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {med.name || med.brandName || `Medication ${index + 1}`}
                                </p>
                                {med.genericName && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Generic: {med.genericName}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {med.dosage || 'Dosage not specified'}
                                </p>
                              </div>
                              {med.confidence && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getMedicationRiskColor(med.confidence)}`}>
                                  {Math.round(med.confidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctor Information */}
                  {prescription?.prescriptionStructuredData?.doctor && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Prescriber Information</label>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {prescription.prescriptionStructuredData.doctor.name || 'Doctor name not available'}
                            </p>
                            {prescription.prescriptionStructuredData.doctor.license && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                License: {prescription.prescriptionStructuredData.doctor.license}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Patient Information */}
                  {prescription?.prescriptionStructuredData?.patientInfo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Information</label>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {prescription.prescriptionStructuredData.patientInfo.name || 
                               `${prescription.patient?.profile?.firstName} ${prescription.patient?.profile?.lastName}` || 
                               'Patient name not available'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {prescription.prescriptionStructuredData.patientInfo.age || 'Age not specified'}, {prescription.prescriptionStructuredData.patientInfo.gender || 'Gender not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Raw Text Processing */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('raw-text')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
            Text Processing Results
          </h3>
          {expandedSection === 'raw-text' ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>
        
        {expandedSection === 'raw-text' && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Original Text */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Original OCR Text</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                    {aiProcessing?.geminiRawResponse?.originalText || 'Not available'}
                  </pre>
                </div>
                
                {prescription?.ocrData && (
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>OCR Engine:</strong> {prescription.ocrData.engine}</p>
                    <p><strong>OCR Confidence:</strong> {Math.round((prescription.ocrData.confidence || 0) * 100)}%</p>
                    <p><strong>Words Found:</strong> {prescription.ocrData.wordsFound || 0}</p>
                    <p><strong>Lines Found:</strong> {prescription.ocrData.linesFound || 0}</p>
                    <p><strong>Processing Time:</strong> {prescription.ocrData.processingTime ? `${prescription.ocrData.processingTime}ms` : 'N/A'}</p>
                  </div>
                )}
              </div>

              {/* Enhanced Text */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Enhanced Text</h4>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                    {aiProcessing?.geminiRawResponse?.enhancedText || 'Not available'}
                  </pre>
                </div>
                
                {aiProcessing?.geminiRawResponse?.confidence && (
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Enhancement Confidence:</strong> {Math.round(aiProcessing.geminiRawResponse.confidence * 100)}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
          Processing Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid Medications</label>
            <p className="text-2xl font-bold text-green-600">
              {aiProcessing?.validMedications || 0}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Unknown Medications</label>
            <p className="text-2xl font-bold text-red-600">
              {aiProcessing?.unknownMedications || 0}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Drug Interactions</label>
            <p className="text-2xl font-bold text-yellow-600">
              {aiProcessing?.hasInteractions ? 'Found' : 'None'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Anomalies Detected</label>
            <p className="text-2xl font-bold text-red-600">
              {aiProcessing?.hasAnomalies ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default { MedicationsTab, AIAnalysisTab };
