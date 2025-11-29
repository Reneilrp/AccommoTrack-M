import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/DormProfile.js';
import Button from '../components/ui/Button';
import PropertyService from '../../../services/PropertyServices';

export default function DormProfileScreen({ route, navigation }) {
  const { property } = route.params || {};
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable fields
  const [name, setName] = useState(property?.name || '');
  const [description, setDescription] = useState(property?.description || '');
  const [street, setStreet] = useState(property?.street_address || '');
  const [barangay, setBarangay] = useState(property?.barangay || '');
  const [city, setCity] = useState(property?.city || '');
  const [province, setProvince] = useState(property?.province || '');
  const [postalCode, setPostalCode] = useState(property?.postal_code || '');
  
  const saveProperty = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a property name.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      street_address: street,
      barangay,
      city,
      province,
      postal_code: postalCode
    };

    try {
      setIsSaving(true);
      const res = await PropertyService.updateProperty(property.id, payload);
      setIsSaving(false);
      
      if (res.success) {
        Alert.alert('Success', 'Property updated successfully.');
        setIsEditing(false);
      } else {
        Alert.alert('Error', 'Failed to update property: ' + (res.error || 'Unknown'));
      }
    } catch (err) {
      setIsSaving(false);
      console.error('Update property error', err);
      Alert.alert('Error', 'Unexpected error updating property.');
    }
  };

  const deleteProperty = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setIsSaving(true);
              const res = await PropertyService.deleteProperty(property.id);
              setIsSaving(false);
              
              if (res.success) {
                Alert.alert('Success', 'Property deleted successfully.');
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete property.');
              }
            } catch (err) {
              setIsSaving(false);
              Alert.alert('Error', 'Unexpected error deleting property.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => navigation.goBack()} type="transparent" style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Button>
        <Text style={styles.headerTitle}>Property Details</Text>
        <Button 
          onPress={() => setIsEditing(!isEditing)} 
          type="transparent" 
          style={{ padding: 6 }}
        >
          <Ionicons name={isEditing ? "close-outline" : "create-outline"} size={20} color="#FFFFFF" />
        </Button>
      </View>

      <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
        {isEditing ? (
          // Edit Mode
          <>
            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Property Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Property name"
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 14
                }}
              />
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Property description"
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 14,
                  textAlignVertical: 'top'
                }}
              />
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Address</Text>
              <TextInput
                value={street}
                onChangeText={setStreet}
                placeholder="Street"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, marginBottom: 8 }}
              />
              <TextInput
                value={barangay}
                onChangeText={setBarangay}
                placeholder="Barangay"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, marginBottom: 8 }}
              />
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, marginBottom: 8 }}
              />
              <TextInput
                value={province}
                onChangeText={setProvince}
                placeholder="Province"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, marginBottom: 8 }}
              />
              <TextInput
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal Code"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, marginBottom: 16 }}
              />
            </View>

            <Button type="primary" onPress={saveProperty} disabled={isSaving} style={{ marginBottom: 12 }}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8 }}>Save Changes</Text>
                </>
              )}
            </Button>

            <Button type="danger" onPress={deleteProperty} disabled={isSaving}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8 }}>Delete Property</Text>
            </Button>
          </>
        ) : (
          // View Mode
          <>
            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{property?.name}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                    {property?.description || 'No description'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Address</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Street</Text>
                  <Text style={styles.infoValue}>{property?.street_address}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Barangay</Text>
                  <Text style={styles.infoValue}>{property?.barangay}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City</Text>
                  <Text style={styles.infoValue}>{property?.city}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Province</Text>
                  <Text style={styles.infoValue}>{property?.province}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Postal Code</Text>
                  <Text style={styles.infoValue}>{property?.postal_code}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

