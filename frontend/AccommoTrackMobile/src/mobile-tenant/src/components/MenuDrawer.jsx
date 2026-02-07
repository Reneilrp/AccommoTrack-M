import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Tenant/HomePage.js';
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
    { id: 1, title: 'Dashboard', icon: 'grid-outline', color: theme.colors.primary },
    { id: 2, title: 'Notifications', icon: 'notifications-outline', color: theme.colors.warning },
    { id: 3, title: 'My Bookings', icon: 'calendar-outline', color: theme.colors.primary },
    { id: 4, title: 'Payments', icon: 'wallet-outline', color: theme.colors.primary },
    { id: 5, title: 'Future UI Demo', icon: 'eye-outline', color: theme.colors.purple },
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

  const menuItemsToDisplay = isGuest
    ? allMenuItems.filter(item => item.title !== 'Logout')
    : allMenuItems;

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
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity onPress={handleClose} style={{marginLeft: 8}}>
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
        </Animated.View>
      </View>
    </Modal>
  );
}