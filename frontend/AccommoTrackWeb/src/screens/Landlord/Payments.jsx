import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Search, Calendar, Receipt, X, RotateCcw, RefreshCw, PhilippinePeso, Clock, CheckCircle, XCircle, FileDown, Filter, ShieldCheck, ShieldX, FileText } from "lucide-react";
import { showSuccess, showError } from "../../utils/toast";
import PriceRow from "../../components/Shared/PriceRow";
import { SkeletonStatCard } from "../../components/Shared/Skeleton";
import { useUIState } from "../../contexts/UIStateContext";
import { useSidebar } from "../../contexts/SidebarContext";
import {
  LANDLORD_MUTATION_FRESHNESS,
  refreshAfterMutation,
} from "../../utils/mutationFreshness";
import invoiceService from "../../services/invoiceService";
import bookingService from "../../services/bookingService";
import roomService from "../../services/roomService";
import { normalizeActionError } from "../../utils/error";
import { formatPrice } from "../../utils/price";
import Decimal from "../../utils/decimal";

const REFUND_FIXED_PENALTY_CENTS = Number(
  import.meta.env.VITE_REFUND_FIXED_PENALTY_CENTS || 0,
);

const REFUND_ELIGIBLE_STATUSES = [
  "succeeded",
  "paid",
  "partially_refunded",
  "refunded",
];

const CASH_REJECTION_REASONS = [
  { id: "invalid_proof", label: "Invalid payment proof" },
  { id: "wrong_amount", label: "Amount does not match invoice" },
  { id: "unclear_image", label: "Proof image is unclear" },
  { id: "mismatched_reference", label: "Reference does not match records" },
  { id: "duplicate_submission", label: "Duplicate submission" },
  { id: "other", label: "Other" },
];
const CASH_REJECTION_REASON_IDS = CASH_REJECTION_REASONS.map((item) => item.id);

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

  const txAmountCents = Math.max(0, new Decimal(tx.amount_cents || 0).toNumber());
  const txRefundedCents = Math.max(0, new Decimal(tx.refunded_amount_cents || 0).toNumber());
  const txRemainingCents = Math.max(0, new Decimal(txAmountCents).minus(txRefundedCents).toNumber());
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
    .filter((line) => new Decimal(line.amount_cents || 0).gt(0))
    .filter((line) => REFUND_ELIGIBLE_STATUSES.includes((line.status || "").toLowerCase()))
    .reduce((sum, line) => new Decimal(sum).plus(Math.max(0, new Decimal(line.amount_cents || 0).toNumber())).toNumber(), 0);

  const alreadyRefundedCents = (invoice.transactions || [])
    .filter((line) => new Decimal(line.amount_cents || 0).gt(0))
    .reduce((sum, line) => new Decimal(sum).plus(Math.max(0, new Decimal(line.refunded_amount_cents || 0).toNumber())).toNumber(), 0);

  const proratedCents = new Decimal(paidBaseCents)
    .times(stayProgress.refundableUnits)
    .div(stayProgress.totalUnits)
    .floor()
    .toNumber();

  const invoiceCapCents = Math.max(
    0,
    new Decimal(proratedCents).minus(REFUND_FIXED_PENALTY_CENTS).minus(alreadyRefundedCents).toNumber(),
  );

  return {
    maxRefundableCents: Math.min(txRemainingCents, invoiceCapCents),
    txRemainingCents,
    fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
    stayProgress,
  };
};

