import { useState, useEffect } from 'react';
import api from './utils/api';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import WebNavigator from './Navigation/WebNavigator.jsx';
import LandingPage from './screens/Guest/LandingPage.jsx';
import AuthScreen from './screens/Auth/Web-Auth';
import LandlordRegister from './screens/Guest/LandlordRegister';
import Help from './screens/Guest/Help';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import { getDefaultLandingRoute } from './utils/userRoutes';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { UIStateProvider } from './contexts/UIStateContext';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userData');
      }
    }
    // Restore Authorization header from stored token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setIsLoading(false);
  }, []);

  // Listen for 401 events emitted by the axios interceptor and handle
  // redirecting to login. Ignore events that happen shortly after a
  // successful login to prevent races from in-flight requests.
  useEffect(() => {
    const handleUnauthorized = () => {
      const lastLogin = parseInt(localStorage.getItem('lastLoginAt') || '0', 10);
      const now = Date.now();
      // If login happened within the last 3s, ignore this event (race)
      if (now - lastLogin < 3000) return;

      setUser(null);
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
      try { delete api.defaults.headers.common['Authorization']; } catch (e) {}
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    try { delete api.defaults.headers.common['Authorization']; } catch(e) { /* ignore */ }
    localStorage.removeItem('lastLoginAt');
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('lastLoginAt', Date.now().toString());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const verifiedLanding = user ? getDefaultLandingRoute(user) : '/dashboard';

  return (
    <PreferencesProvider>
      <UIStateProvider>
        <ErrorBoundary>
          <Routes>
          {/* 1. Landing Page - Exact Match */}
          <Route
            path="/"
            element={<LandingPage user={user} />}
          />

          {/* 2. Login Page - Redirects if already logged in */}
          <Route
            path="/login"
            element={!user ? <AuthScreen onLogin={handleLogin} /> : <Navigate to={verifiedLanding} replace />}
          />

          {/* 3. Register Page (Optional, if you have it) */}
          <Route
            path="/register"
            element={!user ? <AuthScreen isRegister={true} onLogin={handleLogin} /> : <Navigate to={verifiedLanding} replace />}
          />

          {/* 4. Landlord and Help Pages */}
          <Route path="/become-landlord" element={<LandlordRegister />} />
          <Route path="/help" element={<Help />} />

          {/* 5. All Other Routes Handled by WebNavigator */}
          <Route
            path="/*"
            element={
              <WebNavigator
                user={user}
                onLogout={handleLogout}
                onUserUpdate={setUser}
              />
            }
          />
        </Routes>
      </ErrorBoundary>
      </UIStateProvider>
    </PreferencesProvider>
  );
}

export default App;