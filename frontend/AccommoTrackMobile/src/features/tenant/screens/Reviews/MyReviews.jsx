import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import tenantService from '../../../../services/TenantService.js';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../../styles/Tenant/ReviewStyles.js';
import { tenantQueryKeys, useTenantFocusRefetch } from '../../hooks/useTenantQueryHelpers.js';

export default function MyReviews({ hideHeader = false, historyOnly = false }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const myReviewsQuery = useQuery({
    queryKey: tenantQueryKeys.myReviews(),
    queryFn: async () => {
      const res = await tenantService.getTenantReviews();
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to load your reviews');
      }

      const data = Array.isArray(res.data) ? res.data : res.data?.reviews || [];
      return Array.isArray(data) ? data : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const reviews = myReviewsQuery.data || [];
  const loading = myReviewsQuery.isLoading;
  const refetchMyReviews = myReviewsQuery.refetch;
  const myReviewsRefetchers = React.useMemo(
    () => [refetchMyReviews],
    [refetchMyReviews],
  );

  useTenantFocusRefetch({ refetchers: myReviewsRefetchers });

  useEffect(() => {
    if (!myReviewsQuery.error) return;
    showAlert('Error', myReviewsQuery.error.message || 'Failed to load your reviews');
  }, [myReviewsQuery.error]);

  const confirmDelete = (id) => {
    showAlert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
    ]);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await tenantService.deleteReview(id);
      if (res.success) {
        showAlert('Deleted', 'Review deleted');
        queryClient.setQueryData(tenantQueryKeys.myReviews(), (prev) => {
          if (!Array.isArray(prev)) return [];
          return prev.filter((review) => review.id !== id);
        });
      } else {
        showAlert('Error', res.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Delete review error', err);
      showAlert('Error', 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.propertyName, { color: theme.colors.text }]}>
            {item.property_title || 'Property'}
            {item.room_number ? ` (Room ${item.room_number})` : ''}
          </Text>
          {item.property_location ? <Text style={[styles.propertyLocation, { color: theme.colors.textSecondary }]}>{item.property_location}</Text> : null}
        </View>
        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingText, { color: theme.colors.text }]}>{item.rating} ★</Text>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{item.time_ago || ''}</Text>
        </View>
      </View>
      {item.comment ? <Text style={[styles.commentText, { color: theme.colors.text }]}>{item.comment}</Text> : null}

      {item.landlord_response ? (
        <View style={[styles.landlordResponseBox, { backgroundColor: theme.colors.info + '15', borderLeftColor: theme.colors.info }]}>
          <View style={styles.landlordResponseHeader}>
            <Ionicons name="chatbubble-ellipses" size={14} color={theme.colors.info} />
            <Text style={[styles.landlordResponseLabel, { color: theme.colors.info }]}>Landlord Response</Text>
          </View>
          <Text style={[styles.landlordResponseText, { color: theme.colors.text }]}>{item.landlord_response}</Text>
        </View>
      ) : null}

      {!historyOnly && (
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
      )}
    </View>
  );

  if (loading) {
    const loadingView = (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );

    if (hideHeader) return loadingView;

    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const content = (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!hideHeader && <Text style={[styles.title, { color: theme.colors.text }]}>My Reviews</Text>}
      <FlatList 
        data={reviews} 
        keyExtractor={(i) => String(i.id)} 
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="chatbubble-outline" size={48} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No reviews yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Leave a review for a property you've stayed at!
            </Text>
          </View>
        )}
      />
    </View>
  );

  if (hideHeader) return content;

  return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>{content}</SafeAreaView>;
}
