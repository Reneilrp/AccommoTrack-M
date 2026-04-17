import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import PropertyService from '../services/PropertyService.js';
import MessageService from '../services/MessageService.js';
import api from '../services/api.js';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { landlordQueryKeys } from '../features/landlord/hooks/useLandlordQueryHelpers.js';

export default function StaffToolbelt() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

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
        Toast.show({ type: 'error', text1: 'Failed to open direct chat', text2: res.error });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Could not connect' });
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
          
          <Animated.View style={[styles.actionItem, { opacity, transform: [{ translateY: translateYChat }] }]} pointerEvents={isOpen ? 'auto' : 'none'}>
            <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Message Landlord</Text>
            <TouchableOpacity 
              style={[styles.smallFab, { backgroundColor: '#DBEAFE' }]} 
              onPress={handleStartLandlordChat}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles" size={20} color="#2563EB" />
            </TouchableOpacity>
          </Animated.View>

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!propertyId || !description.trim()) {
      Alert.alert('Validation Error', 'Please select a property and enter a description.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = { property_id: propertyId, description: description.trim() };
      const response = await api.post('/landlord/property-reports', payload);
      
      Toast.show({ type: 'success', text1: 'Report Submitted', text2: 'Your activity log has been saved.' });
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardRecentActivities() });
      onClose();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to submit report';
      Alert.alert('Submission Failed', errMsg);
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
                <Picker
                  selectedValue={propertyId}
                  onValueChange={(itemValue) => setPropertyId(itemValue)}
                  style={{ color: theme.colors.text }}
                  dropdownIconColor={theme.colors.textSecondary}
                >
                  <Picker.Item label="Select a property..." value="" color={theme.colors.textSecondary} />
                  {properties.map((p) => (
                    <Picker.Item key={p.id} label={p.title} value={p.id} color={theme.colors.text} />
                  ))}
                </Picker>
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
  }
});
