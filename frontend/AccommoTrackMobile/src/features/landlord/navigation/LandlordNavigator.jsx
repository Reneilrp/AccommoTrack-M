import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LandlordBottomNavigation from '../components/LandlordBottomNavigation.jsx';

// Import screens
import LandlordDashboard from '../screens/Dashboard/DashboardPage.jsx';
import RoomManagement from '../screens/Rooms/RoomManagement.jsx';
import Tenants from '../screens/Tenants/TenantManagement.jsx';
import ChatScreen from '../screens/Messages/ChatScreen.jsx';
import MyProperties from '../screens/Properties/MyProperties.jsx';
import Settings from '../screens/Settings/SettingsHub.jsx';
import Analytics from '../screens/Analytics/Analytics.jsx';
import MyProfile from '../screens/Settings/Account/MyProfile.jsx';
import HelpSupport from '../screens/Settings/Support/HelpSupport.jsx';
import About from '../screens/Settings/Support/About.jsx';
import DevTeam from '../screens/Settings/Support/DevTeam/DevTeam.jsx';
import AddProperty from '../screens/Properties/AddProperty.jsx';
import DormProfile from '../screens/Properties/DormProfile.jsx';
import DormProfileSettings from '../screens/Properties/DormProfileSettings.jsx';
import Notifications from '../screens/Notifications/Notifications.jsx';
import AllActivities from '../screens/Dashboard/AllActivities.jsx';
import AddonManagement from '../screens/Addons/AddonManagement.jsx';
import AddBooking from '../screens/Bookings/AddBooking.jsx';
import Payments from '../screens/Payments/Payments.jsx';
import VerificationStatus from '../screens/Settings/Account/VerificationStatus.jsx';
import PropertyActivityLogs from '../screens/Properties/PropertyActivityLogs.jsx';
import TenantLogs from '../screens/Tenants/TenantLogs.jsx';
import PropertyDetailsScreen from '../../tenant/screens/Explore/PropertyDetailsScreen.jsx';
import MaintenanceRequests from '../screens/Maintenance/MaintenanceRequests.jsx';
import Reviews from '../screens/Reviews/Reviews.jsx';
import Caretakers from '../screens/Settings/Account/Caretakers.jsx';
import UpdatePassword from '../../tenant/screens/Profile/UpdatePassword.jsx';
import PropertyPaymentSettings from '../screens/Settings/PropertyPaymentSettings.jsx';
import ManualPaymentSettings from '../screens/Settings/ManualPaymentSettings.jsx';

const Stack = createNativeStackNavigator();

