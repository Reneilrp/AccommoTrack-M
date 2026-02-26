import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Menu/MyBookings.js';
import BookingService from '../../../../services/BookingServices.js';
import TenantService from '../../../../services/TenantService.js';
import { BASE_URL as API_BASE_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BookingCardSkeleton } from '../../../../components/Skeletons';

const TABS = [
  { id: 'current', label: 'My Stay', icon: 'home-outline' },
  { id: 'financials', label: 'Financials', icon: 'cash-outline' },
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
  const [pendingBookings, setPendingBookings] = useState([]);

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [stayRes, bookingsRes, historyRes] = await Promise.all([
        TenantService.getCurrentStay(),
        BookingService.getMyBookings(),
        TenantService.getHistory()
      ]);

      if (stayRes.success) setStayData(stayRes.data);
      if (bookingsRes.success) {
        setPendingBookings((bookingsRes.data || []).filter(b => b.status === 'pending'));
      }
      if (historyRes.success) {
        setHistoryData(historyRes.data.bookings || historyRes.data || []);
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
      </ScrollView>
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
          <View style={[styles.sectionCard, { marginBottom: 16, backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: '#FEF3C7' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#D97706" />
              <Text style={[styles.sectionTitle, { color: '#92400E' }]}>Stay Information</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#92400E', fontSize: 14, fontWeight: '500' }}>
                {pendingBookings.length > 0 
                  ? `You have a pending booking request for ${pendingBookings[0].propertyTitle}.`
                  : "You don't have an active stay at the moment. Explore our properties to find your next home."}
              </Text>
              {!pendingBookings.length && (
                <TouchableOpacity 
                  style={[styles.primaryButton, { marginTop: 12, backgroundColor: '#D97706' }]}
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
                style={{ backgroundColor: hasActiveStay ? theme.colors.primary : theme.colors.textTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                disabled={!hasActiveStay}
                onPress={() => navigation.navigate('Addons')}
              >
                 <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>+ Request</Text>
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
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hasActiveStay ? theme.colors.primaryLight : theme.colors.backgroundTertiary, alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ color: hasActiveStay ? theme.colors.primary : theme.colors.textTertiary, fontWeight: 'bold', fontSize: 18 }}>
                   {hasActiveStay ? (landlord?.name?.charAt(0) || '?') : '?'}
                 </Text>
              </View>
              <View>
                 <Text style={{ fontWeight: 'bold', color: hasActiveStay ? theme.colors.text : theme.colors.textTertiary }}>
                   {hasActiveStay ? landlord?.name : 'No Manager'}
                 </Text>
                 <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                   {hasActiveStay ? landlord?.email : 'N/A'}
                 </Text>
              </View>
           </View>
        </View>
      </View>
    );
  };

  const renderFinancials = () => {
    const hasActiveStay = stayData?.hasActiveStay;
    const financials = stayData?.financials || { monthlyRent: 0, monthlyAddons: 0, monthlyTotal: 0, invoices: [] };

    return (
      <ScrollView style={styles.financialsContainer} showsVerticalScrollIndicator={false}>
         {!hasActiveStay && (
            <View style={[styles.sectionCard, { marginBottom: 16, backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <View style={[styles.sectionHeader, { borderBottomColor: '#DBEAFE' }]}>
                <Ionicons name="cash-outline" size={20} color="#2563EB" />
                <Text style={[styles.sectionTitle, { color: '#1E40AF' }]}>Payment Records</Text>
              </View>
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#1E40AF', fontSize: 14 }}>
                  Financial records and invoices will be available once you have an active stay.
                </Text>
              </View>
            </View>
         )}

         <View style={[styles.financialSummaryRow, !hasActiveStay && { opacity: 0.7 }]}>
            <View style={styles.summaryCard}>
               <Text style={styles.summaryLabel}>Base Rent</Text>
               <Text style={styles.summaryValue}>{formatCurrency(financials.monthlyRent)}</Text>
            </View>
            <View style={styles.summaryCard}>
               <Text style={styles.summaryLabel}>Add-ons</Text>
               <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>+{formatCurrency(financials.monthlyAddons)}</Text>
            </View>
         </View>
         
         <View style={[styles.summaryCard, { width: '100%', marginTop: 12 }, !hasActiveStay && { opacity: 0.7 }]}>
            <Text style={styles.summaryLabel}>Total Monthly Due</Text>
            <Text style={[styles.summaryValue, { fontSize: 28, color: theme.colors.primary }]}>{formatCurrency(financials.monthlyTotal)}</Text>
         </View>

         {/* Invoices (Always shown structure) */}
         <View style={[styles.sectionCard, { marginTop: 16, opacity: hasActiveStay ? 1 : 0.7 }]}>
            <View style={styles.sectionHeader}>
               <Ionicons name="document-text-outline" size={20} color={hasActiveStay ? theme.colors.primary : theme.colors.textTertiary} />
               <Text style={[styles.sectionTitle, !hasActiveStay && { color: theme.colors.textTertiary }]}>Invoice History</Text>
            </View>
            <View style={styles.tableHeader}>
               <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Due Date</Text>
               <Text style={[styles.tableHeaderText, { flex: 2 }]}>Amount</Text>
               <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Status</Text>
            </View>
            {hasActiveStay && financials.invoices?.length > 0 ? (
              financials.invoices.map((inv, idx) => (
                <View key={`inv-${idx}`} style={styles.tableRow}>
                   <Text style={[styles.tableCell, { flex: 1.5 }]}>{inv.dueDate || inv.issuedAt}</Text>
                   <Text style={[styles.tableCell, styles.tableCellBold, { flex: 2 }]}>{formatCurrency(inv.amount)}</Text>
                   <View style={{ flex: 1.5 }}>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(inv.status)}15`, alignSelf: 'flex-start' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(inv.status), fontSize: 10 }]}>{inv.status}</Text>
                      </View>
                   </View>
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="receipt-outline" size={32} color={theme.colors.textTertiary} style={{ opacity: 0.5 }} />
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 12 }}>
                  {hasActiveStay ? "No invoices found for this stay." : "No invoices available."}
                </Text>
              </View>
            )}
         </View>
      </ScrollView>
    );
  };

  const renderHistory = () => {
    if (loading) return <BookingCardSkeleton />;

    if (historyData.length === 0) {
      return (
        <View style={styles.content}>
           <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 32 }]}>
            <Ionicons name="time-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Past Stays</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Your completed and past bookings will appear here.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {historyData.map((booking) => (
          <TouchableOpacity 
            key={booking.id} 
            style={[styles.bookingCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.property?.id })}
          >
            <View style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
               <Image source={getImageUrl(booking.property?.image)} style={{ width: 80, height: 80, borderRadius: 8 }} />
               <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.bookingName, { fontSize: 16, color: theme.colors.text }]}>{booking.property?.title || 'Past Stay'}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {formatDate(booking.period?.startDate)} - {formatDate(booking.period?.endDate)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15`, alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status), fontSize: 10 }]}>{booking.status}</Text>
                  </View>
               </View>
               <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', fontWeight: 'bold' }}>Total Paid</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 }}>
                    {formatCurrency(booking.financials?.totalPaid || booking.amount)}
                  </Text>
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
            {activeTab === 'financials' && renderFinancials()}
            {activeTab === 'history' && renderHistory()}
          </ScrollView>
        </View>
      )}
    </View>
  );
}