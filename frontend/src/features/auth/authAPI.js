import apiClient from '../../api/apiClient';

export const loginAPI = (credentials) => apiClient.post('/auth/login', credentials);
export const registerAPI = (data) => apiClient.post('/auth/register', data);
export const verify2FAAPI = ({ twoFactorToken, code }) => apiClient.post('/auth/verify-2fa', { twoFactorToken, code });
