import React, { useState } from 'react';
import { X, Users, List, CreditCard, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RoomDetails({ room, isOpen, onClose, onExtend }) {
  const [showActivity, setShowActivity] = useState(false);
  const [extensionValues, setExtensionValues] = useState({});
  const [extending, setExtending] = useState(false);
  const navigate = useNavigate();

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
          {/* Tenant info presented as a responsive table-like grid. On small screens
              this falls back to stacked cards for readability. Columns: Tenant Name,
              Age, Contact No., Payments, Due Day, Extension */}
          <div className="mb-4">
            {/* Header row for md+ */}
            <div className="hidden md:grid grid-cols-4 gap-3 text-xs text-gray-500 mb-2 px-1">
              <div>Tenant Name</div>
              <div>Contact No.</div>
              <div>Payments</div>
              <div>Extension</div>
            </div>

            {tenants.length === 0 ? (
              <div className="text-sm text-gray-500">No tenant assigned.</div>
            ) : (
              <div className="space-y-2">
                {tenants.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center bg-gray-50 p-3 rounded-md border border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 md:hidden">Tenant Name</div>
                      <button
                        onClick={() => {
                          const tenantId = t?.id || t?.tenant_id || t?.tenantId || t?.user_id || t?.user?.id || null;
                          const displayName = t?.name || (t?.first_name ? `${t.first_name} ${t.last_name}` : String(t));
                          if (tenantId) {
                            navigate(`/tenants/${tenantId}`);
                          } else {
                            // fallback to tenant logs search which will try to resolve the tenant
                            navigate(`/tenants/logs?search=${encodeURIComponent(displayName)}`);
                          }
                        }}
                        className="font-medium text-gray-800 text-left hover:underline"
                      >
                        {t.name || `${t.first_name ? `${t.first_name} ${t.last_name}` : t}`}
                      </button>
                      {t.email && <div className="text-sm text-gray-500 hidden md:block">{t.email}</div>}
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 md:hidden">Contact No.</div>
                      <div className="font-medium text-gray-800">{t.phone || t.contact || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 md:hidden">Payments</div>
                      <button
                        onClick={() => {
                          const tenantId = t?.id || t?.tenant_id || t?.tenantId || t?.user_id || t?.user?.id || null;
                          const displayName = t?.name || (t?.first_name ? `${t.first_name} ${t.last_name}` : String(t));
                          if (tenantId) {
                            navigate(`/tenants/${tenantId}`);
                          } else {
                            navigate(`/tenants/logs?search=${encodeURIComponent(displayName)}`);
                          }
                        }}
                        className="font-medium text-gray-800 hover:underline text-left"
                      >
                        {room.monthly_rate ? `₱${Number(room.monthly_rate).toLocaleString()}` : (room.daily_rate ? `₱${Number(room.daily_rate).toLocaleString()}` : '—')}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500 md:hidden">Extension</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={(() => {
                            const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                            return extensionValues[idKey] ?? 1;
                          })()}
                          onChange={(e) => {
                            const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                            setExtensionValues(prev => ({ ...prev, [idKey]: Number(e.target.value || 1) }));
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                          aria-label="Extension days"
                        />
                          <button
                            disabled={extending}
                            onClick={async () => {
                              if (!onExtend) return;
                              setExtending(true);
                              try {
                                const tenantId = t?.id || t?.tenant_id || t?.tenantId || null;
                                const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                                const days = extensionValues[idKey] ?? 1;
                                await onExtend({ roomId: room.id, days: Number(days), tenantId });
                              } catch (e) {
                                // parent handles error
                              } finally {
                                setExtending(false);
                              }
                            }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 text-sm"
                        >
                          Days
                        </button>
                        <button
                          disabled={extending}
                          onClick={async () => {
                            if (!onExtend) return;
                            setExtending(true);
                            try {
                                const tenantId = t?.id || t?.tenant_id || t?.tenantId || null;
                                const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                                const days = extensionValues[idKey] ?? 1;
                                await onExtend({ roomId: room.id, months: 1, tenantId });
                            } catch (e) {
                              // parent handles error
                            } finally {
                              setExtending(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 text-sm"
                        >
                          Month
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

          {/* Extension controls have been moved into the Extension column above. */}
        </div>
      </div>
    </div>
  );
}
