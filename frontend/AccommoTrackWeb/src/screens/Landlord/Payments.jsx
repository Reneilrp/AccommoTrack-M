import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Loader2, Search, Calendar, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import PriceRow from '../../components/Shared/PriceRow';

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingsMap, setBookingsMap] = useState({});
  const [paymentFilter, setPaymentFilter] = useState('all');
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/invoices?t=${Date.now()}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data || []);
      // if invoices reference bookings, fetch booking details first so UI can render tenant/property/room immediately
      const bookingIds = Array.from(new Set(list.map(i => i.booking_id).filter(Boolean)));
      if (bookingIds.length > 0) {
        const fetched = await loadBookingDetails(bookingIds);
        // merge fetched bookings into map
        setBookingsMap(prev => ({ ...prev, ...fetched }));
      }
      setInvoices(list);
    } catch (e) {
      console.error('Failed to load invoices', e);
      // If error is 404 or network, treat as no invoices yet
      if (e?.response?.status === 404 || e?.message?.toLowerCase().includes('network')) {
        setInvoices([]);
        setError(null);
      } else {
        setError(e.response?.data?.message || e.message || 'Failed to load invoices');
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBookingDetails = async (bookingIds = []) => {
    try {
      const map = {};
      // fetch each booking; if your API supports batch fetching, replace with a single call
      await Promise.all(bookingIds.map(async (id) => {
        try {
          const res = await api.get(`/bookings/${id}`);
          const booking = res.data?.data || res.data || null;
          if (booking) {
            // derive simple display fields so Payments can render quickly
            const tenant_name = booking.tenant?.first_name ? `${booking.tenant.first_name} ${booking.tenant.last_name || ''}`.trim() : (booking.tenant?.name || booking.guestName || null);
            const property_title = booking.property?.title || booking.propertyTitle || booking.property_title || null;

            // derive room label from common shapes
            const roomCandidates = [
              booking.room?.number,
              booking.room?.name,
              booking.room_number,
              booking.room_name,
              booking.rooms?.[0]?.number,
              booking.rooms?.[0]?.name,
              booking.room_no,
              booking.roomLabel,
              booking.room_label,
            ];
            const room_label = roomCandidates.find(r => r !== undefined && r !== null && r !== '') || null;

            map[id] = {
              ...booking,
              __derived: {
                tenant_name,
                property_title,
                room_label
              }
            };
          }
        } catch (err) {
          // ignore individual booking fetch errors
        }
      }));
      return map;
    } catch (err) {
      console.error('Failed to load booking details', err);
      return {};
    }
  };

  const updateBookingPayment = async (bookingId, paymentStatus) => {
    try {
      await api.patch(`/bookings/${bookingId}/payment`, { payment_status: paymentStatus });
      // Refresh invoices and list
      await loadInvoices();
      toast.success('Payment status updated');
    } catch (e) {
      console.error('Failed to update booking payment', e);
      toast.error('Failed to update payment status');
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch (e) {
      return '—';
    }
  };

  const getPaymentColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    // payment filter
    const statusNormalized = (inv.status || inv.booking?.payment_status || inv.payment_status || 'unpaid').toString().toLowerCase();
    if (paymentFilter !== 'all' && statusNormalized !== paymentFilter) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const invoiceId = (inv.reference || inv.id || '').toString().toLowerCase();
    const tenant = (inv.tenant?.first_name ? `${inv.tenant.first_name} ${inv.tenant.last_name}` : inv.tenant?.name || '').toLowerCase();
    const property = (inv.booking?.property?.title || inv.property?.title || inv.property_title || '').toString().toLowerCase();
    const room = (inv.booking?.room_number || inv.room || inv.room_name || '').toString().toLowerCase();
    const issued = (inv.issued_at || inv.created_at || '').toString().toLowerCase();
    const price = (inv.amount_cents ? (inv.amount_cents/100).toFixed(2) : (inv.amount || '')).toString().toLowerCase();

    return [invoiceId, tenant, property, room, issued, price].some(f => f && f.includes(q));
  });

  // Sort invoices so newest appear first, then build table rows
  const sortedInvoices = filteredInvoices.slice().sort((a, b) => {
    const da = Date.parse(a.issued_at || a.created_at) || 0;
    const db = Date.parse(b.issued_at || b.created_at) || 0;
    return db - da; // descending: newest first
  });

  // Precompute table rows to keep JSX tidy and avoid nested brace issues
  const rows = sortedInvoices.map((inv) => {
    const invoiceId = inv.reference || `INV-${inv.id}`;
    const bookingFromMap = inv.booking_id ? bookingsMap[inv.booking_id] : null;
    const tenantName = bookingFromMap?.tenant?.first_name
      ? `${bookingFromMap.tenant.first_name} ${bookingFromMap.tenant.last_name}`
      : (inv.tenant?.first_name ? `${inv.tenant.first_name} ${inv.tenant.last_name}` : (inv.tenant?.name || '—'));
    const property = bookingFromMap?.property?.title || inv.booking?.property?.title || inv.property?.title || inv.property_title || '—';

    const roomCandidates = [
      bookingFromMap?.room?.number,
      bookingFromMap?.room?.name,
      bookingFromMap?.room_number,
      bookingFromMap?.room_name,
      bookingFromMap?.rooms?.[0]?.number,
      bookingFromMap?.rooms?.[0]?.name,
      inv.booking?.room?.number,
      inv.booking?.room?.name,
      inv.booking?.room_number,
      inv.booking?.room_name,
      inv.room_number,
      inv.room_no,
      inv.room,
      inv.room_name,
      inv.line_items?.[0]?.description,
      inv.metadata?.room,
      inv.meta?.room
    ];
    const room = roomCandidates.find(r => r !== undefined && r !== null && r !== '') || '—';
    const issued = inv.issued_at || inv.created_at || '';
    const price = inv.amount_cents ? (inv.amount_cents/100) : (inv.amount ? Number(inv.amount) : 0);
    const status = (inv.status || inv.booking?.payment_status || inv.payment_status || 'unpaid');

    // Determine display values, but show a Loading placeholder when booking is referenced but not yet fetched
    const tenantDisplay = (bookingFromMap === undefined && inv.booking_id) ? 'Loading...' : tenantName;
    const propertyDisplay = (bookingFromMap === undefined && inv.booking_id) ? 'Loading...' : property;
    const roomDisplay = (bookingFromMap === undefined && inv.booking_id) ? 'Loading...' : room;

    return (
      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td className="pl-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{invoiceId}</td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{bookingFromMap?.__derived?.tenant_name || tenantDisplay}</td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{bookingFromMap?.__derived?.property_title || propertyDisplay}</td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{bookingFromMap?.__derived?.room_label || roomDisplay}</td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{issued ? formatDate(issued) : '—'}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white"><PriceRow amount={price} /></td>
        <td className="px-6 py-4">
          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(status)}`}>
            {status ? (status.charAt(0).toUpperCase() + status.slice(1)) : '—'}
          </span>
        </td>
        <td className="px-6 py-4 text-sm">
                          {inv.booking_id ? (
            <button
              onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              View
            </button>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </td>
      </tr>
    );
  });

  // Skeleton row component for loading state
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="pl-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div></td>
    </tr>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Skeleton */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center w-full animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-72 mx-auto"></div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search & Filters Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg w-[28rem]"></div>
              <div className="flex gap-2 flex-wrap ml-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-14 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage invoices and update booking payment statuses.</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice, tenant, property, room, date, price..."
                className="w-[28rem] pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap ml-2">
              {['all', 'pending', 'paid', 'unpaid', 'partial', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setPaymentFilter(s)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${paymentFilter === s ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tenant Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Issued</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">No payments yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                          You have no payment records or invoices yet. Payments will appear here once bookings are made and invoices are generated.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Details Modal */}
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold dark:text-white">Invoice Details</h3>
                <button onClick={() => setShowInvoiceModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Close</button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Invoice JSON</p>
                <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs overflow-auto dark:text-gray-200" style={{maxHeight: '40vh'}}>{JSON.stringify(selectedInvoice, null, 2)}</pre>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Fetched Booking (if any)</p>
                  <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs overflow-auto dark:text-gray-200" style={{maxHeight: '40vh'}}>{JSON.stringify(bookingsMap[selectedInvoice.booking_id] || null, null, 2)}</pre>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-right">
                <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
