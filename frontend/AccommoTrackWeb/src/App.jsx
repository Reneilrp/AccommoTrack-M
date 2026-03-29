import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api, {
  clearPersistedAuthMode,
  shouldUseBearerForRequest,
} from "./utils/api";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import WebNavigator from "./Navigation/WebNavigator.jsx";
import LandingPage from "./screens/Guest/LandingPage.jsx";
import AuthScreen from "./screens/Auth/Web-Auth";
import LandlordRegister from "./screens/Auth/LandlordRegister";
import Help from "./screens/Guest/Help";
import ErrorBoundary from "./components/Shared/ErrorBoundary";
import { getDefaultLandingRoute } from "./utils/userRoutes";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { UIStateProvider } from "./contexts/UIStateContext";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("userData");
      const publicRoutes = new Set([
        "/",
        "/login",
        "/register",
        "/help",
        "/become-landlord",
      ]);
      const currentPath = window.location.pathname;

      if (!shouldUseBearerForRequest()) {
        localStorage.removeItem("authToken");
        delete api.defaults.headers.common["Authorization"];
      } else if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common["Authorization"];
      }

      if (userData) {
        try {
          if (isActive) setUser(JSON.parse(userData));
        } catch (error) {
          console.error("Error parsing cached user data:", error);
          localStorage.removeItem("userData");
        }
      }

      const shouldProbeSession =
        !!token ||
        !!userData ||
        !publicRoutes.has(currentPath);

      if (!shouldProbeSession) {
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/me", {
          headers: { "X-Skip-Auth-Redirect": "1" },
        });
        const me = res?.data?.user || res?.data;
        if (me && isActive) {
          setUser(me);
          localStorage.setItem("userData", JSON.stringify(me));
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 419) {
          localStorage.removeItem("userData");
          localStorage.removeItem("authToken");
          clearPersistedAuthMode();
          delete api.defaults.headers.common["Authorization"];
          if (isActive) setUser(null);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, []);

  // Listen for 401 events emitted by the axios interceptor and handle
  // redirecting to login. Ignore events that happen shortly after a
  // successful login to prevent races from in-flight requests.
  useEffect(() => {
    const handleUnauthorized = () => {
      const lastLogin = parseInt(
        localStorage.getItem("lastLoginAt") || "0",
        10,
      );
      const now = Date.now();
      // If login happened within the last 5s, ignore this event (race)
      if (now - lastLogin < 5000) return;

      setUser(null);
      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      clearPersistedAuthMode();
      delete api.defaults.headers.common["Authorization"];
      navigate("/login", { replace: true });
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [navigate]);

  // Listen for blocked-user events emitted by the axios interceptor
  useEffect(() => {
    const handleBlocked = () => {
      setUser(null);
      localStorage.removeItem("userData");
      localStorage.removeItem("lastLoginAt");
      localStorage.removeItem("authToken");
      clearPersistedAuthMode();
      delete api.defaults.headers.common["Authorization"];
      toast.error("Your account has been blocked. Please contact support.", {
        duration: 6000,
      });
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:blocked", handleBlocked);
    return () => window.removeEventListener("auth:blocked", handleBlocked);
  }, [navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("userData");
    localStorage.removeItem("lastLoginAt");
    localStorage.removeItem("authToken");
    clearPersistedAuthMode();
    delete api.defaults.headers.common["Authorization"];
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("lastLoginAt", Date.now().toString());
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("userData", JSON.stringify(updatedUser));
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

  const verifiedLanding = user ? getDefaultLandingRoute(user) : "/dashboard";

  return (
    <PreferencesProvider>
      <UIStateProvider>
        <ErrorBoundary>
          <Routes>
            {/* 1. Landing Page - Exact Match */}
            <Route path="/" element={<LandingPage user={user} />} />

            {/* 2. Login Page - Redirects if already logged in */}
            <Route
              path="/login"
              element={
                !user ? (
                  <AuthScreen onLogin={handleLogin} />
                ) : (
                  <Navigate to={verifiedLanding} replace />
                )
              }
            />

            {/* 3. Register Page (Optional, if you have it) */}
            <Route
              path="/register"
              element={
                !user ? (
                  <AuthScreen isRegister={true} onLogin={handleLogin} />
                ) : (
                  <Navigate to={verifiedLanding} replace />
                )
              }
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
                  onUserUpdate={handleUserUpdate}
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
