import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  DeviceEventEmitter,
  RefreshControl,
  Linking,
  useWindowDimensions,
  Pressable
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { navigate as rootNavigate, triggerForcedLogout } from '../../../../navigation/RootNavigation.js';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getStyles } from '../../../../styles/Tenant/RoomDetailsScreen.js';
import BookingService from '../../../../services/BookingService.js';
import CartService from '../../../../services/CartService.js';
import PropertyService from '../../../../services/PropertyService.js';
import PaymentService from '../../../../services/PaymentService.js';
import ProfileService from '../../../../services/ProfileService.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import SystemToggleService from '../../../../services/SystemToggleService.js';
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';
import Toast from 'react-native-toast-message';
import { getToastConfig } from '../../../../config/toastConfig.jsx';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  tenantQueryKeys,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

// Helper function to get proper image URL
const getRoomImageUrl = (imageUrl) => {
  if (!imageUrl) return 'https://via.placeholder.com/400x280?text=No+Image';

  if (typeof imageUrl === 'string') {
    // Already a full URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Relative path - construct full URL
    const cleanPath = imageUrl.replace(/^\/?storage\//, '');
    return `${API_BASE_URL}/storage/${cleanPath}`;
  }

  return 'https://via.placeholder.com/400x280?text=No+Image';
};

export default function RoomDetailsScreen({ route, isGuest = false, onAuthRequired }) {
  const PROXY_MINIMUM_AGE = 18;
  const navigation = useNavigation();
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme, viewportWidth), [theme, viewportWidth]);
  const { room, property, cartItem, isEditing = false } = route.params;

  const toBooleanFlag = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
    }
    return null;
  };

  const normalizeGenderValue = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (['male', 'boy', 'boys'].includes(normalized)) return 'male';
    if (['female', 'girl', 'girls'].includes(normalized)) return 'female';
    return '';
  };

  const normalizeRoomRestriction = (value) => {
    const normalized = normalizeGenderValue(value);
    return ['male', 'female'].includes(normalized) ? normalized : 'mixed';
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [propertyData, setPropertyData] = useState(property || null);
  const [roomData, setRoomData] = useState(room || null);
  const [receiptImage, setReceiptImage] = useState(null);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedBedNumbers, setSelectedBedNumbers] = useState([]);

  const { data: profileResult } = useQuery({
    queryKey: tenantQueryKeys.profilePage(),
    queryFn: () => ProfileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });
  const tenantProfile = profileResult?.success ? profileResult.data : null;

  const toastConfig = React.useMemo(() => getToastConfig(theme), [theme]);
  const [bookingMode, setBookingMode] = useState('normal');
  const [isCartMode, setIsCartMode] = useState(false);
  const [reservationFeeTempDisabled, setReservationFeeTempDisabled] = useState(
    SystemToggleService.getDefaults().reservationFeeDisabled,
  );
  const [manualGcashReservationDisabled, setManualGcashReservationDisabled] = useState(
    SystemToggleService.getDefaults().manualGcashReservationDisabled,
  );
  const createEmptyOccupant = (defaultSex = '') => ({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    sex: defaultSex,
    relationship_to_booker: '',
    phone: '',
    email: '',
  });

  const OCCUPANT_FIELD_LABELS = {
    first_name: 'first name',
    middle_name: 'middle name',
    last_name: 'last name',
    date_of_birth: 'date of birth',
    sex: 'sex',
    relationship_to_booker: 'relationship to booker',
    phone: 'phone',
    email: 'email',
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
    ].some((value) => Boolean(String(value || '').trim()));

  const getProxyOccupantMissingFieldMessage = (occupant, index) => {
    const prefix = `Occupant ${index + 1}:`;
    if (!occupant.first_name) return `${prefix} first name is required.`;
    if (!occupant.last_name) return `${prefix} last name is required.`;
    if (!occupant.date_of_birth) return `${prefix} date of birth is required.`;
    if (!occupant.sex) return `${prefix} sex is required.`;
    if (!occupant.relationship_to_booker) return `${prefix} relationship to booker is required.`;
    return null;
  };

  const formatBookingValidationError = (details) => {
    if (!details || typeof details !== 'object') {
      return null;
    }

    const firstEntry = Object.entries(details).find(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );

    if (!firstEntry) {
      return null;
    }

    const [rawPath, rawMessage] = firstEntry;
    const normalizedPath = String(rawPath).replace(/\[(\d+)\]/g, '.$1');
    const message = Array.isArray(rawMessage) ? rawMessage[0] : String(rawMessage || '');

    const occupantMatch = normalizedPath.match(/occupants\.(\d+)\.([a-zA-Z_]+)/);
    if (occupantMatch) {
      const [, occupantIndex, rawField] = occupantMatch;
      const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, ' ');
      return `Occupant ${Number(occupantIndex) + 1} ${fieldLabel}: ${message}`;
    }

    const itemOccupantMatch = normalizedPath.match(/items\.(\d+)\.occupants\.(\d+)\.([a-zA-Z_]+)/);
    if (itemOccupantMatch) {
      const [, itemIndex, occupantIndex, rawField] = itemOccupantMatch;
      const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, ' ');
      return `Cart item ${Number(itemIndex) + 1}, occupant ${Number(occupantIndex) + 1} ${fieldLabel}: ${message}`;
    }

    const rawField = normalizedPath.split('.').pop() || '';
    const fieldLabel = OCCUPANT_FIELD_LABELS[rawField] || rawField.replace(/_/g, ' ');
    if (!fieldLabel) {
      return message;
    }

    return `${fieldLabel.charAt(0).toUpperCase()}${fieldLabel.slice(1)}: ${message}`;
  };

  const parseIsoDateOnly = (rawDate) => {
    const trimmed = String(rawDate || '').trim();
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const matches = trimmed.match(datePattern);
    if (!matches) return null;

    const year = Number(matches[1]);
    const month = Number(matches[2]);
    const day = Number(matches[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime())
      || parsed.getFullYear() !== year
      || parsed.getMonth() !== month - 1
      || parsed.getDate() !== day
    ) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const toIsoDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAgeInYears = (dateOfBirth, referenceDate = new Date()) => {
    const dob = new Date(dateOfBirth);
    const ref = new Date(referenceDate);
    let age = ref.getFullYear() - dob.getFullYear();
    const monthDiff = ref.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  };

  const [proxyOccupants, setProxyOccupants] = useState([createEmptyOccupant()]);
  const [activeProxyDobPickerIndex, setActiveProxyDobPickerIndex] = useState(null);
  const [proxySexModalVisible, setProxySexModalVisible] = useState(false);
  const [activeProxySexIndex, setActiveProxySexIndex] = useState(null);

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const toggleBedNumber = (bedNum) => {
    if (bookingMode === 'normal') {
      setSelectedBedNumbers(prev => prev.includes(bedNum) ? [] : [bedNum]);
    } else {
      setSelectedBedNumbers(prev =>
        prev.includes(bedNum)
          ? prev.filter(b => b !== bedNum)
          : [...prev, bedNum]
      );
    }
  };

  // Prefer the freshest room object (roomData updated on refresh), fallback to route param
  const activeRoom = roomData || room;
  const activeRoomId = activeRoom?.id;
  const activePropertyId = propertyData?.id || property?.id;

  const roomPaymentOptionsQuery = useQuery({
    queryKey: tenantQueryKeys.exploreRoomPaymentOptions(activeRoomId),
    enabled: Boolean(activeRoomId),
    queryFn: async () => {
      const res = await PropertyService.getRoomPaymentOptions(activeRoomId);
      if (!res?.success || !res?.data) {
        return { methods: ['cash'], is_paymongo_ready: false };
      }
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const paymentOptions = roomPaymentOptionsQuery.data || {
    methods: ['cash'],
    is_paymongo_ready: false,
  };

  const propertySnapshotQuery = useQuery({
    queryKey: tenantQueryKeys.explorePropertySnapshot(activePropertyId),
    enabled: false,
    queryFn: async () => {
      const res = await PropertyService.getPublicProperty(activePropertyId);
      if (!res?.success || !res?.data) {
        throw new Error(res?.error || 'Failed to refresh room details');
      }
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const reservationFeeAmount = Number(
    propertyData?.reservation_fee ?? activeRoom?.property?.reservation_fee ?? 0,
  ) || 0;
  const reservationFeeSetting =
    propertyData?.require_reservation_fee ?? activeRoom?.property?.require_reservation_fee;
  const normalizedReservationFeeSetting = toBooleanFlag(reservationFeeSetting);
  const isReservationFeeEnabled = !reservationFeeTempDisabled && (
    reservationFeeSetting === undefined || reservationFeeSetting === null
      ? reservationFeeAmount > 0
      : (normalizedReservationFeeSetting ?? reservationFeeAmount > 0)
  );
  const isReservationConfigured = isReservationFeeEnabled && reservationFeeAmount > 0;
  const reservationFeeThresholdDays = 3;
  const gcashName = propertyData?.gcash_name || activeRoom?.property?.gcash_name || '';
  const gcashNumber = propertyData?.gcash_number || activeRoom?.property?.gcash_number || '';
  const gcashQrPath = propertyData?.gcash_qr_path || activeRoom?.property?.gcash_qr_path || '';

  useEffect(() => {
    let mounted = true;
    SystemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setReservationFeeTempDisabled(Boolean(result.data.reservationFeeDisabled));
      setManualGcashReservationDisabled(Boolean(result.data.manualGcashReservationDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // keep roomData in sync when navigation param changes
    setRoomData(room);
    setPropertyData(property);
  }, [room, property]);

  // Hide parent tab bar and mark route to hide layout (TenantLayout)
  useEffect(() => {
    try {
      navigation.setParams?.({ hideLayout: true });
    } catch (_e) { }
    const parent = navigation.getParent?.();
    try {
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
    } catch (_e) { }
    return () => {
      try {
        if (navigation.isFocused()) {
          navigation.setParams?.({ hideLayout: false });
        }
      } catch (_e) { }
      try { parent?.setOptions?.({ tabBarStyle: undefined }); } catch (_e) { }
    };
  }, [navigation]);

  // Set a friendly title for TenantLayout to use
  useEffect(() => {
    const title = (roomData && (roomData.title || roomData.name)) || (room && (room.title || room.name)) || (propertyData && (propertyData.title || propertyData.name));
    try { navigation.setParams?.({ layoutTitle: title, hideLayout: true }); } catch (_e) { }
    return () => {
      try {
        if (navigation.isFocused()) {
          navigation.setParams?.({ layoutTitle: undefined, hideLayout: false });
        }
      } catch (_e) { }
    };
  }, [roomData, room, propertyData, property, navigation]);

  const roomIsBookable = typeof activeRoom?.is_available === 'boolean'
    ? activeRoom.is_available
    : (activeRoom?.status === 'available'
      && Number(activeRoom?.available_slots ?? 1) > 0
      && !activeRoom?.is_booking_locked);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const latestAllowedAdultDob = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setFullYear(cutoff.getFullYear() - PROXY_MINIMUM_AGE);
    return cutoff;
  }, []);

  const [bookingData, setBookingData] = useState({
    start_date: new Date(),
    end_date: null,
    contract_mode: 'monthly',
    notes: '',
    payment_method: 'cash',
    payment_plan: 'monthly',
  });

  const daysUntilMoveIn = React.useMemo(() => {
    if (!bookingData.start_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const moveInDate = new Date(bookingData.start_date);
    moveInDate.setHours(0, 0, 0, 0);

    return Math.max(0, Math.floor((moveInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, [bookingData.start_date]);

  const isReservationRequired =
    isReservationConfigured && daysUntilMoveIn > reservationFeeThresholdDays;
  const isManualGcashReservationFlow = !isCartMode && isReservationRequired && !manualGcashReservationDisabled;
  const requiresOnlineReservationFee = !isCartMode && isReservationRequired && manualGcashReservationDisabled;
  const canSelectCashMethod = paymentOptions.methods.includes('cash') && !requiresOnlineReservationFee;
  const canSelectOnlineMethod = paymentOptions.methods.includes('online') && paymentOptions.is_paymongo_ready;

  const roomBillingPolicy = String(activeRoom?.billing_policy || 'monthly').toLowerCase();
  const roomPricingModel = String(activeRoom?.pricing_model || 'full_room').toLowerCase();
  const roomSexRestriction = normalizeRoomRestriction(activeRoom?.sex_restriction);
  const requiredProxyGender = roomSexRestriction !== 'mixed' ? roomSexRestriction : '';
  const availableBedNumbers = React.useMemo(() => {
    if (!Array.isArray(activeRoom?.available_bed_numbers)) return [];
    return activeRoom.available_bed_numbers.filter(
      (bedNum) => bedNum !== null && bedNum !== undefined && String(bedNum).trim() !== '',
    );
  }, [activeRoom?.available_bed_numbers]);
  const singleAvailableBedNumber = availableBedNumbers.length === 1
    ? availableBedNumbers[0]
    : null;
  const effectiveSelectedBedNumbers = React.useMemo(() => {
    if (bookingMode !== 'normal' || roomPricingModel !== 'per_bed') {
      return selectedBedNumbers;
    }

    if (selectedBedNumbers.length > 0) {
      return selectedBedNumbers;
    }

    if (singleAvailableBedNumber === null || singleAvailableBedNumber === undefined) {
      return [];
    }

    return [singleAvailableBedNumber];
  }, [bookingMode, roomPricingModel, selectedBedNumbers, singleAvailableBedNumber]);
  const occupantLimit = Math.max(1, Number(activeRoom?.available_slots ?? activeRoom?.capacity ?? 1));
  const supportsContractModeSwitch = roomBillingPolicy === 'monthly_with_daily';
  const isDailyContract = roomBillingPolicy === 'daily' || (supportsContractModeSwitch && bookingData.contract_mode === 'daily');

  useEffect(() => {
    if (isEditing && cartItem) {
      console.log('✏️ Edit mode detected for cart item:', cartItem.id);

      // 1. Initialize booking mode
      const isProxy = cartItem.occupants && cartItem.occupants.length > 0;
      setBookingMode(isProxy ? 'proxy' : 'normal');

      // 2. Initialize booking data
      const startDate = new Date(cartItem.start_date);
      const endDate = cartItem.end_date ? new Date(cartItem.end_date) : null;

      setBookingData({
        start_date: startDate,
        end_date: endDate,
        contract_mode: cartItem.contract_mode || 'monthly',
        notes: cartItem.notes || '',
        payment_method: cartItem.payment_method || 'cash',
        payment_plan: cartItem.payment_plan || 'monthly',
      });

      // 3. Initialize addons
      setSelectedAddons(cartItem.addons || []);

      // 4. Initialize bed numbers
      const bedNums = cartItem.bed_numbers
        ? (typeof cartItem.bed_numbers === 'string' ? cartItem.bed_numbers.split(',') : cartItem.bed_numbers)
        : [];
      setSelectedBedNumbers(bedNums);

      // 5. Initialize proxy occupants
      if (isProxy) {
        setProxyOccupants(cartItem.occupants);
      }

      // 6. Set flags
      setIsCartMode(true);

      // 7. Auto-open modal
      setBookingModalVisible(true);
    }
  }, [isEditing, cartItem]);

  useEffect(() => {
    if (bookingMode !== 'proxy') return;

    setProxyOccupants((prev) => {
      const next = (prev.length > 0 ? prev : [createEmptyOccupant(requiredProxyGender)]).slice(0, occupantLimit);
      return next;
    });
  }, [bookingMode, occupantLimit, requiredProxyGender]);

  useEffect(() => {
    if (bookingMode !== 'proxy') {
      setActiveProxyDobPickerIndex(null);
    }
  }, [bookingMode]);

  useEffect(() => {
    if (bookingMode !== 'normal' || roomPricingModel !== 'per_bed') {
      return;
    }

    if (singleAvailableBedNumber === null || singleAvailableBedNumber === undefined) {
      return;
    }

    setSelectedBedNumbers((prev) => {
      if (prev.length > 0) return prev;
      return [singleAvailableBedNumber];
    });
  }, [bookingMode, roomPricingModel, singleAvailableBedNumber]);

  const pricingStartDate = bookingData.start_date
    ? bookingData.start_date.toISOString().split('T')[0]
    : null;
  const pricingEndDate = React.useMemo(() => {
    if (!bookingData.start_date) return null;

    const effectiveEndDate = bookingData.end_date
      ? new Date(bookingData.end_date)
      : (!isDailyContract
        ? new Date(new Date(bookingData.start_date).setDate(new Date(bookingData.start_date).getDate() + 30))
        : null);

    return effectiveEndDate ? effectiveEndDate.toISOString().split('T')[0] : null;
  }, [bookingData.start_date, bookingData.end_date, isDailyContract]);

  const shouldFetchPricing = Boolean(
    activeRoomId
    && pricingStartDate
    && pricingEndDate
    && new Date(pricingEndDate) > new Date(pricingStartDate),
  );

  const previewBedCount = React.useMemo(() => {
    if (roomPricingModel !== 'per_bed') {
      return 1;
    }

    if (bookingMode === 'proxy') {
      return Math.max(1, proxyOccupants.length || 1);
    }

    return 1;
  }, [roomPricingModel, bookingMode, proxyOccupants.length]);

  const isLimitReached = React.useMemo(() => {
    if (!propertyData || !propertyData.tenant_usage) return false;
    const usage = propertyData.tenant_usage;
    if (bookingMode === "normal") {
      return (
        propertyData.normal_booking_limit > 0 &&
        usage.normal >= propertyData.normal_booking_limit
      );
    }
    return (
      propertyData.proxy_booking_limit > 0 &&
      usage.proxy >= propertyData.proxy_booking_limit
    );
  }, [propertyData, bookingMode]);

  const roomPricingQuery = useQuery({
    queryKey: tenantQueryKeys.exploreRoomPricing({
      roomId: activeRoomId,
      startDate: pricingStartDate,
      endDate: pricingEndDate,
      contractMode: isDailyContract ? 'daily' : 'monthly',
      bedCount: previewBedCount,
    }),
    enabled: shouldFetchPricing,
    queryFn: async () => {
      const res = await PropertyService.getRoomPricing(
        activeRoomId,
        pricingStartDate,
        pricingEndDate,
        {
          contractMode: isDailyContract ? 'daily' : 'monthly',
          bedCount: previewBedCount,
        },
      );
      if (!res?.success || !res?.data) {
        throw new Error(res?.error || 'Pricing calculation failed');
      }

      const baseTotal = Number(res.data.base_total ?? res.data.total ?? 0);

      return {
        total: baseTotal,
        breakdown: res.data.breakdown || null,
        promoOffer: res.data.promo_offer || null, // Capture promo offer
        promoTotal: res.data.promo_total || null, // Capture promo total
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const totalPrice = shouldFetchPricing
    ? Number(roomPricingQuery.data?.total || 0)
    : 0;
  const pricingBreakdown = shouldFetchPricing
    ? (roomPricingQuery.data?.breakdown || null)
    : null;
  const promoOffer = roomPricingQuery.data?.promoOffer || null;
  const promoDiscountedTotal = roomPricingQuery.data?.promoTotal || null;

  const isPricingLoading = shouldFetchPricing && roomPricingQuery.isFetching;
  const hasCheckoutDate = Boolean(
    bookingData.start_date &&
    bookingData.end_date && new Date(bookingData.end_date) > new Date(bookingData.start_date),
  );
  const showPaymentPlanSelector = Boolean(
    !isDailyContract
    && hasCheckoutDate
    && pricingBreakdown
    && (
      (Number(pricingBreakdown.months || 0) > 1)
      || (
        Number(pricingBreakdown.months || 0) === 1
        && Number(pricingBreakdown.remaining_days || 0) > 0
      )
    ),
  );
  const hasPromoOffer = Boolean(
    promoOffer
    && Number.isFinite(Number(promoDiscountedTotal))
    && Number(promoDiscountedTotal) < Number(totalPrice || 0),
  );
  const promoDiscountAmount = hasPromoOffer
    ? Math.max(0, Number(totalPrice || 0) - Number(promoDiscountedTotal))
    : 0;
  const selectedPlanTotal = (
    bookingData.payment_plan === 'promo_one_time' && hasPromoOffer
      ? promoDiscountedTotal
      : Number(totalPrice || 0)
  );

  const selectedAddonsTotal = (propertyData?.addons || [])
    .filter(addon => selectedAddons.includes(addon.id))
    .reduce((sum, addon) => sum + (Number(addon.price) || 0), 0);

  useEffect(() => {
    if (!roomPaymentOptionsQuery.error) return;
    console.error('Error fetching payment options:', roomPaymentOptionsQuery.error);
  }, [roomPaymentOptionsQuery.error]);

  useEffect(() => {
    if (!roomPricingQuery.error) return;
    console.error('Pricing calculation failed', roomPricingQuery.error);
  }, [roomPricingQuery.error]);

  useEffect(() => {
    setBookingData((prev) => {
      let nextPaymentPlan = prev.payment_plan;

      if (isDailyContract) {
        nextPaymentPlan = 'full';
      } else if (!hasCheckoutDate) {
        nextPaymentPlan = 'monthly';
      } else if (!showPaymentPlanSelector) {
        nextPaymentPlan = 'full';
      } else if (hasPromoOffer) {
        if (!['monthly', 'promo_one_time'].includes(nextPaymentPlan)) {
          nextPaymentPlan = 'monthly';
        }
      } else if (!['monthly', 'full'].includes(nextPaymentPlan)) {
        nextPaymentPlan = 'full';
      }

      if (nextPaymentPlan === prev.payment_plan) {
        return prev;
      }

      return {
        ...prev,
        payment_plan: nextPaymentPlan,
      };
    });
  }, [isDailyContract, hasCheckoutDate, showPaymentPlanSelector, hasPromoOffer]);

  useEffect(() => {
    if (!requiresOnlineReservationFee || !canSelectOnlineMethod) return;
    if (bookingData.payment_method === 'online') return;

    setBookingData((prev) => ({
      ...prev,
      payment_method: 'online',
    }));
  }, [requiresOnlineReservationFee, canSelectOnlineMethod, bookingData.payment_method]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return theme.colors.success;
      case 'occupied': return theme.colors.error;
      case 'maintenance': return theme.colors.warning;
      default: return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return 'checkmark-circle';
      case 'occupied': return 'people';
      case 'maintenance': return 'construct';
      default: return 'help-circle';
    }
  };

  const handleImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentImageIndex(Math.round(index));
  };

  const capitalizeStatus = (status) => {
    return (status || '').replace(/^\w/, c => c.toUpperCase()) || 'Unknown';
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Booking window helpers:
  // - check-in must be within 3 months from today
  // - check-out can be any future date after check-in
  const getAllowedMaxDate = (fromDate = new Date()) => {
    const dt = new Date(fromDate);
    dt.setMonth(dt.getMonth() + 3);
    return dt;
  };

  const isStartWithinAllowedRange = (date) => {
    if (!date) return false;
    const dt = new Date(date);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = getAllowedMaxDate();
    return dt >= start && dt <= end;
  };

  // Handle start date change - auto-fill checkout to 30 days later
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure selected start date is within allowed range
      if (!isStartWithinAllowedRange(selectedDate)) {
        showWarning(
          `Invalid ${isDailyContract ? 'Check-in' : 'Move-in'}`,
          `${isDailyContract ? 'Check-in' : 'Move-in'} must be within the next 3 months.`
        );
        return;
      }

      // Daily contracts require a concrete check-out date.
      let updatedEndDate = bookingData.end_date;
      if (isDailyContract) {
        updatedEndDate = new Date(selectedDate);
        updatedEndDate.setDate(updatedEndDate.getDate() + 1);
      } else if (updatedEndDate && updatedEndDate <= selectedDate) {
        updatedEndDate = null;
      }

      setBookingData(prev => ({
        ...prev,
        start_date: selectedDate,
        end_date: updatedEndDate,
      }));
    }
  };

  // Handle end date change - tenant can still manually edit
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure end date is after start date
      if (bookingData.start_date && selectedDate <= bookingData.start_date) {
        showWarning('Invalid Date', `${isDailyContract ? 'Check-out' : 'Move-out'} date must be after ${isDailyContract ? 'check-in' : 'move-in'} date.`);
        return;
      }
      setBookingData(prev => ({ ...prev, end_date: selectedDate }));
    }
  };

  // AUTH GATE: Check if user is authenticated before booking
  const handleBook = (forCart = false) => {
    setIsCartMode(forCart);
    if (activeRoom.status !== 'available') {
      showError('Unavailable', 'This room is not available for booking.');
      return;
    }

    // If guest user, trigger auth requirement
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to book a room. Create an account or log in to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            }
          }
        ]
      );
      return;
    }

    // Reset form with today's date and contract-aware checkout defaults.
    const today = new Date();
    const bookingPolicy = String(activeRoom?.billing_policy || 'monthly').toLowerCase();
    const defaultContractMode = bookingPolicy === 'daily' ? 'daily' : 'monthly';
    const defaultEndDate = defaultContractMode === 'daily'
      ? new Date(new Date(today).setDate(today.getDate() + 1))
      : null;

    setBookingData({
      start_date: today,
      end_date: defaultEndDate,
      contract_mode: defaultContractMode,
      notes: '',
      payment_method: 'cash', // Reset to default
      payment_plan: 'full',
    });
    setBookingMode('normal');
    setProxyOccupants([createEmptyOccupant(requiredProxyGender)]);
    setActiveProxyDobPickerIndex(null);
    setReceiptImage(null);
    setSelectedBedNumbers(
      roomPricingModel === 'per_bed' && singleAvailableBedNumber !== null && singleAvailableBedNumber !== undefined
        ? [singleAvailableBedNumber]
        : [],
    );

    setBookingModalVisible(true);
  };

  const navigateToCart = React.useCallback(() => {
    const state = navigation?.getState?.();
    const localRoutes = Array.isArray(state?.routeNames) ? state.routeNames : [];

    // Prefer local stack route first.
    if (localRoutes.includes('Cart')) {
      navigation.navigate('Cart');
      return;
    }

    // Fallback for nested navigator context.
    const parent = navigation?.getParent?.();
    const parentState = parent?.getState?.();
    const parentRoutes = Array.isArray(parentState?.routeNames) ? parentState.routeNames : [];

    if (parentRoutes.includes('Main')) {
      parent.navigate('Main', { screen: 'Cart' });
      return;
    }

    // Final fallback through root navigation ref.
    rootNavigate('Main', { screen: 'Cart' });
  }, [navigation]);

  const refetchRoomPaymentOptions = roomPaymentOptionsQuery.refetch;
  const refetchPropertySnapshotQuery = propertySnapshotQuery.refetch;
  const refetchPropertySnapshot = React.useCallback(async () => {
    if (!activePropertyId) return;

    const result = await refetchPropertySnapshotQuery();
    const refreshedProperty = result?.data;
    if (!refreshedProperty) return;

    setPropertyData(refreshedProperty);
    const updatedRoom = (refreshedProperty.rooms || []).find(
      (item) => String(item.id) === String(activeRoomId),
    );
    if (updatedRoom) {
      setRoomData(updatedRoom);
    }
  }, [activePropertyId, activeRoomId, refetchPropertySnapshotQuery]);

  const roomDetailsRefreshRefetchers = React.useMemo(
    () => [refetchPropertySnapshot, refetchRoomPaymentOptions],
    [refetchPropertySnapshot, refetchRoomPaymentOptions],
  );

  const onRefresh = useTenantRefreshHandler({
    enabled: Boolean(activePropertyId),
    setRefreshing,
    refetchers: roomDetailsRefreshRefetchers,
  });

  const validateDates = () => {
    if (!bookingData.start_date) {
      showError('Missing Information', `Please select a ${isDailyContract ? 'check-in' : 'move-in'} date.`);
      return false;
    }

    if (isDailyContract && !bookingData.end_date) {
      showError('Missing Information', 'Please select both check-in and check-out dates for daily contracts.');
      return false;
    }

    const start = new Date(bookingData.start_date);
    const end = bookingData.end_date ? new Date(bookingData.end_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      showError('Invalid Date', `${isDailyContract ? 'Check-in' : 'Move-in'} date cannot be in the past.`);
      return false;
    }
    if (end && end <= start) {
      showError('Invalid Date', `${isDailyContract ? 'Check-out' : 'Move-out'} date must be after ${isDailyContract ? 'check-in' : 'move-in'} date.`);
      return false;
    }

    // Ensure start is within allowed range (3 months)
    if (!isStartWithinAllowedRange(start)) {
      showError('Invalid Date', `${isDailyContract ? 'Check-in' : 'Move-in'} must be within the next 3 months.`);
      return false;
    }

    // End date may be any future date after start (no max)

    return true;
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

    setActiveProxyDobPickerIndex((prevIndex) => {
      if (prevIndex === null) return null;
      if (prevIndex === index) return null;
      if (prevIndex > index) return prevIndex - 1;
      return prevIndex;
    });
  };

  const handleProxyOccupantChange = (index, field, value) => {
    let nextValue = value;
    if (field === 'sex') {
      const normalizedGender = normalizeGenderValue(value);
      nextValue = normalizedGender;
    }

    setProxyOccupants((prev) => prev.map((occupant, idx) => (
      idx === index ? { ...occupant, [field]: nextValue } : occupant
    )));
  };

  const getProxyDobPickerValue = (index) => {
    const existingDate = parseIsoDateOnly(proxyOccupants[index]?.date_of_birth);
    return existingDate || latestAllowedAdultDob;
  };

  const handleProxyDobChange = (index, event, selectedDate) => {
    setActiveProxyDobPickerIndex(Platform.OS === 'ios' ? index : null);

    if (!selectedDate || event?.type === 'dismissed') {
      return;
    }

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    handleProxyOccupantChange(index, 'date_of_birth', toIsoDateString(normalizedDate));
  };

  const pickReceiptImage = async () => {
    const options = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access to capture your receipt.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            setReceiptImage(result.assets[0]);
          }
        }
      },
      {
        text: 'Choose Image from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow photo library access to pick your receipt.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            setReceiptImage(result.assets[0]);
          }
        }
      },
      {
        text: 'Choose File (PDF/Image)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'image/*'],
              multiple: false,
              copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setReceiptImage({
                uri: asset.uri,
                name: asset.name,
                mimeType: asset.mimeType,
                size: asset.size,
              });
            }
          } catch (err) {
            console.error('DocumentPicker Error:', err);
            showError('Error', 'Could not open file manager.');
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ];

    Alert.alert('Upload Receipt', 'Choose a source for your payment receipt.', options);
  };

  const handleSubmitBooking = async () => {
    try {
      if (!validateDates()) return;

      const normalizedOccupants = proxyOccupants
        .map((occupant) => {
          return {
            first_name: String(occupant.first_name || '').trim(),
            middle_name: String(occupant.middle_name || '').trim(),
            last_name: String(occupant.last_name || '').trim(),
            date_of_birth: String(occupant.date_of_birth || '').trim(),
            sex: normalizeGenderValue(occupant.sex || requiredProxyGender),
            relationship_to_booker: String(occupant.relationship_to_booker || '').trim(),
            phone: String(occupant.phone || '').trim(),
            email: String(occupant.email || '').trim(),
          };
        })
        .filter((occupant) => hasAnyProxyOccupantValue(occupant));

      if (bookingMode === 'proxy') {
        if (normalizedOccupants.length === 0) {
          showError('Missing Information', 'Proxy booking requires at least one occupant.');
          return;
        }

        if (normalizedOccupants.length > occupantLimit) {
          showError('Occupant Limit', `This booking can only hold up to ${occupantLimit} occupant${occupantLimit > 1 ? 's' : ''}.`);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < normalizedOccupants.length; i += 1) {
          const occupant = normalizedOccupants[i];
          const missingFieldMessage = getProxyOccupantMissingFieldMessage(occupant, i);
          if (missingFieldMessage) {
            showError('Missing Information', missingFieldMessage);
            return;
          }

          const parsedDateOfBirth = parseIsoDateOnly(occupant.date_of_birth);
          if (!parsedDateOfBirth) {
            showError('Invalid Date of Birth', `Occupant ${i + 1}: please select a valid date of birth.`);
            return;
          }

          if (parsedDateOfBirth >= today) {
            showError('Invalid Date of Birth', `Occupant ${i + 1}: date of birth must be before today.`);
            return;
          }

          const occupantAge = getAgeInYears(parsedDateOfBirth, today);
          if (occupantAge < PROXY_MINIMUM_AGE) {
            showError('Age Restriction', `Occupant ${i + 1} must be at least ${PROXY_MINIMUM_AGE} years old.`);
            return;
          }

          if (requiredProxyGender && occupant.sex !== requiredProxyGender) {
            showError(
              'Sex Restriction',
              `Occupant ${i + 1} must be ${requiredProxyGender}. This room is ${requiredProxyGender === 'male' ? 'for boys' : 'for girls'} only.`,
            );
            return;
          }
        }
      }

      if (!agreedToRules) {
        showError('Agreement Required', 'Please read and agree to the Room Rules and policies to proceed.');
        return;
      }

      if (bookingMode === 'normal' && roomData?.sex_restriction && roomData.sex_restriction !== 'mixed') {
        const tenantSex = normalizeGenderValue(tenantProfile?.sex);
        if (tenantSex && tenantSex !== roomData.sex_restriction) {
          showError(
            'Sex Restriction',
            `This room is specifically for ${roomData.sex_restriction === 'male' ? 'boys' : 'girls'} only. Please update your profile if this is incorrect.`
          );
          return;
        }
      }

      if (bookingMode === 'normal') {
        const finalBedCount = activeRoom.pricing_model === 'per_bed' ? effectiveSelectedBedNumbers.length : 1;
        if (activeRoom.pricing_model === 'per_bed' && finalBedCount === 0) {
          showError('Selection Required', 'Please select at least one bed to proceed.');
          return;
        }
      }

      setIsSubmitting(true);

      const payload = {
        room_id: activeRoom.id,
        booking_mode: bookingMode,
        start_date: bookingData.start_date.toISOString().split('T')[0],
        end_date: bookingData.end_date ? bookingData.end_date.toISOString().split('T')[0] : null,
        contract_mode: isDailyContract ? 'daily' : 'monthly',
        payment_method: bookingData.payment_method || 'cash',
        payment_plan: isDailyContract ? 'full' : bookingData.payment_plan,
        notes: bookingData.notes || '',
        agreed_to_rules: true,
      };

      if (bookingMode === 'normal' && activeRoom.pricing_model === 'per_bed' && effectiveSelectedBedNumbers.length > 0) {
        payload.bed_numbers = effectiveSelectedBedNumbers.join(',');
        payload.bed_count = effectiveSelectedBedNumbers.length;
      }

      if (selectedAddons && selectedAddons.length > 0) {
        payload.addons = selectedAddons;
      }

      if (bookingMode === 'proxy') {
        const inferredBedCount = Math.max(1, normalizedOccupants.length);
        payload.bed_count = inferredBedCount;
        payload.occupants = normalizedOccupants.map(occupant => ({
          first_name: occupant.first_name,
          middle_name: occupant.middle_name || null,
          last_name: occupant.last_name,
          date_of_birth: occupant.date_of_birth,
          sex: occupant.sex,
          relationship_to_booker: occupant.relationship_to_booker,
          phone: occupant.phone || '',
          email: occupant.email || '',
        }));
      }
      if (isCartMode) {
        let result;
        if (isEditing && cartItem?.id) {
          result = await CartService.updateCartItem(cartItem.id, payload);
        } else {
          result = await CartService.addToCart(payload);
        }

        if (result.success) {
          DeviceEventEmitter.emit('accommo:cart-updated');

          if (isEditing) {
            showSuccess('Updated', 'Your selection has been updated successfully.');
            setBookingModalVisible(false);
            // Wait a tiny bit for the toast/modal to start closing then navigate back
            setTimeout(() => {
              navigateToCart();
            }, 300);
          } else {
            showSuccess('Added to Book', 'Room added to your book successfully!');
            setBookingModalVisible(false);
          }
        } else {
          const validationMessage = formatBookingValidationError(result.details || result.errors);
          showError('Failed to Save', validationMessage || result.error || 'Something went wrong.');
        }
        setIsSubmitting(false);
        return;
      }

      const result = await BookingService.createBooking(payload);

      if (result.success) {
        const bookingResponse = result.data || {};
        const bookingObj = bookingResponse.booking || bookingResponse.data?.booking || null;
        const reservationInvoice = bookingResponse.reservation_invoice || bookingResponse.data?.reservation_invoice || null;
        const checkoutUrl = reservationInvoice?.checkout_url;

        if (bookingData.payment_method === 'online') {
          if (checkoutUrl) {
            await Linking.openURL(checkoutUrl);
          }
        }

        showSuccess(
          'Success',
          `Booking submitted successfully! Reference: ${bookingObj?.booking_reference || 'N/A'}`
        );
        setBookingModalVisible(false);
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      } else {
        // Handle errors with enhanced messages for booking limits
        if (result.error && (
          result.error.toLowerCase().includes('authentication') ||
          result.error.toLowerCase().includes('unauthenticated')
        )) {
          if (onAuthRequired) onAuthRequired();
          else triggerForcedLogout();
          return;
        }

        // Enhanced error messages for booking limits
        if (result.error && result.error.includes('Normal booking allows only 1')) {
          showError(
            'Normal Booking Limit Reached',
            'You already have 1 active or pending normal booking in this property. Normal and proxy limits are independent.'
          );
        } else if (result.error && result.error.includes('Proxy booking limit reached')) {
          showError(
            'Proxy Booking Limit Reached',
            'You have reached the maximum proxy bookings allowed in this property. Normal and proxy limits are independent.'
          );
        } else if (result.error && result.error.includes('already have an active or pending booking for this room')) {
          showError(
            'Room Already Reserved',
            'You already have an active or pending booking for this specific room.'
          );
        } else if (result.error && result.error.includes('overdue invoices')) {
          showError(
            'Payment Required',
            'You cannot create new bookings while you have overdue invoices. Please settle your outstanding balance first.'
          );
        } else if (result.details) {
          const validationMessage = formatBookingValidationError(result.details);
          showError('Validation Error', validationMessage || Object.values(result.details).flat().join('\n'));
        } else {
          showError('Booking Error', result.error || 'Failed to submit booking.');
        }
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      const errorData = error.response?.data;
      const validationMessage = formatBookingValidationError(errorData?.errors || errorData?.details);
      const finalMsg = validationMessage || errorData?.error || errorData?.message || error.message || 'An unexpected error occurred.';
      showError('Booking Error', finalMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // AUTH GATE: Contact landlord also requires auth
  const handleContactLandlord = async () => {
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to contact the landlord.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            }
          }
        ]
      );
      return;
    }

    try {
      // COMPREHENSIVE DEBUG LOGGING
      console.log('=== CONTACT LANDLORD DEBUG ===');
      console.log('Full property object:', JSON.stringify(property, null, 2));
      console.log('Property keys:', Object.keys(property));
      console.log('Direct property.landlord_id:', property.landlord_id);
      console.log('Direct property.user_id:', property.user_id);
      console.log('Direct property.landlord:', property.landlord);
      console.log('Direct property.landlord_name:', property.landlord_name);
      console.log('Direct property.owner_name:', property.owner_name);
      console.log('==============================');

      // Try EVERY possible way to get landlord_id
      const landlordId = property.landlord_id ||
        property.user_id ||
        property.landlord?.id ||
        property.owner?.id;

      // Try EVERY possible way to get landlord name
      const landlordName = property.landlord_name ||
        property.owner_name ||
        (property.landlord ?
          `${property.landlord.first_name || ''} ${property.landlord.last_name || ''}`.trim()
          : null) ||
        (property.owner ?
          `${property.owner.first_name || ''} ${property.owner.last_name || ''}`.trim()
          : null) ||
        'Landlord';

      console.log('Extracted landlord info:', JSON.stringify({ landlordId, landlordName }, null, 2));

      // Check if we have the landlord information
      if (!landlordId) {
        console.error('LANDLORD ID NOT FOUND!');
        console.error('Available property data:', Object.keys(property));

        showError(
          'Error',
          'Landlord information not available. This might be an older property listing. Please try viewing the property again from the home page.'
        );
        return;
      }

      console.log('Navigating to Messages with:', {
        landlordId,
        landlordName,
        propertyId: property.id,
        propertyTitle: property.name || property.title,
        roomId: activeRoom.id,
        roomNumber: activeRoom.room_number
      });

      // Navigate to Messages with the conversation parameters
      navigation.navigate('Messages', {
        startConversation: true,
        recipient: {
          id: landlordId,
          name: landlordName,
        },
        property: {
          id: property.id,
          title: property.name || property.title,
        },
        room: {
          id: activeRoom.id,
          room_number: activeRoom.room_number,
        }
      });
    } catch (error) {
      console.error('Error navigating to messages:', error);
      console.error('Error stack:', error.stack);
      showError('Error', `Failed to open messages: ${error.message}\n\nPlease try again.`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.headerBar, { backgroundColor: theme.colors.primary, borderBottomColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse || '#fff'} />
        </TouchableOpacity>

        <Text style={[styles.titleTxt, { color: theme.colors.textInverse || '#fff' }]}>Room Details</Text>

        <View style={styles.emptyHeaderSide} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Image Gallery */}
        {activeRoom.images && activeRoom.images.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {activeRoom.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: getRoomImageUrl(image) }}
                  style={styles.roomImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Image Indicators */}
            {activeRoom.images.length > 1 && (
              <View style={styles.imageIndicator}>
                {activeRoom.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.indicatorDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imageGalleryContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/400x280?text=No+Image' }}
              style={styles.roomImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Room Header */}
          <View style={styles.roomHeader}>
            <Text style={styles.roomNumber}>Room {activeRoom.room_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeRoom.status) + '20' }]}>
              <Ionicons name={getStatusIcon(activeRoom.status)} size={14} color={getStatusColor(activeRoom.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(activeRoom.status) }]}>
                {capitalizeStatus(activeRoom.status)}
              </Text>
            </View>
          </View>

          {/* Room Type */}
          <Text style={styles.roomType}>{activeRoom.type_label || activeRoom.room_type}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ₱{(() => {
                const rate = isDailyContract ? (activeRoom.daily_rate || Math.round(activeRoom.monthly_rate / 30)) : activeRoom.monthly_rate;
                return (Number(rate) || 0).toLocaleString();
              })()}
            </Text>
            <Text style={styles.priceLabel}>{isDailyContract ? '/day' : '/month'}</Text>
          </View>

          {/* Tenancy Reminder */}
          {(activeRoom.is_tenant || activeRoom.reserved_by_me) && (
            <View style={{
              backgroundColor: activeRoom.is_tenant ? '#eff6ff' : '#fffbeb',
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: activeRoom.is_tenant ? '#bfdbfe' : '#fef3c7',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12
            }}>
              <Ionicons
                name={activeRoom.is_tenant ? "information-circle" : "time"}
                size={22}
                color={activeRoom.is_tenant ? "#1d4ed8" : "#92400e"}
              />
              <Text style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: '600',
                color: activeRoom.is_tenant ? "#1d4ed8" : "#92400e"
              }}>
                {activeRoom.is_tenant
                  ? "You are already a resident of this room. You can book more beds for others using Proxy mode."
                  : "You have a pending reservation here. Proxy mode is available for additional beds."
                }
              </Text>
            </View>
          )}

          {/* Quick Info Tags (Replaces redundant capacity grid) */}
          <View style={[styles.section, { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary || '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 }}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>
                {(activeRoom.capacity || 0) - (activeRoom.occupied || 0)} Beds Remaining
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary || '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 }}>
              <Ionicons name="male-female-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>
                {activeRoom.sex_restriction === 'male' ? 'Boys Only' : activeRoom.sex_restriction === 'female' ? 'Girls Only' : 'Mixed'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary || '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 }}>
              <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>
                {activeRoom.floor_label || `Floor ${activeRoom.floor}`}
              </Text>
            </View>
          </View>



          {/* Description */}
          {activeRoom.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{activeRoom.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {activeRoom.amenities && activeRoom.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {activeRoom.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    <Text style={[styles.amenityText, { color: theme.colors.text }]}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Room Rules */}
          {((activeRoom.rules && activeRoom.rules.length > 0) || (propertyData?.rules && propertyData.rules.length > 0)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Rules</Text>
              <View style={styles.rulesList}>
                {(activeRoom.rules?.length > 0 ? activeRoom.rules : propertyData?.rules || []).map((rule, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <Ionicons name="alert-circle-outline" size={18} color="#f97316" />
                    <Text style={[styles.ruleText, { color: theme.colors.text }]}>{rule}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* GUEST USER NOTICE */}
          {isGuest && (
            <View style={styles.guestNotice}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.guestNoticeText}>
                Sign in to book rooms and contact landlords
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {roomIsBookable && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.bookButton, { width: isGuest ? '100%' : '78%', marginTop: 0 }]}
                onPress={() => handleBook(false)}
              >
                <Text style={styles.bookButtonText}>
                  {isGuest ? 'Sign In to Book' : 'Book Now'}
                </Text>
              </TouchableOpacity>

              {!isGuest && (
                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    {
                      width: '20%',
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                      marginTop: 0,
                      paddingHorizontal: 0,
                    },
                  ]}
                  onPress={() => handleBook(true)}
                >
                  <Ionicons name="book-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.contactButton} onPress={handleContactLandlord}>
            <Ionicons name="chatbubble-outline" size={18} color="#ffffff" />
            <Text style={styles.contactButtonText}>Contact Landlord</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Booking Modal - UPDATED WITH DATE PICKERS */}
      <Modal
        visible={bookingModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => !isSubmitting && setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalTitle}>{isCartMode ? 'Add to Book' : 'Book Now'} {activeRoom.room_number}</Text>

              {!isDailyContract && (
                <View style={{ backgroundColor: theme.colors.primary + '15', padding: 8, borderRadius: 8, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.primary }}>Monthly Billing Policy</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>
                    Stays are billed in 30-day blocks. Even below 30 days, monthly billing charges 1 full month.
                  </Text>

                  {pricingBreakdown?.remaining_days > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#FEF3C7', padding: 6, borderRadius: 4 }}>
                      <Ionicons name="alert-circle" size={16} color="#B45309" />
                      <Text style={{ fontSize: 11, color: '#B45309', fontWeight: 'bold', flex: 1 }}>
                        Stay has {pricingBreakdown.remaining_days} extra days. You will be charged for an additional month.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {isLimitReached && (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#FEE2E2",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 13, fontWeight: "bold", color: "#B91C1C" }}
                    >
                      {bookingMode === "normal" ? "Standard" : "Proxy"} Limit
                      Reached
                    </Text>
                    <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 2 }}>
                      You have reached the maximum allowed{" "}
                      {bookingMode === "normal" ? "standard" : "proxy"} bookings
                      for this property.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Booking Type</Text>
                <View style={styles.paymentMethodRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodBtn,
                      bookingMode === 'normal' && styles.paymentMethodBtnActive,
                    ]}
                    onPress={() => setBookingMode('normal')}
                  >
                    <Text
                      style={[
                        styles.paymentMethodBtnText,
                        bookingMode === 'normal' && styles.paymentMethodBtnTextActive,
                      ]}
                    >
                      Normal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodBtn,
                      bookingMode === 'proxy' && styles.paymentMethodBtnActive,
                    ]}
                    onPress={() => setBookingMode('proxy')}
                  >
                    <Text
                      style={[
                        styles.paymentMethodBtnText,
                        bookingMode === 'proxy' && styles.paymentMethodBtnTextActive,
                      ]}
                    >
                      Proxy
                    </Text>
                  </TouchableOpacity>
                </View>
                {bookingMode === 'normal' ? (
                  <Text style={styles.summaryNote}>
                    Limit: {propertyData?.normal_booking_limit || 1} personal stay per property ({propertyData?.tenant_usage?.normal || 0}/{propertyData?.normal_booking_limit || 1} used)
                  </Text>
                ) : (
                  <Text style={styles.summaryNote}>
                    Limit: {propertyData?.proxy_booking_limit || 3} bookings for other people ({propertyData?.tenant_usage?.proxy || 0}/{propertyData?.proxy_booking_limit || 3} used)
                  </Text>
                )}
              </View>

              {activeRoom.pricing_model === 'per_bed' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{bookingMode === 'proxy' ? 'Select Bed(s)' : 'Select Bed'}</Text>
                  <Text style={styles.summaryNote}>Beds Remaining: {(activeRoom.capacity || 0) - (activeRoom.occupied || 0)}</Text>
                  <View style={styles.bedGrid}>
                    {(activeRoom.available_bed_numbers || []).map((bedNum) => {
                      const isSelected = selectedBedNumbers.includes(bedNum);
                      return (
                        <TouchableOpacity
                          key={`bed-${bedNum}`}
                          style={[
                            styles.bedItem,
                            isSelected && styles.bedItemActive
                          ]}
                          onPress={() => toggleBedNumber(bedNum)}
                        >
                          <Text style={[
                            styles.bedItemText,
                            isSelected && styles.bedItemTextActive
                          ]}>
                            Bed {bedNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {(!activeRoom.available_bed_numbers || activeRoom.available_bed_numbers.length === 0) && (
                      <Text style={[styles.summaryNote, { color: theme.colors.error }]}>
                        No specific beds available for selection.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {supportsContractModeSwitch && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Stay Mode</Text>
                  <View style={styles.paymentMethodRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodBtn,
                        !isDailyContract && styles.paymentMethodBtnActive,
                      ]}
                      onPress={() => setBookingData(prev => ({
                        ...prev,
                        contract_mode: 'monthly',
                        end_date: null,
                        payment_plan: prev.payment_plan === 'monthly' ? 'monthly' : 'full',
                      }))}
                    >
                      <Text
                        style={[
                          styles.paymentMethodBtnText,
                          !isDailyContract && styles.paymentMethodBtnTextActive,
                        ]}
                      >
                        Monthly Contract
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodBtn,
                        isDailyContract && styles.paymentMethodBtnActive,
                      ]}
                      onPress={() => setBookingData(prev => {
                        const defaultEndDate = new Date(prev.start_date || new Date());
                        defaultEndDate.setDate(defaultEndDate.getDate() + 1);
                        return {
                          ...prev,
                          contract_mode: 'daily',
                          end_date: prev.end_date || defaultEndDate,
                          payment_plan: 'full',
                        };
                      })}
                    >
                      <Text
                        style={[
                          styles.paymentMethodBtnText,
                          isDailyContract && styles.paymentMethodBtnTextActive,
                        ]}
                      >
                        Daily Contract
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.summaryNote}>
                    Monthly contracts may leave move-out blank for open-ended stay.
                  </Text>
                </View>
              )}

              {/* Start Date Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{isDailyContract ? 'Check-in Date' : 'Move-in Date'} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                  disabled={isSubmitting}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  <Text style={styles.dateButtonText}>{formatDate(bookingData.start_date)}</Text>
                </TouchableOpacity>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={bookingData.start_date || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onStartDateChange}
                    minimumDate={new Date()}
                    maximumDate={getAllowedMaxDate()}
                  />
                )}
                {isReservationConfigured && (
                  <Text
                    style={[
                      styles.summaryNote,
                      {
                        marginTop: 8,
                        color: isReservationRequired ? (theme.colors.warning || '#f59e0b') : (theme.colors.success || '#16a34a'),
                      },
                    ]}
                  >
                    {isReservationRequired
                      ? `Reservation fee required: move-in is ${daysUntilMoveIn} days after booking date.`
                      : 'No reservation fee for move-in within 3 days from booking date.'}
                  </Text>
                )}
              </View>

              {/* End Date Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {isDailyContract ? 'Check-out Date' : 'Planned Move-out Date (Optional)'}
                  {isDailyContract ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                  disabled={isSubmitting}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  <Text style={styles.dateButtonText}>{formatDate(bookingData.end_date)}</Text>
                </TouchableOpacity>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={bookingData.end_date || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onEndDateChange}
                    minimumDate={bookingData.start_date || new Date()}
                  // No maximumDate: checkout may be any future date
                  />
                )}
              </View>

              {bookingMode === 'proxy' && (
                <View style={styles.inputContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.inputLabel}>Occupants ({proxyOccupants.length}/{occupantLimit})</Text>
                    <TouchableOpacity onPress={handleAddProxyOccupant} disabled={proxyOccupants.length >= occupantLimit}>
                      <Text style={{ color: proxyOccupants.length >= occupantLimit ? theme.colors.textTertiary : theme.colors.primary, fontWeight: '600' }}>
                        Add Occupant
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.summaryNote}>Provide details of the people who will actually stay in this room.</Text>
                  <Text style={styles.summaryNote}>Fields marked with <Text style={styles.requiredAsterisk}>*</Text> are required.</Text>

                  {proxyOccupants.map((occupant, index) => (
                    <View
                      key={`proxy-occupant-${index}`}
                      style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, marginTop: 10 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Occupant {index + 1}</Text>
                        {proxyOccupants.length > 1 && (
                          <TouchableOpacity onPress={() => handleRemoveProxyOccupant(index)}>
                            <Text style={{ color: theme.colors.error || '#ef4444', fontWeight: '600' }}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.proxyFieldLabel}>First Name <Text style={styles.requiredAsterisk}>*</Text></Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        placeholder="First name"
                        placeholderTextColor="#999"
                        value={occupant.first_name}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'first_name', text)}
                      />

                      <Text style={styles.proxyFieldLabel}>Middle Name (Optional)</Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        placeholder="Middle name"
                        placeholderTextColor="#999"
                        value={occupant.middle_name}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'middle_name', text)}
                      />

                      <Text style={styles.proxyFieldLabel}>Last Name <Text style={styles.requiredAsterisk}>*</Text></Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        placeholder="Last name"
                        placeholderTextColor="#999"
                        value={occupant.last_name}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'last_name', text)}
                      />

                      <Text style={styles.proxyFieldLabel}>Date of Birth <Text style={styles.requiredAsterisk}>*</Text></Text>
                      <TouchableOpacity
                        testID={`proxy-occupant-dob-button-${index}`}
                        style={styles.proxyDateButton}
                        onPress={() => setActiveProxyDobPickerIndex(index)}
                        disabled={isSubmitting}
                      >
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textTertiary} />
                        <Text
                          style={[
                            styles.proxyDateButtonText,
                            !occupant.date_of_birth && styles.proxyDateButtonTextPlaceholder,
                          ]}
                        >
                          {occupant.date_of_birth || 'Select date of birth'}
                        </Text>
                      </TouchableOpacity>
                      {activeProxyDobPickerIndex === index && (
                        <DateTimePicker
                          testID={`proxy-occupant-dob-picker-${index}`}
                          value={getProxyDobPickerValue(index)}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          maximumDate={latestAllowedAdultDob}
                          onChange={(event, selectedDate) => handleProxyDobChange(index, event, selectedDate)}
                        />
                      )}
                      <Text style={styles.proxyFieldHelp}>Birth date only, not move-in date. Occupant must be at least 18 years old.</Text>

                      <Text style={styles.proxyFieldLabel}>Sex <Text style={styles.requiredAsterisk}>*</Text></Text>
                      <TouchableOpacity
                        style={[
                          styles.selectTrigger,
                          { marginBottom: 10, minHeight: 48 },
                          requiredProxyGender ? { backgroundColor: theme.colors.backgroundSecondary } : {}
                        ]}
                        disabled={!!requiredProxyGender}
                        onPress={() => {
                          setActiveProxySexIndex(index);
                          setProxySexModalVisible(true);
                        }}
                      >
                        <Text style={styles.selectTriggerText}>
                          {(occupant.sex || requiredProxyGender)
                            ? (normalizeGenderValue(occupant.sex || requiredProxyGender) === 'male' ? 'Male' : 'Female')
                            : 'Select sex'}
                        </Text>
                        {!requiredProxyGender && <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />}
                      </TouchableOpacity>
                      {requiredProxyGender ? (
                        <Text style={[styles.proxyFieldHelp, { color: theme.colors.error || '#ef4444' }]}>
                          This room is restricted to {requiredProxyGender === 'male' ? 'boys' : 'girls'} only.
                        </Text>
                      ) : null}

                      <Text style={styles.proxyFieldLabel}>Relationship to Booker <Text style={styles.requiredAsterisk}>*</Text></Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        placeholder="Relationship to booker"
                        placeholderTextColor="#999"
                        value={occupant.relationship_to_booker}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'relationship_to_booker', text)}
                      />

                      <Text style={styles.proxyFieldLabel}>Phone (Optional)</Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        placeholder="Phone (optional)"
                        placeholderTextColor="#999"
                        value={occupant.phone}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'phone', text)}
                      />

                      <Text style={styles.proxyFieldLabel}>Email (Optional)</Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 0 }]}
                        placeholder="Email (optional)"
                        placeholderTextColor="#999"
                        value={occupant.email}
                        onChangeText={(text) => handleProxyOccupantChange(index, 'email', text)}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Addons Selection */}
              {propertyData?.addons && propertyData.addons.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Available Addons</Text>
                  <Text style={styles.summaryNote}>Select any additional services you'd like to include.</Text>
                  <View style={{ marginTop: 10 }}>
                    {propertyData.addons.map((addon) => {
                      const isSelected = selectedAddons.includes(addon.id);
                      return (
                        <TouchableOpacity
                          key={addon.id}
                          style={[
                            styles.addonItem,
                            isSelected && styles.addonItemActive
                          ]}
                          onPress={() => toggleAddon(addon.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.addonName, isSelected && styles.addonNameActive]}>
                                {addon.name}
                              </Text>
                              {addon.description && (
                                <Text style={styles.addonDescription}>{addon.description}</Text>
                              )}
                            </View>
                            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                              <Text style={[styles.addonPrice, isSelected && styles.addonPriceActive]}>
                                ₱{Number(addon.price).toLocaleString()}
                              </Text>
                              <Text style={styles.addonPriceType}>
                                {addon.price_type === 'monthly' ? 'per month' : 'one-time'}
                              </Text>
                            </View>
                            <View style={[styles.addonCheckbox, isSelected && styles.addonCheckboxActive]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Payment Method Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Payment Method <Text style={{ color: '#ef4444' }}>*</Text></Text>

                <View style={styles.paymentMethodRow}>
                  {canSelectCashMethod && (
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodBtn,
                        bookingData.payment_method === 'cash' && styles.paymentMethodBtnActive
                      ]}
                      onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'cash' }))}
                    >
                      <Text style={[
                        styles.paymentMethodBtnText,
                        bookingData.payment_method === 'cash' && styles.paymentMethodBtnTextActive
                      ]}>Cash</Text>
                    </TouchableOpacity>
                  )}

                  {canSelectOnlineMethod && (
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodBtn,
                        bookingData.payment_method === 'online' && styles.paymentMethodBtnActive
                      ]}
                      onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'online' }))}
                    >
                      <Text style={[
                        styles.paymentMethodBtnText,
                        bookingData.payment_method === 'online' && styles.paymentMethodBtnTextActive
                      ]}>Online (PayMongo)</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {requiresOnlineReservationFee && (
                  <Text style={[styles.summaryNote, { marginTop: 8, color: theme.colors.warning || '#f59e0b' }]}>
                    Manual GCash reservation payment is currently disabled. Use Online (PayMongo) to continue.
                  </Text>
                )}
              </View>

              {/* Payment Plan Selection - Only for monthly contract stays >= 2 months */}
              {showPaymentPlanSelector && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Payment Plan <Text style={{ color: '#ef4444' }}>*</Text></Text>

                  <View style={styles.paymentMethodRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodBtn,
                        bookingData.payment_plan === 'monthly' && styles.paymentMethodBtnActive
                      ]}
                      onPress={() => setBookingData(prev => ({ ...prev, payment_plan: 'monthly' }))}
                    >
                      <Text style={[
                        styles.paymentMethodBtnText,
                        bookingData.payment_plan === 'monthly' && styles.paymentMethodBtnTextActive
                      ]}>Monthly</Text>
                    </TouchableOpacity>

                    {hasPromoOffer ? (
                      <TouchableOpacity
                        style={[styles.paymentMethodBtn, bookingData.payment_plan === 'promo_one_time' && styles.paymentMethodBtnActive]}
                        onPress={() => setBookingData(prev => ({ ...prev, payment_plan: 'promo_one_time' }))}
                      >
                        <Text style={[styles.paymentMethodBtnText, bookingData.payment_plan === 'promo_one_time' && styles.paymentMethodBtnTextActive]}>
                          Pay One-Time Promo
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.paymentMethodBtn, bookingData.payment_plan === 'full' && styles.paymentMethodBtnActive]}
                        onPress={() => setBookingData(prev => ({ ...prev, payment_plan: 'full' }))}
                      >
                        <Text style={[styles.paymentMethodBtnText, bookingData.payment_plan === 'full' && styles.paymentMethodBtnTextActive]}>
                          Full
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.summaryNote, { marginTop: 8, fontStyle: 'italic' }]}>
                    {bookingData.payment_plan === 'monthly'
                      ? 'Pay the first month now to confirm, then pay monthly.'
                      : bookingData.payment_plan === 'promo_one_time'
                        ? `Pay the discounted total of ₱${promoDiscountedTotal.toLocaleString()} upfront to avail the promo.`
                        : 'Pay the total amount within 3 days to confirm your booking.'
                    }
                  </Text>
                </View>
              )}

              {/* Duration & Cost Summary */}
              {(hasCheckoutDate || !isDailyContract) && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>
                      {isPricingLoading ? 'Calculating...' : (
                        pricingBreakdown
                          ? `${pricingBreakdown.months || 0} month(s) ${pricingBreakdown.remaining_days > 0 ? `+ ${pricingBreakdown.remaining_days} day(s)` : ''}`
                          : 'Select dates'
                      )}
                    </Text>
                  </View>

                  {activeRoom.requires_advance && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>1-Month Advance</Text>
                      <Text style={styles.summaryValue}>
                        ₱{(Number(activeRoom.monthly_rate) || 0).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {selectedAddons && selectedAddons.length > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Addons Total</Text>
                      <Text style={styles.summaryValue}>
                        ₱{selectedAddonsTotal.toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {isReservationRequired && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Reservation Fee</Text>
                      <Text style={styles.summaryValue}>
                        ₱{reservationFeeAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {hasPromoOffer && bookingData.payment_plan === 'promo_one_time' && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Promo Discount</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                        - ₱{promoDiscountAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bbf7d0', paddingTop: 8, marginTop: 8 }]}>
                    <Text style={styles.summaryLabelBold}>Total Amount</Text>
                    <Text style={styles.summaryValueBold}>
                      {isPricingLoading ? '...' : `₱${( // Use selectedPlanTotal which already accounts for promo
                        (Number(selectedPlanTotal) || 0) +
                        (activeRoom.requires_advance ? Number(activeRoom.monthly_rate) : 0) +
                        (isReservationRequired ? reservationFeeAmount : 0) +
                        selectedAddonsTotal
                      ).toLocaleString()}`}
                    </Text>
                  </View>

                  {isReservationConfigured && !isReservationRequired && (
                    <View
                      style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: theme.colors.surface || '#f8fafc',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.border || '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.success || '#16a34a' }}>
                        No Reservation Fee Required
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>
                        Move-in is within 3 days from booking date.
                      </Text>
                    </View>
                  )}


                  <View style={{ marginTop: 8 }}>
                    {pricingBreakdown && pricingBreakdown.months > 0 && (
                      <Text style={[styles.summaryNote, { marginBottom: 2 }]}>
                        Rent: ₱{(Number(activeRoom.monthly_rate) || 0).toLocaleString()}/month × {pricingBreakdown.months}
                      </Text>
                    )}
                    {pricingBreakdown && pricingBreakdown.remaining_days > 0 && (
                      <Text style={[styles.summaryNote, { marginBottom: 2 }]}>
                        Rent: ₱{(Number(activeRoom.daily_rate || Math.round(activeRoom.monthly_rate / 30)) || 0).toLocaleString()}/day × {pricingBreakdown.remaining_days}
                      </Text>
                    )}
                    {activeRoom.requires_advance && (
                      <Text style={[styles.summaryNote, { color: theme.colors.primary, fontWeight: '600' }]}>
                        * Includes 1-month advance required for this room
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Add any special requests or notes"
                  placeholderTextColor="#999"
                  multiline
                  value={bookingData.notes}
                  onChangeText={(text) => setBookingData(prev => ({ ...prev, notes: text }))}
                  editable={!isSubmitting}
                />
              </View>

              {/* Agreement Checkbox */}
              <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setAgreedToRules(!agreedToRules)}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: agreedToRules ? theme.colors.primary : theme.colors.border,
                      backgroundColor: agreedToRules ? theme.colors.primary : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 10,
                    }}
                  >
                    {agreedToRules && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 13, color: theme.colors.text, flex: 1 }}>
                    I have read and agree to the Room Rules and policies. <Text style={{ color: theme.colors.primary }}>*</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, ((isDailyContract && !bookingData.end_date) || isSubmitting) && styles.submitButtonDisabled]}
                onPress={handleSubmitBooking}
                disabled={(isDailyContract && !bookingData.end_date) || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{isCartMode ? 'Add to Book' : 'Book Now'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setBookingModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
            <Toast config={toastConfig} />
          </View>
        </View>
      </Modal>
      {/* Proxy Sex Modal */}
      <Modal
        visible={proxySexModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setProxySexModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setProxySexModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Sex</Text>
            {[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = activeProxySexIndex !== null && normalizeGenderValue(proxyOccupants[activeProxySexIndex]?.sex) === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    if (activeProxySexIndex !== null) {
                      handleProxyOccupantChange(activeProxySexIndex, 'sex', option.value);
                    }
                    setProxySexModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setProxySexModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}