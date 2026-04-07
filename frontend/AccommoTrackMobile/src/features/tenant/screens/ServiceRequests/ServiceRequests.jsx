import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useRoute } from '@react-navigation/native';
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
  const route = useRoute();
  const routeParams = route.params || {};
  const [activeTab, setActiveTab] = useState(() => normalizeTab(routeParams.initialTab));

  useEffect(() => {
    if (!routeParams.initialTab) return;
    setActiveTab(normalizeTab(routeParams.initialTab));
  }, [routeParams.initialTab]);

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

      <View style={[styles.historyBanner, { backgroundColor: theme.colors.backgroundSecondary, borderBottomColor: theme.colors.border }]}> 
        <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.historyBannerText, { color: theme.colors.textSecondary }]}> 
          History only. Create new requests in MyBookings MyStay.
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'Maintenance' && <MyMaintenanceRequests hideHeader={true} historyOnly={true} />}
        {activeTab === 'Add-ons' && <AddonsScreen hideHeader={true} historyOnly={true} />}
        {activeTab === 'Reviews' && <MyReviews hideHeader={true} historyOnly={true} />}
        {activeTab === 'Transfers' && <TransferRequests hideHeader={true} historyOnly={true} />}
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
  historyBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
});
