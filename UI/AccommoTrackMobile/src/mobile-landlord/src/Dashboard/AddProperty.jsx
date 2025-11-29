import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/DormProfile.js';
import Button from '../components/ui/Button';
import PropertyService from '../../../services/PropertyServices';

export default function AddProperty({ navigation }) {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [name, setName] = useState('');

  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const webviewRef = useRef(null);

  const onMapMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.lat && payload.lon) {
        setLatitude(payload.lat);
        setLongitude(payload.lon);
        // Reverse geocode using backend
        setLoadingAddress(true);
        const res = await PropertyService.reverseGeocode(payload.lat, payload.lon);
        setLoadingAddress(false);
        if (res.success && res.data && res.data.address) {
          const a = res.data.address;
          // Map common fields
          setStreet(a.road || a.pedestrian || a.house_number || '');
          setBarangay(a.suburb || a.village || a.neighbourhood || a.hamlet || '');
          setCity(a.city || a.town || a.county || '');
          setProvince(a.state || a.region || '');
          setPostalCode(a.postcode || '');
        } else {
          Alert.alert('Reverse Geocode', 'Unable to fetch address for selected coordinates.');
        }
      }
    } catch (err) {
      console.error('Map message error', err);
    }
  };

  const saveProperty = async () => {
    if (!name) return Alert.alert('Validation', 'Please enter a property name.');
    if (!latitude || !longitude) return Alert.alert('Validation', 'Please pick a location on the map.');

    const payload = {
      name,
      street_address: street,
      barangay,
      city,
      province,
      postal_code: postalCode,
      latitude,
      longitude
    };

    try {
      const res = await PropertyService.createProperty(payload);
      if (res.success) {
        Alert.alert('Success', 'Property created successfully.');
        navigation.navigate('MyProperties');
      } else {
        Alert.alert('Error', 'Failed to create property: ' + (res.error || 'Unknown'));
      }
    } catch (err) {
      console.error('Create property error', err);
      Alert.alert('Error', 'Unexpected error creating property.');
    }
  };

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>html,body,#map{height:100%;margin:0;padding:0} #map{border-radius:12px}</style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([11.0, 122.0], 6);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          var marker = null;
          function placeMarker(latlng) {
            if (marker) marker.setLatLng(latlng);
            else marker = L.marker(latlng).addTo(map);
          }
          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lon = e.latlng.lng;
            placeMarker(e.latlng);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lon: lon }));
            }
          });
          // Try to get user's location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
              map.setView([pos.coords.latitude, pos.coords.longitude], 14);
            }, function(){}, { timeout: 5000 });
          }
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={[ 'top' ]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Button onPress={() => navigation.goBack()} type="transparent" style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Button>
        <Text style={styles.headerTitle}>Add Property</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ padding: 16 }}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Property Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Q&M Dormitory" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:12, borderRadius:8, marginBottom:12 }} />

        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Pick location on map</Text>
        <View style={{ height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <WebView
            ref={webviewRef}
            originWhitelist={[ '*' ]}
            source={{ html: leafletHTML }}
            onMessage={onMapMessage}
            javaScriptEnabled={true}
          />
        </View>

        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Address (auto-filled from coordinates)</Text>
        {loadingAddress && <ActivityIndicator size="small" color="#10b981" />}

        <TextInput value={street} onChangeText={setStreet} placeholder="Street" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:10, borderRadius:8, marginBottom:8 }} />
        <TextInput value={barangay} onChangeText={setBarangay} placeholder="Barangay" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:10, borderRadius:8, marginBottom:8 }} />
        <TextInput value={city} onChangeText={setCity} placeholder="City" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:10, borderRadius:8, marginBottom:8 }} />
        <TextInput value={province} onChangeText={setProvince} placeholder="Province" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:10, borderRadius:8, marginBottom:8 }} />
        <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="Postal Code" style={{ borderWidth:1, borderColor:'#E5E7EB', padding:10, borderRadius:8, marginBottom:12 }} />

        <Button onPress={saveProperty} type="primary">
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 8 }}>Save Property</Text>
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
