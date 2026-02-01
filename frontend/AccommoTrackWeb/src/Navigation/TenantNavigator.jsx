import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext';
import TenantLayout from '../components/Layout/TenantLayout';

// Screens
import TenantDashboard from '../screens/Tenant/Dashboard/TenantDashboard';
import ExploreProperties from '../screens/Tenant/Explore/ExploreProperties';
import TenantPropertyDetails from '../screens/Tenant/Explore/TenantPropertyDetails';
import MyBookings from '../screens/Tenant/Bookings/MyBookings';
import TenantMessages from '../screens/Tenant/Messages/TenantMessages';
import TenantSettings from '../screens/Tenant/Settings/TenantSettings';
import TenantWallet from '../screens/Tenant/Wallet/TenantWallet';

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
          <Route path="/messages" element={<TenantMessages user={user} />} />
          <Route path="/settings" element={<TenantSettings user={user} />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TenantLayout>
    </SidebarProvider>
  );
}
