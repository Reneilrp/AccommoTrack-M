import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';
import { navigationRef } from '../../../navigation/RootNavigation';

export default function Header({ onMenuPress, onProfilePress, isGuest, title: propTitle, showProfile: propShowProfile, onBack, notificationCount = 0 }) {
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
              <View>
                <Ionicons name="notifications-outline" size={22} color={theme.colors.textInverse} />
                {notificationCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 1.5,
                    borderColor: theme.colors.primary
                  }}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}