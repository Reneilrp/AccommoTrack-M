import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Loader2, Search, Calendar, Receipt, X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import PriceRow from "../../components/Shared/PriceRow";
import { useUIState } from "../../contexts/UIStateContext";

export default function Payments() {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_payments;

  const [invoices, setInvoices] = useState(cachedData?.invoices || []);
  const [bookingsMap, setBookingsMap] = useState(cachedData?.bookingsMap || {});
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRefunding, setIsRefunding] = useState(null);
  const [recordData, setRecordData] = useState({
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoice) {
      setRecordData({
        amount: selectedInvoice.amount_cents
          ? (selectedInvoice.amount_cents / 100).toString()
          : (selectedInvoice.amount || "").toString(),
        method: "cash",
        reference: "",
        notes: "",
      });
    }
  }, [selectedInvoice]);

  const loadInvoices = async () => {
    try {
      if (!cachedData) setLoading(true);
      setError(null);
      const res = await api.get(`/invoices?t=${Date.now()}`);
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data || [];

      let finalBookingsMap = { ...bookingsMap };
      const bookingIds = Array.from(
        new Set(list.map((i) => i.booking_id).filter(Boolean)),
      );
      if (bookingIds.length > 0) {
        const fetched = await loadBookingDetails(bookingIds);
        finalBookingsMap = { ...finalBookingsMap, ...fetched };
        setBookingsMap(finalBookingsMap);
      }
      setInvoices(list);

      // Update global context
      updateData("landlord_payments", {
        invoices: list,
        bookingsMap: finalBookingsMap,
      });
    } catch (e) {
      console.error("Failed to load invoices", e);
      // If error is 404 or network, treat as no invoices yet
      if (
        e?.response?.status === 404 ||
        e?.message?.toLowerCase().includes("network")
      ) {
        setInvoices([]);
        setError(null);
      } else {
        setError(
          e.response?.data?.message || e.message || "Failed to load invoices",
        );
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecordOffline = async () => {
    if (!selectedInvoice || !recordData.amount || !recordData.method) {
      toast.error("Please fill in amount and method");
      return;
    }

    setIsRecording(true);
    try {
      await api.post(`/invoices/${selectedInvoice.id}/record`, {
        amount_cents: Math.round(parseFloat(recordData.amount) * 100),
        method: recordData.method,
        reference: recordData.reference,
        notes: recordData.notes,
        received_at: new Date().toISOString(),
      });

      toast.success("Payment recorded successfully");
      setShowInvoiceModal(false);
      await loadInvoices();
    } catch (e) {
      console.error("Failed to record payment", e);
      toast.error(e.response?.data?.message || "Failed to record payment");
    } finally {
      setIsRecording(false);
    }
  };

  const handleRefundTransaction = async (tx) => {
    if (
      !window.confirm(
        `Refund ₱${(tx.amount_cents / 100).toLocaleString()} for this transaction? This cannot be undone.`,
      )
    )
      return;
    setIsRefunding(tx.id);
    try {
      await api.post(`/transactions/${tx.id}/refund`, {
        amount_cents: tx.amount_cents,
      });
      if (selectedInvoice.booking_id) {
        await updateBookingPayment(selectedInvoice.booking_id, "refunded");
      }
      toast.success("Transaction refunded successfully");
      setShowInvoiceModal(false);
      await loadInvoices();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to process refund");
    } finally {
      setIsRefunding(null);
    }
  };

  const loadBookingDetails = async (bookingIds = []) => {
    try {
      const map = {};
      // fetch each booking; if your API supports batch fetching, replace with a single call
      await Promise.all(
        bookingIds.map(async (id) => {
          try {
            const res = await api.get(`/bookings/${id}`);
            const booking = res.data?.data || res.data || null;
            if (booking) {
              // derive simple display fields so Payments can render quickly
              const tenant_name = booking.tenant?.first_name
                ? `${booking.tenant.first_name} ${booking.tenant.last_name || ""}`.trim()
                : booking.tenant?.name || booking.guestName || null;
              const property_title =
                booking.property?.title ||
                booking.propertyTitle ||
                booking.property_title ||
                null;

              // derive room label from common shapes
              const roomCandidates = [
                booking.roomNumber,
                booking.room?.room_number,
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
              const room_label =
                roomCandidates.find(
                  (r) => r !== undefined && r !== null && r !== "",
                ) || null;

              map[id] = {
                ...booking,
                __derived: {
                  tenant_name,
                  property_title,
                  room_label,
                },
              };
            }
          } catch (err) {
            // ignore individual booking fetch errors
          }
        }),
      );
      return map;
    } catch (err) {
      console.error("Failed to load booking details", err);
      return {};
    }
  };

  const updateBookingPayment = async (bookingId, paymentStatus) => {
    try {
      await api.patch(`/bookings/${bookingId}/payment`, {
        payment_status: paymentStatus,
      });
      // Refresh invoices and list
      await loadInvoices();
      toast.success("Payment status updated");
    } catch (e) {
      console.error("Failed to update booking payment", e);
      toast.error("Failed to update payment status");
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
    } catch (e) {
      console.error("Failed to update booking status", e);
      toast.error("Failed to update booking status");
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch (e) {
      return "—";
    }
  };

  const getPaymentColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const bookingStatus = (
      bookingsMap[inv.booking_id]?.status ||
      inv.booking?.status ||
      ""
    ).toLowerCase();

    // Derive canonical payment status:
    // booking.payment_status wins for refunded/cancelled (set by landlord actions);
    // otherwise fall back to invoice status, then booking payment status, then 'unpaid'
    const bookingPayStatus = (
      bookingsMap[inv.booking_id]?.payment_status ||
      inv.booking?.payment_status ||
      ""
    ).toLowerCase();
    const invStatus = (inv.status || "").toLowerCase();
    const statusNormalized = (() => {
      if (bookingPayStatus === "refunded") return "refunded";
      if (bookingPayStatus === "cancelled") return "cancelled";
      if (invStatus) return invStatus;
      if (bookingPayStatus) return bookingPayStatus;
      return "unpaid";
    })();

    // Apply payment filter first — specific filters bypass the booking-status exclusion
    if (paymentFilter !== "all" && statusNormalized !== paymentFilter)
      return false;

    // In "all" view: hide invoices on pending/cancelled bookings (not yet active)
    if (
      paymentFilter === "all" &&
      (bookingStatus === "cancelled" || bookingStatus === "pending")
    )
      return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const invoiceId = (inv.reference || inv.id || "").toString().toLowerCase();
    const tenant = (
      inv.tenant?.first_name
        ? `${inv.tenant.first_name} ${inv.tenant.last_name}`
        : inv.tenant?.name || ""
    ).toLowerCase();
    const property = (
      inv.booking?.property?.title ||
      inv.property?.title ||
      inv.property_title ||
      ""
    )
      .toString()
      .toLowerCase();
    const room = (inv.booking?.room_number || inv.room || inv.room_name || "")
      .toString()
      .toLowerCase();
    const issued = (inv.issued_at || inv.created_at || "")
      .toString()
      .toLowerCase();
    const price = (
      inv.amount_cents ? (inv.amount_cents / 100).toFixed(2) : inv.amount || ""
    )
      .toString()
      .toLowerCase();

    return [invoiceId, tenant, property, room, issued, price].some(
      (f) => f && f.includes(q),
    );
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
      : inv.tenant?.first_name
        ? `${inv.tenant.first_name} ${inv.tenant.last_name}`
        : inv.tenant?.name || "—";
    const property =
      bookingFromMap?.property?.title ||
      inv.booking?.property?.title ||
      inv.property?.title ||
      inv.property_title ||
      "—";

    const roomCandidates = [
      bookingFromMap?.roomNumber,
      bookingFromMap?.room?.room_number,
      bookingFromMap?.room?.number,
      bookingFromMap?.room?.name,
      bookingFromMap?.room_number,
      bookingFromMap?.room_name,
      bookingFromMap?.rooms?.[0]?.number,
      bookingFromMap?.rooms?.[0]?.name,
      inv.booking?.roomNumber,
      inv.booking?.room?.room_number,
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
      inv.meta?.room,
    ];
    const room =
      roomCandidates.find((r) => r !== undefined && r !== null && r !== "") ||
      "—";
    const issued = inv.issued_at || inv.created_at || "";
    const price = inv.amount_cents
      ? inv.amount_cents / 100
      : inv.amount
        ? Number(inv.amount)
        : 0;
    const paidAmount =
      inv.transactions?.reduce(
        (sum, tx) =>
          sum +
          (tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0)),
        0,
      ) || 0;
    const balance = Math.max(0, price - paidAmount);
    const rowBookingPayStatus = (
      bookingFromMap?.payment_status ||
      inv.booking?.payment_status ||
      ""
    ).toLowerCase();
    const rowInvStatus = (inv.status || "").toLowerCase();
    const status = (() => {
      if (rowBookingPayStatus === "refunded") return "refunded";
      if (rowBookingPayStatus === "cancelled") return "cancelled";
      if (rowInvStatus) return rowInvStatus;
      if (rowBookingPayStatus) return rowBookingPayStatus;
      return "unpaid";
    })();

    // Determine display values, but show a Loading placeholder when booking is referenced but not yet fetched
    const tenantDisplay =
      bookingFromMap === undefined && inv.booking_id
        ? "Loading..."
        : tenantName;
    const propertyDisplay =
      bookingFromMap === undefined && inv.booking_id ? "Loading..." : property;
    const roomDisplay =
      bookingFromMap === undefined && inv.booking_id ? "Loading..." : room;

    return (
      <tr
        key={inv.id}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <td className="pl-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
          {invoiceId}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {bookingFromMap?.__derived?.tenant_name || tenantDisplay}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {bookingFromMap?.__derived?.property_title || propertyDisplay}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {bookingFromMap?.__derived?.room_label || roomDisplay}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{issued ? formatDate(issued) : "—"}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
          <PriceRow amount={price} />
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
          <PriceRow amount={paidAmount} />
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400">
          <PriceRow amount={balance} />
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(status)}`}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
          </span>
        </td>
        <td className="px-6 py-4 text-sm">
          {inv.booking_id || inv.id ? (
            <button
              onClick={() => {
                setSelectedInvoice(inv);
                setShowInvoiceModal(true);
              }}
              className="text-green-600 hover:text-green-800 font-bold uppercase text-xs tracking-wider"
            >
              Manage
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
      <td className="pl-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
      </td>
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
                  <div
                    key={i}
                    className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"
                  ></div>
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
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-14 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-14 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
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
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-[28rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice, tenant, property, room, date, price..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
              {[
                "all",
                "pending",
                "paid",
                "unpaid",
                "partial",
                "cancelled",
                "refunded",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setPaymentFilter(s)}
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${paymentFilter === s ? "bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tenant Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                          No payments yet
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                          You have no payment records or invoices yet. Payments
                          will appear here once bookings are made and invoices
                          are generated.
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

        {/* Manage Payment Modal */}
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold dark:text-white text-gray-900 uppercase tracking-tight">
                    Manage Invoice
                  </h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                    REF:{" "}
                    {selectedInvoice.reference || `INV-${selectedInvoice.id}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Info */}
                {(() => {
                  const selTotal = selectedInvoice.amount_cents
                    ? selectedInvoice.amount_cents / 100
                    : Number(selectedInvoice.amount || 0);
                  const selPaid =
                    selectedInvoice.transactions?.reduce(
                      (sum, tx) =>
                        sum +
                        (tx.amount_cents
                          ? tx.amount_cents / 100
                          : Number(tx.amount || 0)),
                      0,
                    ) || 0;
                  const selRemaining = Math.max(0, selTotal - selPaid);
                  return (
                    <>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-1 uppercase text-xs font-bold">
                          Tenant
                        </p>
                        <p className="font-semibold dark:text-white text-gray-900 truncate">
                          {selectedInvoice.tenant?.first_name
                            ? `${selectedInvoice.tenant.first_name} ${selectedInvoice.tenant.last_name}`
                            : selectedInvoice.tenant?.name || "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                          <p className="text-gray-500 dark:text-gray-400 mb-1 uppercase text-xs font-bold">
                            Total
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            <PriceRow amount={selTotal} />
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-green-600 dark:text-green-400 mb-1 uppercase text-xs font-bold">
                            Paid
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            <PriceRow amount={selPaid} />
                          </p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                          <p className="text-red-500 dark:text-red-400 mb-1 uppercase text-xs font-bold">
                            Remaining
                          </p>
                          <p className="font-bold text-red-600 dark:text-red-400">
                            <PriceRow amount={selRemaining} />
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">
                    Record Payment
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Amount (₱)
                      </label>
                      <input
                        type="number"
                        value={recordData.amount}
                        onChange={(e) =>
                          setRecordData({
                            ...recordData,
                            amount: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Method
                      </label>
                      <select
                        value={recordData.method}
                        onChange={(e) =>
                          setRecordData({
                            ...recordData,
                            method: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="gcash">GCash</option>
                        <option value="check">Check</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={recordData.reference}
                      onChange={(e) =>
                        setRecordData({
                          ...recordData,
                          reference: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Transaction reference..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={recordData.notes}
                      onChange={(e) =>
                        setRecordData({ ...recordData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                      placeholder="Add any internal notes..."
                    />
                  </div>

                  <button
                    onClick={handleRecordOffline}
                    disabled={isRecording}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isRecording ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      "Record Payment"
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 font-bold uppercase">
                    Quick Status Update
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "unpaid",
                        label: "Unpaid",
                        color:
                          "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
                      },
                      {
                        id: "partial",
                        label: "Partial",
                        color:
                          "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
                      },
                      {
                        id: "paid",
                        label: "Paid",
                        color:
                          "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                      },
                    ].map((status) => (
                      <button
                        key={status.id}
                        onClick={async () => {
                          if (selectedInvoice.booking_id) {
                            await updateBookingPayment(
                              selectedInvoice.booking_id,
                              status.id,
                            );
                            setShowInvoiceModal(false);
                          }
                        }}
                        className={`flex items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-bold transition-all ${status.color}`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Existing Transactions with Refund buttons */}
                {Array.isArray(selectedInvoice.transactions) &&
                  selectedInvoice.transactions.filter(
                    (tx) => tx.amount_cents > 0,
                  ).length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400 mb-2 font-bold uppercase">
                        Payment Transactions
                      </p>
                      <div className="space-y-2">
                        {selectedInvoice.transactions
                          .filter((tx) => tx.amount_cents > 0)
                          .map((tx) => {
                            const alreadyRefunded =
                              tx.status === "refunded" ||
                              (tx.refunded_amount_cents ?? 0) >=
                                tx.amount_cents;
                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                              >
                                <div>
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                    ₱{(tx.amount_cents / 100).toLocaleString()}{" "}
                                    — {(tx.method || "cash").replace("_", " ")}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {tx.created_at
                                      ? new Date(
                                          tx.created_at,
                                        ).toLocaleDateString()
                                      : "—"}
                                    {tx.gateway_reference
                                      ? ` · ${tx.gateway_reference}`
                                      : ""}
                                  </p>
                                </div>
                                {alreadyRefunded ? (
                                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                                    Refunded
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleRefundTransaction(tx)}
                                    disabled={isRefunding === tx.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                                  >
                                    {isRefunding === tx.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3 h-3" />
                                    )}
                                    Refund
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* Mark Fully Paid & Completed — only shown when payment status is partial */}
                {(
                  selectedInvoice?.status ||
                  selectedInvoice?.booking?.payment_status ||
                  ""
                ).toLowerCase() === "partial" && (
                  <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3">
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase mb-2">
                      Partial Payment — Action Required
                    </p>
                    <button
                      onClick={async () => {
                        if (
                          selectedInvoice.booking_id &&
                          window.confirm(
                            "Mark this booking as fully paid and completed?",
                          )
                        ) {
                          await updateBookingPayment(
                            selectedInvoice.booking_id,
                            "paid",
                          );
                          await updateBookingStatus(
                            selectedInvoice.booking_id,
                            "completed",
                          );
                          setShowInvoiceModal(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      ✓ Mark Fully Paid & Completed
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 text-right">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
