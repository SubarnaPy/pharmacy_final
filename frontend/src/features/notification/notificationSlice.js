import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchNotificationsAPI, markNotificationReadAPI, markAllNotificationsReadAPI, updateNotificationPreferencesAPI, getNotificationPreferencesAPI } from './notificationAPI';

// Thunk to fetch notifications with advanced filtering
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async (options = {}, { rejectWithValue }) => {
    try {
      const response = await fetchNotificationsAPI(options);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Thunk to mark a notification as read
export const markNotificationRead = createAsyncThunk(
  'notification/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await markNotificationReadAPI(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Thunk to mark all notifications as read
export const markAllNotificationsRead = createAsyncThunk(
  'notification/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await markAllNotificationsReadAPI();
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Thunk to fetch notification preferences
export const fetchNotificationPreferences = createAsyncThunk(
  'notification/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getNotificationPreferencesAPI();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Thunk to update notification preferences
export const updateNotificationPreferences = createAsyncThunk(
  'notification/updatePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await updateNotificationPreferencesAPI(preferences);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    list: [],
    unreadCount: 0,
    preferences: null,
    status: 'idle',
    preferencesStatus: 'idle',
    error: null,
    preferencesError: null,
    connectionStatus: 'disconnected',
    lastFetch: null
  },
  reducers: {
    // Real-time notification received
    notificationReceived: (state, action) => {
      const notification = action.payload;
      // Add to beginning of list if not already present
      const exists = state.list.find(n => n.id === notification.id);
      if (!exists) {
        state.list.unshift(notification);
        if (!notification.readAt) {
          state.unreadCount += 1;
        }
      }
    },
    
    // Real-time notification read
    notificationReadReceived: (state, action) => {
      const { notificationId } = action.payload;
      const notification = state.list.find(n => n.id === notificationId);
      if (notification && !notification.readAt) {
        notification.readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    // All notifications marked as read
    allNotificationsReadReceived: (state) => {
      state.list.forEach(notification => {
        if (!notification.readAt) {
          notification.readAt = new Date().toISOString();
        }
      });
      state.unreadCount = 0;
    },
    
    // Update connection status
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Clear preferences error
    clearPreferencesError: (state) => {
      state.preferencesError = null;
    },
    
    // Update unread count
    updateUnreadCount: (state) => {
      state.unreadCount = state.list.filter(n => !n.readAt).length;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.notifications || action.payload;
        state.unreadCount = (action.payload.notifications || action.payload).filter(n => !n.readAt).length;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Mark notification as read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const notification = state.list.find((n) => n.id === id);
        if (notification && !notification.readAt) {
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      
      // Mark all notifications as read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.list.forEach(notification => {
          if (!notification.readAt) {
            notification.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      
      // Fetch preferences
      .addCase(fetchNotificationPreferences.pending, (state) => {
        state.preferencesStatus = 'loading';
        state.preferencesError = null;
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesStatus = 'succeeded';
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.preferencesStatus = 'failed';
        state.preferencesError = action.payload;
      })
      
      // Update preferences
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.preferencesStatus = 'loading';
        state.preferencesError = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesStatus = 'succeeded';
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.preferencesStatus = 'failed';
        state.preferencesError = action.payload;
      });
  }
});

export const {
  notificationReceived,
  notificationReadReceived,
  allNotificationsReadReceived,
  setConnectionStatus,
  clearError,
  clearPreferencesError,
  updateUnreadCount
} = notificationSlice.actions;

export default notificationSlice.reducer;
