import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Shield,
  Trash2,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Calendar,
  Key,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import {
  CARETAKER_PERMISSION_FIELDS,
  MODULE_GROUPS,
  LANDLORD_LEVEL_PERMISSION_KEYS,
  LANDLORD_LEVEL_PERMISSION_MESSAGES,
  humanizePermissions,
  countActivePermissions,
} from '../../../utils/caretakerPermissions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isLandlordLevelPermission = (key) => LANDLORD_LEVEL_PERMISSION_KEYS.has(key);

const TOTAL_PERMISSIONS = CARETAKER_PERMISSION_FIELDS.length;

function PermissionGroupCard({ group, permissions, onToggleAll, onToggleSingle, expandedGroups, setExpandedGroups }) {
  const groupFields = CARETAKER_PERMISSION_FIELDS.filter((f) => group.keys.includes(f.key));
  const activeCount = groupFields.filter((f) => !!permissions[f.key]).length;
  const allGroupOn = groupFields.every((f) => !!permissions[f.key]);
  const isModuleActive = activeCount > 0;
  const isExpanded = expandedGroups.includes(group.title);

  const toggleExpand = () =>
    setExpandedGroups((prev) =>
      prev.includes(group.title) ? prev.filter((t) => t !== group.title) : [...prev, group.title],
    );

  return (
    <div
      className={`rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
        isModuleActive
          ? 'border-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header — expand/collapse only */}
      <button
        onClick={toggleExpand}
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
          isModuleActive ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-white dark:bg-gray-800'
        }`}
      >
        <div
          className={`p-1.5 rounded-lg ${
            isModuleActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          <span className={isModuleActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
            {group.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-bold text-sm ${
              isModuleActive ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}
          >
            {group.title}
          </p>
          <p
            className={`text-[10px] font-semibold ${
              isModuleActive ? 'text-emerald-100' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {activeCount}/{groupFields.length} active
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp
            className={`w-4 h-4 flex-shrink-0 ${isModuleActive ? 'text-white' : 'text-gray-400'}`}
          />
        ) : (
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 ${isModuleActive ? 'text-white' : 'text-gray-400'}`}
          />
        )}
      </button>

      {/* Expanded sub-permissions */}
      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
          {/* Group-level Select All — inside expanded area */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {group.title} permissions
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAll(group.keys, permissions);
              }}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                allGroupOn
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {allGroupOn ? '✕ Deselect group' : '✓ Select group'}
            </button>
          </div>

          {groupFields.map((field, idx) => {
            const isChecked = !!permissions[field.key];
            return (
              <label
                key={field.key}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                  idx < groupFields.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/60' : ''
                } ${
                  isChecked
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="pr-4">
                  <p
                    className={`text-[13px] font-semibold ${
                      isChecked
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {field.label}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {field.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleSingle(field.key)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer flex-shrink-0 rounded"
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepBar({ step }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
      {[
        { num: 1, label: 'Personal Details' },
        { num: 2, label: 'Permissions & Properties' },
      ].map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= s.num
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-bold hidden sm:block ${
                step >= s.num ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < 1 && (
            <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full bg-emerald-500 transition-all duration-500 ${
                  step >= 2 ? 'w-full' : 'w-0'
                }`}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CareTakerAccess({
  caretakers,
  caretakerForm,
  setCaretakerForm,
  caretakerPermissions,
  landlordProperties,
  selectedPropertyIds,
  setSelectedPropertyIds,
  caretakerState,
  handleCreateCaretaker,
  handleRevokeCaretaker,
  fetchCaretakers,
  resetCaretakerPermissions,
  handlePermissionToggle,
}) {
  const [permissionPrompt, setPermissionPrompt] = useState({
    open: false,
    key: null,
    target: 'create',
    isBulk: false,
    keys: [],
  });
  const [showPasswords, setShowPasswords] = useState(false);

  // Unified modal: 'closed' | 'create' | 'edit'
  const [modalMode, setModalMode] = useState('closed');
  const [createStep, setCreateStep] = useState(1);

  const [editFormData, setEditFormData] = useState({
    id: null,
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    password: '',
    password_confirmation: '',
    permissions: {},
    property_ids: [],
  });

  const [passwordResetModal, setPasswordResetModal] = useState({
    show: false,
    caretaker: null,
    loading: false,
    tempPassword: '',
  });
  const [revocationModal, setRevocationModal] = useState({ show: false, caretaker: null, reason: '' });
  const [propertyError, setPropertyError] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);

  const fetchCaretakersRef = useRef(fetchCaretakers);
  const navigate = useNavigate();

  const safeCaretakers = Array.isArray(caretakers) ? caretakers : [];
  const safeProperties = Array.isArray(landlordProperties) ? landlordProperties : [];
  const safeSelectedIds = Array.isArray(selectedPropertyIds) ? selectedPropertyIds : [];
  const safePermissions = caretakerPermissions || {};
  const safeForm = caretakerForm || {
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    date_of_birth: '',
  };
  const safeState = caretakerState || { loading: false, error: '' };

  useEffect(() => {
    fetchCaretakersRef.current = fetchCaretakers;
  }, [fetchCaretakers]);

  useEffect(() => {
    if (typeof fetchCaretakersRef.current === 'function') {
      fetchCaretakersRef.current();
    }
  }, []);

  // ── Permission helpers ──────────────────────────────────────────────────
  const closePermissionPrompt = () =>
    setPermissionPrompt({ open: false, key: null, target: 'create', isBulk: false, keys: [] });

  const requestPermissionPrompt = (key, target) =>
    setPermissionPrompt({ open: true, key, target, isBulk: false, keys: [] });

  const applyBulkPermissions = (keys, value, target) => {
    if (target === 'create') {
      keys.forEach((k) => handlePermissionToggle(k, value));
    } else {
      setEditFormData((prev) => {
        const newPerms = { ...prev.permissions };
        keys.forEach((k) => (newPerms[k] = value));
        return { ...prev, permissions: newPerms };
      });
    }
  };

  const handleGroupToggleAll = (keys, _currentPerms) => {
    const target = modalMode === 'create' ? 'create' : 'edit';
    const allOn = keys.every((k) => !!(modalMode === 'create' ? safePermissions[k] : editFormData.permissions[k]));
    const nextState = !allOn;

    if (nextState === true) {
      const sensitiveKeys = keys.filter(
        (k) => isLandlordLevelPermission(k) && !(modalMode === 'create' ? safePermissions[k] : editFormData.permissions[k]),
      );
      if (sensitiveKeys.length > 0) {
        setPermissionPrompt({ open: true, key: null, target, isBulk: true, keys });
        return;
      }
    }
    applyBulkPermissions(keys, nextState, target);
  };

  const handleGlobalSelectAll = (target, currentState) => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const allSelected = allKeys.every((k) => !!currentState[k]);
    const nextState = !allSelected;

    if (nextState === true) {
      const sensitiveKeys = allKeys.filter(
        (k) => isLandlordLevelPermission(k) && !currentState[k],
      );
      if (sensitiveKeys.length > 0) {
        setPermissionPrompt({ open: true, key: null, target, isBulk: true, keys: allKeys });
        return;
      }
    }
    applyBulkPermissions(allKeys, nextState, target);
  };

  const handleSinglePermissionToggle = (key) => {
    const target = modalMode === 'create' ? 'create' : 'edit';
    const currentPerms = modalMode === 'create' ? safePermissions : editFormData.permissions;
    const isEnabling = !currentPerms[key];

    if (isEnabling && isLandlordLevelPermission(key)) {
      requestPermissionPrompt(key, target);
      return;
    }

    if (target === 'create') {
      if (typeof handlePermissionToggle === 'function') handlePermissionToggle(key);
    } else {
      setEditFormData((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
      }));
    }
  };

  const confirmPermissionGrant = () => {
    if (permissionPrompt.isBulk) {
      applyBulkPermissions(permissionPrompt.keys, true, permissionPrompt.target);
    } else {
      const { key, target } = permissionPrompt;
      if (target === 'create') {
        handlePermissionToggle(key, true);
      } else {
        setEditFormData((prev) => ({
          ...prev,
          permissions: { ...prev.permissions, [key]: true },
        }));
      }
    }
    closePermissionPrompt();
  };

  const promptedPermission = CARETAKER_PERMISSION_FIELDS.find((f) => f.key === permissionPrompt.key);
  const promptedPermissionLabel = promptedPermission?.label || 'this module';
  const promptedPermissionMessage =
    LANDLORD_LEVEL_PERMISSION_MESSAGES[permissionPrompt.key] ||
    'Enabling this grants landlord-level access. Please confirm before proceeding.';

  // ── Validation ──────────────────────────────────────────────────────────
  const validateField = (name, value) => {
    let error = '';
    if (name === 'first_name' || name === 'last_name') {
      if (!value || !value.trim()) error = 'This field is required';
    }
    if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) error = 'Phone must contain only numbers';
      else if (value && value.length < 10) error = 'Phone number is too short';
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) error = 'Please enter a valid email address';
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (typeof setCaretakerForm === 'function') {
      setCaretakerForm((prev) => ({ ...prev, [name]: value }));
    }
    validateField(name, value);
  };

  // ── Create modal ────────────────────────────────────────────────────────
  const resetCreationForm = () => {
    if (setCaretakerForm)
      setCaretakerForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        password: '',
        password_confirmation: '',
      });
    if (resetCaretakerPermissions) resetCaretakerPermissions();
    if (setSelectedPropertyIds) setSelectedPropertyIds([]);
    setPropertyError(false);
    setFieldErrors({
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
    });
  };

  const openCreateModal = () => {
    resetCreationForm();
    setShowPasswords(false);
    setCreateStep(1);
    setExpandedGroups([]);
    setModalMode('create');
  };

  const closeModal = () => {
    setModalMode('closed');
    setShowPasswords(false);
    setCreateStep(1);
    setExpandedGroups([]);
  };

  const handleCreateStepNext = () => {
    const errors = {
      first_name: validateField('first_name', safeForm.first_name),
      last_name: validateField('last_name', safeForm.last_name),
      email: validateField('email', safeForm.email),
      phone: validateField('phone', safeForm.phone),
    };

    if (Object.values(errors).some((err) => err !== '')) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    if (!safeForm.first_name || !safeForm.last_name || !safeForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!safeForm.password) {
      toast.error('Password is required when creating a caretaker');
      return;
    }
    if (safeForm.password !== safeForm.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setCreateStep(2);
  };

  const handleRegister = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    const errors = {
      first_name: validateField('first_name', safeForm.first_name),
      last_name: validateField('last_name', safeForm.last_name),
      email: validateField('email', safeForm.email),
      phone: validateField('phone', safeForm.phone),
    };

    if (Object.values(errors).some((err) => err !== '')) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    if (!safeForm.first_name || !safeForm.last_name || !safeForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!safeForm.password) {
      toast.error('Password is required when creating a caretaker');
      return;
    }
    if (safeProperties.length > 0 && safeSelectedIds.length === 0) {
      toast.error('Please assign a property to the caretaker');
      setPropertyError(true);
      return;
    }
    setPropertyError(false);
    if (safeForm.password && safeForm.password !== safeForm.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await handleCreateCaretaker();
      resetCreationForm();
      setShowPasswords(false);
      setCreateStep(1);
      setModalMode('closed');
      if (typeof fetchCaretakers === 'function') fetchCaretakers();
    } catch {
      // Error handled by parent
    }
  };

  // ── Edit modal ──────────────────────────────────────────────────────────
  const handleEditClick = (c) => {
    setEditFormData({
      id: c.id,
      first_name: c.caretaker.first_name || '',
      middle_name: c.caretaker.middle_name || '',
      last_name: c.caretaker.last_name || '',
      email: c.caretaker.email || '',
      phone: c.caretaker.phone || '',
      date_of_birth: c.caretaker.date_of_birth
        ? new Date(c.caretaker.date_of_birth).toISOString().split('T')[0]
        : '',
      password: '',
      password_confirmation: '',
      permissions: {
        bookings: !!c.permissions.bookings,
        approve_bookings: !!c.permissions.approve_bookings,
        cancel_bookings: !!c.permissions.cancel_bookings,
        manual_bookings: !!c.permissions.manual_bookings,
        manage_add_ons: !!c.permissions.manage_add_ons,
        messages: !!c.permissions.messages,
        tenants: !!c.permissions.tenants,
        add_tenant_manually: !!c.permissions.add_tenant_manually,
        rooms: !!c.permissions.rooms,
        properties: !!c.permissions.properties,
        maintenance: !!c.permissions.maintenance,
        payments: !!c.permissions.payments,
        analytics: !!c.permissions.analytics,
        view_audit_logs: !!c.permissions.view_audit_logs,
      },
      property_ids: (c.assigned_properties || []).map((p) => p.id),
    });
    setExpandedGroups([]);
    setShowPasswords(false);
    setSelectedCaretaker(null);
    setModalMode('edit');
  };

  const handleUpdateSubmit = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    if (!editFormData.first_name || !editFormData.last_name || !editFormData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (editFormData.property_ids.length === 0) {
      toast.error('Please assign at least one property');
      return;
    }
    if (!editFormData.id) {
      toast.error('Invalid caretaker ID');
      return;
    }

    const mappedPermissions = {
      can_view_bookings: !!editFormData.permissions.bookings,
      can_approve_bookings: !!editFormData.permissions.approve_bookings,
      can_cancel_bookings: !!editFormData.permissions.cancel_bookings,
      can_add_manual_bookings: !!editFormData.permissions.manual_bookings,
      can_manage_add_ons: !!editFormData.permissions.manage_add_ons,
      can_view_messages: !!editFormData.permissions.messages,
      can_view_tenants: !!editFormData.permissions.tenants,
      can_add_tenant_manually: !!editFormData.permissions.add_tenant_manually,
      can_view_rooms: !!editFormData.permissions.rooms,
      can_view_properties: !!editFormData.permissions.properties,
      can_manage_maintenance: !!editFormData.permissions.maintenance,
      can_manage_payments: !!editFormData.permissions.payments,
      can_view_analytics: !!editFormData.permissions.analytics,
      can_view_audit_logs: !!editFormData.permissions.view_audit_logs,
    };

    const updateData = {
      first_name: editFormData.first_name,
      middle_name: editFormData.middle_name,
      last_name: editFormData.last_name,
      email: editFormData.email,
      phone: editFormData.phone,
      date_of_birth: editFormData.date_of_birth,
      property_ids: editFormData.property_ids,
      permissions: mappedPermissions,
    };

    if (editFormData.password && editFormData.password.trim() !== '') {
      updateData.password = editFormData.password;
      updateData.password_confirmation = editFormData.password_confirmation;
    }

    try {
      await api.patch(`/landlord/caretakers/${editFormData.id}`, updateData);
      toast.success('Caretaker updated successfully');
      setModalMode('closed');
      fetchCaretakers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update caretaker';
      const errors = err.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0];
        toast.error(`${msg}: ${Array.isArray(firstError) ? firstError[0] : firstError}`);
      } else {
        toast.error(msg);
      }
    }
  };

  // ── Misc actions ────────────────────────────────────────────────────────
  const handleMessageCaretaker = (c) => {
    if (!c?.caretaker?.id) {
      toast.error('Cannot message: Caretaker user ID not found');
      return;
    }
    setSelectedCaretaker(null);
    navigate('/messages', {
      state: {
        startConversation: true,
        recipient_id: c.caretaker.id,
        recipient: {
          id: c.caretaker.id,
          name: `${c.caretaker.first_name} ${c.caretaker.last_name}`,
          role: 'caretaker',
        },
      },
    });
  };

  const handleResetPassword = (c) => {
    setPasswordResetModal({ show: true, caretaker: c, loading: false, tempPassword: '' });
    setSelectedCaretaker(null);
  };

  const confirmResetPassword = async () => {
    const { caretaker } = passwordResetModal;
    setPasswordResetModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/landlord/caretakers/${caretaker.id}/reset-password`);
      setPasswordResetModal((prev) => ({
        ...prev,
        loading: false,
        tempPassword: res.data.temporary_password,
      }));
      toast.success('Password has been reset');
    } catch {
      toast.error('Failed to reset password');
      setPasswordResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revocationModal.reason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }
    try {
      await handleRevokeCaretaker(revocationModal.caretaker.id, revocationModal.reason);
      setRevocationModal({ show: false, caretaker: null, reason: '' });
      setSelectedCaretaker(null);
      toast.success('Access revoked successfully');
    } catch {
      toast.error('Failed to revoke access');
    }
  };

  // Active permissions/props for the current modal mode
  const activePermissions = modalMode === 'create' ? safePermissions : editFormData.permissions;
  const isModalOpen = modalMode !== 'closed';

  // ── Shared permission section (used in both create step-2 and edit) ──────
  const renderPermissionSection = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULE_GROUPS.map((group) => (
          <PermissionGroupCard
            key={group.title}
            group={group}
            permissions={activePermissions}
            onToggleAll={handleGroupToggleAll}
            onToggleSingle={handleSinglePermissionToggle}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
          />
        ))}
      </div>

      {/* Global Select All — below all groups, with warning notice */}
      {(() => {
        const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
        const allSelected = allKeys.every((k) => !!activePermissions[k]);
        const target = modalMode === 'create' ? 'create' : 'edit';
        return (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-snug">
                Selecting all grants full landlord-level access to this caretaker.
              </p>
            </div>
            <button
              onClick={() => handleGlobalSelectAll(target, activePermissions)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                allSelected
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
              }`}
            >
              {allSelected ? '✕ Deselect All' : '✓ Select All'}
            </button>
          </div>
        );
      })()}
    </div>
  );

  const renderPropertySection = (propertyIds, onToggle, hasError) => (
    safeProperties.length > 0 && (
      <div
        className={`space-y-4 p-4 rounded-2xl transition-all duration-300 ${
          hasError
            ? 'bg-red-50 dark:bg-red-900/10 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-800'
            : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              hasError ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
            }`}
          >
            <Building2 className="w-4 h-4" /> Assigned Properties
          </h3>
          {hasError && (
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-3 h-3" /> At least one property required
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {safeProperties.map((property) => {
            const selected = propertyIds.includes(property.id);
            return (
              <label
                key={property.id}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer select-none ${
                  selected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100 dark:shadow-none scale-[1.02]'
                    : hasError
                    ? 'bg-white dark:bg-gray-700 border-red-300 dark:border-red-900/50 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(property.id)}
                  className="hidden"
                />
                <span className="whitespace-nowrap">
                  {property.name || property.title || 'Unnamed Property'}
                </span>
                <Building2
                  className={`w-4 h-4 shrink-0 ${selected ? 'text-emerald-100' : 'text-gray-500'}`}
                />
              </label>
            );
          })}
        </div>
      </div>
    )
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* ── Unified Create / Edit Modal ────────────────────────────────── */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {modalMode === 'create' ? 'Add New Caretaker' : 'Edit Caretaker'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {modalMode === 'create'
                      ? 'Step-by-step setup for personal details, modules, and property assignment.'
                      : 'Update permissions and property assignments for this caretaker.'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Step bar — only for create */}
              {modalMode === 'create' && <StepBar step={createStep} />}

              {/* Scrollable body */}
              <div className="p-6 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6">
                {/* ── STEP 1 / Edit identity form ── */}
                {(modalMode === 'create' ? createStep === 1 : true) && (
                  <>
                    {/* For edit: personal info first */}
                    {modalMode === 'edit' && (
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'First Name', key: 'first_name' },
                            { label: 'Middle Name', key: 'middle_name' },
                            { label: 'Last Name', key: 'last_name' },
                            { label: 'Email Address', key: 'email', type: 'email' },
                            { label: 'Phone (Optional)', key: 'phone' },
                          ].map(({ label, key, type = 'text' }) => (
                            <div key={key} className="space-y-2">
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-2">
                                {label}
                              </label>
                              <input
                                type={type}
                                value={editFormData[key]}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                              />
                            </div>
                          ))}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-2">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={editFormData.date_of_birth}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                              }
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Password change section */}
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl space-y-3">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            Change Password (leave blank to keep current)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { placeholder: 'New password', key: 'password' },
                              { placeholder: 'Confirm new password', key: 'password_confirmation' },
                            ].map(({ placeholder, key }) => (
                              <div key={key} className="relative">
                                <input
                                  type={showPasswords ? 'text' : 'password'}
                                  placeholder={placeholder}
                                  value={editFormData[key]}
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                  }
                                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                  {showPasswords ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Create step 1 — personal info */}
                    {modalMode === 'create' && (
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4" /> Personal Information
                        </h3>

                        {Object.values(fieldErrors).some((err) => err !== '') && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">
                                  Please correct the following:
                                </p>
                                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-0.5">
                                  {Object.entries(fieldErrors).map(
                                    ([key, err]) => err && <li key={key}>{err}</li>,
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'First Name', name: 'first_name', placeholder: 'e.g. John' },
                            { label: 'Middle Name (Optional)', name: 'middle_name', placeholder: 'e.g. Quency' },
                            { label: 'Last Name', name: 'last_name', placeholder: 'e.g. Doe' },
                            { label: 'Email Address', name: 'email', type: 'email', placeholder: 'caretaker@example.com' },
                            { label: 'Phone (Optional)', name: 'phone', placeholder: '09123456789' },
                          ].map(({ label, name, type = 'text', placeholder }) => (
                            <div key={name} className="space-y-2">
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-2">
                                {label}
                              </label>
                              <input
                                name={name}
                                type={type}
                                placeholder={placeholder}
                                value={safeForm[name]}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 transition-all ${
                                  fieldErrors[name]
                                    ? 'border-red-500 ring-red-50'
                                    : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'
                                }`}
                              />
                            </div>
                          ))}

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-2">
                              Date of Birth (Optional)
                            </label>
                            <input
                              name="date_of_birth"
                              type="date"
                              value={safeForm.date_of_birth}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                            />
                          </div>

                          {/* Password fields */}
                          {[
                            { label: 'Account Password', field: 'password' },
                            { label: 'Confirm Password', field: 'password_confirmation' },
                          ].map(({ label, field }) => (
                            <div key={field} className="space-y-2">
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-2">
                                {label}
                              </label>
                              <div className="relative">
                                <input
                                  type={showPasswords ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  value={safeForm[field]}
                                  onChange={(e) =>
                                    setCaretakerForm &&
                                    setCaretakerForm((f) => ({ ...f, [field]: e.target.value }))
                                  }
                                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                  {showPasswords ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* ── STEP 2 / Edit permissions ── */}
                {(modalMode === 'create' ? createStep === 2 : true) && (
                  <>
                    {modalMode === 'create' ? (
                      /* Two-panel layout for create step 2 */
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: permissions */}
                        <div className="lg:col-span-2 space-y-4">
                          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Module Permissions
                          </h3>
                          {renderPermissionSection()}
                        </div>

                        {/* Right: property selector (sticky) */}
                        <div className="lg:col-span-1">
                          <div className="sticky top-0 space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <Building2 className="w-4 h-4" /> Assigned Properties
                            </h3>
                            {renderPropertySection(
                              safeSelectedIds,
                              (id) => {
                                setPropertyError(false);
                                if (typeof setSelectedPropertyIds === 'function') {
                                  setSelectedPropertyIds((ids) =>
                                    ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
                                  );
                                }
                              },
                              propertyError,
                            )}
                            {safeProperties.length === 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                No properties available. You can add properties later.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Edit: two-panel as well */
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Module Permissions
                          </h3>
                          {renderPermissionSection()}
                        </div>
                        <div className="lg:col-span-1">
                          <div className="sticky top-0 space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <Building2 className="w-4 h-4" /> Assigned Properties
                            </h3>
                            {renderPropertySection(
                              editFormData.property_ids,
                              (id) => {
                                const ids = [...editFormData.property_ids];
                                const idx = ids.indexOf(id);
                                if (idx > -1) ids.splice(idx, 1);
                                else ids.push(id);
                                setEditFormData((prev) => ({ ...prev, property_ids: ids }));
                              },
                              editFormData.property_ids.length === 0,
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex gap-4">
                {modalMode === 'create' && createStep === 1 && (
                  <>
                    <button
                      onClick={closeModal}
                      className="flex-1 py-4 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateStepNext}
                      className="flex-[2] py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none"
                    >
                      Next: Permissions & Properties →
                    </button>
                  </>
                )}
                {modalMode === 'create' && createStep === 2 && (
                  <>
                    <button
                      onClick={() => setCreateStep(1)}
                      className="flex-1 py-4 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      className="flex-[2] py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                      onClick={handleRegister}
                      disabled={safeState.loading}
                    >
                      {safeState.loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      {safeState.loading ? 'Creating...' : 'Confirm & Add Caretaker'}
                    </button>
                  </>
                )}
                {modalMode === 'edit' && (
                  <>
                    <button
                      onClick={closeModal}
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateSubmit}
                      className="flex-[2] py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Caretaker List Card ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Caretakers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {safeCaretakers.length} active staff members
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              <Plus className="w-4 h-4" /> Add Caretaker
            </button>
          </div>

          <div className="p-0">
            {safeState.loading && safeCaretakers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
                <p className="font-medium">Fetching team members...</p>
              </div>
            ) : safeCaretakers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                <Users className="w-16 h-16 text-gray-200" />
                <p className="font-medium text-lg">No caretakers assigned yet</p>
                <p className="text-sm max-w-xs">
                  Once you add staff members, they will appear here with their assigned properties.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 dark:bg-gray-700/50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Assigned to</th>
                      <th className="px-6 py-4">Permissions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {safeCaretakers.map((c) => {
                      const obj = c?.caretaker || {};
                      const name = `${obj.first_name || ''} ${obj.last_name || ''}`.trim() || 'Staff Member';
                      const assigned = Array.isArray(c?.assigned_properties) ? c.assigned_properties : [];
                      const profileImage = obj.profile_image;
                      const activeCount = countActivePermissions(c.permissions || {});
                      const permSummary = humanizePermissions(c.permissions || {});

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          {/* Identity */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {profileImage ? (
                                <img
                                  src={profileImage}
                                  alt={name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-green-100 dark:border-green-900"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {name[0] || 'S'}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                                  {name}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                  {obj.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Assigned properties */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {assigned.length > 0 ? (
                                assigned.map((p) => (
                                  <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-600"
                                  >
                                    <Building2 className="w-3 h-3 text-gray-500" />
                                    {p.name || p.title}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-amber-600 font-bold flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" /> No assignment
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Permissions — humanized summary */}
                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              <p
                                className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[180px]"
                                title={permSummary}
                              >
                                {permSummary}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${(activeCount / TOTAL_PERMISSIONS) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {activeCount}/{TOTAL_PERMISSIONS}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedCaretaker(c)}
                              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Caretaker Details Modal ──────────────────────────────────────── */}
      {selectedCaretaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Caretaker Details</h3>
              <button
                onClick={() => setSelectedCaretaker(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-gray-50/50 dark:bg-gray-700/30 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="relative group">
                    {selectedCaretaker.caretaker?.profile_image ? (
                      <img
                        src={selectedCaretaker.caretaker.profile_image}
                        className="w-56 h-56 rounded-[2rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl"
                        alt="Profile"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-green-600 rounded-[2rem] flex items-center justify-center text-white text-8xl font-bold shadow-2xl shadow-green-200 dark:shadow-none border-4 border-white dark:border-gray-800">
                        {selectedCaretaker.caretaker?.first_name?.[0] || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.2em] mb-2">
                      Caretaker Account
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedCaretaker.caretaker?.first_name} {selectedCaretaker.caretaker?.last_name}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-6 border-l border-gray-200 dark:border-gray-600 md:pl-10">
                  {[
                    { icon: <Mail className="w-5 h-5 text-emerald-600" />, label: 'Email Address', value: selectedCaretaker.caretaker?.email },
                    { icon: <Phone className="w-5 h-5 text-emerald-600" />, label: 'Phone Number', value: selectedCaretaker.caretaker?.phone || 'Not provided' },
                    { icon: <User className="w-5 h-5 text-emerald-600" />, label: 'Sex', value: selectedCaretaker.caretaker?.sex || 'Not specified' },
                    {
                      icon: <Calendar className="w-5 h-5 text-emerald-600" />,
                      label: 'Current Age',
                      value: selectedCaretaker.caretaker?.date_of_birth
                        ? `${Math.floor((new Date() - new Date(selectedCaretaker.caretaker.date_of_birth)) / 31557600000)} Years Old`
                        : 'Not provided',
                    },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4 group">
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                        {icon}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 capitalize truncate">
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions in details modal — humanized */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Module Permissions
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {CARETAKER_PERMISSION_FIELDS.map((field) => {
                    const val = !!(selectedCaretaker.permissions || {})[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`flex items-center gap-2 p-4 rounded-2xl border text-xs font-bold transition-all ${
                          val
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-gray-400'
                        }`}
                      >
                        {val ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{field.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Properties in details modal */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Managed Properties
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.isArray(selectedCaretaker.assigned_properties) &&
                  selectedCaretaker.assigned_properties.length > 0 ? (
                    selectedCaretaker.assigned_properties.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 p-6 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-colors group"
                      >
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Building2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                          {p.name || p.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl text-center">
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-bold italic">
                        No properties assigned to this caretaker.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details modal footer */}
            <div className="p-6 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Message', icon: <Mail className="w-4 h-4" />, onClick: () => handleMessageCaretaker(selectedCaretaker), cls: 'border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' },
                { label: 'Reset Key', icon: <Key className="w-4 h-4" />, onClick: () => handleResetPassword(selectedCaretaker), cls: 'border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30' },
                { label: 'Edit', icon: <KeyRound className="w-4 h-4" />, onClick: () => handleEditClick(selectedCaretaker), cls: 'border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' },
                { label: 'Revoke', icon: <Trash2 className="w-4 h-4" />, onClick: () => setRevocationModal({ show: true, caretaker: selectedCaretaker, reason: '' }), cls: 'border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' },
              ].map(({ label, icon, onClick, cls }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`py-4 px-2 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-2 ${cls}`}
                >
                  {icon}
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
              <button
                onClick={() => setSelectedCaretaker(null)}
                className="py-4 px-2 rounded-2xl bg-gray-900 dark:bg-green-600 text-white font-bold hover:bg-black dark:hover:bg-green-700 transition-all shadow-lg shadow-gray-200 dark:shadow-none flex flex-col items-center justify-center gap-2 col-span-2 sm:col-span-1"
              >
                <XCircle className="w-4 h-4" />
                <span className="text-[10px]">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revocation Modal ─────────────────────────────────────────────── */}
      {revocationModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Revoke Access</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {revocationModal.caretaker?.caretaker?.first_name}
                  </span>
                  ? This action is permanent.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-2">
                  Reason for Revocation
                </label>
                <textarea
                  value={revocationModal.reason}
                  onChange={(e) => setRevocationModal({ ...revocationModal, reason: e.target.value })}
                  placeholder="e.g. End of contract, Security concerns..."
                  className="w-full px-4 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-red-500 transition-all min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setRevocationModal({ show: false, caretaker: null, reason: '' })}
                  className="py-4 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeConfirm}
                  className="py-4 px-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Security / Permission Alert Modal ───────────────────────────── */}
      {permissionPrompt.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100001] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {permissionPrompt.isBulk ? 'Bulk Access Grant' : 'Landlord-Level Access'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {permissionPrompt.isBulk
                  ? 'You are enabling multiple sensitive features. This grants this caretaker elevated control over bookings, payments, and system settings. Are you sure?'
                  : (
                    <>
                      Enabling <span className="font-bold text-gray-900 dark:text-white">{promptedPermissionLabel}</span> grants elevated landlord-level permissions.
                      <br />
                      {promptedPermissionMessage}
                    </>
                  )}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={closePermissionPrompt}
                  className="py-4 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPermissionGrant}
                  className="py-4 px-4 rounded-2xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                >
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Reset Modal ─────────────────────────────────────────── */}
      {passwordResetModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Generate a new temporary password for{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {passwordResetModal.caretaker?.caretaker?.first_name}
                  </span>
                  ?
                </p>
              </div>

              {passwordResetModal.tempPassword ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center mb-2">
                    New Temporary Password
                  </p>
                  <div className="bg-white dark:bg-gray-800 py-4 px-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 flex items-center justify-between group">
                    <span className="text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest">
                      {passwordResetModal.tempPassword}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(passwordResetModal.tempPassword);
                        toast.success('Copied to clipboard');
                      }}
                      className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 text-center mt-4 leading-relaxed">
                    Please share this password with the caretaker. They should change it after logging in.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() =>
                      setPasswordResetModal({ show: false, caretaker: null, loading: false, tempPassword: '' })
                    }
                    className="py-4 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    disabled={passwordResetModal.loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmResetPassword}
                    className="py-4 px-4 rounded-2xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2"
                    disabled={passwordResetModal.loading}
                  >
                    {passwordResetModal.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Confirm
                  </button>
                </div>
              )}

              {passwordResetModal.tempPassword && (
                <button
                  onClick={() =>
                    setPasswordResetModal({ show: false, caretaker: null, loading: false, tempPassword: '' })
                  }
                  className="w-full py-4 bg-gray-900 dark:bg-green-600 text-white font-bold rounded-2xl hover:bg-black dark:hover:bg-green-700 transition-all"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
