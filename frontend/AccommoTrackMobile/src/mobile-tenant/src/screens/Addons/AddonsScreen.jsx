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

import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { showSuccess, showError } from '../../../../utils/toast';
import { styles } from '../../../../styles/Tenant/AddonsStyles';
import Header from '../../components/Header.jsx';

export default function AddonsScreen({ hideHeader = false }) {
  const { theme } = useTheme();
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

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    setLoading(true);
    try {
      const res = await tenantService.getAvailableAddons();
      const reqRes = await tenantService.getAddonRequests();
      
      if (res.success && res.data) {
        setAddons(res.data);
        const initial = {};
        (res.data || []).forEach(a => { initial[a.id] = 1; });
        setQtys(initial);
      }

      if (reqRes && reqRes.success && reqRes.data) {
        setRequests(reqRes.data);
      }
    } catch (err) {
      console.error('Load addons error', err);
      showError('Error', 'Failed to load addons');
    } finally {
      setLoading(false);
    }
  };

  const onRequest = async (addon) => {
    const quantity = qtys[addon.id] || 1;
    const note = notes[addon.id] || null;
    setSubmittingId(addon.id);
    try {
      const res = await tenantService.requestAddon(addon.id, quantity, note, bookingId);
      if (res.success) {
        showSuccess('Add-on request submitted');
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
                {addons.length > 0 && <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>Available for You</Text>}
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
                <Text style={[styles.emptySub, { color: theme.colors.textTertiary, textAlign: 'center' }]}>Check back later or contact your landlord for available services.</Text>
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
        title="Add-ons & Services"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />
      {content}
    </View>
  );
}
