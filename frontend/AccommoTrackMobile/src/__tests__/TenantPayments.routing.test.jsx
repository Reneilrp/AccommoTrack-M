import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PaymentsScreen from '../features/tenant/screens/Payments/PaymentsScreen.jsx';
import PaymentService from '../services/PaymentService.js';

jest.setTimeout(20000);

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#16a34a',
        text: '#0f172a',
        textSecondary: '#475569',
        textTertiary: '#94a3b8',
        textInverse: '#ffffff',
        surface: '#ffffff',
        background: '#f8fafc',
        border: '#e2e8f0',
        backgroundSecondary: '#f1f5f9',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

jest.mock('../components/Skeletons/index.jsx', () => ({
  ListItemSkeleton: () => null,
}));

jest.mock('../utils/toast.js', () => ({
  showError: jest.fn(),
}));

jest.mock('../services/SystemToggleService.js', () => ({
  __esModule: true,
  default: {
    getDefaults: () => ({ tenantPaymentsDisabled: false }),
    getToggles: jest.fn().mockResolvedValue({
      data: { tenantPaymentsDisabled: false },
    }),
  },
}));

jest.mock('../services/echo.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    paymentsCurrentUserId: () => ['tenantPaymentsCurrentUserId'],
    payments: (status) => ['tenantPayments', status],
    paymentStats: () => ['tenantPaymentStats'],
  },
  refetchTenantQueries: jest.fn().mockResolvedValue(undefined),
  useTenantFocusRefetch: jest.fn(),
  useTenantRefreshHandler: () => jest.fn(),
}));

jest.mock('../services/PaymentService.js', () => ({
  __esModule: true,
  default: {
    getPayments: jest.fn(),
    getStats: jest.fn(),
    createBookingInvoice: jest.fn(),
  },
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

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe('Tenant PaymentsScreen routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    PaymentService.getPayments.mockResolvedValue({
      success: true,
      data: {
        pages: [
          {
            items: [
              {
                id: null,
                booking_id: 321,
                description: 'April Rent',
                date: '2026-04-01T10:00:00.000Z',
                amount: 5000,
                status: 'pending',
              },
            ],
            pagination: { current_page: 1, last_page: 1 },
          },
        ],
      },
    });

    PaymentService.getStats.mockResolvedValue({
      success: true,
      data: {
        totalPaidThisMonth: 0,
        pendingAmount: 5000,
        nextDueDate: '2026-04-30',
      },
    });

    PaymentService.createBookingInvoice.mockResolvedValue({
      success: true,
      data: {
        id: 987,
      },
    });
  });

  it('resolves booking invoice and navigates to PaymentDetail when Pay is tapped', async () => {
    renderWithQueryClient(<PaymentsScreen />);

    await screen.findByText('April Rent');

    fireEvent.press(screen.getByText('Pay'));

    await waitFor(() => {
      expect(PaymentService.createBookingInvoice).toHaveBeenCalledWith(321);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { invoiceId: 987 });
    });
  });

  it('navigates directly to PaymentDetail when invoice id already exists', async () => {
    PaymentService.getPayments.mockResolvedValueOnce({
      success: true,
      data: {
        pages: [
          {
            items: [
              {
                id: 111,
                invoice_id: 555,
                booking_id: 321,
                description: 'May Rent',
                date: '2026-05-01T10:00:00.000Z',
                amount: 5000,
                status: 'pending',
              },
            ],
            pagination: { current_page: 1, last_page: 1 },
          },
        ],
      },
    });

    renderWithQueryClient(<PaymentsScreen />);

    await screen.findByText('May Rent');

    fireEvent.press(screen.getByText('Pay'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { invoiceId: 555 });
    });

    expect(PaymentService.createBookingInvoice).not.toHaveBeenCalled();
  });
});