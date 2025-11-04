import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Landlord/DashboardPage.js';
import BottomNavigation from '../components/BottomNavigation.jsx';

export default function DashboardPage() {
  const navigation = useNavigation();

  const stats = [
    { id: 1, title: 'Total Rooms', value: '12', icon: 'business', color: '#3B82F6', bgColor: '#DBEAFE' },
    { id: 2, title: 'Occupied', value: '9', icon: 'people', color: '#10B981', bgColor: '#D1FAE5' },
    { id: 3, title: 'Monthly Revenue', value: '₱42,500', icon: 'cash', color: '#3B82F6', bgColor: '#DBEAFE' },
    { id: 4, title: 'Pending Payments', value: '3', icon: 'time', color: '#F59E0B', bgColor: '#FEF3C7' },
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'Payment received from John Doe',
      subtitle: 'Room 101 • 2 hours ago',
      icon: 'checkmark-circle',
      iconColor: '#10B981',
      iconBgColor: '#D1FAE5',
      amount: '₱5,000'
    },
    {
      id: 2,
      title: 'New tenant inquiry',
      subtitle: 'Sarah Williams • 5 hours ago',
      icon: 'person',
      iconColor: '#3B82F6',
      iconBgColor: '#DBEAFE',
    },
    {
      id: 3,
      title: 'Maintenance request',
      subtitle: 'Room 203 • 1 day ago',
      icon: 'warning',
      iconColor: '#F59E0B',
      iconBgColor: '#FEF3C7',
    },
  ];

  const menuItems = [
    { id: 1, title: 'Dorm Profile', icon: 'business-outline', screen: 'DormProfile', color: '#4CAF50' },
    { id: 2, title: 'Room Management', icon: 'grid-outline', screen: 'RoomManagement', color: '#3B82F6' },
    { id: 3, title: 'Tenants', icon: 'people-outline', screen: 'Tenants', color: '#8B5CF6' },
    { id: 4, title: 'Bookings', icon: 'calendar-outline', screen: 'Bookings', color: '#F59E0B' },
    { id: 5, title: 'Messages', icon: 'chatbubble-outline', screen: 'Messages', color: '#EC4899' },
    { id: 6, title: 'Analytics', icon: 'stats-chart-outline', screen: 'Analytics', color: '#06B6D4' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AccommoTrack</Text>
          <Text style={styles.headerSubtitle}>Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={40} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.screen === 'Messages') {
                    navigation.navigate('Messages');
                  } else {
                    console.log('Navigate to:', item.screen);
                  }
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {recentActivities.map((activity) => (
              <TouchableOpacity key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: activity.iconBgColor }]}>
                  <Ionicons name={activity.icon} size={24} color={activity.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                </View>
                {activity.amount && (
                  <Text style={styles.activityAmount}>{activity.amount}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation activeTab="dashboard" onTabPress={() => {}} />
    </SafeAreaView>
  );
}