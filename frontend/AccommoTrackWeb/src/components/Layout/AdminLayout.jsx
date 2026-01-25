import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminLayout = ({ children, user, onLogout = () => {} }) => {
  const navLinkClasses = (isActive) =>
    `px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-between ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-72 max-w-xs bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Admin Suite</p>
          <h1 className="text-lg font-bold text-gray-900 mt-1">AccommoTrack</h1>
          <p className="text-sm text-gray-500 mt-2">{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-white">
          <NavLink to="/admin" end className={({ isActive }) => navLinkClasses(isActive)}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => navLinkClasses(isActive)}>Users</NavLink>
          <NavLink to="/admin/approvals" className={({ isActive }) => navLinkClasses(isActive)}>Approvals</NavLink>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onLogout}
            className="w-full text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors font-semibold"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
