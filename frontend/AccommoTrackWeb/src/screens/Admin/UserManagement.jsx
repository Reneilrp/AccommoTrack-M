import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../../components/Shared/ConfirmationModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Backend endpoint: GET /admin/users
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const confirmBlock = (userId, is_blocked) => {
    const action = is_blocked ? 'unblock' : 'block';
    setConfirmModalState({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} this user?`,
      onConfirm: () => handleBlock(userId, !is_blocked),
      confirmText: `${action.charAt(0).toUpperCase() + action.slice(1)}`,
      confirmButtonClass: is_blocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
    });
  };

  const handleBlock = async (userId, block = true) => {
    setConfirmModalState({ isOpen: false });
    setActionLoading(userId + ':' + (block ? 'block' : 'unblock'));
    try {
      if (block) {
        await api.post(`/admin/users/${userId}/block`);
        toast.success('User blocked successfully');
      } else {
        await api.post(`/admin/users/${userId}/unblock`);
        toast.success('User unblocked successfully');
      }

      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_blocked: block } : u)));
    } catch (err) {
      console.error('Failed to update user block status', err);
      toast.error(err.response?.data?.message || err.message || 'User action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (userId) => {
    setActionLoading(userId + ':approve');
    try {
      await api.post(`/admin/users/${userId}/approve`);
      toast.success('User approved successfully');
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_verified: true } : u)));
    } catch (err) {
      console.error('Failed to approve user', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to approve');
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
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        confirmButtonClass={confirmModalState.confirmButtonClass}
      />
      <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">User Management</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage registered users. View information or block/unblock users.</p>

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All Users' },
          { id: 'landlord', label: 'Landlords' },
          { id: 'tenant', label: 'Tenants' },
          { id: 'caretaker', label: 'Caretakers' }
        ].map(role => (
          <button
            key={role.id}
            onClick={() => setRoleFilter(role.id)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
              roleFilter === role.id 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">No users found.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Gender</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/30 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 capitalize">{u.gender || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 capitalize">{u.role}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {u.role === 'landlord' ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          u.verification_status === 'approved' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : u.verification_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : u.verification_status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {u.verification_status === 'approved' 
                            ? 'Verified' 
                            : u.verification_status === 'pending'
                              ? 'Pending'
                              : u.verification_status === 'rejected'
                                ? 'Rejected'
                                : 'Not Submitted'}
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.is_blocked ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          onClick={() => handleView(u)}
                        >
                          View
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name || ''}` : selectedUser.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Gender</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{selectedUser.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{selectedUser.role || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    {selectedUser.role === 'landlord' ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedUser.verification_status === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : selectedUser.verification_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : selectedUser.verification_status === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedUser.verification_status === 'approved' 
                          ? 'Verified' 
                          : selectedUser.verification_status === 'pending'
                            ? 'Pending Verification'
                            : selectedUser.verification_status === 'rejected'
                              ? 'Rejected'
                              : 'Not Submitted'}
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedUser.is_blocked ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {selectedUser.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Registration Date */}
              {selectedUser.created_at && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Registration Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Registered On</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Landlord Properties */}
              {selectedUser.role === 'landlord' && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Properties ({selectedUser.properties_count || 0})</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    {selectedUser.properties_list && selectedUser.properties_list.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedUser.properties_list.map((property, index) => (
                          <li key={property.id || index} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="font-medium text-gray-900 dark:text-white">{property.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">No properties listed</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tenant Property/Room */}
              {selectedUser.role === 'tenant' && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Current Accommodation</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    {selectedUser.current_property ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Property</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.current_property.name}</p>
                        </div>
                        {selectedUser.current_property.room_number && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Room Number</p>
                            <p className="font-semibold text-gray-900 dark:text-white">Room {selectedUser.current_property.room_number}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">Not currently assigned to any property</p>
                    )}
                  </div>
                </div>
              )}

              {/* Caretaker Assigned Landlord */}
              {selectedUser.role === 'caretaker' && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Assigned Landlord</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    {selectedUser.assigned_landlord ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Landlord Name</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.assigned_landlord.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Landlord Email</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.assigned_landlord.email || 'N/A'}</p>
                          </div>
                        </div>
                        {selectedUser.assigned_landlord.properties && selectedUser.assigned_landlord.properties.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Managed Properties</p>
                            <ul className="space-y-1">
                              {selectedUser.assigned_landlord.properties.map((property, index) => (
                                <li key={property.id || index} className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <span className="text-gray-900 dark:text-white">{property.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">Not assigned to any landlord</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  confirmBlock(selectedUser.id, selectedUser.is_blocked);
                  setShowModal(false);
                }}
                disabled={actionLoading}
                className={`px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedUser.is_blocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {selectedUser.is_blocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
