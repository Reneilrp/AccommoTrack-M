import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import ProfileService from '../../../../services/ProfileService.js';

export default function ManualPaymentSettings({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gcashInfo, setGcashInfo] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [otherInfo, setOtherInfo] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await ProfileService.getProfile();
      if (res.success && res.data) {
        const settings = res.data.payment_methods_settings || {};
        const details = settings.details || {};
        setGcashInfo(details.gcash_info || '');
        setBankInfo(details.bank_info || '');
        setOtherInfo(details.other_info || '');
      }
    } catch (error) {
      console.error('Failed to load payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Get current profile to merge settings
      const currentProfileRes = await ProfileService.getProfile();
      if (!currentProfileRes.success) throw new Error('Could not fetch current settings');
      
      const currentSettings = currentProfileRes.data.payment_methods_settings || {};
      const currentAllowed = currentSettings.allowed || ['cash'];
      
      const payload = {
        payment_methods_settings: {
          allowed: currentAllowed,
          details: {
            gcash_info: gcashInfo,
            bank_info: bankInfo,
            other_info: otherInfo,
          }
        }
      };

      const res = await ProfileService.updateProfile(payload);
      if (res.success) {
        // Update local storage
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          user.payment_methods_settings = payload.payment_methods_settings;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
        
        Alert.alert('Success', 'Payment settings updated successfully');
        navigation.goBack();
      } else {
        throw new Error(res.error || 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const styles = getStyles(theme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Payments</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Enter the payment details you want to share with your tenants for manual transfers.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GCash Account Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Juan Dela Cruz - 0917 123 4567"
              multiline
              numberOfLines={3}
              value={gcashInfo}
              onChangeText={setGcashInfo}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>Used when GCash is enabled for a property.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Transfer Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., BDO: Juan Dela Cruz - 1234 5678 9012"
              multiline
              numberOfLines={3}
              value={bankInfo}
              onChangeText={setBankInfo}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>Include Bank Name, Account Name, and Number.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Other Payment Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Pay at the main office lobby, 9 AM - 5 PM."
              multiline
              numberOfLines={3}
              value={otherInfo}
              onChangeText={setOtherInfo}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>Any additional instructions for your tenants.</Text>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Payment Details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    height: 80,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
