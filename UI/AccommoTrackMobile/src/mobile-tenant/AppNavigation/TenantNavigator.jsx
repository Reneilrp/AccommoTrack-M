import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TenantHomePage from '../src/TenantHomePage/HomePage.jsx';
import MessagesPage from '../src/Messages/MessagesPage.jsx';
import AccommodationDetails from '../src/components/AccommodationDetails.jsx';
import ProfilePage from '../src/Profile/ProfilePage.jsx';
import MyBookings from '../src/Menu/MyBookings.jsx';
import Favorites from '../src/Menu/Favorites.jsx';
import Payments from '../src/Menu/Payments.jsx';
import Settings from '../src/Menu/Settings.jsx';
import HelpSupport from '../src/Menu/HelpSupport.jsx';
import { styles } from '../../styles/AppNavigator.js';

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
      <Stack.Screen name="TenantHome" component={TenantHomePage } options={{ animation: 'none' }} />
      <Stack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
      <Stack.Screen name="AccommodationDetails" component={AccommodationDetails} options={{ animation: 'none' }} />
      <Stack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
      <Stack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
      <Stack.Screen name="Favorites" component={Favorites} options={{ animation: 'none' }} />
      <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
      <Stack.Screen name="Settings" component={Settings} options={{ animation: 'none' }} />
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }} />
      <Stack.Screen name="Settings">
        {(props) => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}