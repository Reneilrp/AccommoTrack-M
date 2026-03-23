import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import ProfileService from '../../../../services/ProfileService.js';
import Header from '../../components/Header.jsx';
import { showError, showSuccess } from '../../../../utils/toast.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

const DEFAULT_FORM = {
  room_preference: '',
  budget_range: '',
  attitude: '',
  behavior: '',
  lifestyle_notes: '',
  smoking: 'no',
  pets: 'no',
  quiet: 'no',
  cooking: 'no',
};

const ROOM_OPTIONS = ['Solo', 'Shared', 'Any'];

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
    smoking: pref.smoking || (pref.no_smoking || pref.no_smoke ? 'yes' : 'no'),
    pets: pref.pets || (pref.pet_friendly || pref.pet ? 'yes' : 'no'),
    quiet: pref.quiet || (pref.quiet_environment || pref.quiet_env ? 'yes' : 'no'),
    cooking: pref.cooking || (pref.cooking_allowed ? 'yes' : 'no'),
  };
};

export default function PreferencesLifestyle() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const res = await ProfileService.getProfile();

        if (res.success) {
          const pref = normalizePreference(res.data?.tenant_profile?.preference);
          setForm(pref);
        } else {
          showError('Error', res.error || 'Failed to load preferences');
        }
      } catch (error) {
        console.error('Load tenant preferences error:', error);
        showError('Error', 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleYesNo = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field] === 'yes' ? 'no' : 'yes',
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
          smoking: form.smoking,
          pets: form.pets,
          quiet: form.quiet,
          cooking: form.cooking,
        },
      };

      const res = await ProfileService.updateProfile(payload);

      if (res.success) {
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

          {[
            { key: 'smoking', label: 'Smoking allowed' },
            { key: 'pets', label: 'Pets allowed' },
            { key: 'quiet', label: 'Prefers quiet environment' },
            { key: 'cooking', label: 'Cooking allowed' },
          ].map((item) => (
            <View key={item.key} style={[styles.switchRow, { borderBottomColor: theme.colors.borderLight }]}> 
              <Text style={{ color: theme.colors.text, flex: 1 }}>{item.label}</Text>
              <Switch
                value={form[item.key] === 'yes'}
                onValueChange={() => toggleYesNo(item.key)}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={form[item.key] === 'yes' ? theme.colors.primary : '#F3F4F6'}
              />
            </View>
          ))}
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
