import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from '../features/auth/authSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { status } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only check authentication status once when app loads
    if (status === 'idle') {
      console.log('Checking authentication status...');
      dispatch(checkAuthStatus())
        .unwrap()
        .then(() => {
          console.log('Authentication check successful');
        })
        .catch((error) => {
          console.log('Authentication check failed:', error);
        });
    }
  }, [dispatch, status]);

  return children;
};

export default AuthProvider;
