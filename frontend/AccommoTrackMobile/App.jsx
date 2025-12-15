import React from 'react';
import { View, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator.jsx';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'white',
  },
};

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaProvider>
        <NavigationContainer theme={MyTheme}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}