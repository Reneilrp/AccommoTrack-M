import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { styles } from '../../../styles/Landlord/Analytics';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';


const TimeRangeButton = ({ label, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.timeButton,
      isSelected ? styles.timeButtonActive : styles.timeButtonInactive,
    ]}
  >
    <Text
      style={[
        styles.timeButtonText,
        isSelected ? styles.timeButtonTextActive : styles.timeButtonTextInactive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const StatCard = ({ title, value, color, iconPlaceholder, trend }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}10` }]}>
        <Text style={{ fontSize: 24, color: color }}>{iconPlaceholder}</Text>
      </View>
      <Text style={[styles.trendText, { color: color }]}>{trend}</Text>
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </View>
);

const BarChartItem = ({ month, revenue, maxRevenue }) => {
  const heightPercent = (revenue / maxRevenue) * 80;
  return (
    <View style={styles.barItem}>
      <View
        style={[styles.bar, { height: `${heightPercent}%` }]}
      />
      <Text style={styles.barLabel}>{month}</Text>
    </View>
  );
};

export default function Analytics({ navigation }) {
  const [timeRange, setTimeRange] = useState('month');

  const stats = {
    totalRevenue: 127500,
    occupancyRate: 75,
    averageStayDuration: 3.5,
    newTenants: 8,
  };

  const revenueData = [
    { month: 'Jan', revenue: 95000 },
    { month: 'Feb', revenue: 105000 },
    { month: 'Mar', revenue: 115000 },
    { month: 'Apr', revenue: 108000 },
    { month: 'May', revenue: 120000 },
    { month: 'Jun', revenue: 127500 },
  ];

  const roomPerformance = [
    { type: 'Single Room', occupied: 8, total: 10, revenue: 45000 },
    { type: 'Double Room', occupied: 6, total: 8, revenue: 36000 },
    { type: 'Quad Room', occupied: 3, total: 4, revenue: 21000 },
  ];

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Analytics</Text>
            </View>
          </View>

          {/* Dropdown */}
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={timeRange}
              onValueChange={(value) => setTimeRange(value)}
              style={styles.dropdown}
              dropdownIconColor="#059669"
            >
              <Picker.Item label="Week" value="week" />
              <Picker.Item label="Month" value="month" />
              <Picker.Item label="Year" value="year" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Key Metrics (Grid-like layout using flex) */}
        <View style={styles.metricsGrid}>
          <StatCard
            title="Total Revenue"
            value={`₱${stats.totalRevenue.toLocaleString()}`}
            color="#059669" 
            iconPlaceholder="💵"
            trend="↑ 12%"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${stats.occupancyRate}%`}
            color="#3B82F6" 
            iconPlaceholder="📈" 
            trend="↑ 5%"
          />
          <StatCard
            title="Avg Stay Duration"
            value={stats.averageStayDuration}
            color="#9333EA"
            iconPlaceholder="🕒"
            trend="months"
          />
          <StatCard
            title="New Tenants"
            value={stats.newTenants}
            color="#F59E0B"
            iconPlaceholder="➕"
            trend="↑ 3"
          />
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Trend</Text>
          <View style={styles.barChartContainer}>
            {revenueData.map((data, index) => (
              <BarChartItem
                key={index}
                month={data.month}
                revenue={data.revenue}
                maxRevenue={maxRevenue}
              />
            ))}
          </View>
        </View>

        {/* Room Performance */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Room Performance</Text>
          <View style={styles.roomPerformanceContainer}>
            {roomPerformance.map((room, index) => {
              const occupancy = Math.round((room.occupied / room.total) * 100);
              return (
                <View key={index} style={styles.roomItem}>
                  <View style={styles.roomInfoRow}>
                    <View>
                      <Text style={styles.roomType}>{room.type}</Text>
                      <Text style={styles.roomDetails}>
                        {room.occupied} of {room.total} occupied
                      </Text>
                    </View>
                    <View style={styles.roomRevenue}>
                      <Text style={styles.roomRevenueValue}>
                        ₱{room.revenue.toLocaleString()}
                      </Text>
                      <Text style={styles.roomRevenueLabel}>
                        Monthly revenue
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${occupancy}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.roomOccupancy}>
                    {occupancy}% occupancy rate
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Insights */}
        <View style={styles.quickInsightsGrid}>
          {/* Top Performing Room */}
          <View
            style={[
              styles.insightCard,
              { backgroundColor: '#059669', borderColor: '#059669' },
            ]}
          >
            <Text style={styles.insightTitle}>Top Performing Room</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.insightValue}>Single Room</Text>
              <Text style={styles.insightDetail}>
                80% occupancy • ₱45,000 revenue
              </Text>
            </View>
          </View>

          {/* Payment Collection */}
          <View
            style={[
              styles.insightCard,
              { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
          >
            <Text style={styles.insightTitle}>Payment Collection</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.insightValue}>92%</Text>
              <Text style={styles.insightDetail}>
                On-time payment rate this month
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}