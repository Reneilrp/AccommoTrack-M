import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Landlord/MaintenanceRequests'; // I will create this next
import MaintenanceService from '../../../services/MaintenanceService';
import { useTheme } from '../../../contexts/ThemeContext';
import { BASE_URL } from '../../../config';

export default function MaintenanceRequests() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    const res = await MaintenanceService.getLandlordRequests({ status: statusFilter });
    if (res.success) {
      setRequests(res.data || []);
    } else {
      // Alert.alert('Error', res.error);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdating(true);
    const res = await MaintenanceService.updateStatus(id, newStatus);
    setUpdating(false);
    
    if (res.success) {
      Alert.alert('Success', `Request marked as ${newStatus.replace('_', ' ')}`);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => ({ ...prev, status: newStatus }));
      }
      setDetailsVisible(false);
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B'; // yellow
      case 'in_progress': return '#3B82F6'; // blue
      case 'completed': return '#10B981'; // green
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

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\/?(storage\/)?/, '');
    return `${BASE_URL}/storage/${cleanPath}`;
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
          {new Date(item.created_at).toLocaleDateString()}
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
        <View style={{ width: 24 }} />
      </View>

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
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
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
