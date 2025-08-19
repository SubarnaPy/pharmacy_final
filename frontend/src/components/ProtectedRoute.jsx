
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, status, error } = useSelector((state) => state.auth);
  const location = useLocation();

  console.log('ProtectedRoute - Auth Status:', { isAuthenticated, status, error });

  // Show loading spinner while checking auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication failed or backend is unreachable, redirect to login
  if ((status === 'idle' || status === 'failed') && !isAuthenticated) {
    console.log('ProtectedRoute - Redirecting to login:', { status, isAuthenticated, error });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return children;
  }

  // Default fallback: redirect to login
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
