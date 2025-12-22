

import React, { useState } from 'react';

export default function Notifications({ notifications, setNotifications }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 transition-all border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          {isEditing && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full ml-2">Editing</span>
          )}
        </div>
        <button
          onClick={() => setIsEditing((prev) => !prev)}
          className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
        >
          {isEditing ? 'Done' : 'Edit Preferences'}
        </button>
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {Object.entries(notifications).filter(([key]) => key.startsWith('email')).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 transition-all">
                <span className="text-sm text-gray-700">
                  {key === 'emailNewBooking' && 'New booking requests'}
                  {key === 'emailPayment' && 'Payment notifications'}
                  {key === 'emailMaintenance' && 'Maintenance requests'}
                </span>
                <button
                  type="button"
                  onClick={() => isEditing && setNotifications({...notifications, [key]: !value})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-600' : 'bg-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isEditing}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">SMS Notifications</h3>
          <div className="space-y-3">
            {Object.entries(notifications).filter(([key]) => key.startsWith('sms')).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 transition-all">
                <span className="text-sm text-gray-700">
                  {key === 'smsPaymentReminder' && 'Payment reminders'}
                  {key === 'smsNewTenant' && 'New tenant notifications'}
                </span>
                <button
                  type="button"
                  onClick={() => isEditing && setNotifications({...notifications, [key]: !value})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-600' : 'bg-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isEditing}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Push Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 transition-all">
              <span className="text-sm text-gray-700">New messages</span>
              <button
                type="button"
                onClick={() => isEditing && setNotifications({...notifications, pushMessages: !notifications.pushMessages})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.pushMessages ? 'bg-green-600' : 'bg-gray-300'
                } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!isEditing}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.pushMessages ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
