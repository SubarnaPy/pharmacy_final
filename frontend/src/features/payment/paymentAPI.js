import apiClient from '../../api/apiClient';

// Create a Stripe Payment Intent
export const createPaymentIntentAPI = (amount) => {
  return apiClient.post('/payments/create-payment-intent', { amount });
};
