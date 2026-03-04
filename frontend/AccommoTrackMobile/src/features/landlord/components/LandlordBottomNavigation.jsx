import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

import LandlordDashboard from '../screens/Dashboard/DashboardPage.jsx';
import MyProperties from '../screens/Properties/MyProperties.jsx';
import Messages from '../screens/Messages/MessagesPage.jsx';
import Settings from '../screens/Settings/SettingsHub.jsx';
import Bookings from '../screens/Bookings/Bookings.jsx';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress, theme }) => (
  <TouchableOpacity
    style={{
      top: -24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 8,
    }}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        borderWidth: 4,
        borderColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </View>
    <Text style={{
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.primary,
      marginTop: 4
    }}>
      Bookings
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  }
});

export default function LandlordBottomNavigation({ onLogout }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Properties') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Bookings') {
            return <Ionicons name="calendar" size={28} color="#FFFFFF" />;
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          height: 60 + insets.bottom,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.isDark ? 0.3 : 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 6,
        }
      })}
    >
      <Tab.Screen
        name="Home"
        children={(props) => <LandlordDashboard {...props} onLogout={onLogout} />}
        options={{ tabBarLabel: 'Home' }}
      />

      <Tab.Screen
        name="Properties"
        component={MyProperties}
        options={{ tabBarLabel: 'Properties' }}
      />

      <Tab.Screen
        name="Bookings"
        component={Bookings}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} theme={theme} />
          )
        }}
      />

      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{
          tabBarBadge: undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.error,
            color: '#FFFFFF',
            fontSize: 10,
            minWidth: 18,
            height: 18,
            borderRadius: 9
          }
        }}
      />

      <Tab.Screen
        name="Settings"
        children={(props) => <Settings {...props} onLogout={onLogout} />}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
