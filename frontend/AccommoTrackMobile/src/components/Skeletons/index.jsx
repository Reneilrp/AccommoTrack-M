import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const Skeleton = ({ width, height, borderRadius = 8, style }) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const PropertyCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Image skeleton */}
      <Skeleton width="100%" height={200} borderRadius={12} />
      
      <View style={styles.content}>
        {/* Title */}
        <Skeleton width="80%" height={20} style={{ marginBottom: 8 }} />
        
        {/* Location */}
        <Skeleton width="60%" height={16} style={{ marginBottom: 12 }} />
        
        {/* Price row */}
        <View style={styles.row}>
          <Skeleton width={100} height={24} />
          <Skeleton width={60} height={20} />
        </View>
        
        {/* Amenities */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <Skeleton width={60} height={16} />
          <Skeleton width={60} height={16} />
          <Skeleton width={60} height={16} />
        </View>
      </View>
    </View>
  );
};

export const RoomCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.roomCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Skeleton width={100} height={100} borderRadius={8} />
      
      <View style={styles.roomContent}>
        <Skeleton width="70%" height={18} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={16} />
      </View>
    </View>
  );
};

export const ListItemSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.listItem, { borderBottomColor: theme.colors.border }]}>
      <Skeleton width={50} height={50} borderRadius={25} />
      
      <View style={styles.listContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={14} />
      </View>
      
      <Skeleton width={40} height={14} />
    </View>
  );
};

export const ConversationSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.conversationItem, { borderBottomColor: theme.colors.border }]}>
      <Skeleton width={56} height={56} borderRadius={28} />
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Skeleton width="60%" height={18} />
          <Skeleton width={60} height={14} />
        </View>
        <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

export const SettingsSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.settingsItem, { borderBottomColor: theme.colors.border }]}>
      <Skeleton width={40} height={40} borderRadius={8} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={36} height={20} borderRadius={10} />
    </View>
  );
};

export const BookingCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.bookingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.bookingHeader}>
        <Skeleton width="60%" height={20} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
      
      <View style={styles.bookingDivider} />
      
      <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="30%" height={14} style={{ marginBottom: 6 }} />
      <Skeleton width="50%" height={14} />
    </View>
  );
};

export const DashboardStatSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={24} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={14} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  bookingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
