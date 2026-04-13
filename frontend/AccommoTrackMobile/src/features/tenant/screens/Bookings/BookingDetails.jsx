import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    Image, 
    ActivityIndicator, 
    ScrollView, 
    TouchableOpacity, 
    Alert, 
    RefreshControl,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import BookingService from '../../../../services/BookingService.js';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import { showSuccess, showError } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/BookingDetailsStyles.js';
import Header from '../../components/Header.jsx';
import {
    tenantQueryKeys,
    useTenantFocusRefetch,
    useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

const InfoRow = ({ icon, label, value, color, theme, styles }) => (
    <View style={styles.infoRow}>
        <View style={[styles.iconCircle, { backgroundColor: (color || theme.colors.primary) + '15' }]}>
            <Ionicons name={icon} size={18} color={color || theme.colors.primary} />
        </View>
        <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
        </View>
    </View>
);

const RoomDetails = ({ room, theme, styles }) => {
    return (
        <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Room</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, padding: 0 }]}>
                {room.images && room.images.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomImageScroll}>
                        {room.images.map(image => (
                            <Image
                                key={image.id}
                                source={{ uri: `${API_BASE_URL}/storage/${image.image_url.replace(/^\/?(storage\/)?/, '')}` }}
                                style={styles.roomImage}
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.noImagesBox}>
                        <Ionicons name="image-outline" size={40} color={theme.colors.textTertiary} />
                        <Text style={styles.noImagesText}>No room images</Text>
                    </View>
                )}

                <View style={styles.roomContent}>
                    <InfoRow icon="information-circle-outline" label="Room Type" value={room.room_type} theme={theme} styles={styles} />
                    <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                    <InfoRow icon="people-outline" label="Capacity" value={`${room.capacity} person(s)`} theme={theme} styles={styles} />
                    <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>{room.description || 'No description available.'}</Text>

                    {room.amenities && room.amenities.length > 0 && (
                        <>
                            <View style={[styles.separator, { backgroundColor: theme.colors.border, marginVertical: 15 }]} />
                            <Text style={styles.descriptionLabel}>Amenities</Text>
                            <View style={styles.amenitiesList}>
                                {room.amenities.map(amenity => (
                                    <View key={amenity.id} style={styles.amenityRow}>
                                        <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
                                        <Text style={styles.amenityName}>{amenity.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            </View>
        </>
    );
};

export default function BookingDetails() {
    const route = useRoute();
    const navigation = useNavigation();
    const { width: viewportWidth } = useWindowDimensions();
    const { theme } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, viewportWidth), [theme, viewportWidth]);
    const showAlert = Alert.alert;
    const insets = useSafeAreaInsets();
    const { bookingId } = route.params || {};

    const [refreshing, setRefreshing] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelingAddonId, setCancelingAddonId] = useState(null);

    const bookingDetailsQuery = useQuery({
        queryKey: tenantQueryKeys.bookingDetails(bookingId),
        enabled: Boolean(bookingId),
        queryFn: async () => {
            const res = await BookingService.getBookingDetails(bookingId);
            if (res?.success && res?.data) return res.data;
            throw new Error(res?.error || 'Failed to load booking details');
        },
        placeholderData: (previousData) => previousData,
    });

    const booking = bookingDetailsQuery.data || null;
    const loading = bookingDetailsQuery.isLoading;
    const refetchBookingDetails = bookingDetailsQuery.refetch;
    const bookingDetailsRefetchers = React.useMemo(
        () => [refetchBookingDetails],
        [refetchBookingDetails],
    );

    useTenantFocusRefetch({
        enabled: Boolean(bookingId),
        refetchers: bookingDetailsRefetchers,
    });

    const onRefresh = useTenantRefreshHandler({
        enabled: Boolean(bookingId),
        setRefreshing,
        refetchers: bookingDetailsRefetchers,
    });

    useEffect(() => {
        if (!bookingDetailsQuery.error) return;
        console.error('Failed to load booking details', bookingDetailsQuery.error);
        showError('Error', bookingDetailsQuery.error.message || 'Failed to load booking details');
    }, [bookingDetailsQuery.error]);

    if (loading && !booking) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={[styles.errorText, { color: theme.colors.text }]}>Booking not found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Data parsing
    const property = booking.property || {};
    const landlord = booking.landlord || {};
    
    let imageUri = { uri: 'https://via.placeholder.com/800x400?text=No+Image' };
    if (property.images && property.images.length > 0) {
        const primary = property.images.find(i => i.is_primary) || property.images[0];
        if (primary && primary.image_url) {
            const cleanPath = primary.image_url.replace(/^\/?(storage\/)?/, '');
            imageUri = { uri: `${API_BASE_URL}/storage/${cleanPath}` };
        }
    }

    const location = [property.city, property.province].filter(Boolean).join(', ') || 'Location not available';
    
    const checkIn = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const checkOut = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    const getStatusStyles = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'overdue') return { color: '#B91C1C', bg: '#FEE2E2' };
        if (s === 'confirmed' || s === 'completed' || s === 'paid') return { color: '#059669', bg: '#DCFCE7' };
        if (s === 'reserved') return { color: '#0D9488', bg: '#F0FDFA' };
        if (s === 'pending_reservation') return { color: '#EA580C', bg: '#FFF7ED' };
        if (s === 'pending') return { color: '#F59E0B', bg: '#FEF3C7' };
        if (s === 'cancelled' || s === 'canceled' || s === 'failed' || s === 'unpaid') return { color: '#EF4444', bg: '#FEE2E2' };
        return { color: '#6B7280', bg: '#F3F4F6' };
    };

    const getStatusDisplayLabel = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'pending_reservation') return 'AWAITING VERIFICATION';
        if (s === 'reserved') return 'RESERVED';
        return status?.toUpperCase();
    };

    const bookingStatus = (booking.isOverdue || booking.is_overdue) ? 'overdue' : booking.status;
    const statusStyle = getStatusStyles(bookingStatus);
    const paymentStyle = getStatusStyles(booking.paymentStatus);
    const reservationPolicy = booking.reservation_policy || null;
    const isDailyContract = String(booking.contract_mode || booking.contractMode || '').toLowerCase() === 'daily';

    const handleCancelAddon = (addon) => {
        const reqId = addon?.pivot?.id || addon?.request_id || addon?.id;
        if (!reqId) return;

        showAlert('Cancel Add-on', 'Are you sure you want to cancel this add-on request?', [
            { text: 'No', style: 'cancel' },
            { 
                text: 'Yes, Cancel', 
                style: 'destructive',
                onPress: async () => {
                    setCancelingAddonId(reqId);
                    try {
                        const res = await tenantService.cancelAddonRequest(reqId);
                        if (res.success) {
                            showSuccess('Add-on request cancelled');
                            await refetchBookingDetails();
                        } else {
                            showError('Error', res.error || 'Failed to cancel');
                        }
                    } catch (err) {
                        showError('Error', 'An error occurred');
                    } finally {
                        setCancelingAddonId(null);
                    }
                }
            }
        ]);
    };

    const handleCancelBooking = () => {
        showAlert('Cancel Booking', 'Are you sure you want to cancel this booking? This action might be subject to terms and conditions.', [
            { text: 'No', style: 'cancel' },
            { 
                text: 'Confirm Cancellation', 
                style: 'destructive',
                onPress: async () => {
                    setIsCanceling(true);
                    try {
                        const res = await BookingService.cancelBooking(booking.id);
                        if (res.success) {
                            showSuccess('Booking cancelled');
                            await refetchBookingDetails();
                        } else {
                            showError('Failed to cancel', res.error);
                        }
                    } catch (err) {
                        showError('Error', 'Failed to cancel booking');
                    } finally {
                        setIsCanceling(false);
                    }
                }
            }
        ]);
    };

    return (
        <View style={styles.fullFlex}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            
            <Header 
                title={booking?.property?.title || "Booking Details"}
                onBack={() => navigation.goBack()}
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView 
                style={styles.fullFlex}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
            >
                {/* Hero Image Section */}
                <View style={styles.heroSection}>
                    <Image source={imageUri} style={styles.heroImage} />
                    <View style={styles.heroGradient} />
                    <View style={styles.heroContent}>
                        <View style={[styles.heroBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.heroBadgeText, { color: statusStyle.color }]}>{getStatusDisplayLabel(bookingStatus)}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{property.title || 'Accommodation'}</Text>
                        <View style={styles.heroLocation}>
                            <Ionicons name="location" size={16} color="#fff" />
                            <Text style={styles.heroLocationText}>{location}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    
                    {/* Reference Card */}
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.refRow}>
                            <View>
                                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Reference Number</Text>
                                <Text style={[styles.refText, { color: theme.colors.text }]}>#{booking.bookingReference || 'N/A'}</Text>
                            </View>
                            <TouchableOpacity style={styles.copyBtn}>
                                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Check-in/Out Dates */}
                    <View style={[styles.dateCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.dateBlock}>
                            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>{isDailyContract ? 'CHECK-IN' : 'MOVE-IN'}</Text>
                            <Text style={[styles.dateValue, { color: theme.colors.text }]}>{checkIn}</Text>
                        </View>
                        <View style={styles.dateDivider}>
                            <Ionicons name="moon" size={20} color={theme.colors.primary} />
                            <View style={[styles.durationLine, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>{booking.duration || 'N/A'}</Text>
                        </View>
                        <View style={styles.dateBlock}>
                            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>{isDailyContract ? 'CHECK-OUT' : 'MOVE-OUT'}</Text>
                            <Text style={[styles.dateValue, { color: theme.colors.text }]}>{checkOut}</Text>
                        </View>
                    </View>

                    {reservationPolicy?.message && (
                        <View
                            style={[
                                styles.sectionCard,
                                {
                                    backgroundColor: reservationPolicy.fee_required
                                        ? (theme.isDark ? 'rgba(120,53,15,0.25)' : '#FFF7ED')
                                        : (theme.isDark ? 'rgba(20,83,45,0.25)' : '#ECFDF5'),
                                    borderWidth: 1,
                                    borderColor: reservationPolicy.fee_required
                                        ? (theme.isDark ? 'rgba(251,191,36,0.35)' : '#FED7AA')
                                        : (theme.isDark ? 'rgba(74,222,128,0.35)' : '#BBF7D0'),
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: reservationPolicy.fee_required
                                        ? (theme.isDark ? '#FCD34D' : '#9A3412')
                                        : (theme.isDark ? '#86EFAC' : '#166534'),
                                    marginBottom: 4,
                                }}
                            >
                                Reservation Policy
                            </Text>
                            <Text
                                style={{
                                    fontSize: 12,
                                    lineHeight: 18,
                                    color: reservationPolicy.fee_required
                                        ? (theme.isDark ? '#FCD34D' : '#7C2D12')
                                        : (theme.isDark ? '#86EFAC' : '#166534'),
                                }}
                            >
                                {reservationPolicy.message}
                            </Text>
                        </View>
                    )}

                    {booking.room && <RoomDetails room={booking.room} theme={theme} styles={styles} />}

                    {/* Reservation Info Card (GCash flow) */}
                    {(booking.status === 'pending_reservation' || booking.status === 'reserved') && (
                        <>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Reservation Status</Text>
                            <View style={[styles.sectionCard, { backgroundColor: booking.status === 'reserved' ? '#F0FDFA' : '#FFF7ED', borderWidth: 1, borderColor: booking.status === 'reserved' ? '#99F6E4' : '#FED7AA' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Ionicons
                                        name={booking.status === 'reserved' ? 'checkmark-circle' : 'hourglass-outline'}
                                        size={20}
                                        color={booking.status === 'reserved' ? '#0D9488' : '#EA580C'}
                                    />
                                    <Text style={{ fontWeight: '700', fontSize: 14, color: booking.status === 'reserved' ? '#0D9488' : '#EA580C' }}>
                                        {booking.status === 'reserved' ? `Room Reserved — Awaiting ${isDailyContract ? 'Check-in' : 'Move-in'}` : 'Receipt Under Review'}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 13, color: booking.status === 'reserved' ? '#134E4A' : '#7C2D12', lineHeight: 20 }}>
                                    {booking.status === 'reserved'
                                        ? `Your GCash payment was verified. The landlord will ${isDailyContract ? 'check you in on your check-in date' : 'check you in on your move-in date'}.`
                                        : 'Your GCash receipt was submitted and is being reviewed. You will be notified once confirmed.'}
                                </Text>
                                {booking.reference_number && (
                                    <View style={{ marginTop: 10, backgroundColor: booking.status === 'reserved' ? '#CCFBF1' : '#FFEDD5', borderRadius: 8, padding: 8 }}>
                                        <Text style={{ color: booking.status === 'reserved' ? '#0F766E' : '#9A3412', fontSize: 12, fontWeight: '600' }}>GCash Ref #: {booking.reference_number}</Text>
                                    </View>
                                )}
                                {booking.move_in_date && (
                                    <Text style={{ color: booking.status === 'reserved' ? '#0F766E' : '#9A3412', fontSize: 12, fontWeight: '600', marginTop: 8 }}>
                                        Move-in Date: {new Date(booking.move_in_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                )}
                            </View>
                        </>
                    )}

                    {/* Landlord Information */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Landlord Information</Text>
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
                        <InfoRow icon="person-outline" label="Landlord" value={landlord.first_name ? `${landlord.first_name} ${landlord.last_name}` : 'N/A'} theme={theme} styles={styles} />
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <InfoRow icon="mail-outline" label="Email" value={landlord.email || 'N/A'} theme={theme} styles={styles} />
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <InfoRow icon="call-outline" label="Phone" value={landlord.phone || 'N/A'} theme={theme} styles={styles} />
                    </View>

                    {/* Payment Summary */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Summary</Text>
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: theme.colors.text }]}>Monthly Rent</Text>
                            <Text style={[styles.paymentValue, { color: theme.colors.text }]}>₱{(booking.monthlyRent || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: theme.colors.text }]}>Payment Plan</Text>
                            <Text style={[styles.paymentValue, { color: theme.colors.text, textTransform: 'capitalize' }]}>
                                {booking.payment_plan || 'Full Payment'}
                            </Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: theme.colors.text }]}>Total Stay Amount</Text>
                            <Text style={[styles.paymentValue, { color: theme.colors.text, fontWeight: '700' }]}>₱{(booking.amount || 0).toLocaleString()}</Text>
                        </View>
                        {booking.payment_plan === 'monthly' && (
                            <Text style={[styles.infoLabel, { color: theme.colors.primary, fontSize: 11, marginTop: 8, fontStyle: 'italic' }]}>
                                * You are on a monthly payment plan. Check individual invoices in the Payments tab.
                            </Text>
                        )}
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <View style={styles.paymentStatusRow}>
                            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Overall Payment Status</Text>
                            <View style={[styles.statusPill, { backgroundColor: paymentStyle.bg }]}>
                                <Text style={[styles.statusPillText, { color: paymentStyle.color }]}>{booking.paymentStatus?.toUpperCase() || 'UNPAID'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Add-ons Section */}
                    {booking.addons && booking.addons.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Requested Add-ons</Text>
                            {booking.addons.map((addon, idx) => {
                                const aStatus = getStatusStyles(addon.pivot?.status || addon.status);
                                return (
                                    <View key={addon.id || idx} style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
                                        <View style={styles.itemHeader}>
                                            <Text style={[styles.itemName, { color: theme.colors.text }]}>{addon.name}</Text>
                                            <View style={[styles.statusPillSmall, { backgroundColor: aStatus.bg }]}>
                                                <Text style={[styles.statusPillTextSmall, { color: aStatus.color }]}>{(addon.pivot?.status || 'pending').toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.itemSub, { color: theme.colors.textSecondary }]}>Quantity: {addon.pivot?.quantity || 1}</Text>
                                        {(addon.pivot?.status === 'pending' || !addon.pivot?.status) && (
                                            <TouchableOpacity 
                                                onPress={() => handleCancelAddon(addon)}
                                                disabled={cancelingAddonId === (addon.pivot?.id || addon.id)}
                                                style={styles.itemAction}
                                            >
                                                {cancelingAddonId === (addon.pivot?.id || addon.id) ? 
                                                    <ActivityIndicator size="small" color="#EF4444" /> : 
                                                    <Text style={styles.cancelText}>Cancel Request</Text>
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </>
                    )}

                    {/* Maintenance Section */}
                    {booking.maintenance_requests && booking.maintenance_requests.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Maintenance Requests</Text>
                            {booking.maintenance_requests.map((req, idx) => {
                                const mStatus = getStatusStyles(req.status);
                                return (
                                    <View key={req.id || idx} style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
                                        <View style={styles.itemHeader}>
                                            <Text style={[styles.itemName, { color: theme.colors.text }]}>{req.title}</Text>
                                            <View style={[styles.statusPillSmall, { backgroundColor: mStatus.bg }]}>
                                                <Text style={[styles.statusPillTextSmall, { color: mStatus.color }]}>{req.status?.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.itemSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{req.description}</Text>
                                        <TouchableOpacity 
                                            onPress={() => navigation.navigate('MyMaintenanceRequests')}
                                            style={styles.itemAction}
                                        >
                                            <Text style={[styles.viewText, { color: theme.colors.primary }]}>View History</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action Footer */}
            <SafeAreaView edges={['bottom']} style={[styles.footer, {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
                paddingTop: 16
            }]}>
                <View style={styles.actionRow}>
                    {(booking.status === 'pending_reservation' || booking.status === 'reserved') ? (
                        <TouchableOpacity
                            onPress={() => {
                                showAlert(
                                    'Report an Issue',
                                    'What issue are you experiencing with this reservation?',
                                    [
                                        { text: 'Dismiss', style: 'cancel' },
                                        {
                                            text: 'Fake / Incorrect Receipt',
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    await tenantService.reportDispute(booking.id, 'Tenant reported a fake or incorrect receipt.', 'fake_receipt');
                                                    showSuccess('Report submitted. Our admin team will review it.');
                                                } catch {
                                                    showError('Error', 'Failed to submit report.');
                                                }
                                            }
                                        },
                                        {
                                            text: 'Other Problem',
                                            onPress: async () => {
                                                try {
                                                    await tenantService.reportDispute(booking.id, 'Tenant reported an issue with this reservation.', 'other');
                                                    showSuccess('Report submitted. Our admin team will review it.');
                                                } catch {
                                                    showError('Error', 'Failed to submit report.');
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                            style={[styles.secondaryActionBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }]}
                        >
                            <Ionicons name="flag-outline" size={18} color="#DC2626" />
                            <Text style={[styles.secondaryActionText, { color: '#DC2626' }]}>Report Issue</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ServiceRequests', {
                                    initialTab: 'Maintenance',
                                    bookingId: booking.id,
                                    propertyId: property.id,
                                    roomId: booking.room?.id || booking.room_id || null,
                                })}
                                style={[styles.secondaryActionBtn, { backgroundColor: theme.colors.primary + '10' }]}
                            >
                                <Ionicons name="build-outline" size={18} color={theme.colors.primary} />
                                <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>Request Maintenance</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => navigation.navigate('ServiceRequests', {
                                    initialTab: 'Add-ons',
                                    bookingId: booking.id,
                                    propertyId: property.id,
                                })}
                                style={[styles.secondaryActionBtn, { backgroundColor: theme.colors.primary + '10' }]}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                                <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>Request Addon</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Messages', {
                        startConversation: true,
                        recipient: landlord,
                        property: { id: property.id, title: property.title }
                    })}
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary, flex: 1, marginTop: 8 }]}
                >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Contact Landlord</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}