import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StatusBar, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from '../../../../styles/Tenant/ProfilePage.js';
import { API_BASE_URL as API_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import Header from '../../components/Header.jsx';

export default function UpdatePasswordPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [passwordChecks, setPasswordChecks] = useState({
    minLen: false,
    hasUpper: false,
    numCount: false,
    hasSpecial: false,
  });

  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
    setPasswordChecks({
      minLen: value.length >= 8,
      hasUpper: /[A-Z]/.test(value),
      numCount: (value.match(/\d/g) || []).length >= 2,
      hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(value),
    });
  };

  const getAuthHeaders = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const token = user?.token || (await AsyncStorage.getItem('token'));
        return {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        };
      }
    } catch (e) {}
    const fallback = await AsyncStorage.getItem('token');
    return {
      'Authorization': `Bearer ${fallback}`,
      'Accept': 'application/json'
    };
  };

  const validate = () => {
    if (!currentPassword) {
      Alert.alert('Validation', 'Current password is required');
      return false;
    }
    if (!passwordChecks.minLen || !passwordChecks.hasUpper || !passwordChecks.numCount || !passwordChecks.hasSpecial) {
      Alert.alert('Validation', 'New password does not meet requirements');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New password and confirmation do not match');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', 'Network error while changing password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Header 
        title="Update Password"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Current Password</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowCurrent(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              secureTextEntry={!showNew}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowNew(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.passwordChecksContainer}>
            <View style={styles.passwordCheckItem}>
              <Ionicons 
                name={passwordChecks.minLen ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={passwordChecks.minLen ? theme.colors.success : '#9CA3AF'} 
              />
              <Text style={[styles.passwordCheckText, passwordChecks.minLen && { color: theme.colors.success }]}>Minimum 8 characters</Text>
            </View>
            <View style={styles.passwordCheckItem}>
              <Ionicons 
                name={passwordChecks.hasUpper ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={passwordChecks.hasUpper ? theme.colors.success : '#9CA3AF'} 
              />
              <Text style={[styles.passwordCheckText, passwordChecks.hasUpper && { color: theme.colors.success }]}>At least 1 uppercase letter</Text>
            </View>
            <View style={styles.passwordCheckItem}>
              <Ionicons 
                name={passwordChecks.numCount ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={passwordChecks.numCount ? theme.colors.success : '#9CA3AF'} 
              />
              <Text style={[styles.passwordCheckText, passwordChecks.numCount && { color: theme.colors.success }]}>At least 2 numbers</Text>
            </View>
            <View style={styles.passwordCheckItem}>
              <Ionicons 
                name={passwordChecks.hasSpecial ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={passwordChecks.hasSpecial ? theme.colors.success : '#9CA3AF'} 
              />
              <Text style={[styles.passwordCheckText, passwordChecks.hasSpecial && { color: theme.colors.success }]}>At least 1 special character</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Confirm New Password</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }, (saving || !newPassword) && { opacity: 0.6 }]} 
          onPress={handleSave}
          disabled={saving || !newPassword}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
    formContainer: {
        padding: 16,
    },
    eyeBtn: {
        padding: 8,
    },
    saveButton: {
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
