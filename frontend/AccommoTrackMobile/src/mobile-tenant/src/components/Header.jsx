import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';

export default function Header({ onMenuPress, onProfilePress }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerIcon} onPress={onMenuPress}>
        <Ionicons name="menu" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>AccommoTrack</Text>

      <TouchableOpacity style={styles.headerIcon} onPress={onProfilePress}>
        <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}