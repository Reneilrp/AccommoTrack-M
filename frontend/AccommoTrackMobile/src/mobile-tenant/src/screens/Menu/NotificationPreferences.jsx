import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFS, loadPrefsMobile, savePrefsMobile } from '../../../../shared/notificationPrefs';
import { useNavigation } from '@react-navigation/native';
import { styles as settingsStyles } from '../../../../styles/Menu/Settings.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { styles } from '../../../../styles/Menu/HelpSupport.js';
import { useTheme } from '../../../../contexts/ThemeContext';
import Header from '../../components/Header.jsx';

export default function NotificationPreferences() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  useEffect(() => {
    (async () => {
      try {
        const next = await loadPrefsMobile(AsyncStorage);
        setPrefs(next);
      } catch (e) {
        console.warn('Load prefs error', e);
      }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await savePrefsMobile(AsyncStorage, next);
    } catch (e) {
      console.warn('Save pref error', e);
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
        <View style={[settingsStyles.settingsCard, { backgroundColor: theme.colors.surface, marginBottom: 12 }]}>
          <View style={settingsStyles.cardInner}>
            <Text style={[settingsStyles.cardTitle, { color: theme.colors.text }]}>Email Notifications</Text>
            <View style={[homeStyles.surfaceCardSmall, { backgroundColor: 'transparent', padding: 0, marginBottom: 0 }] }>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Booking Updates</Text>
                <Switch value={prefs.email_booking} onValueChange={() => toggle('email_booking')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_booking ? theme.colors.primary : '#F3F4F6'} />
              </View>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Payment Notifications</Text>
                <Switch value={prefs.email_payment} onValueChange={() => toggle('email_payment')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_payment ? theme.colors.primary : '#F3F4F6'} />
              </View>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>Maintenance Requests</Text>
                <Switch value={prefs.email_maintenance} onValueChange={() => toggle('email_maintenance')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.email_maintenance ? theme.colors.primary : '#F3F4F6'} />
              </View>
            </View>
          </View>
        </View>

        <View style={[settingsStyles.settingsCard, { backgroundColor: theme.colors.surface, marginBottom: 12 }]}>
          <View style={settingsStyles.cardInner}>
            <Text style={[settingsStyles.cardTitle, { color: theme.colors.text }]}>Push Notifications</Text>
            <View style={[homeStyles.surfaceCardSmall, { backgroundColor: 'transparent', padding: 0, marginBottom: 0 }] }>
              <View style={[homeStyles.rowSpaceBetweenCenter, settingsStyles.switchRow]}>
                <Text style={{ color: theme.colors.text }}>New messages</Text>
                <Switch value={prefs.push_messages} onValueChange={() => toggle('push_messages')} trackColor={{ false: '#D1D5DB', true: '#86EFAC' }} thumbColor={prefs.push_messages ? theme.colors.primary : '#F3F4F6'} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

