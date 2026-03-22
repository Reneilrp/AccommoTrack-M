import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/DormProfile.js';

const GENDER_OPTIONS = [
  { label: 'Mixed (Any Gender)', value: 'mixed' },
  { label: 'Boys Only', value: 'male' },
  { label: 'Girls Only', value: 'female' },
];

const PROPERTY_TYPES = [
  { label: 'Dormitory', value: 'dormitory' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Boarding House', value: 'boardingHouse' },
  { label: 'Bed Spacer', value: 'bedSpacer' },
  { label: 'Others', value: 'others' }
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' }
];

const buildEmptyForm = () => ({
  id: null,
  propertyType: '',
  genderRestriction: 'mixed',
  status: 'pending',
  totalRooms: '',
  maxOccupants: '',
  bathrooms: '0',
  totalFloors: '1',
  floorLevel: [],
  curfewTime: '',
  curfewPolicy: '',
  require1MonthAdvance: false,
});

const normalizeSettings = (data) => {
  return {
    id: data?.id ?? null,
    propertyType: data?.property_type || '',
    genderRestriction: data?.gender_restriction || 'mixed',
    status: data?.current_status || 'pending',
    totalRooms: data?.total_rooms ? String(data.total_rooms) : '',
    maxOccupants: data?.max_occupants ? String(data.max_occupants) : '',
    bathrooms: data?.number_of_bathrooms ? String(data.number_of_bathrooms) : '0',
    totalFloors: data?.total_floors ? String(data.total_floors) : '1',
    floorLevel: data?.floor_level ? String(data.floor_level).split(',').filter(Boolean) : [],
    curfewTime: data?.curfew_time || '',
    curfewPolicy: data?.curfew_policy || '',
    require1MonthAdvance: !!data?.require_1month_advance,
  };
};

export default function DormProfileSettings({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId;
  const [form, setForm] = useState(buildEmptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async (fromRefresh = false) => {
    if (!propertyId) return;
    fromRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const response = await PropertyService.getProperty(propertyId);
      if (response.success) {
        setForm(normalizeSettings(response.data));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load property settings.'
      });
    } finally {
      fromRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFloor = (floorNumberStr) => {
    setForm((prev) => {
      const current = prev.floorLevel;
      const updated = current.includes(floorNumberStr)
        ? current.filter((f) => f !== floorNumberStr)
        : [...current, floorNumberStr].sort((a, b) => Number(a) - Number(b));
      return { ...prev, floorLevel: updated };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append('property_type', form.propertyType);
      payload.append('gender_restriction', form.genderRestriction);
      payload.append('current_status', form.status);
      payload.append('total_rooms', form.totalRooms);
      payload.append('max_occupants', form.maxOccupants);
      payload.append('number_of_bathrooms', form.bathrooms);
      payload.append('total_floors', form.totalFloors);
      payload.append('floor_level', form.floorLevel.join(','));
      payload.append('curfew_time', form.curfewTime);
      payload.append('curfew_policy', form.curfewPolicy);
      payload.append('require_1month_advance', form.require1MonthAdvance ? '1' : '0');
      
      // PropertyService.updateProperty handles multipart/form-data and _method spoofing
      const response = await PropertyService.updateProperty(propertyId, payload);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Settings Updated',
          text2: 'Property settings have been saved.'
        });
        navigation.goBack();
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Save failed', err);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isGenderRestricted = ['dormitory', 'boardingHouse', 'bedSpacer'].includes(form.propertyType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButtonBg} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Settings</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={22} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSettings(true)} />}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Specifications</Text>
          <Text style={styles.sectionSubtitle}>Define room capacities and managed floors</Text>

          <Text style={styles.label}>Property Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.propertyType}
              onValueChange={(val) => updateForm('propertyType', val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Type" value="" />
              {PROPERTY_TYPES.map(t => <Picker.Item key={t.value} label={t.label} value={t.value} />)}
            </Picker>
          </View>

          {isGenderRestricted && (
            <>
              <Text style={styles.label}>Gender Restriction</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.genderRestriction}
                  onValueChange={(val) => updateForm('genderRestriction', val)}
                  style={styles.picker}
                >
                  {GENDER_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                </Picker>
              </View>
            </>
          )}

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.status}
              onValueChange={(val) => updateForm('status', val)}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
            </Picker>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Total Rooms</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.totalRooms}
                onChangeText={(val) => updateForm('totalRooms', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Max Occupants</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.maxOccupants}
                onChangeText={(val) => updateForm('maxOccupants', val)}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bathrooms</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.bathrooms}
                onChangeText={(val) => updateForm('bathrooms', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Total Floors</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.totalFloors}
                onChangeText={(val) => updateForm('totalFloors', val)}
              />
            </View>
          </View>

          {parseInt(form.totalFloors) > 1 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Managed Floors</Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 8 }]}>Select the floors you manage</Text>
              <View style={styles.floorsGrid}>
                {Array.from({ length: parseInt(form.totalFloors) || 0 }, (_, i) => String(i + 1)).map((floor) => (
                  <TouchableOpacity
                    key={floor}
                    style={[
                      styles.floorButton,
                      form.floorLevel.includes(floor) && styles.floorButtonActive
                    ]}
                    onPress={() => toggleFloor(floor)}
                  >
                    <Text style={[
                      styles.floorButtonText,
                      form.floorLevel.includes(floor) && styles.floorButtonTextActive
                    ]}>
                      {floor}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lease Advance</Text>
          <Text style={styles.sectionSubtitle}>Require tenants to pay 1 month advance upon booking</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Require 1-Month Advance</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>If enabled, move-in cost will include one extra month rent.</Text>
            </View>
            <Switch
              value={form.require1MonthAdvance}
              onValueChange={(val) => updateForm('require1MonthAdvance', val)}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Curfew Settings</Text>
          <Text style={styles.label}>Curfew Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 10:00 PM"
            value={form.curfewTime}
            onChangeText={(val) => updateForm('curfewTime', val)}
          />
          <Text style={styles.label}>Curfew Policy</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Strictly no entry after 10 PM"
            multiline
            value={form.curfewPolicy}
            onChangeText={(val) => updateForm('curfewPolicy', val)}
          />
        </View>

        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Settings</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
