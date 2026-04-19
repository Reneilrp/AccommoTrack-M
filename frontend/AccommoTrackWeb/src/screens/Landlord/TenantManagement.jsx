import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, RefreshCw, X, Loader2, ArrowLeft, Shuffle, Users, UserCheck, CreditCard, Clock, AlertOctagon, UserX, UserPlus, UserMinus, LayoutGrid, LayoutList, MoreVertical, MessageSquare, ShieldAlert, AlertCircle, Mail, Phone, Home, Calendar, ChevronDown, CheckCircle, KeyRound, Copy } from 'lucide-react';
import PriceRow from '../../components/Shared/PriceRow';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import TenantCard from './TenantCard';
import TenantLifecycleModal from '../../components/Settings/landlord/TenantLifecycleModal';
import { Skeleton, SkeletonTableRow } from '../../components/Shared/Skeleton';
import { showSuccess, showError } from '../../utils/toast';
import landlordService from '../../services/landlordService';
import bookingService from '../../services/bookingService';
import roomService from '../../services/roomService';
import { normalizeActionError } from '../../utils/error';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateString = (dateString, days) => {
  const seed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(seed.getTime())) return dateString;
  seed.setDate(seed.getDate() + days);
  const year = seed.getFullYear();
  const month = String(seed.getMonth() + 1).padStart(2, '0');
  const day = String(seed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getEndDateMin = (moveInDate) => {
  const normalizedMoveIn = String(moveInDate || '').trim();
  const baseDate = normalizedMoveIn || getTodayDateString();
  return addDaysToDateString(baseDate, 1);
};

const validateAssignmentDateRange = (moveInDate, endDate) => {
  const moveIn = String(moveInDate || '').trim();
  const end = String(endDate || '').trim();
  const today = getTodayDateString();

  if (moveIn && moveIn < today) {
    return { valid: false, message: 'Move-in date cannot be in the past.' };
  }

  const effectiveMoveIn = moveIn || today;
  if (end && end <= effectiveMoveIn) {
    return { valid: false, message: 'Contract end date must be after move-in date.' };
  }

  return {
    valid: true,
    move_in_date: moveIn || undefined,
    end_date: end || undefined,
  };
};

export default function TenantManagement() {
  const { uiState, updateData } = useUIState();
  const location = useLocation();
  const navigate = useNavigate();

  const cachedProps = uiState.data?.accessible_properties || cacheManager.get('accessible_properties');

  // Synchronously determine initial property ID
  const getInitialPropertyId = () => {
    const params = new URLSearchParams(location.search || '');
    const fromUrl = params.get('property');
    if (fromUrl) return Number(fromUrl);
    if (cachedProps && cachedProps.length > 0) return cachedProps[0].id;
    return '';
  };

  const [__properties, setProperties] = useState(cachedProps || []);
  const [selectedPropertyId, setSelectedPropertyId] = useState(getInitialPropertyId());

  const tenantCacheKey = selectedPropertyId ? `tenants_property_${selectedPropertyId}` : null;
  const cachedTenants = tenantCacheKey ? (uiState.data?.[tenantCacheKey] || cacheManager.get(tenantCacheKey)) : null;

  const [tenants, setTenants] = useState(cachedTenants || []);
  const [transferringTenant, setTransferringTenant] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoomsForTransfer, setLoadingRoomsForTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({ new_room_id: '', reason: '', transfer_reason: 'Tenant Request', transfer_fee: '', damage_charge: '', damage_description: '' });
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableRoomsForAssign, setAvailableRoomsForAssign] = useState([]);
  const [loadingRoomsForAssign, setLoadingRoomsForAssign] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignData, setAssignData] = useState({ room_id: '', move_in_date: '', end_date: '', notes: '' });
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
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
    sex: '',
    room_id: '',
    move_in_date: '',
    end_date: '',
    notes: '',
  });
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassigningTenant, setUnassigningTenant] = useState(null);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [__error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(selectedPropertyId && !cachedTenants);

  // Tenant action modals
  const [showEvictModal, setShowEvictModal] = useState(false);
  const [evictingTenant, setEvictingTenant] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tenantViewMode') || 'card');
  const [claimCodePayload, setClaimCodePayload] = useState(null);
  const [isGeneratingClaimCode, setIsGeneratingClaimCode] = useState(false);
  const [lifecycleTenant, setLifecycleTenant] = useState(null);

  const getTenantActionError = useCallback(
    (errorOrMessage, fallbackMessage) => normalizeActionError(errorOrMessage, fallbackMessage),
    [],
  );

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('tenantViewMode', mode);
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

  const isEvictionDue = (tenant) => {
    const scheduledFor = tenant?.pending_eviction?.scheduled_for;
    if (!scheduledFor) return false;
    return new Date(scheduledFor).getTime() <= Date.now();
  };

  const formatEvictionFinalizeAt = (tenant) => {
    const scheduledFor = tenant?.pending_eviction?.scheduled_for;
    if (!scheduledFor) return null;

    const dueDate = new Date(scheduledFor);
    if (Number.isNaN(dueDate.getTime())) return null;

    return dueDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isFromProperty = Boolean(new URLSearchParams(location.search).get('property'));

  const handleBackClick = () => {
    if (isFromProperty && selectedPropertyId) {
      navigate(`/properties/${selectedPropertyId}`);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!cachedProps) setLoading(true);
        const response = await landlordService.getAccessibleProperties();
        const data = response.success
          ? (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []))
          : [];
        setProperties(data);
        updateData('accessible_properties', data);
        cacheManager.set('accessible_properties', data);

        if (!selectedPropertyId && data && data.length) {
          setSelectedPropertyId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!selectedPropertyId) setLoading(false);
      }
    };
    load();
  }, [cachedProps, selectedPropertyId, updateData]);

  const loadTenants = useCallback(async () => {
    if (!selectedPropertyId) return;
    const currentCacheKey = `tenants_property_${selectedPropertyId}`;
    const currentCached = uiState.data?.[currentCacheKey] || cacheManager.get(currentCacheKey);

    try {
      if (!currentCached) setLoading(true);
      setError('');

      const response = await landlordService.getTenants({ property_id: selectedPropertyId, t: Date.now() });
      const data = response.success
        ? (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []))
        : [];

      const list = Array.isArray(data) ? data : [];
      setTenants(list);

      updateData(currentCacheKey, list);
      cacheManager.set(currentCacheKey, list);
      return list;
    } catch (err) {
      console.error('Failed to load tenants:', err);
      if (!currentCached) {
        setTenants([]);
        setError(getTenantActionError(err, 'Unable to load tenants right now.'));
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, updateData, getTenantActionError, uiState.data]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    loadTenants();
  }, [selectedPropertyId, loadTenants]);

  const handleTransferInitiate = async (tenant) => {
    const defaultFee = tenant?.room?.property?.transfer_fee ?? 0;
    setTransferringTenant(tenant);
    setTransferData({
      new_room_id: '',
      reason: '',
      transfer_reason: 'Tenant Request',
      transfer_fee: defaultFee,
      damage_charge: '',
      damage_description: ''
    });
    setShowTransferModal(true);
    setLoadingRoomsForTransfer(true);
    try {
      const propertyId = tenant.room?.property_id;
      if (!propertyId) throw new Error("Tenant has no assigned property");

      const response = await roomService.getRoomsByProperty(propertyId);
      const list = response.success
        ? (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []))
        : [];
      // Filter for available rooms, excluding current one
      setAvailableRooms(list.filter(r => isRoomBookable(r) && r.id !== tenant.room?.id));
    } catch (err) {
      setError(getTenantActionError(err, 'Unable to load available rooms for transfer.'));
    } finally {
      setLoadingRoomsForTransfer(false);
    }
  };

  const handleEvictInitiate = (tenant) => {
    setEvictingTenant(tenant);
    setShowEvictModal(true);
  };

  const handleLifecycleOpen = (tenant) => {
    setLifecycleTenant(tenant);
  };

  const handleLifecycleClose = () => {
    setLifecycleTenant(null);
  };

  const handleEvictionFinalize = async (tenant) => {
    const due = isEvictionDue(tenant);
    if (!due) {
      const availableAt = formatEvictionFinalizeAt(tenant);
      showError(
        availableAt
          ? `Eviction can be finalized on ${availableAt}.`
          : 'Eviction is still in grace period and cannot be finalized yet.',
      );
      return;
    }

    const confirmed = window.confirm(`Finalize eviction for ${tenant.first_name} ${tenant.last_name}?`);
    if (!confirmed) return;

    try {
      const response = await landlordService.finalizeEviction(tenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to finalize eviction.');
      }
      showSuccess(`Eviction finalized for ${tenant.first_name}.`);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to finalize eviction right now.'));
    }
  };

  const handleEvictionCancel = async (tenant) => {
    const confirmed = window.confirm(`Cancel pending eviction schedule for ${tenant.first_name} ${tenant.last_name}?`);
    if (!confirmed) return;

    try {
      const response = await landlordService.cancelEviction(tenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel eviction schedule.');
      }
      showSuccess(`Eviction schedule cancelled for ${tenant.first_name}.`);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to cancel eviction schedule right now.'));
    }
  };

  const handleEvictionUndo = async (tenant) => {
    const note = window.prompt('Optional note for undoing this eviction:', '') || '';

    try {
      const response = await landlordService.undoEviction(tenant.id, {
        reason: note.trim() || undefined,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to undo eviction.');
      }
      showSuccess(`Eviction undone for ${tenant.first_name}.`);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to undo eviction right now.'));
    }
  };

  const handleApproveReservation = async (tenant) => {
    const bookingId = tenant.latestBooking?.id;
    if (!bookingId) return;
    try {
      if (window.confirm(`Approve reservation for ${tenant.first_name}?`)) {
        const response = await bookingService.approveReservation(bookingId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to approve reservation.');
        }
        showSuccess(`Reservation approved for ${tenant.first_name}.`);
        loadTenants();
      }
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to approve reservation right now.'));
    }
  };

  const handleCheckInTenant = async (tenant) => {
    const bookingId = tenant.latestBooking?.id;
    if (!bookingId) return;
    try {
      if (window.confirm(`Check in ${tenant.first_name} and generate first invoice?`)) {
        const response = await bookingService.checkIn(bookingId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to check in tenant.');
        }
        showSuccess(`${tenant.first_name} checked in successfully.`);
        loadTenants();
      }
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to check in tenant right now.'));
    }
  };

  const handleAssignInitiate = async (tenant) => {
    const propertyId = tenant.room?.property_id || selectedPropertyId;
    if (!propertyId) {
      showError('Select a property before assigning a room');
      return;
    }

    setAssigningTenant(tenant);
    setAssignData({ room_id: '', move_in_date: '', end_date: '', notes: '' });
    setAvailableRoomsForAssign([]);
    setShowAssignModal(true);
    setLoadingRoomsForAssign(true);
    try {
      const response = await roomService.getRoomsByProperty(propertyId);
      const list = response.success
        ? (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []))
        : [];
      setAvailableRoomsForAssign(list.filter(r => isRoomBookable(r)));
    } catch {
      setError('Failed to load available rooms for assignment');
    } finally {
      setLoadingRoomsForAssign(false);
    }
  };

  const handleCreateTenantInitiate = async () => {
    if (!selectedPropertyId) {
      showError('Select a property before adding a tenant');
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
      sex: '',
      room_id: '',
      move_in_date: '',
      end_date: '',
      notes: '',
    });
    setAvailableRoomsForCreate([]);
    setShowCreateTenantModal(true);
    setLoadingRoomsForCreate(true);

    try {
      const response = await roomService.getRoomsByProperty(selectedPropertyId);
      const list = response.success
        ? (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []))
        : [];
      setAvailableRoomsForCreate(list.filter(r => isRoomBookable(r)));
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to load available rooms for tenant assignment.'));
    } finally {
      setLoadingRoomsForCreate(false);
    }
  };

  const handleCreateTenantSubmit = async (e) => {
    e.preventDefault();

    const firstName = createTenantData.first_name.trim();
    const lastName = createTenantData.last_name.trim();
    const email = createTenantData.email.trim();
    const phone = createTenantData.phone.trim();
    const password = createTenantData.password;
    const confirmPassword = createTenantData.confirm_password;

    if (!firstName || !lastName || !email) {
      showError("Tenant's First Name, Last Name, and Email are required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match. Please re-type.');
      return;
    }

    if (!createTenantData.room_id) {
      showError('Please assign a Room or save as floating tenant.');
      return;
    }

    const validatedDates = validateAssignmentDateRange(
      createTenantData.move_in_date,
      createTenantData.end_date,
    );
    if (!validatedDates.valid) {
      showError(validatedDates.message);
      return;
    }

    setIsCreatingTenant(true);

    try {
      const createPayload = {
        first_name: firstName,
        middle_name: createTenantData.middle_name.trim() || undefined,
        last_name: lastName,
        email,
        phone: phone || undefined,
        password,
        sex: createTenantData.sex || undefined,
        room_id: Number(createTenantData.room_id),
        move_in_date: validatedDates.move_in_date,
        end_date: validatedDates.end_date,
        notes: createTenantData.notes.trim() || undefined,
      };

      const createResponse = await landlordService.createTenant(createPayload);
      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to add tenant.');
      }

      showSuccess('Tenant added and assigned successfully.');
      setShowCreateTenantModal(false);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to register tenant. Please check your connection and try again.'));
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigningTenant) return;
    if (!assignData.room_id) {
      showError('Please select a room');
      return;
    }

    const validatedDates = validateAssignmentDateRange(assignData.move_in_date, assignData.end_date);
    if (!validatedDates.valid) {
      showError(validatedDates.message);
      return;
    }

    setIsAssigning(true);
    try {
      const payload = { room_id: Number(assignData.room_id) };
      if (validatedDates.move_in_date) payload.move_in_date = validatedDates.move_in_date;
      if (validatedDates.end_date) payload.end_date = validatedDates.end_date;
      if (assignData.notes?.trim()) payload.notes = assignData.notes.trim();

      const response = await landlordService.assignRoom(assigningTenant.id, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to assign room');
      }
      showSuccess('Room assignment completed successfully');
      setShowAssignModal(false);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to assign room right now.'));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignInitiate = (tenant) => {
    setUnassigningTenant(tenant);
    setShowUnassignModal(true);
  };

  const handleUnassignConfirm = async () => {
    if (!unassigningTenant) return;

    setIsUnassigning(true);
    try {
      const response = await landlordService.unassignRoom(unassigningTenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to unassign tenant');
      }
      showSuccess('Tenant unassigned successfully');
      setShowUnassignModal(false);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to unassign tenant right now.'));
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.new_room_id || !transferData.reason) {
      showError("Please select a room and provide a reason");
      return;
    }

    setIsTransferring(true);
    try {
      const response = await landlordService.transferRoom(transferringTenant.id, transferData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to transfer room');
      }
      showSuccess("Room transfer completed successfully");
      setShowTransferModal(false);
      loadTenants();
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to transfer tenant right now.'));
    } finally {
      setIsTransferring(false);
    }
  };

  const handleGenerateClaimCode = async (tenant) => {
    if (!tenant?.id) {
      showError('Invalid tenant selection.');
      return;
    }

    setIsGeneratingClaimCode(true);
    try {
      const response = await landlordService.generateTenantClaimCode(tenant.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate claim code.');
      }

      const payload = response.data || {};
      setClaimCodePayload({
        tenantName: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim(),
        claimCode: payload.claim_code || '',
        expiresAt: payload.expires_at || null,
      });
      showSuccess('Claim code generated successfully.');
    } catch (err) {
      showError(getTenantActionError(err, 'Unable to generate claim code right now.'));
    } finally {
      setIsGeneratingClaimCode(false);
    }
  };

  const handleCopyClaimCode = async () => {
    if (!claimCodePayload?.claimCode) return;

    try {
      await navigator.clipboard.writeText(claimCodePayload.claimCode);
      showSuccess('Claim code copied.');
    } catch {
      showError('Unable to copy claim code automatically.');
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const email = (tenant.email || '').toLowerCase();
    const roomNumber = tenant.room?.room_number || '';
    const q = (searchQuery || '').toLowerCase();

    const matchesSearch = !q || fullName.includes(q) || email.includes(q) || roomNumber.includes(q);
    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'active') return tenant.tenantProfile?.status === 'active';
    if (filter === 'paid') return tenant.latestBooking?.payment_status === 'paid';
    if (filter === 'unpaid') return tenant.latestBooking?.payment_status === 'unpaid';
    if (filter === 'overdue') return tenant.latestBooking?.payment_status === 'overdue';

    return true;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      {__error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <X className="w-5 h-5 cursor-pointer" onClick={() => setError('')} />
          <span className="font-bold uppercase tracking-wide text-xs">{__error}</span>
        </div>
      )}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-300 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button onClick={handleBackClick} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" aria-label="Back to property">
              <ArrowLeft className="w-5 h-5 text-green-600 dark:text-green-500" />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} icon={Users} />
          <StatCard label="Active" value={stats.active} icon={UserCheck} color="green" />
          <StatCard label="Paid" value={stats.paid} icon={CreditCard} color="blue" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="yellow" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertOctagon} color="red" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-[28rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500" />
              <input type="text" placeholder="Search by name, room or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
              {['all', 'active', 'paid', 'unpaid', 'overdue'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${filter === f ? "bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
                <button onClick={() => handleSetViewMode('card')} title="Card view" className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-gray-600 shadow text-green-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => handleSetViewMode('list')} title="List view" className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-green-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleCreateTenantInitiate}
                disabled={loading || !selectedPropertyId}
                className="px-3 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-500/20"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-bold hidden sm:inline">Add Tenant</span>
              </button>

              <button onClick={loadTenants} disabled={loading} title="Refresh" className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No tenants found</p>
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-500">{searchQuery ? 'Try adjusting your search query.' : "Tenants will appear here once they're assigned."}</p>
              </div>
            ) : (
              filteredTenants.map(tenant => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onTransfer={handleTransferInitiate}
                  onAssign={handleAssignInitiate}
                  onUnassign={handleUnassignInitiate}
                  onLifecycle={handleLifecycleOpen}
                  onGenerateClaimCode={handleGenerateClaimCode}
                  onApproveReservation={handleApproveReservation}
                  onCheckIn={handleCheckInTenant}
                  canTransfer={true}
                />
              ))
            )}
          </div>
        ) : (
          <TenantListView
            tenants={filteredTenants}
            onTransfer={handleTransferInitiate}
            onAssign={handleAssignInitiate}
            onUnassign={handleUnassignInitiate}
            onEvict={handleEvictInitiate}
            onEvictionFinalize={handleEvictionFinalize}
            onEvictionCancel={handleEvictionCancel}
            onEvictionUndo={handleEvictionUndo}
            onGenerateClaimCode={handleGenerateClaimCode}
            onApproveReservation={handleApproveReservation}
            onCheckIn={handleCheckInTenant}
            canTransfer={true}
            searchQuery={searchQuery}
            isEvictionDue={isEvictionDue}
            formatEvictionFinalizeAt={formatEvictionFinalizeAt}
          />
        )}
      </div>

      {showCreateTenantModal && (
        <CreateTenantModal
          data={createTenantData}
          setData={setCreateTenantData}
          availableRooms={availableRoomsForCreate}
          loading={loadingRoomsForCreate}
          isSubmitting={isCreatingTenant}
          onClose={() => setShowCreateTenantModal(false)}
          onSubmit={handleCreateTenantSubmit}
        />
      )}

      {showAssignModal && (
        <AssignModal
          tenant={assigningTenant}
          availableRooms={availableRoomsForAssign}
          loading={loadingRoomsForAssign}
          isSubmitting={isAssigning}
          data={assignData}
          setData={setAssignData}
          onClose={() => setShowAssignModal(false)}
          onSubmit={handleAssignSubmit}
        />
      )}
      {showTransferModal && <TransferModal tenant={transferringTenant} availableRooms={availableRooms} loading={loadingRoomsForTransfer} isSubmitting={isTransferring} data={transferData} setData={setTransferData} onClose={() => setShowTransferModal(false)} onSubmit={handleTransferSubmit} />}
      {showUnassignModal && (
        <UnassignModal
          tenant={unassigningTenant}
          isSubmitting={isUnassigning}
          onClose={() => setShowUnassignModal(false)}
          onConfirm={handleUnassignConfirm}
        />
      )}
      {showEvictModal && <EvictionModal tenant={evictingTenant} onClose={() => setShowEvictModal(false)} onConfirm={loadTenants} />}
      {lifecycleTenant && (
        <TenantLifecycleModal
          tenant={lifecycleTenant}
          onClose={handleLifecycleClose}
          onScheduled={loadTenants}
          onCancelled={loadTenants}
          onFinalized={loadTenants}
          onUndone={loadTenants}
        />
      )}
      {claimCodePayload && (
        <ClaimCodeModal
          data={claimCodePayload}
          isGenerating={isGeneratingClaimCode}
          onCopy={handleCopyClaimCode}
          onClose={() => setClaimCodePayload(null)}
        />
      )}
    </div>
  );
}

