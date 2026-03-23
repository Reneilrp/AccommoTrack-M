import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../styles/AuthScreen.styles.js';
import { API_BASE_URL as API_URL } from '../../../config/index.js';
import { showSuccess, showError } from '../../../utils/toast.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

export default function OtpVerificationScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const email = route?.params?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60); // Start with 60s cooldown since OTP was just sent
  const inputRefs = useRef([]);

  // Cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, 300);
  }, []);

  const handleOtpChange = (value, index) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const otpString = otp.join('');

  const handleVerify = async () => {
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/verify-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          email_otp_code: otpString,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Verified!', 'Your email has been verified successfully. Please login to continue.');
        // Navigate back to auth screen in login mode
        navigation.navigate('Auth');
      } else {
        setError(data.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/resend-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('OTP Sent', 'A new verification code has been sent to your email.');
        setResendCooldown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message || 'Failed to resend OTP.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.scrollContent, { flex: 1, justifyContent: 'center' }]}>
          {/* Back */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            {/* Icon */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.isDark ? '#1a2e1a' : '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={32} color={theme.colors.primary} />
              </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                A 6-digit verification code has been sent to{' '}
                <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{email}</Text>
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* OTP boxes */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => { inputRefs.current[i] = ref; }}
                  style={{
                    width: 48,
                    height: 56,
                    borderWidth: 2,
                    borderColor: digit ? theme.colors.primary : (error ? theme.colors.error : theme.colors.border),
                    borderRadius: 12,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  }}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.submitButton, (loading || otpString.length !== 6) && styles.submitButtonDisabled]}
              onPress={handleVerify}
              disabled={loading || otpString.length !== 6}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.colors.textInverse} size="small" />
                  <Text style={styles.submitButtonText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Verify Account</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
              {resendCooldown > 0 ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                  Resend code in <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{resendCooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={loading}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>
                    Didn't receive the code? <Text style={{ textDecorationLine: 'underline' }}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
