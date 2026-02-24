import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';
import MapModal from './MapModal';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  onSearchPress,
  onMapPress,
  properties = [],
  userRole = 'guest',
  onSelectProperty
}) {
  const { theme } = useTheme();
  const [mapOpen, setMapOpen] = useState(false);
  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search here..."
          placeholderTextColor={theme.colors.textTertiary}
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
          <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <MapModal 
        visible={mapOpen} 
        onClose={() => setMapOpen(false)} 
        properties={properties} 
        userRole={userRole} 
        onSelectProperty={(data) => {
          // Only forward actual property selections, not debug/init messages
          if (data && (data.action === 'open_property' || data.action === 'marker_click')) {
            if (data.property && onSelectProperty) {
              onSelectProperty(data.property);
            }
          }
        }} 
      />
    </View>
  );
}