import React from 'react';
import { View, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { navigationRef, notifyNavigationStateChange } from './src/navigation/RootNavigation.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator.jsx';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext.jsx';
import { UIStateProvider, useUIState } from './src/contexts/UIStateContext.jsx';
import { queryClient } from './src/config/queryClient.js';
import { useAuthStore } from './src/stores/auth/authStore.js';

import { getToastConfig } from './src/config/toastConfig.jsx';

const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'white',
  },
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#111827',
  },
};

function AppContent() {
  const { theme, isDarkMode, isLoading: isThemeLoading } = useTheme();
  const { isLoaded: isUIStateLoaded } = useUIState();
  const isAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const toastConfig = React.useMemo(() => getToastConfig(theme), [theme]);

  if (isThemeLoading || !isUIStateLoaded || !isAuthHydrated) {
    return null; // Or a splash screen component
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#111827" : "white"} 
      />
      <NavigationContainer
        ref={navigationRef}
        theme={isDarkMode ? MyDarkTheme : MyLightTheme}
        onStateChange={() => {
          const route = navigationRef.getCurrentRoute();
          notifyNavigationStateChange(route);
        }}
      >
        <AppNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UIStateProvider>
            <AppContent />
          </UIStateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}