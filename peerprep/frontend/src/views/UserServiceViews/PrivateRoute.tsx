// src/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredAdmin = false }) => {
  const token = sessionStorage.getItem('token');
  const isAdmin = JSON.parse(sessionStorage.getItem('isAdmin') || 'false'); // Admin status stored in sessionStorage

  if (!token) {
    // Redirect to login if no token is found
    return <Navigate to="/" />;
  }

  // If the route requires admin and the user is not admin, redirect to profile
  if (requiredAdmin && !isAdmin) {
    return <Navigate to="/profile" />;
  }

  return children;
};

export default PrivateRoute;