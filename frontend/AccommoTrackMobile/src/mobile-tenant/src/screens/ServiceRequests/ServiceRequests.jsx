import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext';
import Header from '../../components/Header.jsx';
import MyMaintenanceRequests from '../Maintenance/MyRequests.jsx';
import AddonsScreen from '../Addons/AddonsScreen.jsx';

export default function ServiceRequests() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Maintenance');

  const tabs = ['Maintenance', 'Add-ons'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <Header 
        title="Service Requests"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {tabs.map((tab) => {
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

      <View style={{ flex: 1 }}>
        {activeTab === 'Maintenance' ? (
          <MyMaintenanceRequests hideHeader={true} />
        ) : (
          <AddonsScreen hideHeader={true} />
        )}
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
    fontSize: 15,
    fontWeight: '500',
  },
});
