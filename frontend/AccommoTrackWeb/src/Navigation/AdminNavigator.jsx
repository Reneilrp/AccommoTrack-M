import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdminLayout from '../components/Layout/AdminLayout.jsx';
import AdminDashboard from '../screens/Admin/AdminDashboard.jsx';
import UserManagement from '../screens/Admin/UserManagement.jsx';
import InquiryManagement from '../screens/Admin/InquiryManagement.jsx';
import Approvals from '../screens/Admin/Approvals.jsx';

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
          path="/admin/approvals"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <Approvals />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/inquiries"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <InquiryManagement />
            </AdminLayout>
          }
        />
        {/* Redirect any other route to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SidebarProvider>
  );
}
