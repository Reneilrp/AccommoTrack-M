import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Loader2, Search, Calendar, Receipt, X, RotateCcw, RefreshCw, PhilippinePeso, Clock, CheckCircle, FileDown, Filter, ShieldCheck, ShieldX } from "lucide-react";
import toast from "react-hot-toast";
import PriceRow from "../../components/Shared/PriceRow";
import { SkeletonStatCard } from "../../components/Shared/Skeleton";
import { useUIState } from "../../contexts/UIStateContext";
import { cacheManager } from "../../utils/cache";

const REFUND_FIXED_PENALTY_CENTS = Number(
  import.meta.env.VITE_REFUND_FIXED_PENALTY_CENTS || 0,
);

const REFUND_ELIGIBLE_STATUSES = [
  "succeeded",
  "paid",
  "partially_refunded",
  "refunded",
];

const getBillingPolicy = (booking) =>
  String(booking?.billing_policy || booking?.room?.billing_policy || "monthly").toLowerCase();

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStayProgress = (booking) => {
  const start = toDateOnly(booking?.start_date || booking?.checkIn);
  const end = toDateOnly(booking?.end_date || booking?.checkOut);
  if (!start || !end || end < start) return null;

  const today = toDateOnly(new Date());
  const totalDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  const billingPolicy = getBillingPolicy(booking);

  if (billingPolicy === "daily") {
    let stayedDays = 0;
    if (today >= start && today <= end) {
      stayedDays = Math.floor((today - start) / 86400000) + 1;
    } else if (today > end) {
      stayedDays = totalDays;
    }

    const refundableDays = Math.max(0, totalDays - stayedDays);
    const refundableRatio = totalDays > 0 ? refundableDays / totalDays : 0;

    return {
      mode: "daily",
      totalUnits: totalDays,
      usedUnits: stayedDays,
      refundableUnits: refundableDays,
      refundableRatio,
      unitLabel: "days",
      totalDays,
      stayedDays,
      refundableDays,
    };
  }

  const totalMonths = Math.max(
    1,
    Number(booking?.total_months || Math.ceil(totalDays / 30)),
  );
  let elapsedDays = 0;
  if (today > start && today <= end) {
    elapsedDays = Math.floor((today - start) / 86400000);
  } else if (today > end) {
    elapsedDays = totalMonths * 30;
  }

  const usedMonths = Math.min(totalMonths, Math.max(0, Math.floor(elapsedDays / 30)));
  const refundableMonths = Math.max(0, totalMonths - usedMonths);
  const refundableRatio = totalMonths > 0 ? refundableMonths / totalMonths : 0;

  return {
    mode: "monthly",
    totalUnits: totalMonths,
    usedUnits: usedMonths,
    refundableUnits: refundableMonths,
    refundableRatio,
    unitLabel: totalMonths === 1 ? "month" : "months",
    totalDays,
    stayedDays: Math.min(totalDays, elapsedDays),
    refundableDays: Math.max(0, totalDays - elapsedDays),
  };
};

const getTransactionRefundPreview = (invoice, tx, booking) => {
  if (!tx || !invoice) return null;

  const txAmountCents = Math.max(0, Number(tx.amount_cents || 0));
  const txRefundedCents = Math.max(0, Number(tx.refunded_amount_cents || 0));
  const txRemainingCents = Math.max(0, txAmountCents - txRefundedCents);
  if (txRemainingCents <= 0) {
    return {
      maxRefundableCents: 0,
      txRemainingCents: 0,
      fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
      stayProgress: getStayProgress(booking),
    };
  }

  const stayProgress = getStayProgress(booking);
  if (!stayProgress) {
    return {
      maxRefundableCents: txRemainingCents,
      txRemainingCents,
      fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
      stayProgress: null,
    };
  }

  const paidBaseCents = (invoice.transactions || [])
    .filter((line) => Number(line.amount_cents || 0) > 0)
    .filter((line) => REFUND_ELIGIBLE_STATUSES.includes((line.status || "").toLowerCase()))
    .reduce((sum, line) => sum + Math.max(0, Number(line.amount_cents || 0)), 0);

  const alreadyRefundedCents = (invoice.transactions || [])
    .filter((line) => Number(line.amount_cents || 0) > 0)
    .reduce((sum, line) => sum + Math.max(0, Number(line.refunded_amount_cents || 0)), 0);

  const proratedCents = Math.floor(
    (paidBaseCents * stayProgress.refundableUnits) / stayProgress.totalUnits,
  );

  const invoiceCapCents = Math.max(
    0,
    proratedCents - REFUND_FIXED_PENALTY_CENTS - alreadyRefundedCents,
  );

  return {
    maxRefundableCents: Math.min(txRemainingCents, invoiceCapCents),
    txRemainingCents,
    fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
    stayProgress,
  };
};

