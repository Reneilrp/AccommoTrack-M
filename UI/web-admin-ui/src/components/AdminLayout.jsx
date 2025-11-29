import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminLayout = ({ children, user, onLogout = () => {} }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-300 mt-1">{user?.first_name || user?.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <NavLink to="/admin" end className={({isActive}) => isActive ? 'text-white font-semibold bg-gray-700 px-3 py-2 rounded' : 'text-gray-300 hover:bg-gray-700 px-3 py-2 rounded'}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({isActive}) => isActive ? 'text-white font-semibold bg-gray-700 px-3 py-2 rounded' : 'text-gray-300 hover:bg-gray-700 px-3 py-2 rounded'}>Users</NavLink>
          <NavLink to="/admin/properties" className={({isActive}) => isActive ? 'text-white font-semibold bg-gray-700 px-3 py-2 rounded' : 'text-gray-300 hover:bg-gray-700 px-3 py-2 rounded'}>Properties</NavLink>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button onClick={onLogout} className="w-full text-sm bg-red-600 hover:bg-red-700 px-3 py-2 rounded transition-colors">Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
