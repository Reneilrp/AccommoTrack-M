import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';
import MapModal from './MapModal';

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  onSearchPress,
  onMapPress,
  properties = [],
  userRole = 'guest',
  onSelectProperty
}) {
  const [mapOpen, setMapOpen] = useState(false);
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search here..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchPress}
        /> 
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => {
            if (onMapPress) return onMapPress();
            setMapOpen(true);
          }}
        >
          <Ionicons name="map-outline" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>
      <MapModal visible={mapOpen} onClose={() => setMapOpen(false)} properties={properties} userRole={userRole} onSelectProperty={(data) => {
        // forward event to parent if provided
        if(onSelectProperty) onSelectProperty(data);
      }} />
    </View>
  );
}