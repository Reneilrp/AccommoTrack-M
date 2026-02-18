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
  Image,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import ProfileService from '../../../services/ProfileService';
import { getImageUrl } from '../../../services/PropertyServices';
import { styles } from '../../../styles/Landlord/VerificationStatus';

export default function VerificationStatus({ navigation }) {
  const { theme } = useTheme();
  
  const [verification, setVerification] = useState(null);
  const [idTypes, setIdTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    validIdType: '',
    validIdOther: '',
    validId: null,
    permit: null,
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statusRes, typesRes] = await Promise.all([
        ProfileService.getVerificationStatus(),
        ProfileService.getValidIdTypes()
      ]);

      if (statusRes.success) setVerification(statusRes.data);
      if (typesRes.success) setIdTypes(typesRes.data);
      else if (typesRes.data) setIdTypes(typesRes.data); // Fallback data

    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handlePickDocument = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload documents.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      setFormData(prev => ({
        ...prev,
        [field]: {
          uri: asset.uri,
          name: filename,
          type: type,
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.validIdType || !formData.validId || !formData.permit) {
      Alert.alert('Validation', 'Please select an ID type and upload both documents.');
      return;
    }

    if (formData.validIdType === 'other' && !formData.validIdOther) {
      Alert.alert('Validation', 'Please specify your ID type.');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      const idType = formData.validIdType === 'other' ? formData.validIdOther : formData.validIdType;
      
      submitData.append('valid_id_type', idType);
      submitData.append('valid_id', formData.validId);
      submitData.append('permit', formData.permit);

      const res = await ProfileService.resubmitVerification(submitData);
      if (res.success) {
        Alert.alert('Success', 'Verification documents submitted! Please wait for admin review.');
        setShowResubmitForm(false);
        setFormData({ validIdType: '', validIdOther: '', validId: null, permit: null });
        fetchData();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit documents');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return {
          icon: 'checkmark-circle',
          color: '#10b981',
          bg: '#DCFCE7',
          border: '#86EFAC',
          label: 'Verified',
          description: 'Your account is verified. You can now publish properties and manage bookings.',
        };
      case 'rejected':
        return {
          icon: 'close-circle',
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
          label: 'Rejected',
          description: 'Your verification was rejected. Please review the reason and resubmit.',
        };
      case 'pending':
        return {
          icon: 'time',
          color: '#D97706',
          bg: '#FEF3C7',
          border: '#FDE68A',
          label: 'Pending Review',
          description: 'Your documents are under review. This usually takes 1-3 business days.',
        };
      default:
        return {
          icon: 'alert-circle',
          color: '#6B7280',
          bg: '#F3F4F6',
          border: '#E5E7EB',
          label: 'Not Submitted',
          description: 'Please submit your valid ID and business permit to verify your account.',
        };
    }
  };

  const statusConfig = getStatusConfig(verification?.status);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Verification</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#10b981']} />
        }
      >
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
          <View style={styles.statusIconContainer}>
            <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
            {verification?.reviewed_at && (
              <Text style={styles.lastReviewed}>
                Reviewed on: {new Date(verification.reviewed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Rejection Reason */}
        {verification?.status === 'rejected' && verification?.rejection_reason && (
          <View style={styles.rejectionCard}>
            <Ionicons name="warning" size={20} color="#991B1B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Reason for Rejection</Text>
              <Text style={styles.rejectionReason}>{verification.rejection_reason}</Text>
            </View>
          </View>
        )}

        {/* Current Documents */}
        {verification?.status && verification.status !== 'not_submitted' && (
          <View>
            <Text style={styles.sectionTitle}>Submitted Documents</Text>
            <View style={styles.documentGrid}>
              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Ionicons name="image-outline" size={18} color="#10b981" />
                  <Text style={styles.documentLabel}>Valid ID ({verification.valid_id_type})</Text>
                </View>
                {verification.valid_id_path ? (
                  <Image source={{ uri: getImageUrl(verification.valid_id_path) }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewPlaceholder}><Text>No image</Text></View>
                )}
              </View>

              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.documentLabel}>Business/Accommodation Permit</Text>
                </View>
                {verification.permit_path ? (
                  verification.permit_path.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfPreview}>
                      <Ionicons name="document-outline" size={48} color="#EF4444" />
                      <Text style={styles.pdfText}>PDF Document</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: getImageUrl(verification.permit_path) }} style={styles.previewImage} />
                  )
                ) : (
                  <View style={styles.previewPlaceholder}><Text>No document</Text></View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        {(verification?.status === 'rejected' || verification?.status === 'not_submitted') && (
          <TouchableOpacity 
            style={styles.resubmitButton}
            onPress={() => setShowResubmitForm(true)}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
            <Text style={styles.resubmitButtonText}>
              {verification?.status === 'rejected' ? 'Resubmit Documents' : 'Submit Verification'}
            </Text>
          </TouchableOpacity>
        )}

        {/* History Section */}
        {verification?.history && verification.history.length > 0 && (
          <View>
            <TouchableOpacity 
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
            >
              <View style={styles.historyLabelContainer}>
                <Ionicons name="list-outline" size={20} color="#374151" />
                <Text style={styles.historyLabel}>Submission History</Text>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>{verification.history.length}</Text>
                </View>
              </View>
              <Ionicons name={showHistory ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {showHistory && (
              <View style={styles.historyList}>
                {verification.history.map((entry, index) => (
                  <View key={entry.id || index} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <View style={[styles.historyStatusBadge, { 
                        backgroundColor: entry.status === 'approved' ? '#DCFCE7' : entry.status === 'rejected' ? '#FEF2F2' : '#FEF3C7' 
                      }]}>
                        <Text style={[styles.historyStatusText, { 
                          color: entry.status === 'approved' ? '#166534' : entry.status === 'rejected' ? '#991B1B' : '#92400E' 
                        }]}>{entry.status}</Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.historyIdType}>{entry.valid_id_type}</Text>
                    {entry.rejection_reason ? (
                      <Text style={styles.historyRejection}>{entry.rejection_reason}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <Modal
        visible={showResubmitForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResubmitForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Verification</Text>
              <Text style={styles.modalSubtitle}>Please provide clear images of your documents.</Text>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Valid ID Type <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.validIdType}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, validIdType: val }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select ID Type" value="" />
                    {idTypes.map(type => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                    <Picker.Item label="Other" value="other" />
                  </Picker>
                </View>
              </View>

              {formData.validIdType === 'other' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Specify ID Type <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.validIdOther}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, validIdOther: val }))}
                    placeholder="Enter ID type"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Upload Valid ID <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity 
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument('validId')}
                >
                  <Ionicons name="camera-outline" size={32} color="#10b981" />
                  <Text style={styles.uploadBoxText}>Capture or Pick ID Image</Text>
                </TouchableOpacity>
                {formData.validId && (
                  <Text style={styles.selectedFile}>Selected: {formData.validId.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Upload Business/Dorm Permit <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity 
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument('permit')}
                >
                  <Ionicons name="document-attach-outline" size={32} color="#10b981" />
                  <Text style={styles.uploadBoxText}>Upload Permit Document</Text>
                </TouchableOpacity>
                {formData.permit && (
                  <Text style={styles.selectedFile}>Selected: {formData.permit.name}</Text>
                )}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowResubmitForm(false)}
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
                    <Text style={styles.submitButtonText}>Submit Now</Text>
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
