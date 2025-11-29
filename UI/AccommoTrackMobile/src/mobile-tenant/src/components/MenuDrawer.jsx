import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Tenant/HomePage.js';

const allMenuItems = [
  { id: 1, title: 'My Bookings', icon: 'calendar-outline', color: '#10b981' },
  { id: 2, title: 'Payments', icon: 'card-outline', color: '#10B981' },
  { id: 3, title: 'Logout', icon: 'log-out-outline', color: '#EF4444' },
];

export default function MenuDrawer({ visible, onClose, onMenuItemPress, isGuest }) {
  const [userName, setUserName] = useState("Guest User");
  const [userEmail, setUserEmail] = useState("guest@example.com");

  useEffect(() => {
    if (visible) {
      if (isGuest) {
        setUserName("Guest User");
        setUserEmail("guest@example.com");
      } else {
        loadUserData();
      }
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.menuDrawer}>
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
            <TouchableOpacity onPress={onClose}>
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
        </View>
      </View>
    </Modal>
  );
}