import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import AddonsScreen from '../features/tenant/screens/Addons/AddonsScreen.jsx';

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#16a34a',
        text: '#0f172a',
        textSecondary: '#475569',
        textTertiary: '#94a3b8',
        surface: '#ffffff',
        background: '#f8fafc',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { bookingId: 99, propertyId: 88 } }),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

jest.mock('../features/tenant/components/Header.jsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockHeader() {
    return <Text>Mock Header</Text>;
  };
});

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    addonsBundle: () => ['addons-bundle-smoke'],
  },
  useTenantFocusRefetch: jest.fn(),
}));

jest.mock('../services/TenantService.js', () => ({
  __esModule: true,
  default: {
    getAvailableAddons: jest.fn(),
    getAddonRequests: jest.fn(),
    requestAddon: jest.fn(),
    cancelAddonRequest: jest.fn(),
  },
}));

jest.mock('../utils/toast.js', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

const renderWithQueryClient = (ui) => {
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

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('AddonsScreen tenant request price smoke (mobile)', () => {
  const TenantService = jest.requireMock('../services/TenantService.js').default;

  beforeEach(() => {
    jest.clearAllMocks();

    TenantService.getAvailableAddons.mockResolvedValue({
      success: true,
      data: { available: [] },
    });

    TenantService.getAddonRequests.mockResolvedValue({
      success: true,
      data: {
        pending: [
          {
            id: 1,
            status: 'pending',
            quantity: 1,
            addon: {
              name: 'Air Purifier',
              price: 0,
            },
            pivot: {
              price_at_booking: 250,
            },
          },
        ],
        active: [],
      },
    });
  });

  it('renders request amount using pivot/effective price instead of addon base 0', async () => {
    renderWithQueryClient(<AddonsScreen hideHeader />);

    await screen.findByText('Your Requests');

    await waitFor(() => {
      expect(screen.getByText('Quantity: 1 • ₱250')).toBeTruthy();
    });

    expect(screen.queryByText('Quantity: 1 • ₱0')).toBeNull();
  });
});
