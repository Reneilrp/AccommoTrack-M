import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import ProfileService from '../../../../services/ProfileService.js';
import Header from '../../components/Header.jsx';
import { showError, showSuccess } from '../../../../utils/toast.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
} from '../../hooks/useTenantQueryHelpers.js';

const DEFAULT_FORM = {
  room_preference: '',
  budget_range: '',
  attitude: '',
  behavior: '',
  lifestyle_notes: '',
  custom_preferences: [],
};

const ROOM_OPTIONS = [
  { label: 'Single Room', value: 'Single' },
  { label: 'Double Room', value: 'Double' },
  { label: 'Suite', value: 'Suite' },
  { label: 'Dormitory', value: 'Dormitory' },
  { label: 'Any', value: 'Any' },
];

const BUDGET_OPTIONS = [
  { label: 'Below ₱2,000', value: '<2000' },
  { label: '₱2,000 - ₱4,000', value: '2000-4000' },
  { label: '₱4,000 - ₱6,000', value: '4000-6000' },
  { label: 'Above ₱6,000', value: '6000+' },
];

const cloneFormState = (formState) => ({
  ...formState,
  custom_preferences: Array.isArray(formState?.custom_preferences)
    ? [...formState.custom_preferences]
    : [],
});

const normalizePreference = (rawPreference) => {
  if (!rawPreference) return { ...DEFAULT_FORM };

  let pref = rawPreference;
  if (typeof pref === 'string') {
    try {
      pref = JSON.parse(pref);
    } catch {
      pref = {};
    }
  }

  return {
    room_preference: pref.room_preference || '',
    budget_range: pref.budget_range || '',
    attitude: pref.attitude || '',
    behavior: pref.behavior || '',
    lifestyle_notes: pref.lifestyle_notes || pref.lifestyle || '',
    custom_preferences: Array.isArray(pref.custom_preferences) ? pref.custom_preferences : [],
  };
};

