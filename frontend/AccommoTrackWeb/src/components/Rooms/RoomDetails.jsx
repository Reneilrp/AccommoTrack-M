import React, { useState, useEffect } from 'react';
import { X, Users, List, CreditCard, CalendarDays, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function RoomDetails({ room, isOpen, onClose, onExtend, propertyType }) {
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [extensionValues, setExtensionValues] = useState({});
  const [extending, setExtending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && showActivity && room?.id) {
      fetchRoomActivity();
    }
  }, [isOpen, showActivity, room?.id]);

  const fetchRoomActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await api.get(`/landlord/dashboard/recent-activities?room_id=${room.id}`);
      setActivity(res.data || []);
    } catch (err) {
      console.error('Failed to fetch room activity', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  if (!isOpen || !room) return null;

  const __payments = room.payments || [];
  const tenants = (Array.isArray(room.tenants) && room.tenants.length > 0)
    ? room.tenants
    : (room.tenant ? (typeof room.tenant === 'string' ? [{ name: room.tenant }] : [room.tenant]) : []);
  const normalizedGender = String(room.gender_restriction || 'mixed').toLowerCase().trim();
  const normalizedPropertyType = String(propertyType || room.property_type || room.property?.property_type || '').toLowerCase().trim();
  const showGenderBadge = !(normalizedPropertyType === 'apartment' && normalizedGender === 'mixed');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{room.title || `Room ${room.room_number}`}</h3>
              {showGenderBadge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  room.gender_restriction === 'male' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' 
                    : room.gender_restriction === 'female'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}>
                  {room.gender_restriction === 'male' ? 'Boys' : room.gender_restriction === 'female' ? 'Girls' : 'Mixed'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.type_label || room.room_type} {room.floor_label ? `• ${room.floor_label}` : ''}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivity(s => !s)}
              className={`px-4 py-2.5 rounded-md text-sm flex items-center gap-2 ${showActivity ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`} 
              title="Activity logs"
              aria-pressed={showActivity}
            >
              <List className={`w-4 h-4 ${showActivity ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              <span className="text-sm">Activity</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {/* Tenant info presented as a responsive table-like grid. On small screens
              this falls back to stacked cards for readability. Columns: Tenant Name,
              Age, Contact No., Payments, Due Day, Extension */}
          <div className="mb-4">
            {/* Header row for md+ */}
            <div className="hidden md:grid grid-cols-4 gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
              <div>Tenant Name</div>
              <div>Contact No.</div>
              <div>Payments</div>
              <div>Extension</div>
            </div>

            {tenants.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">No tenant assigned.</div>
            ) : (
              <div className="space-y-2">
                {tenants.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md border border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Tenant Name</div>
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
                        className="font-medium text-gray-800 dark:text-white text-left hover:underline"
                      >
                        {t.name || `${t.first_name ? `${t.first_name} ${t.last_name}` : t}`}
                      </button>
                      {t.email && <div className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{t.email}</div>}
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Contact No.</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{t.phone || t.contact || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Payments</div>
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
                        className="font-medium text-gray-800 dark:text-gray-200 hover:underline text-left"
                      >
                        {room.monthly_rate ? `₱${Number(room.monthly_rate).toLocaleString()}` : (room.daily_rate ? `₱${Number(room.daily_rate).toLocaleString()}` : '—')}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Extension</div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
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
                            className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            aria-label="Extension value"
                          />
                          {/* Mini Price Preview */}
                          <div className="absolute -top-5 left-0 whitespace-nowrap text-[10px] font-bold text-green-600 dark:text-green-400">
                            Est: ₱{(() => {
                              const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                              const val = extensionValues[idKey] ?? 1;
                              const monthly = Number(room.monthly_rate) || 0;
                              const daily = Number(room.daily_rate) || (monthly / 30);
                              return (val * daily).toLocaleString(undefined, { maximumFractionDigits: 0 });
                            })()}
                          </div>
                        </div>
                          <button
                            disabled={extending}
                            onClick={async () => {
                              if (!onExtend) return;
                              const tenantId = t?.id || t?.tenant_id || t?.tenantId || null;
                              const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                              const days = extensionValues[idKey] ?? 1;
                              
                              if (!window.confirm(`Extend stay for ${days} days? This will generate an invoice.`)) return;
                              
                              setExtending(true);
                              try {
                                await onExtend({ roomId: room.id, days: Number(days), tenant_id: tenantId });
                              } catch (__e) {
                                // parent handles error
                              } finally {
                                setExtending(false);
                              }
                            }}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 text-xs font-bold uppercase"
                        >
                          Days
                        </button>
                        <button
                          disabled={extending}
                          onClick={async () => {
                            if (!onExtend) return;
                            const tenantId = t?.id || t?.tenant_id || t?.tenantId || null;
                            const idKey = t?.id || t?.tenant_id || t?.tenantId || `idx_${i}`;
                            const months = extensionValues[idKey] ?? 1;

                            if (!window.confirm(`Extend stay for ${months} month(s)? This will generate an invoice.`)) return;

                            setExtending(true);
                            try {
                                await onExtend({ roomId: room.id, months: Number(months), tenant_id: tenantId });
                            } catch (__e) {
                              // parent handles error
                            } finally {
                              setExtending(false);
                            }
                          }}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 text-xs font-bold uppercase"
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
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Activity Logs</h4>
              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded for this room.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a, i) => (
                    <li key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-800 dark:text-gray-200 font-bold">{a.action || a.title || 'Activity'}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">
                          {new Date(a.timestamp || a.created_at || a.time).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a.description || a.details}</div>
                      {a.status && (
                        <div className="mt-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.color === 'green' ? 'bg-green-100 text-green-700' :
                            a.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            a.color === 'red' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      )}
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
