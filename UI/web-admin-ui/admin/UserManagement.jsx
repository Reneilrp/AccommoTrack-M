import React, { useEffect, useState } from 'react';
import api from '../src/utils/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // Backend endpoint: GET /admin/users
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlock = async (userId, block = true) => {
    setActionLoading(userId + ':' + (block ? 'block' : 'unblock'));
    setError('');
    try {
      if (block) {
        await api.post(`/admin/users/${userId}/block`);
      } else {
        await api.post(`/admin/users/${userId}/unblock`);
      }

      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_active: !block } : u)));
    } catch (err) {
      console.error('Failed to update user block status', err);
      setError(err.response?.data?.message || err.message || 'User action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (userId) => {
    setActionLoading(userId + ':approve');
    setError('');
    try {
      await api.post(`/admin/users/${userId}/approve`);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_verified: true } : u)));
    } catch (err) {
      console.error('Failed to approve user', err);
      setError(err.response?.data?.message || err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    return user.role?.toLowerCase() === roleFilter;
  });

  return (
    <div className="w-full max-w-full px-6 py-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">User Management</h2>
      <p className="text-sm text-gray-600 mb-6">Manage registered users. View information or block/unblock users.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            roleFilter === 'all' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setRoleFilter('landlord')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            roleFilter === 'landlord' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Landlords
        </button>
        <button
          onClick={() => setRoleFilter('tenant')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            roleFilter === 'tenant' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tenants
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600">No users found.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto shadow-md rounded-lg">
            <table className="w-full bg-white">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Email</th>
                  <th className="px-6 py-4 text-left font-semibold">Role</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{u.email}</td>
                    <td className="px-6 py-4 text-gray-700 capitalize">{u.role}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          onClick={() => handleView(u)}
                        >
                          View
                        </button>
                        <button
                          className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            !u.is_active 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                          onClick={() => handleBlock(u.id, u.is_active)}
                          disabled={actionLoading}
                        >
                          {actionLoading === u.id + ':' + (u.is_active ? 'block' : 'unblock')
                            ? (u.is_active ? 'Blocking...' : 'Unblocking...')
                            : (u.is_active ? 'Block' : 'Unblock')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-semibold text-gray-900">
                      {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name || ''}` : selectedUser.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedUser.role || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Registration Date */}
              {selectedUser.created_at && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Registration Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Registered On</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleBlock(selectedUser.id, selectedUser.is_active);
                  setShowModal(false);
                }}
                disabled={actionLoading}
                className={`px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  !selectedUser.is_active 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {selectedUser.is_active ? 'Block User' : 'Unblock User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
