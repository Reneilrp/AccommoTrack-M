import React, { useState } from 'react';
import { X, Users, List, CreditCard, CalendarDays } from 'lucide-react';

export default function RoomDetails({ room, isOpen, onClose }) {
  const [showActivity, setShowActivity] = useState(false);

  if (!isOpen || !room) return null;

  const payments = room.payments || [];
  const tenants = room.tenant ? [room.tenant] : (room.tenants || []);
  const activity = room.activity_logs || [];

  const tenant = tenants[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{room.title || `Room ${room.room_number}`}</h3>
            <p className="text-sm text-gray-500">{room.type_label || room.room_type} {room.floor_label ? `• ${room.floor_label}` : ''}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivity(s => !s)}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${showActivity ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} 
              title="Activity logs"
              aria-pressed={showActivity}
            >
              <List className={`w-4 h-4 ${showActivity ? 'text-white' : 'text-gray-600'}`} />
              <span className="text-sm">Activity</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-50">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {/* Single info row: Tenant Name, Age, Contact No., Payments, Due Day */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <div className="text-xs text-gray-500">Tenant Name</div>
              <div className="font-medium text-gray-800">{tenant?.name || tenant || '—'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <div className="text-xs text-gray-500">Age</div>
              <div className="font-medium text-gray-800">{tenant?.age || (tenant && tenant.age) || '—'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <div className="text-xs text-gray-500">Contact No.</div>
              <div className="font-medium text-gray-800">{tenant?.phone || tenant?.contact || '—'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <div className="text-xs text-gray-500">Payments</div>
              <div className="font-medium text-gray-800">
                {room.monthly_rate ? `₱${Number(room.monthly_rate).toLocaleString()}` : (room.daily_rate ? `₱${Number(room.daily_rate).toLocaleString()}` : '—')}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <div className="text-xs text-gray-500">Due Day</div>
              <div className="font-medium text-gray-800">{room.due_day ? `Day ${room.due_day}` : '—'}</div>
            </div>
          </div>

          {/* Pricing removed from details view; pricing is editable in the Edit modal only */}

          {/* Activity panel (shown when activity button clicked) */}
          {showActivity && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Activity Logs</h4>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded for this room.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a, i) => (
                    <li key={i} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div className="text-sm text-gray-800 font-medium">{a.title || a.action || 'Activity'}</div>
                      <div className="text-xs text-gray-500">{a.by || a.user || 'System'} — {a.created_at || a.time || ''}</div>
                      {a.details && <div className="mt-1 text-sm text-gray-700">{a.details}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* If there are tenants, show a small tenants panel */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Tenant Details</h4>
            {tenants.length === 0 ? (
              <p className="text-sm text-gray-500">No tenant assigned.</p>
            ) : (
              <ul className="space-y-2">
                {tenants.map((t, i) => (
                  <li key={i} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                    <div className="font-medium text-gray-800">{t.name || t}</div>
                    {t.email && <div className="text-sm text-gray-500">{t.email}</div>}
                    {t.phone && <div className="text-sm text-gray-500">{t.phone}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
