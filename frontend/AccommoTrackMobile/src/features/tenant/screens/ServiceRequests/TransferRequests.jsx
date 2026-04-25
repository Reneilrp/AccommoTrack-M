import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import TenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { showError, showSuccess } from '../../../../utils/toast.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

const STATUS_META = {
  pending: {
    label: 'Pending',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
  },
  approved: {
    label: 'Approved',
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  rejected: {
    label: 'Rejected',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#F8FAFC',
    text: '#475569',
    border: '#CBD5E1',
  },
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  
  return `${y}-${m}-${d} ${h}:${min}`;
};

const resolveRoomLabel = (room) => {
  if (!room) return 'N/A';
  const label = room.room_number || room.roomNumber || room.name || (room.id ? `Room #${room.id}` : '');
  return label || 'N/A';
};

const resolvePropertyLabel = (request) => {
  return (
    request?.property?.title ||
    request?.booking?.property?.title ||
    request?.property_title ||
    (request?.booking_id ? `Booking #${request.booking_id}` : 'Current Stay')
  );
};

export default function TransferRequests({ hideHeader = false, historyOnly = false }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const transferRequestsQuery = useQuery({
    queryKey: tenantQueryKeys.transferRequests(),
    queryFn: async () => {
      const res = await TenantService.getTransferRequests();
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to load transfer requests');
      }

      return Array.isArray(res.data) ? res.data : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const requests = transferRequestsQuery.data || [];
  const loading = transferRequestsQuery.isLoading;
  const isError = transferRequestsQuery.isError;
  const error = transferRequestsQuery.error;
  const refetchTransferRequests = transferRequestsQuery.refetch;
  const transferRefetchers = useMemo(() => [refetchTransferRequests], [refetchTransferRequests]);

  useTenantFocusRefetch({ enabled: !historyOnly, refetchers: transferRefetchers });

  const onRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: transferRefetchers,
  });

  const pendingRequests = requests.filter(
    (item) => String(item?.status || '').toLowerCase() === 'pending',
  );

  const processedRequests = requests.filter(
    (item) => String(item?.status || '').toLowerCase() !== 'pending',
  );

  const handleCancelTransfer = (request) => {
    const transferId = request?.id;
    if (!transferId) {
      showError('Error', 'Transfer request ID is missing.');
      return;
    }

    Alert.alert('Cancel Transfer Request', 'Are you sure you want to cancel this pending transfer request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(transferId);
          try {
            const result = await TenantService.cancelTransferRequest(transferId);
            if (result?.success) {
              showSuccess(result?.message || 'Transfer request cancelled.');
              await refetchTransferRequests();
            } else {
              showError('Error', result?.error || result?.message || 'Failed to cancel transfer request.');
            }
          } catch (_error) {
            showError('Error', 'Failed to cancel transfer request.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  if (loading && requests.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: theme.colors.text }}>Failed to load transfers</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' }}>{error?.message || 'Something went wrong'}</Text>
        <TouchableOpacity 
          onPress={() => refetchTransferRequests()}
          style={{ marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
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
      {!hideHeader && (
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 12 }}>
          Transfer Requests
        </Text>
      )}

      {!historyOnly && (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '700', marginBottom: 6 }}>
            Request New Transfer
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 10 }}>
            Transfer requests need booking context (current room and target room). Start from My Bookings to submit one.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyBookings')}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Open My Bookings</Text>
          </TouchableOpacity>
        </View>
      )}

      {[{ title: 'Pending Transfers', data: pendingRequests }, { title: 'Transfer History', data: processedRequests }].map((section) => (
        <View key={section.title} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>
            {section.title}
          </Text>

          {section.data.length === 0 ? (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                No {section.title.toLowerCase()} yet.
              </Text>
            </View>
          ) : (
            section.data.map((request) => {
              const status = String(request?.status || 'pending').toLowerCase();
              const meta = STATUS_META[status] || STATUS_META.pending;
              const currentRoomLabel =
                resolveRoomLabel(request?.current_room) || resolveRoomLabel(request?.source_room);
              const requestedRoomLabel =
                resolveRoomLabel(request?.requested_room) || resolveRoomLabel(request?.target_room);

              const isProxy = String(request?.booking?.booking_mode || request?.booking?.bookingMode || '').toLowerCase() === 'proxy';

              return (
                <View
                  key={String(request?.id || `${request?.booking_id}-${request?.created_at}`)}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '700', flex: 1, paddingRight: 8 }}>
                      {resolvePropertyLabel(request)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {isProxy && (
                        <View
                          style={{
                            backgroundColor: '#F3E8FF',
                            borderWidth: 1,
                            borderColor: '#D8B4FE',
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ color: '#7E22CE', fontSize: 11, fontWeight: '700' }}>Proxy</Text>
                        </View>
                      )}
                      <View
                        style={{
                          backgroundColor: meta.bg,
                          borderWidth: 1,
                          borderColor: meta.border,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ color: meta.text, fontSize: 11, fontWeight: '700' }}>{meta.label}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                    From: {currentRoomLabel}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                    To: {requestedRoomLabel}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                    Submitted: {formatDateTime(request?.created_at)}
                  </Text>
                  {request?.reason ? (
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>
                      Reason: {request.reason}
                    </Text>
                  ) : null}

                  {!historyOnly && status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => handleCancelTransfer(request)}
                      disabled={cancellingId === request?.id}
                      style={{
                        marginTop: 10,
                        alignSelf: 'flex-start',
                        backgroundColor: '#DC2626',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        opacity: cancellingId === request?.id ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        {cancellingId === request?.id ? 'Cancelling...' : 'Cancel Request'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      ))}
    </ScrollView>
  );
}
