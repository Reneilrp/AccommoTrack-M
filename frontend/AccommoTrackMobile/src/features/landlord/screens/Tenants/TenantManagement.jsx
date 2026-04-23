import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/Tenants.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import { normalizeActionError } from '../../../../utils/error.js';
import TenantLifecycleModal from './TenantLifecycleModal.jsx';
import BookingService from '../../../../services/BookingService.js';
import { hasPermission as checkPermission } from '../../../../utils/permissionHelpers.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';

const FILTERS = [
  { label: 'All Tenants', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Overdue', value: 'overdue' }
];

const PAYMENT_BADGES = {
  paid: { bg: '#DCFCE7', color: '#15803D', label: 'Paid' },
  partial: { bg: '#FEF3C7', color: '#B45309', label: 'Partial' },
  unpaid: { bg: '#FEE2E2', color: '#B91C1C', label: 'Unpaid' },
  overdue: { bg: '#FEE2E2', color: '#B91C1C', label: 'Overdue' }
};

const EMPTY_PROPERTIES = [];
const EMPTY_TENANTS = [];

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₱0';
  return `₱${Number(value).toLocaleString('en-US')}`;
};

const isRoomBookable = (room) => {
  if (!room) return false;
  if (typeof room.is_available === 'boolean') {
    return room.is_available;
  }

  return room.status === 'available'
    && Number(room.available_slots ?? 0) > 0
    && !room.is_booking_locked;
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const resolveTenantMonthlyRent = (tenant, room) => {
  const monthlyCandidates = [
    tenant?.latestBooking?.monthly_rent,
    tenant?.latestBooking?.monthlyRent,
    tenant?.latestBooking?.room?.monthly_rate,
    tenant?.latestBooking?.room?.price,
    tenant?.latestBooking?.room?.unit_price,
    room?.monthly_rate,
    room?.price,
    room?.unit_price,
  ];

  for (const candidate of monthlyCandidates) {
    const amount = parseAmount(candidate);
    if (amount !== null && amount > 0) {
      return { amount, estimated: false };
    }
  }

  const dailyCandidates = [
    tenant?.latestBooking?.room?.daily_rate,
    room?.daily_rate,
  ];

  for (const candidate of dailyCandidates) {
    const dailyRate = parseAmount(candidate);
    if (dailyRate !== null && dailyRate > 0) {
      return { amount: dailyRate * 30, estimated: true };
    }
  }

  return { amount: null, estimated: false };
};

const getTodayDateOnly = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const formatDateForApi = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDateInput = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  const matches = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!matches) return null;

  const year = Number(matches[1]);
  const month = Number(matches[2]);
  const day = Number(matches[3]);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() + 1 !== month
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatDateForDisplay = (value) => {
  const parsed = parseIsoDateInput(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export default function TenantsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;
  const tenantCardMaxWidth = isLargeTablet ? 920 : isTablet ? 760 : null;
  const tenantCardWidth = tenantCardMaxWidth ? Math.min(tenantCardMaxWidth, screenWidth - 32) : null;
  const preselectedPropertyId = normalizeId(route?.params?.propertyId);

  const [user, setUser] = useState(null);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          setUser(JSON.parse(userString));
        }
      } catch (_error) {}
    };
    loadUser();
  }, []);

  const isCaretaker = user?.role === 'caretaker';
  const hasPermission = React.useCallback((key, aliases = []) => {
    return checkPermission(user?.caretaker_permissions, isCaretaker, key, aliases);
  }, [isCaretaker, user?.caretaker_permissions]);

  const canAddTenants = !isCaretaker || hasPermission('add_tenant_manually');
  const canManageTenants = !isCaretaker || hasPermission('tenants');
  const canApproveBookings = !isCaretaker || hasPermission('approve_bookings');

  const statCardWidth = useMemo(() => {
    const visibleArea = Math.max(240, screenWidth - 48);
    return Math.min(240, Math.max(132, Math.round(visibleArea / 2.25)));
  }, [screenWidth]);

  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  const [claimCodeModalVisible, setClaimCodeModalVisible] = useState(false);
  const [claimCodePayload, setClaimCodePayload] = useState({
    tenantName: '',
    code: '',
    expiresAt: '',
  });

  const [detailTenant, setDetailTenant] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const [openActionsTenantId, setOpenActionsTenantId] = useState(null);

  const [transferVisible, setTransferVisible] = useState(false);
  const [transferringTenant, setTransferringTenant] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoomsForTransfer, setLoadingRoomsForTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    new_room_id: '',
    reason: '',
    damage_charge: '',
    damage_description: ''
  });

  const [assignVisible, setAssignVisible] = useState(false);
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [availableRoomsForAssign, setAvailableRoomsForAssign] = useState([]);
  const [loadingRoomsForAssign, setLoadingRoomsForAssign] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignData, setAssignData] = useState({
    room_id: '',
    move_in_date: '',
    end_date: '',
    notes: ''
  });
  const [showAssignMoveInPicker, setShowAssignMoveInPicker] = useState(false);
  const [showAssignEndDatePicker, setShowAssignEndDatePicker] = useState(false);

  const [createTenantVisible, setCreateTenantVisible] = useState(false);
  const [availableRoomsForCreate, setAvailableRoomsForCreate] = useState([]);
  const [loadingRoomsForCreate, setLoadingRoomsForCreate] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [createTenantData, setCreateTenantData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    room_id: '',
    move_in_date: '',
    end_date: '',
    notes: '',
  });
  const [showCreateMoveInPicker, setShowCreateMoveInPicker] = useState(false);
  const [showCreateEndDatePicker, setShowCreateEndDatePicker] = useState(false);

  const [unassignVisible, setUnassignVisible] = useState(false);
  const [unassigningTenant, setUnassigningTenant] = useState(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const [lifecycleVisible, setLifecycleVisible] = useState(false);
  const [lifecycleTenant, setLifecycleTenant] = useState(null);

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.properties(),
    queryFn: async () => {
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load properties');
      }
      return Array.isArray(response.data) ? response.data : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const tenantsInfiniteQuery = useInfiniteQuery({
    queryKey: landlordQueryKeys.tenantsByProperty(selectedPropertyId),
    enabled: Boolean(selectedPropertyId),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await PropertyService.getTenants({ 
        property_id: selectedPropertyId,
        page: pageParam
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load tenants');
      }
      return response.data; // { items, pagination }
    },
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.pagination;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const tenants = useMemo(() => {
    return tenantsInfiniteQuery.data?.pages.flatMap((page) => page.items) || [];
  }, [tenantsInfiniteQuery.data]);

  const loadingProperties = propertiesQuery.isPending && properties.length === 0;
  const loadingTenants = tenantsInfiniteQuery.isPending && tenants.length === 0;
  const isFetchingNextPage = tenantsInfiniteQuery.isFetchingNextPage;
  const loading = loadingProperties || loadingTenants;
  const fetchError = tenantsInfiniteQuery.error?.message || propertiesQuery.error?.message || '';
  const refetchProperties = propertiesQuery.refetch;
  const refetchTenants = tenantsInfiniteQuery.refetch;
  const tenantManagementRefetchers = useMemo(
    () => [refetchProperties, refetchTenants],
    [refetchProperties, refetchTenants],
  );
  const tenantListRefetchers = useMemo(() => [refetchTenants], [refetchTenants]);

  useLandlordFocusRefetch({ refetchers: tenantManagementRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    enabled: Boolean(selectedPropertyId),
    setRefreshing,
    refetchers: tenantManagementRefetchers,
  });

  const stats = useMemo(() => {
    return {
      total: tenants.length,
      active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
      paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid' && !t.has_overdue_invoices).length,
      pending: tenants.filter(t => (t.latestBooking?.payment_status === 'unpaid' || !t.latestBooking) && !t.has_overdue_invoices).length,
      overdue: tenants.filter(t => t.has_overdue_invoices || t.latestBooking?.payment_status === 'overdue').length
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const fullName = (tenant.full_name || `${tenant.first_name} ${tenant.last_name}`).toLowerCase();
      const matchesSearch = !query
        || fullName.includes(query)
        || (tenant.email || '').toLowerCase().includes(query)
        || (tenant.room?.room_number || '').toString().includes(query);

      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'active') return tenant.tenantProfile?.status === 'active';
      if (filter === 'paid') return tenant.latestBooking?.payment_status === 'paid' && !tenant.has_overdue_invoices;
      if (filter === 'unpaid') return tenant.latestBooking?.payment_status === 'unpaid' && !tenant.has_overdue_invoices;
      if (filter === 'overdue') return tenant.has_overdue_invoices || tenant.latestBooking?.payment_status === 'overdue';
      return true;
    });
  }, [tenants, searchQuery, filter]);

  useEffect(() => {
    setOpenActionsTenantId(null);
  }, [searchQuery, filter, selectedPropertyId]);

  useEffect(() => {
    if (properties.length > 0) {
      setSelectedPropertyId((prev) => {
        if (!prev) return normalizeId(properties[0].id);
        return prev;
      });
    }
  }, [properties]);

  const getTenantActionError = (errorOrMessage, fallbackMessage) =>
    normalizeActionError(errorOrMessage, fallbackMessage);

  const validateOptionalDate = (rawValue, fieldLabel) => {
    const normalized = String(rawValue || '').trim();
    if (!normalized) {
      return { value: undefined, date: null };
    }
    const parsed = parseIsoDateInput(normalized);
    if (!parsed) {
      return { error: `${fieldLabel} must be a valid date.` };
    }
    return { value: normalized, date: parsed };
  };

  const validateAssignmentDates = (moveInRaw, endRaw) => {
    const moveIn = validateOptionalDate(moveInRaw, 'Move-in date');
    if (moveIn.error) {
      showWarning('Invalid move-in date', moveIn.error);
      return null;
    }
    const endDate = validateOptionalDate(endRaw, 'Contract end date');
    if (endDate.error) {
      showWarning('Invalid end date', endDate.error);
      return null;
    }
    const today = getTodayDateOnly();
    if (moveIn.date && moveIn.date < today) {
      showWarning('Invalid move-in date', 'Move-in date cannot be in the past.');
      return null;
    }
    const effectiveMoveIn = moveIn.date || today;
    if (endDate.date && endDate.date <= effectiveMoveIn) {
      showWarning('Invalid date range', 'Contract end date must be after move-in date.');
      return null;
    }
    return { moveIn, endDate };
  };

  const handleCreateMoveInDateChange = (_event, selectedDate) => {
    setShowCreateMoveInPicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const moveInValue = formatDateForApi(selectedDateOnly);
    setCreateTenantData((current) => {
      const currentEndDate = parseIsoDateInput(current.end_date);
      const nextEndDate = currentEndDate && currentEndDate <= selectedDateOnly
        ? ''
        : current.end_date;
      return {
        ...current,
        move_in_date: moveInValue,
        end_date: nextEndDate,
      };
    });
  };

  const handleCreateEndDateChange = (_event, selectedDate) => {
    setShowCreateEndDatePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    setCreateTenantData((current) => ({
      ...current,
      end_date: formatDateForApi(selectedDateOnly),
    }));
  };

  const handleAssignMoveInDateChange = (_event, selectedDate) => {
    setShowAssignMoveInPicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const moveInValue = formatDateForApi(selectedDateOnly);
    setAssignData((current) => {
      const currentEndDate = parseIsoDateInput(current.end_date);
      const nextEndDate = currentEndDate && currentEndDate <= selectedDateOnly
        ? ''
        : current.end_date;
      return {
        ...current,
        move_in_date: moveInValue,
        end_date: nextEndDate,
      };
    });
  };

  const handleAssignEndDateChange = (_event, selectedDate) => {
    setShowAssignEndDatePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    setAssignData((current) => ({
      ...current,
      end_date: formatDateForApi(selectedDateOnly),
    }));
  };

  const handleTransferInitiate = async (tenant) => {
    const propertyId = tenant.room?.property_id || selectedPropertyId;
    if (!propertyId) {
      showError('Transfer unavailable', 'Tenant has no assigned property.');
      return;
    }
    setTransferringTenant(tenant);
    setTransferData({ new_room_id: '', reason: '', damage_charge: '', damage_description: '' });
    setAvailableRooms([]);
    setTransferVisible(true);
    setLoadingRoomsForTransfer(true);
    try {
      const response = await PropertyService.getRoomsByProperty(propertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load rooms');
      }
      const currentRoomId = normalizeId(tenant.room?.id);
      const rooms = (response.data || []).filter((room) => (
        isRoomBookable(room) && normalizeId(room.id) !== currentRoomId
      ));
      setAvailableRooms(rooms);
    } catch (transferError) {
      showError('Error', getTenantActionError(transferError, 'Unable to load available rooms.'));
    } finally {
      setLoadingRoomsForTransfer(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferringTenant) return;
    if (!transferData.new_room_id || !transferData.reason.trim()) {
      showWarning('Required fields', 'Please select a room and provide a reason.');
      return;
    }
    if (Number(transferData.damage_charge || 0) > 0 && !transferData.damage_description.trim()) {
      showWarning('Required fields', 'Please add a damage charge description.');
      return;
    }
    setIsTransferring(true);
    try {
      const payload = {
        new_room_id: transferData.new_room_id,
        reason: transferData.reason.trim(),
        damage_charge: transferData.damage_charge ? Number(transferData.damage_charge) : undefined,
        damage_description: transferData.damage_description.trim() || undefined
      };
      const response = await PropertyService.transferTenantRoom(transferringTenant.id, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to transfer room.');
      }
      setTransferVisible(false);
      setTransferringTenant(null);
      setActionError('');
      await refetchLandlordQueries(tenantListRefetchers);
      showSuccess('Success', 'Room transfer completed successfully.');
    } catch (transferError) {
      const message = getTenantActionError(transferError, 'Unable to transfer tenant right now.');
      setActionError(message);
      showError('Error', message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAssignInitiate = async (tenant) => {
    if (tenant.room) {
      showWarning('Already assigned', 'This tenant already has a room. Use Transfer instead.');
      return;
    }
    if (!selectedPropertyId) {
      showError('Property required', 'Please select a property first.');
      return;
    }
    setAssigningTenant(tenant);
    setAssignData({ room_id: '', move_in_date: '', end_date: '', notes: '' });
    setShowAssignMoveInPicker(false);
    setShowAssignEndDatePicker(false);
    setAvailableRoomsForAssign([]);
    setAssignVisible(true);
    setLoadingRoomsForAssign(true);
    try {
      const response = await PropertyService.getRoomsByProperty(selectedPropertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load rooms');
      }
      const rooms = (response.data || []).filter((room) => isRoomBookable(room));
      setAvailableRoomsForAssign(rooms);
    } catch (assignError) {
      showError('Error', getTenantActionError(assignError, 'Unable to load available rooms.'));
    } finally {
      setLoadingRoomsForAssign(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assigningTenant) return;
    if (!assignData.room_id) {
      showWarning('Required fields', 'Please select a room.');
      return;
    }
    const validatedDates = validateAssignmentDates(assignData.move_in_date, assignData.end_date);
    if (!validatedDates) return;
    setIsAssigning(true);
    try {
      const payload = {
        room_id: Number(assignData.room_id),
        move_in_date: validatedDates.moveIn.value,
        end_date: validatedDates.endDate.value,
        notes: assignData.notes.trim() || undefined
      };
      const response = await PropertyService.assignTenantToRoom(assigningTenant.id, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to assign room.');
      }
      setAssignVisible(false);
      setShowAssignMoveInPicker(false);
      setShowAssignEndDatePicker(false);
      setAssigningTenant(null);
      setActionError('');
      await refetchLandlordQueries(tenantListRefetchers);
      showSuccess('Success', 'Room assignment completed successfully.');
    } catch (assignError) {
      const message = getTenantActionError(assignError, 'Unable to assign this tenant right now.');
      setActionError(message);
      showError('Error', message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateTenantInitiate = async () => {
    setOpenActionsTenantId(null);
    if (!selectedPropertyId) {
      showError('Property required', 'Please select a property before adding a tenant.');
      return;
    }
    setCreateTenantData({
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      room_id: '',
      move_in_date: '',
      end_date: '',
      notes: '',
    });
    setAvailableRoomsForCreate([]);
    setCreateTenantVisible(true);
    setLoadingRoomsForCreate(true);
    try {
      const response = await PropertyService.getRoomsByProperty(selectedPropertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load available rooms.');
      }
      const rooms = (response.data || []).filter((room) => isRoomBookable(room));
      setAvailableRoomsForCreate(rooms);
    } catch (createInitError) {
      showError('Error', getTenantActionError(createInitError, 'Unable to load available rooms.'));
    } finally {
      setLoadingRoomsForCreate(false);
    }
  };

  const handleCreateTenantSubmit = async () => {
    const firstName = createTenantData.first_name.trim();
    const lastName = createTenantData.last_name.trim();
    const email = createTenantData.email.trim();
    const phone = createTenantData.phone.trim();
    const password = createTenantData.password;
    const confirmPassword = createTenantData.confirm_password;
    if (!firstName || !lastName || !email) {
      showWarning('Required fields', 'First name, last name, and email are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showWarning('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      showWarning('Invalid password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showWarning('Password mismatch', 'Password and confirm password do not match.');
      return;
    }
    if (!createTenantData.room_id) {
      showWarning('Required fields', 'Please select a room for immediate assignment.');
      return;
    }
    const validatedDates = validateAssignmentDates(createTenantData.move_in_date, createTenantData.end_date);
    if (!validatedDates) return;
    setIsCreatingTenant(true);
    try {
      const createPayload = {
        first_name: firstName,
        middle_name: createTenantData.middle_name.trim() || undefined,
        last_name: lastName,
        email,
        phone: phone || undefined,
        password,
        room_id: Number(createTenantData.room_id),
        move_in_date: validatedDates.moveIn.value,
        end_date: validatedDates.endDate.value,
        notes: createTenantData.notes.trim() || undefined,
      };
      const createResponse = await PropertyService.createTenant(createPayload);
      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to add tenant.');
      }
      setCreateTenantVisible(false);
      setActionError('');
      await refetchLandlordQueries(tenantListRefetchers);
      showSuccess('Success', 'Tenant added and assigned successfully.');
    } catch (createError) {
      const message = getTenantActionError(createError, 'Unable to add tenant right now.');
      setActionError(message);
      showError('Error', message);
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleUnassignInitiate = (tenant) => {
    if (!tenant.room) {
      showWarning('Not assigned', 'This tenant does not have an assigned room.');
      return;
    }
    setUnassigningTenant(tenant);
    setUnassignVisible(true);
  };

  const handleUnassignConfirm = async () => {
    if (!unassigningTenant) return;
    setIsUnassigning(true);
    try {
      const response = await PropertyService.unassignTenantFromRoom(unassigningTenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to unassign tenant.');
      }
      setUnassignVisible(false);
      setUnassigningTenant(null);
      setActionError('');
      await refetchLandlordQueries(tenantListRefetchers);
      showSuccess('Success', 'Tenant unassigned successfully.');
    } catch (unassignError) {
      const message = getTenantActionError(unassignError, 'Unable to unassign this tenant right now.');
      setActionError(message);
      showError('Error', message);
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleLifecycleAction = (tenant) => {
    setLifecycleTenant(tenant);
    setLifecycleVisible(true);
  };

  const handleApproveReservation = async (tenant) => {
    const bookingId = tenant.latestBooking?.id;
    if (!bookingId) return;
    try {
      const response = await BookingService.approveReservation(bookingId);
      if (response.success) {
        showSuccess('Success', 'Reservation approved successfully.');
        await refetchLandlordQueries(tenantListRefetchers);
      } else {
        showError('Error', response.error || 'Failed to approve reservation.');
      }
    } catch (_error) {
      showError('Error', 'An unexpected error occurred.');
    }
  };

  const handleCheckIn = async (tenant) => {
    const bookingId = tenant.latestBooking?.id;
    if (!bookingId) return;
    try {
      const response = await BookingService.checkIn(bookingId);
      if (response.success) {
        showSuccess('Success', 'Tenant checked in successfully. First invoice generated.');
        await refetchLandlordQueries(tenantListRefetchers);
      } else {
        showError('Error', response.error || 'Failed to check in tenant.');
      }
    } catch (_error) {
      showError('Error', 'An unexpected error occurred.');
    }
  };

  const openTenantLogs = (tenant) => {
    navigation.navigate('TenantLogs', {
      tenantId: tenant.id,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
    });
  };

  const handleGenerateClaimCode = async (tenant) => {
    try {
      const response = await PropertyService.generateTenantClaimCode(tenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate claim code.');
      }
      const payload = response.data || {};
      const code = payload.claim_code || 'N/A';
      const expiresAt = payload.expires_at
        ? new Date(payload.expires_at).toLocaleString()
        : 'Not available';
      setClaimCodePayload({
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        code,
        expiresAt,
      });
      setClaimCodeModalVisible(true);
    } catch (error) {
      showError('Error', getTenantActionError(error, 'Failed to generate claim code.'));
    }
  };

  const handleShareClaimCode = async () => {
    if (!claimCodePayload) return;
    try {
      const message = `Your claim code for ${claimCodePayload.tenantName} is: ${claimCodePayload.code}. It expires on ${claimCodePayload.expiresAt}.`;
      await Share.share({ message });
    } catch (_error) {
      showError('Error', 'Failed to share claim code.');
    }
  };

  const renderTenantCard = ({ item }) => {
    const paymentStatus = item.latestBooking?.payment_status || 'unpaid';
    const payment = PAYMENT_BADGES[paymentStatus] || PAYMENT_BADGES.unpaid;
    const initials = (item.first_name?.[0] || '') + (item.last_name?.[0] || '');
    const currentRoom = item.room || (item.roomAssignments && item.roomAssignments.length > 0 ? item.roomAssignments[0] : null);
    const monthlyRent = resolveTenantMonthlyRent(item, currentRoom);
    const hasPendingEviction = Boolean(item.pending_eviction);
    const isActionMenuOpen = openActionsTenantId === item.id;

    return (
      <View
        style={[
          styles.tenantCard,
          isTablet
            ? {
              width: tenantCardWidth,
              maxWidth: tenantCardMaxWidth,
              marginHorizontal: 0,
              alignSelf: 'center',
            }
            : null,
        ]}
      >
        <View style={styles.tenantMenuAnchor}>
          <TouchableOpacity
            style={[styles.moreActionsTrigger, isActionMenuOpen ? styles.moreActionsTriggerActive : null]}
            onPress={() => setOpenActionsTenantId((current) => (current === item.id ? null : item.id))}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {isActionMenuOpen && (
            <View style={styles.moreActionsMenu}>
              <TouchableOpacity
                style={styles.moreActionItem}
                onPress={() => {
                  setOpenActionsTenantId(null);
                  setDetailTenant(item);
                  setDetailVisible(true);
                }}
              >
                <Ionicons name="eye-outline" size={16} color="#475569" />
                <Text style={styles.moreActionLabel}>View Profile</Text>
              </TouchableOpacity>

              {canManageTenants && (
                <TouchableOpacity
                  style={styles.moreActionItem}
                  onPress={() => {
                    setOpenActionsTenantId(null);
                    handleGenerateClaimCode(item);
                  }}
                >
                  <Ionicons name="key-outline" size={16} color="#4338CA" />
                  <Text style={styles.moreActionLabel}>Generate Claim Code</Text>
                </TouchableOpacity>
              )}

              {canManageTenants && (
                <TouchableOpacity
                  style={[styles.moreActionItem, (currentRoom || hasPendingEviction) ? styles.moreActionItemDisabled : null]}
                  onPress={() => {
                    setOpenActionsTenantId(null);
                    handleAssignInitiate(item);
                  }}
                  disabled={!!currentRoom || hasPendingEviction}
                >
                  <Ionicons name="person-add-outline" size={16} color="#16a34a" />
                  <Text style={styles.moreActionLabel}>Assign Room</Text>
                </TouchableOpacity>
              )}

              {canManageTenants && (
                <TouchableOpacity
                  style={[styles.moreActionItem, (!currentRoom || hasPendingEviction) ? styles.moreActionItemDisabled : null]}
                  onPress={() => {
                    setOpenActionsTenantId(null);
                    handleUnassignInitiate(item);
                  }}
                  disabled={!currentRoom || hasPendingEviction}
                >
                  <Ionicons name="person-outline" size={16} color="#B45309" />
                  <Text style={styles.moreActionLabel}>Unassign Room</Text>
                </TouchableOpacity>
              )}

              {canManageTenants && (
                <TouchableOpacity
                  style={styles.moreActionItem}
                  onPress={() => {
                    setOpenActionsTenantId(null);
                    handleLifecycleAction(item);
                  }}
                >
                  <Ionicons name="refresh-circle-outline" size={16} color="#4338CA" />
                  <Text style={styles.moreActionLabel}>Manage Lifecycle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.tenantTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials || 'TN'}</Text>
          </View>
          <View style={styles.tenantIdentity}>
            <Text style={styles.tenantName} numberOfLines={1}>{item.first_name} {item.last_name}</Text>
            <Text style={styles.tenantEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.roomRow}>
              <Ionicons name="bed-outline" size={16} color="#16a34a" />
              <Text style={styles.roomText} numberOfLines={1}>
                {currentRoom ? `Room ${currentRoom.room_number}` : 'No room assigned'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Monthly Rent</Text>
            <Text style={styles.metaValue}>
              {monthlyRent.amount !== null ? formatCurrency(monthlyRent.amount) : '—'}
              {monthlyRent.estimated ? ' (est.)' : ''}
            </Text>
          </View>
          <View style={styles.metaStatusColumn}>
            <Text style={styles.metaLabel}>Status</Text>
            <View style={[styles.paymentBadge, { backgroundColor: payment.bg }]}>
              <Text style={[styles.paymentText, { color: payment.color }]}>{payment.label}</Text>
            </View>
          </View>
        </View>

        {hasPendingEviction && (
          <Text style={[styles.helperText, { marginTop: 8, color: '#B91C1C' }]}>
            Eviction scheduled for {new Date(item.pending_eviction.scheduled_for).toLocaleString()}
          </Text>
        )}

        <View style={styles.cardActions}>
          <View
            style={[
              styles.primaryActionsRow,
              isTablet
                ? {
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start',
                  gap: 10,
                }
                : null,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                styles.primaryActionBtn,
                isTablet ? { flex: 0, minWidth: 152, paddingHorizontal: 14 } : null,
              ]}
              onPress={() => {
                setOpenActionsTenantId(null);
                openTenantLogs(item);
              }}
            >
              <Ionicons name="receipt-outline" size={16} color="#475569" />
              <Text style={styles.secondaryBtnText} numberOfLines={1}>Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                styles.primaryActionBtn,
                isTablet ? { flex: 0, minWidth: 152, paddingHorizontal: 14 } : null,
              ]}
              onPress={() => {
                setOpenActionsTenantId(null);
                navigation.navigate('Messages', { startConversation: true, tenant: item, propertyId: selectedPropertyId });
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText} numberOfLines={1}>Chat</Text>
            </TouchableOpacity>

            {canApproveBookings && item.latestBooking?.status === 'pending_reservation' && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.primaryActionBtn,
                  { backgroundColor: '#4338CA' },
                  isTablet ? { flex: 0, minWidth: 152, paddingHorizontal: 14 } : null,
                ]}
                onPress={() => handleApproveReservation(item)}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Approve</Text>
              </TouchableOpacity>
            )}

            {canApproveBookings && item.latestBooking?.status === 'reserved' && item.latestBooking?.payment_status === 'paid' && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.primaryActionBtn,
                  { backgroundColor: '#059669' },
                  isTablet ? { flex: 0, minWidth: 152, paddingHorizontal: 14 } : null,
                ]}
                onPress={() => handleCheckIn(item)}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Check-in</Text>
              </TouchableOpacity>
            )}

            {canManageTenants && (
              <TouchableOpacity
                style={[
                  styles.warningBtn,
                  styles.primaryActionBtn,
                  isTablet ? { flex: 0, minWidth: 152, paddingHorizontal: 14 } : null,
                  (!currentRoom || hasPendingEviction) ? styles.actionDisabledBtn : null,
                ]}
                onPress={() => {
                  setOpenActionsTenantId(null);
                  handleTransferInitiate(item);
                }}
                disabled={!currentRoom || hasPendingEviction}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" />
                <Text style={styles.warningBtnText} numberOfLines={1}>Transfer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const detailMonthlyRent = detailTenant
    ? resolveTenantMonthlyRent(detailTenant, detailTenant.room)
    : { amount: null, estimated: false };

  if (loading && !refreshing && tenants.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#16a34a " />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.emptyTitle}>Loading tenant data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a " />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant Management</Text>
        <View style={styles.headerActions}>
          {canAddTenants && (
            <TouchableOpacity style={styles.iconButton} onPress={handleCreateTenantInitiate}>
              <Ionicons name="person-add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTenantCard}
        ListHeaderComponent={(
          <View
            style={
              isTablet
                ? {
                  width: Math.min(isLargeTablet ? 1080 : 960, screenWidth - 16),
                  alignSelf: 'center',
                }
                : null
            }
          >
            {(fetchError || actionError) ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
                  backgroundColor: theme.isDark ? 'rgba(127,29,29,0.32)' : '#FEF2F2',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="alert-circle-outline" size={18} color={theme.isDark ? '#FCA5A5' : '#B91C1C'} />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: '500',
                    color: theme.isDark ? '#FCA5A5' : '#B91C1C',
                  }}
                >
                  {actionError || fetchError}
                </Text>
                <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      marginLeft: 10,
                      color: theme.isDark ? '#FCA5A5' : '#B91C1C',
                    }}
                  >
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {properties.length > 1 ? (
              <View style={styles.propertySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyScroll}>
                  {properties.map((p) => {
                    const isActive = normalizeId(p.id) === selectedPropertyId;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.propertyChip, isActive && styles.propertyChipActive]}
                        onPress={() => setSelectedPropertyId(normalizeId(p.id))}
                      >
                        <Text style={[styles.propertyChipTitle, isActive && styles.propertyChipTitleActive]}>{p.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsRow}>
              <View style={[styles.statCard, { width: statCardWidth }]}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{stats.total}</Text></View>
              <View style={[styles.statCard, { width: statCardWidth }]}><Text style={[styles.statLabel, { color: '#16a34a' }]}>Active</Text><Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.active}</Text></View>
              <View style={[styles.statCard, { width: statCardWidth }]}><Text style={[styles.statLabel, { color: '#2563EB' }]}>Paid</Text><Text style={[styles.statValue, { color: '#2563EB' }]}>{stats.paid}</Text></View>
              <View style={[styles.statCard, { width: statCardWidth }]}><Text style={[styles.statLabel, { color: '#D97706' }]}>Pending</Text><Text style={[styles.statValue, { color: '#D97706' }]}>{stats.pending}</Text></View>
              <View style={[styles.statCard, { width: statCardWidth }]}><Text style={[styles.statLabel, { color: '#DC2626' }]}>Overdue</Text><Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.overdue}</Text></View>
            </ScrollView>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#94A3B8" />
              <TextInput style={styles.searchInput} placeholder="Search by name, room or email..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)}>
                  <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          isTablet ? { alignItems: 'center' } : null,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />}
        onEndReached={() => {
          if (tenantsInfiniteQuery.hasNextPage && !isFetchingNextPage) {
            tenantsInfiniteQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() => (
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        )}
        ListEmptyComponent={loadingTenants ? <ActivityIndicator style={styles.loadingIndicator} color="#16a34a" /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No tenants found</Text></View>}
      />

      <Modal
        visible={claimCodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimCodeModalVisible(false)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.actionModalCard}>
            <Text style={styles.actionModalTitle}>Claim code generated</Text>
            <Text style={styles.actionModalSubtitle}>
              Share this code with {claimCodePayload.tenantName || 'the tenant'}. They should use Claim Existing Account on the auth screen.
            </Text>

            <Text style={styles.actionFieldLabel}>Claim Code</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                backgroundColor: theme.colors.backgroundSecondary,
                paddingVertical: 12,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text
                selectable
                style={{
                  color: theme.colors.text,
                  fontSize: 28,
                  fontWeight: '800',
                  letterSpacing: 6,
                }}
              >
                {claimCodePayload.code || '--------'}
              </Text>
              <Text style={{ marginTop: 6, color: theme.colors.textSecondary, fontSize: 12 }}>
                Press and hold code to copy
              </Text>
            </View>

            <Text style={[styles.actionFieldLabel, { marginTop: 0 }]}>Expires</Text>
            <Text style={{ color: theme.colors.text, marginBottom: 8 }}>{claimCodePayload.expiresAt || 'Not available'}</Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setClaimCodeModalVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSuccessBtn} onPress={handleShareClaimCode}>
                <Text style={styles.modalConfirmText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={createTenantVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCreateTenantVisible(false);
          setShowCreateMoveInPicker(false);
          setShowCreateEndDatePicker(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlayContainer}
        >
          <View style={[styles.actionModalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.actionModalTitle}>Add Tenant</Text>
              <Text style={styles.actionModalSubtitle}>Create a tenant account and assign them to a room in one step.</Text>

              <Text style={styles.actionFieldLabel}>First Name *</Text>
              <TextInput
                value={createTenantData.first_name}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, first_name: value }))}
                placeholder="Juan"
                style={styles.actionInput}
              />

              <Text style={styles.actionFieldLabel}>Middle Name</Text>
              <TextInput
                value={createTenantData.middle_name}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, middle_name: value }))}
                placeholder="Santos"
                style={styles.actionInput}
              />

              <Text style={styles.actionFieldLabel}>Last Name *</Text>
              <TextInput
                value={createTenantData.last_name}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, last_name: value }))}
                placeholder="Dela Cruz"
                style={styles.actionInput}
              />

              <Text style={styles.actionFieldLabel}>Email *</Text>
              <TextInput
                value={createTenantData.email}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, email: value }))}
                placeholder="tenant@example.com"
                style={styles.actionInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.actionFieldLabel}>Phone</Text>
              <TextInput
                value={createTenantData.phone}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, phone: value }))}
                placeholder="09XXXXXXXXX"
                style={styles.actionInput}
                keyboardType="phone-pad"
              />

              <Text style={styles.actionFieldLabel}>Password *</Text>
              <TextInput
                value={createTenantData.password}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, password: value }))}
                placeholder="Minimum 8 characters"
                style={styles.actionInput}
                secureTextEntry
              />

              <Text style={styles.actionFieldLabel}>Confirm Password *</Text>
              <TextInput
                value={createTenantData.confirm_password}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, confirm_password: value }))}
                placeholder="Retype password"
                style={styles.actionInput}
                secureTextEntry
              />

              <Text style={styles.actionFieldLabel}>Room Assignment *</Text>
              <View style={[styles.roomsPicker, { maxHeight: 200 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {loadingRoomsForCreate && <ActivityIndicator color="#16a34a" style={styles.modalLoader} />}
                  {!loadingRoomsForCreate && availableRoomsForCreate.length === 0 && (
                    <Text style={styles.helperText}>No available rooms found.</Text>
                  )}
                  {availableRoomsForCreate.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.roomOption,
                        normalizeId(createTenantData.room_id) === normalizeId(room.id) && styles.roomOptionActive
                      ]}
                      onPress={() => setCreateTenantData((current) => ({ ...current, room_id: room.id }))}
                    >
                      <Text style={styles.roomOptionTitle}>Room {room.room_number}</Text>
                      <Text style={styles.roomOptionMeta}>{room.type_label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.actionFieldLabel}>Move-in Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowCreateMoveInPicker(true)}
              >
                <Text
                  style={[
                    styles.dateInputValue,
                    !createTenantData.move_in_date && styles.dateInputPlaceholder,
                  ]}
                >
                  {createTenantData.move_in_date
                    ? formatDateForDisplay(createTenantData.move_in_date)
                    : 'Use today by default'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {createTenantData.move_in_date ? (
                <TouchableOpacity
                  onPress={() => setCreateTenantData((current) => ({ ...current, move_in_date: '' }))}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              {showCreateMoveInPicker && (
                <DateTimePicker
                  value={parseIsoDateInput(createTenantData.move_in_date) || getTodayDateOnly()}
                  mode="date"
                  display="default"
                  onChange={handleCreateMoveInDateChange}
                  minimumDate={getTodayDateOnly()}
                />
              )}

              <Text style={styles.actionFieldLabel}>Contract End Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowCreateEndDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateInputValue,
                    !createTenantData.end_date && styles.dateInputPlaceholder,
                  ]}
                >
                  {createTenantData.end_date
                    ? formatDateForDisplay(createTenantData.end_date)
                    : 'Default: 6 months'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {createTenantData.end_date ? (
                <TouchableOpacity
                  onPress={() => setCreateTenantData((current) => ({ ...current, end_date: '' }))}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              {showCreateEndDatePicker && (
                <DateTimePicker
                  value={
                    parseIsoDateInput(createTenantData.end_date)
                    || addDays(parseIsoDateInput(createTenantData.move_in_date) || getTodayDateOnly(), 1)
                  }
                  mode="date"
                  display="default"
                  onChange={handleCreateEndDateChange}
                  minimumDate={addDays(parseIsoDateInput(createTenantData.move_in_date) || getTodayDateOnly(), 1)}
                />
              )}

              <Text style={styles.actionFieldLabel}>Notes</Text>
              <TextInput
                value={createTenantData.notes}
                onChangeText={(value) => setCreateTenantData((current) => ({ ...current, notes: value }))}
                placeholder="Optional assignment notes"
                style={styles.actionTextArea}
                multiline
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setCreateTenantVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSuccessBtn, (isCreatingTenant || availableRoomsForCreate.length === 0) && styles.modalDisabledBtn]}
                  onPress={handleCreateTenantSubmit}
                  disabled={isCreatingTenant || availableRoomsForCreate.length === 0}
                >
                  <Text style={styles.modalConfirmText}>{isCreatingTenant ? 'Adding...' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={transferVisible} transparent animationType="fade" onRequestClose={() => setTransferVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlayContainer}
        >
          <View style={[styles.actionModalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.actionModalTitle}>Transfer Room</Text>
              <Text style={styles.actionModalSubtitle}>
                {transferringTenant
                  ? `Transfer ${transferringTenant.first_name} ${transferringTenant.last_name} from Room ${transferringTenant.room?.room_number || 'N/A'}.`
                  : 'Select a tenant to transfer.'}
              </Text>

              <Text style={styles.actionFieldLabel}>New Room *</Text>
              <View style={[styles.roomsPicker, { maxHeight: 200 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {loadingRoomsForTransfer && <ActivityIndicator color="#f59e0b" style={styles.modalLoader} />}
                  {!loadingRoomsForTransfer && availableRooms.length === 0 && (
                    <Text style={styles.helperText}>No available rooms found.</Text>
                  )}
                  {availableRooms.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.roomOption,
                        normalizeId(transferData.new_room_id) === normalizeId(room.id) && styles.roomOptionActive
                      ]}
                      onPress={() => setTransferData((current) => ({ ...current, new_room_id: room.id }))}
                    >
                      <Text style={styles.roomOptionTitle}>Room {room.room_number}</Text>
                      <Text style={styles.roomOptionMeta}>{room.type_label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.actionFieldLabel}>Reason *</Text>
              <TextInput
                value={transferData.reason}
                onChangeText={(value) => setTransferData((current) => ({ ...current, reason: value }))}
                placeholder="Reason for transfer"
                style={styles.actionTextArea}
                multiline
              />

              <Text style={styles.actionFieldLabel}>Damage Charge (optional)</Text>
              <TextInput
                value={transferData.damage_charge}
                onChangeText={(value) => setTransferData((current) => ({ ...current, damage_charge: value }))}
                placeholder="0.00"
                style={styles.actionInput}
                keyboardType="numeric"
              />

              {Number(transferData.damage_charge || 0) > 0 && (
                <>
                  <Text style={styles.actionFieldLabel}>Damage Description *</Text>
                  <TextInput
                    value={transferData.damage_description}
                    onChangeText={(value) => setTransferData((current) => ({ ...current, damage_description: value }))}
                    placeholder="Describe the charge"
                    style={styles.actionInput}
                  />
                </>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTransferVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (isTransferring || availableRooms.length === 0) && styles.modalDisabledBtn]}
                  onPress={handleTransferSubmit}
                  disabled={isTransferring || availableRooms.length === 0}
                >
                  <Text style={styles.modalConfirmText}>{isTransferring ? 'Transferring...' : 'Transfer'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={assignVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAssignVisible(false);
          setShowAssignMoveInPicker(false);
          setShowAssignEndDatePicker(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlayContainer}
        >
          <View style={[styles.actionModalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.actionModalTitle}>Assign Room</Text>
              <Text style={styles.actionModalSubtitle}>
                {assigningTenant
                  ? `Assign ${assigningTenant.first_name} ${assigningTenant.last_name} to a room.`
                  : 'Select a tenant to assign.'}
              </Text>

              <Text style={styles.actionFieldLabel}>Room *</Text>
              <View style={[styles.roomsPicker, { maxHeight: 200 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {loadingRoomsForAssign && <ActivityIndicator color="#16a34a" style={styles.modalLoader} />}
                  {!loadingRoomsForAssign && availableRoomsForAssign.length === 0 && (
                    <Text style={styles.helperText}>No available rooms found.</Text>
                  )}
                  {availableRoomsForAssign.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.roomOption,
                        normalizeId(assignData.room_id) === normalizeId(room.id) && styles.roomOptionActive
                      ]}
                      onPress={() => setAssignData((current) => ({ ...current, room_id: room.id }))}
                    >
                      <Text style={styles.roomOptionTitle}>Room {room.room_number}</Text>
                      <Text style={styles.roomOptionMeta}>{room.type_label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.actionFieldLabel}>Move-in Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowAssignMoveInPicker(true)}
              >
                <Text
                  style={[
                    styles.dateInputValue,
                    !assignData.move_in_date && styles.dateInputPlaceholder,
                  ]}
                >
                  {assignData.move_in_date
                    ? formatDateForDisplay(assignData.move_in_date)
                    : 'Use today'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {assignData.move_in_date ? (
                <TouchableOpacity
                  onPress={() => setAssignData((current) => ({ ...current, move_in_date: '' }))}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              {showAssignMoveInPicker && (
                <DateTimePicker
                  value={parseIsoDateInput(assignData.move_in_date) || getTodayDateOnly()}
                  mode="date"
                  display="default"
                  onChange={handleAssignMoveInDateChange}
                  minimumDate={getTodayDateOnly()}
                />
              )}

              <Text style={styles.actionFieldLabel}>End Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowAssignEndDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateInputValue,
                    !assignData.end_date && styles.dateInputPlaceholder,
                  ]}
                >
                  {assignData.end_date
                    ? formatDateForDisplay(assignData.end_date)
                    : 'Default: 6 months'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {assignData.end_date ? (
                <TouchableOpacity
                  onPress={() => setAssignData((current) => ({ ...current, end_date: '' }))}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              {showAssignEndDatePicker && (
                <DateTimePicker
                  value={
                    parseIsoDateInput(assignData.end_date)
                    || addDays(parseIsoDateInput(assignData.move_in_date) || getTodayDateOnly(), 1)
                  }
                  mode="date"
                  display="default"
                  onChange={handleAssignEndDateChange}
                  minimumDate={addDays(parseIsoDateInput(assignData.move_in_date) || getTodayDateOnly(), 1)}
                />
              )}

              <Text style={styles.actionFieldLabel}>Notes</Text>
              <TextInput
                value={assignData.notes}
                onChangeText={(value) => setAssignData((current) => ({ ...current, notes: value }))}
                placeholder="Optional assignment notes"
                style={styles.actionTextArea}
                multiline
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAssignVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSuccessBtn, (isAssigning || availableRoomsForAssign.length === 0) && styles.modalDisabledBtn]}
                  onPress={handleAssignSubmit}
                  disabled={isAssigning || availableRoomsForAssign.length === 0}
                >
                  <Text style={styles.modalConfirmText}>{isAssigning ? 'Assigning...' : 'Assign'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={unassignVisible} transparent animationType="fade" onRequestClose={() => setUnassignVisible(false)}>
        <View style={styles.overlayContainer}>
          <View style={styles.actionModalCard}>
            <Text style={[styles.actionModalTitle, { color: '#B45309' }]}>Confirm Unassign</Text>
            <Text style={styles.actionModalSubtitle}>
              {unassigningTenant
                ? `Unassign ${unassigningTenant.first_name} ${unassigningTenant.last_name} from their room?`
                : 'Select a tenant to unassign.'}
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUnassignVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isUnassigning && styles.modalDisabledBtn]}
                onPress={handleUnassignConfirm}
                disabled={isUnassigning}
              >
                <Text style={styles.modalConfirmText}>{isUnassigning ? 'Unassigning...' : 'Unassign'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tenant Profile</Text>
            <View style={styles.modalHeaderView} />
          </View>
          {detailTenant && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailHero}>
                <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{detailTenant.first_name?.[0]}{detailTenant.last_name?.[0]}</Text></View>
                <Text style={styles.detailName}>{detailTenant.first_name} {detailTenant.last_name}</Text>
                <Text style={styles.detailEmail}>{detailTenant.email}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Assignment</Text>
                {detailTenant.room ? (
                  <View style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Room {detailTenant.room.room_number}</Text>
                    <Text style={styles.assignmentMeta}>{detailTenant.room.type_label}</Text>
                    <Text style={[styles.assignmentMeta, { color: '#16a34a', fontWeight: '700' }]}>
                      {detailMonthlyRent.amount !== null ? formatCurrency(detailMonthlyRent.amount) : '—'} / month
                    </Text>
                  </View>
                ) : <Text style={styles.helperText}>No room assigned</Text>}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                {detailTenant.tenantProfile?.emergency_contact_name ? (
                  <View style={styles.detailList}>
                    <Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_name}</Text>
                    <Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_phone}</Text>
                  </View>
                ) : <Text style={styles.helperText}>Not provided</Text>}
              </View>

              <TouchableOpacity
                style={styles.profileScroll}
                onPress={() => { setDetailVisible(false); navigation.navigate('TenantLogs', { tenantId: detailTenant.id, tenantName: `${detailTenant.first_name} ${detailTenant.last_name}` }); }}
              >
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                <Text style={styles.profileBtn}>View Payment Logs</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <TenantLifecycleModal
        visible={lifecycleVisible}
        onClose={() => {
          setLifecycleVisible(false);
          setLifecycleTenant(null);
        }}
        tenant={lifecycleTenant}
        onSuccess={() => {
          refetchLandlordQueries(tenantListRefetchers);
        }}
      />
    </SafeAreaView>
  );
}
