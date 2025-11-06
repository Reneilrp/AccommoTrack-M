import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/DashboardPage.js';

export default function LandlordDashboard({ navigation, user }) {
  const [stats] = useState({
    totalRooms: 12,
    occupiedRooms: 9,
    monthlyRevenue: 42500,
    pendingPayments: 3
  });

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'payment',
      title: 'Payment received from John Doe',
      subtitle: 'Room 101 • 2 hours ago',
      amount: 5000,
      icon: 'checkmark-circle',
      iconColor: '#4CAF50'
    },
    {
      id: 2,
      type: 'inquiry',
      title: 'New tenant inquiry',
      subtitle: 'Sarah Williams • 5 hours ago',
      icon: 'person-add',
      iconColor: '#2196F3'
    },
    {
      id: 3,
      type: 'maintenance',
      title: 'Maintenance request',
      subtitle: 'Room 203 • 1 day ago',
      icon: 'warning',
      iconColor: '#FF9800'
    }
  ]);

  const quickActions = [
    { id: 1, title: 'Rooms', 
      icon: 'bed', 
      color: '#4CAF50', 
      screen: 'Rooms' },
    { id: 2, 
      title: 'Tenants', 
      icon: 'people', 
      color: '#2196F3', 
      screen: 'Tenants' },
    { id: 3, 
      title: 'Bookings', 
      icon: 'calendar', 
      color: '#FF9800', 
      screen: 'Bookings' },
    { id: 4, 
      title: 'Messages', 
      icon: 'chatbubbles', 
      color: '#9C27B0', 
      screen: 'Messages' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.first_name || 'Landlord'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="bed-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.totalRooms}</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.occupiedRooms}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>₱{(stats.monthlyRevenue / 1000).toFixed(0)}K</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#F44336' }]}>
              <Ionicons name="time-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.pendingPayments}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
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

          <View style={styles.activityContainer}>
            {recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: activity.iconColor + '20' }]}>
                  <Ionicons name={activity.icon} size={24} color={activity.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                </View>
                {activity.amount && (
                  <Text style={styles.activityAmount}>₱{activity.amount.toLocaleString()}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Property Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Overview</Text>
          <TouchableOpacity 
            style={styles.propertyCard}
            onPress={() => navigation.navigate('DormProfile')}
          >
            <View style={styles.propertyHeader}>
              <View>
                <Text style={styles.propertyName}>Q&M Dormitory</Text>
                <Text style={styles.propertyAddress}>Zamboanga City</Text>
              </View>
              <View style={styles.occupancyBadge}>
                <Text style={styles.occupancyText}>75% Full</Text>
              </View>
            </View>
            <View style={styles.propertyStats}>
              <View style={styles.propertyStatItem}>
                <Ionicons name="bed" size={20} color="#4CAF50" />
                <Text style={styles.propertyStatText}>12 Rooms</Text>
              </View>
              <View style={styles.propertyStatItem}>
                <Ionicons name="people" size={20} color="#4CAF50" />
                <Text style={styles.propertyStatText}>9 Tenants</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

