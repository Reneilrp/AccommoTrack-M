import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';

const filterOptions = ['All', 'Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];

export default function FilterModal({ visible, onClose, selectedFilter, onFilterSelect }) {
  const getFilterIcon = (filter) => {
    switch (filter) {
      case 'All': return 'apps';
      case 'Dormitory': return 'business';
      case 'Apartment': return 'home';
      case 'Boarding House': return 'home-outline';
      case 'Bed Spacer': return 'bed-outline';
      default: return 'bed';
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Type</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptionsContainer}>
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterOption,
                  selectedFilter === filter && styles.filterOptionActive
                ]}
                onPress={() => onFilterSelect(filter)}
              >
                <View style={styles.filterOptionContent}>
                  <Ionicons
                    name={getFilterIcon(filter)}
                    size={24}
                    color={selectedFilter === filter ? '#4CAF50' : '#6B7280'}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter && styles.filterOptionTextActive
                  ]}>
                    {filter}
                  </Text>
                </View>
                {selectedFilter === filter && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}