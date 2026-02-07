import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  PropertyCardSkeleton,
  BookingCardSkeleton,
  ListItemSkeleton,
  SettingsSkeleton,
  DashboardStatSkeleton,
} from '../../../../components/Skeletons';

const DemoUIScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Dashboard');

  const tabs = [
      { id: 'Dashboard', icon: 'grid', label: 'Dashboard' },
      { id: 'Bookings', icon: 'calendar', label: 'My Booking' },
      { id: 'Explore', icon: 'search', label: 'Explore' },
      { id: 'Messages', icon: 'chatbubbles', label: 'Messages' },
      { id: 'Settings', icon: 'settings', label: 'Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Dashboard Overview
            </Text>
            <View style={styles.statsRow}>
              <DashboardStatSkeleton />
              <DashboardStatSkeleton />
            </View>
            <View style={styles.statsRow}>
              <DashboardStatSkeleton />
              <DashboardStatSkeleton />
            </View>
            <View style={styles.spacer} />
            <PropertyCardSkeleton />
            <BookingCardSkeleton />
          </ScrollView>
        );

      case 'Bookings':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              My Bookings
            </Text>
            <BookingCardSkeleton />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </ScrollView>
        );

      case 'Explore':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Explore Properties
            </Text>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </ScrollView>
        );

      case 'Messages':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Messages
            </Text>
            <View style={styles.statsRow}>
              <DashboardStatSkeleton />
              <DashboardStatSkeleton />
            </View>
            <View style={styles.spacer} />
            <SettingsSkeleton />
            <SettingsSkeleton />
            <SettingsSkeleton />
            <SettingsSkeleton />
            <SettingsSkeleton />
          </ScrollView>
        );

      case 'Settings':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Settings & Profile
            </Text>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Future UI Implementation
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Demo Preview
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
        <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {tabs.map((tab, index) => {
            if (tab.id === 'Explore') {
              return (
                <View key={tab.id} style={styles.fabContainer}>
                  <TouchableOpacity
                    style={[styles.fabButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: activeTab === tab.id ? theme.colors.primary : theme.colors.textTertiary,
                        fontWeight: activeTab === tab.id ? '600' : '400',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              );
            }
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                  size={24}
                  color={activeTab === tab.id ? theme.colors.primary : theme.colors.textTertiary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: activeTab === tab.id ? theme.colors.primary : theme.colors.textTertiary,
                      fontWeight: activeTab === tab.id ? '600' : '400',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 35,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  spacer: {
    height: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: 4,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingTop: 6,
    marginBottom: 24,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: -32,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default DemoUIScreen;