// Helper components for modals and stats
const StatCard = ({ label, value, icon: Icon, color = 'gray' }) => {
  const colors = {
    gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-600 dark:text-gray-400', border: 'bg-gray-400 dark:bg-gray-600' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'bg-green-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'bg-blue-500' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'bg-yellow-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'bg-red-500' },
  };
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold ${color === 'gray' ? 'text-gray-900 dark:text-white' : colors[color].text}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 ${colors[color].bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors[color].text}`} />
        </div>
      </div>
    </div>
  );
};

const ClaimCodeModal = ({ data, isGenerating, onCopy, onClose }) => {
  const expiryLabel = data?.expiresAt
    ? new Date(data.expiresAt).toLocaleString()
    : 'Not available';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            Claim Existing Account
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Share this code with <strong>{data?.tenantName || 'the tenant'}</strong>. The tenant should use the small <strong>Claim Existing Account</strong> entry on the auth screen.
          </p>

          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-900/20 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-2">Claim Code</p>
            <p className="text-3xl tracking-[0.25em] font-extrabold text-indigo-700 dark:text-indigo-200">{data?.claimCode || '--------'}</p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">Expires: {expiryLabel}</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCopy}
              disabled={isGenerating}
              className="flex-1 px-4 py-3 rounded-lg border border-indigo-300 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy Code
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateTenantModal = ({ data, setData, availableRooms, loading, isSubmitting, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-500" />Add Tenant</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
          New tenants are added with immediate room assignment so they appear in tenant management right away.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">First Name *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.first_name}
              onChange={e => setData({ ...data, first_name: e.target.value })}
              placeholder="Juan"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Middle Name</label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.middle_name}
              onChange={e => setData({ ...data, middle_name: e.target.value })}
              placeholder="Santos"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Last Name *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.last_name}
              onChange={e => setData({ ...data, last_name: e.target.value })}
              placeholder="Dela Cruz"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email *</label>
            <input
              required
              type="email"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.email}
              onChange={e => setData({ ...data, email: e.target.value })}
              placeholder="tenant@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Phone</label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.phone}
              onChange={e => setData({ ...data, phone: e.target.value })}
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Password *</label>
            <input
              required
              type="password"
              minLength={8}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.password}
              onChange={e => setData({ ...data, password: e.target.value })}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Confirm Password *</label>
            <input
              required
              type="password"
              minLength={8}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.confirm_password}
              onChange={e => setData({ ...data, confirm_password: e.target.value })}
              placeholder="Retype password"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Sex</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.sex}
              onChange={e => setData({ ...data, sex: e.target.value })}
            >
              <option value="">Select sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Room Assignment *</label>
            <select
              required
              disabled={loading}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.room_id}
              onChange={e => setData({ ...data, room_id: e.target.value })}
            >
              <option value="">{loading ? 'Loading rooms...' : 'Select room'}</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} ({room.type_label || 'Room'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {availableRooms.length === 0 && !loading && (
          <p className="text-[11px] text-red-500 font-bold italic">No available rooms in this property. Add or free up a room before creating a tenant.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Move-in Date</label>
            <input
              type="date"
              min={getTodayDateString()}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.move_in_date}
              onChange={e => setData({ ...data, move_in_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contract End Date</label>
            <input
              type="date"
              min={getEndDateMin(data.move_in_date)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.end_date}
              onChange={e => setData({ ...data, end_date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Notes</label>
          <textarea
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none"
            value={data.notes}
            onChange={e => setData({ ...data, notes: e.target.value })}
            placeholder="Optional assignment notes"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting || availableRooms.length === 0} className="flex-1 px-4 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Create & Assign'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const AssignModal = ({ tenant, availableRooms, loading, isSubmitting, data, setData, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-500" />Assign Room</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
          Assigning <strong>{tenant.first_name} {tenant.last_name}</strong> to a room.
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Room *</label>
          <select required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white" value={data.room_id} onChange={e => setData({ ...data, room_id: e.target.value })} disabled={loading}>
            <option value="">{loading ? 'Loading rooms...' : 'Select Room'}</option>
            {availableRooms.map(r => (<option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>))}
          </select>
          {availableRooms.length === 0 && !loading && <p className="text-[10px] text-red-500 mt-2 font-bold italic">No available rooms in this property.</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Move-in Date</label>
            <input
              type="date"
              min={getTodayDateString()}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.move_in_date}
              onChange={e => setData({ ...data, move_in_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contract End Date</label>
            <input
              type="date"
              min={getEndDateMin(data.move_in_date)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
              value={data.end_date}
              onChange={e => setData({ ...data, end_date: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Notes</label>
          <textarea className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Optional assignment notes..." />
        </div>
        <div className="flex gap-4 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting || availableRooms.length === 0} className="flex-1 px-4 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Assigning...</> : 'Assign Room'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const TransferModal = ({ tenant, availableRooms, loading, isSubmitting, data, setData, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shuffle className="w-5 h-5 text-amber-500" />Transfer Room</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          Transferring <strong>{tenant.first_name} {tenant.last_name}</strong> from <strong>Room {tenant.room?.room_number}</strong>.
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">New Room *</label>
          <select required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white" value={data.new_room_id} onChange={e => setData({ ...data, new_room_id: e.target.value })} disabled={loading}>
            <option value="">{loading ? 'Loading rooms...' : 'Select New Room'}</option>
            {availableRooms.map(r => (<option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>))}
          </select>
          {availableRooms.length === 0 && !loading && <p className="text-[10px] text-red-500 mt-2 font-bold italic">No other available rooms in this property.</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Transfer Reason *</label>
          <select
            required
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
            value={data.transfer_reason}
            onChange={(e) => {
              const val = e.target.value;
              const updates = { transfer_reason: val };
              if (val === 'Maintenance Issue') {
                updates.transfer_fee = 0;
              } else if (data.transfer_reason === 'Maintenance Issue' && val !== 'Maintenance Issue') {
                // Revert to original property default if they switch back from maintenance
                updates.transfer_fee = tenant?.room?.property?.transfer_fee ?? 0;
              }
              setData({ ...data, ...updates });
            }}
          >
            <option value="Tenant Request">Tenant Request</option>
            <option value="Room Upgrade">Room Upgrade</option>
            <option value="Maintenance Issue">Maintenance Issue (₱0 Fee)</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Internal Note / Detailed Reason *</label>
          <textarea required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="e.g., Tenant requested a larger room, or specific maintenance details..." />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">Financial Adjustments</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Transfer Fee (₱)</label>
              <input
                type="number"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                value={data.transfer_fee}
                onChange={e => setData({ ...data, transfer_fee: e.target.value })}
                placeholder="0.00"
                min="0"
                disabled={data.transfer_reason === 'Maintenance Issue'}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Damage Charge (₱)</label>
              <input type="number" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white" value={data.damage_charge} onChange={e => setData({ ...data, damage_charge: e.target.value })} placeholder="0.00" min="0" />
            </div>
          </div>
          {parseFloat(data.damage_charge) > 0 && (<div className="animate-in slide-in-from-top-1 mt-3">
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Damage Description *</label>
            <input type="text" required={parseFloat(data.damage_charge) > 0} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white" value={data.damage_description} onChange={e => setData({ ...data, damage_description: e.target.value })} placeholder="e.g., Broken window blind, wall scratches..." />
          </div>)}
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-4 italic text-center">
            * All proration is based on a standard 30-day month calculation.
          </p>
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting || availableRooms.length === 0} className="flex-1 px-4 py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Transferring...</> : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const UnassignModal = ({ tenant, onClose, onConfirm, isSubmitting }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
      <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2"><UserMinus /> Confirm Unassign</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        You are about to remove <strong>{tenant.first_name} {tenant.last_name}</strong> from their current room. This will end their active booking and mark them as inactive.
      </p>
      <div className="flex gap-4 mt-4">
        <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-4 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 px-4 py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unassign'}
        </button>
      </div>
    </div>
  </div>
);

const EvictionModal = ({ tenant, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [effectiveAt, setEffectiveAt] = useState(() => {
    const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    nextDay.setMinutes(0, 0, 0);
    const year = nextDay.getFullYear();
    const month = String(nextDay.getMonth() + 1).padStart(2, '0');
    const day = String(nextDay.getDate()).padStart(2, '0');
    const hours = String(nextDay.getHours()).padStart(2, '0');
    const minutes = String(nextDay.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [isEvicting, setIsEvicting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return showError("Reason for eviction is required.");
    if (!effectiveAt) return showError("Please set an effective date and time.");

    const parsedEffectiveAt = new Date(effectiveAt);
    if (Number.isNaN(parsedEffectiveAt.getTime())) {
      return showError('Invalid effective date/time.');
    }

    setIsEvicting(true);
    try {
      const response = await landlordService.scheduleEviction(tenant.id, {
        reason: reason.trim(),
        effective_at: parsedEffectiveAt.toISOString(),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to schedule eviction.');
      }
      showSuccess(`Eviction scheduled for ${tenant.first_name}.`);
      onConfirm(); // Callback to refresh the tenant list
      onClose();
    } catch (err) {
      showError(err.message || err.response?.data?.message || "Failed to schedule eviction.");
    } finally {
      setIsEvicting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2"><UserX /> Schedule Eviction</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Set a move-out grace period before finalizing eviction for <strong>{tenant.first_name} {tenant.last_name}</strong>. Room booking is locked while eviction is pending.</p>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Effective Date & Time *</label>
        <input
          type="datetime-local"
          value={effectiveAt}
          onChange={(e) => setEffectiveAt(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white"
        />
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for eviction... (required)" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none text-sm" />
        <div className="flex gap-4 mt-4">
          <button onClick={onClose} disabled={isEvicting} className="flex-1 px-4 py-4 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={isEvicting || !reason.trim() || !effectiveAt} className="flex-1 px-4 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isEvicting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Eviction"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── List View ────────────────────────────────────────────────────────────────

const TenantListView = ({
  tenants,
  onTransfer,
  onAssign,
  onUnassign,
  onEvict,
  onEvictionFinalize,
  onEvictionCancel,
  onEvictionUndo,
  onGenerateClaimCode,
  onApproveReservation,
  onCheckIn,
  canTransfer,
  searchQuery,
  isEvictionDue,
  formatEvictionFinalizeAt,
}) => {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [expandedEmergency, setExpandedEmergency] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const handleMenuOpen = (e, tenantId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Use absolute positioning relative to document body
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 192, // 192 = width of dropdown (w-48)
    });
    setOpenMenuId(openMenuId === tenantId ? null : tenantId);
  };

  const isLate = (t) => t.has_overdue_invoices;
  const isExpiring = (t) => {
    if (!t.latestBooking?.end_date) return false;
    const diff = Math.ceil((new Date(t.latestBooking.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  };

  const statusBadge = (status) => {
    const map = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      inactive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    };
    return map[status] || 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No tenants found</p>
        <p className="text-sm mt-2 text-gray-500">{searchQuery ? 'Try adjusting your search query.' : "Tenants will appear here once they're assigned."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Room</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Contract End</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
            {tenants.map((tenant) => {
              const profile = tenant.tenantProfile;
              const late = isLate(tenant);
              const expiring = isExpiring(tenant);
              const isOpen = openMenuId === tenant.id;
              const showEmergency = expandedEmergency === tenant.id;
              const hasPendingEviction = Boolean(tenant.pending_eviction);
              const canUndoEviction = Boolean(tenant.can_undo_eviction);
              const evictionDue = isEvictionDue ? isEvictionDue(tenant) : false;
              const evictionFinalizeAt = formatEvictionFinalizeAt(tenant);

              return (
                <React.Fragment key={tenant.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    {/* Full Name + behavioral badges */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {tenant.first_name} {tenant.last_name}
                          </span>
                          {late && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-red-200 dark:border-red-800">
                              <AlertCircle className="w-2.5 h-2.5" /> Late
                            </span>
                          )}
                          {expiring && !late && (
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-orange-200 dark:border-orange-800">
                              <Clock className="w-2.5 h-2.5" /> Expiring
                            </span>
                          )}
                          {hasPendingEviction && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-red-200 dark:border-red-800">
                              <AlertOctagon className="w-2.5 h-2.5" /> Eviction Scheduled
                            </span>
                          )}
                        </div>
                        {tenant.proxy_origin && (
                          <div>
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-indigo-200 dark:border-indigo-800">
                              Proxy: {tenant.proxy_origin.booking_reference}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[180px]">{tenant.email}</span>
                      </span>
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {tenant.room ? (
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                          <Home className="w-3 h-3 text-gray-400 shrink-0" /> {tenant.room.room_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">None</span>
                      )}
                    </td>

                    {/* Contract End */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`flex items-center gap-1.5 ${expiring ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Calendar className="w-3 h-3 shrink-0" />
                        {tenant.latestBooking?.end_date
                          ? new Date(tenant.latestBooking.end_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusBadge(profile?.status)}`}>
                        {profile?.status || 'Active'}
                      </span>
                    </td>

                    {/* Manage Dropdown */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleMenuOpen(e, tenant.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Manage <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && ReactDOM.createPortal(
                        <div
                          ref={dropdownRef}
                          style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, zIndex: 9999, width: 192 }}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                        >
                          <button
                            onClick={() => { setOpenMenuId(null); navigate('/messages', { state: { startConversation: true, recipient: { id: tenant.id }, property: tenant.room ? { id: tenant.room.property_id } : null } }); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-green-600" /> Message
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); navigate(`/payments?search=${tenant.email}`); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Payments
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); navigate(`/tenants/${tenant.id}`); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-gray-500" /> View Logs
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onGenerateClaimCode?.(tenant); }}
                            disabled={!canTransfer}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Generate Claim Code
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                          {tenant.latestBooking?.status === 'pending_reservation' && (
                            <button
                              onClick={() => { setOpenMenuId(null); onApproveReservation?.(tenant); }}
                              disabled={!canTransfer}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve Reservation
                            </button>
                          )}
                          {tenant.latestBooking?.status === 'reserved' && (
                            <button
                              onClick={() => { setOpenMenuId(null); onCheckIn?.(tenant); }}
                              disabled={!canTransfer}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Check In Tenant
                            </button>
                          )}
                          <button
                            onClick={() => { setOpenMenuId(null); onAssign?.(tenant); }}
                            disabled={!canTransfer || !!tenant.room || hasPendingEviction}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Assign Room
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onTransfer?.(tenant); }}
                            disabled={!canTransfer || !tenant.room || hasPendingEviction}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-amber-500" /> Transfer Room
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onUnassign?.(tenant); }}
                            disabled={!canTransfer || !tenant.room || hasPendingEviction}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-amber-600" /> Unassign Room
                          </button>
                          {hasPendingEviction && (
                            <>
                              <button
                                onClick={() => { setOpenMenuId(null); onEvictionFinalize?.(tenant); }}
                                disabled={!canTransfer || !evictionDue}
                                title={!evictionDue && evictionFinalizeAt ? `Available on ${evictionFinalizeAt}` : undefined}
                                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <UserX className="w-3.5 h-3.5" /> Finalize Eviction
                              </button>
                              {!evictionDue && evictionFinalizeAt && (
                                <p className="px-4 pb-2 text-[10px] text-amber-700 dark:text-amber-300">
                                  Finalize available on {evictionFinalizeAt}
                                </p>
                              )}
                              <button
                                onClick={() => { setOpenMenuId(null); onEvictionCancel?.(tenant); }}
                                disabled={!canTransfer}
                                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Cancel Eviction Schedule
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { setOpenMenuId(null); setExpandedEmergency(showEmergency ? null : tenant.id); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-500" /> Emergency Contact
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                          {!hasPendingEviction && (
                            <button
                              onClick={() => { setOpenMenuId(null); onEvict?.(tenant); }}
                              disabled={!canTransfer}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                            >
                              <UserX className="w-3.5 h-3.5" /> Schedule Eviction
                            </button>
                          )}
                          {canUndoEviction && !hasPendingEviction && (
                            <button
                              onClick={() => { setOpenMenuId(null); onEvictionUndo?.(tenant); }}
                              disabled={!canTransfer}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Undo Eviction
                            </button>
                          )}
                        </div>,
                        document.body
                      )}
                    </td>
                  </tr>

                  {/* Emergency Contact Expandable Row */}
                  {showEmergency && profile && (
                    <tr key={`${tenant.id}-emergency`} className="bg-purple-50 dark:bg-purple-900/10">
                      <td colSpan={6} className="px-8 py-3">
                        <div className="flex items-center gap-6 text-xs text-gray-700 dark:text-gray-300">
                          <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400 uppercase text-[10px]">
                            <ShieldAlert className="w-3 h-3" /> Emergency Contact
                          </span>
                          <span className="font-semibold">{profile.emergency_contact_name || '—'}</span>
                          <span className="flex items-center gap-1 text-gray-500"><Phone className="w-3 h-3" />{profile.emergency_contact_phone || '—'}</span>
                          {profile.emergency_contact_relationship && (
                            <span className="text-gray-400 italic">({profile.emergency_contact_relationship})</span>
                          )}
                          <button onClick={() => setExpandedEmergency(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

