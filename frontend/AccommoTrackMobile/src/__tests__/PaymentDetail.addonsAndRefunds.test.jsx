import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import PaymentDetail from '../features/tenant/screens/Payments/PaymentDetail.jsx';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { invoiceId: 123 } }),
  useNavigation: () => mockNavigation,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

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
        backgroundSecondary: '#f1f5f9',
        border: '#e2e8f0',
        primaryLight: '#dcfce7',
      },
    },
  }),
}));

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    paymentDetail: (invoiceId) => ['tenant-payment-detail', invoiceId],
  },
  useTenantFocusRefetch: jest.fn(),
}));

jest.mock('../services/SystemToggleService.js', () => ({
  __esModule: true,
  default: {
    getDefaults: () => ({ tenantPaymentsDisabled: false }),
    getToggles: jest.fn().mockResolvedValue({ data: { tenantPaymentsDisabled: false } }),
  },
}));

jest.mock('../services/PaymentService.js', () => ({
  __esModule: true,
  default: {
    getPaymentDetails: jest.fn(),
    createPaymongoSource: jest.fn(),
    createOfflineRecord: jest.fn(),
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

describe('PaymentDetail add-on/refund regression (mobile)', () => {
  const PaymentService = jest.requireMock('../services/PaymentService.js').default;

  beforeEach(() => {
    jest.clearAllMocks();

    PaymentService.getPaymentDetails.mockResolvedValue({
      success: true,
      data: {
        id: 123,
        reference: 'INV-9001',
        status: 'partial',
        amount_cents: 100000,
        subtotal_cents: 100000,
        tax_cents: 0,
        total_cents: 100000,
        description: 'Monthly Rent',
        transactions: [
          { id: 1, status: 'paid', amount_cents: 50000 },
          {
            id: 2,
            status: 'partially_refunded',
            amount_cents: 40000,
            refunded_amount_cents: 10000,
          },
        ],
        metadata: {
          addons: [
            { addon_id: 10, addon_name: 'Wi-Fi', quantity: 1, price: 15000 },
          ],
        },
        property: {
          title: 'Sample Property',
          accepted_payments: ['cash'],
          allow_partial_payments: true,
          landlord: { payment_methods_settings: { allowed: ['cash'], details: {} } },
        },
        booking: {
          room: { room_number: 'A-1' },
          property: { title: 'Sample Property' },
          addons: [
            {
              id: 10,
              name: 'Wi-Fi',
              pivot: { id: 501, quantity: 1, price_at_booking_cents: 15000 },
            },
            {
              id: 20,
              name: 'Parking',
              pivot: { id: 502, quantity: 2, price_at_booking_cents: 20000 },
            },
          ],
        },
      },
    });
  });

  it('shows add-on line items and nets partially refunded amounts in remaining balance', async () => {
    renderWithQueryClient(<PaymentDetail />);

    await waitFor(() => {
      expect(PaymentService.getPaymentDetails).toHaveBeenCalledWith(123);
    });

    await waitFor(() => {
      expect(screen.getByText('Wi-Fi')).toBeTruthy();
      expect(screen.getByText('Parking x 2')).toBeTruthy();
    });

    expect(screen.getByText('Add-ons Total')).toBeTruthy();
    expect(screen.getByText('₱550')).toBeTruthy();

    expect(screen.getByText('Remaining Balance')).toBeTruthy();
    expect(screen.getByText('₱200')).toBeTruthy();
  });
});
