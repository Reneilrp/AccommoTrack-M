import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const menuItems = [
  { id: 1, title: 'My Properties', icon: 'business-outline', color: '#4CAF50', screen: 'MyProperties' },
  { id: 2, title: 'Room Management', icon: 'bed-outline', color: '#8B5CF6', screen: 'RoomManagement' },
  { id: 3, title: 'Tenants', icon: 'people-outline', color: '#2196F3', screen: 'Tenants' },
  { id: 4, title: 'Bookings', icon: 'calendar-outline', color: '#FF9800', screen: 'Bookings' },
  { id: 5, title: 'Analytics', icon: 'bar-chart-outline', color: '#9C27B0', screen: 'Analytics' },
];

const logoutItem = { id: 99, title: 'Logout', icon: 'log-out-outline', color: '#EF4444', action: 'logout' };

export default function MenuDrawer({ visible, onClose, onMenuItemPress, onLogout }) {
  const [userName, setUserName] = useState('Landlord');
  const [userEmail, setUserEmail] = useState('landlord@example.com');

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        const fullName = user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.first_name || 'Landlord';
        setUserName(fullName);
        setUserEmail(user.email || 'landlord@example.com');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleItemPress = (item) => {
    onClose();
    if (item.action === 'logout') {
      onLogout?.();
    } else if (item.screen) {
      onMenuItemPress?.(item.screen);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.menuDrawer}>
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <View style={styles.menuUserInfo}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={32} color="#4CAF50" />
              </View>
              <View style={styles.userTextContainer}>
                <Text style={styles.menuUserName}>{userName}</Text>
                <Text style={styles.menuUserEmail}>{userEmail}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleItemPress(item)}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
                <Text style={styles.menuItemText}>
                  {item.title}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Logout Button - Fixed at bottom */}
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={() => handleItemPress(logoutItem)}
          >
            <Ionicons name={logoutItem.icon} size={24} color={logoutItem.color} />
            <Text style={styles.logoutText}>{logoutItem.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.footerText}>AccommoTrack v1.0.0</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuDrawer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  menuUserEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FEF2F2',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  logoutText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  menuFooter: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