export default function Payments() {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_payments;

  const [invoices, setInvoices] = useState(cachedData?.invoices || []);
  const [bookingsMap, setBookingsMap] = useState(cachedData?.bookingsMap || {});
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const __navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [refundConfirmTx, setRefundConfirmTx] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRefunding, setIsRefunding] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
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
      const total = selectedInvoice.amount_cents
        ? selectedInvoice.amount_cents / 100
        : Number(selectedInvoice.amount || 0);
      const paid =
        selectedInvoice.transactions
          ?.filter(tx => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
          .reduce(
            (sum, tx) => {
              const txAmt = tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0);
              const txRef = tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
              return sum + (txAmt - txRef);
            },
            0,
          ) || 0;
      const remaining = Math.max(0, total - paid);

      setRecordData({
        amount: remaining > 0 ? remaining.toString() : "",
        method: "cash",
        reference: "",
        notes: "",
      });
    }
  }, [selectedInvoice]);

  const getInvoiceStatus = useCallback((inv) => {
    const invStatus = (inv.status || "").toLowerCase();

    if (invStatus === "paid" || invStatus === "refunded" || invStatus === "cancelled" || invStatus === "pending_verification") {
      return invStatus;
    }
    
    // Check for overdue status
    if (inv.due_date && new Date(inv.due_date) < new Date()) {
      return "overdue";
    }

    return invStatus || "pending";
  }, []);

  const stats = useMemo(() => {
    const s = {
      totalPaid: 0,
      totalBalance: 0,
      paidCount: 0,
      unpaidCount: 0,
      overdueCount: 0,
      pendingCount: 0,
      pendingVerifCount: 0,
    };

    invoices.forEach((inv) => {
      const status = getInvoiceStatus(inv);
      const total = inv.amount_cents
        ? inv.amount_cents / 100
        : Number(inv.amount || 0);
      
      const paid =
        inv.transactions
          ?.filter((tx) => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
          .reduce(
            (sum, tx) => {
              const txAmt = tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0);
              const txRef = tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
              return sum + (txAmt - txRef);
            },
            0,
          ) || 0;

      s.totalPaid += paid;
      s.totalBalance += Math.max(0, total - paid);

      if (status === "paid") s.paidCount++;
      else if (status === "pending_verification") s.pendingVerifCount++;
      else if (status === "pending" || status === "unpaid" || status === "partial") s.pendingCount++;
      else if (status === "overdue") s.overdueCount++;
    });

    return s;
  }, [invoices, getInvoiceStatus]);

  const selectedBooking = useMemo(() => {
    if (!selectedInvoice) return null;
    if (selectedInvoice.booking_id && bookingsMap[selectedInvoice.booking_id]) {
      return bookingsMap[selectedInvoice.booking_id];
    }
    return selectedInvoice.booking || null;
  }, [selectedInvoice, bookingsMap]);

  const selectedStayProgress = useMemo(() => {
    return getStayProgress(selectedBooking);
  }, [selectedBooking]);

  const invalidateAnalyticsCache = useCallback(() => {
    // Clear both global state and persistent local cache for analytics
    updateData("landlord_analytics", null);
    cacheManager.invalidate("landlord_analytics");
  }, [updateData]);

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

      // Cash payments recorded by landlord go to pending_verification; others are confirmed
      const isCash = recordData.method === 'cash';
      toast.success(isCash ? "Cash payment recorded. Marked as pending verification." : "Payment recorded successfully");
      setShowInvoiceModal(false);
      invalidateAnalyticsCache();
      await loadInvoices();
    } catch (e) {
      console.error("Failed to record payment", e);
      toast.error(e.response?.data?.message || "Failed to record payment");
    } finally {
      setIsRecording(false);
    }
  };

  const handleVerifyCash = async (action) => {
    if (!selectedInvoice) return;
    try {
      await api.post(`/invoices/${selectedInvoice.id}/verify-cash`, { action });
      toast.success(action === 'approve' ? 'Cash payment approved — invoice marked as Paid.' : 'Cash payment rejected — tenant will be notified.');
      setShowInvoiceModal(false);
      invalidateAnalyticsCache();
      await loadInvoices();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to verify payment');
    }
  };

  const handleRefundTransaction = async (tx, amountCents) => {
    if (!tx) return;
    setIsRefunding(tx.id);
    try {
      await api.post(`/transactions/${tx.id}/refund`, {
        amount_cents: amountCents,
      });
      if (selectedInvoice.booking_id) {
        await updateBookingPayment(selectedInvoice.booking_id, "refunded");
      }
      toast.success(
        `Refund of ₱${(amountCents / 100).toLocaleString()} processed successfully`,
      );
      setShowInvoiceModal(false);
      invalidateAnalyticsCache();
      await loadInvoices();
    } catch (e) {
      console.error("Failed to process refund", e);
      toast.error(e.response?.data?.message || "Failed to process refund");
    } finally {
      setIsRefunding(null);
      setRefundAmount("");
    }
  };

  const openRefundConfirm = (tx) => {
    const preview = getTransactionRefundPreview(selectedInvoice, tx, selectedBooking);
    const suggested = Math.max(0, Number(preview?.maxRefundableCents || 0));
    setRefundConfirmTx({ ...tx, refund_preview: preview });
    setRefundAmount((suggested / 100).toFixed(2));
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
          } catch (__err) {
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
      invalidateAnalyticsCache();
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
    } catch (__e) {
      return "—";
    }
  };

  const getPaymentColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "pending_verification":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
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

    // Derive canonical payment status using helper
    const statusNormalized = getInvoiceStatus(inv);

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
      inv.transactions
        ?.filter(tx => tx.status === 'succeeded' || tx.status === 'paid' || tx.status === 'partially_refunded')
        .reduce(
          (sum, tx) => {
            const txAmt = tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0);
            const txRef = tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
            return sum + (txAmt - txRef);
          },
          0,
        ) || 0;
    const balance = Math.max(0, price - paidAmount);
    const status = getInvoiceStatus(inv);

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
            <Calendar className="w-4 h-4 text-gray-500" />
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
            className={`px-4 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(status)}`}
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
              {status === "paid" ? "Details" : "Manage"}
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
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>

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
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-14 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-14 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </th>
                    <th className="px-6 py-4 text-left">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  <PriceRow amount={stats.totalPaid} />
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <PhilippinePeso className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Total Balance</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  <PriceRow amount={stats.totalBalance} />
                </p>
              </div>
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <PhilippinePeso className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Paid</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{stats.paidCount}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pendingCount}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Overdue</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{stats.overdueCount}</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {stats.pendingVerifCount > 0 && (
            <div
              onClick={() => setPaymentFilter('pending_verification')}
              className="relative overflow-hidden bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 shadow-sm border-2 border-orange-300 dark:border-orange-700 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors col-span-2 md:col-span-1"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">Cash Pending Verification</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-2">{stats.pendingVerifCount}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500" />
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
                "pending_verification",
                "paid",
                "unpaid",
                "partial",
                "cancelled",
                "refunded",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setPaymentFilter(s)}
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${
                    paymentFilter === s
                      ? s === 'pending_verification' ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-green-600 text-white shadow-md shadow-green-500/20"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {s === 'pending_verification' ? 'Cash Verify' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-bold shadow-md whitespace-nowrap"
              >
                <FileDown className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={loadInvoices}
                disabled={loading}
                title="Refresh"
                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tenant Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold dark:text-white text-gray-900 uppercase tracking-tight">
                    Manage Invoice
                  </h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                    REF:{" "}
                    {selectedInvoice.reference || `INV-${selectedInvoice.id}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setRefundConfirmTx(null);
                    setRefundAmount("");
                  }}
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
                    selectedInvoice.transactions
                      ?.filter(tx => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
                      .reduce(
                        (sum, tx) => {
                          const txAmt = tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0);
                          const txRef = tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
                          return sum + (txAmt - txRef);
                        },
                        0,
                      ) || 0;
                  const selRemaining = Math.max(0, selTotal - selPaid);
                  return (
                    <>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-2 uppercase text-xs font-bold">
                          Tenant
                        </p>
                        <p className="font-semibold dark:text-white text-gray-900 truncate">
                          {selectedInvoice.tenant?.first_name
                            ? `${selectedInvoice.tenant.first_name} ${selectedInvoice.tenant.last_name}`
                            : selectedInvoice.tenant?.name || "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                          <p className="text-gray-500 dark:text-gray-400 mb-2 uppercase text-xs font-bold">
                            Total
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            <PriceRow amount={selTotal} />
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-green-600 dark:text-green-400 mb-2 uppercase text-xs font-bold">
                            Paid
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            <PriceRow amount={selPaid} />
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                          <p className="text-red-500 dark:text-red-400 mb-2 uppercase text-xs font-bold">
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

                {selectedStayProgress && (
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/70 dark:bg-blue-900/10 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                      <span className="text-blue-700 dark:text-blue-300">
                        Refundable Stay Window
                      </span>
                      <span className="text-blue-700 dark:text-blue-300">
                        {selectedStayProgress.refundableUnits}/{selectedStayProgress.totalUnits} {selectedStayProgress.unitLabel} refundable
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden">
                      <div
                        className={`h-full transition-all ${selectedStayProgress.refundableRatio > 0.5 ? "bg-green-500" : selectedStayProgress.refundableRatio > 0.25 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${Math.max(0, Math.min(100, selectedStayProgress.refundableRatio * 100))}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-md bg-white/70 dark:bg-gray-800/60">
                        <p className="text-gray-500 dark:text-gray-400 uppercase font-bold">Stayed</p>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedStayProgress.usedUnits} {selectedStayProgress.unitLabel}</p>
                      </div>
                      <div className="p-2 rounded-md bg-white/70 dark:bg-gray-800/60">
                        <p className="text-gray-500 dark:text-gray-400 uppercase font-bold">Refundable</p>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedStayProgress.refundableUnits} {selectedStayProgress.unitLabel}</p>
                      </div>
                      <div className="p-2 rounded-md bg-white/70 dark:bg-gray-800/60">
                        <p className="text-gray-500 dark:text-gray-400 uppercase font-bold">Fixed Penalty</p>
                        <p className="font-bold text-gray-900 dark:text-white">₱{(REFUND_FIXED_PENALTY_CENTS / 100).toLocaleString()}</p>
                      </div>
                    </div>
                    {selectedStayProgress.refundableUnits > 0 && (
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        Refundable stay units show eligibility. Final refundable amount still depends on prior refunds and fixed penalty.
                      </p>
                    )}
                  </div>
                )}

                {/* Cash Payment Verification Section */}
                {getInvoiceStatus(selectedInvoice) === 'pending_verification' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0" />
                      <div>
                        <h4 className="font-bold text-orange-800 dark:text-orange-300 text-sm">Cash Payment Awaiting Verification</h4>
                        <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">The tenant has reported paying this invoice in cash. Please verify and approve or reject.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleVerifyCash('approve')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Approve Payment
                      </button>
                      <button
                        onClick={() => handleVerifyCash('reject')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md"
                      >
                        <ShieldX className="w-4 h-4" />
                        Reject Payment
                      </button>
                    </div>
                  </div>
                )}

                {!["paid", "refunded", "cancelled", "pending_verification"].includes(
                  getInvoiceStatus(selectedInvoice),
                ) && (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">
                        Record Payment
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
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
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
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
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
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
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Transaction reference..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={recordData.notes}
                          onChange={(e) =>
                            setRecordData({
                              ...recordData,
                              notes: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                          placeholder="Add any internal notes..."
                        />
                      </div>

                      <button
                        onClick={handleRecordOffline}
                        disabled={isRecording}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                      <p className="text-xs text-gray-500 mb-2 font-bold uppercase">
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
                            className={`flex items-center justify-center py-2 px-2 rounded-lg border text-[10px] font-bold transition-all ${status.color}`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Existing Transactions with Refund buttons */}
                {Array.isArray(selectedInvoice.transactions) &&
                  selectedInvoice.transactions.filter(
                    (tx) => tx.amount_cents > 0,
                  ).length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-2 font-bold uppercase">
                        Payment Transactions
                      </p>
                      <div className="space-y-2">
                        {selectedInvoice.transactions
                          .filter((tx) => tx.amount_cents > 0)
                          .map((tx) => {
                            const preview = getTransactionRefundPreview(selectedInvoice, tx, selectedBooking);
                            const txAmtCents = tx.amount_cents - (tx.refunded_amount_cents ?? 0);
                            const alreadyRefunded =
                              tx.status === "refunded" ||
                              (tx.refunded_amount_cents ?? 0) >=
                                tx.amount_cents;
                            const isPartiallyRefunded = !alreadyRefunded && (tx.refunded_amount_cents ?? 0) > 0;

                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                              >
                                <div>
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                    ₱{(txAmtCents / 100).toLocaleString()}{" "}
                                    — {(tx.method || "cash").replace("_", " ")}
                                    {isPartiallyRefunded && (
                                      <span className="ml-2 text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                                        (Net after refund)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {tx.created_at
                                      ? new Date(
                                          tx.created_at,
                                        ).toLocaleDateString()
                                      : "—"}
                                    {tx.gateway_reference
                                      ? ` · ${tx.gateway_reference}`
                                      : ""}
                                  </p>
                                  {!alreadyRefunded && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                      Estimated refundable now: ₱{((preview?.maxRefundableCents || 0) / 100).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                {alreadyRefunded ? (
                                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-2 rounded-md">
                                    Refunded
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openRefundConfirm(tx)}
                                    disabled={isRefunding === tx.id}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
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
                {getInvoiceStatus(selectedInvoice) === "partial" && (
                  <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4">
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

        {/* Custom Refund Confirmation Modal */}
        {refundConfirmTx && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-700">
              {(() => {
                const txRemainingCents = Math.max(
                  0,
                  Number(refundConfirmTx?.amount_cents || 0) - Number(refundConfirmTx?.refunded_amount_cents || 0),
                );
                const maxRefundableCents = Number(
                  refundConfirmTx?.refund_preview?.maxRefundableCents || 0,
                );
                const requestedCents = Math.round(Number(refundAmount || 0) * 100);
                const isInvalidAmount =
                  Number.isNaN(requestedCents) ||
                  requestedCents <= 0 ||
                  requestedCents > txRemainingCents;

                return (
                  <>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Confirm Refund
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Enter an amount to refund for this transaction.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Refund Amount (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Estimated refundable now: <span className="font-bold text-gray-900 dark:text-white">₱{(maxRefundableCents / 100).toLocaleString()}</span>
                </p>
                {isInvalidAmount && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Enter an amount greater than 0 and not higher than the remaining transaction amount.
                  </p>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Final validation is enforced by backend refund policy.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setRefundConfirmTx(null);
                    setRefundAmount("");
                  }}
                  className="flex-1 px-4 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const txToRefund = refundConfirmTx;
                    setRefundConfirmTx(null);
                    await handleRefundTransaction(txToRefund, requestedCents);
                  }}
                  disabled={isRefunding === refundConfirmTx.id || isInvalidAmount}
                  className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                >
                  {isRefunding === refundConfirmTx.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Yes, Refund"
                  )}
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        {showExportModal && (
          <ExportModal
            invoices={invoices}
            bookingsMap={bookingsMap}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Export CSV Modal ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'This Month',    getDates: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'Last Month',    getDates: () => { const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth()-1, 1); const t = new Date(n.getFullYear(), n.getMonth(), 0); return { from: f.toISOString().split('T')[0], to: t.toISOString().split('T')[0] }; } },
  { label: 'Last 3 Months', getDates: () => { const n = new Date(); const f = new Date(n); f.setMonth(f.getMonth()-3); return { from: f.toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'This Year',     getDates: () => { const n = new Date(); return { from: new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'All Time',      getDates: () => ({ from: '', to: '' }) },
  { label: 'Custom',        getDates: () => null },
];

function ExportModal({ invoices, bookingsMap, onClose }) {
  const { uiState } = useUIState();
  const cachedProps = uiState.data?.accessible_properties || [];

  const [selectedProperty, setSelectedProperty] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [preset, setPreset] = useState('This Month');
  const [dateFrom, setDateFrom] = useState(PRESETS[0].getDates().from);
  const [dateTo, setDateTo]   = useState(PRESETS[0].getDates().to);
  const [exporting, setExporting] = useState(false);

  const isCustom = preset === 'Custom';

  useEffect(() => {
    if (!selectedProperty) { setRooms([]); setSelectedRoom(''); return; }
    setLoadingRooms(true);
    api.get(`/rooms/property/${selectedProperty}`)
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setRooms(list);
      })
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
    setSelectedRoom('');
  }, [selectedProperty]);

  const handlePreset = (label) => {
    setPreset(label);
    const p = PRESETS.find(x => x.label === label);
    if (p && label !== 'Custom') {
      const dates = p.getDates();
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const result = invoices.filter(inv => {
        const bk = bookingsMap[inv.booking_id] || inv.booking || {};
        if (selectedProperty) {
          const propId = String(bk?.property?.id || bk?.property_id || inv?.property_id || '');
          if (propId !== String(selectedProperty)) return false;
        }
        if (selectedRoom) {
          const roomCandidates = [bk?.room?.id, bk?.room_id, inv?.room_id];
          if (!roomCandidates.some(r => r && String(r) === String(selectedRoom))) return false;
        }
        const issued = new Date(inv.issued_at || inv.created_at);
        if (dateFrom && issued < new Date(dateFrom)) return false;
        if (dateTo   && issued > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });

      if (result.length === 0) {
        toast.error('No records match your selected filters.');
        setExporting(false);
        return;
      }

      const headers = ['Invoice ID', 'Tenant', 'Property', 'Room', 'Date Issued', 'Amount (PHP)', 'Paid (PHP)', 'Balance (PHP)', 'Status'];
      const rows = result.map(inv => {
        const bk = bookingsMap[inv.booking_id] || inv.booking || {};
        const tenantName = bk?.tenant?.first_name ? `${bk.tenant.first_name} ${bk.tenant.last_name || ''}`.trim() : inv.tenant?.name || '—';
        const property = bk?.property?.title || inv.property?.title || '—';
        const room = bk?.room?.room_number || bk?.room_number || inv.room_number || '—';
        const issued = inv.issued_at || inv.created_at || '';
        const amount = inv.amount_cents ? inv.amount_cents / 100 : Number(inv.amount || 0);
        const paid = (inv.transactions || [])
          .filter(tx => ['succeeded','paid','partially_refunded'].includes(tx.status))
          .reduce((s, tx) => s + (tx.amount_cents ? tx.amount_cents/100 : Number(tx.amount||0)) - (tx.refunded_amount_cents ? tx.refunded_amount_cents/100 : 0), 0);
        const balance = Math.max(0, amount - paid);
        const status = (inv.status || 'pending').charAt(0).toUpperCase() + (inv.status || 'pending').slice(1);
        return [`"${inv.reference || `INV-${inv.id}`}"`, `"${tenantName}"`, `"${property}"`, `"${room}"`, issued ? new Date(issued).toLocaleDateString() : '—', amount.toFixed(2), paid.toFixed(2), balance.toFixed(2), status].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const propLabel = selectedProperty ? (cachedProps.find(p => String(p.id) === String(selectedProperty))?.title || 'property') : 'all';
      const dateLabel = preset === 'All Time' ? 'all-time' : `${dateFrom}_to_${dateTo}`;
      link.download = `payments_${propLabel.replace(/\s+/g,'-')}_${dateLabel}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`${result.length} record${result.length !== 1 ? 's' : ''} exported!`);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Export CSV</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Filter before exporting payment records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Property</label>
            <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-400 outline-none dark:bg-gray-700 dark:text-white">
              <option value="">All Properties</option>
              {cachedProps.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {selectedProperty && (
            <div className="animate-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Room</label>
              <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} disabled={loadingRooms}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-400 outline-none dark:bg-gray-700 dark:text-white disabled:opacity-60">
                <option value="">{loadingRooms ? 'Loading rooms...' : 'All Rooms'}</option>
                {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Date Range</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => handlePreset(p.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${preset === p.label ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
            )}
            {!isCustom && preset !== 'All Time' && dateFrom && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dateFrom} → {dateTo}</p>
            )}
            {preset === 'All Time' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Exporting all records regardless of date</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting} className="flex-1 px-4 py-3 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-900 dark:hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
