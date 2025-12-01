import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Tenant/HomePage.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

const allMenuItems = [
  { id: 1, title: 'My Bookings', icon: 'calendar-outline', color: '#10b981' },
  { id: 2, title: 'Payments', icon: 'card-outline', color: '#10B981' },
  { id: 3, title: 'Logout', icon: 'log-out-outline', color: '#EF4444' },
];

export default function MenuDrawer({ visible, onClose, onMenuItemPress, isGuest }) {
  const [userName, setUserName] = useState("Guest User");
  const [userEmail, setUserEmail] = useState("guest@example.com");
  const [modalVisible, setModalVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
            }
          ]}
        >
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <View style={styles.menuUserInfo}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={32} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.menuUserName}>{userName}</Text>
                <Text style={styles.menuUserEmail}>{userEmail}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuItems}>
            {menuItemsToDisplay.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => onMenuItemPress(item.title)}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
                <Text style={styles.menuItemText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}