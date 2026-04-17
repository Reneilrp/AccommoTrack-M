import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext';
import TenantLayout from '../components/Layout/TenantLayout';
import RouteLoadingFallback from '../components/Shared/RouteLoadingFallback.jsx';

const TenantDashboard = lazy(() => import('../screens/Tenant/TenantDashboard'));
const ExploreProperties = lazy(() => import('../screens/Tenant/ExploreProperties'));
const TenantPropertyDetails = lazy(() => import('../screens/Tenant/TenantPropertyDetails'));
const MyBookings = lazy(() => import('../screens/Tenant/MyBookings'));
const TenantMessages = lazy(() => import('../screens/Tenant/TenantMessages'));
const TenantSettings = lazy(() => import('../screens/Tenant/TenantSettings'));
const TenantPayments = lazy(() => import('../screens/Tenant/TenantPayments'));
const TenantPaymentLogs = lazy(() => import('../screens/Tenant/TenantPaymentLogs'));
const InvoiceCheckout = lazy(() => import('../screens/Tenant/InvoiceCheckout'));
const TenantMaintenance = lazy(() => import('../screens/Tenant/TenantMaintenance'));
const Notifications = lazy(() => import('../screens/Tenant/Notifications'));
const Addons = lazy(() => import('../screens/Tenant/Addons'));
const Reviews = lazy(() => import('../screens/Tenant/Reviews'));
const VerificationStatus = lazy(() => import('../screens/Landlord/VerificationStatus'));

export default function TenantNavigator({ user, onLogout, onUserUpdate }) {
  const withSuspense = (screen, label = 'Loading page') => (
    <Suspense fallback={<RouteLoadingFallback label={label} />}>
      {screen}
    </Suspense>
  );

  return (
    <SidebarProvider>
      <TenantLayout user={user} onLogout={onLogout}>
        <Routes>
          <Route path="/dashboard" element={withSuspense(<TenantDashboard />, 'Loading dashboard')} />
          <Route path="/explore" element={withSuspense(<ExploreProperties />, 'Loading properties')} />
          <Route path="/property/:id" element={withSuspense(<TenantPropertyDetails />, 'Loading property details')} />
          <Route path="/bookings" element={withSuspense(<MyBookings />, 'Loading bookings')} />
          <Route path="/payments" element={withSuspense(<TenantPayments user={user} />, 'Loading payments')} />
          <Route path="/payments/logs" element={withSuspense(<TenantPaymentLogs user={user} />, 'Loading payment logs')} />
          <Route path="/maintenance" element={withSuspense(<TenantMaintenance />, 'Loading maintenance')} />
          <Route path="/checkout/:id" element={withSuspense(<InvoiceCheckout />, 'Loading checkout')} />
          <Route path="/messages" element={withSuspense(<TenantMessages user={user} />, 'Loading messages')} />
          <Route path="/settings" element={withSuspense(<TenantSettings user={user} onUserUpdate={onUserUpdate} />, 'Loading settings')} />
          <Route path="/notifications" element={withSuspense(<Notifications />, 'Loading notifications')} />
          <Route path="/addons" element={withSuspense(<Addons />, 'Loading addons')} />
          <Route path="/reviews" element={withSuspense(<Reviews />, 'Loading reviews')} />
          <Route path="/verification" element={withSuspense(<VerificationStatus />, 'Loading verification')} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TenantLayout>
    </SidebarProvider>
  );
}
