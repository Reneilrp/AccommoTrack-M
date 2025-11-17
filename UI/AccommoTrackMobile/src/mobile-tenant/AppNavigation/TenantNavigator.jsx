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

export default function TenantNavigator({ onLogout }) {
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
      {(props) => <TenantHomePage {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
      <Stack.Screen name="AccommodationDetails" component={AccommodationDetails} options={{ animation: 'none' }} />
      <Stack.Screen name="RoomsList" component={RoomListScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
      <Stack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
      <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }} />
      <Stack.Screen name="Settings">
        {(props) => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}