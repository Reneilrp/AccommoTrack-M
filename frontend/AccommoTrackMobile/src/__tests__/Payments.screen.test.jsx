import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Payments from '../features/landlord/screens/Payments/Payments.jsx';
import PaymentService from '../services/PaymentService.js';

jest.setTimeout(20000);

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, [callback]);
  },
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
        border: '#e2e8f0',
        success: '#16a34a',
        error: '#ef4444',
        warning: '#f59e0b',
        card: '#ffffff',
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

jest.mock('../services/PaymentService.js', () => ({
  __esModule: true,
  default: {
    getInvoices: jest.fn(),
    getInvoiceSummary: jest.fn(),
    recordLandlordPayment: jest.fn(),
    updateBookingPayment: jest.fn(),
    refundTransaction: jest.fn(),
  },
}));

const baseInvoice = {
  id: 1,
  booking_id: 77,
  reference: 'INV-1001',
  status: 'pending',
  amount_cents: 10000,
  transactions: [],
  tenant: {
    first_name: 'Jane',
    last_name: 'Doe',
  },
  property: {
    title: 'Sample Property',
  },
  booking: {
    room: {
      room_number: 'A-101',
    },
  },
};

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

describe('Payments screen (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    PaymentService.getInvoices.mockResolvedValue({
      success: true,
      data: [baseInvoice],
    });

    PaymentService.getInvoiceSummary.mockResolvedValue({
      success: true,
      data: {
        range: 'month',
        totals: {
          total_paid_cents: 0,
          total_balance_cents: 10000,
          paid_count: 0,
          pending_count: 1,
          overdue_count: 0,
        },
      },
    });

    PaymentService.recordLandlordPayment.mockResolvedValue({
      success: true,
      data: {},
    });

    PaymentService.updateBookingPayment.mockResolvedValue({
      success: true,
      data: {},
    });

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('records full payment and auto-updates booking to paid', async () => {
    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1001');

    fireEvent.press(screen.getByText('Manage'));

    await screen.findByText('Manage Payment');

    fireEvent.press(screen.getByText('Record Payment'));

    await waitFor(() => {
      expect(PaymentService.recordLandlordPayment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          amount_cents: 10000,
          method: 'cash',
        }),
      );
    });

    await waitFor(() => {
      expect(PaymentService.updateBookingPayment).toHaveBeenCalledWith(77, {
        payment_status: 'paid',
      });
    });

    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Payment recorded successfully.');
  });

  it('blocks record payment when amount is invalid', async () => {
    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1001');

    fireEvent.press(screen.getByText('Manage'));

    await screen.findByText('Manage Payment');

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5000'), '');
    fireEvent.press(screen.getByText('Record Payment'));

    expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Please enter a valid amount.');
    expect(PaymentService.recordLandlordPayment).not.toHaveBeenCalled();
  });
});
