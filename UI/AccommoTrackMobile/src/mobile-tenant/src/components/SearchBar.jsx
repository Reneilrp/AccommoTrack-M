import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  onSearchPress,
  onMapPress 
}) {
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
          onPress={onMapPress}
        >
          <Ionicons name="map-outline" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>
    </View>
  );
}