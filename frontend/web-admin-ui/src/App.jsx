import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WebNavigator from './Navigation/WebNavigator';
import LandingPage from './components/Pages/Guest/LandingPage.jsx';
import AuthScreen from './AuthScreen/Web-Auth';
import LandlordRegister from './components/Pages/Guest/LandlordRegister';
import Help from './components/Pages/Guest/Help';
import { getDefaultLandingRoute } from './utils/userRoutes';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userData');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userData');
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('userData', JSON.stringify(userData));
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
    <Routes>
      {/* 1. Landing Page - Exact Match */}
      <Route
        path="/"
        element={<LandingPage />}
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
  );
}

export default App;