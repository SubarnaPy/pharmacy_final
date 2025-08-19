import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

/**
 * ValidationDisplay - Component for showing validation errors, warnings, and guidance
 */
const ValidationDisplay = ({
  status,
  message,
  guidance,
  showGuidance = true,
  className = '',
  onDismiss = null,
  compact = false
}) => {
  if (!status || (!message && !guidance)) return null;

  const getStatusConfig = () => {
    switch (status.type) {
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500'
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-sm ${config.textColor} ${className}`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span>{message || status.message}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-md border ${config.bgColor} ${config.borderColor} p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          {(message || status.message) && (
            <p className={`text-sm font-medium ${config.textColor} mb-1`}>
              {message || status.message}
            </p>
          )}
          
          {showGuidance && guidance && (
            <p className={`text-sm ${config.textColor} opacity-80`}>
              {guidance}
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${config.textColor} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ValidationSummary - Component for showing overall validation status
 */
export const ValidationSummary = ({
  summary,
  errors = {},
  warnings = {},
  className = '',
  showDetails = false,
  onErrorClick = null
}) => {
  if (!summary) return null;

  const hasIssues = summary.hasErrors || summary.hasWarnings;
  
  if (!hasIssues && !showDetails) return null;

  const getStatusType = () => {
    if (summary.hasErrors) return 'error';
    if (summary.hasWarnings) return 'warning';
    return 'success';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <ValidationDisplay
        status={{ type: getStatusType() }}
        message={summary.summary}
        showGuidance={false}
      />

      {showDetails && (summary.hasErrors || summary.hasWarnings) && (
        <div className="space-y-2">
          {/* Error Details */}
          {summary.hasErrors && Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Errors that need to be fixed:
              </h4>
              <ul className="space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-sm text-red-700">
                    <button
                      onClick={() => onErrorClick?.(field)}
                      className="hover:underline text-left"
                    >
                      <strong>{field}:</strong> {error}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Details */}
          {summary.hasWarnings && Object.keys(warnings).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Warnings to review:
              </h4>
              <ul className="space-y-1">
                {Object.entries(warnings).map(([field, warning]) => (
                  <li key={field} className="text-sm text-yellow-700">
                    <strong>{field}:</strong> {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * FieldValidation - Component for inline field validation display
 */
export const FieldValidation = ({
  field,
  status,
  guidance,
  showGuidance = true,
  className = ''
}) => {
  if (!status || status.type === 'success') return null;

  return (
    <div className={`mt-1 ${className}`}>
      <ValidationDisplay
        status={status}
        message={status.message}
        guidance={showGuidance ? guidance : null}
        compact={true}
        showGuidance={showGuidance}
      />
    </div>
  );
};

/**
 * BusinessRuleValidation - Component for business rule validation messages
 */
export const BusinessRuleValidation = ({
  businessErrors = {},
  businessWarnings = {},
  className = ''
}) => {
  const hasBusinessIssues = Object.keys(businessErrors).length > 0 || Object.keys(businessWarnings).length > 0;
  
  if (!hasBusinessIssues) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">Business Rules Validation</h3>
      
      {/* Business Errors */}
      {Object.keys(businessErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h4 className="text-sm font-medium text-red-800">
              Critical Issues (Profile cannot be activated)
            </h4>
          </div>
          <ul className="space-y-2">
            {Object.entries(businessErrors).map(([key, error]) => (
              <li key={key} className="text-sm text-red-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Business Warnings */}
      {Object.keys(businessWarnings).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h4 className="text-sm font-medium text-yellow-800">
              Recommendations for Improvement
            </h4>
          </div>
          <ul className="space-y-2">
            {Object.entries(businessWarnings).map(([key, warning]) => (
              <li key={key} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValidationDisplay;