import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SettingsHub from '../features/landlord/screens/Settings/SettingsHub.jsx';
import ProfileService from '../services/ProfileService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerRoleSwitch } from '../navigation/RootNavigation.js';

const mockNavigation = {
  navigate: jest.fn(),
};

const mockSetActiveRole = jest.fn();
const mockClearAuthSession = jest.fn();

const mockTheme = {
  isDark: false,
  colors: {
    primary: '#16a34a',
    primaryDark: '#047857',
    primaryLight: '#d1fae5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
    background: '#f8fafc',
    backgroundSecondary: '#f1f5f9',
    backgroundTertiary: '#e2e8f0',
    surface: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    success: '#16a34a',
    successLight: '#dcfce7',
    successDark: '#166534',
    warningLight: '#fef3c7',
    warningDark: '#92400e',
    error: '#ef4444',
    errorLight: '#fee2e2',
    brand200: '#bfdbfe',
  },
};

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => <Text {...props}>{name}</Text>,
  };
});

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDarkMode: false,
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('../shared/hooks/useAppVersion.js', () => ({
  useAppVersion: () => ({
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    downloadUrl: '',
    updateAvailable: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../navigation/RootNavigation.js', () => ({
  triggerForcedLogout: jest.fn(),
  triggerRoleSwitch: jest.fn(),
}));

jest.mock('../stores/auth/authStore.js', () => ({
  useAuthStore: (selector) => selector({
    clearAuthSession: mockClearAuthSession,
    setActiveRole: mockSetActiveRole,
  }),
}));

jest.mock('../features/landlord/hooks/useLandlordQueryHelpers.js', () => ({
  landlordQueryKeys: {
    settingsHub: () => ['landlord', 'settings', 'hub'],
  },
  useLandlordFocusRefetch: jest.fn(),
  useLandlordRefreshHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../services/ProfileService.js', () => ({
  __esModule: true,
  default: {
    getProfile: jest.fn(),
    getVerificationStatus: jest.fn(),
    switchRole: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

const renderWithClient = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe('Landlord SettingsHub role switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'user') {
        return JSON.stringify({ id: 88, role: 'landlord' });
      }

      return null;
    });
    AsyncStorage.setItem.mockResolvedValue();

    ProfileService.getProfile.mockResolvedValue({
      success: true,
      data: {
        id: 88,
        role: 'landlord',
        first_name: 'Lara',
        last_name: 'Owner',
        email: 'lara@example.com',
        paymongo_child_id: null,
        paymongo_verification_status: 'pending',
        notification_preferences: {
          payments: true,
          messages: true,
          maintenance: false,
        },
      },
    });

    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'approved',
      },
    });

    ProfileService.switchRole.mockResolvedValue({
      success: true,
      data: {
        role: 'tenant',
      },
    });
  });

  it('switches landlord to tenant after confirmation and persists role', async () => {
    renderWithClient(<SettingsHub navigation={mockNavigation} />);

    await screen.findByText('Switch to Tenant');

    fireEvent.press(screen.getByText('Switch to Tenant'));

    await waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to switch your account to Tenant mode?'),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Switch'));
    });

    await waitFor(() => {
      expect(ProfileService.switchRole).toHaveBeenCalledWith('tenant');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'user',
      expect.stringContaining('"role":"tenant"'),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_role_88', 'tenant');
    expect(mockSetActiveRole).toHaveBeenCalledWith('tenant');
    expect(triggerRoleSwitch).toHaveBeenCalledWith('tenant');
  });
});
