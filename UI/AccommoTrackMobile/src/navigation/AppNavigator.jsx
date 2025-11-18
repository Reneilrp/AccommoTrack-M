import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

/* Core */
import LandingPages from '../core/LandingPages/LandingPages.jsx';
import AuthScreens from '../core/AuthScreen/Mobile-Auth.jsx';
import LandlordNavigator from '../mobile-landlord/src/AppNavigation/LandlordNavigator.jsx';
import TenantNavigator from '../mobile-tenant/AppNavigation/TenantNavigator.jsx';
import { styles } from '../styles/AppNavigator.js';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); 
  const [authContext, setAuthContext] = useState(null);

  const handleLogout = async () => {
    try {
      // Remove auth-related data and guest flag, keep hasLaunched
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isGuest');
      setAuthContext('returning');
      setUserRole('auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const enterGuestMode = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      await AsyncStorage.setItem('isGuest', 'true');
      setAuthContext(null);
      setUserRole('guest');
    } catch (error) {
      console.error('Error enabling guest mode:', error);
      setUserRole(null);
    }
  };

  const handleAuthRequired = () => {
    setAuthContext('guest');
    setUserRole('auth');
  };

  const handleLoginSuccess = async (role) => {
    try {
      await AsyncStorage.removeItem('isGuest');
    } catch (error) {
      console.error('Error updating guest flag after login:', error);
    }

    setAuthContext(null);
    setUserRole(role);
  };

  const checkAppState = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');
      const isGuest = await AsyncStorage.getItem('isGuest');

      if (token && userString) {
        const user = JSON.parse(userString);
        console.log('👤 User role:', user.role);
        setAuthContext(null);
        setUserRole(user.role);
      } else if (isGuest === 'true') {
        // Persisted guest mode
        setAuthContext(null);
        setUserRole('guest');
      } else {
        // If logged out but app has launched before, set to 'auth'
        // If first launch, set to null to show landing pages
        if (hasLaunched) {
          setAuthContext('returning');
          setUserRole('auth');
        } else {
          setAuthContext(null);
          setUserRole(null);
        }
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAuthContext(null);
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

  // If user is logged in as tenant or running as guest, render TenantNavigator
  if (userRole === 'tenant' || userRole === 'guest') {
    console.log(' Rendering TenantNavigator (isGuest =', userRole === 'guest', ')');
    return (
      <TenantNavigator
        onLogout={handleLogout}
        isGuest={userRole === 'guest'}
        onAuthRequired={handleAuthRequired}
      />
    );
  }

  // If user is logged in as landlord
  if (userRole === 'landlord') {
    console.log(' Rendering LandlordNavigator');
    return <LandlordNavigator onLogout={handleLogout} />;
  }

  // Returning user (logged out) - go straight to Auth
  if (userRole === 'auth') {
    console.log(' Rendering Auth screen (returning user)');
    return (
      <AuthScreens
        onLoginSuccess={handleLoginSuccess}
        onClose={
          authContext === 'guest'
            ? () => {
                setAuthContext(null);
                setUserRole('guest');
              }
            : undefined
        }
        onContinueAsGuest={
          authContext === 'returning'
            ? () => {
                enterGuestMode();
              }
            : undefined
        }
      />
    );
  }

  // First-launch flow - show landing pages
  console.log(' Rendering Landing Pages (first launch)');
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
            onFinish={enterGuestMode}
            onContinueAsGuest={enterGuestMode}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}