import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TenantHomePage from '../src/TenantHomePage/HomePage.jsx';
import MessagesPage from '../src/Messages/MessagesPage.jsx';
import AccommodationDetails from '../src/components/PropertyDetailsScreen.jsx';
import ProfilePage from '../src/Profile/ProfilePage.jsx';
import MyBookings from '../src/Menu/MyBookings.jsx';
import Payments from '../src/Menu/Payments.jsx';
import Settings from '../src/Menu/Settings.jsx';
import HelpSupport from '../src/Menu/HelpSupport.jsx';
import RoomListScreen from '../src/components/RoomListScreen.jsx';
import RoomDetailsScreen from '../src/components/RoomDetailsScreen.jsx';

const Stack = createNativeStackNavigator();

export default function TenantNavigator({ onLogout, isGuest = false, onAuthRequired }) {
  return (
    <Stack.Navigator
      initialRouteName="TenantHome"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationTypeForReplace: 'pop',
      }}
    >
      <Stack.Screen name="TenantHome" options={{ animation: 'none' }}>
        {(props) => (
          <TenantHomePage 
            {...props} 
            onLogout={onLogout}
            isGuest={isGuest}
            onAuthRequired={onAuthRequired}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="AccommodationDetails" options={{ animation: 'none' }}>
        {(props) => (
          <AccommodationDetails 
            {...props}
            isGuest={isGuest}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="RoomsList" options={{ animation: 'none' }}>
        {(props) => (
          <RoomListScreen 
            {...props}
            isGuest={isGuest}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="RoomDetails" options={{ animation: 'none' }}>
        {(props) => (
          <RoomDetailsScreen 
            {...props}
            isGuest={isGuest}
            onAuthRequired={onAuthRequired}
          />
        )}
      </Stack.Screen>

      {/* Settings - Available for both guests and authenticated users */}
      <Stack.Screen name="Settings" options={{ animation: 'none' }}>
        {(props) => (
          <Settings 
            {...props} 
            onLogout={onLogout}
            isGuest={isGuest}
            onLoginPress={onAuthRequired}
          />
        )}
      </Stack.Screen>

      {/* Protected Routes - Only for authenticated users */}
      {!isGuest && (
        <>
          <Stack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
          <Stack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
          <Stack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
          <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
          <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }} />
        </>
      )}
    </Stack.Navigator>
  );
}