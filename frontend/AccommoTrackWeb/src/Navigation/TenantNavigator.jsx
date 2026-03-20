import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext';
import TenantLayout from '../components/Layout/TenantLayout';

// Screens
import TenantDashboard from '../screens/Tenant/TenantDashboard';
import ExploreProperties from '../screens/Tenant/ExploreProperties';
import TenantPropertyDetails from '../screens/Tenant/TenantPropertyDetails';
import MyBookings from '../screens/Tenant/MyBookings';
import TenantMessages from '../screens/Tenant/TenantMessages';
import TenantSettings from '../screens/Tenant/TenantSettings';
import TenantPayments from '../screens/Tenant/TenantPayments';
import InvoiceCheckout from '../screens/Tenant/InvoiceCheckout';
import TenantMaintenance from '../screens/Tenant/TenantMaintenance';
import Notifications from '../screens/Tenant/Notifications';
import Addons from '../screens/Tenant/Addons';
import Reviews from '../screens/Tenant/Reviews';
import VerificationStatus from '../screens/Landlord/VerificationStatus';

export default function TenantNavigator({ user, onLogout, onUserUpdate }) {
  return (
    <SidebarProvider>
      <TenantLayout user={user} onLogout={onLogout}>
        <Routes>
          <Route path="/dashboard" element={<TenantDashboard />} />
          <Route path="/explore" element={<ExploreProperties />} />
          <Route path="/property/:id" element={<TenantPropertyDetails />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/payments" element={<TenantPayments />} />
          <Route path="/maintenance" element={<TenantMaintenance />} />
          <Route path="/checkout/:id" element={<InvoiceCheckout />} />
          <Route path="/messages" element={<TenantMessages user={user} />} />
          <Route path="/settings" element={<TenantSettings user={user} onUserUpdate={onUserUpdate} />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/addons" element={<Addons />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/verification" element={<VerificationStatus />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TenantLayout>
    </SidebarProvider>
  );
}
