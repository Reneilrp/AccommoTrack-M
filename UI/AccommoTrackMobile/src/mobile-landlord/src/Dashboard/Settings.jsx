// SettingsScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Landlord/Settings';

export default function SettingsScreen({ navigation, onLogout }) {
  const [user, setUser] = useState({
    first_name: 'Neal Jean',
    last_name: 'Claro',
    email: 'NealJeanClaro@gmail.com'
  });

  const [notifications, setNotifications] = useState({
    payments: true,
    messages: true,
    maintenance: false
  });

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

  const menuItems = [
    {
      section: 'Account',
      items: [
        {
          id: 'profile',
          title: 'My Profile',
          icon: 'person-outline',
          screen: 'MyProfile'
        },
        {
          id: 'dorm',
          title: 'Dorm Profile',
          icon: 'business-outline',
          screen: 'DormProfile'
        }
      ]
    },
    {
      section: 'Management',
      items: [
        {
          id: 'tenants',
          title: 'Tenants',
          icon: 'people-outline',
          screen: 'Tenants'
        },
        {
          id: 'bookings',
          title: 'Bookings',
          icon: 'calendar-outline',
          screen: 'Bookings'
        },
        {
          id: 'analytics',
          title: 'Analytics',
          icon: 'bar-chart-outline',
          screen: 'Analytics'
        }
      ]
    },
    {
      section: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & Support',
          icon: 'help-circle-outline',
          screen: 'HelpSupport'
        },
        {
          id: 'about',
          title: 'About',
          icon: 'information-circle-outline',
          screen: 'About'
        }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>
              {user.first_name[0]}{user.last_name[0]}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="cash-outline" size={24} color="#4CAF50" />
                <Text style={styles.settingLabel}>Payment Notifications</Text>
              </View>
              <Switch
                value={notifications.payments}
                onValueChange={(value) => setNotifications({...notifications, payments: value})}
                trackColor={{ false: '#E5E7EB', true: '#A5D6A7' }}
                thumbColor={notifications.payments ? '#4CAF50' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubble-outline" size={24} color="#2196F3" />
                <Text style={styles.settingLabel}>New Messages</Text>
              </View>
              <Switch
                value={notifications.messages}
                onValueChange={(value) => setNotifications({...notifications, messages: value})}
                trackColor={{ false: '#E5E7EB', true: '#A5D6A7' }}
                thumbColor={notifications.messages ? '#4CAF50' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="construct-outline" size={24} color="#FF9800" />
                <Text style={styles.settingLabel}>Maintenance Requests</Text>
              </View>
              <Switch
                value={notifications.maintenance}
                onValueChange={(value) => setNotifications({...notifications, maintenance: value})}
                trackColor={{ false: '#E5E7EB', true: '#A5D6A7' }}
                thumbColor={notifications.maintenance ? '#4CAF50' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={styles.menuLeft}>
                    <Ionicons name={item.icon} size={24} color="#4CAF50" />
                    <Text style={styles.menuLabel}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

