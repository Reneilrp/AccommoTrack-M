import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import MyMaintenanceRequests from '../Maintenance/MyRequests.jsx';
import AddonsScreen from '../Addons/AddonsScreen.jsx';
import MyReviews from '../Reviews/MyReviews.jsx';
import TransferRequests from './TransferRequests.jsx';

const TABS = ['Maintenance', 'Add-ons', 'Reviews', 'Transfers'];

const normalizeTab = (value) => {
  if (!value) return 'Maintenance';
  return TABS.includes(value) ? value : 'Maintenance';
};

export default function ServiceRequests() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params || {};
  const [activeTab, setActiveTab] = useState(() => normalizeTab(routeParams.initialTab));

  useEffect(() => {
    if (!routeParams.initialTab) return;
    setActiveTab(normalizeTab(routeParams.initialTab));
  }, [routeParams.initialTab]);

  const handleNewMaintenanceRequest = () => {
    navigation.navigate('CreateMaintenanceRequest', {
      bookingId: routeParams.bookingId || null,
      propertyId: routeParams.propertyId || null,
      roomId: routeParams.roomId || null,
    });
  };

  const handleRequestTransfer = () => {
    navigation.navigate('MyBookings');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                isActive && { fontWeight: '700' }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {(activeTab === 'Maintenance' || activeTab === 'Transfers') && (
        <View style={[styles.actionContainer, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}> 
          {activeTab === 'Maintenance' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleNewMaintenanceRequest}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>New Maintenance Request</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#7C3AED' }]}
              onPress={handleRequestTransfer}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Request Transfer (My Bookings)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ flex: 1 }}>
        {activeTab === 'Maintenance' && <MyMaintenanceRequests hideHeader={true} />}
        {activeTab === 'Add-ons' && <AddonsScreen hideHeader={true} />}
        {activeTab === 'Reviews' && <MyReviews hideHeader={true} />}
        {activeTab === 'Transfers' && <TransferRequests hideHeader={true} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    height: 50,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
