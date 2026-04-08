import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Settings from '../features/tenant/screens/Settings/Settings.jsx';
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
    warning: '#f59e0b',
    error: '#ef4444',
    errorLight: '#fee2e2',
    successLight: '#dcfce7',
    successDark: '#166534',
    warningLight: '#fef3c7',
    warningDark: '#92400e',
    brand200: '#bfdbfe',
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDarkMode: false,
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('../components/Skeletons/index.jsx', () => ({
  ListItemSkeleton: () => null,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => <Text {...props}>{name}</Text>,
  };
});

jest.mock('../navigation/RootNavigation.js', () => ({
  navigate: jest.fn(),
  triggerForcedLogout: jest.fn(),
  triggerRoleSwitch: jest.fn(),
}));

jest.mock('../stores/auth/authStore.js', () => ({
  useAuthStore: (selector) => selector({
    clearAuthSession: mockClearAuthSession,
    setActiveRole: mockSetActiveRole,
  }),
}));

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    settingsBundle: () => ['tenant', 'settings', 'bundle'],
  },
  useTenantFocusRefetch: jest.fn(),
  useTenantRefreshHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../services/ProfileService.js', () => ({
  __esModule: true,
  default: {
    getProfile: jest.fn(),
    getVerificationStatus: jest.fn(),
    updateSettings: jest.fn(),
    switchRole: jest.fn(),
  },
}));

jest.mock('../utils/toast.js', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
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

describe('Tenant Settings role switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'user') {
        return JSON.stringify({
          id: 123,
          role: 'tenant',
          notification_preferences: {},
        });
      }

      return null;
    });
    AsyncStorage.setItem.mockResolvedValue();

    ProfileService.getProfile.mockResolvedValue({
      success: true,
      data: {
        notification_preferences: {
          pushNotifications: true,
          emailNotifications: true,
        },
      },
    });
  });

  it('switches approved tenant to landlord and persists role locally', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'approved',
      },
    });
    ProfileService.switchRole.mockResolvedValue({
      success: true,
      data: {
        role: 'landlord',
      },
    });

    renderWithClient(<Settings isGuest={false} />);

    await screen.findByText('Switch to Landlord');

    fireEvent.press(screen.getByText('Switch to Landlord'));
    await screen.findByText('Your landlord registration is approved. Switch to landlord mode now?');

    fireEvent.press(screen.getByText('Switch'));

    await waitFor(() => {
      expect(ProfileService.switchRole).toHaveBeenCalledWith('landlord', {});
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'user',
      expect.stringContaining('"role":"landlord"'),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_role_123', 'landlord');
    expect(triggerRoleSwitch).toHaveBeenCalledWith('landlord');
    expect(mockSetActiveRole).toHaveBeenCalledWith('landlord');
  });

  it('prevents tenant from switching while verification is pending', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'pending',
      },
    });

    renderWithClient(<Settings isGuest={false} />);

    await screen.findByText('Register as Landlord');

    fireEvent.press(screen.getByText('Register as Landlord'));

    await screen.findByText('Registration Pending');
    expect(ProfileService.switchRole).not.toHaveBeenCalled();
  });
});
