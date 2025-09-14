import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

function Dashboard() {
  const { user, isAuthenticated, status } = useAuth();
  const navigate = useNavigate();

  // Redirect to appropriate dashboard based on user role
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'patient':
          navigate('/patient', { replace: true });
          break;
        case 'pharmacy':
          navigate('/pharmacy', { replace: true });
          break;
        case 'doctor':
          navigate('/doctor', { replace: true });
          break;
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        default:
          // Stay on dashboard for unknown roles
          break;
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Show loading state while authentication is being checked
  if (status === 'loading' || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user data is available, show loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  if (user && user.role && ['patient', 'pharmacy', 'doctor', 'admin'].includes(user.role)) {
    // Redirect will happen via useEffect, show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error for unrecognized roles
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {user ? `Your role (${user.role}) is not recognized. Please contact support.` : 'Please log in to access your dashboard.'}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
