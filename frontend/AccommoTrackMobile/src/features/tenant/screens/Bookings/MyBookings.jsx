import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Animated, Dimensions } from 'react-native';
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
  { id: 'history', label: 'History', icon: 'time-outline' }
];

export default function MyBookings() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  
  const [activeTab, setActiveTab] = useState('current');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'pending'
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [stayData, setStayData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);
  const [selectedPendingIndex, setSelectedPendingIndex] = useState(0);
  const [submittingExtension, setSubmittingExtension] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingMoveOut, setSubmittingMoveOut] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [stayRes, bookingsRes] = await Promise.all([
        TenantService.getCurrentStay(),
        BookingService.getMyBookings()
      ]);

      if (stayRes.success) {
        setStayData(stayRes.data);
        if (stayRes.data.stays && stayRes.data.stays.length > 0) {
          setViewMode('active');
        } else {
          setViewMode('pending');
        }
      }

      if (bookingsRes.success) {
        const all = bookingsRes.data || [];
        // Pending: status is pending
        setPendingBookings(all.filter(b => b.status?.toLowerCase() === 'pending'));
        // History: finished, rejected, or confirmed (if they are past stays)
        setHistoryData(all.filter(b => ['completed', 'confirmed', 'cancelled', 'rejected'].includes(b.status?.toLowerCase())));
      }
    } catch (error) {
      console.error('Error fetching bookings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: viewMode === 'active' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [viewMode]);

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

  const handleCancelBooking = async (bookingId) => {
    if (!bookingId || cancellingBookingId) return;

    setCancellingBookingId(bookingId);
    const result = await BookingService.cancelBooking(bookingId, {
      reason: 'Tenant cancelled the booking',
    });

    if (result.success) {
      Alert.alert('Cancelled', 'Your booking request has been cancelled.');
      fetchData();
    } else {
      Alert.alert('Unable to Cancel', result.error || 'Failed to cancel booking request.');
    }

    setCancellingBookingId(null);
  };

  const handleRequestExtension = async (booking) => {
    if (!booking?.id || submittingExtension) return;

    const submitExtension = async (days) => {
      const currentEndRaw = booking.endDate || booking.end_date;
      if (!currentEndRaw) {
        Alert.alert('Extension Not Needed', 'This stay is open-ended monthly. You can submit a move-out notice anytime instead of extending.');
        return;
      }

      const currentEnd = new Date(currentEndRaw);
      if (Number.isNaN(currentEnd.getTime())) {
        Alert.alert('Request Failed', 'Could not determine your current move-out date.');
        return;
      }

      const requestedEnd = new Date(currentEnd);
      requestedEnd.setDate(requestedEnd.getDate() + days);

      setSubmittingExtension(true);
      const result = await TenantService.requestExtension(booking.id, {
        extension_type: 'daily',
        requested_end_date: requestedEnd.toISOString().split('T')[0],
      });

      if (result.success) {
        Alert.alert('Extension Requested', 'Your extension request was sent to your landlord.');
        fetchData();
      } else {
        Alert.alert('Request Failed', result.error || 'Failed to request extension.');
      }
      setSubmittingExtension(false);
    };

    Alert.alert(
      'Request Extension',
      'Select extension duration',
      [
        { text: '7 Days', onPress: () => submitExtension(7) },
        { text: '30 Days', onPress: () => submitExtension(30) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRequestTransfer = async (booking, room) => {
    if (!booking?.id || submittingTransfer) return;

    Alert.alert(
      'Request Room Transfer',
      'Send transfer request to your landlord?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            setSubmittingTransfer(true);
            const result = await TenantService.requestTransfer({
              booking_id: booking.id,
              current_room_id: room?.id || room?.room_id,
              requested_date: new Date().toISOString().slice(0, 10),
              tenant_notes: '',
            });

            if (result.success) {
              Alert.alert('Transfer Requested', 'Your transfer request was sent to your landlord.');
              fetchData();
            } else {
              Alert.alert('Request Failed', result.error || 'Failed to request transfer.');
            }
            setSubmittingTransfer(false);
          },
        },
      ]
    );
  };

  const handleRequestMoveOut = async (booking) => {
    if (!booking?.id || submittingMoveOut) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const submitMoveOut = async (daysAhead) => {
      const moveOutDate = new Date(today);
      moveOutDate.setDate(moveOutDate.getDate() + daysAhead);

      setSubmittingMoveOut(true);
      const result = await BookingService.requestMoveOut(booking.id, {
        move_out_date: moveOutDate.toISOString().split('T')[0],
        reason: 'Requested via mobile app',
      });

      if (result.success) {
        Alert.alert('Move-out Requested', 'Your move-out notice was sent to your landlord.');
        fetchData();
      } else {
        Alert.alert('Request Failed', result.error || 'Failed to request move-out notice.');
      }
      setSubmittingMoveOut(false);
    };

    Alert.alert(
      'Request Move-out',
      'Select your planned move-out timeline',
      [
        { text: 'In 7 Days', onPress: () => submitMoveOut(7) },
        { text: 'In 30 Days', onPress: () => submitMoveOut(30) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('overdue')) return '#EF4444';
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
    const hasStays = stayData?.stays && stayData.stays.length > 0;
    const hasPending = pendingBookings && pendingBookings.length > 0;

    const currentData = viewMode === 'active' 
      ? (stayData?.stays?.[selectedStayIndex] || stayData?.stays?.[0])
      : (pendingBookings?.[selectedPendingIndex] || pendingBookings?.[0]);

    if (!hasStays && !hasPending && !stayData?.upcomingBooking) {
      return (
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Stay</Text>
            <Text style={styles.emptyText}>
              You don't have any active or pending bookings. Ready to find your next home?
            </Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('TenantHome')}
            >
              <Text style={styles.primaryButtonText}>Explore Properties</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Normalize data for display
    const isActuallyPending = viewMode === 'pending';
    const display = isActuallyPending ? {
      booking: {
        id: currentData?.id,
        startDate: currentData?.start_date,
        endDate: currentData?.end_date,
        monthlyRent: currentData?.monthly_rent,
        unit_price: currentData?.unit_price,
        contract_mode: currentData?.contract_mode,
        contractMode: currentData?.contract_mode,
        billing_policy: currentData?.billing_policy,
        status: currentData?.status,
        paymentStatus: currentData?.status,
        daysStayed: 0,
        isPending: true
      },
      room: { roomNumber: currentData?.room?.room_number || 'N/A' },
      property: currentData?.property || {},
      landlord: currentData?.landlord || {},
      addons: { active: [], pending: [] }
    } : currentData;

    if (!display) return null;

    const { booking, room, property, landlord, addons } = display;
    const bookingContractMode = String(booking.contract_mode || booking.contractMode || '').toLowerCase();
    const hasScheduledEndDate = Boolean(booking.endDate || booking.end_date);
    const canRequestExtension = !booking.isPending && !(bookingContractMode === 'monthly' && !hasScheduledEndDate) && hasScheduledEndDate;

    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, (Dimensions.get('window').width - 40) / 2],
    });

    return (
      <View style={styles.content}>
        {/* Sliding Toggle */}
        {hasStays && hasPending && (
          <View style={styles.sliderContainer}>
            <Animated.View 
              style={[
                styles.sliderIndicator, 
                { 
                  width: '50%',
                  backgroundColor: viewMode === 'active' ? theme.colors.primary : '#F59E0B',
                  transform: [{ translateX }] 
                }
              ]} 
            />
            <TouchableOpacity 
              style={styles.sliderTab} 
              onPress={() => setViewMode('active')}
            >
              <Text style={[styles.sliderTabText, { color: viewMode === 'active' ? '#fff' : theme.colors.textSecondary }]}>
                Active Stays ({stayData.stays.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.sliderTab} 
              onPress={() => setViewMode('pending')}
            >
              <Text style={[styles.sliderTabText, { color: viewMode === 'pending' ? '#fff' : theme.colors.textSecondary }]}>
                Pending ({pendingBookings.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Property Selector */}
        {((viewMode === 'active' && stayData.stays.length > 1) || (viewMode === 'pending' && pendingBookings.length > 1)) && (
          <View style={styles.selectorContainer}>
            <View style={styles.selectorInfo}>
              <View style={styles.selectorIcon}>
                <Ionicons name="business" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.selectorLabel}>Switch Property</Text>
                <Text style={styles.selectorSublabel}>
                  {viewMode === 'active' ? `${stayData.stays.length} active stays` : `${pendingBookings.length} pending requests`}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.selectorDropdown}
              onPress={() => {
                const list = viewMode === 'active' ? stayData.stays : pendingBookings;
                Alert.alert(
                  "Select Property",
                  "Choose a property to view details",
                  list.map((item, idx) => ({
                    text: `${item.property?.title || item.property_title} (Room ${item.room?.room_number || item.room?.roomNumber})`,
                    onPress: () => viewMode === 'active' ? setSelectedStayIndex(idx) : setSelectedPendingIndex(idx)
                  })).concat([{ text: "Cancel", style: "cancel" }])
                );
              }}
            >
              <Text style={styles.selectorValue} numberOfLines={1}>
                {property.title || property.property_title || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Refund Warning */}
        {booking.paymentStatus === 'refunded' && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={24} color="#7E22CE" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Payment Action Required</Text>
              <Text style={styles.warningText}>
                Your last payment was refunded. Please complete a new payment to maintain your active status.
              </Text>
            </View>
          </View>
        )}

        {/* Main Property Card */}
        <View style={styles.bookingCard}>
          <Image 
            source={getImageUrl(property.image)} 
            style={styles.bookingImage} 
          />
          <View style={styles.bookingInfo}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingName}>{property.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status)}15` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status) }]}>
                  {booking.isOverdue || booking.is_overdue ? 'Overdue' : booking.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>{property.address || property.full_address}</Text>
            </View>

            <View style={styles.financialSummaryRow}>
               <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Room</Text>
                  <Text style={styles.summaryValue}>{room.roomNumber || room.room_number}</Text>
               </View>
               <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>
                    {booking.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(booking.unit_price || booking.monthlyRent)}
                  </Text>
               </View>
            </View>

            {!booking.isPending && (
              <View style={[styles.reviewBtnContainer, { gap: 8, marginBottom: 8 }]}> 
                {canRequestExtension && (
                  <TouchableOpacity
                    style={[styles.reviewBtn, { backgroundColor: submittingExtension ? theme.colors.textTertiary : '#2563EB' }]}
                    disabled={submittingExtension}
                    onPress={() => handleRequestExtension(booking)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Extend Stay</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: submittingTransfer ? theme.colors.textTertiary : '#7C3AED' }]}
                  disabled={submittingTransfer}
                  onPress={() => handleRequestTransfer(booking, room)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Transfer Room</Text>
                </TouchableOpacity>
              </View>
            )}

            {!booking.isPending && (
              <View style={[styles.reviewBtnContainer, { gap: 8, marginBottom: 8 }]}> 
                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: submittingMoveOut ? theme.colors.textTertiary : '#4F46E5' }]}
                  disabled={submittingMoveOut}
                  onPress={() => handleRequestMoveOut(booking)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {submittingMoveOut ? 'Submitting...' : 'Request Move-out'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.reviewBtnContainer, { gap: 16 }]}> 
               {!booking.isPending ? (
                 <>
                   <TouchableOpacity 
                    style={[styles.reviewBtn, { backgroundColor: (!booking.hasReview && !booking.has_review) ? theme.colors.primary : theme.colors.backgroundTertiary }]}
                    disabled={booking.hasReview || booking.has_review}
                    onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id, propertyId: property.id })}
                   >
                     <Text style={{ color: (!booking.hasReview && !booking.has_review) ? '#fff' : theme.colors.textTertiary, fontWeight: 'bold' }}>Review</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                    style={[styles.reviewBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }]}
                    onPress={() => navigation.navigate('ReportProperty', { propertyId: property.id, propertyTitle: property.title })}
                   >
                     <Text style={{ color: '#991B1B', fontWeight: 'bold' }}>Report</Text>
                   </TouchableOpacity>
                 </>
               ) : (
                 <TouchableOpacity 
                  style={[styles.reviewBtn, { backgroundColor: theme.colors.error }]}
                  onPress={() => {
                    Alert.alert(
                      "Cancel Request",
                      "Are you sure you want to cancel this booking request?",
                      [
                        { text: "No", style: "cancel" },
                        {
                          text: "Yes, Cancel",
                          style: "destructive",
                          onPress: () => handleCancelBooking(booking.id)
                        }
                      ]
                    );
                  }}
                  disabled={cancellingBookingId === booking.id}
                 >
                   <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                     {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel Request'}
                   </Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>
        </View>

        {/* Addons Section */}
        <View style={styles.addonSection}>
           <View style={styles.addonHeader}>
              <Text style={styles.sectionTitle}>Add-ons & Extras</Text>
              {!booking.isPending && (
                <TouchableOpacity 
                  style={[
                    styles.stayHeaderBtn, 
                    { 
                      marginTop: 0, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, 
                      backgroundColor: booking.paymentStatus === 'refunded' ? theme.colors.textTertiary : theme.colors.primary 
                    }
                  ]}
                  disabled={booking.paymentStatus === 'refunded'}
                  onPress={() => navigation.navigate('Addons', { bookingId: booking.id })}
                >
                   <Text style={styles.stayHeaderBtnText}>+ Request</Text>
                </TouchableOpacity>
              )}
           </View>

           {!booking.isPending ? (
             (addons.active?.length > 0 || addons.pending?.length > 0) ? (
               <>
                 {addons.active?.map((addon, idx) => (
                   <View key={`active-${idx}`} style={styles.addonItem}>
                      <View style={styles.addonInfo}>
                         <View style={styles.addonIconContainer}>
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
                   <View key={`pending-${idx}`} style={[styles.addonItem, { backgroundColor: theme.isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', borderColor: '#FEF3C7' }]}>
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
                 <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 8 }}>No add-ons requested yet.</Text>
               </View>
             )
           ) : (
             <View style={{ paddingVertical: 24, alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}>
               <Ionicons name="time-outline" size={32} color="#D97706" style={{ opacity: 0.7 }} />
               <Text style={{ color: '#D97706', fontSize: 13, fontWeight: '700', marginTop: 8 }}>Booking Under Review</Text>
               <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 }}>
                 Add-ons will be available once your booking is confirmed.
               </Text>
             </View>
           )}
        </View>

        {/* Landlord Contact */}
        <View style={styles.sectionCard}>
           <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Property Manager</Text>
           </View>
           <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[styles.avatarSmall, { backgroundColor: theme.colors.primaryLight }]}>
                 <Text style={[styles.avatarSmallText, { color: theme.colors.primary }]}>
                   {landlord?.name?.charAt(0) || landlord?.first_name?.charAt(0) || '?'}
                 </Text>
              </View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.managerName}>{landlord?.name || `${landlord?.first_name} ${landlord?.last_name}`}</Text>
                 <Text style={styles.managerEmail}>{landlord?.email}</Text>
              </View>
              <TouchableOpacity
                style={{ padding: 8, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 8 }}
                onPress={() => navigation.navigate('Messages', { 
                  state: { 
                    startConversation: { 
                      recipient_id: landlord?.id, 
                      property_id: property?.id 
                    } 
                  } 
                })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
           </View>
        </View>
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
      const s = String(status || '').toLowerCase();
      if (s.includes('pending')) return '#F59E0B';
      if (s.includes('confirm')) return theme.colors.primary;
      if (s.includes('paid')) return '#3B82F6';
      if (s.includes('cancel') || s.includes('reject')) return '#EF4444';
      return '#9CA3AF';
    };

    return (
      <View style={styles.content}>
        {historyData.map((booking) => (
          <TouchableOpacity 
            key={booking.id} 
            style={[styles.bookingCard, styles.historyItemCard]}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.property?.id || booking.property_id })}
          >
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                 <Image source={getImageUrl(booking.property?.image || booking.property_image)} style={styles.historyItemImage} />
                 <View style={styles.historyItemContent}>
                    <Text style={[styles.bookingName, styles.historyItemName, { color: theme.colors.text }]}>
                      {booking.property?.title || booking.property_title || 'Past Stay'}
                    </Text>
                    <Text style={[styles.historyItemDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(booking.period?.startDate || booking.start_date)} - {formatDate(booking.period?.endDate || booking.end_date)}
                    </Text>
                    <View style={[styles.statusBadge, styles.historyItemBadge, { backgroundColor: `${getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status), fontSize: 10 }]}>
                        {booking.isOverdue || booking.is_overdue ? 'Overdue' : booking.status}
                      </Text>
                    </View>
                 </View>
                 <View style={styles.historyItemRight}>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', fontWeight: 'bold' }}>Total Paid</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 }}>
                      {formatCurrency(booking.financials?.totalPaid || booking.amount)}
                    </Text>
                 </View>
              </View>

              {/* Review Button for History */}
              {['completed', 'confirmed'].includes(booking.status?.toLowerCase()) && !booking.has_review && !booking.hasReview && (
                <TouchableOpacity 
                  style={[styles.reviewBtn, { backgroundColor: theme.colors.primary, marginTop: 0, marginBottom: 16, width: '100%' }]}
                  onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id, propertyId: booking.property?.id || booking.property_id })}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Leave a Review</Text>
                </TouchableOpacity>
              )}

              {/* Activity Timeline */}
              {booking.activityLog && booking.activityLog.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textTertiary, textTransform: 'uppercase', marginBottom: 16 }}>Activity Timeline</Text>
                  <View style={{ paddingLeft: 8 }}>
                    {(booking.activityLog || []).map((activity, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginBottom: 16, position: 'relative' }}>
                        {idx < (booking.activityLog.length - 1) && (
                          <View style={{ position: 'absolute', left: 8, top: 16, bottom: -12, width: 1, backgroundColor: theme.colors.border }} />
                        )}
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: getTimelineColor(activity.status), marginTop: 8, marginRight: 16, zIndex: 1, borderWidth: 2, borderColor: theme.colors.surface }} />
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
              )}
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
            {activeTab === 'history' && renderHistory()}
          </ScrollView>
        </View>
      )}
    </View>
  );
}