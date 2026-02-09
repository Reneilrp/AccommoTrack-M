import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../../contexts/ThemeContext';

import TenantHomePage from '../screens/TenantHomePage/ExploreScreen.jsx';
import MessagesPage from '../screens/Messages/MessagesPage.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';
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
import CreateRequest from '../screens/Maintenance/CreateRequest.jsx';
import AddonsScreen from '../screens/Addons/AddonsScreen.jsx';
import LeaveReview from '../screens/Reviews/LeaveReview.jsx';
import MyReviews from '../screens/Reviews/MyReviews.jsx';
import BookingDetails from '../screens/Menu/BookingDetails.jsx';

const RootStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function TenantMain({ onLogout, isGuest = false, onAuthRequired }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <MainStack.Navigator
        initialRouteName="TenantHome"
        screenOptions={{
          headerShown: false,
          animation: 'none',
          animationTypeForReplace: 'pop',
        }}
      >
        <MainStack.Screen name="TenantHome" options={{ animation: 'none' }}>
          {(props) => (
            <TenantHomePage 
              {...props} 
              onLogout={onLogout}
              isGuest={isGuest}
              onAuthRequired={onAuthRequired}
            />
          )}
        </MainStack.Screen>

        <MainStack.Screen name="AccommodationDetails" options={{ animation: 'none' }}>
          {(props) => (
            <AccommodationDetails 
              {...props}
              isGuest={isGuest}
            />
          )}
        </MainStack.Screen>

        <MainStack.Screen name="RoomsList" options={{ animation: 'none' }}>
          {(props) => (
            <RoomListScreen 
              {...props}
              isGuest={isGuest}
            />
          )}
        </MainStack.Screen>

        <MainStack.Screen name="RoomDetails" options={{ animation: 'none' }}>
          {(props) => (
            <RoomDetailsScreen 
              {...props}
              isGuest={isGuest}
              onAuthRequired={onAuthRequired}
            />
          )}
        </MainStack.Screen>

        {/* Settings - Available for both guests and authenticated users */}
        <MainStack.Screen name="Settings" options={{ animation: 'none' }}>
          {(props) => (
            <Settings 
              {...props} 
              onLogout={onLogout}
              isGuest={isGuest}
              onLoginPress={onAuthRequired}
            />
          )}
        </MainStack.Screen>

        {/* Demo UI - Available for all users */}
        <MainStack.Screen name="DemoUI" component={DemoUIScreen} options={{ animation: 'none' }} />

        {/* Protected Routes - Only for authenticated users */}
        {!isGuest && (
          <>
            <MainStack.Screen name="Dashboard" component={DashboardScreen} options={{ animation: 'none' }} />
            <MainStack.Screen name="Notifications" component={Notifications} options={{ animation: 'none' }} />
            <MainStack.Screen name="Profile" component={ProfilePage} options={{ animation: 'none' }} />
            <MainStack.Screen name="NotificationPreferences" component={NotificationPreferences} options={{ animation: 'none' }} />
            <MainStack.Screen name="UpdatePassword" component={UpdatePassword} options={{ animation: 'none' }} />
            <MainStack.Screen name="Messages" component={MessagesPage} options={{ animation: 'none' }} />
            <MainStack.Screen name="MyBookings" component={MyBookings} options={{ animation: 'none' }} />
            <MainStack.Screen name="Payments" component={WalletScreen} options={{ animation: 'none' }} />
            <MainStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ animation: 'none' }} />
            <MainStack.Screen name="PaymentDetail" component={PaymentDetail} options={{ animation: 'none' }} />
            <MainStack.Screen name="PaymentCardWebview" component={PaymentCardWebview} options={{ animation: 'none' }} />
            <MainStack.Screen name="PaymentRedirectWebview" component={PaymentRedirectWebview} options={{ animation: 'none' }} />
            <MainStack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }} />
            <MainStack.Screen name="CreateMaintenanceRequest" component={CreateRequest} options={{ animation: 'none' }} />
            <MainStack.Screen name="Addons" component={AddonsScreen} options={{ animation: 'none' }} />
            <MainStack.Screen name="BookingDetails" component={BookingDetails} options={{ animation: 'none' }} />
            <MainStack.Screen name="LeaveReview" component={LeaveReview} options={{ animation: 'none' }} />
            <MainStack.Screen name="MyReviews" component={MyReviews} options={{ animation: 'none' }} />
          </>
        )}
      </MainStack.Navigator>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.colors.surface }}>
        <BottomNavigation isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </SafeAreaView>
    </View>
  );
}

export default function TenantNavigator({ onLogout, isGuest = false, onAuthRequired }) {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="Main">
        {(props) => (
          <TenantMain {...props} onLogout={onLogout} isGuest={isGuest} onAuthRequired={onAuthRequired} />
        )}
      </RootStack.Screen>

      {/* Menu modal accessible from bottom nav */}
      <RootStack.Screen name="MenuModal" options={{ presentation: 'transparentModal', animation: 'none' }}>
        {(props) => (
          <TenantMenuModal
            {...props}
            isGuest={isGuest}
            onAuthRequired={onAuthRequired}
            onLogout={onLogout}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}