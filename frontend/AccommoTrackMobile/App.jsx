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
import { useAppVersion } from './src/shared/hooks/useAppVersion.js';

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

import ForceUpdateModal from './src/components/ForceUpdateModal.jsx';
import ThemedAlert from './src/components/ThemedAlert.jsx';

function AppContent() {
  const { theme, isDarkMode, isLoading: isThemeLoading } = useTheme();
  const { isLoaded: isUIStateLoaded } = useUIState();
  const isAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const toastConfig = React.useMemo(() => getToastConfig(theme), [theme]);
  const {
    latestVersion,
    downloadUrl,
    updateAvailable,
    isForceUpdate,
    isLoading: isVersionLoading,
  } = useAppVersion();

  // Show startup update prompt at most once per app open.
  const [showStartupUpdateModal, setShowStartupUpdateModal] = React.useState(false);
  const [hasPromptedThisLaunch, setHasPromptedThisLaunch] = React.useState(false);

  // Safety timeout: force hydration after 2 seconds
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isAuthHydrated) {
        console.warn('[App] Forcing auth hydration after timeout');
        setHydrated(true);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isAuthHydrated, setHydrated]);

  React.useEffect(() => {
    if (isVersionLoading || hasPromptedThisLaunch) return;

    if (updateAvailable && downloadUrl) {
      setShowStartupUpdateModal(true);
    }

    setHasPromptedThisLaunch(true);
  }, [downloadUrl, hasPromptedThisLaunch, isVersionLoading, updateAvailable]);

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
        visible={showStartupUpdateModal} 
        latestVersion={latestVersion} 
        downloadUrl={downloadUrl} 
        required={isForceUpdate}
        onLater={() => setShowStartupUpdateModal(false)}
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