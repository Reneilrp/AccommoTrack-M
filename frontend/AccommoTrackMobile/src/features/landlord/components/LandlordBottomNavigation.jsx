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
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          setUser(JSON.parse(userString));
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  const isCaretaker = user?.role === 'caretaker';
  const permissions = user?.caretaker_permissions || {};

  // Define tabs with permission checks
  const tabs = [
    {
      name: 'Home',
      component: LandlordDashboard,
      label: 'Home',
      icon: (focused) => focused ? 'home' : 'home-outline',
      show: true, // Home always visible
    },
    {
      name: 'Properties',
      component: MyProperties,
      label: 'Properties',
      icon: (focused) => focused ? 'business' : 'business-outline',
      show: !isCaretaker || permissions.can_view_properties || permissions.can_view_rooms || permissions.can_view_tenants,
    },
    {
      name: 'Bookings',
      component: Bookings,
      label: 'Bookings',
      customButton: true,
      show: !isCaretaker || permissions.can_view_bookings,
    },
    {
      name: 'Messages',
      component: Messages,
      label: 'Messages',
      icon: (focused) => focused ? 'chatbubbles' : 'chatbubbles-outline',
      show: !isCaretaker || permissions.can_view_messages,
    },
    {
      name: 'Settings',
      component: Settings,
      label: 'Settings',
      icon: (focused) => focused ? 'settings' : 'settings-outline',
      show: true, // Settings always visible
    },
  ];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tabInfo = tabs.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            if (tabInfo?.customButton) {
              return <Ionicons name="calendar" size={28} color="#FFFFFF" />;
            }
            const iconName = tabInfo?.icon ? tabInfo.icon(focused) : 'help-outline';
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
        };
      }}
    >
      {tabs.filter(t => t.show).map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarLabel: tab.customButton ? () => null : tab.label,
            tabBarButton: tab.customButton 
              ? (props) => <CustomTabBarButton {...props} theme={theme} />
              : undefined,
          }}
        >
          {(props) => <tab.component {...props} onLogout={onLogout} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}
