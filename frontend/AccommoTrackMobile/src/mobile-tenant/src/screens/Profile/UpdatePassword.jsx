import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../../styles/Tenant/ProfilePage.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { API_BASE_URL as API_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function UpdatePasswordPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = async () => {
    let token = await AsyncStorage.getItem('auth_token');
    if (!token) token = await AsyncStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
  };

  const validate = () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
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
      const response = await fetch(`${API_URL}/tenant/change-password`, {
        method: 'PUT',
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

      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        let errText = 'Failed to change password';
        try { const err = await response.json(); if (err?.message) errText = err.message; } catch(e){}
        Alert.alert('Error', errText);
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', 'Network error while changing password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={[homeStyles.header, { backgroundColor: theme.colors.primary }]}> 
        <View style={homeStyles.headerSide}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]}>Update Password</Text>
        </View>

        <View style={homeStyles.headerSide}>
          <TouchableOpacity onPress={handleSave} disabled={saving || !newPassword} style={{ paddingHorizontal: 8 }}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Ionicons name="save-outline" size={20} color={theme.colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowCurrent(s => !s)} style={{ padding: 8 }}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowNew(s => !s)} style={{ padding: 8 }}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={{ padding: 8 }}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}
