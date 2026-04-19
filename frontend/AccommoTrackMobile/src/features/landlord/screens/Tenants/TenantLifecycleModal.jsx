import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Landlord/Lifecycle.js';
import TenantService from '../../../../services/TenantService.js';
import { hasPermission as checkPermission } from '../../../../utils/permissionHelpers.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccess, showError, showWarning } from '../../../../utils/toast.js';

export default function TenantLifecycleModal({
  visible,
  onClose,
  tenant,
  onSuccess,
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [user, setUser] = useState(null);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          setUser(JSON.parse(userString));
        }
      } catch (_error) {}
    };
    loadUser();
  }, []);

  const isCaretaker = user?.role === 'caretaker';
  const hasPermission = React.useCallback((key, aliases = []) => {
    return checkPermission(user?.caretaker_permissions, isCaretaker, key, aliases);
  }, [isCaretaker, user?.caretaker_permissions]);

  const canDeleteTenants = !isCaretaker || hasPermission('delete_tenants');

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('eviction'); // 'eviction' | 'notice'
  const [reason, setReason] = useState('');
  const [graceHours, setGraceHours] = useState('24');
  const [noticeText, setNoticeText] = useState('');
  const [loadingNotice, setLoadingNotice] = useState(false);

  const hasPendingEviction = Boolean(tenant?.pending_eviction);
  const isEvicted = tenant?.tenantProfile?.status === 'evicted';
  const canUndo = Boolean(tenant?.can_undo_eviction);

  useEffect(() => {
    if (visible && tenant) {
      setReason('');
      setGraceHours('24');
      setNoticeText('');
      setActiveTab('eviction');
      
      if (hasPendingEviction) {
        fetchNotice();
      }
    }
  }, [visible, tenant, hasPendingEviction, fetchNotice]);

  const fetchNotice = React.useCallback(async () => {
    if (!tenant) return;
    setLoadingNotice(true);
    try {
      const response = await TenantService.getEvictionNotice(tenant.id);
      if (response.success) {
        setNoticeText(response.data?.content || '');
      }
    } catch (_error) {
      console.error('Error fetching notice:', _error);
    } finally {
      setLoadingNotice(false);
    }
  }, [tenant]);

  const handleSchedule = async () => {
    if (!reason.trim()) {
      showWarning('Required', 'Please provide a reason for the eviction.');
      return;
    }

    setLoading(true);
    try {
      const response = await TenantService.scheduleEviction(tenant.id, {
        reason: reason.trim(),
        grace_hours: parseInt(graceHours, 10) || 24,
      });

      if (response.success) {
        showSuccess('Success', 'Eviction scheduled successfully.');
        onSuccess?.();
        onClose();
      } else {
        showError('Error', response.error || 'Failed to schedule eviction.');
      }
    } catch (_error) {
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    Alert.alert(
      'Finalize Eviction',
      `Are you sure you want to finalize the eviction for ${tenant.first_name}? This will mark the room as available and move the tenant to history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finalize', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await TenantService.finalizeEviction(tenant.id);
              if (response.success) {
                showSuccess('Success', 'Tenant has been successfully evicted.');
                onSuccess?.();
                onClose();
              } else {
                showError('Error', response.error || 'Failed to finalize eviction.');
              }
            } catch (_error) {
              showError('Error', 'An unexpected error occurred.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Eviction',
      'Are you sure you want to cancel this scheduled eviction?',
      [
        { text: 'Keep Scheduled', style: 'cancel' },
        { 
          text: 'Cancel Eviction', 
          onPress: async () => {
            setLoading(true);
            try {
              const response = await TenantService.cancelEviction(tenant.id);
              if (response.success) {
                showSuccess('Success', 'Eviction schedule has been cancelled.');
                onSuccess?.();
                onClose();
              } else {
                showError('Error', response.error || 'Failed to cancel eviction.');
              }
            } catch (_error) {
              showError('Error', 'An unexpected error occurred.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUndo = async () => {
    Alert.alert(
      'Undo Eviction',
      'This will restore the tenant to active status. Would you like to restore their previous room assignment if available?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore Tenancy', 
          onPress: async () => {
            setLoading(true);
            try {
              const response = await TenantService.undoEviction(tenant.id, { restore_room: true });
              if (response.success) {
                showSuccess('Success', 'Tenancy has been restored.');
                onSuccess?.();
                onClose();
              } else {
                showError('Error', response.error || 'Failed to undo eviction.');
              }
            } catch (_error) {
              showError('Error', 'An unexpected error occurred.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderScheduleForm = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eviction Reason</Text>
        <TextInput
          style={styles.input}
          placeholder="Reason for eviction (e.g., non-payment, rule violation)"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          value={reason}
          onChangeText={setReason}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grace Period (Hours)</Text>
        <TextInput
          style={[styles.input, { minHeight: 50 }]}
          placeholder="24"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
          value={graceHours}
          onChangeText={setGraceHours}
        />
        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.warningText}>
            The tenant will be notified immediately. They must vacate by the scheduled time.
          </Text>
        </View>
      </View>

      {canDeleteTenants ? (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#EF4444' }]} 
          onPress={handleSchedule}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.buttonText, { color: '#FFF' }]}>Schedule Eviction</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.warningBox}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
            Scheduling evictions is restricted for your account.
          </Text>
        </View>
      )}
    </View>
  );

  const renderPendingEviction = () => (
    <View>
      <View style={styles.tenantSummary}>
        <Ionicons name="time-outline" size={24} color="#D97706" style={{ marginRight: 12 }} />
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>Eviction Scheduled</Text>
          <Text style={styles.roomLabel}>
            For: {new Date(tenant.pending_eviction.scheduled_for).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {canDeleteTenants && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.border }]} 
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel Schedule</Text>
          </TouchableOpacity>
        )}
        
        {canDeleteTenants && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#EF4444' }]} 
            onPress={handleFinalize}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFF' }]}>Finalize Now</Text>
          </TouchableOpacity>
        )}
      </View>
      {!canDeleteTenants && (
        <View style={styles.warningBox}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
            Finalizing or cancelling evictions is restricted.
          </Text>
        </View>
      )}
    </View>
  );

  const renderEvictedState = () => (
    <View>
      <View style={styles.tenantSummary}>
        <Ionicons name="alert-circle" size={24} color="#EF4444" style={{ marginRight: 12 }} />
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>Tenant Evicted</Text>
          <Text style={styles.roomLabel}>Status: {tenant.tenantProfile?.status}</Text>
        </View>
      </View>

      {canDeleteTenants && canUndo && (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 12 }]} 
          onPress={handleUndo}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: '#FFF' }]}>Restore Tenancy / Undo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderNotice = () => (
    <View style={styles.noticeContainer}>
      {loadingNotice ? (
        <ActivityIndicator color={theme.colors.primary} size="large" />
      ) : (
        <ScrollView>
          <Text style={styles.noticeText}>
            {noticeText || 'Pre-generating notice based on tenancy data...'}
          </Text>
        </ScrollView>
      )}
    </View>
  );

  if (!tenant) return null;

  const initials = (tenant.first_name?.[0] || '') + (tenant.last_name?.[0] || '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Tenant Lifecycle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tenantSummary}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{tenant.first_name} {tenant.last_name}</Text>
              <Text style={styles.roomLabel}>
                {tenant.room ? `Room ${tenant.room.room_number}` : 'No Room Assigned'}
              </Text>
            </View>
          </View>

          {hasPendingEviction && (
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <TouchableOpacity 
                style={[{ flex: 1, paddingVertical: 10, borderBottomWidth: 2 }, activeTab === 'eviction' ? { borderBottomColor: theme.colors.primary } : { borderBottomColor: 'transparent' }]}
                onPress={() => setActiveTab('eviction')}
              >
                <Text style={[{ textAlign: 'center', fontWeight: '600' }, activeTab === 'eviction' ? { color: theme.colors.primary } : { color: theme.colors.textSecondary }]}>Status</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[{ flex: 1, paddingVertical: 10, borderBottomWidth: 2 }, activeTab === 'notice' ? { borderBottomColor: theme.colors.primary } : { borderBottomColor: 'transparent' }]}
                onPress={() => {
                  setActiveTab('notice');
                  if (!noticeText) fetchNotice();
                }}
              >
                <Text style={[{ textAlign: 'center', fontWeight: '600' }, activeTab === 'notice' ? { color: theme.colors.primary } : { color: theme.colors.textSecondary }]}>Notice</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'notice' ? (
            renderNotice()
          ) : (
            <View>
              {!hasPendingEviction && !isEvicted && renderScheduleForm()}
              {hasPendingEviction && renderPendingEviction()}
              {isEvicted && renderEvictedState()}
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}
