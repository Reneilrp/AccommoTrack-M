import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Landlord/MaintenanceRequests.js';
import MaintenanceService from '../../../../services/MaintenanceService.js';
import PropertyService from '../../../../services/PropertyService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_REQUESTS = [];
const EMPTY_PROPERTIES = [];

export default function MaintenanceRequests({ route }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const routePropertyId = route?.params?.propertyId || route?.params?.property?.id;
  const [selectedPropertyId, setSelectedPropertyId] = useState(routePropertyId ? String(routePropertyId) : 'all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

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

  const requestsQuery = useQuery({
    queryKey: landlordQueryKeys.maintenanceRequests({ statusFilter, propertyScope: effectivePropertyScope }),
    queryFn: async () => {
      const params = { status: statusFilter };
      if (effectivePropertyScope && effectivePropertyScope !== 'all') {
        params.property_id = effectivePropertyScope;
      }

      const res = await MaintenanceService.getLandlordRequests(params);
      if (!res.success) {
        throw new Error(res.error || 'Failed to load maintenance requests');
      }

      return res.data || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => MaintenanceService.updateStatus(id, status),
  });

  const requests = requestsQuery.data || EMPTY_REQUESTS;
  const loading = (propertiesQuery.isPending && properties.length === 0) || requestsQuery.isPending;
  const updating = updateStatusMutation.isPending;
  const refetchProperties = propertiesQuery.refetch;
  const refetchRequests = requestsQuery.refetch;
  const maintenanceRefetchers = React.useMemo(
    () => [refetchProperties, refetchRequests],
    [refetchProperties, refetchRequests],
  );

  useLandlordFocusRefetch({ refetchers: maintenanceRefetchers });

  const onRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: maintenanceRefetchers,
  });

  useEffect(() => {
    const fetchError = requestsQuery.error?.message || propertiesQuery.error?.message;
    if (fetchError) {
      showAlert('Error', fetchError || 'Failed to load maintenance requests');
    }
  }, [requestsQuery.error, propertiesQuery.error]);

  useEffect(() => {
    if (!selectedRequest?.id) {
      return;
    }

    const nextSelected = requests.find((item) => item.id === selectedRequest.id);
    if (nextSelected) {
      setSelectedRequest(nextSelected);
    }
  }, [requests, selectedRequest?.id]);

  const [drilldownApplied, setDrilldownApplied] = useState(false);

  useEffect(() => {
    const focusId = route?.params?.focusRequestId;
    if (focusId && !drilldownApplied && requests.length > 0) {
      const target = requests.find(r => String(r.id) === String(focusId));
      if (target) {
        setDrilldownApplied(true);
        setSelectedRequest(target);
        setDetailsVisible(true);
      }
    }
  }, [route?.params?.focusRequestId, requests, drilldownApplied]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await updateStatusMutation.mutateAsync({ id, status: newStatus });

      if (res.success) {
        showAlert('Success', `Request marked as ${newStatus.replace('_', ' ')}`);

        if (selectedRequest?.id === id) {
          setSelectedRequest(prev => ({ ...prev, status: newStatus }));
        }

        await queryClient.invalidateQueries({ queryKey: landlordQueryKeys.maintenanceRequestsRoot() });
      } else {
        showAlert('Error', res.error || 'Failed to update status');
      }
    } catch {
      showAlert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B'; // yellow
      case 'in_progress': return '#3B82F6'; // blue
      case 'completed': return '#16a34a'; // emerald
      case 'cancelled': return '#6B7280'; // gray
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444'; // red
      case 'medium': return '#F59E0B'; // yellow
      case 'low': return '#3B82F6'; // blue
      default: return '#6B7280';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        setSelectedRequest(item);
        setDetailsVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.priorityBadge}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
      <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="home-outline" size={14} color={theme.colors.textTertiary} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            {item.property?.title} • Room {item.booking?.room?.room_number}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>
          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance Requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      {showPropertySelector ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
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

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                statusFilter === status && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === status ? { color: '#FFF' } : { color: theme.colors.text }
              ]}>
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No requests found</Text>
            </View>
          }
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {selectedRequest && (
            <>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Request Details</Text>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{selectedRequest.title}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedRequest.status) }]}>
                        {selectedRequest.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.detailDate, { color: theme.colors.textSecondary }]}>
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Tenant</Text>
                  <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                    {selectedRequest.tenant?.first_name} {selectedRequest.tenant?.last_name}
                  </Text>
                  <Text style={[styles.sectionSubValue, { color: theme.colors.textSecondary }]}>
                    {selectedRequest.property?.title} • Room {selectedRequest.booking?.room?.room_number}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Description</Text>
                  <Text style={[styles.descriptionText, { color: theme.colors.text }]}>{selectedRequest.description}</Text>
                </View>

                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                      {selectedRequest.images.map((img, index) => (
                        <Image
                          key={index}
                          source={{ uri: getImageUrl(img) }}
                          style={styles.detailImage}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </ScrollView>

              {/* Actions Footer */}
              <SafeAreaView edges={['bottom']} style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                {selectedRequest.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Accept & Start</Text>
                  </TouchableOpacity>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#16a34a' }]}
                    onPress={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Mark Completed</Text>
                  </TouchableOpacity>
                )}
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444', marginTop: 8 }]}
                    onPress={() => handleUpdateStatus(selectedRequest.id, 'cancelled')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                )}
              </SafeAreaView>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
