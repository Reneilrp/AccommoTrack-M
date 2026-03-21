import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

/* Core */
import LandingPages from '../features/auth/screens/LandingPages.jsx';
import AuthScreens from '../features/auth/screens/AuthScreen.jsx';
import LandlordRegisterScreen from '../features/auth/screens/LandlordRegisterScreen.jsx';
import OtpVerificationScreen from '../features/auth/screens/OtpVerificationScreen.jsx';
import LandlordLayout from '../features/landlord/navigation/LandlordLayout.jsx';
import TenantLayout from '../features/tenant/navigation/TenantLayout.jsx';
import { getStyles } from '../styles/AppNavigator.js';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { setForcedLogoutCallback, setRoleSwitchCallback } from './RootNavigation.js';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); 
  const [authContext, setAuthContext] = useState(null);

  // Register handlers for navigation events
  useEffect(() => {
    setForcedLogoutCallback(async (isBlocked) => {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('user_id');
        await AsyncStorage.removeItem('isGuest');
      } catch (e) {}
      if (isBlocked) {
        Toast.show({
          type: 'error',
          text1: 'Account Blocked',
          text2: 'Your account has been blocked. Please contact support.',
          visibilityTime: 6000,
        });
      }
      setAuthContext('returning');
      setUserRole('auth');
    });

    setRoleSwitchCallback((newRole) => {
      console.log('🔄 Switching role to:', newRole);
      setUserRole(newRole);
    });

    return () => {
      setForcedLogoutCallback(null);
      setRoleSwitchCallback(null);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Remove auth-related data and guest flag, keep hasLaunched
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_id');
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
      // Prefer persisted user info to determine logged-in state
      const userString = await AsyncStorage.getItem('user');
      const isGuest = await AsyncStorage.getItem('isGuest');

      if (userString) {
        const user = JSON.parse(userString);
        console.log('👤 User role:', user.role);
        setAuthContext(null);
        setUserRole(user.role);
      } else if (isGuest === 'true') {
        // Persisted guest mode
        setAuthContext(null);
        setUserRole('guest');
      } else {
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If user is logged in as tenant or running as guest, render TenantNavigator
  if (userRole === 'tenant' || userRole === 'guest') {
    console.log(' Rendering TenantLayout (isGuest =', userRole === 'guest', ')');
    return (
      <TenantLayout
        onLogout={handleLogout}
        isGuest={userRole === 'guest'}
        onAuthRequired={handleAuthRequired}
      />
    );
  }

  // If user is logged in as landlord or caretaker
  if (userRole === 'landlord' || userRole === 'caretaker') {
    console.log(' Rendering LandlordLayout (role:', userRole, ')');
    return <LandlordLayout onLogout={handleLogout} />;
  }

  // Returning user (logged out) - go straight to Auth
  if (userRole === 'auth') {
    console.log(' Rendering Auth screen (returning user)');
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Auth">
          {(props) => (
            <AuthScreens
              {...props}
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
          )}
        </Stack.Screen>
        <Stack.Screen name="LandlordRegister" component={LandlordRegisterScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      </Stack.Navigator>
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