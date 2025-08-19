import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';

// Async thunks for profile operations
export const fetchDoctorProfile = createAsyncThunk(
  'doctorProfile/fetchProfile',
  async ({ doctorId, includeStats = false }, { rejectWithValue }) => {
    try {
      const id = typeof doctorId === 'object' ? (doctorId._id || doctorId.id) : doctorId;
      const response = await apiClient.get(`/doctors/${id}/profile/full`, {
        params: { includeStats }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateProfileSection = createAsyncThunk(
  'doctorProfile/updateSection',
  async ({ doctorId, section, data }, { rejectWithValue }) => {
    try {
      const id = typeof doctorId === 'object' ? (doctorId._id || doctorId.id) : doctorId;
      const response = await apiClient.put(`/doctors/${id}/profile/section`, {
        section,
        data
      });
      return { section, data: response.data, syncInfo: response.data.syncInfo };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const rollbackProfileUpdate = createAsyncThunk(
  'doctorProfile/rollback',
  async ({ doctorId, operationId }, { rejectWithValue }) => {
    try {
      const id = typeof doctorId === 'object' ? (doctorId._id || doctorId.id) : doctorId;
      const response = await apiClient.post(`/doctors/${id}/profile/rollback`, {
        operationId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProfileChangeHistory = createAsyncThunk(
  'doctorProfile/fetchChangeHistory',
  async ({ doctorId, limit = 10 }, { rejectWithValue }) => {
    try {
      const id = typeof doctorId === 'object' ? (doctorId._id || doctorId.id) : doctorId;
      const response = await apiClient.get(`/doctors/${id}/profile/changes`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  // Profile data
  profiles: {}, // doctorId -> profile data
  
  // Loading states
  loading: {
    fetch: false,
    update: false,
    rollback: false,
    changeHistory: false
  },
  
  // Error states
  errors: {
    fetch: null,
    update: null,
    rollback: null,
    changeHistory: null
  },
  
  // Optimistic update tracking
  optimisticUpdates: {}, // doctorId -> { section -> { data, timestamp, operationId } }
  
  // Sync information
  syncInfo: {}, // doctorId -> { lastOperationId, rollbackAvailable, pendingOperations }
  
  // Change history
  changeHistory: {}, // doctorId -> array of changes
  
  // UI state
  ui: {
    activeSection: null,
    unsavedChanges: {}, // doctorId -> { section -> boolean }
    validationErrors: {} // doctorId -> { section -> errors }
  }
};

const doctorProfileSlice = createSlice({
  name: 'doctorProfile',
  initialState,
  reducers: {
    // Optimistic update actions
    optimisticUpdate: (state, action) => {
      const { doctorId, section, data, operationId } = action.payload;
      
      if (!state.optimisticUpdates[doctorId]) {
        state.optimisticUpdates[doctorId] = {};
      }
      
      state.optimisticUpdates[doctorId][section] = {
        data,
        timestamp: new Date().toISOString(),
        operationId,
        isOptimistic: true
      };
      
      // Apply optimistic update to profile data
      if (state.profiles[doctorId]) {
        state.profiles[doctorId][section] = data;
        state.profiles[doctorId].lastUpdated = new Date().toISOString();
        state.profiles[doctorId].hasOptimisticUpdates = true;
      }
    },
    
    confirmOptimisticUpdate: (state, action) => {
      const { doctorId, section, data, operationId } = action.payload;
      
      // Remove from optimistic updates
      if (state.optimisticUpdates[doctorId]?.[section]) {
        delete state.optimisticUpdates[doctorId][section];
        
        // Clean up empty optimistic updates object
        if (Object.keys(state.optimisticUpdates[doctorId]).length === 0) {
          delete state.optimisticUpdates[doctorId];
        }
      }
      
      // Update profile data with confirmed data
      if (state.profiles[doctorId]) {
        state.profiles[doctorId][section] = data;
        state.profiles[doctorId].lastUpdated = new Date().toISOString();
        
        // Check if there are any remaining optimistic updates
        const hasOptimisticUpdates = state.optimisticUpdates[doctorId] && 
          Object.keys(state.optimisticUpdates[doctorId]).length > 0;
        state.profiles[doctorId].hasOptimisticUpdates = hasOptimisticUpdates;
      }
      
      // Update sync info
      if (!state.syncInfo[doctorId]) {
        state.syncInfo[doctorId] = {};
      }
      state.syncInfo[doctorId].lastOperationId = operationId;
    },
    
    rollbackOptimisticUpdate: (state, action) => {
      const { doctorId, section, originalData } = action.payload;
      
      // Remove from optimistic updates
      if (state.optimisticUpdates[doctorId]?.[section]) {
        delete state.optimisticUpdates[doctorId][section];
        
        // Clean up empty optimistic updates object
        if (Object.keys(state.optimisticUpdates[doctorId]).length === 0) {
          delete state.optimisticUpdates[doctorId];
        }
      }
      
      // Restore original data
      if (state.profiles[doctorId] && originalData !== undefined) {
        state.profiles[doctorId][section] = originalData;
        state.profiles[doctorId].lastUpdated = new Date().toISOString();
        
        // Check if there are any remaining optimistic updates
        const hasOptimisticUpdates = state.optimisticUpdates[doctorId] && 
          Object.keys(state.optimisticUpdates[doctorId]).length > 0;
        state.profiles[doctorId].hasOptimisticUpdates = hasOptimisticUpdates;
      }
    },
    
    // UI state actions
    setActiveSection: (state, action) => {
      const { section } = action.payload;
      state.ui.activeSection = section;
    },
    
    setUnsavedChanges: (state, action) => {
      const { doctorId, section, hasChanges } = action.payload;
      
      if (!state.ui.unsavedChanges[doctorId]) {
        state.ui.unsavedChanges[doctorId] = {};
      }
      
      if (hasChanges) {
        state.ui.unsavedChanges[doctorId][section] = true;
      } else {
        delete state.ui.unsavedChanges[doctorId][section];
        
        // Clean up empty unsaved changes object
        if (Object.keys(state.ui.unsavedChanges[doctorId]).length === 0) {
          delete state.ui.unsavedChanges[doctorId];
        }
      }
    },
    
    setValidationErrors: (state, action) => {
      const { doctorId, section, errors } = action.payload;
      
      if (!state.ui.validationErrors[doctorId]) {
        state.ui.validationErrors[doctorId] = {};
      }
      
      if (errors && errors.length > 0) {
        state.ui.validationErrors[doctorId][section] = errors;
      } else {
        delete state.ui.validationErrors[doctorId][section];
        
        // Clean up empty validation errors object
        if (Object.keys(state.ui.validationErrors[doctorId]).length === 0) {
          delete state.ui.validationErrors[doctorId];
        }
      }
    },
    
    clearErrors: (state, action) => {
      const { errorType } = action.payload;
      if (errorType && state.errors[errorType]) {
        state.errors[errorType] = null;
      } else {
        // Clear all errors
        Object.keys(state.errors).forEach(key => {
          state.errors[key] = null;
        });
      }
    },
    
    // Sync info actions
    updateSyncInfo: (state, action) => {
      const { doctorId, syncInfo } = action.payload;
      
      if (!state.syncInfo[doctorId]) {
        state.syncInfo[doctorId] = {};
      }
      
      state.syncInfo[doctorId] = {
        ...state.syncInfo[doctorId],
        ...syncInfo
      };
    }
  },
  
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchDoctorProfile.pending, (state) => {
        state.loading.fetch = true;
        state.errors.fetch = null;
      })
      .addCase(fetchDoctorProfile.fulfilled, (state, action) => {
        state.loading.fetch = false;
        const profile = action.payload;
        state.profiles[profile._id] = {
          ...profile,
          lastFetched: new Date().toISOString(),
          hasOptimisticUpdates: false
        };
      })
      .addCase(fetchDoctorProfile.rejected, (state, action) => {
        state.loading.fetch = false;
        state.errors.fetch = action.payload;
      });
    
    // Update profile section
    builder
      .addCase(updateProfileSection.pending, (state) => {
        state.loading.update = true;
        state.errors.update = null;
      })
      .addCase(updateProfileSection.fulfilled, (state, action) => {
        state.loading.update = false;
        const { section, data, syncInfo } = action.payload;
        
        // This will be handled by confirmOptimisticUpdate action
        // when using optimistic updates
      })
      .addCase(updateProfileSection.rejected, (state, action) => {
        state.loading.update = false;
        state.errors.update = action.payload;
      });
    
    // Rollback update
    builder
      .addCase(rollbackProfileUpdate.pending, (state) => {
        state.loading.rollback = true;
        state.errors.rollback = null;
      })
      .addCase(rollbackProfileUpdate.fulfilled, (state, action) => {
        state.loading.rollback = false;
        // Profile will be refreshed after successful rollback
      })
      .addCase(rollbackProfileUpdate.rejected, (state, action) => {
        state.loading.rollback = false;
        state.errors.rollback = action.payload;
      });
    
    // Fetch change history
    builder
      .addCase(fetchProfileChangeHistory.pending, (state) => {
        state.loading.changeHistory = true;
        state.errors.changeHistory = null;
      })
      .addCase(fetchProfileChangeHistory.fulfilled, (state, action) => {
        state.loading.changeHistory = false;
        const changes = action.payload;
        if (changes.length > 0) {
          const doctorId = changes[0].doctorId;
          state.changeHistory[doctorId] = changes;
        }
      })
      .addCase(fetchProfileChangeHistory.rejected, (state, action) => {
        state.loading.changeHistory = false;
        state.errors.changeHistory = action.payload;
      });
  }
});

// Export actions
export const {
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  setActiveSection,
  setUnsavedChanges,
  setValidationErrors,
  clearErrors,
  updateSyncInfo
} = doctorProfileSlice.actions;

// Selectors
export const selectDoctorProfile = (state, doctorId) => 
  state.doctorProfile.profiles[doctorId];

export const selectProfileLoading = (state, loadingType = 'fetch') => 
  state.doctorProfile.loading[loadingType];

export const selectProfileError = (state, errorType = 'fetch') => 
  state.doctorProfile.errors[errorType];

export const selectOptimisticUpdates = (state, doctorId) => 
  state.doctorProfile.optimisticUpdates[doctorId] || {};

export const selectHasOptimisticUpdates = (state, doctorId) => 
  state.doctorProfile.profiles[doctorId]?.hasOptimisticUpdates || false;

export const selectSyncInfo = (state, doctorId) => 
  state.doctorProfile.syncInfo[doctorId] || {};

export const selectChangeHistory = (state, doctorId) => 
  state.doctorProfile.changeHistory[doctorId] || [];

export const selectActiveSection = (state) => 
  state.doctorProfile.ui.activeSection;

export const selectUnsavedChanges = (state, doctorId) => 
  state.doctorProfile.ui.unsavedChanges[doctorId] || {};

export const selectValidationErrors = (state, doctorId) => 
  state.doctorProfile.ui.validationErrors[doctorId] || {};

export const selectHasUnsavedChanges = (state, doctorId, section = null) => {
  const unsavedChanges = state.doctorProfile.ui.unsavedChanges[doctorId] || {};
  if (section) {
    return !!unsavedChanges[section];
  }
  return Object.keys(unsavedChanges).length > 0;
};

export default doctorProfileSlice.reducer;