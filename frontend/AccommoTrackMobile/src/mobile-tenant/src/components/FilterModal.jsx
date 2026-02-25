import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';

const filterOptions = ['All', 'Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];

export default function FilterModal({ visible, onClose, selectedFilter, onFilterSelect }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
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
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptionsContainer}>
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterOption,
                  selectedFilter === filter && styles.filterOptionSelected
                ]}
                onPress={() => onFilterSelect(filter)}
              >
                <View style={styles.filterOptionContent}>
                  <Ionicons
                    name={getFilterIcon(filter)}
                    size={24}
                    color={selectedFilter === filter ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter && styles.filterOptionTextSelected
                  ]}>
                    {filter}
                  </Text>
                </View>
                {selectedFilter === filter && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}