import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropertyService from '../../../../services/PropertyService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { showError } from '../../../../utils/toast.js';

export default function TransferApprovalModal({ isOpen, onClose, request, onApprove }) {
  const { theme } = useTheme();
  const [loadingProration, setLoadingProration] = useState(false);
  const [prorationDetails, setProrationDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    damage_charge: '',
    damage_description: '',
    transfer_fee: '',
    landlord_notes: '',
    prorated_adjustment: '',
  });

  useEffect(() => {
    if (isOpen && request?.id) {
      fetchProration();
    }
  }, [isOpen, request?.id, fetchProration]);

  const fetchProration = useCallback(async () => {
    try {
      setLoadingProration(true);
      const res = await PropertyService.getTransferProration(request.id);
      if (res.success) {
        const details = res.data;
        setProrationDetails(details);
        setFormData(prev => ({
          ...prev,
          prorated_adjustment: (details?.suggested_adjustment ?? '').toString(),
          transfer_fee: (details?.quoted_transfer_fee ?? details?.transfer_fee ?? 0).toString(),
        }));
      }
    } catch (err) {
      console.error('Failed to load proration:', err);
    } finally {
      setLoadingProration(false);
    }
  }, [request?.id]);

  const handleConfirm = async () => {
    const damageCharge = Number(formData.damage_charge || 0);
    
    if (damageCharge > 0 && !formData.damage_description.trim()) {
      showError('Required', 'Please provide a damage description.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        damage_charge: damageCharge > 0 ? damageCharge : undefined,
        damage_description: damageCharge > 0 ? formData.damage_description.trim() : undefined,
        transfer_fee: formData.transfer_fee !== '' ? Number(formData.transfer_fee) : undefined,
        prorated_adjustment: formData.prorated_adjustment !== '' ? Number(formData.prorated_adjustment) : undefined,
        landlord_notes: formData.landlord_notes.trim() || undefined,
      };
      
      await onApprove(request.id, payload);
      onClose();
    } catch (_err) {
      // Parent handles error
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tenantName = request ? `${request.tenant?.first_name || ''} ${request.tenant?.last_name || ''}`.trim() : 'Tenant';
  const roomChange = request ? `Room ${request.from_room?.room_number || request.from_room_name || '—'} → ${request.to_room?.room_number || request.to_room_name || '—'}` : '';

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.overlay}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.container, { backgroundColor: theme.colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Review Transfer</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Info Cards */}
              <View style={styles.infoRow}>
                <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={styles.infoLabel}>TENANT</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={1}>{tenantName}</Text>
                </View>
                <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={styles.infoLabel}>ROOM CHANGE</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={1}>{roomChange}</Text>
                </View>
              </View>

              {/* Proration Section */}
              <View style={[styles.prorationSection, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>ESTIMATED CREDIT & ADJUSTMENT</Text>
                {loadingProration ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Calculating...</Text>
                  </View>
                ) : prorationDetails ? (
                  <View style={styles.prorationData}>
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: theme.colors.textSecondary }]}>Unused Value:</Text>
                      <Text style={[styles.dataValue, { color: theme.colors.text }]}>₱{(prorationDetails.old_room_unused_value || 0).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: theme.colors.text, fontWeight: 'bold' }]}>Net Credit:</Text>
                      <Text style={[styles.dataValue, { color: '#16a34a', fontWeight: 'bold' }]}>₱{(prorationDetails.credit_available || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.errorText}>Proration unavailable.</Text>
                )}
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>TRANSFER FEE (₱)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    keyboardType="numeric"
                    value={formData.transfer_fee}
                    onChangeText={val => setFormData(p => ({ ...p, transfer_fee: val }))}
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>DAMAGE CHARGE (₱)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    keyboardType="numeric"
                    value={formData.damage_charge}
                    onChangeText={val => setFormData(p => ({ ...p, damage_charge: val }))}
                    placeholder="0.00"
                  />
                </View>

                {Number(formData.damage_charge) > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>DAMAGE DESCRIPTION</Text>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={formData.damage_description}
                      onChangeText={val => setFormData(p => ({ ...p, damage_description: val }))}
                      placeholder="Required"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>LANDLORD NOTES</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    multiline
                    numberOfLines={3}
                    value={formData.landlord_notes}
                    onChangeText={val => setFormData(p => ({ ...p, landlord_notes: val }))}
                    placeholder="Optional"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#16a34a' }, submitting && { opacity: 0.7 }]}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmText}>Approve Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  prorationSection: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  prorationData: {
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataLabel: {
    fontSize: 13,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontStyle: 'italic',
  },
  form: {
    gap: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  confirmButton: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
