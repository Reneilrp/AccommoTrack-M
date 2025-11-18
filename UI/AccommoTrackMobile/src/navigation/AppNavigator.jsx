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
  const [showLanding, setShowLanding] = useState(false);

  const handleLogout = async () => {
    try {
      // Clear auth-related data only
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUserRole('guest'); // Return to guest mode instead of auth
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const checkAppState = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      // First launch - show landing pages
      if (!hasLaunched) {
        setShowLanding(true);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Check if user is authenticated
      if (token && userString) {
        const user = JSON.parse(userString);
        console.log('👤 User authenticated - Role:', user.role);
        setUserRole(user.role);
      } else {
        // Not authenticated - show guest mode
        console.log('👤 Guest mode activated');
        setUserRole('guest');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setUserRole('guest'); // Default to guest on error
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

  // First-launch flow - show landing pages
  if (showLanding) {
    console.log('🎬 Rendering Landing Pages (first launch)');
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
                setShowLanding(false);
                setUserRole('guest'); // Go directly to guest mode
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // Authenticated Landlord
  if (userRole === 'landlord') {
    console.log('🏠 Rendering LandlordNavigator');
    return <LandlordNavigator onLogout={handleLogout} />;
  }

  // Authenticated Tenant OR Guest Mode
  if (userRole === 'tenant' || userRole === 'guest') {
    console.log(`${userRole === 'guest' ? '👀' : '✅'} Rendering TenantNavigator (${userRole} mode)`);
    return (
      <TenantNavigator 
        onLogout={handleLogout}
        isGuest={userRole === 'guest'}
        onAuthRequired={() => setUserRole('auth')}
      />
    );
  }

  // Auth screen (when login is required)
  if (userRole === 'auth') {
    console.log('🔐 Rendering Auth screen');
    return (
      <AuthScreens
        onLoginSuccess={(role) => {
          setUserRole(role);
        }}
      />
    );
  }

  // Fallback to guest mode
  return (
    <TenantNavigator 
      onLogout={handleLogout}
      isGuest={true}
      onAuthRequired={() => setUserRole('auth')}
    />
  );
}