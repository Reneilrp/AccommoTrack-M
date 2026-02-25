import { useState, useEffect, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from '../../styles/AuthScreen.styles.js';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL as API_URL } from '../../config';
import BlockedUserModal from '../../components/BlockedUserModal';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { useTheme } from '../../contexts/ThemeContext';

const PendingVerificationModal = ({ visible, onClose, data, onResubmitPress, theme }) => {
  const isPending = data.status === 'pending_verification';
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 25, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, borderWidth: theme.isDark ? 1 : 0, borderColor: theme.colors.border }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isPending ? (theme.isDark ? theme.colors.warningLight : '#FEF3C7') : (theme.isDark ? theme.colors.errorLight : '#FEE2E2'), justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name={isPending ? "time-outline" : "close-circle-outline"} size={45} color={isPending ? theme.colors.warning : theme.colors.error} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10, textAlign: 'center' }}>{data.title}</Text>
          <Text style={{ fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: isPending ? 25 : 15, lineHeight: 22 }}>
            {data.message}
          </Text>

          {!isPending && data.reason ? (
            <View style={{ backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2', borderLeftWidth: 4, borderLeftColor: theme.colors.error, padding: 12, borderRadius: 8, marginBottom: 25, width: '100%' }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.isDark ? theme.colors.text : '#B91C1C', textTransform: 'uppercase', marginBottom: 4 }}>Reason:</Text>
              <Text style={{ fontSize: 14, color: theme.isDark ? theme.colors.textSecondary : '#7F1D1D', fontStyle: 'italic' }}>"{data.reason}"</Text>
            </View>
          ) : null}

          <View style={{ width: '100%', gap: 10 }}>
            {!isPending && (
              <TouchableOpacity 
                onPress={onResubmitPress}
                style={{ backgroundColor: theme.colors.error, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.textInverse} />
                <Text style={{ color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 16 }}>Resubmit Documents</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={onClose}
              style={{ backgroundColor: isPending ? theme.colors.primary : theme.colors.backgroundSecondary, paddingVertical: 12, borderRadius: 12, width: '100%' }}
            >
              <Text style={{ color: isPending ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
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
        .then(data => setIdTypes(data))
        .catch(() => setIdTypes(['Passport', 'Driver\'s License', 'National ID', 'UMID', 'Postal ID', 'Other']));
    }
  }, [visible]);

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm(prev => ({ ...prev, [field]: result.assets[0] }));
    }
  };

  const handleSubmit = async () => {
    if (!form.validIdType || !form.validId || !form.permit) {
      Alert.alert('Error', 'Please fill in all fields and upload both documents.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('valid_id_type', form.validIdType);
      if (form.validIdType === 'Other') formData.append('valid_id_other', form.validIdOther);
      
      const idUri = form.validId.uri;
      const idExt = idUri.split('.').pop();
      formData.append('valid_id', {
        uri: idUri,
        name: `valid_id.${idExt}`,
        type: `image/${idExt}`
      });

      const permitUri = form.permit.uri;
      const permitExt = permitUri.split('.').pop();
      formData.append('permit', {
        uri: permitUri,
        name: `permit.${permitExt}`,
        type: `image/${permitExt}`
      });

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
        Alert.alert('Success', 'Documents resubmitted successfully! Please wait for admin review.');
        onClose();
      } else {
        Alert.alert('Error', data.message || 'Failed to resubmit documents.');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while resubmitting documents.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>Resubmit Documents</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 20 }}>
            Only your verification documents need to be re-uploaded. Your personal information will remain the same.
          </Text>

          <Text style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.text }}>Valid ID Type</Text>
          <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10 }}>
              {idTypes.map(type => (
                <TouchableOpacity 
                  key={type} 
                  onPress={() => setForm(prev => ({ ...prev, validIdType: type }))}
                  style={{ padding: 8, backgroundColor: form.validIdType === type ? theme.colors.primary : theme.colors.backgroundSecondary, borderRadius: 8, marginRight: 10 }}
                >
                  <Text style={{ color: form.validIdType === type ? theme.colors.textInverse : theme.colors.text }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity 
            onPress={() => pickImage('validId')}
            style={{ height: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: form.validId ? theme.colors.primary : theme.colors.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: form.validId ? theme.colors.primaryLight : theme.colors.backgroundSecondary }}
          >
            {form.validId ? (
              <Image source={{ uri: form.validId.uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textTertiary, marginTop: 8 }}>Upload Valid ID</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => pickImage('permit')}
            style={{ height: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: form.permit ? theme.colors.primary : theme.colors.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 30, backgroundColor: form.permit ? theme.colors.primaryLight : theme.colors.backgroundSecondary }}
          >
            {form.permit ? (
              <Image source={{ uri: form.permit.uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textTertiary, marginTop: 8 }}>Upload Business Permit</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center' }}
          >
            {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={{ color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 18 }}>Submit Re-verification</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function AuthScreen({ onLoginSuccess, onClose, onContinueAsGuest }) {
  const { theme, isDarkMode } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
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
  const [pendingModalData, setPendingModalData] = useState({ title: '', message: '', status: '', reason: '' });
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    minLen: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'tenant' // Default to tenant for mobile app
  });

  const navigation = useNavigation();

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
    setFormData(prev => ({ ...prev, [field]: value }));
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
        hasLower: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
      });
    }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';

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

    if (!passwordChecks.minLen || !passwordChecks.hasUpper || !passwordChecks.hasLower || !passwordChecks.hasNumber) {
        errors.password = 'Password does not meet all requirements.';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
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
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

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
            if (data.token) await AsyncStorage.setItem('token', data.token);
            setPendingModalVisible(true);
            return;
          }
        }

        // Persist token inside the user object for standardized access across the app
        const userObj = { ...(data.user || {}), token: data.token || (data.user && data.user.token) };
        await AsyncStorage.setItem('user', JSON.stringify(userObj));
        // Keep legacy `token` key for backward compatibility
        if (data.token) {
          await AsyncStorage.setItem('token', data.token);
        }
        await AsyncStorage.setItem('user_id', String(data.user.id));
        await AsyncStorage.setItem('hasLaunched', 'true');

        
        console.log('✅ Login successful! Role:', data.user.role);
        console.log('✅ Token saved');
        console.log('✅ User ID saved:', data.user.id);
        
        if (onLoginSuccess) {
          onLoginSuccess(data.user.role);
        }
      } else {
        // Check for pending verification (restricted)
        if (response.status === 403 && data.status === 'pending_verification') {
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
      };

      // Only add middle_name if it's not empty/whitespace
      if (formData.middleName?.trim()) {
        payload.middle_name = formData.middleName.trim();
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
        Alert.alert(
          'Success',
          'Registration successful! Please login to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('User registered:', data.user);
                setIsLogin(true);
                setSignupStep(1);
                setFormData({
                  firstName: '',
                  middleName: '',
                  lastName: '',
                  email: formData.email,
                  password: '',
                  confirmPassword: '',
                  role: 'tenant'
                });
                setAgreedToTerms(false);
              }
            }
          ]
        );
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
    setSignupStep(1);
    setFormData({ firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'tenant' });
    setAgreedToTerms(false);
    setError('');
    // Ensure password visibility is reset when switching screens
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
              source={require('../../../assets/Logo.png')}
              style={styles.logoFull}
              resizeMode="contain"
            />
          </View>
          <View style={styles.card}>
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

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => setShowForgotPasswordModal(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

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
                    <Text style={{ color: emailAvailable ? 'green' : 'red', fontSize: 12, marginTop: -10, marginBottom: 10, paddingHorizontal: 5 }}>
                      {emailCheckMsg}
                    </Text>
                  )}
                  {fieldErrors.email && <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>}

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
                  <View style={{ marginTop: 10, paddingHorizontal: 5, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name={passwordChecks.minLen ? "checkmark-circle" : "ellipse-outline"} size={16} color={passwordChecks.minLen ? '#16a34a' : '#9CA3AF'} />
                      <Text style={{ marginLeft: 5, color: passwordChecks.minLen ? '#16a34a' : '#9CA3AF' }}>Minimum 8 characters</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name={passwordChecks.hasUpper ? "checkmark-circle" : "ellipse-outline"} size={16} color={passwordChecks.hasUpper ? '#16a34a' : '#9CA3AF'} />
                      <Text style={{ marginLeft: 5, color: passwordChecks.hasUpper ? '#16a34a' : '#9CA3AF' }}>At least one uppercase letter</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name={passwordChecks.hasLower ? "checkmark-circle" : "ellipse-outline"} size={16} color={passwordChecks.hasLower ? '#16a34a' : '#9CA3AF'} />
                      <Text style={{ marginLeft: 5, color: passwordChecks.hasLower ? '#16a34a' : '#9CA3AF' }}>At least one lowercase letter</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name={passwordChecks.hasNumber ? "checkmark-circle" : "ellipse-outline"} size={16} color={passwordChecks.hasNumber ? '#16a34a' : '#9CA3AF'} />
                      <Text style={{ marginLeft: 5, color: passwordChecks.hasNumber ? '#16a34a' : '#9CA3AF' }}>At least one number</Text>
                    </View>
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
                  <TouchableOpacity
                    style={styles.termsContainer}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                      {agreedToTerms && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.termsText}>
                      Creating your account means you must agree with our{' '}
                      <Text style={styles.termsLink}>terms and conditions</Text>
                      {' '}and{' '}
                      <Text style={styles.termsLink}>privacy policy</Text>
                    </Text>
                  </TouchableOpacity>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}
