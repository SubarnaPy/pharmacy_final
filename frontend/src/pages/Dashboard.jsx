import React from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import PatientDashboard from './PatientDashboard';
import PharmacyDashboard from './PharmacyDashboard';
import DoctorDashboard from './DoctorDashboard';
import AdminDashboard from './AdminDashboard';

function Dashboard() {
  const { user, isAuthenticated, status } = useAuth();

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
  switch (user.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'pharmacy':
      return <PharmacyDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your role ({user.role}) is not recognized. Please contact support.
            </p>
          </div>
        </div>
      );
  }
}

export default Dashboard;
