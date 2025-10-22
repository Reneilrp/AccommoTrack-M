import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const API_URL = '/api';

  const handleLoginSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setToken(null);
      setUser(null);
      setCurrentView('login');
    }
  };

  if (currentView === 'dashboard' && user && token) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  if (currentView === 'register') {
    return <Register onSwitchToLogin={() => setCurrentView('login')} />;
  }

  return (
    <Login 
      onSwitchToRegister={() => setCurrentView('register')}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

export default App;