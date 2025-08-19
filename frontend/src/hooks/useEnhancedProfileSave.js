import { useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useRetryOperation from './useRetryOperation.js';
import useOfflineState from './useOfflineState.js';
import notificationService from '../services/notificationService.js';
import { setUnsavedChanges } from '../store/doctorProfileSlice.js';
import useDoctorProfile from './useDoctorProfile.js';

const useEnhancedProfileSave = (doctorId, sectionName) => {
  const dispatch = useDispatch();
  const { updateProfileSection } = useDoctorProfile(doctorId);
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveAttempt, setLastSaveAttempt] = useState(null);
  const [saveHistory, setSaveHistory] = useState([]);
  const saveTimeoutRef = useRef(null);

  // Retry mechanism for save operations
  const { executeWithRetry, isRetrying, retryCount } = useRetryOperation({
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 1.5,
    showNotifications: false, // We'll handle notifications manually
    onMaxRetriesReached: (error, attempts) => {
      console.error(`Failed to save ${sectionName} after ${attempts} attempts:`, error);
      notificationService.error(
        `Failed to save ${sectionName} after multiple attempts. Please check your connection and try again.`,
        {
          onRetry: () => retrySave(),
          autoClose: false
        }
      );
    }
  });

  // Offline state handling
  const { executeWithOfflineHandling, isOnline, queuedOperations } = useOfflineState({
    showNotifications: true,
    onOnline: () => {
      // Process any queued saves when coming back online
      if (queuedOperations.length > 0) {
        notificationService.info(`Processing ${queuedOperations.length} queued changes...`);
      }
    }
  });

  // Save operation with comprehensive error handling
  const saveSection = useCallback(async (sectionData, options = {}) => {
    const {
      showSuccessNotification = true,
      showErrorNotification = true,
      optimistic = true,
      priority = 1
    } = options;

    setIsSaving(true);
    setLastSaveAttempt(Date.now());

    const saveOperation = async () => {
      try {
        const result = await updateProfileSection(sectionName, sectionData);
        
        // Record successful save
        setSaveHistory(prev => [...prev.slice(-9), {
          timestamp: Date.now(),
          success: true,
          data: sectionData,
          retryCount: retryCount
        }]);

        // Clear unsaved changes flag
        dispatch(setUnsavedChanges({ 
          doctorId, 
          section: sectionName, 
          hasChanges: false 
        }));

        if (showSuccessNotification) {
          notificationService.profileSaved(sectionName);
        }

        return result;
      } catch (error) {
        // Record failed save
        setSaveHistory(prev => [...prev.slice(-9), {
          timestamp: Date.now(),
          success: false,
          error: error.message,
          data: sectionData,
          retryCount: retryCount
        }]);

        throw error;
      }
    };

    try {
      let result;
      
      if (isOnline) {
        // Try with retry mechanism when online
        result = await executeWithRetry(saveOperation, `${sectionName} save`);
      } else {
        // Queue for offline processing
        result = await executeWithOfflineHandling(
          saveOperation, 
          `${sectionName} save`,
          priority
        );
      }

      return result;
    } catch (error) {
      if (showErrorNotification && !error.message.includes('queued')) {
        notificationService.profileSaveError(sectionName, error, () => retrySave(sectionData, options));
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [
    updateProfileSection, 
    sectionName, 
    retryCount, 
    doctorId, 
    dispatch, 
    executeWithRetry, 
    executeWithOfflineHandling, 
    isOnline
  ]);

  // Debounced save for auto-save functionality
  const debouncedSave = useCallback((sectionData, delay = 2000, options = {}) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSection(sectionData, {
        ...options,
        showSuccessNotification: false // Don't show notifications for auto-saves
      }).catch(error => {
        console.error('Auto-save failed:', error);
        // Auto-save failures are less intrusive
        if (!error.message.includes('queued')) {
          notificationService.warning(`Auto-save failed for ${sectionName}. Changes are preserved.`);
        }
      });
    }, delay);
  }, [saveSection, sectionName]);

  // Manual retry function
  const retrySave = useCallback((sectionData, options = {}) => {
    if (!sectionData && saveHistory.length > 0) {
      // Use the last attempted save data
      const lastAttempt = saveHistory[saveHistory.length - 1];
      sectionData = lastAttempt.data;
    }

    if (sectionData) {
      return saveSection(sectionData, options);
    } else {
      notificationService.error('No data to retry. Please make your changes again.');
      return Promise.reject(new Error('No data to retry'));
    }
  }, [saveSection, saveHistory]);

  // Batch save multiple sections
  const batchSave = useCallback(async (sectionsData, options = {}) => {
    const { showProgressNotifications = true } = options;
    const results = [];
    const errors = [];

    if (showProgressNotifications) {
      notificationService.info(`Saving ${Object.keys(sectionsData).length} sections...`);
    }

    for (const [section, data] of Object.entries(sectionsData)) {
      try {
        const result = await saveSection(data, {
          ...options,
          showSuccessNotification: false,
          showErrorNotification: false
        });
        results.push({ section, success: true, result });
      } catch (error) {
        errors.push({ section, error });
        results.push({ section, success: false, error });
      }
    }

    // Show batch results
    const successCount = results.filter(r => r.success).length;
    const errorCount = errors.length;

    if (successCount > 0) {
      notificationService.batchSuccess('Profile save', successCount);
    }

    if (errorCount > 0) {
      notificationService.batchError('Profile save', errorCount, results.length, () => {
        const failedSections = errors.reduce((acc, { section }) => {
          acc[section] = sectionsData[section];
          return acc;
        }, {});
        return batchSave(failedSections, options);
      });
    }

    return results;
  }, [saveSection]);

  // Cancel pending saves
  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Get save status information
  const getSaveStatus = useCallback(() => {
    const recentSaves = saveHistory.slice(-5);
    const lastSave = recentSaves[recentSaves.length - 1];
    const successRate = recentSaves.length > 0 
      ? (recentSaves.filter(s => s.success).length / recentSaves.length) * 100 
      : 100;

    return {
      isSaving: isSaving || isRetrying,
      isRetrying,
      retryCount,
      lastSaveAttempt,
      lastSave,
      saveHistory: recentSaves,
      successRate,
      isOnline,
      queuedSaves: queuedOperations.filter(op => op.operationName.includes(sectionName)).length
    };
  }, [isSaving, isRetrying, retryCount, lastSaveAttempt, saveHistory, isOnline, queuedOperations, sectionName]);

  return {
    saveSection,
    debouncedSave,
    retrySave,
    batchSave,
    cancelPendingSave,
    getSaveStatus,
    // Status flags
    isSaving: isSaving || isRetrying,
    isRetrying,
    retryCount,
    isOnline,
    // History and debugging
    saveHistory,
    lastSaveAttempt
  };
};

export default useEnhancedProfileSave;