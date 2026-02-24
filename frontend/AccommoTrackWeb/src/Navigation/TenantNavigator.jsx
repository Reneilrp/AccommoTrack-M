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
import TenantWallet from '../screens/Tenant/TenantWallet';
import InvoiceCheckout from '../screens/Tenant/InvoiceCheckout';
import TenantMaintenance from '../screens/Tenant/TenantMaintenance';

export default function TenantNavigator({ user, onLogout }) {
  return (
    <SidebarProvider>
      <TenantLayout user={user} onLogout={onLogout}>
        <Routes>
          <Route path="/dashboard" element={<TenantDashboard />} />
          <Route path="/explore" element={<ExploreProperties />} />
          <Route path="/property/:id" element={<TenantPropertyDetails />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/wallet" element={<TenantWallet />} />
          <Route path="/maintenance" element={<TenantMaintenance />} />
          <Route path="/checkout/:id" element={<InvoiceCheckout />} />
          <Route path="/messages" element={<TenantMessages user={user} />} />
          <Route path="/settings" element={<TenantSettings user={user} />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TenantLayout>
    </SidebarProvider>
  );
}
