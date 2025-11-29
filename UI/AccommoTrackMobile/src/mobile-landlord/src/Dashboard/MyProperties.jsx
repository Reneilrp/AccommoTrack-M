import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/DormProfile.js';
import Button from '../components/ui/Button';
import PropertyService from '../../../services/PropertyServices';
import { ActivityIndicator, FlatList } from 'react-native';
import PropertyCard from '../../../mobile-tenant/src/components/PropertyCard.jsx';

export default function MyPropertiesScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await PropertyService.getMyProperties();
      if (!mounted) return;
      if (res.success) {
        setProperties(Array.isArray(res.data) ? res.data : []);
      } else {
        setProperties([]);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

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
        <Button onPress={() => navigation.goBack()} type="transparent" style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Button>
        <Text style={styles.headerTitle}>My Properties</Text>
        <Button onPress={() => navigation.navigate('AddProperty')} type="transparent" style={{ padding: 6 }}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Button>
      </View>

      <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : properties.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ marginBottom: 12 }}>You have no properties yet.</Text>
            <Button onPress={() => navigation.navigate('AddProperty')} type="primary">
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8 }}>Add Property</Text>
            </Button>
          </View>
        ) : (
          <FlatList
            data={properties}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => {
              // transform to accommodation shape for tenant PropertyCard
              const acc = PropertyService.transformPropertyToAccommodation(item);
              return (
                <PropertyCard
                  property={acc}
                  onPress={(p) => navigation.navigate('DormProfile', { property: item })}
                />
              );
            }}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
