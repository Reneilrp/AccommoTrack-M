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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  cleanliness_level: 'moderate',
  noise_tolerance: 'moderate',
  guest_policy: 'occasional',
  sleep_schedule: 'regular',
  work_study_hours: 'flexible',
};

const ROOM_OPTIONS = ['Solo', 'Shared', 'Any'];
const CLEANLINESS_OPTIONS = ['Very Clean', 'Moderate', 'Relaxed'];
const NOISE_OPTIONS = ['Very Quiet', 'Moderate', 'Tolerant'];
const GUEST_OPTIONS = ['No Guests', 'Occasional', 'Frequent'];
const SLEEP_OPTIONS = ['Early Bird', 'Regular', 'Night Owl'];
const WORK_STUDY_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

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
    cleanliness_level: pref.cleanliness_level || 'moderate',
    noise_tolerance: pref.noise_tolerance || 'moderate',
    guest_policy: pref.guest_policy || 'occasional',
    sleep_schedule: pref.sleep_schedule || 'regular',
    work_study_hours: pref.work_study_hours || 'flexible',
  };
};

export default function PreferencesLifestyle() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
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
    const pref = normalizePreference(lifestylePreferencesQuery.data);
    setForm(pref);
  }, [lifestylePreferencesQuery.data]);

  useEffect(() => {
    if (!lifestylePreferencesQuery.error) return;
    console.error('Load tenant preferences error:', lifestylePreferencesQuery.error);
    showError('Error', lifestylePreferencesQuery.error.message || 'Failed to load preferences');
  }, [lifestylePreferencesQuery.error]);

  const loading = lifestylePreferencesQuery.isLoading;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addCustomPreference = () => {
    if (newPreference.trim()) {
      setForm((prev) => ({
        ...prev,
        custom_preferences: [...prev.custom_preferences, newPreference.trim()],
      }));
      setNewPreference('');
    }
  };

  const removeCustomPreference = (index) => {
    setForm((prev) => ({
      ...prev,
      custom_preferences: prev.custom_preferences.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        preference: {
          room_preference: form.room_preference,
          budget_range: form.budget_range,
          attitude: form.attitude,
          behavior: form.behavior,
          lifestyle_notes: form.lifestyle_notes,
          custom_preferences: form.custom_preferences,
          cleanliness_level: form.cleanliness_level,
          noise_tolerance: form.noise_tolerance,
          guest_policy: form.guest_policy,
          sleep_schedule: form.sleep_schedule,
          work_study_hours: form.work_study_hours,
        },
      };

      const res = await ProfileService.updateProfile(payload);

      if (res.success) {
        queryClient.setQueryData(tenantQueryKeys.lifestylePreferences(), payload.preference);
        showSuccess('Preferences updated successfully');
        navigation.goBack();
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle="light-content" />
        <Header
          title="Preferences & Lifestyle"
          onBack={() => navigation.goBack()}
          showProfile={false}
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
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={homeStyles.contentContainerPadding}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Room Preference</Text>
          <View style={styles.optionRow}>
            {ROOM_OPTIONS.map((option) => {
              const selected = form.room_preference === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('room_preference', option)}
                >
                  <Text
                    style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Budget Range (Monthly)</Text>
          <TextInput
            value={form.budget_range}
            onChangeText={(text) => setField('budget_range', text)}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="e.g. 5000-8000"
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>Attitude</Text>
          <TextInput
            value={form.attitude}
            onChangeText={(text) => setField('attitude', text)}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="Friendly, independent, etc."
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>Behavior</Text>
          <TextInput
            value={form.behavior}
            onChangeText={(text) => setField('behavior', text)}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="Daily habits and routines"
            placeholderTextColor={theme.colors.textTertiary}
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
            placeholder="Describe your lifestyle and living preferences"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Living Preferences</Text>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Add your own lifestyle preferences (e.g., "No smoking", "Pet friendly", "Quiet hours after 10pm")
          </Text>

          <View style={styles.addPreferenceRow}>
            <TextInput
              value={newPreference}
              onChangeText={setNewPreference}
              style={[styles.addInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Type a preference..."
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={addCustomPreference}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={addCustomPreference}
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
                <TouchableOpacity onPress={() => removeCustomPreference(index)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Lifestyle Habits</Text>

          <Text style={[styles.label, { color: theme.colors.text }]}>Cleanliness Level</Text>
          <View style={styles.optionRow}>
            {CLEANLINESS_OPTIONS.map((option) => {
              const value = option.toLowerCase().replace(' ', '_');
              const selected = form.cleanliness_level === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('cleanliness_level', value)}
                >
                  <Text style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Noise Tolerance</Text>
          <View style={styles.optionRow}>
            {NOISE_OPTIONS.map((option) => {
              const value = option.toLowerCase().replace(' ', '_');
              const selected = form.noise_tolerance === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('noise_tolerance', value)}
                >
                  <Text style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Guest Policy</Text>
          <View style={styles.optionRow}>
            {GUEST_OPTIONS.map((option) => {
              const value = option.toLowerCase().replace(' ', '_');
              const selected = form.guest_policy === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('guest_policy', value)}
                >
                  <Text style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Sleep Schedule</Text>
          <View style={styles.optionRow}>
            {SLEEP_OPTIONS.map((option) => {
              const value = option.toLowerCase().replace(' ', '_');
              const selected = form.sleep_schedule === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('sleep_schedule', value)}
                >
                  <Text style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>Work/Study Hours</Text>
          <View style={styles.optionRow}>
            {WORK_STUDY_OPTIONS.map((option) => {
              const value = option.toLowerCase();
              const selected = form.work_study_hours === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setField('work_study_hours', value)}
                >
                  <Text style={{ color: selected ? theme.colors.textInverse : theme.colors.textSecondary, fontWeight: '600' }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Save Preferences</Text>
          )}
        </TouchableOpacity>
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
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
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
    saveButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
