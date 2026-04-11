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

import Constants from 'expo-constants';
import ForceUpdateModal from './src/components/ForceUpdateModal.jsx';
import ThemedAlert from './src/components/ThemedAlert.jsx';
import api from './src/services/api.js';

function AppContent() {
  const { theme, isDarkMode, isLoading: isThemeLoading } = useTheme();
  const { isLoaded: isUIStateLoaded } = useUIState();
  const isAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const toastConfig = React.useMemo(() => getToastConfig(theme), [theme]);

  // Version checking state
  const [updateRequired, setUpdateRequired] = React.useState(false);
  const [downloadUrl, setDownloadUrl] = React.useState('');
  const [latestVersion, setLatestVersion] = React.useState('');

  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await api.get('/system/toggles');
        if (response?.data?.data) {
          const { mobile_latest_version, mobile_download_url, mobile_force_update } = response.data.data;
          
          if (!mobile_force_update) return;

          const currentVersion = Constants.expoConfig?.version || '1.0.0';
          
          // Simple semantic version check (e.g., "1.1.0" > "1.0.0")
          if (mobile_latest_version && mobile_latest_version !== currentVersion) {
            // A more robust semver check can be added, but a simple !== works if we strictly control versions
            const currentParts = currentVersion.split('.').map(Number);
            const latestParts = mobile_latest_version.split('.').map(Number);
            
            let isOutdated = false;
            for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
              const cur = currentParts[i] || 0;
              const lat = latestParts[i] || 0;
              if (lat > cur) { isOutdated = true; break; }
              if (lat < cur) { break; }
            }

            if (isOutdated) {
              setLatestVersion(mobile_latest_version);
              setDownloadUrl(mobile_download_url);
              setUpdateRequired(true);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to check app version:', error);
      }
    };
    
    checkVersion();
  }, []);

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
      <ForceUpdateModal 
        visible={updateRequired} 
        latestVersion={latestVersion} 
        downloadUrl={downloadUrl} 
      />
      <ThemedAlert />
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