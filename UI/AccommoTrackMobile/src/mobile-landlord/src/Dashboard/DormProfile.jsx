// DormProfileScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/DormProfile.js';

export default function DormProfileScreen({ navigation }) {
  const [dormData] = useState({
    name: 'Q&M Dormitory',
    type: 'Dormitory',
    description: 'A comfortable and safe dormitory near the university. Perfect for students looking for a quiet place to study and rest.',
    address: {
      street: 'Amethyst St. San Jose',
      barangay: 'Cawa-cawa',
      city: 'Zamboanga City',
      zipCode: '7000'
    },
    contact: {
      phone: '+63 912 345 6789',
      email: 'qmdormitory@gmail.com'
    },
    amenities: {
      wifi: true,
      parking: true,
      kitchen: true,
      laundry: true,
      aircon: true,
      security: true,
      studyArea: true,
      commonRoom: false
    }
  });

  const amenityIcons = {
    wifi: 'wifi',
    parking: 'car',
    kitchen: 'restaurant',
    laundry: 'shirt',
    aircon: 'snow',
    security: 'shield-checkmark',
    studyArea: 'book',
    commonRoom: 'people'
  };

  const amenityLabels = {
    wifi: 'WiFi',
    parking: 'Parking',
    kitchen: 'Kitchen',
    laundry: 'Laundry',
    aircon: 'Air Conditioning',
    security: 'Security',
    studyArea: 'Study Area',
    commonRoom: 'Common Room'
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dorm Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditDormProfile')}>
          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{dormData.name}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{dormData.type}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                {dormData.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Street</Text>
              <Text style={styles.infoValue}>{dormData.address.street}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Barangay</Text>
              <Text style={styles.infoValue}>{dormData.address.barangay}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{dormData.address.city}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Zip Code</Text>
              <Text style={styles.infoValue}>{dormData.address.zipCode}</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{dormData.contact.phone}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{dormData.contact.email}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {Object.entries(dormData.amenities).map(([key, value]) => (
              <View 
                key={key} 
                style={[
                  styles.amenityItem, 
                  value ? styles.amenityItemActive : styles.amenityItemInactive
                ]}
              >
                <Ionicons 
                  name={value ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={value ? "#4CAF50" : "#9E9E9E"} 
                />
                <Text style={[styles.amenityLabel, value && styles.amenityLabelActive]}>
                  {amenityLabels[key]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditDormProfile')}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit Dorm Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

