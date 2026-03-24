import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getStyles as getSettingsStyles } from '../../../../styles/Menu/Settings.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import Header from '../../components/Header.jsx';
import ProfileService from '../../../../services/ProfileService.js';

export default function NotificationPreferences() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const settingsStyles = React.useMemo(() => getSettingsStyles(theme), [theme]);

  const [prefs, setPrefs] = useState({
    email_booking_updates: true,
    email_payment_reminders: true,
    email_maintenance: false,
    push_messages: true,
    push_booking_updates: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await ProfileService.getProfile();
        if (res.success && res.data && res.data.notification_preferences) {
          const backendPrefs = res.data.notification_preferences;
          const parsed = typeof backendPrefs === 'string' ? JSON.parse(backendPrefs) : backendPrefs;
          
          const normalized = {};
           Object.keys(parsed).forEach(k => {
             const v = parsed[k];
             normalized[k] = v === true || v === 1 || v === '1';
           });
           
          setPrefs(prev => ({ ...prev, ...normalized }));
        }
      } catch (e) {
        console.warn('Load prefs error', e);
      }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await ProfileService.updateProfile({ notification_preferences: next });
      // update local
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.notification_preferences = next;
        await AsyncStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Save pref error', e);
      Alert.alert("Error", "Failed to save preferences to the server.");
      // Rollback on fail
      setPrefs(prefs);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />

      <Header 
        title="Notification Preferences"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

      <View style={homeStyles.contentContainerPadding}>
        <View style={[settingsStyles.settingsCard, { backgroundColor: theme.colors.surface, marginBottom: 16 }]}>
          <View style={settingsStyles.cardInner}>
            <Text style={[settingsStyles.cardTitle, { color: theme.colors.text }]}>Email Notifications</Text>
            <View style={[homeStyles.surfaceCardSmall, { backgroundColor: 'transparent', padding: 0, marginBottom: 0 }] }>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Booking Updates</Text>
                <Switch value={prefs.email_booking_updates} onValueChange={() => toggle('email_booking_updates')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_booking_updates ? theme.colors.primary : '#F3F4F6'} />
              </View>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Payment Notifications</Text>
                <Switch value={prefs.email_payment_reminders} onValueChange={() => toggle('email_payment_reminders')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_payment_reminders ? theme.colors.primary : '#F3F4F6'} />
              </View>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Maintenance Requests</Text>
                <Switch value={prefs.email_maintenance} onValueChange={() => toggle('email_maintenance')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_maintenance ? theme.colors.primary : '#F3F4F6'} />
              </View>
            </View>
          </View>
        </View>

        <View style={[settingsStyles.settingsCard, { backgroundColor: theme.colors.surface, marginBottom: 16 }]}>
          <View style={settingsStyles.cardInner}>
            <Text style={[settingsStyles.cardTitle, { color: theme.colors.text }]}>Push Notifications</Text>
            <View style={[homeStyles.surfaceCardSmall, { backgroundColor: 'transparent', padding: 0, marginBottom: 0 }] }>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>New messages</Text>
                <Switch value={prefs.push_messages} onValueChange={() => toggle('push_messages')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.push_messages ? theme.colors.primary : '#F3F4F6'} />
              </View>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Booking Status</Text>
                <Switch value={prefs.push_booking_updates} onValueChange={() => toggle('push_booking_updates')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.push_booking_updates ? theme.colors.primary : '#F3F4F6'} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
