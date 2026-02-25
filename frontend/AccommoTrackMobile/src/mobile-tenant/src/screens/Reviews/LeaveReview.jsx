import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext';
import tenantService from '../../../../services/TenantService';
import { getStyles } from '../../../../styles/Tenant/ReviewStyles';

export default function LeaveReview() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { bookingId = null, propertyId = null, reviewId = null, initialRating = 5, initialComment = '' } = route.params || {};

  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);

  const stars = [1,2,3,4,5];

  const submit = async () => {
    if (!propertyId) {
      Alert.alert('Missing data', 'Property information is missing.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        property_id: propertyId,
        booking_id: bookingId,
        rating,
        comment
      };
      let res;
      if (reviewId) {
        res = await tenantService.updateReview(reviewId, payload);
      } else {
        res = await tenantService.submitReview(payload);
      }
      if (res.success) {
        Alert.alert('Thanks!', reviewId ? 'Your review has been updated.' : 'Your review has been submitted.');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Submit review error', err);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Leave a Review</Text>
      <View style={styles.starsContainer}>
        {stars.map((s) => (
          <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
            <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={s <= rating ? '#F59E0B' : theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput 
        value={comment} 
        onChangeText={setComment} 
        placeholder="Write your review..." 
        multiline 
        style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]} 
      />

      <View style={styles.submitBtnContainer}>
        <TouchableOpacity onPress={submit} disabled={submitting} style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}>
          {submitting ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={[styles.submitBtnText, { color: theme.colors.textInverse }]}>Submit Review</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
