import { useState, useEffect } from "react";
import { showError } from "./utils/toast";
import api, {
  clearStoredTokenAuth,
  clearPersistedAuthMode,
  shouldUseBearerForRequest,
} from "./utils/api";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import WebNavigator from "./Navigation/WebNavigator.jsx";
import LandingPage from "./screens/Guest/LandingPage.jsx";
import AuthScreen from "./screens/Auth/Web-Auth";
import LandlordRegister from "./screens/Auth/LandlordRegister";
import Help from "./screens/Guest/Help";
import MobileAppPage from "./screens/Guest/MobileAppPage";
import VerifyReceipt from "./screens/Public/VerifyReceipt";
import ErrorBoundary from "./components/Shared/ErrorBoundary";
import { getDefaultLandingRoute } from "./utils/userRoutes";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { UIStateProvider } from "./contexts/UIStateContext";
import { CartProvider } from "./contexts/CartContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { cacheManager } from "./utils/cache";

import { useRealTimeSync } from "./hooks/useRealTimeSync";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("userData");
      let cachedUser = null;
      let hasHydratedCachedUser = false;
      const publicRoutes = new Set([
        "/",
        "/login",
        "/register",
        "/help",
        "/become-landlord",
        "/browse-properties",
      ]);
      const normalizePath = (path) => {
        if (!path || path === "/") return "/";
        return path.replace(/\/+$/, "");
      };
      const currentPath = normalizePath(window.location.pathname);
      const isGuestPropertyRoute = /^\/property\/[^/]+$/.test(currentPath);
      const isGuestPublicRoute =
        publicRoutes.has(currentPath) || isGuestPropertyRoute;

      if (!shouldUseBearerForRequest()) {
        clearStoredTokenAuth();
      } else if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common["Authorization"];
      }

      if (userData) {
        try {
          cachedUser = JSON.parse(userData);
          if (isActive) {
            setUser(cachedUser);
            setIsLoading(false);
          }
          hasHydratedCachedUser = true;
        } catch (error) {
          console.error("Error parsing cached user data:", error);
          localStorage.removeItem("userData");
        }
      }

      // Skip auth probing on guest-public routes to avoid expected 401 noise.
      const shouldProbeSession = !isGuestPublicRoute;

      if (!shouldProbeSession) {
        if (isActive && !hasHydratedCachedUser) setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/me", {
          headers: { "X-Skip-Auth-Redirect": "1" },
        });
        const me = res?.data?.user || res?.data;
        const hasCaretakerPermissions =
          me?.caretaker_permissions &&
          typeof me.caretaker_permissions === "object" &&
          Object.keys(me.caretaker_permissions).length > 0;

        const shouldHydrateFromCache =
          me?.role === "caretaker" &&
          !hasCaretakerPermissions &&
          cachedUser?.role === "caretaker" &&
          cachedUser?.caretaker_permissions &&
          typeof cachedUser.caretaker_permissions === "object";

        const normalizedMe = shouldHydrateFromCache
          ? {
            ...me,
            caretaker_permissions: cachedUser.caretaker_permissions,
            assigned_property_ids: Array.isArray(me?.assigned_property_ids)
              ? me.assigned_property_ids
              : (Array.isArray(cachedUser?.assigned_property_ids)
                ? cachedUser.assigned_property_ids
                : []),
          }
          : me;

        if (me && isActive) {
          setUser(normalizedMe);
          localStorage.setItem("userData", JSON.stringify(normalizedMe));
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 419) {
          localStorage.removeItem("userData");
          clearStoredTokenAuth();
          clearPersistedAuthMode();
          if (isActive) setUser(null);
        }
      } finally {
        if (isActive && !hasHydratedCachedUser) setIsLoading(false);
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
      clearStoredTokenAuth();
      clearPersistedAuthMode();
      cacheManager.clearAll();
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
      clearStoredTokenAuth();
      clearPersistedAuthMode();
      cacheManager.clearAll();
      showError("Your account has been blocked. Please contact support.");
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:blocked", handleBlocked);
    return () => window.removeEventListener("auth:blocked", handleBlocked);
  }, [navigate]);

  // Real-time synchronization for the authenticated user
  useRealTimeSync(user);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("userData");
    localStorage.removeItem("lastLoginAt");
    clearStoredTokenAuth();
    clearPersistedAuthMode();
    cacheManager.clearAll();
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
        <WebSocketProvider user={user}>
          <ErrorBoundary>
            <Routes>
              {/* ... routes ... */}
              <Route path="/" element={<LandingPage user={user} />} />
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
              <Route path="/become-landlord" element={<LandlordRegister />} />
              <Route path="/help" element={<Help />} />
              <Route path="/mobile-app" element={<MobileAppPage />} />
              <Route path="/verify-receipt/:reference" element={<VerifyReceipt />} />
              <Route
                path="/*"
                element={
                  user?.role === 'tenant' ? (
                    <CartProvider>
                      <WebNavigator
                        user={user}
                        onLogout={handleLogout}
                        onUserUpdate={handleUserUpdate}
                      />
                    </CartProvider>
                  ) : (
                    <WebNavigator
                      user={user}
                      onLogout={handleLogout}
                      onUserUpdate={handleUserUpdate}
                    />
                  )
                }
              />
            </Routes>
          </ErrorBoundary>
        </WebSocketProvider>
      </UIStateProvider>
    </PreferencesProvider>
  );
}

export default App;
