import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from '../../../styles/AuthScreen.styles.js';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL as API_URL } from '../../../config/index.js';
import BlockedUserModal from '../../../components/BlockedUserModal.jsx';
import ForgotPasswordModal from '../../../components/ForgotPasswordModal.jsx';
import { showSuccess, showError } from '../../../utils/toast.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { useAuthStore } from '../../../stores/auth/authStore.js';
import { useUIState } from '../../../contexts/UIStateContext.jsx';

import { UNIFIED_TERMS_AND_CONDITIONS } from '../../../shared/LegalContent.js';

const TRUSTED_DEVICE_STORAGE_KEY = 'trusted_device';
const TRUSTED_DEVICE_HEADER = 'X-Device-Trusted';

const TermsModal = ({ visible, onClose, theme }) => {
  const styles = getStyles(theme);
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.fullScreenModal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.fullModalTitle}>Terms & Conditions</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 2 }}>Last Updated: {UNIFIED_TERMS_AND_CONDITIONS.lastUpdated}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
          <View style={{ backgroundColor: theme.colors.primary + '10', padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: theme.colors.primary }}>
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
              By using AccommoTrack, you agree to be a respectful member of our community, provide truthful information, and follow property rules.
            </Text>
          </View>

          {UNIFIED_TERMS_AND_CONDITIONS.sections.map((section, i) => (
            <View key={i} style={{ marginBottom: 24 }}>
              <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{section.title}</Text>
              {Array.isArray(section.content) ? (
                section.content.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', marginBottom: 6, paddingLeft: 8 }}>
                    <Text style={{ color: theme.colors.primary, marginRight: 8, fontSize: 14 }}>•</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, flex: 1 }}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{section.content}</Text>
              )}
            </View>
          ))}

          <View style={{ marginTop: 8, padding: 15, backgroundColor: theme.colors.card, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
              If you have any questions about these terms, please contact us through the Help & Support page.
            </Text>
          </View>
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <TouchableOpacity
            style={{ backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            onPress={onClose}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const PendingVerificationModal = ({ visible, onClose, data, onResubmitPress, theme }) => {
  const isPending = data.status === 'pending_verification';
  const styles = getStyles(theme);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIconContainer, { backgroundColor: isPending ? (theme.isDark ? theme.colors.warningLight : '#FEF3C7') : (theme.isDark ? theme.colors.errorLight : '#FEE2E2') }]}>
            <Ionicons name={isPending ? "time-outline" : "close-circle-outline"} size={45} color={isPending ? theme.colors.warning : theme.colors.error} />
          </View>
          <Text style={styles.modalTitle}>{data.title}</Text>
          <Text style={[styles.modalDescription, { marginBottom: isPending ? 25 : 15 }]}>
            {data.message}
          </Text>

          {!isPending && data.reason ? (
            <View style={[styles.reasonContainer, { backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2' }]}>
              <Text style={[styles.reasonLabel, { color: theme.isDark ? theme.colors.text : '#B91C1C' }]}>Reason:</Text>
              <Text style={[styles.reasonText, { color: theme.isDark ? theme.colors.textSecondary : '#7F1D1D' }]}>"{data.reason}"</Text>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            {!isPending && (
              <TouchableOpacity
                onPress={onResubmitPress}
                style={styles.resubmitButton}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.textInverse} />
                <Text style={styles.resubmitButtonText}>Resubmit Documents</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalCloseButton, { backgroundColor: isPending ? theme.colors.primary : theme.colors.backgroundSecondary }]}
            >
              <Text style={[styles.modalCloseButtonText, { color: isPending ? theme.colors.textInverse : theme.colors.textSecondary }]}>
                {isPending ? 'Got it, thanks!' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ResubmitModal = ({ visible, onClose, theme }) => {
  const [loading, setLoading] = useState(false);
  const [idTypes, setIdTypes] = useState([]);
  const styles = getStyles(theme);
  const { showAlert } = useUIState();
  const [form, setForm] = useState({
    validIdType: '',
    validIdOther: '',
    validId: null,
    permit: null
  });

  useEffect(() => {
    if (visible) {
      fetch(`${API_URL}/valid-id-types`)
        .then(res => res.json())
        .then(data => setIdTypes(Array.isArray(data) ? data : []))
        .catch(() => setIdTypes(['Passport', 'Driver\'s License', 'National ID', 'UMID', 'Postal ID', 'Other']));
    }
  }, [visible]);

  const pickImage = async (field) => {
    const isPermit = field === 'permit';
    const options = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Required', 'Please allow camera access to capture documents.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            setForm(prev => ({ ...prev, [field]: result.assets[0] }));
          }
        }
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Required', 'Please allow photo library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            setForm(prev => ({ ...prev, [field]: result.assets[0] }));
          }
        }
      },
    ];

    if (isPermit) {
      options.push({
        text: 'Choose File (PDF/Image)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'image/*'],
              multiple: false,
              copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setForm(prev => ({
                ...prev,
                [field]: {
                  uri: asset.uri,
                  name: asset.name,
                  mimeType: asset.mimeType,
                  size: asset.size,
                }
              }));
            }
          } catch (err) {
            console.error('DocumentPicker Error:', err);
            showAlert('Error', 'Could not open file manager.');
          }
        }
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    showAlert('Upload Document', 'Choose a source for your document.', options);
  };

  const handleSubmit = async () => {
    if (!form.validIdType || !form.validId || !form.permit) {
      showAlert('Error', 'Please fill in all fields and upload both documents.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('valid_id_type', form.validIdType);
      if (form.validIdType === 'Other') formData.append('valid_id_other', form.validIdOther);

      const appendToFormData = (key, asset) => {
        if (!asset) return;
        formData.append(key, {
          uri: asset.uri,
          name: asset.name || (asset.uri.split('/').pop()),
          type: asset.mimeType || asset.type || 'image/jpeg'
        });
      };

      appendToFormData('valid_id', form.validId);
      appendToFormData('permit', form.permit);

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/tenant/resubmit-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Success', 'Documents resubmitted successfully! Please wait for admin review.');
        onClose();
      } else {
        showAlert('Error', data.message || 'Failed to resubmit documents.');
      }
    } catch (err) {
      showAlert('Error', 'An error occurred while resubmitting documents.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.fullScreenModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.fullModalTitle}>Resubmit Documents</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 24, lineHeight: 20 }}>
            Only your verification documents need to be re-uploaded. Your personal information will remain the same.
          </Text>

          <Text style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.text }}>Valid ID Type</Text>
          <View style={styles.idTypeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.idTypeScroll}>
              {idTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm(prev => ({ ...prev, validIdType: type }))}
                  style={[styles.idTypeBadge, { backgroundColor: form.validIdType === type ? theme.colors.primary : theme.colors.backgroundSecondary }]}
                >
                  <Text style={[styles.idTypeBadgeText, { color: form.validIdType === type ? theme.colors.textInverse : theme.colors.text }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            onPress={() => pickImage('validId')}
            style={[styles.uploadButton, { borderColor: form.validId ? theme.colors.primary : theme.colors.border, backgroundColor: form.validId ? theme.colors.primaryLight : theme.colors.backgroundSecondary }]}
          >
            {form.validId ? (
              <Image source={{ uri: form.validId.uri }} style={styles.uploadPreview} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={[styles.uploadButtonText, { color: theme.colors.textTertiary }]}>Upload Valid ID</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage('permit')}
            style={[styles.uploadButton, { borderColor: form.permit ? theme.colors.primary : theme.colors.border, marginBottom: 32, backgroundColor: form.permit ? theme.colors.primaryLight : theme.colors.backgroundSecondary }]}
          >
            {form.permit ? (
              <Image source={{ uri: form.permit.uri }} style={styles.uploadPreview} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={[styles.uploadButtonText, { color: theme.colors.textTertiary }]}>Upload Business Permit</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitButtonRe}
          >
            {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={[styles.submitButtonTextRe, { color: theme.colors.textInverse }]}>Submit Re-verification</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const ClaimExistingAccountModal = ({ visible, onClose, onClaimed, theme }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showClaimDobPicker, setShowClaimDobPicker] = useState(false);
  const [claimData, setClaimData] = useState({
    claimCode: '',
    dateOfBirth: '',
    challengeToken: '',
    tenantName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    otp: '',
  });

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setLoading(false);
      setError('');
      setResendCooldown(0);
      setShowClaimDobPicker(false);
      setClaimData({
        claimCode: '',
        dateOfBirth: '',
        challengeToken: '',
        tenantName: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        otp: '',
      });
    }
  }, [visible]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getClaimDobPickerValue = () => {
    if (claimData.dateOfBirth) {
      const [year, month, day] = claimData.dateOfBirth.split('-').map(Number);
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    }

    return new Date(new Date().setFullYear(new Date().getFullYear() - 18));
  };

  const postClaim = async (endpoint, body, fallbackMessage) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || fallbackMessage);
    }

    return payload?.data || payload;
  };

  const handleVerifyCode = async () => {
    const normalizedClaimCode = claimData.claimCode.trim();
    if (!/^\d{8}$/.test(normalizedClaimCode)) {
      setError('Please enter the 8-digit claim code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await postClaim(
        '/claim-account/verify-code',
        {
          claim_code: normalizedClaimCode,
        },
        'Failed to verify claim code.',
      );

      setClaimData((prev) => ({
        ...prev,
        challengeToken: data.challenge_token || '',
        tenantName: data?.tenant
          ? `${data.tenant.first_name || ''} ${data.tenant.last_name || ''}`.trim()
          : '',
      }));
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to verify claim code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!claimData.dateOfBirth || !claimData.email || !claimData.password || !claimData.passwordConfirmation) {
      setError('Date of birth, email, password, and confirmation are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await postClaim(
        '/claim-account/send-otp',
        {
          challenge_token: claimData.challengeToken,
          date_of_birth: claimData.dateOfBirth.trim(),
          email: claimData.email.trim(),
          password: claimData.password,
          password_confirmation: claimData.passwordConfirmation,
        },
        'Failed to send OTP.',
      );

      setResendCooldown(Number(data.retry_after_seconds || 60));
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!claimData.otp) {
      setError('OTP is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await postClaim(
        '/claim-account/verify-otp',
        {
          challenge_token: claimData.challengeToken,
          otp: claimData.otp.trim(),
        },
        'Failed to verify OTP.',
      );

      onClaimed?.(claimData.email.trim());
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await postClaim(
        '/claim-account/resend-otp',
        { challenge_token: claimData.challengeToken },
        'Failed to resend OTP.',
      );

      setResendCooldown(Number(data.retry_after_seconds || 60));
      showSuccess('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              width: '100%',
              maxWidth: 760,
              alignSelf: 'center',
              borderWidth: theme.isDark ? 1 : 0,
              borderColor: theme.colors.border,
              maxHeight: '92%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 }}>
              <View>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 18 }}>Claim Existing Account</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>Step {step} of 3</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 18 }}
            >
              {error ? (
                <View style={{ backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2', borderWidth: 1, borderColor: theme.colors.error, borderRadius: 10, padding: 10, marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.error, fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              {step === 1 && (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                    Enter the 8-digit claim code from your landlord.
                  </Text>
                  <TextInput
                    value={claimData.claimCode}
                    onChangeText={(text) => setClaimData((prev) => ({ ...prev, claimCode: text.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                    maxLength={8}
                    placeholder="8-digit claim code"
                    placeholderTextColor="#9CA3AF"
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text }}
                  />

                  <TouchableOpacity
                    onPress={handleVerifyCode}
                    disabled={loading}
                    style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Verify Claim Code</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                    {claimData.tenantName
                      ? `Code verified for ${claimData.tenantName}.`
                      : 'Code verified.'}{' '}
                    Enter your date of birth, then set your email and password to continue.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowClaimDobPicker(true)}
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 }}
                  >
                    <Text style={{ color: claimData.dateOfBirth ? theme.colors.text : '#9CA3AF' }}>
                      {claimData.dateOfBirth || 'Select date of birth'}
                    </Text>
                  </TouchableOpacity>

                  {showClaimDobPicker && (
                    <DateTimePicker
                      value={getClaimDobPickerValue()}
                      mode="date"
                      maximumDate={new Date()}
                      display="default"
                      onChange={(event, date) => {
                        setShowClaimDobPicker(Platform.OS === 'ios');
                        if (date) {
                          setClaimData((prev) => ({ ...prev, dateOfBirth: formatDateForApi(date) }));
                        }
                      }}
                    />
                  )}
                  <TextInput
                    value={claimData.email}
                    onChangeText={(text) => setClaimData((prev) => ({ ...prev, email: text }))}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text }}
                  />
                  <TextInput
                    value={claimData.password}
                    onChangeText={(text) => setClaimData((prev) => ({ ...prev, password: text }))}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text }}
                  />
                  <TextInput
                    value={claimData.passwordConfirmation}
                    onChangeText={(text) => setClaimData((prev) => ({ ...prev, passwordConfirmation: text }))}
                    placeholder="Confirm password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text }}
                  />
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Send OTP</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {step === 3 && (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                    Enter the 6-digit OTP sent to {claimData.email}.
                  </Text>
                  <TextInput
                    value={claimData.otp}
                    onChangeText={(text) => setClaimData((prev) => ({ ...prev, otp: text.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    placeholderTextColor="#9CA3AF"
                    style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text, textAlign: 'center', letterSpacing: 4, fontSize: 20, fontWeight: '700' }}
                  />
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Complete Claim</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading || resendCooldown > 0}>
                    <Text style={{ textAlign: 'center', color: resendCooldown > 0 ? theme.colors.textTertiary : theme.colors.primary, fontWeight: '600' }}>
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function AuthScreen({ onLoginSuccess, onClose, onContinueAsGuest }) {
  const { width: viewportWidth } = useWindowDimensions();
  const { theme, isDarkMode } = useTheme();
  const { showAlert } = useUIState();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const contentWrapStyle = React.useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 760, alignSelf: 'center' } : null),
    [viewportWidth],
  );
  const setAuthSession = useAuthStore((state) => state.setAuthSession);
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [sexModalVisible, setSexModalVisible] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [pendingModalData, setPendingModalData] = useState({ title: '', message: '', status: '', reason: '' });
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    minLen: false,
    hasUpper: false,
    numCount: false,
    hasSpecial: false,
  });
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'tenant', // Default to tenant for mobile app
    dateOfBirth: null,
    sex: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigation = useNavigation();

  // W8: Restore saved registration form data from AsyncStorage on mount
  useEffect(() => {
    const restoreFormData = async () => {
      try {
        const saved = await AsyncStorage.getItem('signup_form_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Restore non-password fields only
          setFormData(prev => ({
            ...prev,
            firstName: parsed.firstName || '',
            middleName: parsed.middleName || '',
            lastName: parsed.lastName || '',
            phone: parsed.phone || '',
            email: parsed.email || '',
            dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
            sex: parsed.sex || '',
          }));
        }

        const savedTrustedDevice = await AsyncStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY);
        setRememberDevice(savedTrustedDevice === '1' || savedTrustedDevice === 'true');
      } catch { /* ignore */ }
    };
    restoreFormData();
  }, []);

  useEffect(() => {
    const emailCheckTimeout = setTimeout(async () => {
      if (!isLogin && signupStep === 2 && formData.email) {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (emailRegex.test(formData.email)) {
          setEmailCheckLoading(true);
          try {
            const response = await fetch(`${API_URL}/check-email?email=${formData.email}`);
            const data = await response.json();
            setEmailAvailable(data.available);
            setEmailCheckMsg(data.message);
          } catch (err) {
            // In case of network error, don't block the user
            setEmailAvailable(null);
            setEmailCheckMsg('');
          } finally {
            setEmailCheckLoading(false);
          }
        } else {
          setEmailAvailable(null);
          setEmailCheckMsg('');
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(emailCheckTimeout);
  }, [formData.email, isLogin, signupStep]);

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setError('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'email') {
      setEmailAvailable(null);
      setEmailCheckMsg('');
    }
    if (field === 'password' && !isLogin) {
      setPasswordChecks({
        minLen: value.length >= 8,
        hasUpper: /[A-Z]/.test(value),
        numCount: (value.match(/\d/g) || []).length >= 2,
        hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(value),
      });
    }
    // W8: Save non-password fields to AsyncStorage for persistence
    if (!isLogin && !['password', 'confirmPassword'].includes(field)) {
      const toSave = {
        firstName: newFormData.firstName,
        middleName: newFormData.middleName,
        lastName: newFormData.lastName,
        phone: newFormData.phone,
        email: newFormData.email,
        dateOfBirth: newFormData.dateOfBirth,
        sex: newFormData.sex,
      };
      AsyncStorage.setItem('signup_form_draft', JSON.stringify(toSave)).catch(() => { });
    }
  };

  // W11: Unicode-aware name validation
  const nameRegex = /^[\p{L} '-]+$/u;

  const validateStep1 = () => {
    const errors = {};
    if (!formData.firstName) errors.firstName = 'First name is required';
    else if (!nameRegex.test(formData.firstName.trim())) errors.firstName = 'First name contains invalid characters (letters, spaces, hyphens only)';
    if (formData.middleName?.trim() && !nameRegex.test(formData.middleName.trim())) errors.middleName = 'Middle name contains invalid characters';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    else if (!nameRegex.test(formData.lastName.trim())) errors.lastName = 'Last name contains invalid characters (letters, spaces, hyphens only)';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.sex) errors.sex = 'Sex is required';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below.');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!passwordChecks.minLen || !passwordChecks.hasUpper || !passwordChecks.numCount || !passwordChecks.hasSpecial) {
      errors.password = 'Password does not meet all requirements.';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }

    if (formData.phone && formData.phone.trim() !== '') {
      const digits = String(formData.phone).replace(/\D/g, '');
      if (!(digits.length === 11 && digits.startsWith('09'))) {
        errors.phone = 'Phone must be 11 digits and start with 09';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below.');
      return false;
    }

    return true;
  };

  const validateLoginForm = () => {
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fill in all fields.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setSignupStep(2);
      setError('');
      // Ensure password visibility is off when entering step 2
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  };

  const handleBackStep = () => {
    setSignupStep(1);
    setError('');
    // Reset visibility when going back
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Platform': 'mobile',
          [TRUSTED_DEVICE_HEADER]: rememberDevice ? 'true' : 'false',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();
      const accessToken = data?.access_token || data?.token || data?.user?.token || null;
      const refreshToken = data?.refresh_token || null;

      if (response.ok) {
        // If login succeeded but account is unverified landlord, we handle it
        if (data.user && data.user.role === 'landlord' && !data.user.is_verified) {
          if (data.verification_status === 'rejected') {
            setPendingModalData({
              status: 'rejected_verification',
              title: 'Account Rejected',
              message: 'Your landlord verification was rejected.',
              reason: data.rejection_reason || 'No reason provided'
            });
            // Still save token because resubmit might need it
            if (accessToken) {
              await AsyncStorage.setItem('token', accessToken);
            }
            if (refreshToken) {
              await AsyncStorage.setItem('refresh_token', refreshToken);
            }
            setPendingModalVisible(true);
            return;
          }
        }

        // Persist token inside the user object for standardized access across the app
        const userObj = {
          ...(data.user || {}),
          token: accessToken,
          refresh_token: refreshToken,
          trusted_device: rememberDevice,
        };

        // Restore previously switched role if any (helps for unverified landlords)
        let effectiveRole = data.user.role;
        try {
          const savedRole = await AsyncStorage.getItem(`user_role_${data.user.id}`);
          // Only override if the backend returns tenant or landlord, and we have a local preference for the other.
          // This avoids touching special roles like 'caretaker' unless explicitly desired.
          if (savedRole && savedRole !== effectiveRole &&
            (effectiveRole === 'landlord' || effectiveRole === 'tenant') &&
            (savedRole === 'landlord' || savedRole === 'tenant')) {
            console.log(`🔄 Restoring persisted role preference: ${savedRole} (Backend was: ${effectiveRole})`);
            effectiveRole = savedRole;
            userObj.role = savedRole;
          }
        } catch (e) {
          console.error('Failed to restore role preference:', e);
        }

        await AsyncStorage.setItem('user', JSON.stringify(userObj));
        await AsyncStorage.setItem(TRUSTED_DEVICE_STORAGE_KEY, rememberDevice ? '1' : '0');
        // Keep legacy `token` key for backward compatibility
        if (accessToken) {
          await AsyncStorage.setItem('token', accessToken);
        } else {
          await AsyncStorage.removeItem('token');
        }
        if (refreshToken) {
          await AsyncStorage.setItem('refresh_token', refreshToken);
        } else {
          await AsyncStorage.removeItem('refresh_token');
        }
        await AsyncStorage.setItem('user_id', String(data.user.id));
        await AsyncStorage.setItem('hasLaunched', 'true');

        setAuthSession({
          authToken: accessToken,
          refreshToken,
          userId: data.user?.id ?? null,
          activeRole: effectiveRole,
        });


        console.log('✅ Login successful! Role:', effectiveRole, (effectiveRole !== data.user.role ? `(Backend: ${data.user.role})` : ''));
        console.log('✅ Token saved');
        console.log('✅ User ID saved:', data.user.id);

        if (onLoginSuccess) {
          onLoginSuccess(effectiveRole);
        }
      } else {
        // Check for pending verification (restricted)
        if (response.status === 403 && data.status === 'pending_verification') {
          if (data.requires_email_otp) {
            const retryAfterSeconds = Number(data.retry_after_seconds);
            const initialResendCooldown =
              Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                ? Math.floor(retryAfterSeconds)
                : data.otp_resent
                  ? 60
                  : 0;

            navigation.navigate('OtpVerification', {
              email: formData.email.trim(),
              initialResendCooldown,
              noticeMessage: data.otp_resent
                ? 'A new verification code has been sent to your email.'
                : data.message,
            });
            return;
          }

          setPendingModalData({
            status: data.status,
            title: 'Account Pending Review',
            message: data.message
          });
          setPendingModalVisible(true);
          return;
        }
        // Check for blocked user
        if (response.status === 403 && data.status === 'blocked') {
          setShowBlockedModal(true);
          return;
        }
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      // Build payload dynamically — only include middle_name if it has content
      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role: formData.role,
        date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : '',
        sex: formData.sex,
        agree_to_terms: agreedToTerms,
        terms_version: UNIFIED_TERMS_AND_CONDITIONS.version || 'v2.0',
        privacy_version: UNIFIED_TERMS_AND_CONDITIONS.version || 'v2.0',
        consent_platform: 'mobile',
      };

      // Only add middle_name if it's not empty/whitespace
      if (formData.middleName?.trim()) {
        payload.middle_name = formData.middleName.trim();
      }

      if (formData.phone?.trim()) {
        payload.phone = String(formData.phone).replace(/\D/g, '');
      }

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Success', 'Registration successful! Please verify your email.');
        console.log('User registered:', data.user);
        // W8: Clear saved form draft after successful registration
        AsyncStorage.removeItem('signup_form_draft').catch(() => { });
        // Navigate to OTP verification screen
        navigation.navigate('OtpVerification', { email: formData.email.trim() });
        // Reset form
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          phone: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'tenant',
          dateOfBirth: null,
          sex: ''
        });
        setAgreedToTerms(false);
        setSignupStep(1);
      } else {
        const errMsg = data.message || 'Registration failed. Please try again.';
        setError(errMsg);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const toggleScreen = () => {
    setIsLogin(!isLogin);
    setShowAuthMenu(false);
    setSignupStep(1);
    setFormData({ firstName: '', middleName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '', role: 'tenant', dateOfBirth: null, sex: '' });
    setAgreedToTerms(false);
    setError('');
    // Ensure password visibility is reset when switching screens
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClaimSuccess = (claimedEmail) => {
    setIsLogin(true);
    setError('');
    setFieldErrors({});
    setFormData((prev) => ({
      ...prev,
      email: claimedEmail || prev.email,
      password: '',
      confirmPassword: '',
    }));
    showSuccess('Account Claimed', 'Your account is now claimed. Sign in with your new credentials.');
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <BlockedUserModal visible={showBlockedModal} onClose={() => setShowBlockedModal(false)} />
      <PendingVerificationModal
        visible={pendingModalVisible}
        onClose={() => setPendingModalVisible(false)}
        data={pendingModalData}
        onResubmitPress={() => {
          setPendingModalVisible(false);
          setResubmitModalVisible(true);
        }}
        theme={theme}
      />
      <ResubmitModal
        visible={resubmitModalVisible}
        onClose={() => setResubmitModalVisible(false)}
        theme={theme}
      />
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
      <ClaimExistingAccountModal
        visible={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={handleClaimSuccess}
        theme={theme}
      />
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        theme={theme}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentWrapStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onClose && (
            <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
              <Ionicons name="close" size={18} color="#4B5563" />
              <Text style={styles.dismissButtonText}>Back to browsing</Text>
            </TouchableOpacity>
          )}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../../assets/Logo.png')}
              style={styles.logoFull}
              resizeMode="contain"
            />
          </View>
          <View style={styles.card}>
            {isLogin && showAuthMenu && (
              <TouchableOpacity
                style={styles.authMenuBackdrop}
                activeOpacity={1}
                onPress={() => setShowAuthMenu(false)}
              />
            )}

            {isLogin && (
              <View style={styles.authMenuAnchor}>
                <TouchableOpacity
                  style={styles.authMenuButton}
                  onPress={() => setShowAuthMenu((prev) => !prev)}
                  accessibilityLabel="Open authentication menu"
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {showAuthMenu && (
                  <View style={styles.authMenuDropdown}>
                    <TouchableOpacity
                      style={styles.authMenuItem}
                      onPress={() => {
                        setShowAuthMenu(false);
                        setShowClaimModal(true);
                      }}
                    >
                      <Text style={styles.authMenuItemText}>Claim Existing Account</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
              {!isLogin && (
                <Text style={styles.subtitle}>
                  Sign up to get started
                </Text>
              )}
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to continue' : !isLogin && signupStep === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* LOGIN FORM */}
            {isLogin ? (
              <View style={styles.form}>
                {/* Email Field */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => { /* move focus or let user press Return on password */ }}
                  />
                </View>
                {fieldErrors.email && <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>}

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
                {fieldErrors.password && <Text style={styles.inlineErrorText}>{fieldErrors.password}</Text>}

                <View style={styles.authQuickActionsRow}>
                  <TouchableOpacity
                    onPress={() => setRememberDevice((prev) => !prev)}
                    style={styles.rememberDeviceAction}
                    disabled={loading}
                  >
                    <View style={[styles.checkbox, styles.rememberDeviceCheckbox, rememberDevice && styles.checkboxChecked]}>
                      {rememberDevice ? (
                        <Ionicons name="checkmark" size={14} color={theme.colors.textInverse} />
                      ) : null}
                    </View>
                    <Text style={styles.rememberDeviceText}>Remember this device</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowForgotPasswordModal(true)}
                    style={styles.forgotPassword}
                    disabled={loading}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* SIGNUP FORM - MULTI STEP */
              <>
                {signupStep === 1 ? (
                  /* STEP 1: Role, First Name, Last Name */
                  <View style={styles.form}>
                    {/* First Name */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        placeholderTextColor="#9CA3AF"
                        value={formData.firstName}
                        onChangeText={(text) => handleInputChange('firstName', text)}
                        autoCapitalize="words"
                        editable={!loading}
                        returnKeyType="next"
                        onSubmitEditing={() => { /* proceed to next field */ }}
                      />
                    </View>
                    {fieldErrors.firstName && <Text style={styles.inlineErrorText}>{fieldErrors.firstName}</Text>}

                    {/* Middle Name (optional) */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Middle Name (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={formData.middleName}
                        onChangeText={(text) => handleInputChange('middleName', text)}
                        autoCapitalize="words"
                        editable={!loading}
                        returnKeyType="next"
                        onSubmitEditing={() => { /* proceed to last name */ }}
                      />
                    </View>

                    {/* Last Name */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        placeholderTextColor="#9CA3AF"
                        value={formData.lastName}
                        onChangeText={(text) => handleInputChange('lastName', text)}
                        autoCapitalize="words"
                        editable={!loading}
                        returnKeyType="done"
                        onSubmitEditing={handleNextStep}
                      />
                    </View>
                    {fieldErrors.lastName && <Text style={styles.inlineErrorText}>{fieldErrors.lastName}</Text>}

                    {/* Date of Birth Field */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TouchableOpacity
                        style={[styles.input, { justifyContent: 'center' }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={{ color: formData.dateOfBirth ? (theme.isDark ? '#FFF' : '#000') : '#9CA3AF' }}>
                          {formData.dateOfBirth ? formData.dateOfBirth.toISOString().split('T')[0] : 'Select Date of Birth'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.dateOfBirth || new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                        mode="date"
                        maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 17))}
                        display="default"
                        onChange={(event, date) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (date) {
                            handleInputChange('dateOfBirth', date);
                          }
                        }}
                      />
                    )}
                    {fieldErrors.dateOfBirth && <Text style={styles.inlineErrorText}>{fieldErrors.dateOfBirth}</Text>}

                    {/* Sex Field */}
                    <View style={{ marginBottom: 16 }}>
                      <TouchableOpacity
                        style={styles.selectTrigger}
                        onPress={() => setSexModalVisible(true)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="transgender-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                          <Text style={{ color: formData.sex ? (theme.isDark ? '#FFF' : '#000') : '#9CA3AF', fontSize: 16 }}>
                            {formData.sex ? (formData.sex === 'male' ? 'Male' : 'Female') : 'Select Sex'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                      {fieldErrors.sex && <Text style={styles.inlineErrorText}>{fieldErrors.sex}</Text>}
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleNextStep}
                    >
                      <Text style={styles.submitButtonText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* STEP 2: Email, Password, Confirm Password, Terms */
                  <View style={styles.form}>
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={handleBackStep}>
                      <Ionicons name="arrow-back" size={20} color="#16a34a" />
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>

                    {/* Email */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={formData.email}
                        onChangeText={(text) => handleInputChange('email', text)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                        returnKeyType="next"
                        onSubmitEditing={() => { /* focus password */ }}
                      />
                      {emailCheckLoading && <ActivityIndicator style={{ position: 'absolute', right: 15 }} />}
                    </View>
                    {emailCheckMsg && (
                      <Text style={[styles.emailAvailabilityText, { color: emailAvailable ? 'green' : 'red' }]}>
                        {emailCheckMsg}
                      </Text>
                    )}
                    {fieldErrors.email && <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>}

                    {/* Phone (Optional) */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Phone (Optional)"
                        placeholderTextColor="#9CA3AF"
                        value={formData.phone}
                        onChangeText={(text) => handleInputChange('phone', text)}
                        keyboardType="phone-pad"
                        editable={!loading}
                        maxLength={13}
                        returnKeyType="next"
                      />
                    </View>
                    {fieldErrors.phone && <Text style={styles.inlineErrorText}>{fieldErrors.phone}</Text>}

                    {/* Password */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                        returnKeyType="next"
                        onSubmitEditing={() => { /* focus confirm password */ }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                        disabled={loading}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.passwordChecksContainer}>
                      {!passwordChecks.minLen && (
                        <View style={styles.passwordCheckItem}>
                          <Ionicons name="ellipse-outline" size={16} color='#9CA3AF' />
                          <Text style={styles.passwordCheckText}>Minimum 8 characters</Text>
                        </View>
                      )}
                      {!passwordChecks.hasUpper && (
                        <View style={styles.passwordCheckItem}>
                          <Ionicons name="ellipse-outline" size={16} color='#9CA3AF' />
                          <Text style={styles.passwordCheckText}>At least 1 uppercase letter</Text>
                        </View>
                      )}
                      {!passwordChecks.numCount && (
                        <View style={styles.passwordCheckItem}>
                          <Ionicons name="ellipse-outline" size={16} color='#9CA3AF' />
                          <Text style={styles.passwordCheckText}>At least 2 numbers</Text>
                        </View>
                      )}
                      {!passwordChecks.hasSpecial && (
                        <View style={styles.passwordCheckItem}>
                          <Ionicons name="ellipse-outline" size={16} color='#9CA3AF' />
                          <Text style={styles.passwordCheckText}>At least 1 special character</Text>
                        </View>
                      )}
                    </View>
                    {fieldErrors.password && <Text style={styles.inlineErrorText}>{fieldErrors.password}</Text>}

                    {/* Confirm Password */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#9CA3AF"
                        value={formData.confirmPassword}
                        onChangeText={(text) => handleInputChange('confirmPassword', text)}
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIcon}
                        disabled={loading}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.confirmPassword && <Text style={styles.inlineErrorText}>{fieldErrors.confirmPassword}</Text>}

                    {/* Terms and Conditions */}
                    <View style={styles.termsContainer}>
                      <TouchableOpacity
                        style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                        onPress={() => setAgreedToTerms(!agreedToTerms)}
                        activeOpacity={0.7}
                      >
                        {agreedToTerms && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.termsText}>
                        Creating your account means you must agree with our{' '}
                        <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>terms and conditions</Text>
                        {' '}and{' '}
                        <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>privacy policy</Text>
                      </Text>
                    </View>
                    {fieldErrors.terms && <Text style={styles.inlineErrorText}>{fieldErrors.terms}</Text>}

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                      onPress={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator color="#FFFFFF" />
                          <Text style={styles.submitButtonText}>Signing Up...</Text>
                        </View>
                      ) : (
                        <Text style={styles.submitButtonText}>Sign Up</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Toggle Login/Signup */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={toggleScreen}>
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue as Guest Button - Only show when user logged out */}
            {onContinueAsGuest && (
              <View style={styles.guestOptionContainer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={onContinueAsGuest}
                  disabled={loading}
                >
                  <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.guestButtonText}>Continue as Guest</Text>
                </TouchableOpacity>
                <Text style={styles.guestHintText}>
                  Browse properties without signing in
                </Text>
              </View>
            )}

            {/* Register as Landlord */}
            {isLogin && (
              <View style={{ alignItems: 'center', marginTop: onContinueAsGuest ? 16 : 8, marginBottom: 12 }}>
                <TouchableOpacity onPress={() => navigation.navigate('LandlordRegister')}>
                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                    Want to list your property?{' '}
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Register as Landlord</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sex Selection Modal */}
      <Modal
        visible={sexModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setSexModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setSexModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.title, { fontSize: 18, marginBottom: 20, textAlign: 'center' }]}>Select Sex</Text>
            {[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = formData.sex === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    handleInputChange('sex', option.value);
                    setSexModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setSexModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
