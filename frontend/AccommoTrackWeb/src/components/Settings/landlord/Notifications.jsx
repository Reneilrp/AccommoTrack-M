

import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function Notifications({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNewBooking: true,
    emailPayment: true,
    emailMaintenance: true,
    smsPaymentReminder: true,
    smsNewTenant: false,
    pushMessages: true
  });

  useEffect(() => {
    if (user?.notification_preferences) {
      setSettings(prev => ({ ...prev, ...user.notification_preferences }));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/me', {
        notification_preferences: settings
      });
      onUpdate?.(res.data.user);
      setIsEditing(false);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 transition-all border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
          {isEditing && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full ml-2">Editing</span>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setSettings(user.notification_preferences || settings); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
            >
              Edit Preferences
            </button>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {[
              { key: 'emailNewBooking', label: 'New booking requests' },
              { key: 'emailPayment', label: 'Payment notifications' },
              { key: 'emailMaintenance', label: 'Maintenance requests' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 transition-all">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  type="button"
                  onClick={() => isEditing && setSettings(s => ({...s, [key]: !s[key]}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[key] ? 'bg-green-600' : 'bg-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isEditing}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[key] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">SMS Notifications</h3>
          <div className="space-y-3">
            {[
              { key: 'smsPaymentReminder', label: 'Payment reminders' },
              { key: 'smsNewTenant', label: 'New tenant notifications' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 transition-all">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  type="button"
                  onClick={() => isEditing && setSettings(s => ({...s, [key]: !s[key]}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[key] ? 'bg-green-600' : 'bg-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isEditing}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[key] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Push Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 transition-all">
              <span className="text-sm text-gray-700 dark:text-gray-300">New messages</span>
              <button
                type="button"
                onClick={() => isEditing && setSettings(s => ({...s, pushMessages: !s.pushMessages}))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.pushMessages ? 'bg-green-600' : 'bg-gray-300'
                } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!isEditing}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pushMessages ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader2 = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
