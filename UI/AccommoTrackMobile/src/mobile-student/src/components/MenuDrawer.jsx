import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/TenantHomePage.js';

const menuItems = [
  { id: 1, title: 'My Bookings', icon: 'calendar-outline', color: '#00A651' },
  { id: 2, title: 'Favorites', icon: 'heart-outline', color: '#EF4444' },
  { id: 4, title: 'Payments', icon: 'card-outline', color: '#10B981' },
  { id: 5, title: 'Settings', icon: 'settings-outline', color: '#6B7280' },
  { id: 6, title: 'Help & Support', icon: 'help-circle-outline', color: '#F59E0B' },
  { id: 7, title: 'Logout', icon: 'log-out-outline', color: '#EF4444' },
];

export default function MenuDrawer({ visible, onClose, onMenuItemPress, userName = "John Doe", userEmail = "john.doe@example.com" }) {
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
            {menuItems.map((item) => (
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