// Main Stack Navigator
export default function LandlordNavigator({ onLogout }) {
  const [user, setUser] = React.useState(null);
  const [userRole, setUserRole] = React.useState('landlord');

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const parsedUser = JSON.parse(userString);
          setUser(parsedUser);
          setUserRole(parsedUser.role || 'landlord');
        }
      } catch (e) {}
    };
    checkRole();
  }, []);

  const isCaretaker = userRole === 'caretaker';
  const permissions = user?.caretaker_permissions || {};
  const hasPermission = React.useCallback(
    (key) => {
      if (!isCaretaker) return true;
      return Boolean(permissions?.[key] || permissions?.[`can_view_${key}`]);
    },
    [isCaretaker, permissions]
  );

  const canAccessRooms = hasPermission('rooms');
  const canAccessBookings = hasPermission('bookings');
  const canAccessTenants = hasPermission('tenants');
  const canAccessMessages = hasPermission('messages');

  const canAccessPropertyManagement = !isCaretaker || hasPermission('properties');
  const canAccessMyProperties = canAccessPropertyManagement;
  const canAccessAnalytics = !isCaretaker;
  const canAccessPayments = !isCaretaker;
  const canAccessReviews = !isCaretaker;
  const canAccessAddonManagement = !isCaretaker;
  const canAccessNotifications = !isCaretaker;
  const canAccessPropertyActivityLogs = !isCaretaker;
  const canAccessPropertyPaymentSettings = !isCaretaker;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        children={(props) => <LandlordBottomNavigation {...props} onLogout={onLogout} />}
      />
      
      {/* Additional Screens */}
      {canAccessMyProperties && (
        <Stack.Screen name="MyProperties" component={MyProperties} options={{ animation: 'none' }}/>
      )}
      <Stack.Screen name="DashboardPage" component={LandlordDashboard} options={{ animation: 'none' }}/>
      {canAccessTenants && (
        <Stack.Screen name="Tenants" component={Tenants} options={{ animation: 'none' }}/>
      )}
      {canAccessRooms && (
        <Stack.Screen name="RoomManagement" component={RoomManagement} options={{ animation: 'none' }}/>
      )}
      {canAccessAnalytics && (
        <Stack.Screen name="Analytics" component={Analytics} options={{ animation: 'none' }}/>
      )}
      <Stack.Screen name="MyProfile" component={MyProfile} options={{ animation: 'none' }}/>
      {canAccessPropertyManagement && (
        <Stack.Screen name="AddProperty" component={AddProperty} options={{ animation: 'none' }}/>
      )}
      {canAccessPropertyManagement && (
        <Stack.Screen name="DormProfile" component={DormProfile} options={{ animation: 'none' }}/>
      )}
      {canAccessPropertyManagement && (
        <Stack.Screen name="DormProfileSettings" component={DormProfileSettings} options={{ animation: 'none' }}/>
      )}
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} options={{ animation: 'none' }}/>
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ animation: 'none' }}/>
      <Stack.Screen name="About" component={About} options={{ animation: 'none' }}/>
      <Stack.Screen name="DevTeam" component={DevTeam} options={{ animation: 'none', headerShown: false }} />
      {canAccessNotifications && (
        <Stack.Screen name="Notifications" component={Notifications} options={{ animation: 'none' }} />
      )}
      <Stack.Screen name="AllActivities" component={AllActivities} options={{ animation: 'none' }} />
      {canAccessAddonManagement && (
        <Stack.Screen name="AddonManagement" component={AddonManagement} options={{ animation: 'none' }} />
      )}
      {canAccessBookings && (
        <Stack.Screen name="AddBooking" component={AddBooking} options={{ animation: 'none' }} />
      )}
      {canAccessPayments && (
        <Stack.Screen name="Payments" component={Payments} options={{ animation: 'none' }} />
      )}
      <Stack.Screen name="VerificationStatus" component={VerificationStatus} options={{ animation: 'none' }} />
      {canAccessPropertyActivityLogs && (
        <Stack.Screen name="PropertyActivityLogs" component={PropertyActivityLogs} options={{ animation: 'none' }} />
      )}
      {canAccessTenants && (
        <Stack.Screen name="TenantLogs" component={TenantLogs} options={{ animation: 'none' }} />
      )}
      {canAccessRooms && (
        <Stack.Screen name="MaintenanceRequests" component={MaintenanceRequests} options={{ animation: 'none' }} />
      )}
      {canAccessReviews && (
        <Stack.Screen name="Reviews" component={Reviews} options={{ animation: 'none' }} />
      )}
      <Stack.Screen name="UpdatePassword" component={UpdatePassword} options={{ animation: 'none' }} />
      {canAccessPropertyPaymentSettings && (
        <Stack.Screen name="PropertyPaymentSettings" component={PropertyPaymentSettings} options={{ animation: 'none' }} />
      )}
      {canAccessPropertyPaymentSettings && (
        <Stack.Screen name="ManualPaymentSettings" component={ManualPaymentSettings} options={{ animation: 'none' }} />
      )}
      {userRole === 'landlord' && (
        <Stack.Screen name="Caretakers" component={Caretakers} options={{ animation: 'none' }} />
      )}
      {canAccessMessages && (
        <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'none' }} />
      )}
      <Stack.Screen name="Settings">
        {(props) => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}