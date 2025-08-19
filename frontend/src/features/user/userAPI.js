import apiClient from '../../api/apiClient';

// Fetch the current user's profile
export const fetchUserProfile = () => {
  return apiClient.get('/user/profile');
};

// Update the user's profile data
export const updateUserProfile = (profileData) => {
  return apiClient.put('/user/profile', profileData);
};

// Upload user avatar
export const uploadAvatarAPI = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/users/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
