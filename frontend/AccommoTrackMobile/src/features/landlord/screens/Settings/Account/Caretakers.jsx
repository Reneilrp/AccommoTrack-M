import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../../styles/Landlord/Caretakers.js';
import CaretakerService from '../../../../../services/CaretakerService.js';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import { ListItemSkeleton } from '../../../../../components/Skeletons/index.jsx';
import { showSuccess, showError } from '../../../../../utils/toast.js';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../../hooks/useLandlordQueryHelpers.js';

// ── Constants ────────────────────────────────────────────────────────────────
const EMPTY_CARETAKERS = [];
const EMPTY_PROPERTIES = [];
const TOTAL_PERMISSIONS = 14;

const CARETAKER_PERMISSION_FIELDS = [
  { key: 'bookings',           label: 'View Bookings',       description: 'View reservation requests.' },
  { key: 'approve_bookings',   label: 'Approve Bookings',    description: 'Accept pending bookings.' },
  { key: 'cancel_bookings',    label: 'Cancel Bookings',     description: 'Cancel active/pending bookings.' },
  { key: 'manual_bookings',    label: 'Manual Bookings',     description: 'Create bookings on behalf of tenants.' },
  { key: 'tenants',            label: 'Tenants',             description: 'Access profiles and room assignments.' },
  { key: 'add_tenant_manually',label: 'Add Tenant Manually', description: 'Create tenant profiles without an invite.' },
  { key: 'messages',           label: 'Messages',            description: 'Chat with prospects and residents.' },
  { key: 'rooms',              label: 'Room Management',     description: 'Full control over room availability.' },
  { key: 'properties',         label: 'Properties',          description: 'View and manage property details.' },
  { key: 'maintenance',        label: 'Maintenance',         description: 'Handle repairs and upkeep requests.' },
  { key: 'manage_add_ons',     label: 'Manage Add-ons',      description: 'Approve/reject tenant add-ons.' },
  { key: 'payments',           label: 'Payments',            description: 'Track and verify rental transactions.' },
  { key: 'analytics',          label: 'Analytics',           description: 'View performance dashboards and trends.' },
  { key: 'view_audit_logs',    label: 'Audit Logs',          description: 'View tracking of actions & recent activity.' },
];

const MODULE_GROUPS = [
  { title: 'Bookings',           icon: 'calendar-outline',    keys: ['bookings', 'approve_bookings', 'cancel_bookings', 'manual_bookings'] },
  { title: 'Tenant Management',  icon: 'people-outline',      keys: ['tenants', 'messages', 'add_tenant_manually'] },
  { title: 'Properties & Rooms', icon: 'business-outline',    keys: ['properties', 'rooms', 'maintenance', 'manage_add_ons'] },
  { title: 'Payments',           icon: 'wallet-outline',      keys: ['payments'] },
  { title: 'Analytics & Admin',  icon: 'stats-chart-outline', keys: ['analytics', 'view_audit_logs'] },
];

const LANDLORD_LEVEL_PERMISSION_KEYS = new Set([
  'rooms', 'properties', 'maintenance', 'payments', 'analytics',
  'view_audit_logs', 'approve_bookings', 'cancel_bookings',
  'manage_add_ons', 'add_tenant_manually', 'manual_bookings',
]);

const LANDLORD_LEVEL_PERMISSION_MESSAGES = {
  rooms: 'Enables caretakers to modify room availability and tenant placements.',
  properties: 'Enables caretakers to update core property details and settings.',
  maintenance: 'Enables caretakers to process and update maintenance workflows.',
  payments: 'Enables caretakers to manage sensitive billing and payment operations.',
  analytics: 'Enables caretakers to view occupancy, revenue, and trend insights.',
  view_audit_logs: 'Enables caretakers to view property actions history.',
  approve_bookings: 'Gives access to directly accept booking requests.',
  cancel_bookings: 'Gives access to directly decline or cancel bookings.',
  manage_add_ons: 'Gives access to modify tenant extra requests.',
  add_tenant_manually: 'Allows caretakers to inject manual tenant entries.',
  manual_bookings: 'Allows caretakers to place override bookings.',
};

