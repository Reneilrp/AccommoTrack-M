import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingPages from '../core/LandingPages/LandingPages.jsx';
import AuthScreens from '../core/AuthScreen/Mobile-Auth.jsx';
import TenantHomePage from '../mobile-student/src/TenantHomePage/HomePage.jsx';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/AppNavigator.js';

const Stack = createNativeStackNavigator();

// Landlord Placeholder Component
function LandlordPlaceholder({ navigation }) {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              navigation.replace('Auth');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct" size={80} color="#7C3AED" style={{ marginBottom: 20 }} />
      <Text style={styles.placeholderTitle}>Landlord Dashboard</Text>
      <Text style={styles.placeholderText}>Coming Soon</Text>
      <Text style={styles.placeholderSubtext}>
        The landlord dashboard is under construction.{'\n'}
        Check back soon!
      </Text>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // Check if first launch
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      
      // Check if user is logged in
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      if (hasLaunched === null) {
        // First time launching - show landing pages
        setInitialRoute('Landing');
      } else if (token && userString) {
        // User is logged in - check their role
        const user = JSON.parse(userString);
        if (user.role === 'tenant') {
          setInitialRoute('TenantHome');
        } else if (user.role === 'landlord') {
          setInitialRoute('LandlordHome');
        } else {
          setInitialRoute('Auth');
        }
      } else {
        // Not first launch, not logged in - show auth
        setInitialRoute('Auth');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setInitialRoute('Auth');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Landing">
        {(props) => (
          <LandingPages 
            {...props}
            onFinish={async () => {
              await AsyncStorage.setItem('hasLaunched', 'true');
              props.navigation.replace('Auth');
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Auth" component={AuthScreens} />
      <Stack.Screen name="TenantHome" component={TenantHomePage} />
      <Stack.Screen name="LandlordHome" component={LandlordPlaceholder} />
    </Stack.Navigator>
  );
}

