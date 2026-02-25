import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../../contexts/ThemeContext';
import AddonService from '../../../services/AddonService';
import { getStyles } from '../../../styles/Landlord/AddonManagement';

export default function AddonManagement({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { propertyId, propertyTitle } = route.params || {};

  const [addons, setAddons] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeAddonsData, setActiveAddonsData] = useState({ activeAddons: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'requests', 'active'
  const [showModal, setShowModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'monthly',
    addon_type: 'fee',
    stock: '',
    is_active: true
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!propertyId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [addonsRes, pendingRes, activeRes] = await Promise.all([
        AddonService.getPropertyAddons(propertyId),
        AddonService.getPendingRequests(propertyId),
        AddonService.getActiveAddons(propertyId)
      ]);

      if (addonsRes.success) setAddons(addonsRes.data?.addons || []);
      if (pendingRes.success) setPendingRequests(pendingRes.data?.pendingRequests || []);
      if (activeRes.success) setActiveAddonsData(activeRes.data || { activeAddons: [], summary: {} });

    } catch (error) {
      console.error('Error fetching addon data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert('Validation', 'Name and Price are required.');
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
        res = await AddonService.updateAddon(propertyId, editingAddon.id, data);
      } else {
        res = await AddonService.createAddon(propertyId, data);
      }

      if (res.success) {
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        Alert.alert('Error', res.error || 'Failed to save addon');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (addonId) => {
    Alert.alert(
      'Delete Add-on',
      'Are you sure you want to delete this add-on? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const res = await AddonService.deleteAddon(propertyId, addonId);
            if (res.success) {
              fetchData();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete addon');
            }
          }
        }
      ]
    );
  };

  const handleRequest = (bookingId, addonId, action) => {
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject';
    
    if (action === 'reject') {
      // For mobile simplicity, we can just reject or ask for note via prompt if supported
      // Alert.prompt is iOS only, so we'll use a simple confirmation for now
      Alert.alert(
        'Reject Request',
        'Are you sure you want to reject this request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reject', 
            style: 'destructive',
            onPress: () => processRequestAction(bookingId, addonId, 'reject')
          }
        ]
      );
    } else {
      Alert.alert(
        'Approve Request',
        'Approve this add-on request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Approve', 
            onPress: () => processRequestAction(bookingId, addonId, 'approve')
          }
        ]
      );
    }
  };

  const processRequestAction = async (bookingId, addonId, action, note = null) => {
    const res = await AddonService.handleAddonRequest(bookingId, addonId, action, note);
    if (res.success) {
      fetchData();
    } else {
      Alert.alert('Error', res.error || `Failed to ${action} request`);
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
      price_type: addon.priceType,
      addon_type: addon.addonType,
      stock: addon.stock?.toString() || '',
      is_active: addon.isActive
    });
    setShowModal(true);
  };

  const renderManageTab = () => {
    if (addons.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No add-ons yet</Text>
          <Text style={styles.emptySubtitle}>Create add-ons to offer extra services or rentals to your tenants.</Text>
        </View>
      );
    }

    return (
      <View>
        {addons.map((addon) => (
          <View key={addon.id} style={[styles.addonCard, !addon.isActive && styles.inactiveAddonCard]}>
            <View style={styles.addonHeader}>
              <View style={styles.addonNameContainer}>
                <Text style={styles.addonName}>{addon.name}</Text>
                {!addon.isActive && (
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
                  onPress={() => handleDelete(addon.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, addon.priceType === 'monthly' ? styles.monthlyBadge : styles.oneTimeBadge]}>
                <Text style={addon.priceType === 'monthly' ? styles.monthlyBadgeText : styles.oneTimeBadgeText}>
                  {addon.priceTypeLabel}
                </Text>
              </View>
              <View style={[styles.typeBadge, addon.addonType === 'rental' ? styles.rentalBadge : styles.feeBadge]}>
                <Text style={addon.addonType === 'rental' ? styles.rentalBadgeText : styles.feeBadgeText}>
                  {addon.addonTypeLabel}
                </Text>
              </View>
            </View>

            {addon.description ? <Text style={styles.addonDescription}>{addon.description}</Text> : null}
            
            <Text style={styles.addonPrice}>
              ₱{parseFloat(addon.price).toLocaleString()}
              {addon.priceType === 'monthly' && <Text style={styles.priceUnit}>/month</Text>}
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
          <Text style={styles.emptySubtitle}>Requests from tenants for services or rentals will appear here.</Text>
        </View>
      );
    }

    return (
      <View>
        {pendingRequests.map((request) => (
          <View key={request.requestId} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.flex1}>
                <Text style={styles.addonName}>{request.addonName}</Text>
                <View style={styles.requestTenantInfo}>
                  <Text style={styles.tenantName}>{request.tenant.name}</Text>
                  <Text style={styles.tenantRoom}>Room {request.roomNumber}</Text>
                </View>
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
              Requested: {new Date(request.requestedAt).toLocaleDateString()}
            </Text>

            <View style={styles.requestActions}>
              <TouchableOpacity 
                style={styles.approveButton}
                onPress={() => handleRequest(request.bookingId, request.addonId, 'approve')}
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
      </View>

      <View style={styles.headerSubtitle}>
        <Text style={styles.subtitleText}>
          {propertyTitle || 'Manage services'} • Extra services and rentals
        </Text>
        <TouchableOpacity 
          style={styles.addServiceButton}
          onPress={() => { resetForm(); setShowModal(true); }}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addServiceButtonText}>Add New Service</Text>
        </TouchableOpacity>
      </View>

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
              color={activeTab === tab.id ? '#166534' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.id && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.id && styles.activeTabBadgeText]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
      >
        {activeTab === 'manage' && renderManageTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'active' && renderActiveTab()}
      </ScrollView>

      {/* Form Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
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
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Monthly" value="monthly" />
                      <Picker.Item label="One-time" value="one_time" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Add-on Type *</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={formData.addon_type}
                      onValueChange={(value) => setFormData({ ...formData, addon_type: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Usage Fee" value="fee" />
                      <Picker.Item label="Rental" value="rental" />
                    </Picker>
                  </View>
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
    </SafeAreaView>
  );
}
