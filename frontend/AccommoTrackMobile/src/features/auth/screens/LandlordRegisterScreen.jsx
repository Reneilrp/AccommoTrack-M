import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from '../../../styles/AuthScreen.styles.js';
import { API_BASE_URL as API_URL } from '../../../config/index.js';
import { showSuccess, showError } from '../../../utils/toast.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

import { UNIFIED_TERMS_AND_CONDITIONS } from '../../../shared/LegalContent.js';

// —————— Terms & Conditions Modal ——————
const TermsModal = ({ visible, onClose, theme }) => {
  const styles = useMemo(() => getStyles(theme), [theme]);
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
          <View style={{ backgroundColor: theme.colors.primary + '10', padding: 12, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: theme.colors.primary }}>
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
              By using AccommoTrack, you agree to be a respectful member of our community, provide truthful information, and follow property rules.
            </Text>
          </View>

          {UNIFIED_TERMS_AND_CONDITIONS.sections.map((section, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{section.title}</Text>
              {Array.isArray(section.content) ? (
                section.content.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', marginBottom: 6, paddingLeft: 4 }}>
                    <Text style={{ color: theme.colors.primary, marginRight: 8, fontSize: 14 }}>•</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, flex: 1 }}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{section.content}</Text>
              )}
            </View>
          ))}
          
          <View style={{ marginTop: 10, padding: 15, backgroundColor: theme.colors.card, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
              If you have any questions about these terms, please contact us through the Help & Support page.
            </Text>
          </View>
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
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

// —————— Main Screen ——————
export default function LandlordRegisterScreen({ navigation, onRegisterSuccess }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: null,
    gender: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    validIdType: '',
    validIdOther: '',
    validId: null,
    permit: null,
    agree: false,
  });

  // Email check
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const emailCheckTimeout = useRef(null);

  // Password checks
  const [passwordChecks, setPasswordChecks] = useState({
    minLen: false, hasUpper: false, numCount: false, hasSpecial: false,
  });

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ID types
  const [idTypes, setIdTypes] = useState([]);
  const [idTypesLoading, setIdTypesLoading] = useState(false);

  // ——— Fetch ID types when reaching step 3 ———
  useEffect(() => {
    if (step === 3 && idTypes.length === 0 && !idTypesLoading) {
      setIdTypesLoading(true);
      fetch(`${API_URL}/valid-id-types`)
        .then(res => res.json())
        .then(data => {
          setIdTypes(Array.isArray(data) ? data : []);
          setIdTypesLoading(false);
        })
        .catch(() => {
          setIdTypes(['Passport', "Driver's License", 'National ID', 'SSS UMID', 'PhilHealth ID', 'Other']);
          setIdTypesLoading(false);
        });
    }
  }, [step, idTypes.length, idTypesLoading]);

  // ——— Live email check (debounced) ———
  useEffect(() => {
    if (step !== 2 || !form.email) return;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(form.email)) {
      setEmailAvailable(null);
      setEmailCheckMsg('');
      return;
    }
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
    emailCheckTimeout.current = setTimeout(async () => {
      setEmailCheckLoading(true);
      try {
        const res = await fetch(`${API_URL}/check-email?email=${form.email}`);
        const data = await res.json();
        setEmailAvailable(data.available);
        setEmailCheckMsg(data.available ? '' : (data.message || 'Email is already taken'));
      } catch {
        setEmailAvailable(null);
        setEmailCheckMsg('');
      } finally {
        setEmailCheckLoading(false);
      }
    }, 500);

    return () => { if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current); };
  }, [form.email, step]);

  // ——— Input handler ———
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'email') {
      setEmailAvailable(null);
      setEmailCheckMsg('');
    }
    if (field === 'password') {
      setPasswordChecks({
        minLen: value.length >= 8,
        hasUpper: /[A-Z]/.test(value),
        numCount: (value.match(/\d/g) || []).length >= 2,
        hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(value),
      });
    }
  };

  // ——— Validations ———
  const nameRegex = /^[\p{L} '-]+$/u;

  const validateStep = () => {
    const errors = {};
    if (step === 1) {
      if (!form.firstName?.trim()) errors.firstName = 'First name is required';
      else if (!nameRegex.test(form.firstName.trim())) errors.firstName = 'First name contains invalid characters';
      if (form.middleName?.trim() && !nameRegex.test(form.middleName.trim())) errors.middleName = 'Middle name contains invalid characters';
      if (!form.lastName?.trim()) errors.lastName = 'Last name is required';
      else if (!nameRegex.test(form.lastName.trim())) errors.lastName = 'Last name contains invalid characters';
      if (!form.dob) errors.dob = 'Date of birth is required';
      else {
        const bd = new Date(form.dob);
        const today = new Date();
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        if (age < 20) errors.dob = 'You must be at least 20 years old to register as a landlord';
        else if (age > 100) errors.dob = 'Please enter a valid date of birth';
      }
      if (!form.gender) errors.gender = 'Gender is required';
    } else if (step === 2) {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!form.email?.trim()) errors.email = 'Email address is required';
      else if (!emailRegex.test(form.email.trim())) errors.email = 'Please enter a valid email address';
      else if (emailAvailable === false) errors.email = emailCheckMsg || 'Email is already taken';

      if (form.phone?.trim()) {
        const digits = form.phone.replace(/\D/g, '');
        if (!(digits.length === 11 && digits.startsWith('09'))) {
          errors.phone = 'Philippine mobile number must be 11 digits starting with 09';
        }
      }

      if (!form.password) errors.password = 'Password is required';
      else {
        const pwd = form.password;
        if (pwd.length < 8) errors.password = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(pwd)) errors.password = 'Password must include at least one uppercase letter';
        else if ((pwd.match(/\d/g) || []).length < 2) errors.password = 'Password must include at least two numbers';
        else if (!/[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(pwd)) errors.password = 'Password must include at least one special character';
      }
      if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
      else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    } else if (step === 3) {
      if (!form.validIdType) errors.validIdType = 'Please select a valid ID type';
      else if (form.validIdType === 'Other' && !form.validIdOther?.trim()) errors.validIdOther = 'Please specify the type of ID';
      if (!form.validId) errors.validId = 'Please upload a copy of your valid ID';
      if (!form.permit) errors.permit = 'Please upload your accommodation or business permit';
      if (!form.agree) errors.agree = 'You must agree to the terms and conditions';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => { if (validateStep()) setStep(prev => prev + 1); };
  const handleBack = () => { setError(''); setStep(prev => prev - 1); };

  // ——— Image picker ———
  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setForm(prev => ({ ...prev, [field]: result.assets[0] }));
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ——— Submit ———
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');

    try {
      // Pre-submit email check
      try {
        const chk = await fetch(`${API_URL}/check-email?email=${form.email}`);
        const chkData = await chk.json();
        if (chkData.available === false) {
          setFieldErrors({ email: chkData.message || 'Email is already taken' });
          setError('Please fix the highlighted fields.');
          setSubmitting(false);
          return;
        }
      } catch { /* ignore */ }

      const formData = new FormData();
      formData.append('first_name', form.firstName.trim());
      if (form.middleName?.trim()) formData.append('middle_name', form.middleName.trim());
      formData.append('last_name', form.lastName.trim());
      formData.append('dob', form.dob ? new Date(form.dob).toISOString().split('T')[0] : '');
      formData.append('gender', form.gender);
      formData.append('email', form.email.trim());
      if (form.phone?.trim()) formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('valid_id_type', form.validIdType);
      if (form.validIdType === 'Other') formData.append('valid_id_other', form.validIdOther);
      formData.append('agree', form.agree ? '1' : '0');

      // Attach files
      const appendFile = (key, asset) => {
        const uri = asset.uri;
        const ext = uri.split('.').pop() || 'jpg';
        formData.append(key, { uri, name: `${key}.${ext}`, type: `image/${ext}` });
      };
      appendFile('valid_id', form.validId);
      appendFile('permit', form.permit);

      const response = await fetch(`${API_URL}/landlord-verification`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Application Submitted!',
          'Your landlord registration has been successfully submitted. Our administrators will review your documents within 1-3 business days. You will receive an email once your account is verified.',
          [{ text: 'Return to Login', onPress: () => navigation.goBack() }]
        );
      } else {
        // Handle server validation errors
        const srvErrs = data.errors;
        if (srvErrs) {
          const map = {};
          const keyMap = { first_name: 'firstName', middle_name: 'middleName', last_name: 'lastName', email: 'email', phone: 'phone', password: 'password', dob: 'dob' };
          for (const k in srvErrs) {
            const local = keyMap[k] || k;
            map[local] = srvErrs[k][0];
          }
          setFieldErrors(map);
          setError(data.message || 'Please fix highlighted fields.');
        } else {
          setError(data.message || 'Submission failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Landlord registration error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // ——— Render helpers ———
  const renderInput = (icon, placeholder, field, options = {}) => {
    const { secure, keyboardType, autoCapitalize, toggleVisibility, isVisible } = options;
    return (
      <View>
        <View style={[styles.inputContainer, fieldErrors[field] && { borderColor: theme.colors.error }]}>
          <Ionicons name={icon} size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            value={form[field]}
            onChangeText={(v) => handleChange(field, v)}
            secureTextEntry={secure && !isVisible}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize || 'sentences'}
          />
          {toggleVisibility && (
            <TouchableOpacity onPress={toggleVisibility} style={styles.eyeIcon}>
              <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
          {field === 'email' && emailCheckLoading && (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
          {field === 'email' && !emailCheckLoading && emailAvailable === true && (
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          )}
          {field === 'email' && !emailCheckLoading && emailAvailable === false && (
            <Ionicons name="close-circle" size={20} color={theme.colors.error} />
          )}
        </View>
        {fieldErrors[field] ? <Text style={styles.inlineErrorText}>{fieldErrors[field]}</Text> : null}
        {field === 'email' && emailAvailable === false && !fieldErrors.email ? (
          <Text style={[styles.emailAvailabilityText, { color: theme.colors.error }]}>{emailCheckMsg}</Text>
        ) : null}
      </View>
    );
  };

  // Step indicators
  const stepLabels = ['Personal Info', 'Credentials', 'Documents'];

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} theme={theme} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Landlord Registration</Text>
              <Text style={styles.subtitle}>Step {step} of 3 — {stepLabels[step - 1]}</Text>
            </View>

            {/* Step Indicator */}
            <View style={{ flexDirection: 'row', marginBottom: 20, gap: 8 }}>
              {[1, 2, 3].map(s => (
                <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= step ? theme.colors.primary : theme.colors.border }} />
              ))}
            </View>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ——— Step 1: Personal Info ——— */}
            {step === 1 && (
              <View style={styles.form}>
                {renderInput('person-outline', 'First Name *', 'firstName', { autoCapitalize: 'words' })}
                {renderInput('person-outline', 'Middle Name (optional)', 'middleName', { autoCapitalize: 'words' })}
                {renderInput('person-outline', 'Last Name *', 'lastName', { autoCapitalize: 'words' })}

                {/* Date of Birth */}
                <View>
                  <TouchableOpacity
                    style={[styles.inputContainer, fieldErrors.dob && { borderColor: theme.colors.error }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                    <Text style={[styles.input, { paddingVertical: 14, color: form.dob ? theme.colors.text : theme.colors.textTertiary }]}>
                      {form.dob ? new Date(form.dob).toLocaleDateString() : 'Date of Birth *'}
                    </Text>
                  </TouchableOpacity>
                  {fieldErrors.dob ? <Text style={styles.inlineErrorText}>{fieldErrors.dob}</Text> : null}
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.dob ? new Date(form.dob) : new Date(2000, 0, 1)}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(e, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) handleChange('dob', selectedDate);
                    }}
                  />
                )}

                {/* Gender */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 }}>Gender *</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[{ value: 'male', label: 'Male', icon: 'male' }, { value: 'female', label: 'Female', icon: 'female' }, { value: 'rather_not_say', label: 'Prefer not to say', icon: 'ellipsis-horizontal' }].map(g => (
                      <TouchableOpacity
                        key={g.value}
                        onPress={() => handleChange('gender', g.value)}
                        style={[styles.roleButton, form.gender === g.value && styles.roleButtonActive, { flexDirection: 'row', gap: 6, justifyContent: 'center' }]}
                      >
                        <Ionicons name={g.icon} size={16} color={form.gender === g.value ? theme.colors.primary : theme.colors.textSecondary} />
                        <Text style={[styles.roleButtonText, form.gender === g.value && styles.roleButtonTextActive, { fontSize: 12 }]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {fieldErrors.gender ? <Text style={styles.inlineErrorText}>{fieldErrors.gender}</Text> : null}
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
                  <Text style={styles.submitButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ——— Step 2: Credentials ——— */}
            {step === 2 && (
              <View style={styles.form}>
                {renderInput('mail-outline', 'Email Address *', 'email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
                {renderInput('call-outline', 'Phone (09XXXXXXXXX)', 'phone', { keyboardType: 'phone-pad' })}
                {renderInput('lock-closed-outline', 'Password *', 'password', {
                  secure: true,
                  toggleVisibility: () => setShowPassword(!showPassword),
                  isVisible: showPassword,
                })}
                {renderInput('lock-closed-outline', 'Confirm Password *', 'confirmPassword', {
                  secure: true,
                  toggleVisibility: () => setShowConfirmPassword(!showConfirmPassword),
                  isVisible: showConfirmPassword,
                })}

                {/* Password requirements */}
                {form.password.length > 0 && (
                  <View style={styles.passwordChecksContainer}>
                    {[
                      { key: 'minLen', label: 'At least 8 characters' },
                      { key: 'hasUpper', label: 'One uppercase letter' },
                      { key: 'numCount', label: 'At least two numbers' },
                      { key: 'hasSpecial', label: 'One special character' },
                    ].map(c => (
                      <View key={c.key} style={styles.passwordCheckItem}>
                        <Ionicons name={passwordChecks[c.key] ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={passwordChecks[c.key] ? theme.colors.primary : '#9CA3AF'} />
                        <Text style={[styles.passwordCheckText, passwordChecks[c.key] && { color: theme.colors.primary }]}>{c.label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.submitButton, { flex: 1, backgroundColor: theme.colors.backgroundSecondary }]} onPress={handleBack}>
                    <Text style={[styles.submitButtonText, { color: theme.colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitButton, { flex: 2 }]} onPress={handleNext}>
                    <Text style={styles.submitButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ——— Step 3: Documents ——— */}
            {step === 3 && (
              <View style={styles.form}>
                {/* ID Type */}
                <View>
                  <Text style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.text }}>Valid ID Type *</Text>
                  {idTypesLoading ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ marginBottom: 16 }} />
                  ) : (
                    <View style={styles.idTypeContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.idTypeScroll}>
                        {idTypes.map(type => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => handleChange('validIdType', type)}
                            style={[styles.idTypeBadge, { backgroundColor: form.validIdType === type ? theme.colors.primary : theme.colors.backgroundSecondary }]}
                          >
                            <Text style={[styles.idTypeBadgeText, { color: form.validIdType === type ? theme.colors.textInverse : theme.colors.text }]}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {fieldErrors.validIdType ? <Text style={styles.inlineErrorText}>{fieldErrors.validIdType}</Text> : null}
                </View>

                {form.validIdType === 'Other' && renderInput('document-text-outline', 'Specify ID type *', 'validIdOther')}

                {/* Upload Valid ID */}
                <TouchableOpacity
                  onPress={() => pickImage('validId')}
                  style={[styles.uploadButton, { borderColor: form.validId ? theme.colors.primary : (fieldErrors.validId ? theme.colors.error : theme.colors.border), backgroundColor: form.validId ? theme.colors.primaryLight : theme.colors.backgroundSecondary }]}
                >
                  {form.validId ? (
                    <Image source={{ uri: form.validId.uri }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.textTertiary} />
                      <Text style={[styles.uploadButtonText, { color: theme.colors.textTertiary }]}>Upload Valid ID *</Text>
                    </>
                  )}
                </TouchableOpacity>
                {fieldErrors.validId ? <Text style={styles.inlineErrorText}>{fieldErrors.validId}</Text> : null}

                {/* Upload Permit */}
                <TouchableOpacity
                  onPress={() => pickImage('permit')}
                  style={[styles.uploadButton, { borderColor: form.permit ? theme.colors.primary : (fieldErrors.permit ? theme.colors.error : theme.colors.border), backgroundColor: form.permit ? theme.colors.primaryLight : theme.colors.backgroundSecondary }]}
                >
                  {form.permit ? (
                    <Image source={{ uri: form.permit.uri }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={32} color={theme.colors.textTertiary} />
                      <Text style={[styles.uploadButtonText, { color: theme.colors.textTertiary }]}>Upload Business/Accommodation Permit *</Text>
                    </>
                  )}
                </TouchableOpacity>
                {fieldErrors.permit ? <Text style={styles.inlineErrorText}>{fieldErrors.permit}</Text> : null}

                {/* Terms checkbox */}
                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => handleChange('agree', !form.agree)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, form.agree && styles.checkboxChecked]}>
                    {form.agree && <Ionicons name="checkmark" size={14} color={theme.colors.textInverse} />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>Terms and Conditions</Text>
                    {' '}and confirm that all information provided is accurate.
                  </Text>
                </TouchableOpacity>
                {fieldErrors.agree ? <Text style={styles.inlineErrorText}>{fieldErrors.agree}</Text> : null}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.submitButton, { flex: 1, backgroundColor: theme.colors.backgroundSecondary }]} onPress={handleBack}>
                    <Text style={[styles.submitButtonText, { color: theme.colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, { flex: 2 }, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color={theme.colors.textInverse} size="small" />
                        <Text style={styles.submitButtonText}>Submitting...</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>Submit Application</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Info Banner (step 1 only) */}
            {step === 1 && (
              <View style={{ backgroundColor: theme.isDark ? '#1a2e1a' : '#F0FDF4', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.isDark ? '#2d4a2d' : '#BBF7D0' }}>
                <Text style={{ fontWeight: 'bold', color: theme.isDark ? '#86EFAC' : '#166534', marginBottom: 4, fontSize: 13 }}>📋 Documents Needed</Text>
                <Text style={{ color: theme.isDark ? '#A7F3D0' : '#15803D', fontSize: 12, lineHeight: 18 }}>
                  • Valid Government-issued ID (Passport, Driver's License, etc.){'\n'}
                  • Accommodation/Business Permit{'\n'}
                  Verification takes 1-3 business days.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
