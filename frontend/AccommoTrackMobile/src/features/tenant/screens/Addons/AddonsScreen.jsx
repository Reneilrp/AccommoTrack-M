import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    TextInput, 
    Alert,
    Image,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { showSuccess, showError } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/AddonsStyles.js';
import Header from '../../components/Header.jsx';

export default function AddonsScreen({ hideHeader = false }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { bookingId = null, propertyId = null } = route.params || {};

  const [addons, setAddons] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [notes, setNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [noBooking, setNoBooking] = useState(false);
  
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customData, setCustomData] = useState({
    name: '',
    addon_type: 'rental',
    price_type: 'monthly',
    note: '',
    suggested_price: ''
  });

  useEffect(() => {
    loadAddons();
  }, []);

  const normalizeNote = (value) => {
    const trimmed = String(value || '').trim();
    return trimmed || null;
  };

  const normalizeSuggestedPrice = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue < 0) return null;

    return numericValue;
  };

  const loadAddons = async () => {
    setLoading(true);
    try {
      const [res, reqRes] = await Promise.all([
        tenantService.getAvailableAddons(),
        tenantService.getAddonRequests()
      ]);
      
      if (res.success && res.data) {
        const addonList = res.data.available || res.data;
        setAddons(addonList);
        const initial = {};
        (addonList || []).forEach(a => { initial[a.id] = 1; });
        setQtys(initial);
      } else if (res.status === 404) {
        setNoBooking(true);
      } else {
        showError('Error', res.error || 'Failed to load available addons');
      }

      if (reqRes && reqRes.success && reqRes.data) {
        const pending = reqRes.data.pending || [];
        const active = reqRes.data.active || [];
        setRequests([...pending, ...active]);
      }
    } catch (err) {
      console.error('Load addons error', err);
    } finally {
      setLoading(false);
    }
  };

  const onRequest = async (addon, isCustom = false) => {
    const normalizedSuggestedPrice = normalizeSuggestedPrice(customData.suggested_price);

    const payload = isCustom
      ? {
          is_custom: true,
          name: customData.name.trim(),
          addon_type: customData.addon_type,
          price_type: customData.price_type,
          quantity: 1,
          note: normalizeNote(customData.note),
          booking_id: bookingId,
          ...(normalizedSuggestedPrice !== null
            ? { suggested_price: normalizedSuggestedPrice }
            : {}),
        }
      : {
          addon_id: addon.id,
          quantity: qtys[addon.id] || 1,
          note: normalizeNote(notes[addon.id]),
          booking_id: bookingId,
        };

    setSubmittingId(isCustom ? 'custom' : addon.id);
    try {
      const res = await tenantService.requestAddon(payload);
      if (res.success) {
        showSuccess('Add-on request submitted');
        setShowCustomForm(false);
        setCustomData({ name: '', addon_type: 'rental', price_type: 'monthly', note: '', suggested_price: '' });
        await loadAddons();
      } else {
        showError('Error', res.error || 'Failed to request addon');
      }
    } catch (err) {
      showError('Error', 'Failed to request addon');
    } finally {
      setSubmittingId(null);
    }
  };

  const onCancelRequest = (req) => {
    const id = req.id || req.request_id;
    if (!id) return;

    Alert.alert('Cancel Request', 'Are you sure you want to cancel this add-on request?', [
        { text: 'No', style: 'cancel' },
        { 
            text: 'Yes, Cancel', 
            style: 'destructive',
            onPress: async () => {
                setCancelingId(id);
                try {
                    const res = await tenantService.cancelAddonRequest(id);
                    if (res.success) {
                        showSuccess('Request cancelled');
                        await loadAddons();
                    } else {
                        showError('Error', res.error || 'Failed to cancel');
                    }
                } catch (err) {
                    showError('Error', 'Failed to cancel');
                } finally {
                    setCancelingId(null);
                }
            }
        }
    ]);
  };

  if (loading && addons.length === 0) return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  if (noBooking) {
    const noBookingContent = (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingHorizontal: 32 }]}>
        <Ionicons name="calendar-outline" size={72} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text, textAlign: 'center', marginTop: 16 }]}>
          No Active Booking
        </Text>
        <Text style={[styles.emptySub, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          You need an active booking to request add-ons. Book a room first and come back here to enhance your stay.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Explore')}
          style={[styles.requestActionBtn, { backgroundColor: theme.colors.primary, marginTop: 24, paddingHorizontal: 28 }]}
        >
          <Text style={styles.requestActionText}>Browse Properties</Text>
        </TouchableOpacity>
      </View>
    );
    if (hideHeader) return noBookingContent;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <Header title="Add-ons & Usage Fees" onBack={() => navigation.goBack()} showProfile={false} />
        {noBookingContent}
      </View>
    );
  }

  const content = (
    <View style={{ flex: 1 }}>
      <FlatList
        data={addons}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListHeaderComponent={() => (
            <>
                {requests.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Requests</Text>
                        {requests.map(r => (
                            <View key={r.id} style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}>
                                <View style={styles.requestHeader}>
                                    <Text style={[styles.requestName, { color: theme.colors.text }]}>{r.addon?.name || 'Add-on'}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Text style={[styles.statusText, { color: theme.colors.primary }]}>{(r.status || 'pending').toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.requestSub, { color: theme.colors.textSecondary }]}>
                                    Quantity: {r.quantity || 1} • {r.addon?.price ? `₱${Number(r.addon.price).toLocaleString()}` : 'Free'}
                                </Text>
                                {r.status === 'pending' && (
                                    <TouchableOpacity 
                                        onPress={() => onCancelRequest(r)}
                                        disabled={cancelingId === r.id}
                                        style={styles.cancelBtn}
                                    >
                                        {cancelingId === r.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.cancelBtnText}>Cancel</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Available for You</Text>
                    
                    {!showCustomForm ? (
                        <TouchableOpacity 
                            onPress={() => setShowCustomForm(true)}
                            style={styles.customRequestBtn}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={theme.colors.textSecondary} />
                            <Text style={styles.customRequestText}>Request something else...</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.customForm}>
                            <Text style={styles.formLabel}>What do you need?</Text>
                            <TextInput 
                                placeholder="Item name (e.g. Desk Lamp)"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={customData.name}
                                onChangeText={t => setCustomData({...customData, name: t})}
                                style={styles.formInput}
                            />

                            <View style={styles.pickerRow}>
                                <View style={styles.pickerContainer}>
                                    <Text style={styles.formLabel}>Type</Text>
                                    <TouchableOpacity 
                                        onPress={() => setCustomData({...customData, addon_type: customData.addon_type === 'rental' ? 'fee' : 'rental'})}
                                        style={[styles.pickerBtn, customData.addon_type === 'rental' && styles.pickerBtnActive]}
                                    >
                                        <Text style={styles.pickerBtnText}>{customData.addon_type === 'rental' ? 'Rental' : 'Usage Fee'}</Text>
                                        <Ionicons name="swap-horizontal" size={16} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.pickerContainer}>
                                    <Text style={styles.formLabel}>Billing</Text>
                                    <TouchableOpacity 
                                        onPress={() => setCustomData({...customData, price_type: customData.price_type === 'monthly' ? 'one_time' : 'monthly'})}
                                        style={[styles.pickerBtn, customData.price_type === 'monthly' && styles.pickerBtnActive]}
                                    >
                                        <Text style={styles.pickerBtnText}>{customData.price_type === 'monthly' ? 'Monthly' : 'One-time'}</Text>
                                        <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Suggested Price (Optional)</Text>
                            <TextInput
                              placeholder="Suggested price (optional)"
                              placeholderTextColor={theme.colors.textTertiary}
                              keyboardType="decimal-pad"
                              value={customData.suggested_price}
                              onChangeText={t => setCustomData({ ...customData, suggested_price: t.replace(/[^0-9.]/g, '') })}
                              style={styles.formInput}
                            />

                            <Text style={styles.formLabel}>Notes for Landlord</Text>
                            <TextInput 
                                placeholder="Add any details..."
                                placeholderTextColor={theme.colors.textTertiary}
                                multiline
                                numberOfLines={3}
                                value={customData.note}
                                onChangeText={t => setCustomData({...customData, note: t})}
                                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                            />

                            <View style={styles.formFooter}>
                                <TouchableOpacity 
                                    onPress={() => setShowCustomForm(false)}
                                    style={styles.cancelFormBtn}
                                >
                                    <Text style={[styles.requestActionText, { color: theme.colors.textSecondary }]}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => onRequest(null, true)}
                                    disabled={!customData.name || submittingId === 'custom'}
                                    style={[styles.submitFormBtn, (!customData.name || submittingId === 'custom') && { opacity: 0.5 }]}
                                >
                                    {submittingId === 'custom' ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.requestActionText}>Submit Request</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </>
        )}
        renderItem={({ item }) => (
          <View style={[styles.addonCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.addonInfo}>
                <View style={styles.addonTextContent}>
                    <Text style={[styles.addonName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.addonDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.description || 'No description available.'}</Text>
                    <Text style={[styles.addonPrice, { color: theme.colors.primary }]}>{item.price ? `₱${Number(item.price).toLocaleString()}` : 'Free'}</Text>
                </View>
                {item.image_url && <Image source={{ uri: item.image_url }} style={styles.addonImage} />}
            </View>

            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

            <View style={styles.addonFooter}>
                <View style={styles.qtyContainer}>
                    <TouchableOpacity 
                        onPress={() => setQtys(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))} 
                        style={[styles.qtyBtn, { backgroundColor: theme.colors.background }]}
                    >
                        <Ionicons name="remove" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: theme.colors.text }]}>{qtys[item.id] || 1}</Text>
                    <TouchableOpacity 
                        onPress={() => setQtys(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))} 
                        style={[styles.qtyBtn, { backgroundColor: theme.colors.background }]}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    onPress={() => onRequest(item)} 
                    disabled={submittingId === item.id} 
                    style={[styles.requestActionBtn, { backgroundColor: theme.colors.primary }]}
                >
                    {submittingId === item.id ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.requestActionText}>Request</Text>
                    )}
                </TouchableOpacity>
            </View>
            
            <TextInput 
                placeholder="Add a note (optional)..." 
                placeholderTextColor={theme.colors.textTertiary}
                value={notes[item.id] || ''} 
                onChangeText={(t) => setNotes(prev => ({ ...prev, [item.id]: t }))} 
                style={[styles.noteInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1 }]} 
            />
          </View>
        )}
        ListEmptyComponent={() => (
            <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>No Add-ons available for this property</Text>
                <Text style={[styles.emptySub, { color: theme.colors.textTertiary, textAlign: 'center' }]}>Check back later or contact your landlord for available usage fees.</Text>
            </View>
        )}
      />
    </View>
  );

  if (hideHeader) return content;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <Header 
        title="Add-ons & Usage Fees"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />
      {content}
    </View>
  );
}
