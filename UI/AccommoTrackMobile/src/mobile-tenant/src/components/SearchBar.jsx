import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/TenantHomePage.js';

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  onFilterPress, 
  onSearchPress,
  selectedFilter,
  onClearFilter 
}) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        {/* Filter Button */}
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={24} color="#4CAF50" />
          {selectedFilter !== 'All' && <View style={styles.filterBadge} />}
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, name, or amenities..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchPress}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Display */}
      {selectedFilter !== 'All' && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>{selectedFilter}</Text>
            <TouchableOpacity onPress={onClearFilter}>
              <Ionicons name="close-circle" size={18} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}