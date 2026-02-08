import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';

export default function Header({ onMenuPress, onProfilePress, isGuest }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.primary }} edges={['top']}>
      <View style={[homeStyles.header, { backgroundColor: theme.colors.primary }]}> 
        <View style={homeStyles.headerSide}>
          <TouchableOpacity style={homeStyles.headerIcon} onPress={onMenuPress}>
            <Ionicons name="menu" size={22} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
          <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]}>AccommoTrack</Text>
        </View>

        <View style={homeStyles.headerSide}>
          <TouchableOpacity style={homeStyles.headerIcon} onPress={onProfilePress}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}