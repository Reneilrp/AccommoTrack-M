import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StyleSheet, 
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import { BASE_URL as API_BASE_URL } from '../../../../../config/index.js';

export default function UnitHubModal({ 
  visible, 
  onClose, 
  booking, 
  onMessageStaff 
}) {
  const { theme } = useTheme();
  const { height: viewportHeight } = useWindowDimensions();

  if (!booking) return null;

  const property = booking.property || {};
  const room = booking.room || {};
  const landlord = property.landlord || booking.landlord || {};
  const caretakers = property.caretakerAssignments || [];
  const amenities = property.amenities || [];
  const rules = property.property_rules || [];

  const getImageUrl = (path) => {
    if (!path) return null;
    if (typeof path === 'string' && path.startsWith('http')) return { uri: path };
    const cleanPath = typeof path === 'string' ? path.replace(/^\/?(storage\/)?/, '') : '';
    return { uri: `${API_BASE_URL}/storage/${cleanPath}` };
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      maxHeight: viewportHeight * 0.9,
      minHeight: viewportHeight * 0.6,
      overflow: 'hidden',
    },
    headerImage: {
      width: '100%',
      height: 200,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    scrollContainer: {
      padding: 24,
      paddingTop: 16,
    },
    propertyTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      textTransform: 'uppercase',
      letterSpacing: -0.5,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 6,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 2.5,
      marginTop: 32,
      marginBottom: 16,
    },
    staffCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
      padding: 16,
      borderRadius: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    staffAvatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    staffInfo: {
      flex: 1,
      marginLeft: 16,
    },
    staffRole: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
    },
    staffName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 2,
    },
    messageButton: {
      padding: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    amenityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    amenityTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#f1f3f5',
    },
    ruleItem: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    ruleNumber: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ruleText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    footerBadge: {
      alignItems: 'center',
      paddingVertical: 32,
      opacity: 0.3,
    }
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Image */}
            <Image 
              source={getImageUrl(property.image_url || property.image)} 
              style={styles.headerImage}
              resizeMode="cover"
            />

            <View style={styles.scrollContainer}>
              {/* Property Info */}
              <View>
                <Text style={styles.propertyTitle}>{property.title}</Text>
                <View style={styles.addressRow}>
                  <Ionicons name="location-sharp" size={14} color={theme.colors.primary} />
                  <Text style={styles.addressText}>{property.full_address || property.street_address}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                 <View style={{ flex: 1, backgroundColor: theme.colors.primary + '10', padding: 12, borderRadius: 16 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.primary, textTransform: 'uppercase' }}>Your Room</Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.primary }}>#{room.room_number}</Text>
                 </View>
                 {property.curfew_time && (
                    <View style={{ flex: 1.5, backgroundColor: '#f59e0b10', padding: 12, borderRadius: 16 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#d97706', textTransform: 'uppercase' }}>Curfew</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d97706' }}>{property.curfew_time}</Text>
                    </View>
                 )}
              </View>

              {/* Staff Section */}
              <Text style={styles.sectionTitle}>Building Support</Text>
              
              {/* Landlord */}
              <View style={styles.staffCard}>
                <View style={styles.staffAvatar}>
                   <Ionicons name="person" size={24} color="#fff" />
                </View>
                <View style={styles.staffInfo}>
                   <Text style={styles.staffRole}>Owner</Text>
                   <Text style={styles.staffName}>{landlord.first_name} {landlord.last_name}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => onMessageStaff(landlord.id)}
                >
                   <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Caretakers */}
              {caretakers.map((assignment, idx) => (
                <View key={idx} style={styles.staffCard}>
                  <View style={[styles.staffAvatar, { backgroundColor: '#3b82f6' }]}>
                     <Ionicons name="shield-checkmark" size={24} color="#fff" />
                  </View>
                  <View style={styles.staffInfo}>
                     <Text style={styles.staffRole}>Building Staff</Text>
                     <Text style={styles.staffName}>{assignment.caretaker?.first_name} {assignment.caretaker?.last_name}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => onMessageStaff(assignment.caretaker?.id)}
                  >
                     <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Amenities */}
              <Text style={styles.sectionTitle}>Facilities</Text>
              <View style={styles.amenityGrid}>
                {amenities.map((item, idx) => (
                  <View key={idx} style={styles.amenityTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: 'bold', color: theme.colors.text }}>{item.name}</Text>
                  </View>
                ))}
              </View>

              {/* House Manual */}
              <Text style={styles.sectionTitle}>House Manual</Text>
              {rules.map((rule, idx) => (
                <View key={idx} style={styles.ruleItem}>
                  <View style={styles.ruleNumber}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.colors.textTertiary }}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.ruleText}>{rule.rule || rule}</Text>
                </View>
              ))}

              <View style={styles.footerBadge}>
                 <Ionicons name="shield-checkmark-outline" size={40} color={theme.colors.textTertiary} />
                 <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 3, marginTop: 8 }}>
                    AccommoTrack Verified
                 </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
