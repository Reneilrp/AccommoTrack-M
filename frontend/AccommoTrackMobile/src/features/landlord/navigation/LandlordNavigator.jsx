import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Stack = createNativeStackNavigator();

// Main Stack Navigator
export default function LandlordNavigator({ onLogout }) {
  const [userRole, setUserRole] = React.useState('landlord');

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          setUserRole(user.role || 'landlord');
        }
      } catch (e) {}
    };
    checkRole();
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        children={(props) => <LandlordBottomNavigation {...props} onLogout={onLogout} />}
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
      <Stack.Screen name="UpdatePassword" component={UpdatePassword} options={{ animation: 'none' }} />
      <Stack.Screen name="PropertyPaymentSettings" component={PropertyPaymentSettings} options={{ animation: 'none' }} />
      {userRole === 'landlord' && (
        <Stack.Screen name="Caretakers" component={Caretakers} options={{ animation: 'none' }} />
      )}
      <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Settings">
        {(props) => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}