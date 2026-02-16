import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const RequireAdmin = ({ user, children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      setLoading(true);
      try {
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

    if (!user) fetchUser();

    return () => { mounted = false; };
  }, [user]);

  const effectiveUser = user || fetchedUser;

  if (loading) return <div>Checking permissions...</div>;

  if (effectiveUser) {
    if (effectiveUser.role === 'admin') return children;
    // Logged-in but not admin -> send to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // If user couldn't be loaded, redirect to login
  return <Navigate to="/login" replace />;
};

export default RequireAdmin;
