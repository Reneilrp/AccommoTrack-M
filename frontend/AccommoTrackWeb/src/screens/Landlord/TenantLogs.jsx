import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, MessageSquare, Inbox, ArrowLeft, Calendar } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  
  const [paymentFilter, setPaymentFilter] = useState('all'); 
  const [paymentSort, setPaymentSort] = useState({ key: 'date', dir: 'desc' });
  const [paymentGroup, setPaymentGroup] = useState('none'); 

  useEffect(() => {
    const load = async () => {
      try {
        if (!cachedData) setLoading(true);
        setError(null);

        let tenantId = id || null;

        if (!tenantId && searchParam) {
          try {
            const res = await api.get(`/landlord/tenants?search=${encodeURIComponent(searchParam)}`);
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            if (list.length === 1) {
              tenantId = list[0].id || list[0].tenant_id || list[0].tenantId || (list[0].user && list[0].user.id) || null;
            } else if (list.length > 1) {
              setTenant(null);
              setPayments([]);
              setSearchResults(list);
              setLoading(false);
              return;
            }
          } catch (e) { console.error(e); }
        }

        if (!tenantId) {
          setTenant(null);
          setPayments([]);
          setSearchResults([]);
          setLoading(false);
          return;
        }

        let tenantData = null;
        try {
          const tRes = await api.get(`/landlord/tenants/${tenantId}`);
          tenantData = tRes.data || null;
          setTenant(tenantData);
        } catch (e) {
          tenantData = { id: tenantId, name: searchParam || `Tenant ${tenantId}` };
          setTenant(tenantData);
        }

        let payList = [];
        let paid = [];
        let dueSumCents = 0;

        try {
          const payRes = await api.get(`/invoices?tenant_id=${tenantId}&t=${Date.now()}`);
          payList = Array.isArray(payRes.data) ? payRes.data : (payRes.data?.data || payRes.data || []);
          setPayments(payList);

          paid = payList.filter(inv => (inv.status === 'paid') || inv.paid_at);
          const unpaid = payList.filter(inv => !(inv.status === 'paid' || inv.paid_at));
          setPreviousPayments(paid);
          dueSumCents = unpaid.reduce((sum, inv) => sum + (inv.amount_cents || inv.total_cents || 0), 0);
          setDueAmount(dueSumCents / 100);

          if (tenantData && tenantData.room) {
            setCurrentRoom(tenantData.room);
          } else {
            const invoiceWithBooking = payList.find(inv => inv.booking_id);
            if (invoiceWithBooking?.booking_id) {
              try {
                const bRes = await api.get(`/bookings/${invoiceWithBooking.booking_id}`);
                const booking = bRes.data;
                if (booking?.room) {
                  setCurrentRoom({
                    room_number: booking.room.room_number,
                    type_label: booking.room.room_type || booking.room.room_type_label,
                    id: booking.room.id
                  });
                }
              } catch (e) { /* ignore */ }
            }
          }
        } catch (e) {
          setPayments([]);
        }

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
        setError(err.response?.data?.message || err.message || 'Failed to load tenant');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, searchParam]);

  // Helper formatting functions
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
    return (getDateValue(a) - getDateValue(b)) * (paymentSort.dir === 'asc' ? 1 : -1);
  };

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
        label = month ? `${new Date(2000, month - 1).toLocaleString(undefined, { month: 'long' })} ${year}` : String(year);
      }
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key).items.push(inv);
    });
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }

  function formatAmount(inv) {
    const val = getAmountNumber(inv);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(d) {
    try { return new Date(d).toLocaleDateString(); } catch (e) { return d; }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Loading tenant logs...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900">
        <p className="text-red-700 dark:text-red-400 font-medium">Error</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">Back</button>
      </div>
    </div>
  );

  const allPaid = (previousPayments || []);
  const allDue = (payments || []).filter(inv => !(inv.status === 'paid' || inv.paid_at));
  const displayedItems = [...(paymentFilter === 'due' ? [] : allPaid), ...(paymentFilter === 'paid' ? [] : allDue)].sort(sortFn);
  const groupedData = groupPayments(displayedItems, paymentGroup);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 space-y-6 pb-10">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between mx-4 md:mx-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-white">
            Activity Logs: {tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant'}
          </span>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Column 1: Profile */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-fit">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 border-b dark:border-gray-700 pb-2">Tenant Profile</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg">
                {tenant?.first_name?.charAt(0) || tenant?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : tenant?.name || '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{tenant?.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Current Room</p>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-200">
                  {currentRoom ? `Room ${currentRoom.room_number} • ${currentRoom.type_label || 'Active'}` : 'No active room'}
                </p>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Total Outstanding</p>
                <p className="font-bold text-lg text-red-700 dark:text-red-400">₱{dueAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Column 2-3: Ledger */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-500" /> Payment Ledger
              </h3>
              <select
                value={paymentGroup}
                onChange={(e) => setPaymentGroup(e.target.value)}
                className="text-xs font-bold uppercase p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="none">No Grouping</option>
                <option value="monthly">By Month</option>
                <option value="yearly">By Year</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
              {['all', 'paid', 'due'].map(f => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentFilter === f ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 font-medium">No transaction records found</p>
                </div>
              ) : (
                groupedData.map((group) => (
                  <div key={group.key} className="space-y-3">
                    {group.label && (
                      <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {group.label}
                      </h4>
                    )}
                    {group.items.map((inv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">₱{formatAmount(inv)}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{formatDate(inv.paid_at || inv.due_date || inv.created_at)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${(inv.status === 'paid' || inv.paid_at) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {(inv.status === 'paid' || inv.paid_at) ? 'PAID' : 'DUE'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Messages / Search Results Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500"/> Messages / Search Results
          </h3>
          {searchResults.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No alternate tenant matches or messages found.</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((m) => {
                const tenantId = m.id || m.tenant_id || m.tenantId || (m.user && m.user.id);
                const displayName = m.first_name ? `${m.first_name} ${m.last_name || ''}` : (m.name || m.email || 'Unknown');
                return (
                  <li key={tenantId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{m.email || 'No email'}</div>
                    </div>
                    <button onClick={() => navigate(`/tenants/${tenantId}`)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold">Open</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}