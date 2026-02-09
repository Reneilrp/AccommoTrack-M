import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function AddonsScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingId = null, propertyId = null } = route.params || {};

  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [notes, setNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    setLoading(true);
    try {
      const res = await tenantService.getAvailableAddons();
      if (res.success && res.data) {
        setAddons(res.data);
        const initial = {};
        (res.data || []).forEach(a => { initial[a.id] = 1; });
        setQtys(initial);
      } else {
        Alert.alert('Error', res.error || 'Failed to load addons');
      }
    } catch (err) {
      console.error('Load addons error', err);
      Alert.alert('Error', 'Failed to load addons');
    } finally {
      setLoading(false);
    }
  };

  const onRequest = async (addon) => {
    const quantity = qtys[addon.id] || 1;
    const note = notes[addon.id] || null;
    setSubmittingId(addon.id);
    try {
      // Use bookingId if present (TenantService supports 4th arg bookingId)
      const res = await tenantService.requestAddon(addon.id, quantity, note, bookingId);
      if (res.success) {
        Alert.alert('Requested', 'Addon request submitted.');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Failed to request addon');
      }
    } catch (err) {
      console.error('Request addon error', err);
      Alert.alert('Error', 'Failed to request addon');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Available Addons</Text>
      <FlatList
        data={addons}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.surface, marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{item.name || item.title}</Text>
            {item.description ? <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{item.description}</Text> : null}
            <Text style={{ marginTop: 8, color: theme.colors.text }}>{item.price ? `₱${Number(item.price).toLocaleString()}` : 'Free'}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setQtys(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))} style={{ padding: 8, borderRadius: 6, backgroundColor: theme.colors.primary }}>
                <Text style={{ color: theme.colors.textInverse }}>-</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 12, color: theme.colors.text }}>{qtys[item.id] || 1}</Text>
              <TouchableOpacity onPress={() => setQtys(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))} style={{ padding: 8, borderRadius: 6, backgroundColor: theme.colors.primary }}>
                <Text style={{ color: theme.colors.textInverse }}>+</Text>
              </TouchableOpacity>
              <TextInput placeholder="Note (optional)" value={notes[item.id] || ''} onChangeText={(t) => setNotes(prev => ({ ...prev, [item.id]: t }))} style={{ flex: 1, marginLeft: 12, padding: 8, backgroundColor: theme.colors.background }} />
            </View>

            <View style={{ marginTop: 8 }}>
              <TouchableOpacity onPress={() => onRequest(item)} disabled={submittingId === item.id} style={{ padding: 10, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center' }}>
                {submittingId === item.id ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={{ color: theme.colors.textInverse }}>Request Addon</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
