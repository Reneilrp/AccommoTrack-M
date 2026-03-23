import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  CreditCard, 
  MessageSquare, 
  Inbox, 
  ArrowLeft, 
  Calendar, 
  History, 
  Wrench, 
  Sparkles, 
  CalendarDays,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Shuffle
} from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import PriceRow from '../../components/Shared/PriceRow';
import toast from 'react-hot-toast';

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
  const [historyData, setHistoryData] = useState(cachedData?.historyData || { bookings: [], maintenance: [], addons: [], transfers: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('payments'); // 'payments', 'bookings', 'maintenance', 'addons'
  const [paymentFilter, setPaymentFilter] = useState('all'); 
  const [paymentSort] = useState({ key: 'date', dir: 'desc' });
  const [paymentGroup, setPaymentGroup] = useState('none'); 
  const [handlingTransferId, setHandlingTransferId] = useState(null);
  const [transferForms, setTransferForms] = useState({});

  const updateTransferForm = (transferId, patch) => {
    setTransferForms((prev) => ({
      ...prev,
      [transferId]: {
        ...(prev[transferId] || {
          damage_charge: '',
          damage_description: '',
          landlord_notes: '',
        }),
        ...patch,
      },
    }));
  };

  const getTransferForm = (transferId) => {
    return transferForms[transferId] || {
      damage_charge: '',
      damage_description: '',
      landlord_notes: '',
    };
  };

  const handleTransferAction = async (transfer, action) => {
    const form = getTransferForm(transfer.id);
    const damageCharge = Number(form.damage_charge || 0);

    if (action === 'approve' && damageCharge > 0 && !String(form.damage_description || '').trim()) {
      toast.error('Damage description is required when damage charge is set.');
      return;
    }

    const payload = {
      action,
      landlord_notes: String(form.landlord_notes || '').trim() || undefined,
      damage_charge: damageCharge > 0 ? damageCharge : undefined,
      damage_description:
        damageCharge > 0 ? String(form.damage_description || '').trim() : undefined,
    };

    setHandlingTransferId(transfer.id);
    try {
      await api.patch(`/landlord/transfers/${transfer.id}/handle`, payload);

      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      setHistoryData((prev) => ({
        ...prev,
        transfers: (prev.transfers || []).map((item) =>
          item.id === transfer.id
            ? {
                ...item,
                status: nextStatus,
                handled_at: new Date().toISOString(),
                landlord_notes: payload.landlord_notes || item.landlord_notes || null,
              }
            : item,
        ),
      }));

      toast.success(`Transfer ${nextStatus} successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transfer request.');
    } finally {
      setHandlingTransferId(null);
    }
  };

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

        // Fetch Detailed Tenant Data
        const tRes = await api.get(`/landlord/tenants/${tenantId}`);
        const tenantData = tRes.data || null;
        setTenant(tenantData);
        if (tenantData.history) {
          setHistoryData({
            bookings: tenantData.history.bookings || [],
            maintenance: tenantData.history.maintenance || [],
            addons: tenantData.history.addons || [],
            transfers: tenantData.history.transfers || [],
          });
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
              } catch { /* ignore */ }
            }
          }
        } catch {
          setPayments([]);
        }

        const combined = { 
          tenant: tenantData, 
          payments: payList, 
          previousPayments: paid, 
          dueAmount: dueSumCents / 100, 
          currentRoom: tenantData?.room || null,
          historyData: tenantData?.history || { bookings: [], maintenance: [], addons: [], transfers: [] }
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
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
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
  
  // Defer tab definition until data is available
  const tabs = tenant ? [
    { id: 'payments', label: 'Payments', icon: CreditCard, count: (payments || []).length },
    { id: 'bookings', label: 'Bookings', icon: History, count: (historyData?.bookings || []).length },
    { id: 'transfers', label: 'Transfers', icon: Shuffle, count: (historyData?.transfers || []).length },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, count: (historyData?.maintenance || []).length },
    { id: 'addons', label: 'Add-ons', icon: Sparkles, count: (historyData?.addons || []).length },
  ] : [];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Loading tenant logs...</p>
      </div>
    </div>
  );

  if (!tenant && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-yellow-100 dark:border-yellow-900">
          <p className="text-yellow-700 dark:text-yellow-400 font-medium">Tenant Not Found</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error || 'The requested tenant could not be found or you may not have access.'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">Back</button>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900">
        <p className="text-red-700 dark:text-red-400 font-medium">Error</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 space-y-6 pb-10">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between mx-4 md:mx-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-tight">
            Detailed History: {tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant'}
          </span>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Column 1: Profile & Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-fit">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4 border-b dark:border-gray-700 pb-2">Tenant Profile</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xl">
                  {tenant?.first_name?.charAt(0) || tenant?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{tenant?.first_name ? `${tenant.first_name} ${tenant.last_name}` : tenant?.name || '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">{tenant?.email || 'No email provided'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{tenant?.phone || 'No phone'}</p>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase mb-2">Date of Birth</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                    {tenant?.date_of_birth ? formatDate(tenant.date_of_birth) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase mb-2">Gender</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-200 capitalize">
                    {tenant?.gender || '—'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase mb-2">Current Room</p>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-200">
                    {currentRoom ? `Room ${currentRoom.room_number} • ${currentRoom.type_label || 'Active'}` : 'No active room'}
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Total Outstanding</p>
                  <p className="font-bold text-lg text-red-700 dark:text-red-400">₱{dueAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Room Transfer Log Extract from profile notes */}
            {tenant?.tenantProfile?.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4 border-b dark:border-gray-700 pb-2">Internal Notes & History</h3>
                <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {tenant.tenantProfile.notes}
                </div>
              </div>
            )}
          </div>

          {/* Column 2-3: Main Detailed History Container */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            {/* Tab Navigation */}
            <div className="flex border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'border-green-600 text-green-600 bg-white dark:bg-gray-800 shadow-[0_-4px_0_0_inset_#16a34a]' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[700px] scrollbar-thin">
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      {['all', 'paid', 'due'].map(f => (
                        <button
                          key={f}
                          onClick={() => setPaymentFilter(f)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${paymentFilter === f ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <select
                      value={paymentGroup}
                      onChange={(e) => setPaymentGroup(e.target.value)}
                      className="text-[10px] font-bold uppercase p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white outline-none"
                    >
                      <option value="none">No Grouping</option>
                      <option value="monthly">Monthly View</option>
                      <option value="yearly">Yearly View</option>
                    </select>
                  </div>

                  {payments.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-500 font-medium">No transaction records found</p>
                    </div>
                  ) : (
                    groupedData.map((group) => (
                      <div key={group.key} className="space-y-4">
                        {group.label && (
                          <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mt-4 first:mt-0">
                            <Calendar className="w-3 h-3" /> {group.label}
                          </h4>
                        )}
                        {group.items.map((inv, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-900/50 transition-colors group">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">₱{formatAmount(inv)}</p>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500">#{inv.reference || inv.id}</span>
                              </div>
                              <p className="text-[10px] text-gray-500 uppercase mt-0.5">{formatDate(inv.paid_at || inv.due_date || inv.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`px-2 py-2 rounded text-[10px] font-bold uppercase ${(inv.status === 'paid' || inv.paid_at) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {(inv.status === 'paid' || inv.paid_at) ? 'PAID' : 'DUE'}
                              </span>
                              <button onClick={() => navigate('/payments')} className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-all">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  {historyData.bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No booking history</p>
                    </div>
                  ) : (
                    historyData.bookings.map((booking) => (
                      <div key={booking.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 dark:text-white">{booking.room?.property?.title || 'Property'}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                booking.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Room {booking.room?.room_number} • {booking.booking_reference}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">₱{parseFloat(booking.total_amount).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{booking.payment_status}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>In: {formatDate(booking.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Out: {formatDate(booking.end_date)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  {historyData.transfers.length === 0 ? (
                    <div className="text-center py-12">
                      <Shuffle className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No transfer history</p>
                    </div>
                  ) : (
                    historyData.transfers.map((req) => (
                      <div key={req.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 shadow-sm">
                              <span className="text-xs font-bold text-gray-500 mr-2">FROM</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">Room {req.current_room?.room_number}</span>
                            </div>
                            <Shuffle className="w-4 h-4 text-gray-500" />
                            <div className="flex items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-2.5 shadow-sm">
                              <span className="text-xs font-bold text-amber-600 mr-2">TO</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">Room {req.requested_room?.room_number}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 italic mb-2">
                          "{req.reason}"
                        </div>
                        {req.status === 'pending' && (
                          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={getTransferForm(req.id).damage_charge}
                                onChange={(e) => updateTransferForm(req.id, { damage_charge: e.target.value })}
                                placeholder="Damage charge (optional)"
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                              />
                              <input
                                type="text"
                                value={getTransferForm(req.id).damage_description}
                                onChange={(e) => updateTransferForm(req.id, { damage_description: e.target.value })}
                                placeholder="Damage description"
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            <textarea
                              value={getTransferForm(req.id).landlord_notes}
                              onChange={(e) => updateTransferForm(req.id, { landlord_notes: e.target.value })}
                              placeholder="Landlord notes (optional)"
                              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white h-20 resize-none"
                            />

                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTransferAction(req, 'reject')}
                                disabled={handlingTransferId === req.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                              <button
                                onClick={() => handleTransferAction(req, 'approve')}
                                disabled={handlingTransferId === req.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                          <span>Requested: {formatDate(req.created_at)}</span>
                          {req.handled_at && <span>Handled: {formatDate(req.handled_at)}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-4">
                  {historyData.maintenance.length === 0 ? (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No maintenance history</p>
                    </div>
                  ) : (
                    historyData.maintenance.map((req) => (
                      <div key={req.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{req.title}</h4>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{req.description}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            req.status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                          <span>Reported: {formatDate(req.created_at)}</span>
                          <span>Priority: {req.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'addons' && (
                <div className="space-y-4">
                  {historyData.addons.length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No add-on requests</p>
                    </div>
                  ) : (
                    historyData.addons.map((addon, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{addon.addon_name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{addon.booking_reference} • {addon.price_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">₱{parseFloat(addon.price).toLocaleString()}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            addon.status === 'active' ? 'bg-green-100 text-green-700' : 
                            addon.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {addon.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Results fallback (if accessed via search query) */}
        {searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500"/> Alternate Tenant Matches
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((m) => {
                const tenantId = m.id || m.tenant_id || m.tenantId || (m.user && m.user.id);
                const displayName = m.first_name ? `${m.first_name} ${m.last_name || ''}` : (m.name || m.email || 'Unknown');
                return (
                  <li key={tenantId} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 flex justify-between items-center hover:border-green-500 transition-colors">
                    <div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-bold">{displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{m.email || 'No email'}</div>
                    </div>
                    <button onClick={() => navigate(`/tenants/${tenantId}`)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow-md shadow-green-500/20 active:scale-95 transition-all">View History</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}