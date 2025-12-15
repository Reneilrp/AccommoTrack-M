import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Menu/Settings.js';

export default function Settings({ onLogout, isGuest, onLoginPress }) {
  const navigation = useNavigation();
  
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    checkGuestMode();
  }, [isGuest]);

  const checkGuestMode = async () => {
    if (isGuest !== undefined) {
      setIsGuestMode(isGuest);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsGuestMode(!token);
    } catch (error) {
      console.error('Error checking guest mode:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate refresh - reload settings/preferences
      await new Promise(resolve => setTimeout(resolve, 1000));
      // You can add actual data refresh logic here if needed
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettingPress = (label) => {
    switch(label) {
      case "Edit Profile":
        navigation.navigate('Profile');
        break;
      case "Change Password":
        Alert.alert('Change Password', 'This feature will be implemented soon');
        break;
      case "Privacy Settings":
        Alert.alert('Privacy Settings', 'This feature will be implemented soon');
        break;
      case "Help Center":
        navigation.navigate('HelpSupport');
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
      navigation.navigate('Auth');
    }
  };

  const handleBecomeLandlord = () => {
    Alert.alert(
      'Become a Landlord',
      'You will be redirected to our web portal to register as a landlord.\n\nAfter creating your account, you can:\n• Continue managing on web portal\n• Login on this app as landlord',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Web Portal', 
          onPress: () => {
            // Open web admin portal for landlord registration
            Linking.openURL('http://10.20.74.141:5174/login');
            
            // Show follow-up after a delay
            setTimeout(() => {
              showPostRegistrationOptions();
            }, 2000);
          }
        }
      ]
    );
  };

  const showPostRegistrationOptions = () => {
    Alert.alert(
      'Already Registered?',
      'If you\'ve created your landlord account on the web portal, you can now login here in the app.',
      [
        { text: 'Stay as Guest', style: 'cancel' },
        {
          text: 'Login as Landlord',
          onPress: () => {
            // Navigate to auth screen
            if (onLoginPress) {
              onLoginPress();
            } else {
              navigation.navigate('Auth');
            }
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
      // Guest mode - show limited options + login/landlord options
      return [
        {
          title: "Account",
          items: [
            { id: 1, label: "Login / Sign Up", icon: "log-in-outline", arrow: true, highlight: true },
            { id: 2, label: "Become a Landlord", icon: "business-outline", arrow: true },
          ]
        },
        {
          title: "App Settings",
          items: [
            { id: 10, label: "Location Services", icon: "location-outline", toggle: true, value: locationServices, onChange: setLocationServices },
            { id: 11, label: "App Version", icon: "information-circle-outline", value: "1.0.0" },
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
          { id: 1, label: "Edit Profile", icon: "person-outline", arrow: true },
          { id: 2, label: "Change Password", icon: "lock-closed-outline", arrow: true },
          { id: 3, label: "Privacy Settings", icon: "shield-checkmark-outline", arrow: true },
          { id: 4, label: "Become a Landlord", icon: "business-outline", arrow: true },
        ]
      },
      {
        title: "Notifications",
        items: [
          { id: 7, label: "Push Notifications", icon: "notifications-outline", toggle: true, value: pushNotifications, onChange: setPushNotifications },
          { id: 8, label: "Email Notifications", icon: "mail-outline", toggle: true, value: emailNotifications, onChange: setEmailNotifications },
        ]
      },
      {
        title: "App Settings",
        items: [
          { id: 10, label: "Location Services", icon: "location-outline", toggle: true, value: locationServices, onChange: setLocationServices },
          { id: 11, label: "App Version", icon: "information-circle-outline", value: "1.0.0" },
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && styles.settingItemBorder,
                    item.highlight && styles.settingItemHighlight
                  ]}
                  disabled={item.toggle || item.label === "App Version"}
                  onPress={() => handleSettingPress(item.label)}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, item.highlight && styles.settingIconHighlight]}>
                      <Ionicons name={item.icon} size={22} color={item.highlight ? "#FFFFFF" : "#10b981"} />
                    </View>
                    <Text style={[styles.settingLabel, item.highlight && styles.settingLabelHighlight]}>{item.label}</Text>
                  </View>
                  
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                        thumbColor={item.value ? '#10b981' : '#F3F4F6'}
                      />
                    ) : (
                      <>
                        {item.value && (
                          <Text style={styles.settingValue}>{item.value}</Text>
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
              style={styles.dangerButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}