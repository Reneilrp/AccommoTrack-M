import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import AddonService from '../../../../services/AddonService.js';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/AddonManagement.js';
import { showSuccess, showError, showWarning } from '../../../../utils/toast.js';

const EMPTY_ADDONS = [];
const EMPTY_PENDING_REQUESTS = [];
const EMPTY_ACTIVE_ADDONS_DATA = { activeAddons: [], summary: {} };
const EMPTY_PROPERTIES = [];

export default function AddonManagement({ route, navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const contentWrapStyle = useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 960, alignSelf: 'center' } : null),
    [viewportWidth],
  );
  const routePropertyId = route.params?.propertyId || route.params?.property?.id;
  const routePropertyTitle = route.params?.propertyTitle || route.params?.property?.title || route.params?.property?.name;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(routePropertyId ? String(routePropertyId) : 'all');
  const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'requests', 'active'
  const [showModal, setShowModal] = useState(false);
  const [showRejectNoteModal, setShowRejectNoteModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectContext, setRejectContext] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [priceTypeModalVisible, setPriceTypeModalVisible] = useState(false);
  const [addonTypeModalVisible, setAddonTypeModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'monthly',
    addon_type: 'fee',
    stock: '',
    is_active: true
  });

  const minFabDistance = Platform.OS === 'android' ? 72 : 30;
  const fabBottomOffset = Math.max(insets.bottom + 18, minFabDistance);
  const scrollBottomPadding = fabBottomOffset + 86;

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.properties(),
    queryFn: async () => {
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load properties');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_PROPERTIES;
    },
    placeholderData: (previousData) => previousData,
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const propertyLabelMap = useMemo(
    () => new Map(properties.map((property) => [String(property.id), property.title || property.name || `Property ${property.id}`])),
    [properties],
  );
  const propertyIds = useMemo(
    () => properties
      .map((property) => Number(property.id))
      .filter((id) => Number.isFinite(id))
      .sort((left, right) => left - right),
    [properties],
  );
  const propertyIdsKey = useMemo(() => propertyIds.join(','), [propertyIds]);
  const singlePropertyId = properties.length === 1 ? String(properties[0].id) : null;
  const effectivePropertyScope = singlePropertyId || selectedPropertyId;
  const showPropertySelector = properties.length > 1;
  const canCreateAddon = properties.length > 0 && effectivePropertyScope !== 'all';
  const selectedPropertyLabel = useMemo(() => {
    if (effectivePropertyScope === 'all') return 'All Properties';
    return propertyLabelMap.get(String(effectivePropertyScope)) || routePropertyTitle || 'Property';
  }, [effectivePropertyScope, propertyLabelMap, routePropertyTitle]);

  useEffect(() => {
    if (singlePropertyId && selectedPropertyId !== singlePropertyId) {
      setSelectedPropertyId(singlePropertyId);
    }
  }, [singlePropertyId, selectedPropertyId]);

  useEffect(() => {
    const nextRoutePropertyId = route?.params?.propertyId || route?.params?.property?.id;
    if (!nextRoutePropertyId || singlePropertyId) return;
    setSelectedPropertyId(String(nextRoutePropertyId));
  }, [route?.params?.propertyId, route?.params?.property?.id, singlePropertyId]);

  useEffect(() => {
    if (singlePropertyId || selectedPropertyId === 'all') return;
    const hasMatch = properties.some((property) => String(property.id) === String(selectedPropertyId));
    if (!hasMatch) {
      setSelectedPropertyId('all');
    }
  }, [properties, selectedPropertyId, singlePropertyId]);

  const scopedPropertyIds = useMemo(() => {
    if (propertyIds.length === 0) return [];
    if (effectivePropertyScope === 'all') return propertyIds;

    const parsed = Number(effectivePropertyScope);
    if (!Number.isFinite(parsed)) return [];
    return [parsed];
  }, [effectivePropertyScope, propertyIds]);

  const addonsQuery = useQuery({
    queryKey: landlordQueryKeys.propertyAddons({ propertyScope: effectivePropertyScope, propertyIdsKey }),
    enabled: !propertiesQuery.isPending,
    queryFn: async () => {
      if (scopedPropertyIds.length === 0) return EMPTY_ADDONS;

      const results = await Promise.all(
        scopedPropertyIds.map(async (currentPropertyId) => ({
          propertyId: currentPropertyId,
          response: await AddonService.getPropertyAddons(currentPropertyId),
        })),
      );

      const successful = results.filter((item) => item.response?.success);
      if (successful.length === 0) {
        const firstError = results.find((item) => !item.response?.success)?.response?.error;
        throw new Error(firstError || 'Failed to load add-ons');
      }

      return successful
        .flatMap(({ propertyId: currentPropertyId, response }) => {
          const list = Array.isArray(response.data?.addons) ? response.data.addons : EMPTY_ADDONS;
          const propertyLabel = propertyLabelMap.get(String(currentPropertyId)) || `Property ${currentPropertyId}`;
          return list.map((addon) => ({
            ...addon,
            propertyId: currentPropertyId,
            propertyTitle: propertyLabel,
          }));
        })
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    },
    placeholderData: (previousData) => previousData,
  });

  const pendingRequestsQuery = useQuery({
    queryKey: landlordQueryKeys.addonPendingRequests({ propertyScope: effectivePropertyScope, propertyIdsKey }),
    enabled: !propertiesQuery.isPending,
    queryFn: async () => {
      if (scopedPropertyIds.length === 0) return EMPTY_PENDING_REQUESTS;

      const results = await Promise.all(
        scopedPropertyIds.map(async (currentPropertyId) => ({
          propertyId: currentPropertyId,
          response: await AddonService.getPendingRequests(currentPropertyId),
        })),
      );

      const successful = results.filter((item) => item.response?.success);
      if (successful.length === 0) {
        const firstError = results.find((item) => !item.response?.success)?.response?.error;
        throw new Error(firstError || 'Failed to load pending add-on requests');
      }

      return successful
        .flatMap(({ propertyId: currentPropertyId, response }) => {
          const list = Array.isArray(response.data?.pendingRequests)
            ? response.data.pendingRequests
            : EMPTY_PENDING_REQUESTS;
          const propertyLabel = propertyLabelMap.get(String(currentPropertyId)) || `Property ${currentPropertyId}`;
          return list.map((request) => ({
            ...request,
            propertyId: currentPropertyId,
            propertyTitle: propertyLabel,
          }));
        })
        .sort((a, b) => {
          const left = new Date(a.requestedAt || a.requested_at || 0).getTime();
          const right = new Date(b.requestedAt || b.requested_at || 0).getTime();
          return right - left;
        });
    },
    placeholderData: (previousData) => previousData,
  });

  const activeAddonsQuery = useQuery({
    queryKey: landlordQueryKeys.addonActiveAddons({ propertyScope: effectivePropertyScope, propertyIdsKey }),
    enabled: !propertiesQuery.isPending,
    queryFn: async () => {
      if (scopedPropertyIds.length === 0) return EMPTY_ACTIVE_ADDONS_DATA;

      const results = await Promise.all(
        scopedPropertyIds.map(async (currentPropertyId) => ({
          propertyId: currentPropertyId,
          response: await AddonService.getActiveAddons(currentPropertyId),
        })),
      );

      const successful = results.filter((item) => item.response?.success);
      if (successful.length === 0) {
        const firstError = results.find((item) => !item.response?.success)?.response?.error;
        throw new Error(firstError || 'Failed to load active add-ons');
      }

      let totalActive = 0;
      let monthlyRevenue = 0;

      const activeAddons = successful
        .flatMap(({ propertyId: currentPropertyId, response }) => {
          const payload = response.data || EMPTY_ACTIVE_ADDONS_DATA;
          const currentSummary = payload.summary || EMPTY_ACTIVE_ADDONS_DATA.summary;
          const list = Array.isArray(payload.activeAddons)
            ? payload.activeAddons
            : EMPTY_ACTIVE_ADDONS_DATA.activeAddons;

          totalActive += Number(currentSummary.totalActive ?? list.length) || 0;
          monthlyRevenue += Number(currentSummary.monthlyRevenue || 0) || 0;

          const propertyLabel = propertyLabelMap.get(String(currentPropertyId)) || `Property ${currentPropertyId}`;
          return list.map((item) => ({
            ...item,
            propertyId: currentPropertyId,
            propertyTitle: propertyLabel,
          }));
        })
        .sort((a, b) => {
          const left = new Date(a.approvedAt || 0).getTime();
          const right = new Date(b.approvedAt || 0).getTime();
          return right - left;
        });

      return {
        activeAddons,
        summary: {
          totalActive,
          monthlyRevenue,
        },
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const addons = addonsQuery.data || EMPTY_ADDONS;
  const pendingRequests = pendingRequestsQuery.data || EMPTY_PENDING_REQUESTS;
  const activeAddonsData = activeAddonsQuery.data || EMPTY_ACTIVE_ADDONS_DATA;
  const loading =
    (propertiesQuery.isPending && properties.length === 0)
    ||
    (addonsQuery.isPending && addons.length === 0)
    || (pendingRequestsQuery.isPending && pendingRequests.length === 0)
    || (activeAddonsQuery.isPending && !activeAddonsQuery.data);
  const errorMessage =
    propertiesQuery.error?.message
    ||
    addonsQuery.error?.message
    || pendingRequestsQuery.error?.message
    || activeAddonsQuery.error?.message
    || '';

  const refetchProperties = propertiesQuery.refetch;
  const refetchAddons = addonsQuery.refetch;
  const refetchPendingRequests = pendingRequestsQuery.refetch;
  const refetchActiveAddons = activeAddonsQuery.refetch;
  const addonRefetchers = useMemo(
    () => [refetchProperties, refetchAddons, refetchPendingRequests, refetchActiveAddons],
    [refetchProperties, refetchAddons, refetchPendingRequests, refetchActiveAddons],
  );

  useLandlordFocusRefetch({ refetchers: addonRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: addonRefetchers,
  });

  const resolveMutationPropertyId = () => {
    if (editingAddon?.propertyId) {
      const parsedEditingPropertyId = Number(editingAddon.propertyId);
      return Number.isFinite(parsedEditingPropertyId) ? parsedEditingPropertyId : null;
    }

    if (effectivePropertyScope === 'all') return null;

    const parsedScope = Number(effectivePropertyScope);
    return Number.isFinite(parsedScope) ? parsedScope : null;
  };

  const handleOpenCreateModal = () => {
    if (properties.length === 0) {
      showWarning('No Properties', 'Create a property first before adding usage fees.');
      return;
    }

    if (effectivePropertyScope === 'all') {
      showWarning('Select Property', 'Select a specific property before creating a new add-on.');
      return;
    }

    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price) {
      showWarning('Validation', 'Name and Price are required.');
      return;
    }

    const targetPropertyId = resolveMutationPropertyId();
    if (!targetPropertyId) {
      showWarning('Select Property', 'Select a specific property before saving this add-on.');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : null
      };

      let res;
      if (editingAddon) {
        res = await AddonService.updateAddon(targetPropertyId, editingAddon.id, data);
      } else {
        res = await AddonService.createAddon(targetPropertyId, data);
      }

      if (res.success) {
        setShowModal(false);
        resetForm();
        await refetchLandlordQueries(addonRefetchers);
        showSuccess('Success', `Add-on ${editingAddon ? 'updated' : 'created'} successfully.`);
      } else {
        showError('Error', res.error || 'Failed to save addon');
      }
    } catch (_error) {
      showError('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (addon) => {
    const targetPropertyId = Number(addon?.propertyId);
    if (!Number.isFinite(targetPropertyId)) {
      showError('Error', 'Unable to determine the property for this add-on.');
      return;
    }

    Alert.alert(
      'Delete Add-on',
      'Are you sure you want to delete this add-on? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await AddonService.deleteAddon(targetPropertyId, addon.id);
            if (res.success) {
              await refetchLandlordQueries(addonRefetchers);
              showSuccess('Deleted', 'Add-on deleted successfully.');
            } else {
              showError('Error', res.error || 'Failed to delete addon');
            }
          }
        }
      ]
    );
  };

  const handleRequest = (bookingId, addonId, action, approvedPrice = null) => {
    if (action === 'reject') {
      setRejectContext({ bookingId, addonId });
      setRejectNote('');
      setShowRejectNoteModal(true);
    } else {
      Alert.alert(
        'Approve Request',
        'Approve this add-on request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => processRequestAction(bookingId, addonId, 'approve', null, approvedPrice)
          }
        ]
      );
    }
  };

  const handleSubmitReject = async () => {
    if (!rejectContext) return;
    const { bookingId, addonId } = rejectContext;
    await processRequestAction(bookingId, addonId, 'reject', rejectNote.trim() || null);
    setShowRejectNoteModal(false);
    setRejectContext(null);
    setRejectNote('');
  };

  const processRequestAction = async (bookingId, addonId, action, note = null, approvedPrice = null) => {
    const res = await AddonService.handleAddonRequest(bookingId, addonId, action, note, approvedPrice);
    if (res.success) {
      await refetchLandlordQueries(addonRefetchers);
      showSuccess('Success', `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
    } else {
      showError('Error', res.error || `Failed to ${action} request`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      price_type: 'monthly',
      addon_type: 'fee',
      stock: '',
      is_active: true
    });
    setEditingAddon(null);
  };

  const openEditModal = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price.toString(),
      price_type: addon.price_type,
      addon_type: addon.addon_type,
      stock: addon.stock?.toString() || '',
      is_active: addon.is_active
    });
    setShowModal(true);
  };

  const renderManageTab = () => {
    if (addons.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No add-ons yet</Text>
          <Text style={styles.emptySubtitle}>Create add-ons to offer extra usage fees or rentals to your tenants.</Text>
        </View>
      );
    }

    return (
      <View>
        {addons.map((addon) => (
          <View key={addon.id} style={[styles.addonCard, !addon.is_active && styles.inactiveAddonCard]}>
            <View style={styles.addonHeader}>
              <View style={styles.addonNameContainer}>
                <Text style={styles.addonName}>{addon.name}</Text>
                {effectivePropertyScope === 'all' ? (
                  <Text style={[styles.tenantRoom, { marginTop: 2 }]}>{addon.propertyTitle}</Text>
                ) : null}
                {!addon.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>
              <View style={styles.addonActions}>
                <TouchableOpacity
                  style={[styles.actionIconButton, styles.editIconButton]}
                  onPress={() => openEditModal(addon)}
                >
                  <Ionicons name="pencil" size={16} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconButton, styles.deleteIconButton]}
                  onPress={() => handleDelete(addon)}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, addon.price_type === 'monthly' ? styles.monthlyBadge : styles.oneTimeBadge]}>
                <Text style={addon.price_type === 'monthly' ? styles.monthlyBadgeText : styles.oneTimeBadgeText}>
                  {addon.price_type_label}
                </Text>
              </View>
              <View style={[styles.typeBadge, addon.addon_type === 'rental' ? styles.rentalBadge : styles.feeBadge]}>
                <Text style={addon.addon_type === 'rental' ? styles.rentalBadgeText : styles.feeBadgeText}>
                  {addon.addon_type_label}
                </Text>
              </View>
            </View>

            {addon.description ? <Text style={styles.addonDescription}>{addon.description}</Text> : null}

            <Text style={styles.addonPrice}>
              ₱{parseFloat(addon.price).toLocaleString()}
              {addon.price_type === 'monthly' && <Text style={styles.priceUnit}>/month</Text>}
            </Text>

            {addon.stock !== null && (
              <Text style={styles.addonStock}>Stock: {addon.stock}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderRequestsTab = () => {
    if (pendingRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>Requests from tenants for usage fees or rentals will appear here.</Text>
        </View>
      );
    }

    return (
      <View>
        {pendingRequests.map((request) => (
          <View key={request.requestId} style={styles.requestCard}>
            <View style={request.is_active === false ? [styles.requestHeader, { opacity: 0.6 }] : styles.requestHeader}>
              <View style={styles.flex1}>
                <Text style={styles.addonName}>{request.addonName}</Text>
                <View style={styles.requestTenantInfo}>
                  <Text style={styles.tenantName}>{request.tenant.name}</Text>
                  <Text style={styles.tenantRoom}>Room {request.roomNumber}</Text>
                </View>
                {effectivePropertyScope === 'all' ? (
                  <Text style={[styles.tenantRoom, { marginTop: 2 }]}>{request.propertyTitle}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.addonPrice}>₱{parseFloat(request.price).toLocaleString()}</Text>
                <View style={[styles.typeBadge, request.priceType === 'monthly' ? styles.monthlyBadge : styles.oneTimeBadge]}>
                  <Text style={request.priceType === 'monthly' ? styles.monthlyBadgeText : styles.oneTimeBadgeText}>
                    {request.priceType === 'monthly' ? 'Monthly' : 'One-time'}
                  </Text>
                </View>
              </View>
            </View>

            {request.requestNote ? (
              <View style={styles.requestNote}>
                <Text style={{ fontStyle: 'italic', color: '#4B5563' }}>"{request.requestNote}"</Text>
              </View>
            ) : null}

            <Text style={styles.requestDate}>
              Requested: {new Date(request.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleRequest(request.bookingId, request.addonId, 'approve', request.price)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRequest(request.bookingId, request.addonId, 'reject')}
              >
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderActiveTab = () => {
    const { activeAddons, summary } = activeAddonsData;

    return (
      <View>
        <View style={styles.activeSummary}>
          <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.summaryLabel, { color: '#166534' }]}>Subscriptions</Text>
            <Text style={[styles.summaryValue, { color: '#166534' }]}>{summary?.totalActive || 0}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.summaryLabel, { color: '#1D4ED8' }]}>Monthly Revenue</Text>
            <Text style={[styles.summaryValue, { color: '#1D4ED8' }]}>₱{(summary?.monthlyRevenue || 0).toLocaleString()}</Text>
          </View>
        </View>

        {activeAddons && activeAddons.length > 0 ? (
          activeAddons.map((item) => (
            <View key={item.requestId} style={styles.activeItemCard}>
              <View style={styles.flex1}>
                <Text style={styles.addonName}>{item.addonName}</Text>
                <Text style={styles.tenantName}>{item.tenantName}</Text>
                <Text style={styles.tenantRoom}>Room {item.roomNumber}</Text>
                {effectivePropertyScope === 'all' ? (
                  <Text style={[styles.tenantRoom, { marginTop: 2 }]}>{item.propertyTitle}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.addonPrice}>
                  ₱{parseFloat(item.price).toLocaleString()}
                  {item.priceType === 'monthly' && <Text style={styles.priceUnit}>/mo</Text>}
                </Text>
                <View style={[styles.activeItemStatus, styles.activeStatusBadge]}>
                  <Text style={styles.activeStatusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No active add-ons</Text>
            <Text style={styles.emptySubtitle}>Once requests are approved, active subscriptions will appear here.</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading add-on data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add-on Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerSubtitle}>
        <Text style={styles.subtitleText}>
          {selectedPropertyLabel} • Extra usage fees and rentals
        </Text>
      </View>

      {showPropertySelector ? (
        <View style={[{ paddingHorizontal: 16, paddingTop: 12 }, contentWrapStyle]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selectedPropertyId === 'all' ? theme.colors.primary : theme.colors.border,
                backgroundColor: selectedPropertyId === 'all' ? theme.colors.primary : theme.colors.surface,
              }}
              onPress={() => setSelectedPropertyId('all')}
            >
              <Text style={{ color: selectedPropertyId === 'all' ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                All Properties
              </Text>
            </TouchableOpacity>
            {properties.map((property) => {
              const propertyKey = String(property.id);
              const isActive = propertyKey === selectedPropertyId;
              return (
                <TouchableOpacity
                  key={property.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  }}
                  onPress={() => setSelectedPropertyId(propertyKey)}
                >
                  <Text style={{ color: isActive ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                    {property.title || property.name || `Property ${property.id}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'manage', label: 'Manage', icon: 'sparkles', count: addons.length },
          { id: 'requests', label: 'Requests', icon: 'notifications', count: pendingRequests.length },
          { id: 'active', label: 'Active', icon: 'checkmark-circle', count: activeAddonsData.summary?.totalActive || 0 }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon + (activeTab === tab.id ? '' : '-outline')}
              size={18}
              color={activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, { color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary }, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.backgroundSecondary }, activeTab === tab.id && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === tab.id ? '#FFFFFF' : theme.colors.textSecondary }, activeTab === tab.id && styles.activeTabBadgeText]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentWrapStyle, { paddingBottom: scrollBottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.isDark ? 'rgba(153,27,27,0.1)' : '#FEF2F2' }]}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {activeTab === 'manage' && renderManageTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'active' && renderActiveTab()}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fabButton, { bottom: fabBottomOffset }, !canCreateAddon && styles.fabButtonMuted]}
        onPress={handleOpenCreateModal}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAddon ? 'Edit Add-on' : 'Create Add-on'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Rice Cooker, Wi-Fi Upgrade"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Brief description of the add-on"
                  multiline
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Price (₱) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text.replace(/[^0-9.]/g, '') })}
                    placeholder="100.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Price Type *</Text>
                  <TouchableOpacity
                    style={styles.selectTrigger}
                    onPress={() => setPriceTypeModalVisible(true)}
                  >
                    <Text style={styles.selectTriggerText}>
                      {formData.price_type === 'monthly' ? 'Monthly' : 'One-time'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Add-on Type *</Text>
                  <TouchableOpacity
                    style={styles.selectTrigger}
                    onPress={() => setAddonTypeModalVisible(true)}
                  >
                    <Text style={styles.selectTriggerText}>
                      {formData.addon_type === 'fee' ? 'Usage Fee' : 'Rental'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Stock (Rentals)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text.replace(/[^0-9]/g, '') })}
                    placeholder="Unlimited"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
              >
                <View style={[styles.checkbox, formData.is_active && styles.checkboxChecked]}>
                  {formData.is_active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Active (visible to tenants)</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>{editingAddon ? 'Update' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectNoteModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowRejectNoteModal(false);
          setRejectContext(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectNoteModal(false);
                  setRejectContext(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reason for rejection (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  placeholder="Add a note for the tenant"
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectNoteModal(false);
                  setRejectContext(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSubmitReject}
              >
                <Text style={styles.saveButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selection Modals */}
      <Modal
        visible={priceTypeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setPriceTypeModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setPriceTypeModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.modalTitle, { marginBottom: 20 }]}>Select Price Type</Text>
            {[
              { label: 'Monthly', value: 'monthly' },
              { label: 'One-time', value: 'one_time' }
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = formData.price_type === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    setFormData({ ...formData, price_type: option.value });
                    setPriceTypeModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setPriceTypeModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={addonTypeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setAddonTypeModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setAddonTypeModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.modalTitle, { marginBottom: 20 }]}>Select Add-on Type</Text>
            {[
              { label: 'Usage Fee', value: 'fee' },
              { label: 'Rental', value: 'rental' }
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = formData.addon_type === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    setFormData({ ...formData, addon_type: option.value });
                    setAddonTypeModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setAddonTypeModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
