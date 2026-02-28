import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, StatusBar, RefreshControl, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Menu/Settings.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ListItemSkeleton } from '../../../../components/Skeletons/index';
import ProfileService from '../../../../services/ProfileService';
import { WEB_BASE_URL } from '../../../../config';
import { navigate as rootNavigate } from '../../../../navigation/RootNavigation';

export default function Settings({ onLogout, isGuest, onLoginPress }) {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const themedHomeStyles = React.useMemo(() => homeStyles(theme), [theme]);
  
  const [notificationSettings, setNotificationSettings] = useState({
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    locationServices: true
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(isGuest ?? true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkState = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (!isMounted) return;

        const guest = isGuest === true || !userJson;
        setIsGuestMode(guest);
        
        if (!guest) {
          await loadSettings();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking state:', error);
        if (isMounted) setLoading(false);
      }
    };

    checkState();
    return () => { isMounted = false; };
  }, [isGuest]);

  const loadSettings = async () => {
    try {
      const res = await ProfileService.getProfile();
      if (res.success && res.data) {
        const prefs = res.data.notification_preferences;
        if (prefs) {
          const parsed = typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
          setNotificationSettings({
            notifications: parsed.notifications ?? true,
            emailNotifications: parsed.emailNotifications ?? true,
            pushNotifications: parsed.pushNotifications ?? true,
            locationServices: parsed.locationServices ?? true
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    if (isGuestMode) return;
    
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    
    try {
      await ProfileService.updateSettings({
        notification_preferences: newSettings
      });
      
      // Update local storage too for consistency
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        user.notification_preferences = newSettings;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (!isGuestMode) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettingPress = (label) => {
    switch(label) {
      case "Profile":
        rootNavigate('Profile');
        break;
      case "Notification Preferences":
        // Scroll to notifications or navigate if separate
        break;
      case "Account Security":
        rootNavigate('UpdatePassword');
        break;
      case "Help Center":
        rootNavigate('HelpSupport');
        break;
      case "Report a Problem":
        Alert.alert('Report a Problem', 'This feature will be implemented soon');
        break;
      case "Terms of Service":
        Alert.alert('Terms of Service', 'This feature will be implemented soon');
        break;
      case "Privacy Policy":
        Alert.alert('Privacy Policy', 'This feature will be implemented soon');
        break;
      case "Login / Sign Up":
        handleLoginPress();
        break;
      case "Become a Landlord":
        handleBecomeLandlord();
        break;
      default:
        console.log('Setting pressed:', label);
    }
  };

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      rootNavigate('Auth');
    }
  };

  const handleBecomeLandlord = () => {
    Alert.alert(
      'Become a Landlord',
      'You will be redirected to our web portal to register as a landlord.\n\nAfter creating your account, you can login here in the app as a landlord.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Web Portal', 
          onPress: () => {
            // Open web admin portal for landlord registration
            Linking.openURL(`${WEB_BASE_URL}/become-landlord`);
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }]
                });
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  // Settings sections - different for guests vs logged in users
  const getSettingSections = () => {
    if (isGuestMode) {
      return [
        {
          title: "Account",
          items: [
            { id: 1, label: "Login / Sign Up", icon: "log-in-outline", arrow: true, highlight: true },
            { id: 2, label: "Become a Landlord", icon: "business-outline", arrow: true },
            { 
              id: 3, 
              label: "Dark Mode", 
              icon: isDarkMode ? "moon" : "moon-outline", 
              toggle: true, 
              value: isDarkMode,
              onChange: toggleTheme
            },
          ]
        },
        {
          title: "Support",
          items: [
            { id: 12, label: "Help Center", icon: "help-circle-outline", arrow: true },
            { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
            { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
            { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
          ]
        }
      ];
    }

    // Logged in user - full options
    return [
      {
        title: "Account",
        items: [
          { id: 1, label: "Profile", icon: "person-outline", arrow: true },
          { id: 2, label: "Account Security", icon: "lock-closed-outline", arrow: true },
          { 
            id: 3, 
            label: "Dark Mode", 
            icon: isDarkMode ? "moon" : "moon-outline", 
            toggle: true, 
            value: isDarkMode,
            onChange: toggleTheme
          },
          { id: 4, label: "Become a Landlord", icon: "business-outline", arrow: true },
        ]
      },
      {
        title: "Notifications",
        items: [
          { 
            id: 8, 
            label: "Push Notifications", 
            icon: "notifications-outline", 
            toggle: true, 
            value: notificationSettings.pushNotifications,
            onChange: (val) => updateSetting('pushNotifications', val)
          },
          { 
            id: 9, 
            label: "Email Notifications", 
            icon: "mail-outline", 
            toggle: true, 
            value: notificationSettings.emailNotifications,
            onChange: (val) => updateSetting('emailNotifications', val)
          },
        ]
      },
      {
        title: "Support",
        items: [
          { id: 12, label: "Help Center", icon: "help-circle-outline", arrow: true },
          { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
          { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
          { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
        ]
      }
    ];
  };

  const settingSections = getSettingSections();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      {/* Content Area */}
      <View style={{flex: 1}}>
        {loading ? (
          <ScrollView style={themedHomeStyles.contentContainerPadding} showsVerticalScrollIndicator={false}>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ScrollView>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={themedHomeStyles.contentContainerPadding}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >

        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && [styles.settingItemBorder, { borderBottomColor: theme.colors.border }],
                    item.highlight && styles.settingItemHighlight,
                    item.highlight && { backgroundColor: theme.colors.primary + '10' }
                  ]}
                  disabled={item.toggle || item.label === "App Version"}
                  onPress={() => handleSettingPress(item.label)}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, item.highlight && styles.settingIconHighlight, item.highlight && { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name={item.icon} size={22} color={item.highlight ? "#FFFFFF" : theme.colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, item.highlight && styles.settingLabelHighlight, item.highlight && { color: theme.colors.primary }, { color: theme.colors.text }]}>{item.label}</Text>
                  </View>
                  
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                        <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: '#D1D5DB', true: theme.colors.brand200 }}
                        thumbColor={item.value ? theme.colors.primary : '#F3F4F6'}
                      />
                    ) : (
                      <>
                        {item.value && (
                          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{item.value}</Text>
                        )}
                        {item.arrow && (
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        )}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button - Only show for logged in users */}
        {!isGuestMode && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.dangerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error + '20' }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

            <View style={themedHomeStyles.spacer} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}