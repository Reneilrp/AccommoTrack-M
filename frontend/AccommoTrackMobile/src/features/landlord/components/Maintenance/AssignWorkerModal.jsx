import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropertyService from '../../../../services/PropertyService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { showError } from '../../../../utils/toast.js';

export default function AssignWorkerModal({ isOpen, onClose, request, onAssign }) {
  const { theme } = useTheme();
  const [workers, setWorkers] = useState([]);
  const [landlord, setLandlord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  useEffect(() => {
    if (isOpen && request?.property_id) {
      fetchWorkers();
    }
  }, [isOpen, request?.property_id, fetchWorkers]);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await PropertyService.getPropertyWorkers(request.property_id);
      if (response.success) {
        setWorkers(response.data.workers || []);
        setLandlord(response.data.landlord || null);
        
        // Default select if only one or if landlord exists
        if (response.data.workers?.length > 0) {
          setSelectedWorkerId(response.data.workers[0].id);
        } else if (response.data.landlord) {
          setSelectedWorkerId(response.data.landlord.id);
        }
      }
    } catch (_err) {
      showError('Error', 'Failed to fetch workers. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [request?.property_id]);

  const handleSubmit = async () => {
    if (!selectedWorkerId) return;

    try {
      setSubmitting(true);
      await onAssign(request.id, selectedWorkerId);
      onClose();
    } catch (_err) {
      // Parent handles error toast
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: theme.colors.surface }]} onPress={e => e.stopPropagation()}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Assign Maintenance</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Choose a worker or caretaker to handle this request.
            </Text>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {landlord && (
                  <TouchableOpacity
                    style={[
                      styles.workerItem,
                      { borderColor: selectedWorkerId === landlord.id ? theme.colors.primary : theme.colors.border },
                      selectedWorkerId === landlord.id && { backgroundColor: theme.colors.primary + '10' }
                    ]}
                    onPress={() => setSelectedWorkerId(landlord.id)}
                  >
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Ionicons name="person" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={[styles.workerName, { color: theme.colors.text }]}>{landlord.name}</Text>
                      <Text style={[styles.workerDetail, { color: theme.colors.textSecondary }]}>Landlord (Self)</Text>
                    </View>
                    {selectedWorkerId === landlord.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}

                {workers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={[
                      styles.workerItem,
                      { borderColor: selectedWorkerId === worker.id ? theme.colors.primary : theme.colors.border },
                      selectedWorkerId === worker.id && { backgroundColor: theme.colors.primary + '10' }
                    ]}
                    onPress={() => setSelectedWorkerId(worker.id)}
                  >
                    <View style={[styles.avatar, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={[styles.workerName, { color: theme.colors.text }]}>{worker.name}</Text>
                      <Text style={[styles.workerDetail, { color: theme.colors.textSecondary }]}>{worker.email || 'Worker'}</Text>
                    </View>
                    {selectedWorkerId === worker.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                {workers.length === 0 && !landlord && (
                  <Text style={styles.emptyText}>No available workers found.</Text>
                )}
              </ScrollView>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: theme.colors.primary }, (!selectedWorkerId || submitting) && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={!selectedWorkerId || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFF' }]}>Confirm Assignment</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
    maxHeight: '80%',
    paddingBottom: 32,
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
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  center: {
    padding: 40,
    alignItems: 'center',
  },
  scroll: {
    maxHeight: 400,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  workerDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {},
  confirmButton: {},
});
