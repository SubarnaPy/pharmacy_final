import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/index.js';
import authUtils from '../../utils/authUtils.js';

export const login = createAsyncThunk('auth/login', async (credentials, thunkAPI) => {
  try {
    const response = await authAPI.login(credentials);
    
    // Handle 2FA requirement
    if (response.requiresTwoFactor) {
      return thunkAPI.fulfillWithValue({ 
        requiresTwoFactor: true, 
        twoFactorToken: response.twoFactorToken, 
        method: response.method,
        pendingCredentials: credentials // Store for 2FA retry
      });
    }
    console.log(response);
    
    // Extract data from backend response
    const { user, accessToken, refreshToken } = response.data;
    
    // Store token and user data using utility
    authUtils.setAuth(user, accessToken, refreshToken);
    
    return { user };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    const response = await authAPI.register(userData);
    
    // Don't automatically log in - user needs to verify email first
    return { 
      message: response.message,
      emailSent: true,
      email: userData.email 
    };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const verify2FA = createAsyncThunk('auth/verify2FA', async ({ twoFactorCode }, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const pendingCredentials = state.auth.pendingCredentials;
    
    if (!pendingCredentials) {
      return thunkAPI.rejectWithValue('No pending credentials found');
    }
    
    // Retry login with 2FA code
    const response = await authAPI.verify2FA({ 
      twoFactorCode, 
      email: pendingCredentials.email, 
      password: pendingCredentials.password 
    });
    
    const { user, accessToken, refreshToken } = response.data;
    
    authUtils.setAuth(user, accessToken, refreshToken);
    
    return user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Check if user is authenticated on app load
// Check if user is authenticated on app load
export const checkAuthStatus = createAsyncThunk('auth/checkAuthStatus', async (_, thunkAPI) => {
  try {
    const token = authUtils.getToken();
    if (!token) {
      return thunkAPI.rejectWithValue('No token found');
    }

    // Check if token is expired before making API call
    if (authUtils.isTokenExpired(token)) {
      console.log('Token is expired, clearing auth data');
      authUtils.clearAuth();
      return thunkAPI.rejectWithValue('Token expired');
    }

    // Try to validate token with backend and get current user data
    try {
      const response = await authAPI.getMe();
      console.log("User data from backend:", response);
      const user = response.data.user;
      authUtils.setAuth(user, token, authUtils.getRefreshToken());
      return { user };
    } catch (error) {
      console.warn('Backend validation failed:', error.message);
      // If backend /auth/me fails, clear auth data and require login
      authUtils.clearAuth();
      return thunkAPI.rejectWithValue('Session invalid, please login again');
    }
  } catch (error) {
    console.error('Auth check error:', error);
    authUtils.clearAuth();
    return thunkAPI.rejectWithValue(error?.message || 'Authentication check failed');
  }
});


// Logout user
export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
  try {
    // Call backend logout endpoint
    await authAPI.logout();
  } catch (error) {
    // Even if backend call fails, we still want to clear local auth state
    console.warn('Backend logout failed:', error.message);
  } finally {
    // Always clear local storage using utility
    authUtils.clearAuth();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { 
    user: null, 
    status: 'idle', 
    error: null, 
    requires2FA: false, 
    twoFactorToken: null, 
    method: null,
    isAuthenticated: false,
    pendingCredentials: null, // Store credentials for 2FA retry
    registrationSuccess: false,
    registrationMessage: null
  },
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
      state.requires2FA = false;
      state.twoFactorToken = null;
      state.method = null;
      state.isAuthenticated = false;
      state.pendingCredentials = null;
      state.registrationSuccess = false;
      state.registrationMessage = null;
      authUtils.clearAuth();
    },
    resetError: (state) => {
      state.error = null;
    },
    clearRegistrationSuccess: (state) => {
      state.registrationSuccess = false;
      state.registrationMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.requiresTwoFactor) {
          state.requires2FA = true;
          state.twoFactorToken = action.payload.twoFactorToken;
          state.method = action.payload.method;
          state.pendingCredentials = action.payload.pendingCredentials;
          state.status = 'idle';
        } else {
          state.status = 'succeeded';
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.error = null;
          state.requires2FA = false;
          state.pendingCredentials = null;
        }
      })
      .addCase(verify2FA.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
        state.requires2FA = false;
        state.twoFactorToken = null;
        state.method = null;
        state.pendingCredentials = null;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || '2FA verification failed';
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.registrationSuccess = false;
        state.registrationMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.registrationSuccess = true;
        state.registrationMessage = action.payload.message;
        state.error = null;
        // Don't set user or isAuthenticated - user needs to verify email first
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Registration failed';
        state.registrationSuccess = false;
        state.registrationMessage = null;
      })
      .addCase(checkAuthStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.status = 'idle';
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Unable to connect to authentication server';
      })
      .addCase(logout.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
        state.requires2FA = false;
        state.twoFactorToken = null;
        state.method = null;
        state.isAuthenticated = false;
        state.pendingCredentials = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout fails, clear the state
        state.user = null;
        state.status = 'idle';
        state.error = null;
        state.requires2FA = false;
        state.twoFactorToken = null;
        state.method = null;
        state.isAuthenticated = false;
        state.pendingCredentials = null;
      });
  },
});

// Export actions
export const { clearAuth, resetError, clearRegistrationSuccess } = authSlice.actions;

export default authSlice.reducer;

