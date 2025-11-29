import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

/**
 * RequireAdmin
 * - If no auth token -> redirect to /login
 * - If user prop is provided and role === 'admin' -> allow
 * - If user prop is provided and role !== 'admin' -> redirect to /dashboard
 * - If no user prop but token exists -> attempt to GET current user from `/user` or `/auth/me` (best-effort)
 *   If resolved and role === 'admin' allow, otherwise redirect.
 */
const RequireAdmin = ({ user, children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);

  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Try common endpoints to retrieve current user. This is best-effort;
        // If your backend exposes a different endpoint, update accordingly.
        const endpoints = ['/user', '/auth/me', '/me'];
        for (const ep of endpoints) {
          try {
            const res = await api.get(ep);
            if (!mounted) return;
            if (res?.data) {
              setFetchedUser(res.data.user || res.data);
              break;
            }
          } catch (e) {
            // try next
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!user && token) fetchUser();

    return () => { mounted = false; };
  }, [token, user]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveUser = user || fetchedUser;

  if (loading) return <div>Checking permissions...</div>;

  if (effectiveUser) {
    if (effectiveUser.role === 'admin') return children;
    // Logged-in but not admin -> send to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // If token exists but user couldn't be loaded, be conservative and redirect to login
  return <Navigate to="/login" replace />;
};

export default RequireAdmin;
