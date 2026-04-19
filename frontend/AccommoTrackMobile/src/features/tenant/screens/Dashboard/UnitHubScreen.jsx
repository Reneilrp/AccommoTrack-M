import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import TenantService from '../../../../services/TenantService.js';
import { getStyles } from '../../../../styles/Tenant/UnitHubStyles.js';

export default function UnitHubScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const stayQuery = useQuery({
    queryKey: ['tenant', 'current-stay'],
    queryFn: async () => {
      const res = await TenantService.getCurrentStay();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const stayData = stayQuery.data || null;
  const property = stayData?.property || stayData?.booking?.property || null;
  const room = stayData?.room || stayData?.booking?.room || null;
  const landlord = property?.landlord || stayData?.landlord || null;
  const caretaker = stayData?.caretaker || null;

  const parseJson = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  };

  const rules = parseJson(property?.property_rules || property?.rules);
  const amenities = parseJson(property?.amenities);

  if (stayQuery.isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (target) => {
    // Navigation to chat with landlord or caretaker
    navigation.navigate('Chat', { recipient: target });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Living Hub</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unit Info Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Your Accommodation</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Room</Text>
              <Text style={styles.statValue}>{room?.room_number || room?.roomNumber || '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Floor</Text>
              <Text style={styles.statValue}>{room?.floor || '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Property</Text>
              <Text style={[styles.statValue, { fontSize: 13 }]}>{property?.title || '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Type</Text>
              <Text style={[styles.statValue, { fontSize: 13 }]}>{room?.room_type || 'Standard'}</Text>
            </View>
          </View>
        </View>

        {/* Staff Contacts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Staff Contacts</Text>
          </View>
          
          {landlord && (
            <View style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{landlord.name || 'Landlord'}</Text>
                <Text style={styles.contactRole}>Property Owner</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(landlord.contact_number)}>
                  <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleMessage(landlord)}>
                  <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {caretaker && (
            <View style={styles.contactItem}>
              <View style={[styles.contactAvatar, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{caretaker.name || 'Caretaker'}</Text>
                <Text style={styles.contactRole}>Assigned Caretaker</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(caretaker.contact_number)}>
                  <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleMessage(caretaker)}>
                  <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Amenities Section */}
        {amenities.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="apps-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Amenities</Text>
            </View>
            <View style={styles.amenityGrid}>
              {amenities.map((item, idx) => (
                <View key={idx} style={styles.amenityTag}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                  <Text style={styles.amenityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rules Section */}
        {rules.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Property Rules</Text>
            </View>
            {rules.map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.textTertiary} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
