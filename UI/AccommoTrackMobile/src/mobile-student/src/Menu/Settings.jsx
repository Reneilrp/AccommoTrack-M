import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Settings.js';

export default function Settings() {
  const navigation = useNavigation();
  
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

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
      case "Language":
        Alert.alert('Language', 'This feature will be implemented soon');
        break;
      case "Currency":
        Alert.alert('Currency', 'This feature will be implemented soon');
        break;
      case "Theme":
        Alert.alert('Theme', 'This feature will be implemented soon');
        break;
      case "Clear Cache":
        Alert.alert(
          'Clear Cache',
          'Are you sure you want to clear the cache?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => console.log('Cache cleared') }
          ]
        );
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
      default:
        console.log('Setting pressed:', label);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            console.log('Account deletion requested');
            Alert.alert('Account Deleted', 'Your account has been scheduled for deletion.');
          }
        }
      ]
    );
  };

  const settingSections = [
    {
      title: "Account",
      items: [
        { id: 1, label: "Edit Profile", icon: "person-outline", arrow: true },
        { id: 2, label: "Change Password", icon: "lock-closed-outline", arrow: true },
        { id: 3, label: "Privacy Settings", icon: "shield-checkmark-outline", arrow: true },
      ]
    },
    {
      title: "Preferences",
      items: [
        { id: 4, label: "Language", icon: "language-outline", value: "English", arrow: true },
        { id: 5, label: "Currency", icon: "cash-outline", value: "PHP (₱)", arrow: true },
        { id: 6, label: "Theme", icon: "moon-outline", value: "Light", arrow: true },
      ]
    },
    {
      title: "Notifications",
      items: [
        { id: 7, label: "Push Notifications", icon: "notifications-outline", toggle: true, value: pushNotifications, onChange: setPushNotifications },
        { id: 8, label: "Email Notifications", icon: "mail-outline", toggle: true, value: emailNotifications, onChange: setEmailNotifications },
        { id: 9, label: "SMS Notifications", icon: "chatbubble-outline", toggle: true, value: notifications, onChange: setNotifications },
      ]
    },
    {
      title: "App Settings",
      items: [
        { id: 10, label: "Location Services", icon: "location-outline", toggle: true, value: locationServices, onChange: setLocationServices },
        { id: 11, label: "Clear Cache", icon: "trash-outline", arrow: true },
        { id: 12, label: "App Version", icon: "information-circle-outline", value: "1.0.0" },
      ]
    },
    {
      title: "Support",
      items: [
        { id: 13, label: "Help Center", icon: "help-circle-outline", arrow: true },
        { id: 14, label: "Report a Problem", icon: "flag-outline", arrow: true },
        { id: 15, label: "Terms of Service", icon: "document-text-outline", arrow: true },
        { id: 16, label: "Privacy Policy", icon: "shield-outline", arrow: true },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && styles.settingItemBorder
                  ]}
                  disabled={item.toggle || item.label === "App Version"}
                  onPress={() => handleSettingPress(item.label)}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons name={item.icon} size={22} color="#00A651" />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                        thumbColor={item.value ? '#00A651' : '#F3F4F6'}
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

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}