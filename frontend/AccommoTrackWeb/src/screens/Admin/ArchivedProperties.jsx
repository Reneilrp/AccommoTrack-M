import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Archive, RefreshCcw, Search, MapPin, CalendarDays, KeyRound, Users, Home } from 'lucide-react';
import ConfirmationModal from '../../components/Shared/ConfirmationModal';

const ArchivedProperties = () => {
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'users'
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  
  const [confirmModalState, setConfirmModalState] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: () => {}, requirePassword: false 
  });
  const [passwordValue, setPasswordValue] = useState('');
  const passwordValueRef = React.useRef(passwordValue);
  passwordValueRef.current = passwordValue;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'properties') {
        const res = await api.get('/admin/properties/archived');
        setProperties(res.data || []);
      } else {
        const res = await api.get('/admin/users/archived');
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error(`Failed to fetch archived ${activeTab}`, err);
      toast.error(`Failed to load ${activeTab} archives`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runAction = async (id, action, type) => {
    setConfirmModalState({ isOpen: false });
    setActionLoading(`${id}:${action}`);

    try {
      if (action === 'restore') {
        await api.post(`/admin/${type}/${id}/restore`);
        toast.success(`${type === 'users' ? 'User' : 'Property'} successfully restored`);
      } else if (action === 'purge') {
        await api.delete(`/admin/${type}/${id}/force`, { data: { password: passwordValueRef.current } });
        toast.success(`${type === 'users' ? 'User' : 'Property'} permanently deleted`);
      }

      if (type === 'properties') {
        setProperties(prev => prev.filter(p => p.id !== id));
      } else {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
      setPasswordValue('');
    } catch (err) {
      console.error(`Failed to ${action} ${type}`, err);
      toast.error(err.response?.data?.message || err.message || `Failed to ${action}`);
      if (action === 'purge') setPasswordValue('');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAction = (id, action, type) => {
    setPasswordValue('');
    const isRestore = action === 'restore';
    const entityName = type === 'users' ? 'User' : 'Property';
    setConfirmModalState({
      isOpen: true,
      title: isRestore ? `Restore ${entityName}` : `Purge ${entityName} Permanently`,
      message: isRestore 
        ? `Are you sure you want to restore this ${entityName.toLowerCase()}? It will return to its previous status before deletion.`
        : `Are you sure you want to completely purge this ${entityName.toLowerCase()}? This action is absolutely irreversible and will delete all associated files and data.`,
      onConfirm: () => runAction(id, action, type),
      confirmText: isRestore ? `Restore ${entityName}` : 'Purge Completely',
      confirmButtonClass: isRestore ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700',
      requirePassword: !isRestore
    });
  };

  const filteredProperties = properties.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-full px-6 py-6">
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Archive className="w-6 h-6 text-indigo-500" />
              System Archives
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Properties and Accounts are safely kept here after soft deletion.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
              <button
                onClick={() => { setActiveTab('properties'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'properties' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Home className="w-4 h-4" /> Properties
              </button>
              <button
                onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'users' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4" /> Users
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-60 pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          </div>
        ) : (
          <>
            {/* PROPERTIES TAB */}
            {activeTab === 'properties' && (
              filteredProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <Archive className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No properties in the archive.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Previous Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deleted At</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredProperties.map(prop => (
                        <tr key={prop.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">{prop.title || 'Untitled'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Owner: {prop.landlord?.first_name || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                              {prop.city || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                              {prop.current_status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                              <CalendarDays className="w-4 h-4 mr-1 text-gray-400" />
                              {new Date(prop.deleted_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                            <button
                              onClick={() => confirmAction(prop.id, 'restore', 'properties')}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              {actionLoading === prop.id + ':restore' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button
                              onClick={() => confirmAction(prop.id, 'purge', 'properties')}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <KeyRound className="w-4 h-4" />
                              {actionLoading === prop.id + ':purge' ? 'Purging...' : 'Purge'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No users in the archive.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deleted At</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.name || 'Unknown')}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {u.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize border border-indigo-100 dark:border-indigo-800">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                              <CalendarDays className="w-4 h-4 mr-1 text-gray-400" />
                              {new Date(u.deleted_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                            <button
                              onClick={() => confirmAction(u.id, 'restore', 'users')}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              {actionLoading === u.id + ':restore' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button
                              onClick={() => confirmAction(u.id, 'purge', 'users')}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <KeyRound className="w-4 h-4" />
                              {actionLoading === u.id + ':purge' ? 'Purging...' : 'Purge'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>

      <ConfirmationModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        confirmButtonClass={confirmModalState.confirmButtonClass}
        requirePassword={confirmModalState.requirePassword}
        passwordValue={passwordValue}
        setPasswordValue={setPasswordValue}
      />
    </div>
  );
};

export default ArchivedProperties;
