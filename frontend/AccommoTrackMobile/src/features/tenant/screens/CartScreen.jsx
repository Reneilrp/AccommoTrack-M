import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  DeviceEventEmitter,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import CartService from '../../../services/CartService.js';
import { BASE_URL as API_BASE_URL } from '../../../config/index.js';
import { showError } from '../../../utils/toast.js';

export default function CartScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchCart = useCallback(async () => {
    const result = await CartService.getCart();
    if (result.success) {
      setCart(result.data);
    } else {
      showError('Error', result.error || 'Failed to load book');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart();
    setRefreshing(false);
  };

  const handleRemoveItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Remove this room from your book?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingItemId(itemId);
            const result = await CartService.removeFromCart(itemId);
            if (result.success) {
              DeviceEventEmitter.emit('accommo:cart-updated');
              await fetchCart();
            } else {
              showError('Error', result.error || 'Failed to remove item');
            }
            setRemovingItemId(null);
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Book',
      'Remove all items from your book?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const result = await CartService.clearCart();
            if (result.success) {
              DeviceEventEmitter.emit('accommo:cart-updated');
              setCart(null);
            } else {
              showError('Error', result.error || 'Failed to clear book');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = async () => {
    if (!cart?.id) return;

    setCheckingOut(true);
    const result = await CartService.checkout(cart.id);

    if (result.success) {
      DeviceEventEmitter.emit('accommo:cart-updated');
      
      const resInvoice = result.data?.reservation_invoice;
      const checkoutUrl = resInvoice?.checkout_url;

      if (checkoutUrl) {
        Alert.alert(
          'Bookings Created',
          'Your bookings have been created. Proceed to payment to confirm your reservations?',
          [
            { 
              text: 'Pay Now', 
              onPress: async () => {
                await Linking.openURL(checkoutUrl);
                navigation.navigate('MyBookings');
              }
            },
            {
              text: 'Later',
              onPress: () => navigation.navigate('MyBookings')
            }
          ]
        );
      } else {
        Alert.alert(
          'Success',
          'Your bookings have been created successfully!',
          [{ text: 'View Bookings', onPress: () => navigation.navigate('MyBookings') }]
        );
      }
      setCart(null);
    } else {
      showError('Checkout Failed', result.error || 'Failed to complete checkout');
    }
    setCheckingOut(false);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return { uri: 'https://via.placeholder.com/400x200?text=No+Image' };
    if (typeof imagePath === 'string' && imagePath.startsWith('http')) return { uri: imagePath };
    const cleanPath = typeof imagePath === 'string' ? imagePath.replace(/^\/?(storage\/)?/, '') : '';
    return { uri: `${API_BASE_URL}/storage/${cleanPath}` };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTotalPrice = () => {
    return cart?.items?.reduce((sum, item) => {
      const roomTotal = parseFloat(item.price_snapshot || 0);
      const addonsTotal = (item.addons_details || []).reduce((aSum, a) => aSum + parseFloat(a.price || 0), 0);
      return sum + roomTotal + addonsTotal;
    }, 0) || 0;
  };

  const getTotalBeds = () => {
    return cart?.items?.reduce((sum, item) => sum + (item.bed_count || 0), 0) || 0;
  };

  const isExpired = () => {
    if (!cart?.expires_at) return false;
    return new Date(cart.expires_at) < new Date();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.textSecondary }}>Loading bookings...</Text>
      </View>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text }}>Add to Book</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cart-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 }}>
            Your book is empty
          </Text>
          <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Browse properties and add rooms to your book to book multiple rooms at once.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              backgroundColor: theme.colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('TenantHome')}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Browse Properties</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text }}>
            Add to Book ({cart.items.length})
          </Text>
          {cart.items.length > 0 && (
            <TouchableOpacity onPress={handleClearCart}>
              <Text style={{ color: theme.colors.error, fontSize: 14, fontWeight: '600' }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        {isExpired() && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: theme.colors.error + '20', borderRadius: 6 }}>
            <Text style={{ color: theme.colors.error, fontSize: 12 }}>⚠️ Selection expired. Please refresh.</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Cart Items */}
        <View style={{ padding: 16, gap: 12 }}>
          {cart.items.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
              }}
            >
              <Image
                source={getImageUrl(
                  item.room?.property?.image || 
                  item.room?.property?.image_url || 
                  (item.room?.images && item.room.images.length > 0 ? item.room.images[0] : null)
                )}
                style={{ width: '100%', height: 150 }}
                resizeMode="cover"
              />
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                  {item.room?.property?.title || 'Property'}
                </Text>
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 }}>
                  Room {item.room?.room_number || 'N/A'}
                </Text>

                <View style={{ marginTop: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Beds</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                      {item.bed_numbers 
                        ? item.bed_numbers.split(',').map(n => `Bed ${n}`).join(', ') 
                        : item.bed_count}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Check-in</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                      {formatDate(item.start_date)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Check-out</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                      {formatDate(item.end_date)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Room Price</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                      {formatCurrency(item.price_snapshot)}
                    </Text>
                  </View>

                  {item.addons_details && item.addons_details.length > 0 && (
                    <View style={{ marginTop: 4, padding: 8, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>
                        ADDONS
                      </Text>
                      {item.addons_details.map((addon) => (
                        <View key={addon.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>• {addon.name}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.text }}>
                            {formatCurrency(addon.price)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>Item Total</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.primary }}>
                      {formatCurrency(
                        parseFloat(item.price_snapshot || 0) + 
                        (item.addons_details || []).reduce((sum, a) => sum + parseFloat(a.price || 0), 0)
                      )}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: removingItemId === item.id ? theme.colors.textTertiary : theme.colors.error,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => handleRemoveItem(item.id)}
                  disabled={removingItemId === item.id}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    {removingItemId === item.id ? 'Removing...' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Checkout Footer */}
      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ marginBottom: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>Total Beds</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{getTotalBeds()}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Total Price</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.primary }}>
              {formatCurrency(getTotalPrice())}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: checkingOut || isExpired() ? theme.colors.textTertiary : theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleCheckout}
          disabled={checkingOut || isExpired()}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
