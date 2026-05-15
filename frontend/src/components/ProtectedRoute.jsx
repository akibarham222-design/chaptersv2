import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, modOnly = false }) {
  const { user, loading, isAdmin, isMod } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night-950">
        <div className="text-center">
          <div className="text-amber-500 font-mono-custom text-sm animate-pulse mb-2">
            ◆ CHECKING BOARDING PASS ◆
          </div>
          <div className="track-line w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (modOnly && !isMod) {
    return <Navigate to="/" replace />;
  }

  return children;
}
