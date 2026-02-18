import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Tenant/HomePage.js';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import NotificationBadge from './NotificationBadge.jsx';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

export default function MenuDrawer({ visible, onClose, onMenuItemPress, isGuest }) {
  const { theme } = useTheme();
  
  const [userName, setUserName] = useState("Guest User");
  const [userEmail, setUserEmail] = useState("guest@example.com");
  const [modalVisible, setModalVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Menu items with theme colors
  const allMenuItems = [
    { id: 1, title: 'Settings', icon: 'settings-outline', color: theme.colors.primary },
    { id: 2, title: 'Notifications', icon: 'notifications-outline', color: theme.colors.warning },
    { id: 3, title: 'My Maintenance Requests', icon: 'construct-outline', color: theme.colors.primary },
    { id: 4, title: 'My Addon Requests', icon: 'cube-outline', color: theme.colors.primary },
    { id: 5, title: 'Payments', icon: 'wallet-outline', color: theme.colors.primary },
    { id: 6, title: 'Logout', icon: 'log-out-outline', color: theme.colors.error },
  ];

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // Slide in from left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      
      if (isGuest) {
        setUserName("Guest User");
        setUserEmail("guest@example.com");
      } else {
        loadUserData();
      }
    } else {
      // Slide out to left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, isGuest]);

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'User';
        setUserName(fullName);
        setUserEmail(user.email || 'user@example.com');
      } else {
        setUserName("User");
        setUserEmail("user@example.com");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName("User");
      setUserEmail("user@example.com");
    }
  };

  // Always keep the logout item out of the main scroll list so it can be
  // rendered separately and anchored to the bottom for better UX.
  const logoutItem = allMenuItems.find(item => item.title === 'Logout');
  const settingsItem = allMenuItems.find(item => item.title === 'Settings');
  const menuItemsToDisplay = allMenuItems.filter(item => {
    // Exclude logout footer item
    if (item.title === 'Logout') return false;

    // If guest, exclude protected modules, but KEEP 'Settings' in the list if it's there
    if (isGuest) {
      const protectedTitles = ['Notifications', 'My Maintenance Requests', 'My Addon Requests', 'Payments'];
      if (protectedTitles.includes(item.title)) return false;
      return true; // includes Settings if it's in allMenuItems and not excluded
    }

    // If authenticated, exclude 'Settings' from main list because it's in the footer
    if (item.title === 'Settings') return false;
    
    return true;
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop with fade animation */}
        <Animated.View 
          style={[
            styles.menuBackdrop,
            { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: fadeAnim 
            }
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        
        {/* Drawer with slide animation */}
        <Animated.View 
          style={[
            styles.menuDrawer,
            {
              transform: [{ translateX: slideAnim }],
              width: DRAWER_WIDTH,
              backgroundColor: theme.colors.surface,
            }
          ]}
        >
          {/* Menu Header */}
          <View style={[styles.menuHeader, { backgroundColor: theme.colors.backgroundSecondary, borderBottomColor: theme.colors.border }]}>
            <View style={styles.menuUserInfo}>
              <View style={[styles.menuAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="person" size={32} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuUserName, { color: theme.colors.text }]}>{userName}</Text>
                <Text style={[styles.menuUserEmail, { color: theme.colors.textSecondary }]}>{userEmail}</Text>
              </View>
            </View>
            <View style={homeStyles.headerSide}>
              <TouchableOpacity onPress={handleClose} style={homeStyles.headerIcon}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView style={[styles.menuItems, { backgroundColor: theme.colors.surface }]}>
            {menuItemsToDisplay.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, { borderBottomColor: theme.colors.borderLight }]}
                onPress={() => onMenuItemPress(item.title)} // title maps to navigator routes
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{item.title}</Text>
                {/* Render compact badge for specific menu items */}
                {item.title === 'Payments' && <NotificationBadge type="payments" compact={true} />}
                {item.title === 'My Bookings' && <NotificationBadge type="bookings" compact={true} />}
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer actions: show Settings (only for auth users) and Logout (only for auth users) */}
          <SafeAreaView edges={["bottom"]} style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 8, paddingHorizontal: 12 }}>
            {!isGuest && settingsItem && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                onPress={() => onMenuItemPress(settingsItem.title)}
              >
                <Ionicons name={settingsItem.icon} size={20} color={settingsItem.color} />
                <Text style={[styles.menuItemText, { color: theme.colors.text, marginLeft: 12 }]}>Settings</Text>
              </TouchableOpacity>
            )}

            {!isGuest && logoutItem && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                onPress={() => onMenuItemPress(logoutItem.title)}
              >
                <Ionicons name={logoutItem.icon} size={20} color={logoutItem.color} />
                <Text style={[styles.menuItemText, { color: logoutItem.color, marginLeft: 12 }]}>Logout</Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}