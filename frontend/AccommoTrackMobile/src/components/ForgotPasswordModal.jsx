import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL as API_URL } from '../config';

const ForgotPasswordModal = ({ visible, onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const codeInputs = useRef([]);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Reset code sent to your email.');
        setStep(2);
      } else {
        Alert.alert('Error', data.message || 'Failed to send reset code.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, code: fullCode })
      });

      const data = await response.json();

      if (response.ok) {
        setStep(3);
      } else {
        Alert.alert('Error', data.message || 'Invalid code.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email,
          code: code.join(''),
          password,
          password_confirmation: confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully! You can now login.', [
          { text: 'OK', onPress: () => handleClose() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      codeInputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1].focus();
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setCode(['', '', '', '', '', '']);
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#4B5563" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Step Indicators */}
            <View style={styles.stepContainer}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
              ))}
            </View>

            {step === 1 && (
              <View style={styles.content}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail-outline" size={40} color="#16a34a" />
                </View>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.description}>
                  Enter your email address and we'll send you a 6-digit code to reset your password.
                </Text>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleSendCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.content}>
                <View style={styles.iconCircle}>
                  <Ionicons name="key-outline" size={40} color="#16a34a" />
                </View>
                <Text style={styles.title}>Verify Code</Text>
                <Text style={styles.description}>
                  Enter the 6-digit code sent to {email}. This code will expire in 10 minutes.
                </Text>

                <View style={styles.otpContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (codeInputs.current[index] = ref)}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!loading}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} disabled={loading}>
                  <Text style={styles.linkText}>Change Email</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={styles.content}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed-outline" size={40} color="#16a34a" />
                </View>
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.description}>
                  Create a strong new password for your account.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Simple SafeAreaView fallback if not using the library
const SafeAreaView = ({ children, style }) => (
  <View style={[{ flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  scrollContent: { padding: 25, alignItems: 'center' },
  stepContainer: { flexDirection: 'row', gap: 8, marginBottom: 30 },
  stepDot: { width: 30, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  stepDotActive: { backgroundColor: '#16a34a' },
  content: { width: '100%', alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  description: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 20,
    width: '100%'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
  primaryButton: {
    backgroundColor: '#16a34a',
    width: '100%',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  linkText: { color: '#6B7280', marginTop: 20, fontWeight: '600' }
});

export default ForgotPasswordModal;
