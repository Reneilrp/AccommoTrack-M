import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TenantHomePage from '../screens/TenantHomePage/ExploreScreen.jsx';
import MessagesPage from '../screens/Messages/MessagesPage.jsx';
import AccommodationDetails from '../components/PropertyDetailsScreen.jsx';
import ProfilePage from '../screens/Profile/ProfilePage.jsx';
import UpdatePassword from '../screens/Profile/UpdatePassword.jsx';
import NotificationPreferences from '../screens/Menu/NotificationPreferences.jsx';
import MyBookings from '../screens/Menu/MyBookings.jsx';
import WalletScreen from '../screens/Menu/WalletScreen.jsx';
import DashboardScreen from '../screens/Dashboard/DashboardScreen.jsx';
import DemoUIScreen from '../screens/Demo/DemoUIScreen.jsx';
import Notifications from '../screens/Menu/Notifications.jsx';
import TenantMenuModal from '../screens/TenantHomePage/TenantMenuModal.jsx';
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
      {/* Menu modal accessible from bottom nav */}
      <Stack.Screen name="MenuModal" options={{ presentation: 'transparentModal', animation: 'none' }}>
        {(props) => (
          <TenantMenuModal
            {...props}
            isGuest={isGuest}
            onAuthRequired={onAuthRequired}
            onLogout={onLogout}
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

      {/* Demo UI - Available for all users */}
      <Stack.Screen name="DemoUI" component={DemoUIScreen} options={{ animation: 'none' }} />

      {/* Protected Routes - Only for authenticated users */}
      {!isGuest && (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ animation: 'none' }} />
          <Stack.Screen name="Notifications" component={Notifications} options={{ animation: 'none' }} />
          <Stack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
          <Stack.Screen name="NotificationPreferences" component={NotificationPreferences} options={{ animation: 'none' }} />
          <Stack.Screen name="UpdatePassword" component={UpdatePassword} options={{ animation: 'none' }} />
          <Stack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
          <Stack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
          <Stack.Screen name="Payments" component={WalletScreen} options={{ animation: 'none' }} />
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