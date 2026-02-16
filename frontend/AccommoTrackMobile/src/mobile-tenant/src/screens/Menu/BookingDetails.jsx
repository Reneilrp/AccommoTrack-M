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
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import BookingService from '../../../../services/BookingServices.js';
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BASE_URL as API_BASE_URL } from '../../../../config';
import { showSuccess, showError } from '../../../../utils/toast';
import { styles } from '../../../../styles/Tenant/BookingDetailsStyles';
import Header from '../../components/Header.jsx';

const { width: screenWidth } = Dimensions.get('window');

export default function BookingDetails() {
    const route = useRoute();
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { bookingId } = route.params || {};

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelingAddonId, setCancelingAddonId] = useState(null);

    const fetchBooking = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await BookingService.getBookingDetails(bookingId);
            if (res.success && res.data) {
                setBooking(res.data);
            } else {
                showError('Error', res.error || 'Failed to load booking details');
            }
        } catch (err) {
            console.error('Failed to load booking details', err);
            showError('Error', 'Failed to load booking details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (bookingId) fetchBooking();
    }, [bookingId]);

    useFocusEffect(
        React.useCallback(() => {
            if (bookingId) fetchBooking(true);
        }, [bookingId])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBooking(true);
    };

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
        if (s === 'confirmed' || s === 'completed' || s === 'paid') return { color: '#10B981', bg: '#DCFCE7' };
        if (s === 'pending') return { color: '#F59E0B', bg: '#FEF3C7' };
        if (s === 'cancelled' || s === 'canceled' || s === 'failed' || s === 'unpaid') return { color: '#EF4444', bg: '#FEE2E2' };
        return { color: '#6B7280', bg: '#F3F4F6' };
    };

    const statusStyle = getStatusStyles(booking.status);
    const paymentStyle = getStatusStyles(booking.paymentStatus);

    const handleCancelAddon = (addon) => {
        const reqId = addon?.pivot?.id || addon?.request_id || addon?.id;
        if (!reqId) return;

        Alert.alert('Cancel Add-on', 'Are you sure you want to cancel this add-on request?', [
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
                            fetchBooking(true);
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
        Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking? This action might be subject to terms and conditions.', [
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
                            fetchBooking(true);
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

    const InfoRow = ({ icon, label, value, color }) => (
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

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            
            <Header 
                title={booking?.property?.title || "Booking Details"}
                onBack={() => navigation.goBack()}
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView 
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
            >
                {/* Hero Image Section */}
                <View style={styles.heroSection}>
                    <Image source={imageUri} style={styles.heroImage} />
                    <View style={styles.heroGradient} />
                    <View style={styles.heroContent}>
                        <View style={[styles.heroBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.heroBadgeText, { color: statusStyle.color }]}>{booking.status?.toUpperCase()}</Text>
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
                            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>CHECK-IN</Text>
                            <Text style={[styles.dateValue, { color: theme.colors.text }]}>{checkIn}</Text>
                        </View>
                        <View style={styles.dateDivider}>
                            <Ionicons name="moon" size={20} color={theme.colors.primary} />
                            <View style={[styles.durationLine, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>{booking.duration || 'N/A'}</Text>
                        </View>
                        <View style={styles.dateBlock}>
                            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>CHECK-OUT</Text>
                            <Text style={[styles.dateValue, { color: theme.colors.text }]}>{checkOut}</Text>
                        </View>
                    </View>

                    {/* Accommodation Details */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Accommodation</Text>
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
                        <InfoRow icon="bed-outline" label="Room Number" value={booking.roomNumber || 'Not assigned'} />
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <InfoRow icon="business-outline" label="Property Type" value={property.property_type || 'N/A'} />
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <InfoRow icon="person-outline" label="Landlord" value={landlord.first_name ? `${landlord.first_name} ${landlord.last_name}` : 'N/A'} />
                    </View>

                    {/* Payment Summary */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Summary</Text>
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: theme.colors.text }]}>Monthly Rent</Text>
                            <Text style={[styles.paymentValue, { color: theme.colors.text }]}>₱{(booking.monthlyRent || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: theme.colors.text }]}>Total Amount</Text>
                            <Text style={[styles.paymentValue, { color: theme.colors.text, fontWeight: '700' }]}>₱{(booking.amount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        <View style={styles.paymentStatusRow}>
                            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Payment Status</Text>
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
                    {(booking.status === 'pending' || booking.status === 'confirmed') ? (
                        <TouchableOpacity 
                            onPress={handleCancelBooking}
                            disabled={isCanceling}
                            style={[styles.actionBtn, styles.outlineBtn, { borderColor: '#EF4444' }]}
                        >
                            {isCanceling ? <ActivityIndicator color="#EF4444" /> : <Text style={styles.cancelBookingText}>Cancel Booking</Text>}
                        </TouchableOpacity>
                    ) : null}
                    
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Messages', {
                            startConversation: true,
                            recipient: landlord,
                            property: { id: property.id, title: property.title }
                        })}
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary, flex: 1.5 }]}
                    >
                        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Contact Landlord</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={[styles.actionRow, { marginTop: 10 }]}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('CreateMaintenanceRequest', { bookingId: booking.id, propertyId: property.id })}
                        style={[styles.secondaryActionBtn, { backgroundColor: theme.colors.primary + '10' }]}
                    >
                        <Ionicons name="build-outline" size={18} color={theme.colors.primary} />
                        <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>Maintenance</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Addons', { bookingId: booking.id, propertyId: property.id })}
                        style={[styles.secondaryActionBtn, { backgroundColor: theme.colors.primary + '10' }]}
                    >
                        <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                        <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>Add-ons</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}