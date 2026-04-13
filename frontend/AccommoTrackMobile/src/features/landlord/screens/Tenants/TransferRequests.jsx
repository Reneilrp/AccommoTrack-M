import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/TransferRequests.js';

const EMPTY_TRANSFER_REQUESTS = [];
const EMPTY_PROPERTIES = [];

export default function TransferRequests({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const routePropertyId = route?.params?.propertyId || route?.params?.property?.id;
  const [selectedPropertyId, setSelectedPropertyId] = useState(routePropertyId ? String(routePropertyId) : 'all');
  const [actionError, setActionError] = useState('');
  
  const [handlingAction, setHandlingAction] = useState('');
  const [approvingTransferId, setApprovingTransferId] = useState(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [activeApprovalRequest, setActiveApprovalRequest] = useState(null);
  const [transferForms, setTransferForms] = useState({});

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
  const singlePropertyId = properties.length === 1 ? String(properties[0].id) : null;
  const effectivePropertyScope = singlePropertyId || selectedPropertyId;
  const showPropertySelector = properties.length > 1;

  React.useEffect(() => {
    if (singlePropertyId && selectedPropertyId !== singlePropertyId) {
      setSelectedPropertyId(singlePropertyId);
    }
  }, [singlePropertyId, selectedPropertyId]);

  React.useEffect(() => {
    const nextRoutePropertyId = route?.params?.propertyId || route?.params?.property?.id;
    if (!nextRoutePropertyId || singlePropertyId) return;
    setSelectedPropertyId(String(nextRoutePropertyId));
  }, [route?.params?.propertyId, route?.params?.property?.id, singlePropertyId]);

  React.useEffect(() => {
    if (singlePropertyId || selectedPropertyId === 'all') return;
    const hasMatch = properties.some((property) => String(property.id) === String(selectedPropertyId));
    if (!hasMatch) {
      setSelectedPropertyId('all');
    }
  }, [properties, selectedPropertyId, singlePropertyId]);

  const transferRequestsQuery = useQuery({
    queryKey: landlordQueryKeys.transferRequests({ propertyScope: effectivePropertyScope }),
    queryFn: async () => {
      const params = {};
      if (effectivePropertyScope && effectivePropertyScope !== 'all') {
        params.property_id = effectivePropertyScope;
      }

      const response = await PropertyService.getTransferRequests(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transfer requests');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_TRANSFER_REQUESTS;
    },
    placeholderData: (previousData) => previousData,
  });

  const requests = transferRequestsQuery.data || EMPTY_TRANSFER_REQUESTS;
  const loading = ((propertiesQuery.isPending && properties.length === 0) || transferRequestsQuery.isPending) && requests.length === 0;
  const fetchError = transferRequestsQuery.error?.message || propertiesQuery.error?.message || '';
  const refetchProperties = propertiesQuery.refetch;
  const refetchTransferRequests = transferRequestsQuery.refetch;
  const transferRefetchers = useMemo(
    () => [refetchProperties, refetchTransferRequests],
    [refetchProperties, refetchTransferRequests],
  );

  useLandlordFocusRefetch({ refetchers: transferRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: transferRefetchers,
  });

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(item => String(item.status || '').toLowerCase() === statusFilter);
  }, [requests, statusFilter]);

  const updateTransferForm = (transferId, patch) => {
    setTransferForms((prev) => ({
      ...prev,
      [transferId]: {
        ...(prev[transferId] || {
          damage_charge: '',
          damage_description: '',
          transfer_fee: '',
          landlord_notes: '',
          prorated_adjustment: '',
          prorationDetails: null,
          loadingProration: false,
        }),
        ...patch,
      },
    }));
  };

  const getTransferForm = (transferId) => {
    return transferForms[transferId] || {
      damage_charge: '',
      damage_description: '',
      transfer_fee: '',
      landlord_notes: '',
      prorated_adjustment: '',
      prorationDetails: null,
      loadingProration: false,
    };
  };

  const closeApprovalModal = () => {
    setApprovalModalVisible(false);
    setApprovingTransferId(null);
    setActiveApprovalRequest(null);
  };

  const startTransferApproval = async (transferId) => {
    const targetRequest = requests.find(item => item.id === transferId) || null;
    if (!targetRequest) return;

    setApprovingTransferId(transferId);
    setActiveApprovalRequest(targetRequest);
    setApprovalModalVisible(true);
    updateTransferForm(transferId, { loadingProration: true });
    try {
      const res = await PropertyService.getTransferProration(transferId);
      if (res.success) {
        const details = res.data;
        updateTransferForm(transferId, {
          prorationDetails: details,
          prorated_adjustment: (details?.suggested_adjustment ?? '').toString(),
          transfer_fee: (details?.quoted_transfer_fee ?? details?.transfer_fee ?? 0).toString(),
          loadingProration: false,
        });
      } else {
        updateTransferForm(transferId, { loadingProration: false, prorationDetails: null });
        showAlert('Error', 'Failed to calculate rent proration details');
      }
    } catch (_err) {
      updateTransferForm(transferId, { loadingProration: false, prorationDetails: null });
    }
  };

  const handleAction = async (transferId, action) => {
    const form = getTransferForm(transferId);
    const damageCharge = Number(form.damage_charge || 0);
    const landlordNotes = String(form.landlord_notes || '').trim();

    if (action === 'approve' && damageCharge > 0 && !String(form.damage_description || '').trim()) {
      showAlert('Error', 'Damage description is required when damage charge is set.');
      return;
    }

    if (action === 'reject' && !landlordNotes) {
      showAlert('Error', 'Please provide a reason before rejecting this request.');
      return;
    }

    setHandlingAction(action);
    const payload = {
      action,
      landlord_notes: landlordNotes || undefined,
      damage_charge: damageCharge > 0 ? damageCharge : undefined,
      damage_description: damageCharge > 0 ? String(form.damage_description || '').trim() : undefined,
      transfer_fee: form.transfer_fee !== '' ? Number(form.transfer_fee) : undefined,
      prorated_adjustment: form.prorated_adjustment !== '' ? Number(form.prorated_adjustment) : undefined,
    };

    try {
      const res = await PropertyService.handleTransferRequest(transferId, payload);
      if (res.success) {
        showAlert('Success', `Transfer request ${action}d successfully`);
        setActionError('');
        await refetchLandlordQueries(transferRefetchers);
        if (action === 'approve') {
          closeApprovalModal();
        }
      } else {
        setActionError(res.error || `Failed to ${action} transfer request`);
        showAlert('Error', res.error || `Failed to ${action} transfer request`);
      }
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
      setActionError(`Failed to ${action} transfer request. Please try again.`);
    } finally {
      setHandlingAction('');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'approved': return { bg: '#DCFCE7', text: '#166534' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'cancelled': return { bg: '#F3F4F6', text: '#4B5563' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getTenantName = (req) => {
    const tenant = req.tenant || {};
    return `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant';
  };

  const approvalForm = approvingTransferId ? getTransferForm(approvingTransferId) : null;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.emptyTitle}>Loading transfer requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      {showPropertySelector ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
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

      <View style={{ padding: 16, paddingBottom: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(filter => (
            <TouchableOpacity 
              key={filter}
              style={[styles.filterTab, statusFilter === filter && styles.activeFilterTab]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterTabText, statusFilter === filter && styles.activeFilterTabText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#16a34a']} />}
      >
        {(fetchError || actionError) ? (
          <View
            style={{
              marginHorizontal: 2,
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

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>No requests found</Text>
          </View>
        ) : (
          filteredRequests.map(req => {
            const statusColors = getStatusColor(req.status);
            const form = getTransferForm(req.id);

            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.tenantName}>{getTenantName(req)}</Text>
                    <Text style={styles.dateText}>Requested: {formatDate(req.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>{req.status}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Property</Text>
                    <Text style={styles.detailValue}>{req.requested_room?.property?.title || 'Property'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From Room</Text>
                    <Text style={styles.detailValue}>{req.current_room?.room_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To Room</Text>
                    <Text style={styles.detailValue}>{req.requested_room?.room_number || 'N/A'}</Text>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.detailLabel}>Reason for Transfer</Text>
                    <Text style={styles.reasonText}>{req.reason || 'No reason provided'}</Text>
                  </View>
                </View>

                {req.status === 'pending' && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleAction(req.id, 'reject')}
                      disabled={Boolean(handlingAction)}
                    >
                      <Text style={styles.actionButtonTextDark}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => startTransferApproval(req.id)}
                      disabled={Boolean(handlingAction)}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {req.status === 'pending' && (
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Landlord Notes / Rejection Reason"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={form.landlord_notes}
                      onChangeText={(val) => updateTransferForm(req.id, { landlord_notes: val })}
                      multiline
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={approvalModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeApprovalModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Approval</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeApprovalModal}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {activeApprovalRequest && (
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tenant</Text>
                    <Text style={styles.detailValue}>{getTenantName(activeApprovalRequest)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From Room</Text>
                    <Text style={styles.detailValue}>{activeApprovalRequest.current_room?.room_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To Room</Text>
                    <Text style={styles.detailValue}>{activeApprovalRequest.requested_room?.room_number || 'N/A'}</Text>
                  </View>
                </View>
              )}

              {approvalForm && approvingTransferId && (
                <>
                  <View style={styles.prorationCard}>
                    <Text style={styles.prorationTitle}>Rent Proration & Credit Details</Text>

                    {approvalForm.loadingProration ? (
                      <ActivityIndicator size="small" color="#1D4ED8" />
                    ) : approvalForm.prorationDetails ? (
                      <View>
                        <View style={styles.prorationRow}>
                          <Text style={styles.prorationLabel}>Remaining Days</Text>
                          <Text style={styles.prorationValue}>{approvalForm.prorationDetails.remaining_days} days</Text>
                        </View>
                        <View style={styles.prorationRow}>
                          <Text style={styles.prorationLabel}>Unused Value</Text>
                          <Text style={styles.prorationValue}>₱{Number(approvalForm.prorationDetails.old_room_unused_value || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.prorationDivider} />
                        <View style={styles.prorationRow}>
                          <Text style={styles.prorationLabel}>Rate Adjustment</Text>
                          <Text style={styles.prorationValue}>
                            {approvalForm.prorationDetails.suggested_adjustment > 0 ? '+' : ''}
                            ₱{Number(approvalForm.prorationDetails.suggested_adjustment || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: '#EF4444' }}>Failed to load proration.</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Transfer Processing Fee (₱)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={approvalForm.transfer_fee}
                      onChangeText={(val) => updateTransferForm(approvingTransferId, { transfer_fee: val })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Rate Adjustment Override (₱)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={approvalForm.prorated_adjustment}
                      onChangeText={(val) => updateTransferForm(approvingTransferId, { prorated_adjustment: val })}
                      placeholder="Leave empty to use credit only"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Damage Charge (₱)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={approvalForm.damage_charge}
                      onChangeText={(val) => updateTransferForm(approvingTransferId, { damage_charge: val })}
                      placeholder="Optional"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  {Number(approvalForm.damage_charge) > 0 && (
                    <View style={styles.inputGroup}>
                      <TextInput
                        style={styles.input}
                        value={approvalForm.damage_description}
                        onChangeText={(val) => updateTransferForm(approvingTransferId, { damage_description: val })}
                        placeholder="Damage description"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Landlord Notes"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={approvalForm.landlord_notes}
                      onChangeText={(val) => updateTransferForm(approvingTransferId, { landlord_notes: val })}
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleAction(approvingTransferId, 'approve')}
                    disabled={Boolean(handlingAction)}
                  >
                    <Text style={styles.actionButtonText}>
                      {handlingAction === 'approve' ? 'Approving...' : 'Confirm Approval'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeApprovalModal}
                    disabled={Boolean(handlingAction)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
