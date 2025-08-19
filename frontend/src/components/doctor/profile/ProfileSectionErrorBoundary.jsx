import React from 'react';
import ErrorBoundary from '../../common/ErrorBoundary.jsx';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ProfileSectionErrorBoundary = ({ children, sectionName, onRetry, onReset }) => {
  const handleError = (error, errorInfo) => {
    // Log profile section specific errors
    console.error(`Error in ${sectionName} section:`, error, errorInfo);
    
    // You could send this to an error reporting service
    // errorReportingService.captureException(error, {
    //   tags: { section: sectionName, component: 'ProfileSection' },
    //   extra: errorInfo
    // });
  };

  const fallbackRenderer = (error, retry) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Error in {sectionName}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This section couldn't load properly. You can try refreshing it or continue with other sections.
        </p>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry Section
          </button>
          
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset Section
            </button>
          )}
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Other profile sections should continue to work normally.
        </p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      title={`Error in ${sectionName}`}
      message="This profile section encountered an error."
      fallback={fallbackRenderer}
      onError={handleError}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ProfileSectionErrorBoundary;