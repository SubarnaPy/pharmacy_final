import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  BugAntIcon,
  DocumentTextIcon,
  StarIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

// Risk Assessment Tab Component
export const RiskAssessmentTab = ({ prescription }) => {
  const [expandedRiskCategory, setExpandedRiskCategory] = useState('patient-safety');

  const getRiskLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return <CheckCircleIcon className="h-5 w-5" />;
      case 'moderate': case 'medium': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'high': case 'critical': return <ExclamationCircleIcon className="h-5 w-5" />;
      default: return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  const toggleRiskCategory = (category) => {
    setExpandedRiskCategory(expandedRiskCategory === category ? null : category);
  };

  const riskAssessment = prescription?.prescriptionStructuredData?.riskAssessment;

  return (
    <div className="space-y-6">
      {/* Overall Risk Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
          Risk Assessment Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Risk Level */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${getRiskLevelColor(riskAssessment?.overallRiskLevel)}`}>
              {getRiskIcon(riskAssessment?.overallRiskLevel)}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Risk Level</h3>
            <p className={`text-xl font-bold capitalize ${getRiskLevelColor(riskAssessment?.overallRiskLevel).split(' ')[0]}`}>
              {riskAssessment?.overallRiskLevel || 'Unknown'}
            </p>
          </div>
          
          {/* Risk Stratification */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Stratification</h3>
            <p className="text-lg font-medium text-blue-600">
              {riskAssessment?.riskStratification || 'Not determined'}
            </p>
          </div>
          
          {/* Total Risk Count */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Risks</h3>
            <p className="text-xl font-bold text-purple-600">
              {(riskAssessment?.patientSafetyRisks?.length || 0) + 
               (riskAssessment?.prescriptionQualityRisks?.length || 0) + 
               (riskAssessment?.clinicalRisks?.length || 0) + 
               (riskAssessment?.regulatoryLegalRisks?.length || 0)}
            </p>
          </div>
        </div>
        
        {/* Risk Summary */}
        {riskAssessment?.summary && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Risk Summary</h4>
            <p className="text-blue-800 dark:text-blue-400">{riskAssessment.summary}</p>
          </div>
        )}
      </div>

      {/* Risk Categories */}
      <div className="space-y-4">
        {/* Patient Safety Risks */}
        <RiskCategoryCard
          title="Patient Safety Risks"
          icon={<HeartIcon className="h-5 w-5" />}
          iconColor="text-red-600"
          risks={riskAssessment?.patientSafetyRisks || []}
          isExpanded={expandedRiskCategory === 'patient-safety'}
          onToggle={() => toggleRiskCategory('patient-safety')}
          description="Risks that could directly impact patient health and safety"
        />

        {/* Prescription Quality Risks */}
        <RiskCategoryCard
          title="Prescription Quality Risks"
          icon={<DocumentTextIcon className="h-5 w-5" />}
          iconColor="text-yellow-600"
          risks={riskAssessment?.prescriptionQualityRisks || []}
          isExpanded={expandedRiskCategory === 'prescription-quality'}
          onToggle={() => toggleRiskCategory('prescription-quality')}
          description="Issues with prescription clarity, completeness, or accuracy"
        />

        {/* Clinical Risks */}
        <RiskCategoryCard
          title="Clinical Risks"
          icon={<BugAntIcon className="h-5 w-5" />}
          iconColor="text-orange-600"
          risks={riskAssessment?.clinicalRisks || []}
          isExpanded={expandedRiskCategory === 'clinical'}
          onToggle={() => toggleRiskCategory('clinical')}
          description="Clinical considerations and therapeutic risks"
        />

        {/* Regulatory/Legal Risks */}
        <RiskCategoryCard
          title="Regulatory & Legal Risks"
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          iconColor="text-purple-600"
          risks={riskAssessment?.regulatoryLegalRisks || []}
          isExpanded={expandedRiskCategory === 'regulatory'}
          onToggle={() => toggleRiskCategory('regulatory')}
          description="Compliance and legal considerations"
        />
      </div>

      {/* Recommendations */}
      {riskAssessment?.recommendations && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Risk Mitigation Recommendations
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Immediate Safety Interventions */}
            {riskAssessment.recommendations.immediateSafetyInterventions?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-red-600 flex items-center">
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  Immediate Safety Interventions
                </h4>
                <ul className="space-y-2">
                  {riskAssessment.recommendations.immediateSafetyInterventions.map((intervention, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-900 dark:text-white text-sm">{intervention}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Enhanced Monitoring Protocols */}
            {riskAssessment.recommendations.enhancedMonitoringProtocols?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-yellow-600 flex items-center">
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Enhanced Monitoring Protocols
                </h4>
                <ul className="space-y-2">
                  {riskAssessment.recommendations.enhancedMonitoringProtocols.map((protocol, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-900 dark:text-white text-sm">{protocol}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Patient Counseling Priorities */}
            {riskAssessment.recommendations.patientCounselingPriorities?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-600 flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-2" />
                  Patient Counseling Priorities
                </h4>
                <ul className="space-y-2">
                  {riskAssessment.recommendations.patientCounselingPriorities.map((priority, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-900 dark:text-white text-sm">{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prescriber Consultations Needed */}
            {riskAssessment.recommendations.prescriberConsultationsNeeded?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600 flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Prescriber Consultations Needed
                </h4>
                <ul className="space-y-2">
                  {riskAssessment.recommendations.prescriberConsultationsNeeded.map((consultation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-900 dark:text-white text-sm">{consultation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Alternative Therapeutic Options */}
          {riskAssessment.recommendations.alternativeTherapeuticOptions?.length > 0 && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-purple-600 mb-3">Alternative Therapeutic Options</h4>
              <ul className="space-y-2">
                {riskAssessment.recommendations.alternativeTherapeuticOptions.map((option, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-900 dark:text-white text-sm">{option}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Drug Interactions */}
      {prescription?.aiProcessing?.drugInteractions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BugAntIcon className="h-5 w-5 mr-2 text-orange-600" />
            Drug Interactions Analysis
          </h3>
          
          <div className="space-y-4">
            {prescription.aiProcessing.drugInteractions.map((interaction, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getRiskLevelColor(interaction.severity)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {interaction.medications?.join(' + ') || 'Drug Interaction'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Type: {interaction.interactionType || 'Unknown'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(interaction.severity)}`}>
                    {(interaction.severity || 'unknown').toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Clinical Effect:</label>
                    <p className="text-gray-900 dark:text-white">{interaction.clinicalEffect || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Mechanism:</label>
                    <p className="text-gray-900 dark:text-white">{interaction.mechanism || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Management:</label>
                    <p className="text-gray-900 dark:text-white">{interaction.management || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Monitoring:</label>
                    <p className="text-gray-900 dark:text-white">{interaction.monitoring || 'Not specified'}</p>
                  </div>
                </div>
                
                {interaction.confidence && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Confidence: <span className="font-medium">{Math.round(interaction.confidence * 100)}%</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dosage Validations */}
      {prescription?.aiProcessing?.dosageValidations?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Dosage Validation Results
          </h3>
          
          <div className="space-y-4">
            {prescription.aiProcessing.dosageValidations.map((validation, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {validation.medication}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Prescribed: {validation.prescribedDose} | Standard: {validation.standardDose}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {validation.isAppropriate ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${validation.isAppropriate ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.isAppropriate ? 'Appropriate' : 'Needs Review'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Age Appropriate:</label>
                    <p className={`${validation.ageAppropriate ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.ageAppropriate ? 'Yes' : 'No'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Weight Appropriate:</label>
                    <p className={`${validation.weightAppropriate ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.weightAppropriate ? 'Yes' : 'No'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 dark:text-gray-300">Indication Appropriate:</label>
                    <p className={`${validation.indicationAppropriate ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.indicationAppropriate ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                
                {validation.warnings?.length > 0 && (
                  <div className="mb-3">
                    <label className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Warnings:</label>
                    <div className="flex flex-wrap gap-1">
                      {validation.warnings.map((warning, idx) => (
                        <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          ⚠️ {warning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {validation.clinicalNotes && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <label className="font-medium text-blue-800 dark:text-blue-300 block mb-1">Clinical Notes:</label>
                    <p className="text-blue-700 dark:text-blue-400 text-sm">{validation.clinicalNotes}</p>
                  </div>
                )}
                
                {validation.confidence && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Validation Confidence: <span className="font-medium">{Math.round(validation.confidence * 100)}%</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Risk Category Card Component
const RiskCategoryCard = ({ title, icon, iconColor, risks, isExpanded, onToggle, description }) => {
  const getRiskLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`${iconColor}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title} ({risks.length})
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
          {risks.length > 0 ? (
            <div className="space-y-3 mt-6">
              {risks.map((risk, index) => {
                // Handle both object and string formats
                const riskData = typeof risk === 'string' 
                  ? {
                      risk: risk.split('|')[0] || risk,
                      severity: risk.split('|')[1] || 'Unknown',
                      details: risk.split('|')[2] || '',
                      mitigation: risk.split('|')[3] || ''
                    }
                  : risk;

                return (
                  <div key={index} className={`p-4 rounded-lg border ${getRiskLevelColor(riskData.severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {riskData.risk || 'Risk Item'}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(riskData.severity)}`}>
                        {(riskData.severity || 'unknown').toUpperCase()}
                      </span>
                    </div>
                    
                    {riskData.details && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Details:</strong> {riskData.details}
                      </p>
                    )}
                    
                    {riskData.mitigation && (
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        <strong>Mitigation:</strong> {riskData.mitigation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Risks Identified</h4>
              <p className="text-gray-600 dark:text-gray-400">No risks were found in this category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Quality Metrics Tab Component
export const QualityMetricsTab = ({ prescription }) => {
  const getQualityColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityGrade = (score) => {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  };

  // Calculate quality metrics based on available data
  const calculateQualityMetrics = () => {
    const aiProcessing = prescription?.prescriptionStructuredData?.aiProcessing;
    const medications = prescription?.medications || [];
    const hasPatientInfo = prescription?.patient?.profile?.firstName;
    const hasDoctor = prescription?.prescriptionStructuredData?.doctor?.name;
    
    // Basic quality calculation based on data completeness
    let overallQuality = 0;
    let clarity = 0;
    let completeness = 0;
    let legibility = 0;
    
    // Calculate completeness based on available fields
    let completenessScore = 0;
    if (medications.length > 0) completenessScore += 0.3;
    if (hasPatientInfo) completenessScore += 0.3;
    if (hasDoctor) completenessScore += 0.2;
    if (prescription?.prescriptionStructuredData?.processingStatus === 'completed') completenessScore += 0.2;
    
    completeness = completenessScore;
    
    // Use AI confidence if available, otherwise estimate
    const aiConfidence = aiProcessing?.overallConfidence || 0.75;
    clarity = aiConfidence;
    legibility = aiConfidence;
    
    // Overall quality is average of metrics
    overallQuality = (completeness + clarity + legibility) / 3;
    
    return {
      overallQuality,
      clarity,
      completeness,
      legibility,
      ambiguousFields: [],
      missingFields: []
    };
  };

  const qualityMetrics = calculateQualityMetrics();
  
  // Calculate OCR-like data from available information
  const calculateOCRData = () => {
    const medications = prescription?.medications || [];
    const aiProcessing = prescription?.prescriptionStructuredData?.aiProcessing;
    
    return {
      confidence: aiProcessing?.overallConfidence || null,
      wordsFound: medications.length * 5, // Estimate words per medication
      linesFound: medications.length * 2, // Estimate lines per medication
      processingTime: prescription?.prescriptionStructuredData?.processingTime || 
                     (prescription?.updatedAt && prescription?.createdAt ? 
                      new Date(prescription.updatedAt) - new Date(prescription.createdAt) : null),
      rawText: medications.map(med => `${med.name || ''} ${med.dosage || ''} ${med.frequency || ''}`).join('\n') || null,
      enhancedText: medications.map(med => 
        `Medication: ${med.name || 'Unknown'}\nDosage: ${med.dosage || 'Not specified'}\nFrequency: ${med.frequency || 'Not specified'}`
      ).join('\n\n') || null
    };
  };

  const ocrData = calculateOCRData();

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <StarIcon className="h-6 w-6 mr-2 text-yellow-600" />
          Quality Metrics Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Quality */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${getQualityColor(qualityMetrics?.overallQuality || 0)}`}>
              <span className="text-2xl font-bold">
                {getQualityGrade(qualityMetrics?.overallQuality || 0)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Quality</h3>
            <p className={`text-xl font-bold ${getQualityColor(qualityMetrics?.overallQuality || 0).split(' ')[0]}`}>
              {qualityMetrics?.overallQuality ? `${Math.round(qualityMetrics.overallQuality * 100)}%` : 'N/A'}
            </p>
          </div>
          
          {/* Clarity */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${getQualityColor(qualityMetrics?.clarity || 0)}`}>
              <EyeIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clarity</h3>
            <p className={`text-xl font-bold ${getQualityColor(qualityMetrics?.clarity || 0).split(' ')[0]}`}>
              {qualityMetrics?.clarity ? `${Math.round(qualityMetrics.clarity * 100)}%` : 'N/A'}
            </p>
          </div>
          
          {/* Completeness */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${getQualityColor(qualityMetrics?.completeness || 0)}`}>
              <DocumentTextIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Completeness</h3>
            <p className={`text-xl font-bold ${getQualityColor(qualityMetrics?.completeness || 0).split(' ')[0]}`}>
              {qualityMetrics?.completeness ? `${Math.round(qualityMetrics.completeness * 100)}%` : 'N/A'}
            </p>
          </div>
          
          {/* Legibility */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${getQualityColor(qualityMetrics?.legibility || 0)}`}>
              <MagnifyingGlassIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Legibility</h3>
            <p className={`text-xl font-bold ${getQualityColor(qualityMetrics?.legibility || 0).split(' ')[0]}`}>
              {qualityMetrics?.legibility ? `${Math.round(qualityMetrics.legibility * 100)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Quality Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ambiguous Fields */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
            Ambiguous Fields
          </h3>
          
          {qualityMetrics?.ambiguousFields?.length > 0 ? (
            <div className="space-y-2">
              {qualityMetrics.ambiguousFields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-900 dark:text-white">{field}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600">No ambiguous fields detected</p>
            </div>
          )}
        </div>

        {/* Missing Fields */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 mr-2 text-red-600" />
            Missing Fields
          </h3>
          
          {qualityMetrics?.missingFields?.length > 0 ? (
            <div className="space-y-2">
              {qualityMetrics.missingFields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-900 dark:text-white">{field}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600">All fields are present</p>
            </div>
          )}
        </div>
      </div>

      {/* Warning Flags */}
      {qualityMetrics?.warningFlags?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-600" />
            Warning Flags
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualityMetrics.warningFlags.map((flag, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <span className="text-orange-800 dark:text-orange-300">{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Quality Analysis */}
      {ocrData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-blue-600" />
            OCR Quality Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">OCR Confidence</label>
              <p className={`text-2xl font-bold ${getQualityColor(ocrData.confidence || 0).split(' ')[0]}`}>
                {ocrData.confidence ? `${Math.round(ocrData.confidence * 100)}%` : 'N/A'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Words Found</label>
              <p className="text-2xl font-bold text-blue-600">
                {ocrData.wordsFound || 0}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Lines Found</label>
              <p className="text-2xl font-bold text-purple-600">
                {ocrData.linesFound || 0}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing Time</label>
              <p className="text-2xl font-bold text-green-600">
                {ocrData.processingTime ? `${ocrData.processingTime}ms` : 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Raw OCR Text</label>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                  {ocrData.rawText || 'Not available'}
                </pre>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Enhanced Text</label>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                  {ocrData.enhancedText || 'Not available'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-purple-600" />
          Processing Performance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Processing Time</label>
            <p className="text-2xl font-bold text-purple-600">
              {ocrData.processingTime ? `${(ocrData.processingTime / 1000).toFixed(1)}s` : 'N/A'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing Status</label>
            <p className="text-lg font-semibold text-green-600 capitalize">
              {prescription?.prescriptionStructuredData?.processingStatus || prescription?.status || 'Unknown'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Manual Review Required</label>
            <div className="flex items-center space-x-2">
              {prescription?.prescriptionStructuredData?.requiresManualReview || 
               prescription?.prescriptionStructuredData?.riskAssessment?.overallRiskLevel === 'high' ? (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">Yes</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">No</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default { RiskAssessmentTab, QualityMetricsTab };
