import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { styles } from '../../../styles/TenantHomePage.js';

const tabs = [
  { id: 'featured', label: '⭐ Featured' },
  { id: 'rating', label: '🏆 Best Rating' },
  { id: 'amenities', label: '✨ Best Amenities' },
  { id: 'price', label: '💰 Low Prices' },
];

export default function CategoryTabs({ activeTab, onTabPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => onTabPress(tab.id)}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}