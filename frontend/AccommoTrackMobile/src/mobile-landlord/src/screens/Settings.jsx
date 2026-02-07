import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/Settings';
import { useTheme } from '../../../contexts/ThemeContext';

const SettingRow = ({ item, onPress, onToggle }) => {
  const { theme } = useTheme();
  const content = (
    <View style={styles.settingLeft}>
      <View style={styles.settingIcon}>
        <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.settingTextBlock}>
        <Text style={styles.settingLabel}>{item.label}</Text>
        {item.description ? <Text style={styles.settingDescription}>{item.description}</Text> : null}
      </View>
    </View>
  );

  const rightContent = () => {
    if (item.type === 'toggle') {
      return (
        <Switch
          value={item.value}
          onValueChange={() => onToggle(item)}
          trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
          thumbColor={item.value ? theme.colors.primary : '#F3F4F6'}
        />
      );
    }

    return (
      <View style={styles.settingRight}>
        {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
        {item.type === 'navigate' ? <Ionicons name="chevron-forward" size={18} color="#94A3B8" /> : null}
      </View>
    );
  };

  const isDisabled = item.type === 'info';

  return (
    <TouchableOpacity
      disabled={item.type === 'toggle' || isDisabled}
      activeOpacity={item.type === 'toggle' ? 1 : 0.7}
      style={styles.settingRow}
      onPress={() => onPress(item)}
    >
      {content}
      {rightContent()}
    </TouchableOpacity>
  );
};

export default function SettingsScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    payments: true,
    messages: true,
    maintenance: false,
    push: true,
    email: true
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (error) {
        console.error('Failed to load user info:', error.message);
      }
    };
    loadUser();
  }, []);

  const { theme } = useTheme();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (onLogout) {
              await onLogout();
            } else {
              await AsyncStorage.clear();
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            }
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
      }
    ]);
  };

  const handleUnavailable = (label) => {
    Alert.alert(label, 'This option will be available soon.');
  };

  const handleItemPress = (item) => {
    if (item.type === 'navigate') {
      navigation.navigate(item.target);
      return;
    }
    if (item.type === 'action' && item.action) {
      item.action();
      return;
    }
    if (item.type === 'value') {
      handleUnavailable(item.label);
    }
  };

  const handleToggle = (item) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [item.stateKey]: !prev[item.stateKey]
    }));
  };

  const sections = useMemo(
    () => [
      {
        title: 'Notifications',
        items: [
          {
            id: 'payment-alerts',
            label: 'Payment Updates',
            icon: 'cash-outline',
            type: 'toggle',
            value: notificationPrefs.payments,
            stateKey: 'payments'
          },
          {
            id: 'message-alerts',
            label: 'New Messages',
            icon: 'chatbubble-ellipses-outline',
            type: 'toggle',
            value: notificationPrefs.messages,
            stateKey: 'messages'
          },
          {
            id: 'maintenance-alerts',
            label: 'Maintenance Requests',
            icon: 'construct-outline',
            type: 'toggle',
            value: notificationPrefs.maintenance,
            stateKey: 'maintenance'
          }
        ]
      },
      {
        title: 'Support',
        items: [
          {
            id: 'help',
            label: 'Help & Support',
            description: 'FAQs and contact options',
            icon: 'help-circle-outline',
            type: 'navigate',
            target: 'HelpSupport'
          },
          {
            id: 'report',
            label: 'Report a Problem',
            icon: 'flag-outline',
            type: 'action',
            action: () => handleUnavailable('Report a Problem')
          },
          {
            id: 'about',
            label: 'About AccommoTrack',
            description: 'Release notes, dev team, and terms',
            icon: 'information-circle-outline',
            type: 'navigate',
            target: 'About'
          }
        ]
      },
      {
        title: 'App Info',
        items: [
          {
            id: 'version',
            label: 'Version',
            icon: 'albums-outline',
            type: 'info',
            value: '1.0.0'
          },
          {
            id: 'updates',
            label: 'Release Channel',
            icon: 'cloud-download-outline',
            type: 'info',
            value: 'Testing'
          }
        ]
      }
    ],
    [notificationPrefs]
  );

  const initials = () => {
    const first = user?.first_name || user?.firstName || '';
    const last = user?.last_name || user?.lastName || '';
    if (!first && !last) return 'LL';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize how AccommoTrack works for you</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{initials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.first_name || user?.firstName || 'Landlord'} {user?.last_name || user?.lastName || ''}
            </Text>
            <Text style={styles.profileEmail}>{user?.email || 'support@accommotrack.com'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MyProfile')} style={styles.profileAction}>
            <Text style={styles.profileActionText}>View</Text>
          </TouchableOpacity>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.id}>
                  <SettingRow item={item} onPress={handleItemPress} onToggle={handleToggle} />
                  {idx < section.items.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>© 2025 AccommoTrack. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

