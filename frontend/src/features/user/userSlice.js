import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchUserProfile, updateUserProfile } from './userAPI';
import { uploadAvatarAPI } from './userAPI';

export const getProfile = createAsyncThunk('user/getProfile', async () => {
  const response = await fetchUserProfile();
  // return actual user object from response
  return response.data.data.user;
});

export const saveProfile = createAsyncThunk('user/saveProfile', async (profileData) => {
  const response = await updateUserProfile(profileData);
  return response.data;
});

// Upload user avatar
export const uploadAvatar = createAsyncThunk('user/uploadAvatar', async (file) => {
  const response = await uploadAvatarAPI(file);
  return response.data.data.avatar;
});

const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(saveProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(uploadAvatar.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.profile && state.profile.profile) {
          state.profile.profile.avatar = action.payload;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default userSlice.reducer;
