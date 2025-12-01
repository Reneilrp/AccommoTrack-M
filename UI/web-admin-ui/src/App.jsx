import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WebNavigator from './WebNavigator/WebNavigator';
import AuthScreen from './AuthScreen/Web-Auth';
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
      <Route
        path="/login"
        element={!user ? <AuthScreen onLogin={handleLogin} /> : <Navigate to={verifiedLanding} replace />}
      />
      <Route
        path="/*"
        element={
          user ? (
            <WebNavigator
              user={user}
              onLogout={handleLogout}
              onUserUpdate={setUser}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;