/** Returns active group titles for a permissions object */
function getActiveGroupNames(permissions) {
  return MODULE_GROUPS
    .filter((g) => g.keys.some((k) => !!permissions[k]))
    .map((g) => g.title);
}

/** Count active permissions */
function countActive(permissions) {
  return CARETAKER_PERMISSION_FIELDS.filter((f) => !!permissions[f.key]).length;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Caretakers() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  /** 'profile' | 'permissions' */
  const [modalTab, setModalTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [permissionPrompt, setPermissionPrompt] = useState({
    visible: false,
    key: null,
    isBulk: false,
    keys: [],
  });
  const [revocationModal, setRevocationModal] = useState({ show: false, caretaker: null, reason: '' });
  const [resetPasswordModal, setResetPasswordModal] = useState({
    show: false,
    caretaker: null,
    loading: false,
    tempPassword: '',
  });

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    assignmentId: null,
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    passwordConfirmation: '',
    permissions: {
      bookings: true,
      approve_bookings: false,
      cancel_bookings: false,
      manual_bookings: false,
      manage_add_ons: false,
      messages: true,
      tenants: false,
      add_tenant_manually: false,
      rooms: false,
      properties: false,
      maintenance: false,
      payments: false,
      analytics: false,
      view_audit_logs: false,
    },
    propertyIds: [],
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // ── Data fetching ─────────────────────────────────────────────────────────
  const caretakerBundleQuery = useQuery({
    queryKey: landlordQueryKeys.caretakersBundle(),
    queryFn: async () => {
      const response = await CaretakerService.getCaretakers();
      if (!response.success) throw new Error(response.error || 'Failed to fetch caretakers');
      return {
        caretakers: Array.isArray(response.data?.caretakers) ? response.data.caretakers : EMPTY_CARETAKERS,
        landlordProperties: Array.isArray(response.data?.landlord_properties) ? response.data.landlord_properties : EMPTY_PROPERTIES,
      };
    },
    placeholderData: (prev) => prev,
  });

  const caretakers = caretakerBundleQuery.data?.caretakers || EMPTY_CARETAKERS;
  const landlordProperties = caretakerBundleQuery.data?.landlordProperties || EMPTY_PROPERTIES;
  const loading = caretakerBundleQuery.isPending && caretakers.length === 0;
  const fetchError = caretakerBundleQuery.error?.message || '';

  const refetchCaretakerBundle = caretakerBundleQuery.refetch;
  const caretakerRefetchers = useMemo(() => [refetchCaretakerBundle], [refetchCaretakerBundle]);

  useLandlordFocusRefetch({ refetchers: caretakerRefetchers });
  const handleRefresh = useLandlordRefreshHandler({ setRefreshing, refetchers: caretakerRefetchers });

  useEffect(() => {
    if (!fetchError) return;
    showError('Error', fetchError);
  }, [fetchError]);

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      assignmentId: null,
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      password: '',
      passwordConfirmation: '',
      permissions: {
        bookings: true,
        approve_bookings: false,
        cancel_bookings: false,
        manual_bookings: false,
        manage_add_ons: false,
        messages: true,
        tenants: false,
        add_tenant_manually: false,
        rooms: false,
        properties: false,
        maintenance: false,
        payments: false,
        analytics: false,
        view_audit_logs: false,
      },
      propertyIds: [],
    });
    setFieldErrors({});
    setIsEditing(false);
    setShowPasswords(false);
    setModalTab('profile');
    setExpandedGroups([]);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateField = (name, value) => {
    let error = '';
    if (name === 'firstName' || name === 'lastName') {
      if (/\d/.test(value)) error = 'Names cannot contain numbers';
    }
    if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) error = 'Phone must contain only numbers';
      else if (value && value.length < 10) error = 'Phone number is too short';
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) error = 'Invalid email address';
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (item) => {
    const permMap = item.permissions || {};
    setFormData({
      assignmentId: item.id,
      firstName: item.caretaker.first_name,
      middleName: item.caretaker.middle_name || '',
      lastName: item.caretaker.last_name,
      email: item.caretaker.email,
      phone: item.caretaker.phone || '',
      dateOfBirth: item.caretaker.date_of_birth || '',
      password: '',
      passwordConfirmation: '',
      permissions: {
        bookings:           permMap.bookings            || permMap.can_view_bookings        || false,
        approve_bookings:   permMap.approve_bookings    || permMap.can_approve_bookings     || false,
        cancel_bookings:    permMap.cancel_bookings     || permMap.can_cancel_bookings      || false,
        manual_bookings:    permMap.manual_bookings     || permMap.can_add_manual_bookings  || false,
        manage_add_ons:     permMap.manage_add_ons      || permMap.can_manage_add_ons       || false,
        messages:           permMap.messages            || permMap.can_view_messages        || false,
        tenants:            permMap.tenants             || permMap.can_view_tenants         || false,
        add_tenant_manually:permMap.add_tenant_manually || permMap.can_add_tenant_manually  || false,
        rooms:              permMap.rooms               || permMap.can_view_rooms           || false,
        properties:         permMap.properties          || permMap.can_view_properties      || false,
        maintenance:        permMap.maintenance         || permMap.can_manage_maintenance   || false,
        payments:           permMap.payments            || permMap.can_manage_payments      || false,
        analytics:          permMap.analytics           || permMap.can_view_analytics       || false,
        view_audit_logs:    permMap.view_audit_logs     || permMap.can_view_audit_logs      || false,
      },
      propertyIds: item.assigned_property_ids || [],
    });
    setIsEditing(true);
    setModalTab('permissions'); // jump to permissions tab when editing
    setExpandedGroups([]);
    setModalVisible(true);
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const handleResetPassword = (item) => {
    setResetPasswordModal({ show: true, caretaker: item, loading: false, tempPassword: '' });
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetPasswordModal.caretaker) return;
    setResetPasswordModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await CaretakerService.resetPassword(resetPasswordModal.caretaker.id);
      if (res.success) {
        const nextPassword = res.data?.temporary_password || '';
        setResetPasswordModal((prev) => ({ ...prev, loading: false, tempPassword: nextPassword }));
        if (!nextPassword) showSuccess('Success', 'Password reset successfully.');
      } else {
        setResetPasswordModal((prev) => ({ ...prev, loading: false }));
        showError('Error', res.error || 'Failed to reset password');
      }
    } catch {
      setResetPasswordModal((prev) => ({ ...prev, loading: false }));
      showError('Error', 'Failed to reset password');
    }
  };

  const refreshCaretakerBundleSafe = async () => {
    try {
      await refetchLandlordQueries(caretakerRefetchers);
    } catch (error) {
      console.warn('Failed to refresh caretakers after mutation:', error);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;

    const errors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
    };

    if (Object.values(errors).some((err) => err !== '')) {
      showError('Validation Error', 'Please fix the errors before submitting');
      return;
    }
    if (!isEditing && (!formData.firstName || !formData.lastName || !formData.email || !formData.password)) {
      showError('Error', 'Please fill in all required fields including password');
      return;
    }
    if (landlordProperties.length > 0 && formData.propertyIds.length === 0) {
      showError('Error', 'Please assign at least one property to the caretaker');
      return;
    }
    if (!isEditing && formData.password !== formData.passwordConfirmation) {
      showError('Error', 'Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        property_ids: formData.propertyIds,
        permissions: {
          can_view_bookings:       formData.permissions.bookings,
          can_approve_bookings:    formData.permissions.approve_bookings,
          can_cancel_bookings:     formData.permissions.cancel_bookings,
          can_add_manual_bookings: formData.permissions.manual_bookings,
          can_manage_add_ons:      formData.permissions.manage_add_ons,
          can_view_messages:       formData.permissions.messages,
          can_view_tenants:        formData.permissions.tenants,
          can_add_tenant_manually: formData.permissions.add_tenant_manually,
          can_view_rooms:          formData.permissions.rooms,
          can_view_properties:     formData.permissions.properties,
          can_manage_maintenance:  formData.permissions.maintenance,
          can_manage_payments:     formData.permissions.payments,
          can_view_analytics:      formData.permissions.analytics,
          can_view_audit_logs:     formData.permissions.view_audit_logs,
        },
      };

      if (!isEditing) {
        payload.first_name = formData.firstName;
        payload.middle_name = formData.middleName;
        payload.last_name = formData.lastName;
        payload.email = formData.email;
        payload.phone = formData.phone;
        payload.date_of_birth = formData.dateOfBirth;
        payload.password = formData.password;
        payload.password_confirmation = formData.passwordConfirmation;

        const res = await CaretakerService.createCaretaker(payload);
        if (res.success) {
          const temporaryPassword = res.data?.temporary_password || formData.password;
          setModalVisible(false);
          resetForm();
          if (temporaryPassword) {
            showSuccess('Success', `Caretaker created! Temp password: ${temporaryPassword}`);
          } else {
            showSuccess('Success', 'Caretaker created successfully');
          }
          await refreshCaretakerBundleSafe();
        } else {
          showError('Error', res.error);
        }
      } else {
        payload.first_name = formData.firstName;
        payload.middle_name = formData.middleName;
        payload.last_name = formData.lastName;
        payload.email = formData.email;
        payload.phone = formData.phone;
        payload.date_of_birth = formData.dateOfBirth;

        const res = await CaretakerService.updateCaretaker(formData.assignmentId, payload);
        if (res.success) {
          setModalVisible(false);
          resetForm();
          showSuccess('Success', 'Caretaker updated');
          await refreshCaretakerBundleSafe();
        } else {
          showError('Error', res.error);
        }
      }
    } catch {
      showError('Error', 'Failed to save caretaker changes');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Revoke ────────────────────────────────────────────────────────────────
  const handleRevokeConfirm = async () => {
    if (!revocationModal.reason.trim()) {
      showError('Error', 'Please provide a reason for revocation');
      return;
    }
    try {
      const res = await CaretakerService.deleteCaretaker(revocationModal.caretaker.id);
      if (res.success) {
        showSuccess('Success', 'Access revoked successfully');
        setRevocationModal({ show: false, caretaker: null, reason: '' });
        await refetchLandlordQueries(caretakerRefetchers);
      } else {
        showError('Error', res.error);
      }
    } catch {
      showError('Error', 'Failed to revoke access');
    }
  };

  // ── Permission toggles ────────────────────────────────────────────────────
  const togglePermission = (key) => {
    const isEnabling = !formData.permissions[key];
    if (isEnabling && LANDLORD_LEVEL_PERMISSION_KEYS.has(key)) {
      setPermissionPrompt({ visible: true, key, isBulk: false, keys: [] });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const toggleGroupAll = (keys) => {
    const allOn = keys.every((k) => !!formData.permissions[k]);
    const nextValue = !allOn;
    if (nextValue === true) {
      const sensitiveKeys = keys.filter((k) => LANDLORD_LEVEL_PERMISSION_KEYS.has(k) && !formData.permissions[k]);
      if (sensitiveKeys.length > 0) {
        setPermissionPrompt({ visible: true, key: null, isBulk: true, keys });
        return;
      }
    }
    applyBulkPermissions(keys, nextValue);
  };

  const toggleSelectAll = () => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const allOn = allKeys.every((k) => !!formData.permissions[k]);
    const nextValue = !allOn;
    if (nextValue === true) {
      const sensitiveKeys = allKeys.filter((k) => LANDLORD_LEVEL_PERMISSION_KEYS.has(k) && !formData.permissions[k]);
      if (sensitiveKeys.length > 0) {
        setPermissionPrompt({ visible: true, key: null, isBulk: true, keys: allKeys });
        return;
      }
    }
    applyBulkPermissions(allKeys, nextValue);
  };

  const applyBulkPermissions = (keys, value) => {
    setFormData((prev) => {
      const newPerms = { ...prev.permissions };
      keys.forEach((k) => { newPerms[k] = value; });
      return { ...prev, permissions: newPerms };
    });
  };

  const toggleGroupExpand = (title) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const confirmPermissionGrant = () => {
    if (permissionPrompt.isBulk) {
      applyBulkPermissions(permissionPrompt.keys, true);
    } else {
      const key = permissionPrompt.key;
      if (!key) {
        setPermissionPrompt({ visible: false, key: null, isBulk: false, keys: [] });
        return;
      }
      setFormData((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, [key]: true },
      }));
    }
    setPermissionPrompt({ visible: false, key: null, isBulk: false, keys: [] });
  };

  const promptedPermissionField = CARETAKER_PERMISSION_FIELDS.find((f) => f.key === permissionPrompt.key);
  const promptedPermissionLabel = promptedPermissionField?.label || 'this permission';
  const promptedPermissionMessage =
    LANDLORD_LEVEL_PERMISSION_MESSAGES[permissionPrompt.key] ||
    'Enabling this grants landlord-level access. Please confirm before proceeding.';

  const toggleProperty = (id) => {
    setFormData((prev) => {
      const exists = prev.propertyIds.includes(id);
      return {
        ...prev,
        propertyIds: exists ? prev.propertyIds.filter((pid) => pid !== id) : [...prev.propertyIds, id],
      };
    });
  };

  // ── List card renderer ────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const activeCount = countActive(item.permissions || {});
    const activeGroupNames = getActiveGroupNames(item.permissions || {});

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {/* Card header: avatar + name + email */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.caretaker.first_name.charAt(0)}{item.caretaker.last_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.cardIdentity}>
            <Text style={styles.name}>
              {item.caretaker.first_name} {item.caretaker.last_name}
            </Text>
            <Text style={styles.email}>{item.caretaker.email}</Text>
          </View>
        </View>

        {/* Properties */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Managed Properties</Text>
        <View style={styles.pillContainer}>
          {item.assigned_properties.length > 0 ? (
            item.assigned_properties.map((p) => (
              <View key={p.id} style={[styles.pill, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.pillText, { color: theme.colors.primary }]}>{p.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No properties assigned</Text>
          )}
        </View>

        {/* Permission summary */}
        <View style={styles.permSummarySection}>
          <Text style={styles.permSummaryLabel}>Permissions</Text>

          {/* Named group pills */}
          {activeGroupNames.length > 0 ? (
            <View style={styles.permGroupPillRow}>
              {activeGroupNames.map((name) => (
                <View key={name} style={styles.permGroupPill}>
                  <Text style={styles.permGroupPillText}>{name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>No permissions granted</Text>
          )}

          {/* Count + progress bar */}
          <View style={styles.permCountRow}>
            <View style={styles.permProgressOuter}>
              <View
                style={[
                  styles.permProgressInner,
                  { width: `${(activeCount / TOTAL_PERMISSIONS) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.permCountText}>{activeCount}/{TOTAL_PERMISSIONS}</Text>
          </View>
        </View>

        {/* Labeled action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('MainTabs', {
                screen: 'Messages',
                params: {
                  startConversation: true,
                  tenant: { ...item.caretaker, user_id: item.caretaker.id },
                  propertyId: item.assigned_property_ids?.[0] || null,
                },
              });
            }}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleResetPassword(item)} style={styles.actionBtn}>
            <Ionicons name="key-outline" size={18} color={theme.colors.warning || '#D97706'} />
            <Text style={styles.actionBtnText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
            <Ionicons name="shield-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRevocationModal({ show: true, caretaker: item, reason: '' })}
            style={styles.actionBtnDanger}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.actionBtnTextDanger}>Revoke</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Permissions tab content ───────────────────────────────────────────────
  const renderPermissionsTab = () => {
    const allKeys = CARETAKER_PERMISSION_FIELDS.map((f) => f.key);
    const allOn = allKeys.every((k) => !!formData.permissions[k]);

    return (
      <>
        {MODULE_GROUPS.map((group) => {
          const isExpanded = expandedGroups.includes(group.title);
          const groupFields = CARETAKER_PERMISSION_FIELDS.filter((f) => group.keys.includes(f.key));
          const activeCount = groupFields.filter((f) => !!formData.permissions[f.key]).length;
          const isModuleActive = activeCount > 0;
          const allGroupOn = groupFields.every((f) => !!formData.permissions[f.key]);

          return (
            <View
              key={group.title}
              style={{
                marginBottom: 10,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: isModuleActive ? theme.colors.primary : theme.colors.border,
                overflow: 'hidden',
              }}
            >
              {/* Group header — tapping expands/collapses only */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isModuleActive ? theme.colors.primary : theme.colors.surface,
              }}>
                <TouchableOpacity
                  onPress={() => toggleGroupExpand(group.title)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}
                >
                  <View style={{
                    padding: 8,
                    backgroundColor: isModuleActive ? 'rgba(255,255,255,0.2)' : theme.colors.background,
                    borderRadius: 10,
                  }}>
                    <Ionicons name={group.icon} size={20} color={isModuleActive ? '#fff' : theme.colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: isModuleActive ? '#fff' : theme.colors.text }}>
                      {group.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: isModuleActive ? 'rgba(255,255,255,0.75)' : theme.colors.textTertiary, marginTop: 1 }}>
                      {activeCount}/{groupFields.length} active
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isModuleActive ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Master switch for the group */}
                <View style={{
                  borderLeftWidth: 1,
                  borderLeftColor: isModuleActive ? 'rgba(255,255,255,0.25)' : theme.colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                }}>
                  <Switch
                    value={allGroupOn}
                    onValueChange={() => toggleGroupAll(group.keys)}
                    trackColor={{ false: theme.colors.border, true: isModuleActive ? 'rgba(255,255,255,0.4)' : theme.colors.primary }}
                    thumbColor={allGroupOn ? '#ffffff' : theme.colors.textTertiary}
                  />
                </View>
              </View>

              {/* Expanded sub-perms */}
              {isExpanded && (
                <View style={{ backgroundColor: theme.colors.background + 'CC' }}>
                  {groupFields.map((field, idx) => {
                    const isOn = !!formData.permissions[field.key];
                    return (
                      <View
                        key={field.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.border + '80',
                          backgroundColor: isOn ? (theme.colors.primary + '12') : 'transparent',
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: isOn ? theme.colors.primary : theme.colors.text }}>
                            {field.label}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                            {field.description}
                          </Text>
                        </View>
                        <Switch
                          value={isOn}
                          onValueChange={() => togglePermission(field.key)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                          thumbColor={isOn ? '#ffffff' : theme.colors.textTertiary}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* "Select All" warning banner — at the bottom */}
        <View style={theme.isDark ? styles.warnBannerDark : styles.warnBanner}>
          <Ionicons
            name="warning-outline"
            size={18}
            color={theme.isDark ? '#FCD34D' : '#92400E'}
          />
          <Text style={theme.isDark ? styles.warnBannerTextDark : styles.warnBannerText}>
            Selecting all grants full landlord-level access to this caretaker.
          </Text>
          <TouchableOpacity
            onPress={toggleSelectAll}
            style={allOn ? styles.warnSelectAllBtnDeselect : styles.warnSelectAllBtn}
          >
            <Text style={styles.warnSelectAllText}>{allOn ? '✕ Clear All' : '✓ All'}</Text>
          </TouchableOpacity>
        </View>

        {/* Properties */}
        <Text style={[styles.sectionHeader, { color: theme.colors.primary, marginTop: 24 }]}>
          Assigned Properties
        </Text>
        {landlordProperties.length > 0 ? (
          landlordProperties.map((prop) => {
            const selected = formData.propertyIds.includes(prop.id);
            return (
              <TouchableOpacity
                key={prop.id}
                style={[
                  styles.checkRow,
                  selected && { backgroundColor: theme.colors.primary + '10' },
                ]}
                onPress={() => toggleProperty(prop.id)}
              >
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={selected ? theme.colors.primary : theme.colors.textTertiary}
                />
                <Text style={selected ? styles.checkSelected : styles.checkLabel}>
                  {prop.name}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
            No properties available yet. You can create this caretaker now and assign properties later.
          </Text>
        )}

        <View style={{ height: 40 }} />
      </>
    );
  };

  // ── Profile tab content ───────────────────────────────────────────────────
  const renderProfileTab = () => (
    <>
      <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>Personal Information</Text>

      {[
        { label: 'First Name', key: 'firstName', placeholder: 'e.g. John', keyboard: 'default' },
        { label: 'Middle Name (Optional)', key: 'middleName', placeholder: 'e.g. Quency', keyboard: 'default' },
        { label: 'Last Name', key: 'lastName', placeholder: 'e.g. Doe', keyboard: 'default' },
        { label: 'Email Address', key: 'email', placeholder: 'caretaker@example.com', keyboard: 'email-address' },
        { label: 'Phone Number (Optional)', key: 'phone', placeholder: '09123456789', keyboard: 'phone-pad' },
      ].map(({ label, key, placeholder, keyboard }) => (
        <React.Fragment key={key}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: fieldErrors[key] ? '#EF4444' : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={formData[key]}
            onChangeText={(t) => {
              setFormData((prev) => ({ ...prev, [key]: t }));
              validateField(key, t);
            }}
            autoCapitalize="none"
            keyboardType={keyboard}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
          />
          {fieldErrors[key] ? <Text style={styles.fieldError}>{fieldErrors[key]}</Text> : null}
        </React.Fragment>
      ))}

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Date of Birth</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={[styles.input, { justifyContent: 'center', borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      >
        <Text style={{ color: formData.dateOfBirth ? theme.colors.text : theme.colors.textTertiary }}>
          {formData.dateOfBirth || 'Select Date of Birth'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              setFormData((prev) => ({ ...prev, dateOfBirth: date.toISOString().split('T')[0] }));
            }
          }}
        />
      )}

      {!isEditing && (
        <>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Account Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0, color: theme.colors.text }]}
              value={formData.password}
              onChangeText={(t) => setFormData((prev) => ({ ...prev, password: t }))}
              secureTextEntry={!showPasswords}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)} style={styles.eyeIcon}>
              <Ionicons name={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Confirm Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0, color: theme.colors.text }]}
              value={formData.passwordConfirmation}
              onChangeText={(t) => setFormData((prev) => ({ ...prev, passwordConfirmation: t }))}
              secureTextEntry={!showPasswords}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </>
  );

  // ── Screen ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caretaker Management</Text>
        <TouchableOpacity
          onPress={() => { resetForm(); setModalVisible(true); }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={caretakers}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No caretakers yet</Text>
              <TouchableOpacity
                style={{ marginTop: 16, backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                onPress={() => { resetForm(); setModalVisible(true); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add First Caretaker</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {isEditing ? 'Edit Caretaker' : 'Add New Caretaker'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* ── Segmented Tab Bar ────────────────────────────────────── */}
            <View style={styles.tabBar}>
              {[
                { key: 'profile', label: isEditing ? 'Profile Info' : '1. Profile Info' },
                { key: 'permissions', label: isEditing ? 'Permissions' : '2. Permissions' },
              ].map((tab) => {
                const active = modalTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabBarItem, active && styles.tabBarItemActive]}
                    onPress={() => setModalTab(tab.key)}
                  >
                    <Text style={active ? styles.tabBarItemTextActive : styles.tabBarItemText}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content */}
            <ScrollView contentContainerStyle={styles.formScroll}>
              {modalTab === 'profile' ? renderProfileTab() : renderPermissionsTab()}
            </ScrollView>

            {/* Footer */}
            <SafeAreaView edges={['bottom']} style={styles.footer}>
              <View style={styles.footerRow}>
                {/* Profile tab: show Next button when creating */}
                {modalTab === 'profile' && !isEditing ? (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => setModalTab('permissions')}
                    >
                      <Text style={styles.saveButtonText}>Next: Permissions →</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {modalTab === 'permissions' && !isEditing && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setModalTab('profile')}
                      >
                        <Text style={styles.cancelButtonText}>← Back</Text>
                      </TouchableOpacity>
                    )}
                    {isEditing && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.saveButton, { flex: isEditing ? 2 : 2 }]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          {isEditing ? 'Save Changes' : 'Confirm & Add Caretaker'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Permission Prompt Modal ──────────────────────────────────────── */}
      <Modal
        visible={permissionPrompt.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#D97706" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
              {permissionPrompt.isBulk ? 'Bulk Access Grant' : 'Landlord-Level Access'}
            </Text>
            <Text style={[styles.alertMsg, { color: theme.colors.textSecondary }]}>
              {permissionPrompt.isBulk
                ? 'You are enabling multiple sensitive features. This grants elevated control over bookings, payments, and system settings. Are you sure?'
                : (
                  <>
                    <Text style={{ fontWeight: 'bold' }}>Enabling {promptedPermissionLabel}</Text>{' '}
                    grants elevated permissions.{'\n'}{promptedPermissionMessage}
                  </>
                )}
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={styles.alertCancel}
                onPress={() => setPermissionPrompt({ visible: false, key: null, isBulk: false, keys: [] })}
              >
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertConfirm, { backgroundColor: '#DC2626' }]}
                onPress={confirmPermissionGrant}
              >
                <Text style={styles.alertConfirmText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Revoke Access Modal ──────────────────────────────────────────── */}
      <Modal
        visible={revocationModal.show}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.alertIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={32} color="#DC2626" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Revoke Access</Text>
            <Text style={[styles.alertMsg, { color: theme.colors.textSecondary }]}>
              Are you sure you want to remove{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {revocationModal.caretaker?.caretaker?.first_name}
              </Text>
              ? This action is permanent.
            </Text>
            <TextInput
              style={[styles.reasonInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={revocationModal.reason}
              onChangeText={(t) => setRevocationModal((prev) => ({ ...prev, reason: t }))}
              placeholder="Reason for Revocation (e.g. End of contract)"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={styles.alertCancel}
                onPress={() => setRevocationModal({ show: false, caretaker: null, reason: '' })}
              >
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertConfirm, { backgroundColor: '#DC2626' }]}
                onPress={handleRevokeConfirm}
              >
                <Text style={styles.alertConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reset Password Modal ─────────────────────────────────────────── */}
      <Modal
        visible={resetPasswordModal.show}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.alertIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="key-outline" size={32} color="#B45309" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Reset Password</Text>

            {!resetPasswordModal.tempPassword ? (
              <Text style={[styles.alertMsg, { color: theme.colors.textSecondary }]}>
                Are you sure you want to reset the password for{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {resetPasswordModal.caretaker?.caretaker?.first_name || 'this caretaker'}
                </Text>
                ? A temporary password will be generated.
              </Text>
            ) : (
              <>
                <Text style={[styles.alertMsg, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  New temporary password generated. Share this with the caretaker.
                </Text>
                <View style={{
                  width: '100%',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 24,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>
                    Temporary Password
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>
                    {resetPasswordModal.tempPassword}
                  </Text>
                </View>
              </>
            )}

            {!resetPasswordModal.tempPassword ? (
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={styles.alertCancel}
                  onPress={() => setResetPasswordModal({ show: false, caretaker: null, loading: false, tempPassword: '' })}
                  disabled={resetPasswordModal.loading}
                >
                  <Text style={styles.alertCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertConfirm, { backgroundColor: '#D97706' }]}
                  onPress={handleResetPasswordConfirm}
                  disabled={resetPasswordModal.loading}
                >
                  {resetPasswordModal.loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.alertConfirmText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.alertConfirm, { backgroundColor: theme.colors.primary, width: '100%' }]}
                onPress={() => setResetPasswordModal({ show: false, caretaker: null, loading: false, tempPassword: '' })}
              >
                <Text style={styles.alertConfirmText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
