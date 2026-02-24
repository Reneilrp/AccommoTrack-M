import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import tenantService from '../../../../services/TenantService';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../../styles/Tenant/ReviewStyles';

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
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.propertyName, { color: theme.colors.text }]}>{item.property_title || 'Property'}</Text>
          {item.property_location ? <Text style={[styles.propertyLocation, { color: theme.colors.textSecondary }]}>{item.property_location}</Text> : null}
        </View>
        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingText, { color: theme.colors.text }]}>{item.rating} ★</Text>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{item.time_ago || ''}</Text>
        </View>
      </View>
      {item.comment ? <Text style={[styles.commentText, { color: theme.colors.text }]}>{item.comment}</Text> : null}

      <View style={styles.actionRow}>
        <TouchableOpacity 
            onPress={() => navigation.navigate('LeaveReview', { 
                reviewId: item.id, 
                initialRating: item.rating, 
                initialComment: item.comment, 
                propertyId: item.property_id 
            })} 
            style={[styles.editBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.btnText, { color: theme.colors.textInverse }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
          {deletingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>My Reviews</Text>
      <FlatList data={reviews} keyExtractor={(i) => String(i.id)} renderItem={renderItem} />
    </SafeAreaView>
  );
}
