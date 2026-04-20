import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  Check,
  Users,
  BedDouble,
  DollarSign,
  Layers,
  Shield,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { showSuccess, showError, showLoading } from "../../utils/toast";
import { getAgeInYears } from "../../utils/dateUtils";
import api from "../../utils/api";
import ImagePlaceholder from "../Shared/ImagePlaceholder";
import ImageCarousel from "../Shared/ImageCarousel";
import bookingServiceDefault from "../../services/bookingService";
import { useCart } from "../../contexts/CartContext.jsx";
import systemToggleService from "../../services/systemToggleService";

const DEFAULT_TOGGLES = systemToggleService.getDefaults();

export default function RoomDetailsModal({
  room,
  property,
  onClose,
  isAuthenticated,
  onLoginRequired,
  initialView,
  onBookingSuccess,
  bookingService,
  isEditing = false,
}) {
  const PROXY_MINIMUM_AGE = 18;
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [viewMode, setViewMode] = useState(initialView || "details"); // 'details' | 'booking'
  const [isCartMode, setIsCartMode] = useState(false);
  const [bedCount, setBedCount] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("monthly");
  const [contractMode, setContractMode] = useState(
    String(room?.billing_policy || "monthly").toLowerCase() === "daily"
      ? "daily"
      : "monthly",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [promoOffer, setPromoOffer] = useState(null);
  const [duration, setDuration] = useState(null);
  const [_pricingBreakdown, setPricingPreview] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [autoNavTimer, setAutoNavTimer] = useState(null);
  const [bookingMode, setBookingMode] = useState("normal");
  const [proxyOccupants, setProxyOccupants] = useState([]);
  const [reservationFeeTempDisabled, setReservationFeeTempDisabled] = useState(DEFAULT_TOGGLES.reservationFeeDisabled);
  const [selectedBedNumbers, setSelectedBedNumbers] = useState([]);

  const createEmptyOccupant = (defaultSex = "") => ({
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    sex: defaultSex,
    relationship_to_booker: "",
    phone: "",
    email: "",
    bed_number: null,
  });

  const normalizePropertyTypeToken = (propertyType) =>
    String(propertyType || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  const normalizeTenantGender = (sex) => {
    const normalized = String(sex || "").toLowerCase().trim();
    if (["male", "boy", "boys"].includes(normalized)) return "male";
    if (["female", "girl", "girls"].includes(normalized)) return "female";
    return null;
  };

  const normalizeRoomRestriction = (restriction) => {
    const normalized = String(restriction || "mixed").toLowerCase().trim();
    if (["male", "boy", "boys"].includes(normalized)) return "male";
    if (["female", "girl", "girls"].includes(normalized)) return "female";
    return "mixed";
  };

  const normalizeProxyOccupantGender = (sex) => {
    const normalized = String(sex || "").toLowerCase().trim();
    if (!normalized) return "";
    if (["male", "boy", "boys"].includes(normalized)) return "male";
    if (["female", "girl", "girls"].includes(normalized)) return "female";
    return "";
  };

  const resolveStoredTenantGender = () => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage?.getItem("userData");
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return (
        parsed?.sex ||
        parsed?.user?.sex ||
        parsed?.data?.sex ||
        null
      );
    } catch {
      return null;
    }
  };

  const toMoneyNumber = (value, fallback = 0) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const sanitized = value.replace(/[^\d.-]/g, "");
      const parsed = parseFloat(sanitized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const toWholeNumber = (value, fallback = 0) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? Math.floor(value) : fallback;
    }

    if (typeof value === "string") {
      const match = value.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    }

    return fallback;
  };

  const toLocalDate = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const parseIsoDateOnly = (value) => {
    const trimmed = String(value || "").trim();
    const matches = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matches) return null;

    const year = Number(matches[1]);
    const month = Number(matches[2]);
    const day = Number(matches[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const toDateInputValue = (dateValue) => {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const latestAllowedAdultDob = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setFullYear(today.getFullYear() - PROXY_MINIMUM_AGE);
    return toDateInputValue(today);
  })();

  const OCCUPANT_FIELD_LABELS = {
    first_name: "first name",
    middle_name: "middle name",
    last_name: "last name",
    date_of_birth: "date of birth",
    sex: "sex",
    relationship_to_booker: "relationship to booker",
    phone: "phone",
    email: "email",
  };

  const hasAnyProxyOccupantValue = (occupant) =>
    [
      occupant.first_name,
      occupant.middle_name,
      occupant.last_name,
      occupant.date_of_birth,
      occupant.sex,
      occupant.relationship_to_booker,
      occupant.phone,
      occupant.email,
    ].some((value) => Boolean(String(value || "").trim()));

  const getProxyOccupantMissingFieldMessage = (occupant, index) => {
    const prefix = `Occupant ${index + 1}:`;
    if (!occupant.first_name) return `${prefix} first name is required.`;
    if (!occupant.last_name) return `${prefix} last name is required.`;
    if (!occupant.date_of_birth) return `${prefix} date of birth is required.`;
    if (!occupant.sex) return `${prefix} sex is required.`;
    if (!occupant.relationship_to_booker) return `${prefix} relationship to booker is required.`;
    return null;
  };

  const formatApiValidationMessage = (errors) => {
    if (!errors || typeof errors !== "object") {
      return null;
    }

    const firstEntry = Object.entries(errors).find(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );

    if (!firstEntry) {
      return null;
    }

    const [rawPath, rawMessage] = firstEntry;
    const normalizedPath = String(rawPath).replace(/\[(\d+)\]/g, ".$1");
    const message = Array.isArray(rawMessage) ? rawMessage[0] : String(rawMessage || "");

    const itemOccupantMatch = normalizedPath.match(/items\.(\d+)\.occupants\.(\d+)\.([a-zA-Z_]+)/);
    if (itemOccupantMatch) {
      const [, itemIndex, occupantIndex, rawField] = itemOccupantMatch;
      const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, " ");
      return `Cart item ${Number(itemIndex) + 1}, occupant ${Number(occupantIndex) + 1} ${fieldLabel}: ${message}`;
    }

    const occupantMatch = normalizedPath.match(/occupants\.(\d+)\.([a-zA-Z_]+)/);
    if (occupantMatch) {
      const [, occupantIndex, rawField] = occupantMatch;
      const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, " ");
      return `Occupant ${Number(occupantIndex) + 1} ${fieldLabel}: ${message}`;
    }

    const rawField = normalizedPath.split(".").pop() || "";
    const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, " ");
    if (!fieldLabel) {
      return message;
    }

    return `${fieldLabel.charAt(0).toUpperCase()}${fieldLabel.slice(1)}: ${message}`;
  };

  const toBooleanFlag = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) return true;
      if (["0", "false", "no", "off", ""].includes(normalized)) return false;
    }
    return null;
  };

  const formatMoney = (value) => {
    const amount = toMoneyNumber(value, 0);
    return `₱${amount.toLocaleString()}`;
  };

  const billingPolicy = String(room?.billing_policy || "monthly").toLowerCase();
  const pricingModel = String(room?.pricing_model || "full_room").toLowerCase();
  const supportsContractModeSwitch = billingPolicy === "monthly_with_daily";
  const isDailyContract =
    billingPolicy === "daily" ||
    (supportsContractModeSwitch && contractMode === "daily");
  const hasCheckout = Boolean(endDate) && new Date(endDate) > new Date(startDate);
  const resolvedCapacity = Math.max(
    1,
    toWholeNumber(room?.raw_capacity ?? room?.capacity, 1),
  );
  const resolvedAvailableSlots = toWholeNumber(
    room?.available_slots ?? room?.availableSlots,
    -1,
  );
  const resolvedOccupiedCount = Math.min(
    resolvedCapacity,
    Math.max(
      0,
      toWholeNumber(
        room?.occupied_count ?? room?.occupied,
        resolvedAvailableSlots >= 0
          ? Math.max(0, resolvedCapacity - resolvedAvailableSlots)
          : 0,
      ),
    ),
  );


  const maxBookableBeds = pricingModel === "per_bed"
    ? Math.max(
      1,
      resolvedAvailableSlots >= 0 ? resolvedAvailableSlots : resolvedCapacity,
    )
    : 1;
  const showBedCountSelector = pricingModel === "per_bed" && bookingMode === "proxy";
  const roomGender = normalizeRoomRestriction(room?.sex_restriction);
  const requiredProxyGender = roomGender === "male" || roomGender === "female"
    ? roomGender
    : "";
  const occupantLimit =
    pricingModel === "per_bed"
      ? Math.max(1, Math.min(bedCount, maxBookableBeds))
      : resolvedCapacity;
  const monthlyRate = toMoneyNumber(
    room?.monthly_rate ?? room?.monthlyRate ?? room?.price,
    0,
  );
  const dailyRate = toMoneyNumber(
    room?.daily_rate ?? room?.dailyRate,
    monthlyRate > 0 ? Math.round(monthlyRate / 30) : 0,
  );

  const primaryRate = isDailyContract ? dailyRate : monthlyRate;
  const primaryRateLabel = isDailyContract ? "Daily Rate" : "Monthly Rate";
  const reservationFeeAmount = toMoneyNumber(
    property?.reservation_fee_amount ?? property?.reservation_fee,
    0,
  );
  const reservationFeeSetting =
    property?.require_reservation_fee ?? property?.requireReservationFee;
  const normalizedReservationFeeSetting = toBooleanFlag(reservationFeeSetting);

  useEffect(() => {
    let mounted = true;
    systemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setReservationFeeTempDisabled(Boolean(result.data.reservationFeeDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const isReservationFeeEnabled = !reservationFeeTempDisabled && (
    reservationFeeSetting === undefined || reservationFeeSetting === null
      ? reservationFeeAmount > 0
      : (normalizedReservationFeeSetting ?? reservationFeeAmount > 0)
  );
  const isReservationFeeConfigured = isReservationFeeEnabled && reservationFeeAmount > 0;
  const reservationFeeThresholdDays = 3;
  const moveInDate = toLocalDate(startDate);
  const bookingIssuedDate = new Date();
  bookingIssuedDate.setHours(0, 0, 0, 0);
  const daysUntilMoveIn = moveInDate
    ? Math.max(0, Math.floor((moveInDate.getTime() - bookingIssuedDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isReservationFeeRequired =
    isReservationFeeConfigured && daysUntilMoveIn > reservationFeeThresholdDays;

  useEffect(() => {
    if (billingPolicy === "daily") {
      setContractMode("daily");
      return;
    }

    setContractMode("monthly");
  }, [billingPolicy, room?.id]);

  // Initialize dates
  useEffect(() => {
    const today = new Date();

    setStartDate(today.toISOString().split("T")[0]);
    setBookingMode("normal");
    setProxyOccupants([]);
    if (isDailyContract) {
      const defaultEnd = new Date(today);
      defaultEnd.setDate(defaultEnd.getDate() + 1);
      setEndDate(defaultEnd.toISOString().split("T")[0]);
    } else {
      setEndDate("");
    }
  }, [isDailyContract]);

  // Fetch pricing whenever dates change
  useEffect(() => {
    const fetchPricing = async () => {
      if (!room?.id || !startDate) {
        setTotalPrice(0);
        setPromoOffer(null);
        setDuration(null);
        return;
      }

      const start = new Date(startDate);
      const hasValidCheckout = Boolean(endDate) && new Date(endDate) > start;

      let pricingEndDate = endDate;
      if (!isDailyContract && !hasValidCheckout) {
        const previewEnd = new Date(start);
        previewEnd.setDate(previewEnd.getDate() + 30);
        pricingEndDate = previewEnd.toISOString().split("T")[0];
      }

      if (!pricingEndDate || new Date(pricingEndDate) <= start) {
        setTotalPrice(0);
        setPromoOffer(null);
        setDuration(null);
        return;
      }

      setLoadingPricing(true);
      try {
        const res = await api.get(`/rooms/${room.id}/pricing`, {
          params: {
            start: startDate,
            end: pricingEndDate,
            bed_count: bedCount,
            contract_mode: isDailyContract ? "daily" : "monthly",
          },
        });

        const baseTotal = Number(res.data.base_total ?? res.data.total ?? 0);
        setTotalPrice(baseTotal);
        setPromoOffer(res.data.promo_offer || null);
        setPricingPreview(res.data.breakdown);
        setDuration({
          days: res.data.days || 0,
          months: res.data.breakdown?.months || 0,
          extraDays: res.data.breakdown?.remaining_days || 0
        });
      } catch (err) {
        console.error('Pricing calculation failed', err);
        // Fallback to 0 or error state
        setTotalPrice(0);
        setPromoOffer(null);
      } finally {
        setLoadingPricing(false);
      }
    };

    const timer = setTimeout(fetchPricing, 300); // Debounce
    return () => clearTimeout(timer);
  }, [startDate, endDate, room?.id, bedCount, isDailyContract]);

  useEffect(() => {
    return () => {
      if (autoNavTimer) clearTimeout(autoNavTimer);
    };
  }, [autoNavTimer]);

  useEffect(() => {
    if (bookingMode !== "proxy") {
      return;
    }

    setProxyOccupants((prev) => {
      const base = prev.length > 0 ? prev : [createEmptyOccupant(requiredProxyGender)];
      return base.slice(0, occupantLimit);
    });
  }, [bookingMode, occupantLimit, requiredProxyGender]);

  useEffect(() => {
    setBedCount((prev) => {
      if (prev > maxBookableBeds) return maxBookableBeds;
      return prev;
    });
  }, [maxBookableBeds]);

  useEffect(() => {
    // Auto-select bed number if only one is available and user is booking exactly one bed
    if (bookingMode === "normal" && room.available_bed_numbers?.length === 1 && bedCount === 1) {
      const singleBed = String(room.available_bed_numbers[0]);
      setSelectedBedNumbers((prev) => {
        if (prev.length !== 1 || prev[0] !== singleBed) {
          return [singleBed];
        }
        return prev;
      });
    }
  }, [room.available_bed_numbers, bedCount, bookingMode]);

  useEffect(() => {
    if (isDailyContract) {
      setPaymentPlan("full");
      return;
    }

    const hasCheckout = Boolean(endDate) && new Date(endDate) > new Date(startDate);
    if (!hasCheckout) {
      setPaymentPlan("monthly");
      return;
    }

    const showSelector = Boolean(
      duration && (duration.months > 1 || (duration.months === 1 && duration.extraDays > 0)),
    );
    if (!showSelector) {
      setPaymentPlan("full");
      return;
    }

    const promoEligible = Boolean(promoOffer);
    if (promoEligible && !["monthly", "promo_one_time"].includes(paymentPlan)) {
      setPaymentPlan("monthly");
      return;
    }

    if (!promoEligible && !["monthly", "full"].includes(paymentPlan)) {
      setPaymentPlan("full");
    }
  }, [
    isDailyContract,
    endDate,
    startDate,
    duration,
    promoOffer,
    paymentPlan,
  ]);

  const isLimitReached = React.useMemo(() => {
    if (!property || !property.tenant_usage) return false;
    const usage = property.tenant_usage;
    if (bookingMode === "normal") {
      return (
        property.normal_booking_limit > 0 &&
        usage.normal >= property.normal_booking_limit
      );
    }
    return (
      property.proxy_booking_limit > 0 &&
      usage.proxy >= property.proxy_booking_limit
    );
  }, [property, bookingMode]);

  if (!room) return null;

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);

    if (isDailyContract) {
      const start = new Date(newStart);
      const newEnd = new Date(start);
      newEnd.setDate(newEnd.getDate() + 1);
      setEndDate(newEnd.toISOString().split("T")[0]);
      return;
    }

    if (endDate && new Date(endDate) <= new Date(newStart)) {
      setEndDate("");
    }
  };

  const handleAddProxyOccupant = () => {
    setProxyOccupants((prev) => {
      if (prev.length >= occupantLimit) return prev;
      return [...prev, createEmptyOccupant(requiredProxyGender)];
    });
  };

  const handleRemoveProxyOccupant = (index) => {
    setProxyOccupants((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [createEmptyOccupant(requiredProxyGender)];
    });
  };

  const handleProxyOccupantChange = (index, field, value) => {
    let nextValue = value;
    if (field === "sex") {
      nextValue = normalizeProxyOccupantGender(value);
    }

    setProxyOccupants((prev) =>
      prev.map((occupant, idx) =>
        idx === index ? { ...occupant, [field]: nextValue } : occupant,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    if (!startDate || (isDailyContract && !endDate)) {
      showError(isDailyContract
        ? "Please select both check-in and check-out dates."
        : "Please select a move-in date.");
      return;
    }

    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isDailyContract) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (start < tomorrow) {
        showError("For daily rentals, check-in must be at least one day after today.");
        return;
      }
    } else {
      if (start < today) {
        showError(`${isDailyContract ? 'Check-in' : 'Move-in'} date cannot be in the past.`);
        return;
      }
    }

    const hasCheckout = Boolean(endDate) && new Date(endDate) > start;
    if (endDate && !hasCheckout) {
      showError(`${isDailyContract ? 'Check-out' : 'Move-out'} date must be after ${isDailyContract ? 'check-in' : 'move-in'} date.`);
      return;
    }

    const end = hasCheckout ? new Date(endDate) : null;
    const diffTime = end ? Math.abs(end - start) : 0;
    const diffDays = end ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    const minStay = parseInt(room.min_stay_days) || 1;
    const effectiveMinStay = minStay;

    if (isDailyContract && hasCheckout && diffDays < effectiveMinStay) {
      const msg = `The minimum stay for this room is ${effectiveMinStay} days.`;
      showError(msg);
      return;
    }

    if (!isDailyContract && duration?.extraDays > 0 && !endDate) {
      showError("A move-out date is required for stays with extra days.");
      return;
    }

    if (hasCheckout && !isDailyContract && billingPolicy === "monthly" && duration && duration.extraDays > 0) {
      showError(
        `Billing Policy: Stays with extra days (${duration.extraDays} days extra) will be charged for the full next month under the Monthly policy.`,
        { duration: 6000 }
      );
    }

    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    if (start > threeMonthsFromNow) {
      showError("You cannot book a room more than 3 months in advance.");
      return;
    }

    const normalizedOccupants = proxyOccupants
      .map((occupant) => {
        return {
          first_name: String(occupant.first_name || "").trim(),
          middle_name: String(occupant.middle_name || "").trim(),
          last_name: String(occupant.last_name || "").trim(),
          date_of_birth: String(occupant.date_of_birth || "").trim(),
          sex: normalizeProxyOccupantGender(occupant.sex || requiredProxyGender),
          relationship_to_booker: String(occupant.relationship_to_booker || "").trim(),
          phone: String(occupant.phone || "").trim(),
          email: String(occupant.email || "").trim(),
          bed_number: occupant.bed_number || null,
        };
      })
      .filter((occupant) => hasAnyProxyOccupantValue(occupant));

    if (bookingMode === "proxy") {
      if (normalizedOccupants.length === 0) {
        showError("Proxy booking requires at least one occupant.");
        return;
      }

      if (normalizedOccupants.length > occupantLimit) {
        showError(
          `This booking can only hold up to ${occupantLimit} occupant${occupantLimit > 1 ? "s" : ""}.`,
        );
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < normalizedOccupants.length; i += 1) {
        const occupant = normalizedOccupants[i];
        const missingFieldMessage = getProxyOccupantMissingFieldMessage(occupant, i);
        if (missingFieldMessage) {
          showError(missingFieldMessage);
          return;
        }

        const parsedDob = parseIsoDateOnly(occupant.date_of_birth);
        if (!parsedDob) {
          showError(`Occupant ${i + 1}: please select a valid date of birth.`);
          return;
        }

        if (parsedDob >= today) {
          showError(`Occupant ${i + 1}: date of birth must be before today.`);
          return;
        }

        const age = getAgeInYears(parsedDob, today);
        if (age < PROXY_MINIMUM_AGE) {
          showError(`Occupant ${i + 1} must be at least ${PROXY_MINIMUM_AGE} years old.`);
          return;
        }

        if (requiredProxyGender && occupant.sex !== requiredProxyGender) {
          showError(
            `Occupant ${i + 1} must be ${requiredProxyGender}. This room is ${requiredProxyGender === "male" ? "for boys" : "for girls"} only.`,
          );
          return;
        }
      }
    }

    // Check if selector should be shown
    const isMonthlyBilling = !isDailyContract;
    const showSelector = isMonthlyBilling && hasCheckout && duration && (duration.months > 1 || (duration.months === 1 && duration.extraDays > 0));
    const promoEligible = Boolean(promoOffer);

    let resolvedPaymentPlan = paymentPlan;
    if (promoEligible && !['monthly', 'promo_one_time'].includes(resolvedPaymentPlan)) {
      resolvedPaymentPlan = 'monthly';
    }
    if (!promoEligible && !['monthly', 'full'].includes(resolvedPaymentPlan)) {
      resolvedPaymentPlan = 'full';
    }

    const finalPaymentPlan = isDailyContract
      ? 'full'
      : (hasCheckout ? (showSelector ? resolvedPaymentPlan : 'full') : 'monthly');

    // Submit booking to server (use shared /bookings endpoint)
    setIsSubmitting(true);
    try {
      let finalBedCount = bedCount;
      if (bookingMode === "proxy") {
        // Force bed_count to match the number of occupants if it's higher
        finalBedCount = Math.max(bedCount, normalizedOccupants.length);
      }

      if (bookingMode === "normal" && room.available_bed_numbers?.length > 0 && resolvedCapacity > 1 && (finalBedCount > 1 || room.available_bed_numbers.length > 1)) {
        if (selectedBedNumbers.filter(Boolean).length < finalBedCount) {
          showError(`Please select ${finalBedCount > 1 ? "all bed numbers" : "a bed number"}.`);
          setIsSubmitting(false);
          return;
        }
      }

      if (bookingMode === "proxy") {
        const occupantsWithBeds = normalizedOccupants.filter(o => o.bed_number);
        if (room.available_bed_numbers?.length > 0 && occupantsWithBeds.length < normalizedOccupants.length) {
          showError("Please assign a bed number for all occupants.");
          setIsSubmitting(false);
          return;
        }
      }

      const bedNumbersString = bookingMode === "normal"
        ? selectedBedNumbers.filter(Boolean).join(',')
        : normalizedOccupants.map(o => o.bed_number).filter(Boolean).join(',');

      const payload = {
        room_id: room.id,
        booking_mode: bookingMode,
        bed_count: finalBedCount,
        bed_numbers: bedNumbersString,
        start_date: startDate,
        end_date: hasCheckout ? endDate : null,
        notes: notes || "",
        payment_plan: finalPaymentPlan,
        contract_mode: isDailyContract ? 'daily' : 'monthly',
      };

      if (bookingMode === "proxy") {
        payload.occupants = normalizedOccupants;
      }

      if (isCartMode) {
        if (payload.occupants) {
          payload.occupants = payload.occupants.map((o) => {
            return {
              first_name: o.first_name,
              middle_name: o.middle_name || null,
              last_name: o.last_name,
              sex: o.sex,
              date_of_birth: o.date_of_birth,
              relationship_to_booker: o.relationship_to_booker,
              phone: o.phone,
              email: o.email,
              bed_number: o.bed_number,
            };
          });
        }

        if (bookingMode === "normal" && pricingModel === "per_bed" && selectedBedNumbers[0]) {
          payload.bed_number = selectedBedNumbers[0];
        }

        const result = await addItem(payload);

        if (result.success) {
          showSuccess("Room added to your book!");
          if (onBookingSuccess) onBookingSuccess(result.data);
          onClose();
        } else {
          const validationMessage = formatApiValidationMessage(result.details || result.errors);
          showError(validationMessage || result.error || "Failed to add to book");
        }
        setIsSubmitting(false);
        return;
      }

      const svc = bookingService || bookingServiceDefault;
      // bookingService.createBooking throws on error; returns data on success
      let res;
      try {
        res = await svc.createBooking(payload);
      } catch (svcError) {
        const errorData = svcError.response?.data;
        const validationMsg = formatApiValidationMessage(errorData?.errors || errorData?.details);
        const finalMsg = validationMsg || errorData?.error || errorData?.message || "Booking failed. Please try again.";
        showError(finalMsg);
        setIsSubmitting(false);
        return;
      }

      // res may be the full response object or data depending on service
      const bookingObj = res?.booking || res?.data?.booking || res?.data || res;
      const invoiceObj = res?.reservation_invoice || res?.data?.reservation_invoice;

      // If there's an instant reservation invoice, immediately route to PayMongo
      if (invoiceObj && invoiceObj.checkout_url) {
        showLoading('Redirecting to secure checkout...');
        window.location.href = invoiceObj.checkout_url;
        return; // Halt execution and wait for redirect
      }

      // show confirmation panel with booking id/status
      setBookingResult(bookingObj);
      // Inform parent to optimistically mark the room as occupied and reserved by current user
      try {
        if (typeof onBookingSuccess === "function") {
          onBookingSuccess({
            ...room,
            status: room.status || "available",
            display_status: "reserved",
            reserved_by_me: true,
            reservation: bookingObj,
          });
        }
      } catch (e) {
        console.warn("onBookingSuccess handler failed", e);
      }
      // Auto-navigate to bookings after short delay to let user see confirmation
      const t = setTimeout(() => {
        if (navigate) navigate("/bookings");
      }, 3000);
      setAutoNavTimer(t);
    } catch (error) {
      console.error("Booking failed", error?.response?.data || error);
      const validationMessage = formatApiValidationMessage(error?.response?.data?.errors);
      if (validationMessage) {
        showError(validationMessage);
        return;
      }

      const errMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit booking request.";

      // Enhanced error messages for booking limits
      if (errMsg.includes('Normal booking allows only 1')) {
        showError(
          `Normal Booking Limit Reached\n\nYou already have 1 active or pending normal booking in this property.\n\nNote: Normal (1) and Proxy (3) booking limits are independent. You can still create proxy bookings.`,
          { duration: 6000 }
        );
      } else if (errMsg.includes('Proxy booking limit reached')) {
        showError(
          `Proxy Booking Limit Reached\n\nYou have reached the maximum of 3 active or pending proxy bookings in this property.\n\nNote: Normal (1) and Proxy (3) booking limits are independent. You can still create 1 normal booking.`,
          { duration: 6000 }
        );
      } else if (errMsg.includes('already have an active or pending booking for this room')) {
        showError(
          `Room Already Reserved\n\nYou already have an active or pending booking for this specific room.\n\nTip: Check your bookings page to view or manage your existing reservation.`,
          { duration: 6000 }
        );
      } else if (errMsg.includes('overdue invoices')) {
        showError(
          `Payment Required\n\nYou cannot create new bookings while you have overdue invoices.\n\nTip: Please settle your outstanding balance in the Payments section first.`,
          { duration: 6000 }
        );
      } else {
        showError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoomTypeLabel = (room) => {
    if (room.type_label) return room.type_label;

    if (room.name) {
      const normalizedName = String(room.name).toLowerCase().trim();
      const mappedLabel = {
        single: "Single Room",
        double: "Double Room",
        quad: "Quad Room",
        bedspacer: "Bed Spacer",
        "bed spacer": "Bed Spacer",
      }[normalizedName];

      if (mappedLabel) return mappedLabel;
    }

    const typeMap = {
      'single': 'Single Room',
      'double': 'Double Room',
      'quad': 'Quad Room',
      'bedSpacer': 'Bed Spacer',
      'bedspacer': 'Bed Spacer'
    };

    return typeMap[room.room_type] || (room.room_type ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1) : 'Room');
  };

  const getSexRestrictionMeta = (restriction) => {
    const normalized = String(restriction || "mixed").toLowerCase().trim();

    if (normalized === "male" || normalized === "boy" || normalized === "boys") {
      return {
        label: "Boys Only",
        className:
          "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800",
        accentClassName: "text-blue-700 dark:text-blue-400",
      };
    }

    if (
      normalized === "female" ||
      normalized === "girl" ||
      normalized === "girls"
    ) {
      return {
        label: "Girls Only",
        className:
          "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800",
        accentClassName: "text-rose-700 dark:text-rose-400",
      };
    }

    return {
      label: "Mixed",
      className:
        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
      accentClassName: "text-gray-700 dark:text-gray-300",
    };
  };

  const genderMeta = getSexRestrictionMeta(room.sex_restriction);
  const propertyType = String(property?.property_type || "").toLowerCase().trim();
  const normalizedPropertyType = normalizePropertyTypeToken(property?.property_type);
  const showGenderBadge = !(propertyType === "apartment" && roomGender === "mixed");
  const displayStatus = (room.display_status || room.status || "available").toString().toLowerCase();
  const parsedCapacity = Number(room.capacity ?? 1);
  const parsedAvailableSlots = Number(room.available_slots ?? room.availableSlots);
  const hasOpenSlots = Number.isFinite(parsedAvailableSlots)
    ? parsedAvailableSlots > 0
    : parsedCapacity > 0;
  const effectiveDisplayStatus = (() => {
    if (displayStatus === "maintenance") return "maintenance";
    if (hasOpenSlots) return displayStatus === "reserved" ? "reserved" : "available";
    return displayStatus === "reserved" ? "reserved" : "occupied";
  })();

  const isTargetGenderRestrictedType = ["dormitory", "boardinghouse", "bedspacer"].includes(normalizedPropertyType);
  const tenantSex = normalizeTenantGender(resolveStoredTenantGender());
  const fallbackSexCompatible = (() => {
    if (!isAuthenticated) return true;
    if (normalizedPropertyType === "apartment" || !isTargetGenderRestrictedType) return true;
    if (roomGender === "mixed") return true;
    if (!tenantSex) return false;
    return roomGender === tenantSex;
  })();

  // Use backend compatibility when provided; otherwise derive it from local tenant profile.
  const isSexCompatible = room.is_sex_compatible !== undefined
    ? Boolean(room.is_sex_compatible)
    : fallbackSexCompatible;
  const isRoomAvailable = room.is_available !== undefined ? room.is_available : (room.status || "").toString().toLowerCase() === "available" && Number(room.available_slots ?? 1) > 0;

  const canOpenBookingFlow = effectiveDisplayStatus === "available" && isRoomAvailable;
  const canBook = canOpenBookingFlow && (bookingMode === "proxy" || isSexCompatible);
  const baseTotalPrice = Number(totalPrice || 0);
  const promoDiscountedTotal = Number(promoOffer?.discounted_total ?? baseTotalPrice);
  const hasPromoOffer = Boolean(
    promoOffer && Number.isFinite(promoDiscountedTotal) && promoDiscountedTotal < baseTotalPrice,
  );
  const promoDiscountAmount = hasPromoOffer
    ? Math.max(0, baseTotalPrice - promoDiscountedTotal)
    : 0;
  const selectedPlanTotal =
    paymentPlan === "promo_one_time" && hasPromoOffer
      ? promoDiscountedTotal
      : baseTotalPrice;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* STEP 1: ROOM DETAILS VIEW */}
        {viewMode === "details" && (
          <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
            {/* Header */}
            <div className="relative bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 h-14 md:h-16 flex items-center justify-center shadow-sm shrink-0">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Room Details
              </h2>
              <button
                onClick={onClose}
                className="absolute right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Top Grid: Image + Key Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* LEFT: Image */}
                  <div>
                    <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden relative shadow-sm">
                      <ImageCarousel
                        images={room.images || []}
                        alt={`Room ${room.room_number}`}
                        className="w-full h-full"
                      />
                      <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2 pr-20 max-w-[85%]">
                        {room.reserved_by_me ? (
                          <span className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm bg-amber-100 text-amber-800 border border-amber-200 max-w-full truncate">
                            Reserved by you (Pending)
                          </span>
                        ) : (
                          <span
                            className={`
                            px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm max-w-full truncate
                            ${effectiveDisplayStatus === "available" ? "bg-green-100 text-green-700" : effectiveDisplayStatus === "reserved" ? "bg-amber-100 text-amber-800" : effectiveDisplayStatus === "maintenance" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}
                          `}
                          >
                            {(room.display_status_label || effectiveDisplayStatus || "").toString()}
                          </span>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Room {room.room_number}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-medium text-lg capitalize">
                        {getRoomTypeLabel(room)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-gray-900 dark:text-gray-100 font-bold text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        {resolvedOccupiedCount} / {resolvedCapacity}
                        {showGenderBadge && (
                          <>
                            <span className="text-gray-300 dark:text-gray-500">•</span>
                            <span className={`font-semibold text-xs ${genderMeta.accentClassName}`}>
                              {genderMeta.label}
                            </span>
                          </>
                        )}
                      </span>
                      {room.floor && (
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                          <Layers className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                          <span>Floor {room.floor}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                        <span>
                          {(room.billing_policy || "Monthly")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
                          Billing
                        </span>
                      </div>
                      {!isSexCompatible && isAuthenticated && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg shadow-sm">
                          <Shield className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-xs text-pretty">Normal booking is incompatible with your sex profile</span>
                        </div>
                      )}
                      {room.is_tenant && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-lg shadow-sm">
                          <Users className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-xs">You are already an occupant of this room. You can book more beds using Proxy mode.</span>
                        </div>
                      )}
                      {room.reserved_by_me && !room.is_tenant && (
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-lg shadow-sm">
                          <Shield className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-xs text-pretty">You have a pending reservation for this room. Proxy mode is available for additional beds.</span>
                        </div>
                      )}
                      {(room.require_advance || room.requireAdvance || property?.require_advance) && (
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-lg shadow-sm">
                          <Shield className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-xs">1 Month Advance Required</span>
                        </div>
                      )}
                    </div>

                    {/* Room Capacity Progress Bar */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">Room Capacity</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${resolvedAvailableSlots <= 1 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {resolvedAvailableSlots} {resolvedAvailableSlots === 1 ? 'Bed' : 'Beds'} Available
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                          <div
                            className={`h-full transition-all duration-700 rounded-full ${(resolvedOccupiedCount / resolvedCapacity) > 0.8 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${(resolvedOccupiedCount / resolvedCapacity) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter text-gray-500">
                          <span>{resolvedOccupiedCount} Occupied</span>
                          <span>{resolvedCapacity} Total Capacity</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">
                        Description
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                        {room.description ||
                          "No specific description provided for this room."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Amenities & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      Amenities
                    </h4>
                    {room.amenities &&
                      Array.isArray(room.amenities) &&
                      room.amenities.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {room.amenities.map((amenity, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600"
                          >
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="truncate">
                              {typeof amenity === "string"
                                ? amenity
                                : amenity?.name || "Amenity"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No specific amenities listed.
                      </p>
                    )}
                  </div>
                  {/* Room Rules Section */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">
                      Room Rules
                    </h4>
                    {(room.rules && Array.isArray(room.rules) && room.rules.length > 0) ||
                      (property.rules && Array.isArray(property.rules) && property.rules.length > 0) ? (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl p-6">
                        <ul className="space-y-4">
                          {(room.rules?.length > 0 ? room.rules : property.rules).map((rule, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-4 text-sm text-gray-800 dark:text-gray-200"
                            >
                              <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No specific rules listed by the landlord.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0 flex justify-between items-center">
              <div className="text-gray-900 dark:text-white">
                <p className="text-sm font-medium">{primaryRateLabel}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {formatMoney(primaryRate)}
                </p>
              </div>
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {canOpenBookingFlow && (
                    <button
                      onClick={() => { setIsCartMode(true); setViewMode("booking"); }}
                      className="px-6 py-4 border-2 border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 font-bold rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                    >
                      Add to Book
                    </button>
                  )}
                  <button
                    onClick={() => { setIsCartMode(false); setViewMode("booking"); }}
                    disabled={!canOpenBookingFlow}
                    className={`px-8 py-4 rounded-xl font-bold text-white shadow-md transition-all
                              ${canOpenBookingFlow
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                      }`}
                  >
                    {canOpenBookingFlow
                      ? "Book Now"
                      : "Not Available"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLoginRequired}
                  className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                >
                  Login to Book
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: BOOKING FORM VIEW */}
        {viewMode === "booking" && (
          <div className="w-full flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
            {/* Header with Back Button */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode("details")}
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isCartMode ? (isEditing ? "Update Selection" : "Add to Book") : "Submit Booking"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {bookingResult ? (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-6 rounded-xl text-center">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">
                      Booking Submitted
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Booking ID:{" "}
                      <span className="font-semibold">
                        {bookingResult.id ||
                          bookingResult.booking_id ||
                          bookingResult.reference ||
                          "N/A"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      This is your booking for{" "}
                      <span className="font-medium">
                        Room {room?.room_number || room?.id}
                      </span>{" "}
                      — current status:{" "}
                      <span className="font-medium">
                        {(
                          bookingResult.status ||
                          bookingResult.booking_status ||
                          "pending"
                        ).toLowerCase()}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      You won't be charged yet. The landlord will review your
                      request.
                    </p>
                    <div className="mt-4 flex justify-center gap-4">
                      <button
                        onClick={() => {
                          if (autoNavTimer) clearTimeout(autoNavTimer);
                          navigate("/bookings");
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        View My Bookings
                      </button>
                      <button
                        onClick={() => {
                          setBookingResult(null);
                          if (autoNavTimer) clearTimeout(autoNavTimer);
                          onClose();
                        }}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  {isAuthenticated && bookingMode === "normal" && !isSexCompatible && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Normal booking for this room is restricted to {genderMeta.label.toLowerCase()}.
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        You can still continue with Proxy booking as long as occupant sex matches the room restriction.
                      </p>
                    </div>
                  )}

                  {isLimitReached && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                          {bookingMode === "normal" ? "Standard" : "Proxy"} Limit
                          Reached
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                          You have reached the maximum allowed{" "}
                          {bookingMode === "normal" ? "standard" : "proxy"}{" "}
                          bookings for this property.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Booking Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingMode("normal")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${bookingMode === "normal" ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"}`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("proxy")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${bookingMode === "proxy" ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"}`}
                      >
                        Proxy
                      </button>
                    </div>
                    {bookingMode === 'normal' ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Limit: {property?.normal_booking_limit || 1} personal stay per property ({property?.tenant_usage?.normal || 0}/{property?.normal_booking_limit || 1} used)
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Limit: {property?.proxy_booking_limit || 3} bookings for other people ({property?.tenant_usage?.proxy || 0}/{property?.proxy_booking_limit || 3} used)
                      </p>
                    )}
                  </div>

                  {/* Price Card Summary */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                          {primaryRateLabel}
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {formatMoney(primaryRate)}
                        </p>
                      </div>
                      {billingPolicy === "monthly_with_daily" && dailyRate > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Daily Rate
                          </p>
                          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                            {formatMoney(dailyRate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(room.require_advance || room.requireAdvance || property?.require_advance) && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        1 Month Advance Required
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        This room requires one month advance payment as part of move-in costs.
                      </p>
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <BedDouble className="w-4 h-4" />
                      Beds Remaining: <span className="text-green-600 dark:text-green-400 font-bold">{resolvedCapacity - resolvedOccupiedCount}</span>
                    </p>

                    {showBedCountSelector && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Beds <span className="text-red-500">*</span>
                        </label>
                        {maxBookableBeds > 1 ? (
                          <select
                            value={bedCount}
                            onChange={(e) => {
                              const newCount = parseInt(e.target.value, 10);
                              setBedCount(newCount);
                              if (bookingMode === "normal") {
                                setSelectedBedNumbers([]);
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {[...Array(maxBookableBeds)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} {i === 0 ? "Bed" : "Beds"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200">
                            1 Bed
                          </div>
                        )}
                      </div>
                    )}

                    {bookingMode === "normal" && room.available_bed_numbers?.length > 0 && resolvedCapacity > 1 && (bedCount > 1 || room.available_bed_numbers.length > 1) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Bed {bedCount > 1 ? "Numbers" : "Number"} <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-3">
                          {[...Array(bedCount)].map((_, idx) => {
                            const currentBedValue = selectedBedNumbers[idx] || "";
                            return (
                              <select
                                key={idx}
                                value={currentBedValue}
                                onChange={(e) => {
                                  const newNumbers = [...selectedBedNumbers];
                                  newNumbers[idx] = e.target.value;
                                  setSelectedBedNumbers(newNumbers);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">-- Choose Bed {bedCount > 1 ? `#${idx + 1}` : ""} --</option>
                                {room.available_bed_numbers.map((bed) => {
                                  const isTakenByOther = selectedBedNumbers.some(
                                    (val, sIdx) => sIdx !== idx && String(val) === String(bed)
                                  );
                                  return (
                                    <option key={bed} value={bed} disabled={isTakenByOther}>
                                      Bed #{bed} {isTakenByOther ? "(Selected)" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {supportsContractModeSwitch && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Stay Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setContractMode('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${!isDailyContract ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
                          >
                            Monthly Contract
                          </button>
                          <button
                            type="button"
                            onClick={() => setContractMode('daily')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isDailyContract ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
                          >
                            Daily Contract
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Monthly contract supports open-ended tenancy. Daily contract requires a fixed check-out date.
                        </p>
                      </div>
                    )}
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isDailyContract ? 'Check-in Date' : 'Move-in Date'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={handleStartDateChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {isDailyContract
                        ? 'Bookings can be made up to 3 months in advance'
                        : 'Move-ins can be scheduled up to 3 months in advance'}
                    </p>
                    {isReservationFeeConfigured && (
                      <p
                        className={`text-xs mt-1 ${isReservationFeeRequired
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-green-700 dark:text-green-400"
                          }`}
                      >
                        {isReservationFeeRequired
                          ? `Reservation fee is required because move-in is ${daysUntilMoveIn} days after booking date.`
                          : 'No reservation fee for move-in within 3 days from booking date.'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isDailyContract ? (
                        <>
                          Check-out Date <span className="text-red-500">*</span>
                        </>
                      ) : (
                        'Planned Move-out Date (Optional)'
                      )}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    {!isDailyContract && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Leave this blank for an open-ended tenancy. Monthly billing will continue until move-out notice is submitted.
                      </p>
                    )}
                    {!isDailyContract && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                        Note: Monthly billing still charges 1 full month even if your planned stay is below 30 days.
                      </p>
                    )}
                  </div>

                  {bookingMode === "proxy" && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white">
                          Occupants ({proxyOccupants.length}/{occupantLimit})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddProxyOccupant}
                          disabled={proxyOccupants.length >= occupantLimit}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${proxyOccupants.length >= occupantLimit ? "text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed" : "text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                        >
                          Add Occupant
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Provide details of the people who will actually stay in this room.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Fields marked with <span className="text-red-500">*</span> are required.
                      </p>

                      {proxyOccupants.map((occupant, index) => (
                        <div
                          key={`proxy-occupant-${index}`}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Occupant {index + 1}
                            </p>
                            {proxyOccupants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProxyOccupant(index)}
                                className="text-xs text-red-600 dark:text-red-400 font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={occupant.first_name}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "first_name", e.target.value)
                                }
                                placeholder="First name"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Middle Name (Optional)
                              </label>
                              <input
                                type="text"
                                value={occupant.middle_name}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "middle_name", e.target.value)
                                }
                                placeholder="Middle name"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Last Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={occupant.last_name}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "last_name", e.target.value)
                                }
                                placeholder="Last name"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Date of Birth <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={occupant.date_of_birth}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "date_of_birth", e.target.value)
                                }
                                onKeyDown={(e) => e.preventDefault()}
                                onClick={(e) => e.currentTarget.showPicker?.()}
                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                max={latestAllowedAdultDob}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Sex <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={occupant.sex}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "sex", e.target.value)
                                }
                                disabled={Boolean(requiredProxyGender)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {requiredProxyGender ? (
                                  <option value={requiredProxyGender}>
                                    {requiredProxyGender === "male" ? "Male" : "Female"}
                                  </option>
                                ) : (
                                  <>
                                    <option value="">Select sex</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                  </>
                                )}
                              </select>
                              {requiredProxyGender ? (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                  This room is restricted to {requiredProxyGender === "male" ? "boys" : "girls"} only.
                                </p>
                              ) : null}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Relationship to Booker <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={occupant.relationship_to_booker}
                                onChange={(e) =>
                                  handleProxyOccupantChange(
                                    index,
                                    "relationship_to_booker",
                                    e.target.value,
                                  )
                                }
                                placeholder="Relationship to booker"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Phone (Optional)
                              </label>
                              <input
                                type="text"
                                value={occupant.phone}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "phone", e.target.value)
                                }
                                placeholder="Phone"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Email (Optional)
                              </label>
                              <input
                                type="email"
                                value={occupant.email}
                                onChange={(e) =>
                                  handleProxyOccupantChange(index, "email", e.target.value)
                                }
                                placeholder="Email"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            {room.available_bed_numbers?.length > 0 && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  Bed Number <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={occupant.bed_number || ""}
                                  onChange={(e) =>
                                    handleProxyOccupantChange(index, "bed_number", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="">-- Select Bed --</option>
                                  {room.available_bed_numbers.map((bed) => {
                                    const isTakenByOther = proxyOccupants.some(
                                      (p, pIdx) => pIdx !== index && String(p.bed_number) === String(bed)
                                    );
                                    return (
                                      <option key={bed} value={bed} disabled={isTakenByOther}>
                                        Bed #{bed} {isTakenByOther ? "(Selected)" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Duration Summary */}
                  {duration && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2 text-sm border border-transparent dark:border-gray-700">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>{endDate ? 'Duration:' : 'Estimated Initial Billing:'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {endDate
                            ? `${duration.days} days (${duration.months} months, ${duration.extraDays} days)`
                            : `First ${duration.days} days (${duration.months} month)`}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Total Estimated Cost:</span>
                        <span className="font-bold text-xl text-green-600 dark:text-green-400">
                          {loadingPricing ? (
                            <span className="animate-pulse opacity-50">Calculating...</span>
                          ) : (
                            `₱${selectedPlanTotal.toLocaleString()}`
                          )}
                        </span>
                      </div>
                      {!loadingPricing && hasPromoOffer && paymentPlan === "promo_one_time" && (
                        <p className="text-xs text-green-700 dark:text-green-400 text-right">
                          Promo applied. You save ₱{promoDiscountAmount.toLocaleString()} on this stay.
                        </p>
                      )}
                      {/* Reservation Fee UI Details */}
                      {isReservationFeeRequired && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                          <div className="flex justify-between text-amber-800 dark:text-amber-300 font-semibold mb-2">
                            <span>Instant Reservation Fee:</span>
                            <span>₱{reservationFeeAmount.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            A non-refundable reservation fee is required to secure this booking. You will be redirected to PayMongo to pay this amount immediately.
                          </p>
                        </div>
                      )}
                      {isReservationFeeConfigured && !isReservationFeeRequired && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
                          <p className="text-xs text-green-700 dark:text-green-400">
                            No reservation fee is required because move-in is within 3 days from booking date.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Plan Selection */}
                  {(() => {
                    const isMonthlyBilling = !isDailyContract;
                    const hasCheckoutDate = Boolean(endDate) && new Date(endDate) > new Date(startDate);
                    const showPaymentPlanSelector = isMonthlyBilling && hasCheckoutDate && duration && (duration.months > 1 || (duration.months === 1 && duration.extraDays > 0));
                    const promoLabel = promoOffer?.term_label || (promoOffer?.term_months ? `${promoOffer.term_months} months` : "long-term term");
                    const promoPercent = Number(promoOffer?.discount_percent || 0);

                    if (isMonthlyBilling && !hasCheckoutDate) {
                      return (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                          This booking will start as open-ended tenancy. Billing plan is set to monthly recurring until move-out notice.
                        </div>
                      );
                    }

                    if (!showPaymentPlanSelector) return null;

                    return (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4 text-sm border border-transparent dark:border-gray-700">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                          Choose Your Payment Plan
                        </label>
                        <div className="space-y-4">
                          <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${paymentPlan === 'monthly' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}>
                            <div className="pt-0.5">
                              <input
                                type="radio"
                                name="payment_plan"
                                value="monthly"
                                checked={paymentPlan === 'monthly'}
                                onChange={() => setPaymentPlan('monthly')}
                                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-gray-900 dark:text-gray-100">Pay Monthly</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Pay rent at the beginning of each billing cycle.</span>
                            </div>
                          </label>

                          {hasPromoOffer ? (
                            <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${paymentPlan === 'promo_one_time' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}>
                              <div className="pt-0.5">
                                <input
                                  type="radio"
                                  name="payment_plan"
                                  value="promo_one_time"
                                  checked={paymentPlan === 'promo_one_time'}
                                  onChange={() => setPaymentPlan('promo_one_time')}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                                />
                              </div>
                              <div>
                                <span className="block font-bold text-gray-900 dark:text-gray-100">
                                  Pay One-Time Promo ({promoPercent}% off)
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                  Exact {promoLabel} term only. Pay ₱{promoDiscountedTotal.toLocaleString()} upfront and save ₱{promoDiscountAmount.toLocaleString()}.
                                </span>
                              </div>
                            </label>
                          ) : (
                            <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${paymentPlan === 'full' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}>
                              <div className="pt-0.5">
                                <input
                                  type="radio"
                                  name="payment_plan"
                                  value="full"
                                  checked={paymentPlan === 'full'}
                                  onChange={() => setPaymentPlan('full')}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                                />
                              </div>
                              <div>
                                <span className="block font-bold text-gray-900 dark:text-gray-100">Full Duration Upfront</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Pay the entire lease amount at once.</span>
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Special Requests / Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Any specific requirements..."
                    />
                  </div>

                  {/* Action Buttons */}
                  {hasCheckout && !isDailyContract && billingPolicy === "monthly" && duration && duration.extraDays > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        <strong>Billing Policy:</strong> Stays with extra days ({duration.extraDays} days) are charged for the full next month.
                      </p>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    {isAuthenticated && canBook && (
                      <div className="flex items-start">
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={agreedToRules}
                              onChange={(e) =>
                                setAgreedToRules(e.target.checked)
                              }
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 transition-all checked:border-green-600 checked:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:bg-gray-700"
                            />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all">
                              <Check className="h-3.5 w-3.5 font-bold" />
                            </div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                            I have read and agree to the{" "}
                            <span className="font-medium text-green-700 dark:text-green-400">
                              Room Rules
                            </span>{" "}
                            and policies.
                          </span>
                        </label>
                      </div>
                    )}

                    {isAuthenticated ? (
                      <button
                        onClick={handleSubmit}
                        disabled={
                          isSubmitting ||
                          !canBook ||
                          !agreedToRules
                        }
                        className={`
                          w-full px-8 py-4 rounded-xl font-bold text-white shadow-md transition-all
                          ${isSubmitting ||
                            !canBook ||
                            !agreedToRules
                            ? "bg-gray-400 cursor-not-allowed opacity-70"
                            : "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
                          }
                        `}
                      >
                        {isSubmitting
                          ? "Processing..."
                          : isCartMode
                            ? "Add to Book"
                            : (isReservationFeeRequired
                              ? `Pay ₱${reservationFeeAmount.toLocaleString()} to Reserve`
                              : "Confirm Booking Request")}
                      </button>
                    ) : (
                      <button
                        onClick={onLoginRequired}
                        className="w-full py-4.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                      >
                        Login to Book
                      </button>
                    )}
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      You won't be charged yet. The landlord will review your
                      request.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
