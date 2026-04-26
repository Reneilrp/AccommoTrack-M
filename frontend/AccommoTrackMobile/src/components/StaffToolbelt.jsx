import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TextInput, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PropertyService from '../services/PropertyService.js';
import MessageService from '../services/MessageService.js';
import api from '../services/api.js';
import { showSuccess, showError } from '../utils/toast.js';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { landlordQueryKeys } from '../features/landlord/hooks/useLandlordQueryHelpers.js';
import { useUserCounters } from '../features/tenant/hooks/useTenantQueryHelpers.js';
import { useAuthStore } from '../stores/auth/authStore.js';

export default function StaffToolbelt() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const userId = useAuthStore((state) => state.userId);
  const activeRole = useAuthStore((state) => state.activeRole);
  const { data: counters } = useUserCounters(!!userId);

  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Animation value for FAB items
  const animationValue = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animationValue, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const handleStartLandlordChat = async () => {
    toggleMenu();
    try {
      const res = await MessageService.startLandlordChat();
      if (res.success && res.data) {
        navigation.navigate('Chat', { conversation: res.data });
      } else {
        showError('Failed to open direct chat', res.error);
      }
    } catch (_err) {
      showError('Network error', 'Could not connect');
    }
  };

  const translateYReport = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -10],
  });

  const translateYChat = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -20],
  });

  const opacity = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <>
      <View style={styles.container} pointerEvents="box-none">
        {/* Floating Actions container */}
        <View style={styles.actionContainer} pointerEvents="box-none">
          
          {activeRole === 'caretaker' && (
            <Animated.View style={[styles.actionItem, { opacity, transform: [{ translateY: translateYChat }] }]} pointerEvents={isOpen ? 'auto' : 'none'}>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Message Landlord</Text>
              <TouchableOpacity 
                style={[styles.smallFab, { backgroundColor: '#DBEAFE' }]} 
                onPress={handleStartLandlordChat}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles" size={20} color="#2563EB" />
                {counters?.messages > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{counters.messages > 99 ? '99+' : counters.messages}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View style={[styles.actionItem, { opacity, transform: [{ translateY: translateYReport }] }]} pointerEvents={isOpen ? 'auto' : 'none'}>
            <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Quick Report</Text>
            <TouchableOpacity 
              style={[styles.smallFab, { backgroundColor: '#FFEDD5' }]} 
              onPress={() => { toggleMenu(); setShowReportModal(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="construct" size={20} color="#EA580C" />
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB */}
          <TouchableOpacity 
            style={[styles.mainFab, { backgroundColor: theme.colors.primary }]} 
            onPress={toggleMenu}
            activeOpacity={0.9}
          >
            <Ionicons name={isOpen ? "close" : "add"} size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <QuickReportModal 
        visible={showReportModal} 
        onClose={() => setShowReportModal(false)}
        theme={theme}
        queryClient={queryClient}
      />
    </>
  );
}

function QuickReportModal({ visible, onClose, theme, queryClient }) {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [propertySelectVisible, setPropertySelectVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProperties();
      setPropertyId('');
      setDescription('');
    }
  }, [visible]);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const res = await PropertyService.getLandlordProperties();
      if (res.success && Array.isArray(res.data)) {
        setProperties(res.data);
        if (res.data.length === 1) {
          setPropertyId(res.data[0].id);
        }
      }
    } catch (_err) {
      console.error(_err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!propertyId || !description.trim()) {
      showError('Validation Error', 'Please select a property and enter a description.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = { property_id: propertyId, description: description.trim() };
      await api.post('/landlord/property-reports', payload);
      
      showSuccess('Report Submitted', 'Your activity log has been saved.');
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardRecentActivities() });
      onClose();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to submit report';
      showError('Submission Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
             <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Quick Property Report</Text>
             <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
             </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>PROPERTY</Text>
              <View style={[styles.pickerWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                <TouchableOpacity
                  style={styles.pickerDisplay}
                  onPress={() => setPropertySelectVisible(true)}
                >
                  <Text style={[styles.pickerDisplayText, { color: propertyId ? theme.colors.text : theme.colors.textSecondary }]}>
                    {properties.find(p => p.id === propertyId)?.title || "Select a property..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>ACTIVITY DESCRIPTION</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }]}
                multiline
                numberOfLines={4}
                placeholder="Example: Replaced lightbulb, fixed door..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                   style={[styles.cancelBtn, { borderColor: theme.colors.border }]} 
                   onPress={onClose}
                   disabled={isSubmitting}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                   style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: (!propertyId || !description.trim() || isSubmitting) ? 0.5 : 1 }]} 
                   onPress={handleSubmit}
                   disabled={!propertyId || !description.trim() || isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={propertySelectVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        onRequestClose={() => setPropertySelectVisible(false)}
      >
        <Pressable
          style={styles.statusModalOverlay}
          onPress={() => setPropertySelectVisible(false)}
        >
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={styles.sectionTitle}>Select Property</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={styles.statusOption}
                onPress={() => {
                  setPropertyId("");
                  setPropertySelectVisible(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.statusOptionText, !propertyId && { color: theme.colors.primary, fontWeight: 'bold' }]}>Select a property...</Text>
                  {!propertyId && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </View>
              </TouchableOpacity>
              {properties.map((p, index) => {
                const isLast = index === properties.length - 1;
                const isActive = p.id === propertyId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      setPropertyId(p.id);
                      setPropertySelectVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={[styles.statusOptionText, isActive && { color: theme.colors.primary, fontWeight: 'bold' }]}>{p.title}</Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast, { marginTop: 8 }]}
              onPress={() => setPropertySelectVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 30, // Above bottom nav
    right: 20,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    marginLeft: 12,
  },
  actionLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: 'bold',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  pickerDisplay: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  pickerDisplayText: {
    fontSize: 14,
    flex: 1,
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  statusSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111827",
  },
  statusOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statusOptionLast: {
    borderBottomWidth: 0,
  },
  statusOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  badgeContainer: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  }
});
