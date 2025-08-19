
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, status, error } = useSelector((state) => state.auth);

  // Show loading spinner while checking auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If authentication failed or backend is unreachable, show error and login form
  if (status === 'idle' && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="mb-4 text-red-600 font-semibold">{error}</div>
        {children}
      </div>
    );
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AuthRedirect;
