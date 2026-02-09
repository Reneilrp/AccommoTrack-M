import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import tenantService from '../../../../services/TenantService';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MyReviews() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tenantService.getTenantReviews();
      if (res.success) {
        // backend returns array
        setReviews(Array.isArray(res.data) ? res.data : res.data.reviews || []);
      } else {
        Alert.alert('Error', res.error || 'Failed to load your reviews');
      }
    } catch (err) {
      console.error('Load reviews error', err);
      Alert.alert('Error', 'Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
    ]);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await tenantService.deleteReview(id);
      if (res.success) {
        Alert.alert('Deleted', 'Review deleted');
        setReviews(prev => prev.filter(r => r.id !== id));
      } else {
        Alert.alert('Error', res.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Delete review error', err);
      Alert.alert('Error', 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={{ padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>{item.property_title || 'Property'}</Text>
          {item.property_location ? <Text style={{ color: theme.colors.textSecondary }}>{item.property_location}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>{item.rating} ★</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{item.time_ago || ''}</Text>
        </View>
      </View>
      {item.comment ? <Text style={{ marginTop: 8, color: theme.colors.text }}>{item.comment}</Text> : null}

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate('LeaveReview', { reviewId: item.id, initialRating: item.rating, initialComment: item.comment, propertyId: item.property_id })} style={{ padding: 8, borderRadius: 8, backgroundColor: theme.colors.primary, marginRight: 8 }}>
          <Text style={{ color: theme.colors.textInverse }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={{ padding: 8, borderRadius: 8, backgroundColor: '#EF4444' }}>
          {deletingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Delete</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: 12, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 12 }}>My Reviews</Text>
      <FlatList data={reviews} keyExtractor={(i) => String(i.id)} renderItem={renderItem} />
    </SafeAreaView>
  );
}
