import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import your screens
import LandlordDashboard from '../Dashboard/DashboardPage.jsx';
import RoomManagement from '../Dashboard/RoomManagement.jsx';
import Tenants from '../Dashboard/Tenants.jsx';
import Messages from '../Dashboard/Messages.jsx';
import MyProperties from '../Dashboard/MyProperties.jsx';
import Settings from '../Dashboard/Settings.jsx';
import Bookings from '../Dashboard/Bookings.jsx';
import Analytics from '../Dashboard/Analytics.jsx';
import MyProfile from '../Dashboard/MyProfile.jsx';
import HelpSupport from '../Dashboard/HelpSupport.jsx';
import About from '../Dashboard/About.jsx';
import DevTeam from '../Dashboard/DevTeam/DevTeam.jsx';
import AddProperty from '../Dashboard/AddProperty.jsx';
import DormProfile from '../Dashboard/DormProfile.jsx';
import PropertyDetailsScreen from '../../../mobile-tenant/src/components/PropertyDetailsScreen.jsx';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Rooms') {
            iconName = focused ? 'bed' : 'bed-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 50,
          paddingTop: 8,
          height: 80,
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
        component={LandlordDashboard}
        options={{
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen 
        name="Rooms" 
        component={RoomManagement}
        options={{
          tabBarLabel: 'Rooms'
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={Messages}
        options={{
          tabBarBadge: 3,
          tabBarBadgeStyle: {
            backgroundColor: '#F44336',
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
      <Stack.Screen name="Bookings" component={Bookings} options={{ animation: 'none' }}/>
      <Stack.Screen name="DashboardPage" component={LandlordDashboard} options={{ animation: 'none' }}/>
      <Stack.Screen name="Tenants" component={Tenants} options={{ animation: 'none' }}/>
      <Stack.Screen name="MyProperties" component={MyProperties} options={{ animation: 'none' }}/>
      <Stack.Screen name="RoomManagement" component={RoomManagement} options={{ animation: 'none' }}/>
      <Stack.Screen name="Message" component={Messages} options={{ animation: 'none' }}/>
      <Stack.Screen name="Analytics" component={Analytics} options={{ animation: 'none' }}/>
      <Stack.Screen name="MyProfile" component={MyProfile} options={{ animation: 'none' }}/>
      <Stack.Screen name="AddProperty" component={AddProperty} options={{ animation: 'none' }}/>
      <Stack.Screen name="DormProfile" component={DormProfile} options={{ animation: 'none' }}/>
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} options={{ animation: 'none' }}/>
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }}/>
      <Stack.Screen name="About" component={About} options={{ animation: 'none' }}/>
      <Stack.Screen name="DevTeam" component={DevTeam} options={{ animation: 'none', headerShown: false }} />
    </Stack.Navigator>
  );
}