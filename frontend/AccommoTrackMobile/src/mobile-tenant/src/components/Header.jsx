import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';

export default function Header({ onMenuPress, onProfilePress, isGuest }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <TouchableOpacity style={styles.headerIcon} onPress={onMenuPress}>
        <Ionicons name="menu" size={28} color={theme.colors.textInverse} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}>AccommoTrack</Text>

      <TouchableOpacity style={styles.headerIcon} onPress={onProfilePress}>
        <Ionicons name="person-circle-outline" size={28} color={theme.colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}