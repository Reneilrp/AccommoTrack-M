import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import RouteLoadingFallback from '../components/Shared/RouteLoadingFallback.jsx';
import LandingPage from '../screens/Guest/LandingPage.jsx';

const loadAdminNavigator = () => import('./AdminNavigator.jsx');
const loadLandlordNavigator = () => import('./LandlordNavigator.jsx');
const loadTenantNavigator = () => import('./TenantNavigator.jsx');
const loadPropertyDetails = () => import('../screens/Tenant/PropertyDetails.jsx');
const loadBrowsingPropertyPage = () => import('../screens/Tenant/ExploreProperties.jsx');

const AdminNavigator = lazy(loadAdminNavigator);
const LandlordNavigator = lazy(loadLandlordNavigator);
const TenantNavigator = lazy(loadTenantNavigator);
const PropertyDetails = lazy(loadPropertyDetails);
const BrowsingPropertyPage = lazy(loadBrowsingPropertyPage);

const prefetchByRole = {
  admin: [loadAdminNavigator],
  landlord: [loadLandlordNavigator],
  caretaker: [loadLandlordNavigator],
  tenant: [loadTenantNavigator],
};

const isConstrainedConnection = () => {
  if (typeof navigator === 'undefined') return false;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;

  if (connection.saveData) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
};

// --- WRAPPER FOR DETAILS PAGE ---
// This wrapper is needed to extract the ID from the URL and pass it to your component
const PublicDetailsWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return <PropertyDetails propertyId={id} onBack={() => navigate(-1)} />;
};

export default function WebNavigator({ user, onLogout, onUserUpdate }) {
  const role = (user?.role || '').toLowerCase();
  const prefetchedRolesRef = useRef(new Set());
  const fullPageFallback = <RouteLoadingFallback fullScreen label="Loading page" />;
  const roleGateFallback = (
    <RouteLoadingFallback fullScreen label="Preparing workspace" />
  );
  const renderWithFallback = (element, fallback = fullPageFallback) => (
    <Suspense fallback={fallback}>
      {element}
    </Suspense>
  );

  useEffect(() => {
    if (!user || !role) return;
    if (prefetchedRolesRef.current.has(role)) return;
    if (isConstrainedConnection()) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    const jobs = prefetchByRole[role] || [];
    const primaryJob = jobs[0];
    if (!primaryJob) return;

    prefetchedRolesRef.current.add(role);

    const runPrefetch = () => {
      Promise.resolve(primaryJob()).catch(() => {
        // Ignore prefetch failures; routes still lazy-load on demand.
      });
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(runPrefetch, { timeout: 1600 });
      return () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(runPrefetch, 350);
    return () => window.clearTimeout(timeoutId);
  }, [role, user]);
  
  // Guest routes (no user)
  if (!user) {
    return renderWithFallback(
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse-properties" element={<BrowsingPropertyPage />} />
        
        {/* --- ADD THIS LINE TO REGISTER THE ROUTE --- */}
        <Route path="/property/:id" element={<PublicDetailsWrapper />} />
        
        {/* Catch-all: Redirect unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  
  // Admin role
  if (role === 'admin') {
    return renderWithFallback(
      <AdminNavigator user={user} onLogout={onLogout} />,
      roleGateFallback,
    );
  }

  // Landlord and caretaker roles
  if (role === 'landlord' || role === 'caretaker') {
    return renderWithFallback(
      <LandlordNavigator user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />,
      roleGateFallback,
    );
  }

  // Tenant role
  if (role === 'tenant') {
    return renderWithFallback(
      <TenantNavigator user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />,
      roleGateFallback,
    );
  }

  return <Navigate to="/" replace />;
}