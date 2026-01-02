import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TenantHomePage from '../screens/TenantHomePage/HomePage.jsx';
import MessagesPage from '../screens/Messages/MessagesPage.jsx';
import AccommodationDetails from '../components/PropertyDetailsScreen.jsx';
import ProfilePage from '../screens/Profile/ProfilePage.jsx';
import MyBookings from '../screens/Menu/MyBookings.jsx';
import Payments from '../screens/Menu/Payments.jsx';
import Notifications from '../screens/Menu/Notifications.jsx';
import PaymentDetail from '../screens/Menu/PaymentDetail.jsx';
import PaymentCardWebview from '../screens/Menu/PaymentCardWebview.jsx';
import PaymentRedirectWebview from '../screens/Menu/PaymentRedirectWebview.jsx';
import PaymentHistory from '../screens/Menu/PaymentHistory.jsx';
import Settings from '../screens/Menu/Settings.jsx';
import HelpSupport from '../screens/Menu/HelpSupport.jsx';
import RoomListScreen from '../components/RoomListScreen.jsx';
import RoomDetailsScreen from '../components/RoomDetailsScreen.jsx';

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
          <Stack.Screen name="Notifications" component={Notifications} options={{ animation: 'none' }} />
          <Stack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
          <Stack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
          <Stack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
          <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
          <Stack.Screen name="PaymentHistory" component={PaymentHistory} options={{ animation: 'none' }} />
          <Stack.Screen name="PaymentDetail" component={PaymentDetail} options={{ animation: 'none' }} />
          <Stack.Screen name="PaymentCardWebview" component={PaymentCardWebview} options={{ animation: 'none' }} />
          <Stack.Screen name="PaymentRedirectWebview" component={PaymentRedirectWebview} options={{ animation: 'none' }} />
          <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }} />
        </>
      )}
    </Stack.Navigator>
  );
}