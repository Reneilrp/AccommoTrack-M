import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Landlord/Reviews.js';
import ReviewService from '../../../../services/ReviewService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_REVIEWS = [];

export default function Reviews() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyVisible, setReplyVisible] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reviewsQuery = useQuery({
    queryKey: landlordQueryKeys.reviews(),
    queryFn: async () => {
      const response = await ReviewService.getLandlordReviews();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch reviews');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_REVIEWS;
    },
    placeholderData: (previousData) => previousData,
  });

  const reviews = reviewsQuery.data || EMPTY_REVIEWS;
  const loading = reviewsQuery.isPending && reviews.length === 0;
  const errorMessage = reviewsQuery.error?.message || '';
  const refetchReviews = reviewsQuery.refetch;
  const reviewRefetchers = useMemo(() => [refetchReviews], [refetchReviews]);

  useLandlordFocusRefetch({ refetchers: reviewRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: reviewRefetchers,
  });

  const handleReply = async () => {
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    setSubmitting(true);
    const res = await ReviewService.respondToReview(selectedReview.id, responseText);
    setSubmitting(false);

    if (res.success) {
      Alert.alert('Success', 'Response submitted successfully');
      await refetchLandlordQueries(reviewRefetchers);
      setReplyVisible(false);
      setResponseText('');
      setSelectedReview(null);
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color="#F59E0B"
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.reviewer_name ? item.reviewer_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{item.reviewer_name || 'Anonymous'}</Text>
            <Text style={[styles.userDate, { color: theme.colors.textSecondary }]}>{item.time_ago}</Text>
          </View>
        </View>
        {renderStars(item.rating)}
      </View>

      <Text style={[styles.propertyName, { color: theme.colors.primary }]}>
        {item.property_title}
      </Text>

      <Text style={[styles.comment, { color: theme.colors.text }]}>
        "{item.comment}"
      </Text>

      {item.landlord_response ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Your Response:</Text>
          <Text style={[styles.responseText, { color: theme.colors.textSecondary }]}>{item.landlord_response}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.replyButton, { borderColor: theme.colors.primary }]}
          onPress={() => {
            setSelectedReview(item);
            setReplyVisible(true);
          }}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.replyButtonText, { color: theme.colors.primary }]}>Reply</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guest Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            errorMessage ? (
              <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '600' }}>{errorMessage}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No reviews yet</Text>
            </View>
          }
        />
      )}

      {/* Reply Modal */}
      <Modal
        visible={replyVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReplyVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Reply to Review</Text>
              <TouchableOpacity onPress={() => setReplyVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.reviewSnippet, { color: theme.colors.textSecondary }]}>
              "{selectedReview?.comment}"
            </Text>

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Write your response..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              value={responseText}
              onChangeText={setResponseText}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleReply}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Response</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
