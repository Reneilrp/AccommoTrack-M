import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';
import { navigationRef } from '../../../navigation/RootNavigation';

export default function Header({ onMenuPress, onProfilePress, isGuest, title: propTitle, showProfile: propShowProfile, onBack }) {
  const { theme } = useTheme();

  // Determine current route name if navigationRef is ready
  const currentRoute = navigationRef?.isReady() ? navigationRef.getCurrentRoute() : null;
  const routeName = currentRoute?.name;

  const title = propTitle || (routeName === 'Settings' ? 'Settings' : 'AccommoTrack');
  const showProfile = typeof propShowProfile === 'boolean' ? propShowProfile : (routeName !== 'Settings');

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.primary }} edges={['top']}>
      <View style={[
        homeStyles.header, 
        { 
          backgroundColor: theme.colors.primary,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.1)' 
        }
      ]}> 
        <View style={homeStyles.headerSide}>
          {onBack ? (
            <TouchableOpacity style={homeStyles.headerIcon} onPress={onBack}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={homeStyles.headerIcon} onPress={onMenuPress}>
              <Ionicons name="menu" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>

        <View style={homeStyles.headerCenter} pointerEvents="none">
          <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]} numberOfLines={1}>{title}</Text>
        </View>

        <View style={homeStyles.headerSide}>
          {showProfile && (
            <TouchableOpacity style={homeStyles.headerIcon} onPress={onProfilePress}>
              <Ionicons name="person-circle-outline" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}