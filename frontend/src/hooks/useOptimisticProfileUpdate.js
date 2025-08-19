import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import apiClient from '../api/apiClient';

/**
 * Hook for optimistic profile updates with rollback capability
 * @param {string} doctorId - Doctor's ID
 * @returns {Object} - Update functions and state
 */
export const useOptimisticProfileUpdate = (doctorId) => {
  const dispatch = useDispatch();
  const [updateState, setUpdateState] = useState({
    isUpdating: false,
    lastOperationId: null,
    rollbackAvailable: false,
    error: null,
    pendingUpdates: new Map() // section -> pending update data
  });

  /**
   * Perform optimistic update
   * @param {string} section - Profile section to update
   * @param {Object} newData - New data for the section
   * @param {Object} currentData - Current data for rollback
   * @returns {Promise<Object>} - Update result
   */
  const performOptimisticUpdate = useCallback(async (section, newData, currentData) => {
    try {
      setUpdateState(prev => ({
        ...prev,
        isUpdating: true,
        error: null,
        pendingUpdates: new Map(prev.pendingUpdates).set(section, {
          newData,
          currentData,
          timestamp: new Date()
        })
      }));

      // Apply optimistic update to Redux store immediately
      dispatch({
        type: 'DOCTOR_PROFILE_OPTIMISTIC_UPDATE',
        payload: {
          doctorId,
          section,
          data: newData,
          isOptimistic: true
        }
      });

      // Send update to server
      const response = await apiClient.put(`/doctors/${doctorId}/profile/section`, {
        section,
        data: newData
      });

      const { operationId, rollbackAvailable, success } = response.data.syncInfo || {};

      if (success) {
        // Update succeeded, confirm the optimistic update
        dispatch({
          type: 'DOCTOR_PROFILE_UPDATE_CONFIRMED',
          payload: {
            doctorId,
            section,
            data: response.data,
            operationId,
            isOptimistic: false
          }
        });

        setUpdateState(prev => {
          const newPendingUpdates = new Map(prev.pendingUpdates);
          newPendingUpdates.delete(section);
          
          return {
            ...prev,
            isUpdating: false,
            lastOperationId: operationId,
            rollbackAvailable,
            pendingUpdates: newPendingUpdates
          };
        });

        return {
          success: true,
          data: response.data,
          operationId,
          rollbackAvailable
        };
      } else {
        throw new Error('Update failed on server');
      }

    } catch (error) {
      console.error('Optimistic update failed:', error);

      // Rollback the optimistic update
      dispatch({
        type: 'DOCTOR_PROFILE_ROLLBACK_UPDATE',
        payload: {
          doctorId,
          section,
          data: currentData
        }
      });

      setUpdateState(prev => {
        const newPendingUpdates = new Map(prev.pendingUpdates);
        newPendingUpdates.delete(section);
        
        return {
          ...prev,
          isUpdating: false,
          error: error.message,
          pendingUpdates: newPendingUpdates
        };
      });

      return {
        success: false,
        error: error.message,
        rolledBack: true
      };
    }
  }, [doctorId, dispatch]);

  /**
   * Manually rollback an update using operation ID
   * @param {string} operationId - Operation ID to rollback
   * @returns {Promise<boolean>} - Rollback success
   */
  const rollbackUpdate = useCallback(async (operationId) => {
    try {
      setUpdateState(prev => ({
        ...prev,
        isUpdating: true,
        error: null
      }));

      const response = await apiClient.post(`/doctors/${doctorId}/profile/rollback`, {
        operationId
      });

      if (response.data.success) {
        // Refresh the profile data from server
        dispatch({
          type: 'DOCTOR_PROFILE_REFRESH_REQUESTED',
          payload: { doctorId }
        });

        setUpdateState(prev => ({
          ...prev,
          isUpdating: false,
          rollbackAvailable: false,
          lastOperationId: null
        }));

        return true;
      } else {
        throw new Error('Rollback failed on server');
      }

    } catch (error) {
      console.error('Rollback failed:', error);
      
      setUpdateState(prev => ({
        ...prev,
        isUpdating: false,
        error: error.message
      }));

      return false;
    }
  }, [doctorId, dispatch]);

  /**
   * Check if a section has pending updates
   * @param {string} section - Section to check
   * @returns {boolean} - Whether section has pending updates
   */
  const hasPendingUpdate = useCallback((section) => {
    return updateState.pendingUpdates.has(section);
  }, [updateState.pendingUpdates]);

  /**
   * Get pending update data for a section
   * @param {string} section - Section to get data for
   * @returns {Object|null} - Pending update data or null
   */
  const getPendingUpdate = useCallback((section) => {
    return updateState.pendingUpdates.get(section) || null;
  }, [updateState.pendingUpdates]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setUpdateState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Batch update multiple sections
   * @param {Array} updates - Array of {section, newData, currentData} objects
   * @returns {Promise<Array>} - Array of update results
   */
  const performBatchOptimisticUpdate = useCallback(async (updates) => {
    const results = [];
    
    for (const update of updates) {
      const result = await performOptimisticUpdate(
        update.section,
        update.newData,
        update.currentData
      );
      results.push({ ...result, section: update.section });
    }

    return results;
  }, [performOptimisticUpdate]);

  /**
   * Get update statistics
   * @returns {Object} - Update statistics
   */
  const getUpdateStats = useCallback(() => {
    return {
      pendingUpdatesCount: updateState.pendingUpdates.size,
      isUpdating: updateState.isUpdating,
      hasError: !!updateState.error,
      rollbackAvailable: updateState.rollbackAvailable,
      lastOperationId: updateState.lastOperationId
    };
  }, [updateState]);

  return {
    // Update functions
    performOptimisticUpdate,
    rollbackUpdate,
    performBatchOptimisticUpdate,
    
    // State queries
    hasPendingUpdate,
    getPendingUpdate,
    getUpdateStats,
    
    // State management
    clearError,
    
    // Current state
    isUpdating: updateState.isUpdating,
    error: updateState.error,
    rollbackAvailable: updateState.rollbackAvailable,
    lastOperationId: updateState.lastOperationId,
    pendingUpdatesCount: updateState.pendingUpdates.size
  };
};

export default useOptimisticProfileUpdate;