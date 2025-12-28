import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdminLayout from '../components/AdminLayout.jsx';
import AdminDashboard from '../../admin/AdminDashboard.jsx';
import UserManagement from '../../admin/UserManagement.jsx';
import PropertyApproval from '../../admin/PropertyApproval.jsx';

export default function AdminNavigator({ user, onLogout }) {
  return (
    <SidebarProvider>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <AdminDashboard user={user} />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <UserManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/properties"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <PropertyApproval />
            </AdminLayout>
          }
        />
        {/* Redirect any other route to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SidebarProvider>
  );
}
