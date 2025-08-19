import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectHasUnsavedChanges } from '../store/doctorProfileSlice';

/**
 * Hook to handle unsaved changes warnings when navigating away from the page
 * @param {string} doctorId - The doctor ID to check for unsaved changes
 * @param {boolean} enabled - Whether the warning should be enabled
 */
const useUnsavedChangesWarning = (doctorId, enabled = true) => {
  const hasUnsavedChanges = useSelector(state => selectHasUnsavedChanges(state, doctorId));

  // Handle browser navigation (back button, refresh, etc.)
  const handleBeforeUnload = useCallback((event) => {
    if (enabled && hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
  }, [enabled, hasUnsavedChanges]);

  // Handle React Router navigation
  const handleNavigation = useCallback((location, action) => {
    if (enabled && hasUnsavedChanges) {
      return 'You have unsaved changes. Are you sure you want to leave?';
    }
  }, [enabled, hasUnsavedChanges]);

  useEffect(() => {
    if (enabled) {
      // Add beforeunload listener for browser navigation
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [enabled, handleBeforeUnload]);

  return {
    hasUnsavedChanges,
    handleNavigation
  };
};

export default useUnsavedChangesWarning;