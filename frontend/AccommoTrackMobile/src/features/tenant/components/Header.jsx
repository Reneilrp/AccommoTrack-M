import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { navigationRef } from '../../../navigation/RootNavigation.js';

export default function Header({ 
  onMenuPress, 
  onRightPress, 
  isGuest, 
  title: propTitle, 
  showRightIcon: propShowRightIcon, 
  rightIcon = 'notifications-outline',
  rightActions,
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
  const hasCustomRightActions = Array.isArray(rightActions) && rightActions.length > 0;

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}> 
        <View style={styles.headerSide}>
          {onBack ? (
            <TouchableOpacity style={styles.headerIcon} onPress={onBack}>
              <Ionicons name="arrow-back" size={28} color={theme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerIcon} onPress={onMenuPress}>
              <Ionicons name="menu" size={28} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View
          style={[
            styles.headerSide,
            hasCustomRightActions && { flexDirection: 'row', justifyContent: 'flex-end' },
          ]}
        >
          {hasCustomRightActions ? rightActions.map((action, index) => (
            <TouchableOpacity
              key={`${action.icon || 'icon'}-${index}`}
              style={[styles.headerIcon, action.disabled && { opacity: 0.45 }]}
              onPress={action.onPress}
              disabled={action.disabled}
            >
              <Ionicons
                name={action.icon || 'ellipse-outline'}
                size={action.size || 24}
                color={action.color || theme.colors.textInverse}
              />
            </TouchableOpacity>
          )) : showRightIcon && (
            <TouchableOpacity style={styles.headerIcon} onPress={onRightPress}>
              <View>
                <Ionicons name={rightIcon} size={28} color={theme.colors.textInverse} />
                {rightIcon === 'notifications-outline' && notificationCount > 0 && (
                  <View style={[styles.notificationBadge, { borderColor: theme.colors.primary }]}>
                    <Text style={styles.notificationBadgeText}>
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