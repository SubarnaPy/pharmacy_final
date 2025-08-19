import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/user/userSlice';
import prescriptionReducer from '../features/prescription/prescriptionSlice';
import pharmacyReducer from '../features/pharmacy/pharmacySlice';
import paymentReducer from '../features/payment/paymentSlice';
import notificationReducer from '../features/notification/notificationSlice';
import doctorProfileReducer from './doctorProfileSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    prescription: prescriptionReducer,
    pharmacy: pharmacyReducer,
    payment: paymentReducer,
    notification: notificationReducer,  // added notification reducer
    doctorProfile: doctorProfileReducer,
    // ... add other slice reducers here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
