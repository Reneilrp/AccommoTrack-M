import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Menu/MyBookings.js';
import BookingService from '../../../../services/BookingService.js';
import TenantService from '../../../../services/TenantService.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { BookingCardSkeleton } from '../../../../components/Skeletons/index.jsx';

const TABS = [
  { id: 'current', label: 'My Stay', icon: 'home-outline' },
  { id: 'upcoming', label: 'Requests', icon: 'calendar-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' }
];

export default function MyBookings() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  
  const [activeTab, setActiveTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [stayData, setStayData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [stayRes, bookingsRes] = await Promise.all([
        TenantService.getCurrentStay(),
        BookingService.getMyBookings()
      ]);

      if (stayRes.success) setStayData(stayRes.data);
      if (bookingsRes.success) {
        const all = bookingsRes.data || [];
        setUpcomingBookings(all.filter(b => ['pending', 'confirmed'].includes(b.status) && b.id !== stayRes.data?.booking?.id));
        setHistoryData(all.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status)));
      }
    } catch (error) {
      console.error('Error fetching bookings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return { uri: 'https://via.placeholder.com/800x400?text=No+Image' };
    if (typeof imagePath === 'string' && imagePath.startsWith('http')) return { uri: imagePath };
    const cleanPath = typeof imagePath === 'string' ? imagePath.replace(/^\/?(storage\/)?/, '') : '';
    return { uri: `${API_BASE_URL}/storage/${cleanPath}` };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Available';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('confirm') || s.includes('active') || s.includes('complete')) return theme.colors.primary;
    if (s.includes('pending') || s.includes('partial')) return '#F59E0B';
    if (s.includes('cancel') || s.includes('reject')) return '#EF4444';
    return '#6B7280';
  };

  // ==================== Sub-components for Tabs ====================

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => setActiveTab(tab.id)}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab
          ]}
        >
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.id ? theme.colors.textInverse : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCurrentStay = () => {
    const hasActiveStay = stayData?.hasActiveStay;
    const booking = stayData?.booking || {};
    const room = stayData?.room || {};
    const property = stayData?.property || {};
    const landlord = stayData?.landlord || {};
    const addons = stayData?.addons || { active: [], pending: [] };

    return (
      <View style={styles.content}>
        {/* Conditional Pending/No Stay Header */}
        {!hasActiveStay && (
          <View style={[styles.sectionCard, styles.stayHeaderCard]}>
            <View style={[styles.sectionHeader, styles.stayHeaderInner]}>
              <Ionicons name="information-circle-outline" size={20} color="#D97706" />
              <Text style={[styles.sectionTitle, styles.stayHeaderLabel]}>Stay Information</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={styles.stayHeaderValue}>
                {upcomingBookings.length > 0 
                  ? `You have ${upcomingBookings.length} booking request(s) being processed.`
                  : "You don't have an active stay at the moment. Explore our properties to find your next home."}
              </Text>
              {!upcomingBookings.length && (
                <TouchableOpacity 
                  style={[styles.primaryButton, styles.stayHeaderBtn]}
                  onPress={() => navigation.navigate('TenantHome')}
                >
                  <Text style={styles.primaryButtonText}>Explore Properties</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Main Property Card (Always shown structure) */}
        <View style={[styles.bookingCard, !hasActiveStay && { opacity: 0.8 }]}>
          <Image 
            source={getImageUrl(property.image)} 
            style={styles.bookingImage} 
          />
          <View style={styles.bookingInfo}>
            <View style={styles.bookingHeader}>
              <Text style={[styles.bookingName, { color: theme.colors.text }]}>
                {hasActiveStay ? property.title : 'No Property Selected'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: hasActiveStay ? `${theme.colors.primary}20` : `${theme.colors.textTertiary}20` }]}>
                <Text style={[styles.statusText, { color: hasActiveStay ? theme.colors.primary : theme.colors.textTertiary }]}>
                  {hasActiveStay ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                {hasActiveStay ? property.address : 'N/A'}
              </Text>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateItemLeft}>
                <Text style={styles.dateLabel}>Check-in</Text>
                <Text style={styles.dateValue}>{hasActiveStay ? formatDate(booking.startDate) : '--/--/----'}</Text>
              </View>
              <View style={styles.dateIconContainer}>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.dateItemRight}>
                <Text style={styles.dateLabel}>Check-out</Text>
                <Text style={styles.dateValue}>{hasActiveStay ? formatDate(booking.endDate) : '--/--/----'}</Text>
              </View>
            </View>

            <View style={styles.financialSummaryRow}>
               <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Room</Text>
                  <Text style={styles.summaryValue}>{hasActiveStay ? (room.roomNumber || 'N/A') : '--'}</Text>
               </View>
               <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Rent</Text>
                  <Text style={styles.summaryValue}>{hasActiveStay ? formatCurrency(booking.monthlyRent) : formatCurrency(0)}</Text>
               </View>
            </View>

            <View style={[styles.reviewBtnContainer, { gap: 12 }]}>
               <TouchableOpacity 
                style={[styles.reviewBtn, { backgroundColor: hasActiveStay && !booking.hasReview ? theme.colors.primary : theme.colors.backgroundTertiary }]}
                disabled={!hasActiveStay || booking.hasReview}
                onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id, propertyId: property.id })}
               >
                 <Text style={{ color: hasActiveStay && !booking.hasReview ? '#fff' : theme.colors.textTertiary, fontWeight: 'bold' }}>Leave Review</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                style={[styles.reviewBtn, { backgroundColor: hasActiveStay ? '#FEE2E2' : theme.colors.backgroundTertiary, borderWidth: 1, borderColor: hasActiveStay ? '#FECACA' : theme.colors.border }]}
                disabled={!hasActiveStay}
                onPress={() => navigation.navigate('ReportProperty', { propertyId: property.id, propertyTitle: property.title })}
               >
                 <Text style={{ color: hasActiveStay ? '#991B1B' : theme.colors.textTertiary, fontWeight: 'bold' }}>Report Issue</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Addons Section (Always shown structure) */}
        <View style={styles.addonSection}>
           <View style={styles.addonHeader}>
              <Text style={styles.sectionTitle}>Add-ons & Extras</Text>
              <TouchableOpacity 
                style={[styles.stayHeaderBtn, { marginTop: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: hasActiveStay ? theme.colors.primary : theme.colors.textTertiary }]}
                disabled={!hasActiveStay}
                onPress={() => navigation.navigate('Addons')}
              >
                 <Text style={styles.stayHeaderBtnText}>+ Request</Text>
              </TouchableOpacity>
           </View>

           {hasActiveStay && (addons.active?.length > 0 || addons.pending?.length > 0) ? (
             <>
               {addons.active?.map((addon, idx) => (
                 <View key={`active-${idx}`} style={[styles.addonItem, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>
                    <View style={styles.addonInfo}>
                       <View style={[styles.addonIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                          <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                       </View>
                       <View>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          <Text style={styles.addonSubtext}>{addon.priceTypeLabel}</Text>
                       </View>
                    </View>
                    <Text style={styles.addonPrice}>{formatCurrency(addon.price)}</Text>
                 </View>
               ))}
               {addons.pending?.map((addon, idx) => (
                 <View key={`pending-${idx}`} style={[styles.addonItem, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                    <View style={styles.addonInfo}>
                       <View style={[styles.addonIconContainer, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="time" size={20} color="#D97706" />
                       </View>
                       <View>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          <Text style={[styles.addonSubtext, { color: '#D97706' }]}>Pending Approval</Text>
                       </View>
                    </View>
                    <Text style={styles.addonPrice}>{formatCurrency(addon.price)}</Text>
                 </View>
               ))}
             </>
           ) : (
             <View style={{ paddingVertical: 24, alignItems: 'center' }}>
               <Ionicons name="sparkles-outline" size={32} color={theme.colors.textTertiary} style={{ opacity: 0.5 }} />
               <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 8 }}>
                 {hasActiveStay ? "No add-ons requested yet." : "No active stay to manage add-ons."}
               </Text>
             </View>
           )}
        </View>

        {/* Landlord Contact (Always shown structure) */}
        <View style={[styles.sectionCard, { marginTop: 16, opacity: hasActiveStay ? 1 : 0.7 }]}>
           <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={hasActiveStay ? theme.colors.primary : theme.colors.textTertiary} />
              <Text style={[styles.sectionTitle, !hasActiveStay && { color: theme.colors.textTertiary }]}>Property Manager</Text>
           </View>
           <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.avatarSmall, { backgroundColor: hasActiveStay ? theme.colors.primaryLight : theme.colors.backgroundTertiary }]}>
                 <Text style={[styles.avatarSmallText, { color: hasActiveStay ? theme.colors.primary : theme.colors.textTertiary }]}>
                   {hasActiveStay ? (landlord?.name?.charAt(0) || '?') : '?'}
                 </Text>
              </View>
              <View>
                 <Text style={[styles.managerName, { color: hasActiveStay ? theme.colors.text : theme.colors.textTertiary }]}>
                   {hasActiveStay ? landlord?.name : 'No Manager'}
                 </Text>
                 <Text style={[styles.managerEmail, { color: theme.colors.textSecondary }]}>
                   {hasActiveStay ? landlord?.email : 'N/A'}
                 </Text>
              </View>
           </View>
        </View>
      </View>
    );
  };

  const renderUpcoming = () => {
    if (upcomingBookings.length === 0) {
      return (
        <View style={styles.content}>
           <View style={styles.emptyHistoryCard}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} style={styles.emptyHistoryIcon} />
            <Text style={[styles.emptyTitle, styles.emptyHistoryTitle, { color: theme.colors.text }]}>No Upcoming Stays</Text>
            <Text style={[styles.emptyText, styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
              Your pending requests and future bookings will appear here.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {upcomingBookings.map((booking) => (
          <TouchableOpacity 
            key={booking.id} 
            style={[styles.bookingCard, styles.historyItemCard]}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.property?.id || booking.property_id })}
          >
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                 <Image source={getImageUrl(booking.property?.image || booking.property_image)} style={styles.historyItemImage} />
                 <View style={styles.historyItemContent}>
                    <Text style={[styles.bookingName, styles.historyItemName, { color: theme.colors.text }]}>{booking.property?.title || booking.property_title || 'Pending Stay'}</Text>
                    <Text style={[styles.historyItemDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </Text>
                    <View style={[styles.statusBadge, styles.historyItemBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status), fontSize: 10 }]}>{booking.status}</Text>
                    </View>
                 </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHistory = () => {
    if (loading) return <BookingCardSkeleton />;

    if (historyData.length === 0) {
      return (
        <View style={styles.content}>
           <View style={styles.emptyHistoryCard}>
            <Ionicons name="time-outline" size={64} color={theme.colors.textTertiary} style={styles.emptyHistoryIcon} />
            <Text style={[styles.emptyTitle, styles.emptyHistoryTitle, { color: theme.colors.text }]}>No Past Stays</Text>
            <Text style={[styles.emptyText, styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
              Your completed and past bookings will appear here.
            </Text>
          </View>
        </View>
      );
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getTimelineColor = (status) => {
      switch(status) {
        case 'pending': return '#F59E0B';
        case 'confirmed': return theme.colors.primary;
        case 'paid': return '#3B82F6';
        case 'cancelled': return '#EF4444';
        default: return '#9CA3AF';
      }
    };

    return (
      <View style={styles.content}>
        {historyData.map((booking) => (
          <TouchableOpacity 
            key={booking.id} 
            style={[styles.bookingCard, styles.historyItemCard]}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.property?.id })}
          >
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                 <Image source={getImageUrl(booking.property?.image)} style={styles.historyItemImage} />
                 <View style={styles.historyItemContent}>
                    <Text style={[styles.bookingName, styles.historyItemName, { color: theme.colors.text }]}>{booking.property?.title || 'Past Stay'}</Text>
                    <Text style={[styles.historyItemDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(booking.period?.startDate)} - {formatDate(booking.period?.endDate)}
                    </Text>
                    <View style={[styles.statusBadge, styles.historyItemBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status), fontSize: 10 }]}>{booking.status}</Text>
                    </View>
                 </View>
                 <View style={styles.historyItemRight}>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', fontWeight: 'bold' }}>Total Paid</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 }}>
                      {formatCurrency(booking.financials?.totalPaid || booking.amount)}
                    </Text>
                 </View>
              </View>

              {/* Activity Timeline */}
              <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textTertiary, textTransform: 'uppercase', marginBottom: 12 }}>Activity Timeline</Text>
                <View style={{ paddingLeft: 8 }}>
                  {(booking.activityLog || []).map((activity, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: 12, position: 'relative' }}>
                      {/* Vertical line connector */}
                      {idx < (booking.activityLog.length - 1) && (
                        <View style={{ position: 'absolute', left: 4, top: 12, bottom: -12, width: 1, backgroundColor: theme.colors.border }} />
                      )}
                      
                      {/* Timeline dot */}
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: getTimelineColor(activity.status), marginTop: 4, marginRight: 12, zIndex: 1, borderWeight: 2, borderColor: theme.colors.backgroundSecondary }} />
                      
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text }}>{activity.action}</Text>
                          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{formatDateTime(activity.timestamp)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{activity.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderTabs()}
      
      {loading && !refreshing ? (
        <ScrollView style={styles.content}>
           <BookingCardSkeleton />
           <BookingCardSkeleton />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
          >
            {activeTab === 'current' && renderCurrentStay()}
            {activeTab === 'upcoming' && renderUpcoming()}
            {activeTab === 'history' && renderHistory()}
          </ScrollView>
        </View>
      )}
    </View>
  );
}