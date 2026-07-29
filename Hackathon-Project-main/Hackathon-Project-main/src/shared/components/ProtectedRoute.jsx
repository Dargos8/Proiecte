import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../../citizen/components/Loader';

const ProtectedRoute = ({ children, allowedRole, allowedDepartment }) => {
  const { user, role, department, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader message="Se verifică permisiunile..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verifică Rolul
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // Verifică Departamentul (dacă este cerut unul specific, ex: dispatcher)
  if (allowedDepartment && department !== allowedDepartment) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;