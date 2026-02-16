import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, MessageSquare, Inbox, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function TenantLogs() {
  const { id } = useParams();
  const { uiState, updateData } = useUIState();
  const cacheKey = `landlord_tenant_logs_${id}`;
  const cachedData = uiState.data?.[cacheKey] || cacheManager.get(cacheKey);

  const location = window.location;
  const urlParams = new URLSearchParams(location.search);
  const searchParam = urlParams.get('search');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!cachedData);
  const [tenant, setTenant] = useState(cachedData?.tenant || null);
  const [payments, setPayments] = useState(cachedData?.payments || []);
  const [previousPayments, setPreviousPayments] = useState(cachedData?.previousPayments || []);
  const [dueAmount, setDueAmount] = useState(cachedData?.dueAmount || 0);
  const [currentRoom, setCurrentRoom] = useState(cachedData?.currentRoom || null);
  // `searchResults` holds either tenant search results (when multiple matches)
  // or message-like objects if we extend this later. Renamed for clarity.
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  // Client-side controls for payments
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'paid' | 'due'
  const [paymentSort, setPaymentSort] = useState({ key: 'date', dir: 'desc' });
  const [paymentGroup, setPaymentGroup] = useState('none'); // 'none' | 'monthly' | 'yearly'

  useEffect(() => {
    const load = async () => {
      try {
        if (!cachedData) setLoading(true);
        setError(null);

        let tenantId = id || null;

        // If no id supplied but search param exists, try to find tenant by search
        if (!tenantId && searchParam) {
          try {
            // Try common search param on API - best-effort
            const res = await api.get(`/landlord/tenants?search=${encodeURIComponent(searchParam)}`);
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            if (list.length === 1) {
              tenantId = list[0].id || list[0].tenant_id || list[0].tenantId || (list[0].user && list[0].user.id) || null;
            } else if (list.length > 1) {
              // Show search results (multiple tenants) so the user can pick one
              setTenant(null);
              setPayments([]);
              setSearchResults(list);
              setLoading(false);
              return;
            }
          } catch (e) {
            // ignore and proceed
          }
        }

        if (!tenantId) {
          // nothing else we can do
          setTenant(null);
          setPayments([]);
          setSearchResults([]);
          setLoading(false);
          return;
        }

        // Try to fetch tenant details (may include booking/payment summary)
        let tenantData = null;
        try {
          const tRes = await api.get(`/landlord/tenants/${tenantId}`);
          tenantData = tRes.data || null;
          setTenant(tenantData);
        } catch (e) {
          // Some backends may not support GET on this route (405) — don't treat this as fatal.
          console.warn('Could not fetch tenant details, continuing to load payments/messages', e?.response?.status);
          // Provide a minimal tenant object so the UI can render a header.
          tenantData = { id: tenantId, name: searchParam || `Tenant ${tenantId}` };
          setTenant(tenantData);
        }

        // Payments: invoices endpoint supports filtering by tenant_id
        try {
          const payRes = await api.get(`/invoices?tenant_id=${tenantId}&t=${Date.now()}`);
          // InvoiceController returns a paginated object; prefer `.data` when present
          const payList = Array.isArray(payRes.data) ? payRes.data : (payRes.data?.data || payRes.data || []);
          setPayments(payList);

          // Derive previous payments (paid invoices) and outstanding due
          const paid = (payList || []).filter(inv => (inv.status === 'paid') || inv.paid_at);
          const unpaid = (payList || []).filter(inv => !(inv.status === 'paid' || inv.paid_at));
          setPreviousPayments(paid);
          const dueSumCents = unpaid.reduce((sum, inv) => sum + (inv.amount_cents || inv.total_cents || 0), 0);
          setDueAmount(dueSumCents / 100);

          // Try to resolve current room from tenant details (use tenantData) or from the most recent invoice with booking_id
          if (tenantData && tenantData.room) {
            setCurrentRoom(tenantData.room);
          } else {
            const invoiceWithBooking = (payList || []).find(inv => inv.booking_id);
            if (invoiceWithBooking && invoiceWithBooking.booking_id) {
              try {
                const bRes = await api.get(`/bookings/${invoiceWithBooking.booking_id}`);
                const booking = bRes.data;
                if (booking && booking.room) {
                  setCurrentRoom({
                    room_number: booking.room.room_number,
                    type_label: booking.room.room_type || booking.room.room_type_label,
                    id: booking.room.id
                  });
                }
              } catch (e) {
                // ignore booking fetch errors
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load invoices for tenant', e?.response?.status);
          setPayments([]);
        }

        // Messages/searchResults: no dedicated messages route on this backend.
        // Leave search results empty when we have a single tenant loaded.
        setSearchResults([]);

        // Update cache
        const combined = { 
          tenant: tenantData, 
          payments: payList, 
          previousPayments: paid, 
          dueAmount: dueSumCents / 100, 
          currentRoom: tenantData?.room || null 
        };
        updateData(cacheKey, combined);
        cacheManager.set(cacheKey, combined);
      } catch (err) {
        console.error('Failed to load tenant logs', err);
        setError(err.response?.data?.message || err.message || 'Failed to load tenant');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, searchParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading tenant logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900">
          <p className="text-red-700 dark:text-red-400 font-medium">Error</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error}</p>
          <div className="mt-4 text-right">
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">Back</button>
          </div>
        </div>
      </div>
    );
  }

  // Compute filtered and sorted payment lists based on client controls
  const allPaid = (previousPayments || []);
  const allDue = (payments || []).filter(inv => !(inv.status === 'paid' || inv.paid_at));

  const getAmountNumber = (inv) => {
    const cents = inv.amount_cents ?? inv.total_cents ?? null;
    if (typeof cents === 'number') return cents / 100;
    const asNum = Number(inv.amount);
    return Number.isFinite(asNum) ? asNum : 0;
  };

  const getDateValue = (inv) => {
    const d = inv.paid_at || inv.created_at || inv.due_date;
    const t = d ? new Date(d).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const sortFn = (a, b) => {
    if (paymentSort.key === 'amount') {
      return (getAmountNumber(a) - getAmountNumber(b)) * (paymentSort.dir === 'asc' ? 1 : -1);
    }
    // default to date
    return (getDateValue(a) - getDateValue(b)) * (paymentSort.dir === 'asc' ? 1 : -1);
  };

  const sortedPaid = [...allPaid].sort(sortFn);
  const sortedDue = [...allDue].sort(sortFn);

  const displayedPaid = paymentFilter === 'due' ? [] : sortedPaid;
  const displayedDue = paymentFilter === 'paid' ? [] : sortedDue;

  // Grouping helpers
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' });

  function groupPayments(items, grouping) {
    if (!grouping || grouping === 'none') return [{ key: 'all', label: null, items }];
    const map = new Map();
    items.forEach((inv) => {
      const d = inv.paid_at || inv.created_at || inv.due_date;
      const dt = d ? new Date(d) : null;
      const year = dt ? dt.getFullYear() : 'unknown';
      const month = dt ? dt.getMonth() + 1 : null;
      let key, label;
      if (grouping === 'yearly') {
        key = String(year);
        label = key;
      } else if (grouping === 'monthly') {
        key = `${year}-${String(month).padStart(2, '0')}`;
        label = month ? `${monthName(month)} ${year}` : String(year);
      }
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key).items.push(inv);
    });
    // Convert to array and sort groups by key (desc by default)
    const groups = Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
    // Within each group, sort using same sortFn
    groups.forEach((g) => (g.items = g.items.sort(sortFn)));
    return groups;
  }

  const groupedPaid = groupPayments(displayedPaid, paymentGroup);
  const groupedDue = groupPayments(displayedDue, paymentGroup);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all" title="Go Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <span className="text-sm font-bold text-gray-700 dark:text-white">
            Logs for {tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant'}
          </span>
        </div>
      </div>

      <div className="min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center w-full">User Profile</h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : tenant?.name || '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tenant?.email || tenant?.contact || 'No contact'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Status: <span className="font-medium">{tenant?.tenantProfile?.status || '—'}</span></p>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Room</p>
              <p className="font-medium text-sm dark:text-gray-200">{currentRoom ? `Room ${currentRoom.room_number} ${currentRoom.type_label ? `• ${currentRoom.type_label}` : ''}` : '—'}</p>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Due</p>
              <p className="font-medium text-sm text-red-700 dark:text-red-400">₱{dueAmount ? dueAmount.toFixed(2) : '0.00'}</p>
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 justify-center"><CreditCard className="w-4 h-4"/> Payments</h3>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setPaymentFilter('all')} className={`px-2 py-1 rounded text-sm ${paymentFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>All</button>
                <button onClick={() => setPaymentFilter('paid')} className={`px-2 py-1 rounded text-sm ${paymentFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Paid</button>
                <button onClick={() => setPaymentFilter('due')} className={`px-2 py-1 rounded text-sm ${paymentFilter === 'due' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Due</button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Sort</label>
                <select
                  value={`${paymentSort.key}_${paymentSort.dir}`}
                  onChange={(e) => {
                    const [key, dir] = e.target.value.split('_');
                    setPaymentSort({ key, dir });
                  }}
                  className="text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="date_desc">Date ▾</option>
                  <option value="date_asc">Date ▴</option>
                  <option value="amount_desc">Amount ▾</option>
                  <option value="amount_asc">Amount ▴</option>
                </select>
                <label className="text-xs text-gray-500 dark:text-gray-400 ml-2">Group</label>
                <select
                  value={paymentGroup}
                  onChange={(e) => setPaymentGroup(e.target.value)}
                  className="text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="none">None</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No payments found.</p>
            ) : (
              <>
                {paymentFilter !== 'due' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{paymentFilter === 'paid' ? 'Paid Payments' : 'Paid Payments'}</p>
                )}
                {paymentGroup === 'none' ? (
                  <ul className="space-y-2 mb-3">
                    {displayedPaid.map((p) => (
                      <li key={p.id || `${p.reference}-${p.created_at}`} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium dark:text-white">{p.reference || p.description || 'Payment'}</div>
                            {/* booking room badge if available */}
                            {((p.booking && p.booking.room) || currentRoom) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{p.booking?.room?.room_number ? `Room ${p.booking.room.room_number}` : (currentRoom ? `Room ${currentRoom.room_number}` : null)}</div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{p.paid_at ? formatDate(p.paid_at) : (p.created_at ? formatDate(p.created_at) : '')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold dark:text-white">₱{formatAmount(p)}</div>
                          {/* show payment status badge */}
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(p.status || p.payment_status)}`}>
                            {(p.status || p.payment_status || '').toString().charAt(0).toUpperCase() + (p.status || p.payment_status || '').toString().slice(1) || ''}
                          </span>
                          {/* show booking status if present */}
                          {p.booking?.status && (
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.booking.status)}`}>
                              {p.booking.status.charAt(0).toUpperCase() + p.booking.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4 mb-3">
                    {groupedPaid.map((g) => (
                      <div key={g.key}>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2">{g.label}</div>
                        <ul className="space-y-2">
                          {g.items.map((p) => (
                            <li key={p.id || `${p.reference}-${p.created_at}`} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600 flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium dark:text-white">{p.reference || p.description || 'Payment'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{p.paid_at ? formatDate(p.paid_at) : (p.created_at ? formatDate(p.created_at) : '')}</div>
                              </div>
                              <div className="text-sm font-semibold dark:text-white">₱{formatAmount(p)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {paymentFilter !== 'paid' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Outstanding / Due</p>
                )}

                {paymentGroup === 'none' ? (
                  <ul className="space-y-2 mb-3">
                    {displayedDue.map((p) => (
                      <li key={`due-${p.id || p.reference}`} className="p-3 bg-white dark:bg-gray-800 rounded border border-yellow-100 dark:border-yellow-900 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium dark:text-white">{p.reference || p.description || 'Invoice'}</div>
                            {((p.booking && p.booking.room) || currentRoom) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{p.booking?.room?.room_number ? `Room ${p.booking.room.room_number}` : (currentRoom ? `Room ${currentRoom.room_number}` : null)}</div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">₱{formatAmount(p)}</div>
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(p.status || p.payment_status)}`}>
                            {(p.status || p.payment_status || '').toString().charAt(0).toUpperCase() + (p.status || p.payment_status || '').toString().slice(1) || ''}
                          </span>
                          {p.booking?.status && (
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.booking.status)}`}>
                              {p.booking.status.charAt(0).toUpperCase() + p.booking.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4 mb-3">
                    {groupedDue.map((g) => (
                      <div key={g.key}>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2">{g.label}</div>
                        <ul className="space-y-2">
                          {g.items.map((p) => (
                            <li key={`due-${p.id || p.reference}`} className="p-3 bg-white dark:bg-gray-800 rounded border border-yellow-100 dark:border-yellow-900 flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium dark:text-white">{p.reference || p.description || 'Invoice'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}</div>
                              </div>
                              <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">₱{formatAmount(p)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 justify-center"><MessageSquare className="w-4 h-4"/> Messages / Search Results</h3>
          {searchResults.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No messages or requests from this tenant.</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((m) => {
                const tenantId = m.id || m.tenant_id || m.tenantId || (m.user && m.user.id);
                const displayName = m.first_name ? `${m.first_name} ${m.last_name || ''}` : (m.name || m.email || m.contact || 'Unknown');
                return (
                  <li key={tenantId || m.created_at || JSON.stringify(m)} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600 flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{m.email || m.contact || (m.created_at ? formatDate(m.created_at) : '')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => tenantId && navigate(`/tenants/${tenantId}`)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Open</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  // Helper functions for formatting
  function formatAmount(inv) {
    const cents = inv.amount_cents ?? inv.total_cents ?? null;
    if (typeof cents === 'number') return (cents / 100).toFixed(2);
    if (inv.amount) {
      const asNum = Number(inv.amount);
      if (!Number.isNaN(asNum)) return asNum.toFixed(2);
      return inv.amount;
    }
    return '—';
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleString();
    } catch (e) {
      return d;
    }
  }

  // Reuse bookings status/payment badge colors for consistency
  function getStatusColor(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch ((status || '').toString().toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'partial-completed': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getPaymentColor(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch ((status || '').toString().toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
