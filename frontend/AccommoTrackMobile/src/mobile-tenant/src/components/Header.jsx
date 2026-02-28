import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext';
import { navigationRef } from '../../../navigation/RootNavigation';

export default function Header({ 
  onMenuPress, 
  onRightPress, 
  isGuest, 
  title: propTitle, 
  showRightIcon: propShowRightIcon, 
  rightIcon = 'notifications-outline',
  onBack, 
  notificationCount = 0 
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => homeStyles(theme), [theme]);

  // Determine current route name if navigationRef is ready
  const currentRoute = navigationRef?.isReady() ? navigationRef.getCurrentRoute() : null;
  const routeName = currentRoute?.name;

  const title = propTitle || (routeName === 'Settings' ? 'Settings' : 'AccommoTrack');
  const showRightIcon = typeof propShowRightIcon === 'boolean' ? propShowRightIcon : (routeName !== 'Settings');

  return (
    <View style={{ backgroundColor: theme.colors.primary, paddingTop: insets.top }}>
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.primary,
        }
      ]}> 
        <View style={styles.headerSide}>
          {onBack ? (
            <TouchableOpacity style={styles.headerIcon} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerIcon} onPress={onMenuPress}>
              <Ionicons name="menu" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.headerSide}>
          {showRightIcon && (
            <TouchableOpacity style={styles.headerIcon} onPress={onRightPress}>
              <View>
                <Ionicons name={rightIcon} size={24} color={theme.colors.textInverse} />
                {rightIcon === 'notifications-outline' && notificationCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: theme.colors.primary
                  }}>
                    <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}