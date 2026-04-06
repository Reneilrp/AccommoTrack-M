import React from 'react';
import { Text, View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../App.jsx';

jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);

  return {
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    initialWindowMetrics: {
      insets,
      frame,
    },
    SafeAreaProvider: ({ children }) => (
      <SafeAreaInsetsContext.Provider value={insets}>
        <SafeAreaFrameContext.Provider value={frame}>{children}</SafeAreaFrameContext.Provider>
      </SafeAreaInsetsContext.Provider>
    ),
    SafeAreaView: ({ children }) => <>{children}</>,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => <View {...props} />,
  };
});

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    VideoView: (props) => <View {...props} />,
    useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
  };
});

jest.mock('@react-native-community/netinfo', () => {
  const state = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {},
  };

  const mockNetInfo = {
    addEventListener: jest.fn(() => jest.fn()),
    configure: jest.fn(),
    fetch: jest.fn(async () => state),
    refresh: jest.fn(async () => state),
    useNetInfo: jest.fn(() => state),
  };

  return {
    __esModule: true,
    default: mockNetInfo,
    ...mockNetInfo,
  };
});

jest.mock('../contexts/ThemeContext.jsx', () => {
  const React = require('react');
  const theme = {
    isDark: false,
    colors: {
      primary: '#16a34a',
      info: '#3b82f6',
      infoDark: '#2563eb',
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
      textSecondary: '#4b5563',
      textTertiary: '#71717a',
      border: '#e5e7eb',
      brand200: '#a7f3d0',
      error: '#ef4444',
      textInverse: '#ffffff',
    },
  };

  return {
    ThemeProvider: ({ children }) => <>{children}</>,
    useTheme: () => ({
      theme,
      isDarkMode: false,
      toggleTheme: jest.fn(),
      setTheme: jest.fn(),
      isLoading: false,
    }),
  };
});

jest.mock('../contexts/UIStateContext.jsx', () => {
  const React = require('react');
  return {
    UIStateProvider: ({ children }) => <>{children}</>,
    useUIState: () => ({
      uiState: {},
      isLoaded: true,
      updateScreenState: jest.fn(),
      updateData: jest.fn(),
      invalidateData: jest.fn(),
      resetScreenState: jest.fn(),
    }),
  };
});

const mockAuthState = {
  hasHydrated: true,
  clearAuthSession: jest.fn(),
  setAuthSession: jest.fn(),
  setActiveRole: jest.fn(),
};

jest.mock('../stores/auth/authStore.js', () => ({
  useAuthStore: jest.fn((selector) => selector(mockAuthState)),
}));

jest.mock('react-native-toast-message', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Toast = () => <View testID="toast-root" />;
  Toast.show = jest.fn();
  Toast.hide = jest.fn();
  return Toast;
});

describe('Full app runtime smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'hasLaunched') return null;
      if (key === 'user') return null;
      if (key === 'isGuest') return null;
      if (key === 'token') return null;
      return null;
    });
  });

  it('boots app and renders first-launch flow without crashing', async () => {
    const screen = render(<App />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('hasLaunched');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user');
    });

    expect(screen.getByTestId('toast-root')).toBeTruthy();
  });
});
