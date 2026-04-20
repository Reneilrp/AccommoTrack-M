import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Key,
  KeyRound,
  ChevronDown,
  Check,
} from 'lucide-react';
import { showSuccess, showError } from '../../../utils/toast';
import api from '../../../utils/api';
import {
  CARETAKER_PERMISSION_FIELDS,
  MODULE_GROUPS,
  LANDLORD_LEVEL_PERMISSION_KEYS,
  LANDLORD_LEVEL_PERMISSION_MESSAGES,
  ROLE_PRESETS,
  countActivePermissions,
  identifyRole,
  getRoleLabel,
} from '../../../utils/caretakerPermissions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isLandlordLevelPermission = (key) => LANDLORD_LEVEL_PERMISSION_KEYS.has(key);
const STORAGE_KEY = 'ACCOMMOTRACK_CARETAKER_DRAFT';



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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= s.num
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}
            >
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-bold hidden sm:block ${step >= s.num ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                }`}
            >
              {s.label}
            </span>
          </div>
          {i < 1 && (
            <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full bg-emerald-500 transition-all duration-500 ${step >= 2 ? 'w-full' : 'w-0'
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
  setCaretakerPermissions,
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
    custom_role_name: '',
  });

  const [passwordResetModal, setPasswordResetModal] = useState({
    show: false,
    caretaker: null,
    loading: false,
    tempPassword: '',
  });
  const [revocationModal, setRevocationModal] = useState({ show: false, caretaker: null, reason: '' });
  const [activeModuleTab, setActiveModuleTab] = useState(0);
  const [createRoleTemplate, setCreateRoleTemplate] = useState('custom');
  const [editRoleTemplate, setEditRoleTemplate] = useState('custom');
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);

  const fetchCaretakersRef = useRef(fetchCaretakers);
  const navigate = useNavigate();

  const safeCaretakers = Array.isArray(caretakers) ? caretakers : [];
  const safeProperties = Array.isArray(landlordProperties) ? landlordProperties : [];
  const safeSelectedIds = useMemo(() => Array.isArray(selectedPropertyIds) ? selectedPropertyIds : [], [selectedPropertyIds]);
  const safePermissions = useMemo(() => caretakerPermissions || {}, [caretakerPermissions]);
  const safeForm = useMemo(() => caretakerForm || {
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    date_of_birth: '',
    custom_role_name: '',
  }, [caretakerForm]);
  const safeState = caretakerState || { loading: false, error: '' };

  useEffect(() => {
    fetchCaretakersRef.current = fetchCaretakers;
  }, [fetchCaretakers]);

  const restoreDraft = useCallback(() => {
    // Auto-restore draft from localStorage
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        const { form, permissions, propertyIds } = draft;

        // Only restore if the current identity fields are empty to avoid overwriting intentional resets
        if (form && !safeForm.first_name && !safeForm.last_name && !safeForm.email) {
          if (setCaretakerForm) setCaretakerForm(form);
          if (setCaretakerPermissions) setCaretakerPermissions(permissions);
          if (setSelectedPropertyIds) setSelectedPropertyIds(propertyIds);
        }
      } catch (e) {
        console.error('Failed to restore caretaker draft:', e);
      }
    }
  }, [safeForm.first_name, safeForm.last_name, safeForm.email, setCaretakerForm, setCaretakerPermissions, setSelectedPropertyIds]);

  useEffect(() => {
    if (typeof fetchCaretakersRef.current === 'function') {
      fetchCaretakersRef.current();
    }
    restoreDraft();
  }, [restoreDraft]);

  useEffect(() => {
    if (activeModuleTab >= MODULE_GROUPS.length) {
      setActiveModuleTab(0);
    }
  }, [activeModuleTab]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (modalMode !== 'create') return;

    const hasData =
      safeForm.first_name ||
      safeForm.last_name ||
      safeForm.email ||
      safeSelectedIds.length > 0 ||
      Object.values(safePermissions).some((p) => !!p);

    if (hasData) {
      const draft = {
        form: safeForm,
        permissions: safePermissions,
        propertyIds: safeSelectedIds,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [safeForm, safePermissions, safeSelectedIds, modalMode]);

  // ── Permission helpers ──────────────────────────────────────────────────
  const closePermissionPrompt = () =>
    setPermissionPrompt({ open: false, key: null, target: 'create', isBulk: false, keys: [] });

  const requestPermissionPrompt = (key, target) =>
    setPermissionPrompt({ open: true, key, target, isBulk: false, keys: [] });

  const setRoleTemplateForTarget = (target, value) => {
    if (target === 'create') {
      setCreateRoleTemplate(value);
    } else {
      setEditRoleTemplate(value);
    }
  };

  const markCurrentRoleTemplateAsCustom = () => {
    if (modalMode === 'create') {
      setCreateRoleTemplate('custom');
    } else {
      setEditRoleTemplate('custom');
    }
  };

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

  const applyRoleTemplate = (rolePermissions, target) => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const permissionSet = new Set(rolePermissions || []);

    if (target === 'create') {
      allKeys.forEach((k) => handlePermissionToggle(k, permissionSet.has(k)));
    } else {
      setEditFormData((prev) => {
        const nextPermissions = { ...prev.permissions };
        allKeys.forEach((k) => {
          nextPermissions[k] = permissionSet.has(k);
        });
        return { ...prev, permissions: nextPermissions };
      });
    }
  };

  const handleRoleTemplateChange = (value) => {
    const target = modalMode === 'create' ? 'create' : 'edit';
    setRoleTemplateForTarget(target, value);

    if (value === 'custom') return;

    if (target === 'create') {
      setCaretakerForm?.((prev) => ({ ...prev, custom_role_name: '' }));
    } else {
      setEditFormData((prev) => ({ ...prev, custom_role_name: '' }));
    }

    const role = ROLE_PRESETS.find((r) => r.id === value);
    if (!role) return;

    applyRoleTemplate(role.permissions, target);
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
    markCurrentRoleTemplateAsCustom();
  };

  const handleGrantAllPermissions = (target, currentState) => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const sensitiveKeys = allKeys.filter(
      (k) => isLandlordLevelPermission(k) && !currentState[k],
    );

    if (sensitiveKeys.length > 0) {
      setPermissionPrompt({ open: true, key: null, target, isBulk: true, keys: allKeys });
      return;
    }

    applyBulkPermissions(allKeys, true, target);
    setRoleTemplateForTarget(target, 'admin');
  };

  const handleRevokeAllPermissions = (target) => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    applyBulkPermissions(allKeys, false, target);
    setRoleTemplateForTarget(target, 'custom');
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

    markCurrentRoleTemplateAsCustom();
  };

  const confirmPermissionGrant = () => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const grantedAllPermissions =
      permissionPrompt.isBulk &&
      permissionPrompt.keys.length === allKeys.length &&
      allKeys.every((k) => permissionPrompt.keys.includes(k));

    if (permissionPrompt.isBulk) {
      applyBulkPermissions(permissionPrompt.keys, true, permissionPrompt.target);
      if (grantedAllPermissions) {
        setRoleTemplateForTarget(permissionPrompt.target, 'admin');
      } else {
        setRoleTemplateForTarget(permissionPrompt.target, 'custom');
      }
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
      setRoleTemplateForTarget(target, 'custom');
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
    if (name === 'password') {
      if (!value) error = 'Password is required';
      else if (value.length < 8) error = 'Password must be at least 8 characters';
    }
    if (name === 'password_confirmation') {
      const p = modalMode === 'create' ? safeForm.password : editFormData.password;
      if (value !== p) error = 'Passwords do not match';
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (typeof setCaretakerForm === 'function' && modalMode === 'create') {
      setCaretakerForm((prev) => ({ ...prev, [name]: value }));
    } else if (modalMode === 'edit') {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
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
        custom_role_name: '',
      });
    if (resetCaretakerPermissions) resetCaretakerPermissions();
    if (setSelectedPropertyIds) setSelectedPropertyIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const openCreateModal = () => {
    // Check if we already have data (either in memory or just restored from localStorage)
    const hasExistingData =
      safeForm.first_name ||
      safeForm.last_name ||
      safeForm.email ||
      safeSelectedIds.length > 0;

    if (!hasExistingData && !localStorage.getItem(STORAGE_KEY)) {
      resetCreationForm();
    }
    setShowPasswords(false);
    setCreateStep(1);
    setActiveModuleTab(0);
    setCreateRoleTemplate('custom');
    setModalMode('create');
  };

  const closeModal = () => {
    setModalMode('closed');
    setShowPasswords(false);
    setCreateStep(1);
    setActiveModuleTab(0);
    setCreateRoleTemplate('custom');
    setEditRoleTemplate('custom');
  };

  const handleCreateStepNext = () => {
    const validationResults = [
      { field: 'First Name', err: validateField('first_name', safeForm.first_name) },
      { field: 'Last Name', err: validateField('last_name', safeForm.last_name) },
      { field: 'Email Address', err: validateField('email', safeForm.email) },
      { field: 'Phone', err: validateField('phone', safeForm.phone) },
      { field: 'Password', err: validateField('password', safeForm.password) },
      { field: 'Password Confirmation', err: validateField('password_confirmation', safeForm.password_confirmation) },
    ];

    const firstError = validationResults.find((vr) => vr.err !== '');
    if (firstError) {
      showError(firstError.err);
      return;
    }
    setCreateStep(2);
  };

  const handleRegister = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    const validationResults = [
      { field: 'First Name', err: validateField('first_name', safeForm.first_name) },
      { field: 'Last Name', err: validateField('last_name', safeForm.last_name) },
      { field: 'Email Address', err: validateField('email', safeForm.email) },
      { field: 'Password', err: validateField('password', safeForm.password) },
      { field: 'Password Confirmation', err: validateField('password_confirmation', safeForm.password_confirmation) },
    ];

    const firstError = validationResults.find((vr) => vr.err !== '');
    if (firstError) {
      showError(firstError.err);
      return;
    }

    if (safeProperties.length > 0 && safeSelectedIds.length === 0) {
      showError('Please assign a property to the caretaker');
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
    const matchedRole = identifyRole(c.permissions || {});
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
        delete_tenants: !!c.permissions.delete_tenants,
        rooms: !!c.permissions.rooms,
        properties: !!c.permissions.properties,
        maintenance: !!c.permissions.maintenance,
        payments: !!c.permissions.payments,
        record_payments: !!c.permissions.record_payments,
        void_payments: !!c.permissions.void_payments,
        analytics: !!c.permissions.analytics,
        view_audit_logs: !!c.permissions.view_audit_logs,
      },
      property_ids: (c.assigned_properties || []).map((p) => p.id),
      custom_role_name: c.custom_role_name || '',
    });
    setEditRoleTemplate(c.custom_role_name ? 'custom' : (matchedRole?.id || 'custom'));
    setActiveModuleTab(0);
    setShowPasswords(false);
    setSelectedCaretaker(null);
    setModalMode('edit');
  };

  const handleUpdateSubmit = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    const validationResults = [
      { label: 'First Name', err: validateField('first_name', editFormData.first_name) },
      { label: 'Last Name', err: validateField('last_name', editFormData.last_name) },
      { label: 'Email Address', err: validateField('email', editFormData.email) },
    ];

    if (editFormData.password && editFormData.password.trim() !== '') {
      validationResults.push({ label: 'Password', err: validateField('password', editFormData.password) });
      validationResults.push({ label: 'Password Confirmation', err: validateField('password_confirmation', editFormData.password_confirmation) });
    }

    const firstError = validationResults.find((vr) => vr.err !== '');
    if (firstError) {
      showError(firstError.err);
      return;
    }

    if (editFormData.property_ids.length === 0) {
      showError('Please assign at least one property');
      return;
    }
    if (!editFormData.id) {
      showError('Invalid caretaker ID');
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
      can_record_payments: !!editFormData.permissions.record_payments,
      can_void_payments: !!editFormData.permissions.void_payments,
      can_delete_tenants: !!editFormData.permissions.delete_tenants,
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
      custom_role_name: editFormData.custom_role_name,
    };

    if (editFormData.password && editFormData.password.trim() !== '') {
      updateData.password = editFormData.password;
      updateData.password_confirmation = editFormData.password_confirmation;
    }

    try {
      await api.patch(`/landlord/caretakers/${editFormData.id}`, updateData);
      showSuccess('Caretaker updated successfully');
      setModalMode('closed');
      fetchCaretakers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update caretaker';
      const errors = err.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0];
        showError(`${msg}: ${Array.isArray(firstError) ? firstError[0] : firstError}`);
      } else {
        showError(msg);
      }
    }
  };

  // ── Misc actions ────────────────────────────────────────────────────────
  const handleMessageCaretaker = (c) => {
    if (!c?.caretaker?.id) {
      showError('Cannot message: Caretaker user ID not found');
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
      showSuccess('Password has been reset');
    } catch {
      showError('Failed to reset password');
      setPasswordResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revocationModal.reason.trim()) {
      showError('Please provide a reason for revocation');
      return;
    }
    try {
      await handleRevokeCaretaker(revocationModal.caretaker.id, revocationModal.reason);
      setRevocationModal({ show: false, caretaker: null, reason: '' });
      setSelectedCaretaker(null);
      showSuccess('Access revoked successfully');
    } catch {
      showError('Failed to revoke access');
    }
  };

  // Active permissions/props for the current modal mode
  const activePermissions = modalMode === 'create' ? safePermissions : editFormData.permissions;
  const isModalOpen = modalMode !== 'closed';

  const renderPermissionSection = () => {
    const activeGroup = MODULE_GROUPS[activeModuleTab] || MODULE_GROUPS[0] || null;
    const activeGroupKeys = Array.isArray(activeGroup?.keys) ? activeGroup.keys : [];
    const groupFields = CARETAKER_PERMISSION_FIELDS.filter((f) => activeGroupKeys.includes(f.key));
    const allGroupOn = groupFields.length > 0 && groupFields.every((f) => !!activePermissions[f.key]);

    const target = modalMode === 'create' ? 'create' : 'edit';
    const selectedRoleTemplate = modalMode === 'create' ? createRoleTemplate : editRoleTemplate;
    const currentPropertyIds = modalMode === 'create' ? safeSelectedIds : editFormData.property_ids;
    const handlePropertyToggle =
      modalMode === 'create'
        ? (id) =>
          setSelectedPropertyIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
          )
        : (id) =>
          setEditFormData((prev) => ({
            ...prev,
            property_ids: prev.property_ids.includes(id)
              ? prev.property_ids.filter((i) => i !== id)
              : [...prev.property_ids, id],
          }));

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row gap-0 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px]">
          {/* Sidebar */}
          <div className="w-full md:w-64 border-r border-gray-100 dark:border-gray-700 bg-gray-50/20 dark:bg-gray-900/10 flex flex-col h-full">
            <div className="p-4 space-y-6 flex-1">
              <button
                type="button"
                onClick={() => handleGrantAllPermissions(target, activePermissions)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/15 hover:bg-emerald-100 dark:hover:bg-emerald-900/25"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Grant All Access
              </button>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                  Role Template
                </label>
                <div className="relative">
                  <select
                    onChange={(e) => handleRoleTemplateChange(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                    value={selectedRoleTemplate}
                  >
                    <option value="custom">Custom Configuration</option>
                    {ROLE_PRESETS.map((role) => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {selectedRoleTemplate === 'custom' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Custom Role Title
                  </label>
                  <input
                    type="text"
                    name="custom_role_name"
                    value={modalMode === 'create' ? safeForm.custom_role_name : editFormData.custom_role_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Night Manager"
                    list="suggested-roles"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <datalist id="suggested-roles">
                    {[...new Set(safeCaretakers.map((c) => c.custom_role_name).filter(Boolean))].map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 italic leading-tight">
                    Optional. Overrides the preset label in the dashboard list.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="px-1 pb-2 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Modules
                </p>
                <div className="space-y-0.5">
                  {MODULE_GROUPS.map((group, idx) => {
                    const activeCount = group.keys.filter((k) => !!activePermissions[k]).length;
                    const isActive = activeModuleTab === idx;
                    return (
                      <button
                        key={group.title}
                        type="button"
                        onClick={() => setActiveModuleTab(idx)}
                        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isActive
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                            {React.cloneElement(group.icon, { className: 'w-4 h-4' })}
                          </div>
                          <span className="text-[11px] tracking-tight">{group.title}</span>
                        </div>
                        {activeCount > 0 && !isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRevokeAllPermissions(target)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <XCircle className="w-3.5 h-3.5" />
                Revoke Access
              </button>
            </div>
          </div>

          {/* Content area: Minimalist & Dense */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar flex flex-col">
            <>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700/50">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    {activeGroup?.title || 'Permissions'}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Manage {activeGroup?.title?.toLowerCase() || 'module'} operational rights.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGroupToggleAll(activeGroup?.keys || [], activePermissions)}
                  className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-widest"
                >
                  {allGroupOn ? 'Deselect Group' : 'Select Group'}
                </button>
              </div>

              <div className="space-y-1 flex-1">
                {groupFields.length === 0 && (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
                    Select a module to manage permissions.
                  </div>
                )}

                {groupFields.map((field) => {
                  const isChecked = !!activePermissions[field.key];
                  const isSensitive = isLandlordLevelPermission(field.key);
                  return (
                    <label
                      key={field.key}
                      className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${isChecked ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
                        }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg transition-colors ${isChecked ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}>
                          {React.cloneElement(field.icon, { className: 'w-4 h-4' })}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold truncate ${isChecked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                              {field.label}
                            </p>
                            {isSensitive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Sensitive Permission" />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 pr-4">
                            {field.description}
                          </p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${isChecked ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSinglePermissionToggle(field.key)}
                        className="hidden"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Selection notice */}
              <div className="mt-5 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium italic">
                  Permissions are tailored based on the active module.
                </p>
              </div>

              {/* Sensitive Grant Notice */}
              {(() => {
                const sensitiveInGroup = groupFields.filter((f) => isLandlordLevelPermission(f.key));
                const sensitiveActive = sensitiveInGroup.some((f) => !!activePermissions[f.key]);
                if (!sensitiveActive) return null;
                return (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-snug">
                      Warning: You have granted landlord-level permissions within this module. This caretaker will have high-level control over property operations.
                    </p>
                  </div>
                );
              })()}
            </>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                Manage Properties
              </h3>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
              {currentPropertyIds.length} selected
            </span>
          </div>
          <div className="p-5">
            {renderPropertySection(currentPropertyIds, handlePropertyToggle)}
          </div>
        </div>
      </div>
    );
  };

  const renderPropertySection = (propertyIds, onToggle) => {
    const selectedIds = Array.isArray(propertyIds) ? propertyIds : [];

    if (safeProperties.length === 0) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
          No properties available. Add a property first, then assign it to this caretaker.
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {safeProperties.map((property) => {
          const selected = selectedIds.includes(property.id);
          return (
            <button
              key={property.id}
              type="button"
              onClick={() => onToggle(property.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${selected
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300'
                }`}
            >
              <div className={`p-0.5 rounded-full ${selected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Building2 className="w-3 h-3" />
              </div>
              {property.name || property.title || 'Property'}
              {selected && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    );
  };

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
              className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    {modalMode === 'create' ? 'Add New Caretaker' : 'Edit Caretaker'}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium italic">
                    {modalMode === 'create'
                      ? 'Step-by-step setup for personal details and permissions.'
                      : 'Update permissions and property assignments.'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {modalMode === 'create' && <StepBar step={createStep} />}

              <div className="p-6 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-8">
                {(modalMode === 'create' ? createStep === 1 : true) && (
                  <>
                    {modalMode === 'edit' && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <h3 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Personal Information
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { label: 'First Name', key: 'first_name', placeholder: 'e.g. John' },
                            { label: 'Middle Name', key: 'middle_name', placeholder: 'Optional' },
                            { label: 'Last Name', key: 'last_name', placeholder: 'e.g. Doe' },
                            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@example.com' },
                            { label: 'Phone Number', key: 'phone', placeholder: '09123456789' },
                          ].map(({ label, key, type = 'text', placeholder }) => (
                            <div key={key} className="space-y-2">
                              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-4 uppercase tracking-wider">
                                {label}
                              </label>
                              <input
                                type={type}
                                placeholder={placeholder}
                                value={editFormData[key]}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all placeholder:text-gray-300"
                              />
                            </div>
                          ))}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 ml-4 uppercase tracking-wider">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={editFormData.date_of_birth}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                              }
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                            <p className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                              Security Override
                            </p>
                          </div>
                          <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 italic font-medium -mt-2 ml-7">
                            Leave fields blank to keep current password.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                            {[
                              { label: 'New Password', placeholder: '••••••••', key: 'password' },
                              { label: 'Confirm New Password', placeholder: '••••••••', key: 'password_confirmation' },
                            ].map(({ label, placeholder, key }) => (
                              <div key={key} className="relative space-y-2">
                                <label className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest ml-4">{label}</label>
                                <div className="relative">
                                  <input
                                    type={showPasswords ? 'text' : 'password'}
                                    placeholder={placeholder}
                                    value={editFormData[key]}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    className="w-full px-5 py-3.5 border border-amber-100 dark:border-amber-900/20 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-300 hover:text-amber-500"
                                  >
                                    {showPasswords ? (
                                      <EyeOff className="w-5 h-5" />
                                    ) : (
                                      <Eye className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}

                    {modalMode === 'create' && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <h3 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Personal Information
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-1">
                          {[
                            { label: 'First Name', name: 'first_name', placeholder: 'e.g. John' },
                            { label: 'Middle Name (Optional)', name: 'middle_name', placeholder: 'Optional' },
                            { label: 'Last Name', name: 'last_name', placeholder: 'e.g. Doe' },
                            { label: 'Email Address', name: 'email', type: 'email', placeholder: 'caretaker@example.com' },
                            { label: 'Phone (Optional)', name: 'phone', placeholder: '09123456789' },
                          ].map(({ label, name, type = 'text', placeholder }) => (
                            <div key={name} className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 ml-3 uppercase tracking-wider">
                                {label}
                              </label>
                              <input
                                name={name}
                                type={type}
                                placeholder={placeholder}
                                value={safeForm[name]}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium focus:ring-4 transition-all focus:ring-green-500/10 focus:border-green-500"
                              />
                            </div>
                          ))}

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 ml-3 uppercase tracking-wider">
                              Date of Birth (Optional)
                            </label>
                            <input
                              name="date_of_birth"
                              type="date"
                              value={safeForm.date_of_birth}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                              <Shield className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h4 className="text-[11px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Initial Credentials</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                              { label: 'Portal Password', field: 'password' },
                              { label: 'Confirm Password', field: 'password_confirmation' },
                            ].map(({ label, field }) => (
                              <div key={field} className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 ml-3 uppercase tracking-wider">
                                  {label}
                                </label>
                                <div className="relative">
                                  <input
                                    name={field}
                                    type={showPasswords ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={safeForm[field]}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-white dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-sm focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                  >
                                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {(modalMode === 'create' ? createStep === 2 : true) && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {renderPermissionSection()}
                  </div>
                )}
              </div>

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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-700/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Caretaker</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Access Role</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Managed Zone</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
                    {safeCaretakers.map((c) => {
                      const activeCount = countActivePermissions(c.permissions || {});
                      const matchedRole = identifyRole(c.permissions || {});

                      return (
                        <tr key={c.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase border border-gray-200 dark:border-gray-700">
                                {c.caretaker?.first_name?.[0]}{c.caretaker?.last_name?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                  {c.caretaker?.first_name} {c.caretaker?.last_name}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{c.caretaker?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${matchedRole
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}>
                                {getRoleLabel(c.permissions || {}, c.custom_role_name)}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                                {activeCount} permissions active
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap justify-center gap-1.5 max-w-[240px] mx-auto">
                              {Array.isArray(c.assigned_properties) && c.assigned_properties.length > 0 ? (
                                c.assigned_properties.slice(0, 2).map((p) => (
                                  <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-[9px] font-bold text-gray-600 dark:text-gray-400 shadow-sm">
                                    <Building2 className="w-2.5 h-2.5" />
                                    {p.name || p.title}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] font-bold text-amber-500 uppercase">Unassigned</span>
                              )}
                              {c.assigned_properties?.length > 2 && (
                                <span className="text-[9px] font-bold text-gray-400">+{c.assigned_properties.length - 2} more</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => setSelectedCaretaker(c)}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-600 text-[11px] font-bold transition-all bg-white dark:bg-gray-800"
                            >
                              Manage
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

      {/* ── Caretaker Details Modal ─────────────────────── */}
      {selectedCaretaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-[70%] max-w-none overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-gray-50/50 dark:bg-gray-900/10 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700">
                  <div className="relative">
                    {selectedCaretaker.caretaker?.profile_image ? (
                      <img
                        src={selectedCaretaker.caretaker.profile_image}
                        className="w-32 h-32 rounded-2xl object-cover border-4 border-gray-50 dark:border-gray-700 shadow-sm"
                        alt="Profile"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 text-4xl font-black">
                        {selectedCaretaker.caretaker?.first_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {selectedCaretaker.caretaker?.first_name} {selectedCaretaker.caretaker?.last_name}
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Caretaker Account</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-8 space-y-4">
                  {[
                    { icon: <Mail className="w-4 h-4" />, label: 'Email', value: selectedCaretaker.caretaker?.email },
                    { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: selectedCaretaker.caretaker?.phone || 'N/A' },
                    {
                      icon: <Shield className="w-4 h-4" />,
                      label: 'Assigned Role',
                      value: getRoleLabel(selectedCaretaker.permissions, selectedCaretaker.custom_role_name)
                    },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-400">{icon}</div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-900 dark:text-gray-200 truncate ml-4">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Managed Properties</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedCaretaker.assigned_properties) &&
                    selectedCaretaker.assigned_properties.length > 0 ? (
                    selectedCaretaker.assigned_properties.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-[11px] font-bold text-gray-700 dark:text-gray-300 shadow-sm"
                      >
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {p.name || p.title}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-amber-600 font-bold italic px-1">No properties assigned.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Permissions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {CARETAKER_PERMISSION_FIELDS.map((field) => {
                    const val = !!(selectedCaretaker.permissions || {})[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${val
                          ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            {React.cloneElement(field.icon, { className: 'w-3 h-3' })}
                          </div>
                          <span className="text-[11px] font-bold">{field.label}</span>
                        </div>
                        {val ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3 opacity-20" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                {[
                  { label: 'Message', icon: <Mail className="w-4 h-4" />, onClick: () => handleMessageCaretaker(selectedCaretaker), cls: 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' },
                  { label: 'Reset Key', icon: <Key className="w-4 h-4" />, onClick: () => handleResetPassword(selectedCaretaker), cls: 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' },
                  { label: 'Edit Access', icon: <KeyRound className="w-4 h-4" />, onClick: () => handleEditClick(selectedCaretaker), cls: 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' },
                  { label: 'Revoke Access', icon: <Trash2 className="w-4 h-4" />, onClick: () => setRevocationModal({ show: true, caretaker: selectedCaretaker, reason: '' }), cls: 'border border-gray-200 dark:border-gray-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10' },
                ].map(({ label, icon, onClick, cls }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className={`py-3 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${cls}`}
                  >
                    {icon}
                    <span className="text-[9px] uppercase tracking-widest">{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedCaretaker(null)}
                className="w-full py-4 mt-4 bg-gray-900 dark:bg-green-600 text-white font-bold rounded-2xl hover:bg-black dark:hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest">Close Overview</span>
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
      )
      }

      {/* ── Security / Permission Alert Modal ───────────────────────────── */}
      {
        permissionPrompt.open && (
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
        )
      }

      {/* ── Password Reset Modal ─────────────────────────────────────────── */}
      {
        passwordResetModal.show && (
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
                          showSuccess('Copied to clipboard');
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
        )
      }
    </>
  );
}
