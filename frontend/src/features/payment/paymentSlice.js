import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createPaymentIntentAPI } from './paymentAPI';

// Thunk to create payment intent and return clientSecret
export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async (amount, thunkAPI) => {
    const response = await createPaymentIntentAPI(amount);
    return response.data.data.clientSecret;
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: { clientSecret: null, status: 'idle', error: null },
  reducers: {
    resetPayment(state) {
      state.clientSecret = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPaymentIntent.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.clientSecret = action.payload;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const { resetPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
