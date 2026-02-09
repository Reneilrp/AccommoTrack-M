import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Components & Services
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DashboardStatSkeleton, PropertyCardSkeleton, BookingCardSkeleton } from '../../../../components/Skeletons/index';
import { showError } from '../../../../utils/toast';
import ScreenLayout from '../../components/ScreenLayout';
import styles from '../../../../styles/Tenant/DashboardScreen.js';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current stay data
  const { data: stayData, isLoading: stayLoading, refetch: refetchStay } = useQuery({
    queryKey: ['currentStay'],
    queryFn: async () => {
      const response = await tenantService.getCurrentStay();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stay data');
      }
      return response.data;
    },
    onError: (error) => {
      console.error('Failed to load stay data:', error);
      showError('Failed to load current stay', error.message);
    },
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await tenantService.getDashboardStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stats');
      }
      return response.data;
    },
    onError: (error) => {
      console.error('Failed to load stats:', error);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStay(), refetchStats()]);
    setRefreshing(false);
  };

  const calculateDaysStayed = (startDate) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loading = stayLoading || statsLoading;

  return (
    <ScreenLayout title="Dashboard">
      <View style={styles.contentContainer}>
        {loading ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[theme.colors.primary]} 
                tintColor={theme.colors.primary}
              />
            }
          >
            {stayData?.hasActiveStay ? (
              <>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.primaryLight }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="bed-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {stayData.room?.room_number || 'N/A'}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Current Room</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}> 
                      {stayData.room?.type}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="calendar-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {calculateDaysStayed(stayData.booking?.start_date)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Days Stayed</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}> 
                      Since {formatDate(stayData.booking?.start_date)}
                    </Text>
                  </View>
                </View>
                
                {/* Add other active stay components here */}
              </>
            ) : (
              /* Empty State */
              <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, marginTop: 40 }]}> 
                <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryLight }]}> 
                  <Ionicons name="home-outline" size={40} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Active Stay</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}> 
                  You don't have any active bookings at the moment. Explore our properties to find your next home.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('TenantHome')}
                >
                  <Text style={styles.primaryButtonText}>Explore Properties</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
};

export default DashboardScreen;