import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext';
import tenantService from '../../../../services/TenantService';
import { getStyles } from '../../../../styles/Tenant/ReportProperty';

export default function ReportProperty() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { propertyId = null, propertyTitle = 'Property' } = route.params || {};

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    'Inaccurate Listing Photos/Details',
    'Safety or Security Concerns',
    'Landlord Misconduct/Harassment',
    'Payment Issues (Charging outside app)',
    'Scam or Fraudulent Activity',
    'Other'
  ];

  const submit = async () => {
    if (!reason) {
      Alert.alert('Selection Required', 'Please select a reason for your report.');
      return;
    }
    if (description.length < 10) {
      Alert.alert('More Detail Needed', 'Please provide a description of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await tenantService.submitReport({
        property_id: propertyId,
        reason,
        description
      });
      
      if (res.success) {
        Alert.alert(
          'Report Submitted', 
          'Thank you. AccommoTrack Admins will review this listing. False reporting may lead to account penalties.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Submit report error', err);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Report Listing</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.reportingText, { color: theme.colors.textSecondary }]}>
            Reporting: <Text style={[styles.propertyTitle, { color: theme.colors.text }]}>{propertyTitle}</Text>
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Reason for Report
          </Text>
          
          <View style={styles.reasonsContainer}>
            {reasons.map((r) => (
              <TouchableOpacity 
                key={r} 
                onPress={() => setReason(r)}
                style={[
                  styles.reasonItem,
                  {
                    backgroundColor: reason === r ? theme.colors.error + '15' : theme.colors.surface,
                    borderColor: reason === r ? theme.colors.error : theme.colors.border
                  }
                ]}
              >
                <Ionicons 
                  name={reason === r ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color={reason === r ? theme.colors.error : theme.colors.textTertiary} 
                />
                <Text style={[styles.reasonText, { color: theme.colors.text, fontWeight: reason === r ? 'bold' : 'normal' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.descriptionTitle, { color: theme.colors.text }]}>
            Description
          </Text>
          <TextInput 
            value={description} 
            onChangeText={setDescription} 
            placeholder="Please provide specific details about the issue..." 
            placeholderTextColor={theme.colors.textTertiary}
            multiline 
            numberOfLines={4}
            style={[
              styles.textArea,
              { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.text,
                borderColor: theme.colors.border
              }
            ]} 
          />

          <View style={[styles.warningBanner, { backgroundColor: theme.colors.warning + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
            <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
              Reports are sent to Admins. Abuse of the reporting system may result in account restriction.
            </Text>
          </View>

          <TouchableOpacity 
            onPress={submit} 
            disabled={submitting} 
            style={[styles.submitButton, { backgroundColor: theme.colors.error }]}
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