const getInvoiceRefundPreview = (invoice, booking) => {
  const stayProgress = getStayProgress(booking);
  if (!stayProgress) return { maxRefundableCents: 0, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS };

  const transactions = invoice.transactions || [];
  const positiveTransactions = transactions.filter(t => new Decimal(t.amount_cents || 0).gt(0));
  const totalPaidCents = positiveTransactions.reduce((sum, t) => new Decimal(sum).plus(t.amount_cents || 0).toNumber(), 0);
  const alreadyRefundedCents = positiveTransactions.reduce((sum, t) => new Decimal(sum).plus(Math.max(0, new Decimal(t.refunded_amount_cents || 0).toNumber())).toNumber(), 0);
  const remainingTotalCents = Math.max(0, new Decimal(totalPaidCents).minus(alreadyRefundedCents).toNumber());

  if (totalPaidCents <= 0) return { maxRefundableCents: 0, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS };

  const proratedCents = new Decimal(totalPaidCents)
    .times(stayProgress.refundableUnits)
    .div(stayProgress.totalUnits)
    .toNumber();
  const invoiceCapCents = Math.max(0, new Decimal(proratedCents).minus(REFUND_FIXED_PENALTY_CENTS).minus(alreadyRefundedCents).toNumber());

  return {
    maxRefundableCents: Math.min(remainingTotalCents, invoiceCapCents),
    fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
  };
};

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapse } = useSidebar();
  const { uiState, updateData, invalidateData } = useUIState();
  const cachedData = uiState.data?.landlord_payments;

  const [invoices, setInvoices] = useState(cachedData?.invoices || []);
  const [bookingsMap, setBookingsMap] = useState(cachedData?.bookingsMap || {});
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [archiveFilter] = useState("active");
  const [statsRange, setStatsRange] = useState("month");
  const initialLoadRef = useRef(true);

  const [summary, setSummary] = useState(cachedData?.summary || null);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [refundConfirmTx, setRefundConfirmTx] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [verifyingAction, setVerifyingAction] = useState(null);
  const [showRejectCashForm, setShowRejectCashForm] = useState(false);
  const [rejectReasonCode, setRejectReasonCode] = useState("unclear_image");
  const [rejectReason, setRejectReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(null);
  const [isRefundingInvoice, setIsRefundingInvoice] = useState(false);
  const [showMergedRefundModal, setShowMergedRefundModal] = useState(false);
  const [mergedRefundPreview, setMergedRefundPreview] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [, setInvoiceDrilldownApplied] = useState(false);
  const [proofLightboxUrl, setProofLightboxUrl] = useState(null);
  const [recordData, setRecordData] = useState({
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });

  const getPaymentError = useCallback(
    (errorOrMessage, fallbackMessage) => normalizeActionError(errorOrMessage, fallbackMessage),
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const filterParam = params.get("filter");
    const searchParam = params.get("search");

    if (filterParam) {
      setPaymentFilter(filterParam);
    }

    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }

    setInvoiceDrilldownApplied(false);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const invoiceId = params.get("invoiceId");

    if (!invoiceId || invoices.length === 0) {
      return;
    }

    setInvoiceDrilldownApplied((prevApplied) => {
      if (prevApplied) return true; // already applied

      const targetInvoice = invoices.find((invoice) => String(invoice.id) === String(invoiceId));
      if (targetInvoice) {
        setSelectedInvoice(targetInvoice);
        setShowInvoiceModal(true);
        return true;
      }

      return false;
    });
  }, [location.search, invoices]);

  useEffect(() => {
    if (selectedInvoice) {
      const total = selectedInvoice.amount_cents
        ? new Decimal(selectedInvoice.amount_cents).div(100).toNumber()
        : new Decimal(selectedInvoice.amount || 0).toNumber();
      const paid =
        selectedInvoice.transactions
          ?.filter(tx => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
          .reduce(
            (sum, tx) => {
              const txAmt = tx.amount_cents ? new Decimal(tx.amount_cents).div(100).toNumber() : new Decimal(tx.amount || 0).toNumber();
              const txRef = tx.refunded_amount_cents ? new Decimal(tx.refunded_amount_cents).div(100).toNumber() : 0;
              return new Decimal(sum).plus(new Decimal(txAmt).minus(txRef)).toNumber();
            },
            0,
          ) || 0;
      const remaining = Math.max(0, new Decimal(total).minus(paid).toNumber());

      setRecordData(prev => ({
        ...prev,
        amount: remaining > 0 ? remaining.toString() : "",
        method: "cash",
        reference: "",
        notes: "",
      }));
    }
  }, [selectedInvoice]);

  useEffect(() => {
    if (showInvoiceModal) return;
    setShowRejectCashForm(false);
    setRejectReasonCode("unclear_image");
    setRejectReason("");
  }, [showInvoiceModal]);

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

  const getInvoiceStatsDate = useCallback((inv) => {
    const raw = inv?.issued_at || inv?.created_at || inv?.due_date || null;
    if (!raw) return null;

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  const statsSourceInvoices = useMemo(() => {
    if (statsRange === "all") {
      return invoices;
    }

    const now = new Date();
    return invoices.filter((inv) => {
      const date = getInvoiceStatsDate(inv);
      if (!date) return false;

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });
  }, [invoices, statsRange, getInvoiceStatsDate]);

  const fallbackStats = useMemo(() => {
    const s = {
      totalPaid: 0,
      totalBalance: 0,
      paidCount: 0,
      unpaidCount: 0,
      overdueCount: 0,
      pendingCount: 0,
      pendingVerifCount: 0,
    };

    statsSourceInvoices.forEach((inv) => {
      const status = getInvoiceStatus(inv);
      const total = inv.amount_cents
        ? new Decimal(inv.amount_cents).div(100).toNumber()
        : new Decimal(inv.amount || 0).toNumber();

      const paid =
        inv.transactions
          ?.filter((tx) => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
          .reduce(
            (sum, tx) => {
              const txAmt = tx.amount_cents ? new Decimal(tx.amount_cents).div(100).toNumber() : new Decimal(tx.amount || 0).toNumber();
              const txRef = tx.refunded_amount_cents ? new Decimal(tx.refunded_amount_cents).div(100).toNumber() : 0;
              return new Decimal(sum).plus(new Decimal(txAmt).minus(txRef)).toNumber();
            },
            0,
          ) || 0;

      s.totalPaid = new Decimal(s.totalPaid).plus(paid).toNumber();
      s.totalBalance = new Decimal(s.totalBalance).plus(Math.max(0, new Decimal(total).minus(paid).toNumber())).toNumber();

      if (status === "paid") s.paidCount++;
      else if (status === "pending_verification") s.pendingVerifCount++;
      else if (status === "pending" || status === "unpaid" || status === "partial") s.pendingCount++;
      else if (status === "overdue") s.overdueCount++;
    });

    return s;
  }, [statsSourceInvoices, getInvoiceStatus]);

  const stats = useMemo(() => {
    const totals = summary?.totals;
    if (!totals) {
      return fallbackStats;
    }

    const totalPaid = totals.total_paid_cents !== undefined
      ? new Decimal(totals.total_paid_cents).div(100).toNumber()
      : new Decimal(totals.total_paid ?? 0).toNumber();

    const totalBalance = totals.total_balance_cents !== undefined
      ? new Decimal(totals.total_balance_cents).div(100).toNumber()
      : new Decimal(totals.total_balance ?? 0).toNumber();

    return {
      totalPaid,
      totalBalance,
      paidCount: Number(totals.paid_count || 0),
      unpaidCount: Number(totals.unpaid_count || 0),
      overdueCount: Number(totals.overdue_count || 0),
      pendingCount: Number(totals.pending_count || 0),
      pendingVerifCount: Number(totals.pending_verification_count || 0),
    };
  }, [summary, fallbackStats]);

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

  const refreshLandlordMutationViews = useCallback(() => {
    refreshAfterMutation({
      invalidateData,
      ...LANDLORD_MUTATION_FRESHNESS,
    });
  }, [invalidateData]);

  const loadSummary = useCallback(async (range = statsRange, silent = false) => {
    try {
      const summaryRange = range === "month" ? "month" : "all";
      const response = await invoiceService.getSummary({
        range: summaryRange,
        exclude_invoice_type: "subscription",
        t: Date.now(),
      });

      if (!response.success) {
        if (!silent) {
          console.error("Failed to load invoice summary", response.error);
        }
        return;
      }

      const data = response.data || null;
      setSummary(data);
      updateData("landlord_payments", prev => ({
        ...(prev || {}),
        summary: data,
      }));
    } catch (err) {
      if (!silent) {
        console.error("Failed to load invoice summary", err);
      }
    }
  }, [statsRange, updateData]);

  useEffect(() => {
    loadSummary(statsRange, true);
    // statsRange is the only intended trigger.
  }, [statsRange, loadSummary]);

  const loadBookingDetails = useCallback(async (bookingIds = []) => {
    try {
      const map = {};
      // fetch each booking; if your API supports batch fetching, replace with a single call
      await Promise.all(
        bookingIds.map(async (id) => {
          try {
            const response = await bookingService.getBooking(id);
            if (!response.success) return;
            const booking = response.data || null;
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
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      if (initialLoadRef.current) setLoading(true);
      initialLoadRef.current = false;
      setError(null);
      const response = await invoiceService.getInvoices({
        exclude_invoice_type: "subscription",
        archive_filter: archiveFilter,
        t: Date.now(),
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to load invoices");
      }
      const list = response.data?.items || (Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data || []));

      if (!Array.isArray(list)) {
         setInvoices([]);
         return;
      }
      let currentBookingsMap = {};
      const bookingIds = Array.from(
        new Set(list.map((i) => i.booking_id).filter(Boolean)),
      );
      if (bookingIds.length > 0) {
        currentBookingsMap = await loadBookingDetails(bookingIds);
        setBookingsMap(prev => ({ ...prev, ...currentBookingsMap }));
      }
      setInvoices(list);

      // Update global context
      updateData("landlord_payments", prev => ({
        ...(prev || {}),
        invoices: list,
        bookingsMap: { ...(prev?.bookingsMap || {}), ...currentBookingsMap },
      }));

      await loadSummary(statsRange, true);
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
        setError(getPaymentError(e, "Unable to load invoices right now."));
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  }, [archiveFilter, getPaymentError, loadBookingDetails, loadSummary, statsRange, updateData]);

  useEffect(() => {
    // Auto-collapse sidebar when entering payments for wider table area.
    if (collapse) collapse().catch(() => { });
  }, [collapse]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);


  const handleRecordOffline = async () => {
    if (!selectedInvoice || !recordData.amount || !recordData.method) {
      showError("Please fill in amount and method");
      return;
    }

    setIsRecording(true);
    try {
      const response = await invoiceService.recordPayment(selectedInvoice.id, {
        amount_cents: new Decimal(recordData.amount || 0).times(100).round().toNumber(),
        method: recordData.method,
        reference: recordData.reference,
        notes: recordData.notes,
        received_at: new Date().toISOString(),
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to record payment");
      }

      // Cash payments recorded by landlord go to pending_verification; others are confirmed
      const isCash = recordData.method === 'cash';
      showSuccess(isCash ? "Cash payment recorded. Marked as pending verification." : "Payment recorded successfully");
      setShowInvoiceModal(false);
      refreshLandlordMutationViews();
      await loadInvoices();
    } catch (e) {
      console.error("Failed to record payment", e);
      showError(getPaymentError(e, "Unable to record payment."));
    } finally {
      setIsRecording(false);
    }
  };

  const handleVerifyCash = async (payloadInput) => {
    const invoiceId = selectedInvoice?.id || selectedInvoice?.invoice_id;
    if (!invoiceId) {
      showError('Unable to verify payment: invoice is missing an ID.');
      return;
    }

    const action = payloadInput?.action;
    if (!action || !["approve", "reject"].includes(action)) {
      showError("Please choose a valid verification action.");
      return;
    }

    const reasonCode = String(payloadInput?.reason_code || "").trim();
    const reason = String(payloadInput?.reason || "").trim();
    if (action === "reject") {
      if (!CASH_REJECTION_REASON_IDS.includes(reasonCode)) {
        showError("Please select a valid rejection reason.");
        return;
      }
      if (!reason) {
        showError("Please provide rejection details for the tenant.");
        return;
      }
    }

    const payload =
      action === "approve"
        ? { action }
        : { action: "reject", reason_code: reasonCode, reason };

    setVerifyingAction(action);
    try {
      const response = await invoiceService.verifyCash(invoiceId, payload);
      if (!response.success) {
        throw new Error(response.error || "Unable to verify payment.");
      }

      setShowRejectCashForm(false);
      setRejectReasonCode("unclear_image");
      setRejectReason("");

      showSuccess(action === 'approve' ? 'Cash payment approved — invoice marked as Paid.' : 'Cash payment rejected — tenant will be notified.');
      setShowInvoiceModal(false);
      refreshLandlordMutationViews();
      await loadInvoices();
    } catch (e) {
      console.error('Failed to verify cash payment', e);
      showError(getPaymentError(e, "Unable to verify payment."));
    } finally {
      setVerifyingAction(null);
    }
  };

  const openRejectCashForm = () => {
    setShowRejectCashForm(true);
    setRejectReasonCode("unclear_image");
    setRejectReason("");
  };

  const submitRejectCash = () => {
    handleVerifyCash({
      action: "reject",
      reason_code: rejectReasonCode,
      reason: rejectReason,
    });
  };

  const handleRefundTransaction = async (tx, amountCents) => {
    if (!tx) return;
    setIsRefunding(tx.id);
    try {
      const response = await invoiceService.refundTransaction(tx.id, {
        amount_cents: amountCents,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to process refund');
      }
      if (selectedInvoice.booking_id) {
        await updateBookingPayment(selectedInvoice.booking_id, "refunded", true);
      }
      showSuccess(
        `Refund of ${formatPrice(new Decimal(amountCents).div(100).toNumber())} processed successfully`,
      );
      setShowInvoiceModal(false);
      refreshLandlordMutationViews();
      await loadInvoices();
    } catch (e) {
      console.error("Failed to process refund", e);
      showError(getPaymentError(e, "Unable to process refund."));
    } finally {
      setIsRefunding(null);
      setRefundAmount("");
    }
  };

  const handleRefundInvoice = async (invoiceId, amountCents) => {
    setIsRefundingInvoice(true);
    try {
      const response = await invoiceService.refundInvoice(invoiceId, {
        amount_cents: amountCents,
        reason: "Merged refund for multiple partial payments",
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to process refund');
      }

      await updateBookingPayment(selectedInvoice.booking_id, "refunded", true);
      showSuccess(
        `Merged refund of ${formatPrice(new Decimal(amountCents).div(100).toNumber())} processed successfully`,
      );

      setShowMergedRefundModal(false);
      setMergedRefundPreview(null);

      // Refresh current invoice details
      const updatedInv = await invoiceService.getInvoice(invoiceId);
      if (updatedInv.success) setSelectedInvoice(updatedInv.data);
      loadInvoices(false);
    } catch (e) {
      console.error("Failed to process merged refund", e);
      showError(getPaymentError(e, "Unable to process refund."));
    } finally {
      setIsRefundingInvoice(false);
    }
  };

  const openMergedRefundConfirm = () => {
    const preview = getInvoiceRefundPreview(selectedInvoice, selectedBooking);
    const suggested = Math.max(0, Number(preview?.maxRefundableCents || 0));
    setMergedRefundPreview(preview);
    setRefundAmount(new Decimal(suggested).div(100).toDecimalPlaces(2).toString());
    setShowMergedRefundModal(true);
  };

  const openRefundConfirm = (tx) => {
    const preview = getTransactionRefundPreview(selectedInvoice, tx, selectedBooking);
    const suggested = Math.max(0, Number(preview?.maxRefundableCents || 0));
    setRefundConfirmTx({ ...tx, refund_preview: preview });
    setRefundAmount(new Decimal(suggested).div(100).toDecimalPlaces(2).toString());
  };

  const updateBookingPayment = async (bookingId, paymentStatus, silent = false) => {
    try {
      const response = await bookingService.recordPayment(bookingId, {
        payment_status: paymentStatus,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update payment status');
      }
      // Refresh invoices and list
      refreshLandlordMutationViews();
      await loadInvoices();
      if (!silent) showSuccess("Payment status updated");
    } catch (e) {
      console.error("Failed to update booking payment", e);
      showError(getPaymentError(e, "Unable to update payment status."));
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await bookingService.updateStatus(bookingId, status);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update booking status');
      }
    } catch (e) {
      console.error("Failed to update booking status", e);
      showError(getPaymentError(e, "Unable to update booking status."));
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch (__e) {
      return "—";
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedInvoice) return;
    const url = invoiceService.getReceiptUrl(selectedInvoice.id);
    window.open(url, "_blank");
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
      case "overdue":
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
    // Exception: Allow refunded items to show in history even if booking is cancelled
    if (
      paymentFilter === "all" &&
      (bookingStatus === "cancelled" || bookingStatus === "pending") &&
      statusNormalized !== "refunded"
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
      inv.amount_cents ? new Decimal(inv.amount_cents).div(100).toDecimalPlaces(2).toString() : inv.amount || ""
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
      ? new Decimal(inv.amount_cents).div(100).toNumber()
      : inv.amount
        ? new Decimal(inv.amount).toNumber()
        : 0;
    const paidAmount =
      inv.transactions
        ?.filter(tx => tx.status === 'succeeded' || tx.status === 'paid' || tx.status === 'partially_refunded')
        .reduce(
          (sum, tx) => {
            const txAmt = tx.amount_cents ? new Decimal(tx.amount_cents).div(100).toNumber() : new Decimal(tx.amount || 0).toNumber();
            const txRef = tx.refunded_amount_cents ? new Decimal(tx.refunded_amount_cents).div(100).toNumber() : 0;
            return new Decimal(sum).plus(new Decimal(txAmt).minus(txRef)).toNumber();
          },
          0,
        ) || 0;
    const balance = Math.max(0, new Decimal(price).minus(paidAmount).toNumber());
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
        <td className="pl-6 py-4 text-sm font-medium text-gray-900 dark:text-white hidden xl:table-cell">
          {invoiceId}
        </td>
        <td className="px-3 sm:px-6 py-4 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
          {inv.receipt_reference || "—"}
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {bookingFromMap?.__derived?.tenant_name || tenantDisplay}
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">
          {bookingFromMap?.__derived?.property_title || propertyDisplay}
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {bookingFromMap?.__derived?.room_label || roomDisplay}
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{issued ? formatDate(issued) : "—"}</span>
          </div>
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
          <PriceRow amount={price} />
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400 hidden 2xl:table-cell">
          <PriceRow amount={paidAmount} />
        </td>
        <td className="px-3 sm:px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 hidden 2xl:table-cell">
          <PriceRow amount={balance} />
        </td>
        <td className="px-3 sm:px-6 py-4">
          <span
            className={`px-4 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(status)}`}
          >
            {status === 'pending_verification' ? 'Verify' : (status ? status.charAt(0).toUpperCase() + status.slice(1) : "—")}
          </span>
        </td>
        <td className="px-3 sm:px-6 py-4 text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)] group">
          {inv.booking_id || inv.id ? (
            <button
              onClick={() => {
                setSelectedInvoice(inv);
                setShowInvoiceModal(true);
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors"
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

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="pl-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="flex items-center justify-end gap-2 mb-3">
          {[
            { value: "month", label: "This Month" },
            { value: "all", label: "All Time" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatsRange(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statsRange === option.value
                ? "bg-green-600 text-white shadow-sm shadow-green-500/20"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Collected This Month" : "Total Collected"}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Outstanding This Month" : "Total Outstanding"}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Paid Invoices (Month)" : "Paid Invoices"}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{stats.paidCount}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Pending Invoices (Month)" : "Pending Invoices"}</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pendingCount}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Overdue Invoices (Month)" : "Overdue Invoices"}</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{stats.overdueCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {stats.pendingVerifCount > 0 && (
            <div
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{statsRange === "month" ? "Cash Verify (Month)" : "Cash Verification"}</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.pendingVerifCount}</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
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
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${paymentFilter === s
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
                onClick={() => navigate('/payments/logs')}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-md whitespace-nowrap"
              >
                <FileText className="w-4 h-4" /> Payment Logs
              </button>
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
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    Invoice ID
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                    Receipt No.
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tenant Name
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    Property
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    Issued
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider hidden 2xl:table-cell">
                    Paid
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider hidden 2xl:table-cell">
                    Balance
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky right-0 z-20 bg-gray-50 dark:bg-gray-700/50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.25)]">
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
                    Payment Details
                  </h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                    REF:{" "}
                    {selectedInvoice.reference || `INV-${selectedInvoice.id}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {["paid", "partially_refunded"].includes(getInvoiceStatus(selectedInvoice)) && (
                    <button
                      onClick={handlePrintReceipt}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 dark:text-brand-300 rounded-lg font-bold text-xs transition-colors border border-brand-200 dark:border-brand-800"
                    >
                      <FileText className="w-4 h-4" />
                      Print Receipt
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowInvoiceModal(false);
                      setRefundConfirmTx(null);
                      setRefundAmount("");
                      // Clear invoiceId from URL when closing modal
                      const params = new URLSearchParams(location.search);
                      if (params.has('invoiceId')) {
                        params.delete('invoiceId');
                        navigate({ search: params.toString() }, { replace: true });
                      }
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Info */}
                {(() => {
                  const selTotal = selectedInvoice.amount_cents
                    ? new Decimal(selectedInvoice.amount_cents).div(100).toNumber()
                    : new Decimal(selectedInvoice.amount || 0).toNumber();
                  const selPaid =
                    selectedInvoice.transactions
                      ?.filter(tx => ["succeeded", "paid", "partially_refunded"].includes(tx.status))
                      .reduce(
                        (sum, tx) => {
                          const txAmt = tx.amount_cents ? new Decimal(tx.amount_cents).div(100).toNumber() : new Decimal(tx.amount || 0).toNumber();
                          const txRef = tx.refunded_amount_cents ? new Decimal(tx.refunded_amount_cents).div(100).toNumber() : 0;
                          return new Decimal(sum).plus(new Decimal(txAmt).minus(txRef)).toNumber();
                        },
                        0,
                      ) || 0;
                  const selRemaining = Math.max(0, new Decimal(selTotal).minus(selPaid).toNumber());
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
                        </div>                      </div>
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
                        <p className="font-bold text-gray-900 dark:text-white">{formatPrice(new Decimal(REFUND_FIXED_PENALTY_CENTS).div(100).toNumber())}</p>
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

                    {/* Proof of Payment Image */}
                    {(() => {
                      const pendingTx = selectedInvoice?.transactions?.find(tx => tx.status === 'pending_offline');
                      const proofUrl = pendingTx?.proof_image_url || pendingTx?.gateway_response?.proof_image_url;
                      return proofUrl ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">Proof of Payment</p>
                          <div
                            className="relative group cursor-zoom-in rounded-xl overflow-hidden border-2 border-orange-200 dark:border-orange-700 bg-black/5"
                            onClick={() => setProofLightboxUrl(proofUrl)}
                            title="Click to enlarge"
                          >
                            <img
                              src={proofUrl}
                              alt="Proof of payment"
                              className="w-full max-h-64 object-contain rounded-xl transition-transform group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                Click to enlarge
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-orange-700 dark:text-orange-400 italic">
                            {pendingTx?.gateway_reference ? `Ref: ${pendingTx.gateway_reference}` : ''}
                            {pendingTx?.gateway_response?.notes ? (pendingTx?.gateway_reference ? ' · ' : '') + `Note: ${pendingTx.gateway_response.notes}` : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-orange-100/60 dark:bg-orange-900/30 rounded-lg border border-dashed border-orange-300 dark:border-orange-700">
                          <ShieldX className="w-4 h-4 text-orange-500 shrink-0" />
                          <p className="text-xs text-orange-700 dark:text-orange-400">No proof image was attached with this submission.</p>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleVerifyCash({ action: 'approve' })}
                        disabled={!!verifyingAction}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-md"
                      >
                        {verifyingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {verifyingAction === 'approve' ? 'Approving...' : 'Approve Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={openRejectCashForm}
                        disabled={!!verifyingAction}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-md"
                      >
                        {verifyingAction === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
                        {verifyingAction === 'reject' ? 'Rejecting...' : 'Reject Payment'}
                      </button>
                    </div>

                    {showRejectCashForm && (
                      <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Rejection Reason Category *
                          </label>
                          <select
                            value={rejectReasonCode}
                            onChange={(e) => setRejectReasonCode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            disabled={verifyingAction === 'reject'}
                          >
                            {CASH_REJECTION_REASONS.map((item) => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Rejection Details *
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white h-24"
                            placeholder="Explain what is wrong so the tenant can correct and resubmit."
                            disabled={verifyingAction === 'reject'}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRejectCashForm(false)}
                            disabled={verifyingAction === 'reject'}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={submitRejectCash}
                            disabled={verifyingAction === 'reject'}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-60"
                          >
                            {verifyingAction === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!["paid", "refunded", "cancelled", "pending_verification"].includes(
                  getInvoiceStatus(selectedInvoice),
                ) && (
                    <>
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">
                          Record Payment Details
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
                              icon: XCircle,
                              color:
                                "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
                            },
                            {
                              id: "partial",
                              label: "Partial",
                              icon: Clock,
                              color:
                                "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
                            },
                            {
                              id: "paid",
                              label: "Paid",
                              icon: CheckCircle,
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
                              className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg border text-[10px] font-bold transition-all ${status.color}`}
                            >
                              <status.icon className="w-3.5 h-3.5" />
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
                            const txAmtCents = new Decimal(tx.amount_cents).minus(tx.refunded_amount_cents ?? 0).toNumber();
                            const alreadyRefunded =
                              tx.status === "refunded" ||
                              new Decimal(tx.refunded_amount_cents ?? 0).gte(tx.amount_cents);
                            const isPartiallyRefunded = !alreadyRefunded && new Decimal(tx.refunded_amount_cents ?? 0).gt(0);

                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                              >
                                <div>
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                    {formatPrice(new Decimal(txAmtCents).div(100).toNumber())}{" "}
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
                                      Estimated refundable now: {formatPrice(new Decimal(preview?.maxRefundableCents || 0).div(100).toNumber())}
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

                        {/* Merged Refund Button for multiple partial payments */}
                        {selectedInvoice.transactions.filter(t => t.amount_cents > 0 && (t.status !== 'refunded')).length > 1 && (
                          <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                            <button
                              onClick={openMergedRefundConfirm}
                              disabled={isRefundingInvoice}
                              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                              {isRefundingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                              Refund Total (Merged)
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2 text-center italic font-medium">
                              This will merge multiple partial payments into a single refund record.
                            </p>
                          </div>
                        )}
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
                  onClick={() => {
                    setShowInvoiceModal(false);
                    // Clear invoiceId from URL when closing modal
                    const params = new URLSearchParams(location.search);
                    if (params.has('invoiceId')) {
                      params.delete('invoiceId');
                      navigate({ search: params.toString() }, { replace: true });
                    }
                  }}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proof of Payment Lightbox */}
        {proofLightboxUrl && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
            onClick={() => setProofLightboxUrl(null)}
          >
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setProofLightboxUrl(null)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={proofLightboxUrl}
                alt="Proof of payment (full size)"
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <p className="text-center text-white/60 text-xs mt-3">Click anywhere outside to close</p>
            </div>
          </div>
        )}

        {/* Merged Refund Confirmation Modal */}
        {showMergedRefundModal && mergedRefundPreview && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in duration-200 overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                  <RotateCcw className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                  Merged Refund
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                  You are about to issue a single merged refund for this invoice.
                </p>

                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider text-gray-500">
                    <span>Invoice Ref</span>
                    <span className="text-gray-900 dark:text-white">{selectedInvoice.referenceNo}</span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 w-full" />
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-black text-gray-400 uppercase text-left">
                      Amount to Refund (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 focus:border-red-500 rounded-2xl text-2xl font-black text-gray-900 dark:text-white outline-none transition-all"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">
                        Max Refundable
                      </p>
                      <p className="text-[10px] text-red-600 font-black">
                        {formatPrice(new Decimal(mergedRefundPreview.maxRefundableCents).div(100).toNumber())}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/30 flex gap-3">
                <button
                  onClick={() => {
                    setShowMergedRefundModal(false);
                    setMergedRefundPreview(null);
                  }}
                  disabled={isRefundingInvoice}
                  className="flex-1 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const cents = new Decimal(refundAmount || 0).times(100).round().toNumber();
                    if (!cents || isNaN(cents)) return showError("Please enter a valid amount");
                    handleRefundInvoice(selectedInvoice.id, cents);
                  }}
                  disabled={isRefundingInvoice || !refundAmount}
                  className="flex-[1.5] py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 dark:shadow-none flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {isRefundingInvoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Proceed Refund"
                  )}
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
                  new Decimal(refundConfirmTx?.amount_cents || 0).minus(refundConfirmTx?.refunded_amount_cents || 0).toNumber(),
                );
                const maxRefundableCents = new Decimal(
                  refundConfirmTx?.refund_preview?.maxRefundableCents || 0,
                ).toNumber();
                const requestedCents = new Decimal(refundAmount || 0).times(100).round().toNumber();
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
                       Estimated refundable now: <span className="font-bold text-gray-900 dark:text-white">{formatPrice(new Decimal(maxRefundableCents).div(100).toNumber())}</span>
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
  { label: 'This Month', getDates: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'Last Month', getDates: () => { const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth() - 1, 1); const t = new Date(n.getFullYear(), n.getMonth(), 0); return { from: f.toISOString().split('T')[0], to: t.toISOString().split('T')[0] }; } },
  { label: 'Last 3 Months', getDates: () => { const n = new Date(); const f = new Date(n); f.setMonth(f.getMonth() - 3); return { from: f.toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'This Year', getDates: () => { const n = new Date(); return { from: new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'All Time', getDates: () => ({ from: '', to: '' }) },
  { label: 'Custom', getDates: () => null },
];

function ExportModal({ invoices, bookingsMap, onClose }) {
  const { uiState } = useUIState();
  const cachedProps = uiState.data?.accessible_properties || [];

  const [selectedProperty, setSelectedProperty] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  const [preset, setPreset] = useState('This Month');
  const [dateFrom, setDateFrom] = useState(PRESETS[0].getDates().from);
  const [dateTo, setDateTo] = useState(PRESETS[0].getDates().to);
  const [exporting, setExporting] = useState(false);

  const isCustom = preset === 'Custom';

  const fetchRoomsForProperty = useCallback(async (propertyId) => {
    if (!propertyId) return;

    setLoadingRooms(true);
    setRoomsError('');

    try {
      const response = await roomService.getRoomsByProperty(propertyId);
      const list = response.success
        ? (response.data?.items || (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : [])))
        : [];
      setRooms(list);
    } catch (__err) {
      setRooms([]);
      setRoomsError('Unable to load rooms for this property right now. You can retry or continue with property-level export.');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setRooms([]);
      setRoomsError('');
      setSelectedRoom('');
      return;
    }

    fetchRoomsForProperty(selectedProperty);
    setSelectedRoom('');
  }, [selectedProperty, fetchRoomsForProperty]);

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
        if (dateTo && issued > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });

      if (result.length === 0) {
        showError('No records match your selected filters.');
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
        const amount = inv.amount_cents ? new Decimal(inv.amount_cents).div(100).toNumber() : new Decimal(inv.amount || 0).toNumber();
        const paid = (inv.transactions || [])
          .filter(tx => ['succeeded', 'paid', 'partially_refunded'].includes(tx.status))
          .reduce((s, tx) => new Decimal(s).plus(new Decimal(tx.amount_cents ? new Decimal(tx.amount_cents).div(100).toNumber() : new Decimal(tx.amount || 0).toNumber()).minus(tx.refunded_amount_cents ? new Decimal(tx.refunded_amount_cents).div(100).toNumber() : 0)).toNumber(), 0);
        const balance = Math.max(0, new Decimal(amount).minus(paid).toNumber());
        const status = (inv.status || 'pending').charAt(0).toUpperCase() + (inv.status || 'pending').slice(1);
        return [`"${inv.reference || `INV-${inv.id}`}"`, `"${tenantName}"`, `"${property}"`, `"${room}"`, issued ? new Date(issued).toLocaleDateString() : '—', amount.toFixed(2), paid.toFixed(2), balance.toFixed(2), status].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const propLabel = selectedProperty ? (cachedProps.find(p => String(p.id) === String(selectedProperty))?.title || 'property') : 'all';
      const dateLabel = preset === 'All Time' ? 'all-time' : `${dateFrom}_to_${dateTo}`;
      link.download = `payments_${propLabel.replace(/\s+/g, '-')}_${dateLabel}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showSuccess(`${result.length} record${result.length !== 1 ? 's' : ''} exported!`);
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
              {roomsError && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{roomsError}</p>
                  <button
                    type="button"
                    onClick={() => fetchRoomsForProperty(selectedProperty)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
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