import React from 'react';
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
const mockShowAlert = jest.fn();

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

jest.mock('../contexts/UIStateContext.jsx', () => ({
  useUIState: () => ({
    uiState: { data: {} },
    updateData: jest.fn(),
    invalidateData: jest.fn(),
    showAlert: mockShowAlert,
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
    verifyCash: jest.fn(),
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

const pendingVerificationInvoice = {
  id: 2,
  booking_id: 88,
  reference: 'INV-1002',
  status: 'pending_verification',
  amount_cents: 15000,
  transactions: [],
  tenant: {
    first_name: 'John',
    last_name: 'Smith',
  },
  property: {
    title: 'Sample Property',
  },
  booking: {
    room: {
      room_number: 'B-202',
    },
  },
};

const overdueInvoice = {
  id: 3,
  booking_id: 99,
  reference: 'INV-OVERDUE',
  status: 'pending',
  due_date: '2000-01-01',
  amount_cents: 20000,
  transactions: [],
  tenant: {
    first_name: 'Over',
    last_name: 'Due',
  },
  property: {
    title: 'Target Property',
  },
  booking: {
    room: {
      room_number: 'C-303',
    },
  },
};

const upcomingInvoice = {
  id: 4,
  booking_id: 100,
  reference: 'INV-UPCOMING',
  status: 'pending',
  due_date: '2099-12-31',
  amount_cents: 20000,
  transactions: [],
  tenant: {
    first_name: 'Next',
    last_name: 'Due',
  },
  property: {
    title: 'Target Property',
  },
  booking: {
    room: {
      room_number: 'D-404',
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
    mockShowAlert.mockClear();

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

    PaymentService.verifyCash.mockResolvedValue({
      success: true,
      data: {},
    });

    PaymentService.updateBookingPayment.mockResolvedValue({
      success: true,
      data: {},
    });
  });

  it('records full payment and auto-updates booking to paid', async () => {
    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1001');

    fireEvent.press(screen.getByText('Manage'));

    await screen.findByText('Invoice Details');

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

    expect(mockShowAlert).toHaveBeenCalledWith('Success', 'Payment recorded successfully.');
  });

  it('blocks record payment when amount is invalid', async () => {
    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1001');

    fireEvent.press(screen.getByText('Manage'));

    await screen.findByText('Invoice Details');

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5000'), '');
    fireEvent.press(screen.getByText('Record Payment'));

    expect(mockShowAlert).toHaveBeenCalledWith('Validation', 'Please enter a valid amount.');
    expect(PaymentService.recordLandlordPayment).not.toHaveBeenCalled();
  });

  it('approves pending verification cash payment', async () => {
    PaymentService.getInvoices.mockResolvedValue({
      success: true,
      data: [pendingVerificationInvoice],
    });

    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1002');

    fireEvent.press(screen.getByText('Manage'));
    await screen.findByText('Invoice Details');

    fireEvent.press(screen.getByText('Approve Payment'));

    await waitFor(() => {
      expect(PaymentService.verifyCash).toHaveBeenCalledWith(2, { action: 'approve' });
    });

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Success',
        'Cash payment approved and invoice marked as paid.',
      );
    });
  });

  it('rejects pending verification cash payment', async () => {
    PaymentService.getInvoices.mockResolvedValue({
      success: true,
      data: [pendingVerificationInvoice],
    });

    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1002');

    fireEvent.press(screen.getByText('Manage'));
    await screen.findByText('Invoice Details');

    fireEvent.press(screen.getByText('Reject Payment'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Explain what is wrong so the tenant can correct it.'),
      '  Proof is unreadable  ',
    );

    const rejectButtons = screen.getAllByText('Reject Cash Payment');
    fireEvent.press(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() => {
      expect(PaymentService.verifyCash).toHaveBeenCalledWith(2, {
        action: 'reject',
        reason_code: 'unclear_image',
        reason: 'Proof is unreadable',
      });
    });

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Success',
        'Cash payment rejected. The tenant can resubmit correct proof.',
      );
    });
  });

  it('applies drilldown route params for overdue filter and search query', async () => {
    PaymentService.getInvoices.mockResolvedValue({
      success: true,
      data: [overdueInvoice, upcomingInvoice],
    });

    renderWithQueryClient(
      <Payments
        navigation={mockNavigation}
        route={{
          params: {
            filter: 'overdue',
            searchQuery: 'Target Property',
            drilldownToken: 12345,
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('INV-OVERDUE')).toBeTruthy();
      expect(screen.queryByText('INV-UPCOMING')).toBeNull();
    });

    expect(mockNavigation.setParams).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: undefined,
        searchQuery: undefined,
        drilldownToken: undefined,
      }),
    );
  });

  it('shows Cash Verify as an available status filter', async () => {
    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await screen.findByText('INV-1001');

    expect(screen.getAllByText(/Cash Verify/).length).toBeGreaterThan(0);
  });

  it('shows Cash Verify stats card with pending verification count', async () => {
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
          pending_verification_count: 2,
        },
      },
    });

    renderWithQueryClient(
      <Payments navigation={mockNavigation} route={{ params: {} }} />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Cash Verify/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });
});
