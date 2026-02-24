import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

// Import your screens
import LandlordDashboard from '../screens/DashboardPage.jsx';
import RoomManagement from '../screens/RoomManagement.jsx';
import Tenants from '../screens/TenantManagement.jsx';
import Messages from '../screens/Messages.jsx';
import MyProperties from '../screens/MyProperties.jsx';
import Settings from '../screens/Settings.jsx';
import Bookings from '../screens/Bookings.jsx';
import Analytics from '../screens/Analytics.jsx';
import MyProfile from '../screens/MyProfile.jsx';
import HelpSupport from '../screens/HelpSupport.jsx';
import About from '../screens/About.jsx';
import DevTeam from '../screens/DevTeam/DevTeam.jsx';
import AddProperty from '../screens/AddProperty.jsx';
import DormProfile from '../screens/DormProfile.jsx';
import Notifications from '../screens/Notifications.jsx';
import AllActivities from '../screens/AllActivities.jsx';
import AddonManagement from '../screens/AddonManagement.jsx';
import AddBooking from '../screens/AddBooking.jsx';
import Payments from '../screens/Payments.jsx';
import VerificationStatus from '../screens/VerificationStatus.jsx';
import PropertyActivityLogs from '../screens/PropertyActivityLogs.jsx';
import TenantLogs from '../screens/TenantLogs.jsx';
import PropertyDetailsScreen from '../../../mobile-tenant/src/components/PropertyDetailsScreen.jsx';
import MaintenanceRequests from '../screens/MaintenanceRequests.jsx';
import Reviews from '../screens/Reviews.jsx';
import Caretakers from '../screens/Caretakers.jsx';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -24,
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow
    }}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        borderWidth: 4,
        borderColor: COLORS.background, // Uses theme background
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </View>
    <Text style={{ 
      fontSize: 11, 
      fontWeight: '600', 
      color: COLORS.primary, 
      marginTop: 4 
    }}>
      Bookings
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  }
});

// Bottom Tab Navigator
function MainTabs({ onLogout }) {
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
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          height: 60 + insets.bottom,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
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
        options={{
          tabBarLabel: 'Home'
        }}
      />

      <Tab.Screen 
        name="Properties" 
        component={MyProperties}
        options={{
          tabBarLabel: 'Properties'
        }}
      />

      <Tab.Screen 
        name="Bookings" 
        component={Bookings}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} />
          )
        }}
      />
      
      <Tab.Screen 
        name="Messages" 
        component={Messages}
        options={{
          tabBarBadge: undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.danger,
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
        options={{
          tabBarLabel: 'Settings'
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function LandlordNavigator({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        children={(props) => <MainTabs {...props} onLogout={onLogout} />}
      />
      
      {/* Additional Screens */}
      <Stack.Screen name="MyProperties" component={MyProperties} options={{ animation: 'none' }}/>
      <Stack.Screen name="DashboardPage" component={LandlordDashboard} options={{ animation: 'none' }}/>
      <Stack.Screen name="Tenants" component={Tenants} options={{ animation: 'none' }}/>
      <Stack.Screen name="RoomManagement" component={RoomManagement} options={{ animation: 'none' }}/>
      <Stack.Screen name="Analytics" component={Analytics} options={{ animation: 'none' }}/>
      <Stack.Screen name="MyProfile" component={MyProfile} options={{ animation: 'none' }}/>
      <Stack.Screen name="AddProperty" component={AddProperty} options={{ animation: 'none' }}/>
      <Stack.Screen name="DormProfile" component={DormProfile} options={{ animation: 'none' }}/>
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} options={{ animation: 'none' }}/>
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }}/>
      <Stack.Screen name="About" component={About} options={{ animation: 'none' }}/>
      <Stack.Screen name="DevTeam" component={DevTeam} options={{ animation: 'none', headerShown: false }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ animation: 'none' }} />
      <Stack.Screen name="AllActivities" component={AllActivities} options={{ animation: 'none' }} />
      <Stack.Screen name="AddonManagement" component={AddonManagement} options={{ animation: 'none' }} />
      <Stack.Screen name="AddBooking" component={AddBooking} options={{ animation: 'none' }} />
      <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
      <Stack.Screen name="VerificationStatus" component={VerificationStatus} options={{ animation: 'none' }} />
      <Stack.Screen name="PropertyActivityLogs" component={PropertyActivityLogs} options={{ animation: 'none' }} />
      <Stack.Screen name="TenantLogs" component={TenantLogs} options={{ animation: 'none' }} />
      <Stack.Screen name="MaintenanceRequests" component={MaintenanceRequests} options={{ animation: 'none' }} />
      <Stack.Screen name="Reviews" component={Reviews} options={{ animation: 'none' }} />
      <Stack.Screen name="Caretakers" component={Caretakers} options={{ animation: 'none' }} />
      <Stack.Screen name="Settings">
        {(props) => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}