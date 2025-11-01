import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../styles/AuthScreen.styles.js';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'http://192.168.254.106:8000/api';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1 = first step, 2 = second step
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });

  const navigation = useNavigation();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.role) {
      setError('Please select a role (Tenant or Landlord)');
      return false;
    }
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (!agreedToTerms) {
      setError('You must agree to the terms and conditions');
      return false;
    }

    return true;
  };

  const validateLoginForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setSignupStep(2);
      setError('');
    }
  };

  const handleBackStep = () => {
    setSignupStep(1);
    setError('');
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;

    setLoading(true);
    setError('');

    console.log('🚀 Starting login...');
    console.log('🔗 API URL:', `${API_URL}/login`);

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
      console.log('📦 Response data:', data);

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        console.log('✅ Login successful!');
        console.log('👤 User role:', data.user.role);

        if (data.user.role === 'tenant') {
          console.log('🏠 Navigating to Tenant Home...');
          navigation.replace('TenantHome');
        } else if (data.user.role === 'landlord') {
          console.log('🏢 Landlord detected - No page yet');
          Alert.alert(
            'Welcome Landlord!',
            'Landlord dashboard coming soon. For now, only tenant access is available.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Invalid user role. Please contact support.');
        }
      } else {
        console.log('❌ Login failed:', data.message);
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('❌ Network Error:', err.message);
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
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
          role: formData.role
        })
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
                  lastName: '',
                  email: formData.email,
                  password: '',
                  confirmPassword: '',
                  role: ''
                });
                setAgreedToTerms(false);
              }
            }
          ]
        );
      } else {
        setError(data.message || 'Registration failed. Please try again.');
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
    setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: '' });
    setAgreedToTerms(false);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/AT-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoTextGreen}>ccommo</Text>
              <Text style={styles.logoTextGray}>rack</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          {/* Logo */}


          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
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
                />
              </View>

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

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
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
                  {/* Role Selection */}
                  <View style={styles.roleContainer}>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          formData.role === 'tenant' && styles.roleButtonActive
                        ]}
                        onPress={() => handleInputChange('role', 'tenant')}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            formData.role === 'tenant' && styles.roleButtonTextActive
                          ]}
                        >
                          Tenant
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          formData.role === 'landlord' && styles.roleButtonActive
                        ]}
                        onPress={() => handleInputChange('role', 'landlord')}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            formData.role === 'landlord' && styles.roleButtonTextActive
                          ]}
                        >
                          Landlord
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

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
                    />
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
                    <Ionicons name="arrow-back" size={20} color="#00A651" />
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
                    />
                  </View>

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}