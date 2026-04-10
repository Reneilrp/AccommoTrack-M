import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, X, ChevronDown,
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const TYPE_CONFIG = {
  info: { label: 'Info', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', bar: 'border-l-4 border-l-blue-500' },
  warning: { label: 'Warning', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', bar: 'border-l-4 border-l-amber-500' },
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', bar: 'border-l-4 border-l-red-500' },
  maintenance: { label: 'Maintenance', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', bar: 'border-l-4 border-l-purple-500' },
};

const AUDIENCE_LABELS = { all: 'All Users', tenants: 'Tenants Only', landlords: 'Landlords Only' };

const DEFAULT_FORM = {
  title: '',
  message: '',
  target_audience: 'all',
  type: 'info',
  expires_at: '',
};

function BroadcastCard({ broadcast, onToggle, onDelete }) {
  const typeConfig = TYPE_CONFIG[broadcast.type] || TYPE_CONFIG.info;
  const isActive = broadcast.is_active;
  const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < new Date();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${typeConfig.bar} ${
      !isActive || isExpired ? 'opacity-60' : ''
    } border border-gray-200 dark:border-gray-700`}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${typeConfig.cls}`}>
              {typeConfig.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {AUDIENCE_LABELS[broadcast.target_audience] || broadcast.target_audience}
            </span>
            {!isActive && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
            {isExpired && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                Expired
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{broadcast.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{broadcast.message}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>By {broadcast.creator?.first_name} {broadcast.creator?.last_name}</span>
            <span>Created {new Date(broadcast.created_at).toLocaleDateString()}</span>
            {broadcast.expires_at && (
              <span>Expires {new Date(broadcast.expires_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(broadcast)}
            title={isActive ? 'Deactivate' : 'Activate'}
            className={`p-2 rounded-lg transition-colors ${
              isActive
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onDelete(broadcast)}
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateBroadcastModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.expires_at) delete payload.expires_at;
      const res = await api.post('/admin/broadcasts', payload);
      toast.success(res.data?.message || 'Broadcast sent!');
      onCreate(res.data?.data);
      setForm(DEFAULT_FORM);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create broadcast.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            New Broadcast
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={120}
              placeholder="e.g. Scheduled maintenance tonight"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              rows={4}
              maxLength={1000}
              placeholder="Write your message here…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-400 mt-0.5 text-right">{form.message.length}/1000</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Audience</label>
              <select
                value={form.target_audience}
                onChange={(e) => setForm((p) => ({ ...p, target_audience: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Users</option>
                <option value="tenants">Tenants Only</option>
                <option value="landlords">Landlords Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expires At (optional)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              Send Broadcast
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GlobalBroadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/broadcasts');
      const raw = res.data?.data?.data || res.data?.data || [];
      setBroadcasts(Array.isArray(raw) ? raw : []);
    } catch {
      setError('Failed to load broadcasts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleCreate = (newBroadcast) => {
    if (newBroadcast) {
      setBroadcasts((prev) => [newBroadcast, ...prev]);
    }
  };

  const handleToggle = async (broadcast) => {
    try {
      const res = await api.patch(`/admin/broadcasts/${broadcast.id}/toggle`);
      toast.success(res.data?.message || 'Toggled.');
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === broadcast.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch {
      toast.error('Failed to toggle broadcast.');
    }
  };

  const handleDelete = async (broadcast) => {
    if (!window.confirm(`Delete broadcast "${broadcast.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/broadcasts/${broadcast.id}`);
      toast.success('Broadcast deleted.');
      setBroadcasts((prev) => prev.filter((b) => b.id !== broadcast.id));
    } catch {
      toast.error('Failed to delete broadcast.');
    }
  };

  const activeCount = broadcasts.filter((b) => b.is_active && (!b.expires_at || new Date(b.expires_at) > new Date())).length;

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <CreateBroadcastModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Global Broadcasts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Send system-wide alerts and announcements to tenants, landlords, or all users.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </button>
      </div>

      {/* Active count chip */}
      {activeCount > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {activeCount} active broadcast{activeCount !== 1 ? 's' : ''} currently visible to users.
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading broadcasts…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load broadcasts</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchBroadcasts} className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">Retry</button>
          </div>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No broadcasts yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "New Broadcast" to send a platform-wide announcement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <BroadcastCard key={b.id} broadcast={b} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
