import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

{/* Core */}
import LandingPages from '../core/LandingPages/LandingPages.jsx';
import AuthScreens from '../core/AuthScreen/Mobile-Auth.jsx';
import LandlordNavigator from '../mobile-landlord/src/AppNavigation/LandlordNavigator.jsx';
import TenantNavigator from '../mobile-tenant/AppNavigation/TenantNavigator.jsx';
import { styles } from '../styles/AppNavigator.js';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const handleLogout = async () => {
    try {
      // ✅ Only clear auth-related data, keep hasLaunched
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUserRole('auth'); // ✅ Go to auth screen, not landing
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const checkAppState = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        const user = JSON.parse(userString);
        console.log('👤 User role:', user.role);
        setUserRole(user.role);
      } else {
        // ✅ If logged out but app has launched before, set to 'auth'
        // If first launch, set to null to show landing pages
        setUserRole(hasLaunched ? 'auth' : null);
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAppState();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#07770B" />
      </View>
    );
  }

  // If user is logged in as tenant
  if (userRole === 'tenant') {
    console.log('✅ Rendering TenantNavigator');
    return <TenantNavigator onLogout={handleLogout} />;
  }

  // If user is logged in as landlord
  if (userRole === 'landlord') {
    console.log('✅ Rendering LandlordNavigator');
    return <LandlordNavigator onLogout={handleLogout} />;
  }

  // ✅ Returning user (logged out) - go straight to Auth
  if (userRole === 'auth') {
    console.log('✅ Rendering Auth screen (returning user)');
    return (
      <AuthScreens
        onLoginSuccess={(role) => {
          setUserRole(role);
        }}
      />
    );
  }

  // ✅ First-launch flow - show landing pages
  console.log('✅ Rendering Landing Pages (first launch)');
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationTypeForReplace: 'pop',
      }}
    >
      <Stack.Screen name="Landing">
        {(props) => (
          <LandingPages
            {...props}
            onFinish={async () => {
              await AsyncStorage.setItem('hasLaunched', 'true');
              setUserRole('auth'); // ✅ Trigger re-render to show auth
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}