export default function PreferencesLifestyle() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const themedHomeStyles = useMemo(() => homeStyles(theme), [theme]);
  const showAlert = Alert.alert;

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [savedForm, setSavedForm] = useState({ ...DEFAULT_FORM });
  const [newPreference, setNewPreference] = useState('');

  const lifestylePreferencesQuery = useQuery({
    queryKey: tenantQueryKeys.lifestylePreferences(),
    queryFn: async () => {
      const res = await ProfileService.getProfile();
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to load preferences');
      }

      return res.data?.tenant_profile?.preference || null;
    },
    placeholderData: (previousData) => previousData,
  });

  const refetchLifestylePreferences = lifestylePreferencesQuery.refetch;
  const lifestylePreferencesRefetchers = useMemo(
    () => [refetchLifestylePreferences],
    [refetchLifestylePreferences],
  );

  useTenantFocusRefetch({ refetchers: lifestylePreferencesRefetchers });

  useEffect(() => {
    if (!lifestylePreferencesQuery.data && lifestylePreferencesQuery.data !== null) return;
    const pref = cloneFormState(normalizePreference(lifestylePreferencesQuery.data));
    setForm(pref);
    setSavedForm(pref);
  }, [lifestylePreferencesQuery.data]);

  useEffect(() => {
    if (!lifestylePreferencesQuery.error) return;
    console.error('Load tenant preferences error:', lifestylePreferencesQuery.error);
    showError('Error', lifestylePreferencesQuery.error.message || 'Failed to load preferences');
  }, [lifestylePreferencesQuery.error]);

  const loading = lifestylePreferencesQuery.isLoading;

  const setField = (field, value) => {
    if (!isEditing) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addCustomPreference = () => {
    if (!isEditing) return;

    const trimmed = newPreference.trim();
    if (!trimmed) return;

    setForm((prev) => ({
      ...prev,
      custom_preferences: [...prev.custom_preferences, trimmed],
    }));
    setNewPreference('');
  };

  const removeCustomPreference = (index) => {
    if (!isEditing) return;

    setForm((prev) => ({
      ...prev,
      custom_preferences: prev.custom_preferences.filter((_, i) => i !== index),
    }));
  };

  const cancelEditing = () => {
    if (saving) return;
    setForm(cloneFormState(savedForm));
    setNewPreference('');
    setIsEditing(false);
  };

  const handleBack = () => {
    if (!isEditing) {
      navigation.goBack();
      return;
    }

    showAlert(
      'Discard changes?',
      'You have unsaved preference changes.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            cancelEditing();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleEditPress = () => {
    if (saving) return;

    if (isEditing) {
      cancelEditing();
      return;
    }

    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!isEditing || saving) return;

    try {
      setSaving(true);

      const res = await ProfileService.updateTenantPreferences({
        room_preference: form.room_preference,
        budget_range: form.budget_range,
        attitude: form.attitude,
        behavior: form.behavior,
        lifestyle_notes: form.lifestyle_notes,
        custom_preferences: form.custom_preferences,
      });

      if (res.success) {
        const nextSavedState = cloneFormState(form);
        queryClient.setQueryData(tenantQueryKeys.lifestylePreferences(), nextSavedState);
        setSavedForm(nextSavedState);
        setForm(nextSavedState);
        setIsEditing(false);
        showSuccess('Preferences updated successfully');
      } else {
        showError('Error', res.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Save tenant preferences error:', error);
      showError('Error', 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const headerActions = [
    {
      icon: isEditing ? 'close-outline' : 'create-outline',
      onPress: handleEditPress,
      disabled: saving,
    },
    {
      icon: saving ? 'sync-outline' : 'save-outline',
      onPress: handleSave,
      disabled: !isEditing || saving,
    },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle="light-content" />
        <Header
          title="Preferences & Lifestyle"
          onBack={handleBack}
          rightActions={headerActions}
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      <Header
        title="Preferences & Lifestyle"
        onBack={handleBack}
        rightActions={headerActions}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          themedHomeStyles.contentContainerPadding,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View
          style={[
            styles.editStateBanner,
            {
              backgroundColor: isEditing ? `${theme.colors.primary}15` : theme.colors.backgroundSecondary,
              borderColor: isEditing ? `${theme.colors.primary}60` : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={isEditing ? 'create-outline' : 'eye-outline'}
            size={16}
            color={isEditing ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.editStateText,
              { color: isEditing ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {isEditing
              ? 'Editing enabled. Tap save icon to apply your changes.'
              : 'Read-only mode. Tap edit icon to update your preferences.'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Room Preference</Text>
          <View style={styles.optionRow}>
            {ROOM_OPTIONS.map((option) => {
              const selected = form.room_preference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      opacity: isEditing ? 1 : 0.7,
                    },
                  ]}
                  onPress={() => setField('room_preference', option.value)}
                  disabled={!isEditing}
                >
                  <Text
                    style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Budget Range (Monthly)</Text>
          <View style={styles.optionRow}>
            {BUDGET_OPTIONS.map((option) => {
              const selected = form.budget_range === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      opacity: isEditing ? 1 : 0.7,
                    },
                  ]}
                  onPress={() => setField('budget_range', option.value)}
                  disabled={!isEditing}
                >
                  <Text
                    style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Traits (Optional)</Text>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Help landlords get to know you better by describing your habits and personality.</Text>

          <Text style={[styles.label, { color: theme.colors.text }]}>Attitude</Text>
          <TextInput
            value={form.attitude}
            onChangeText={(text) => setField('attitude', text)}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="e.g., Friendly, Introverted, Outgoing"
            placeholderTextColor={theme.colors.textTertiary}
            editable={isEditing}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>Behavior</Text>
          <TextInput
            value={form.behavior}
            onChangeText={(text) => setField('behavior', text)}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="e.g., Quiet, Clean, Early Riser"
            placeholderTextColor={theme.colors.textTertiary}
            editable={isEditing}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>Lifestyle Notes</Text>
          <TextInput
            value={form.lifestyle_notes}
            onChangeText={(text) => setField('lifestyle_notes', text)}
            style={[
              styles.input,
              styles.textArea,
              { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
            ]}
            placeholder="Tell us about your daily routine, work/study schedule, or hobbies..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            editable={isEditing}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Lifestyle Preferences</Text>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Add your own lifestyle preferences (e.g., "No smoking", "Pet friendly", "Quiet hours after 10pm")</Text>

          <View style={styles.addPreferenceRow}>
            <TextInput
              value={newPreference}
              onChangeText={setNewPreference}
              style={[styles.addInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Type a preference..."
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={() => {
                if (isEditing) addCustomPreference();
              }}
              editable={isEditing}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: isEditing ? theme.colors.primary : theme.colors.textTertiary }]}
              onPress={addCustomPreference}
              disabled={!isEditing || !newPreference.trim()}
            >
              <Ionicons name="add" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>

          <View style={styles.preferencesContainer}>
            {form.custom_preferences.map((pref, index) => (
              <View
                key={index}
                style={[styles.preferenceChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.preferenceText, { color: theme.colors.text }]}>{pref}</Text>
                {isEditing && (
                  <TouchableOpacity onPress={() => removeCustomPreference(index)}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    content: {
      flex: 1,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    editStateBanner: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editStateText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
    },
    optionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    optionChip: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
      marginBottom: 8,
    },
    textArea: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    helperText: {
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 18,
    },
    addPreferenceRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preferencesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    preferenceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    preferenceText: {
      fontSize: 14,
    },
  });
