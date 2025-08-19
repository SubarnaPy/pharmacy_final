import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, status } = useSelector((state) => state.auth);
  const location = useLocation();

  // While checking auth state
  if (status === 'loading') {
    return null; // TODO: add a loader component
  }

  if (!user) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
