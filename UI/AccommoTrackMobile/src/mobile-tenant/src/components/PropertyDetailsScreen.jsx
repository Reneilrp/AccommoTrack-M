import { 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Image, 
  StatusBar } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/PropertyDetailsScreen';

export default function PropertyDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { accommodation } = route.params;

  // Tenant-relevant only: No landlord info, focus on vacancy, amenities, rules

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title and Type */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{accommodation.name || accommodation.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{accommodation.type}</Text>
            </View>
          </View>
          
          {/* Image */}
          {accommodation.image && (
            <Image
              source={typeof accommodation.image === 'string' ? { uri: accommodation.image } : accommodation.image}
              style={styles.mainImage}
              resizeMode="cover"
            />
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color="#10b981" />
            <Text style={styles.locationText}>
              {accommodation.address || accommodation.location}
            </Text>
          </View>

          {/* Description */}
          {accommodation.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{accommodation.description}</Text>
            </View>
          )}

          {/* Stats (Vacancy Focus) */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{accommodation.availableRooms || accommodation.available_rooms}</Text>
              <Text style={styles.statLabel}>Available Rooms</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="pricetag-outline" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{accommodation.priceRange}</Text>
              <Text style={styles.statLabel}>Price Range</Text>
            </View>
          </View>

          {/* Amenities */}
          {accommodation.amenities && accommodation.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {accommodation.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rules */}
          {accommodation.propertyRules && accommodation.propertyRules.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Rules</Text>
              {accommodation.propertyRules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* View More (Rooms) Button */}
          <TouchableOpacity
            style={styles.viewRoomsButton}
            onPress={() => navigation.navigate('RoomsList', { property: accommodation })}
          >
            <Text style={styles.viewRoomsButtonText}>View More</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}