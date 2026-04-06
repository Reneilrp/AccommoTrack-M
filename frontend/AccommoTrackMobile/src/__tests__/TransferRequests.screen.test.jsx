import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TransferRequests from '../features/landlord/screens/Tenants/TransferRequests.jsx';
import PropertyService from '../services/PropertyService.js';

jest.setTimeout(20000);

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
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

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    getMyProperties: jest.fn(),
    getTransferRequests: jest.fn(),
    getTransferProration: jest.fn(),
    handleTransferRequest: jest.fn(),
  },
}));

const pendingRequest = {
  id: 10,
  status: 'pending',
  created_at: '2026-03-16T10:00:00.000Z',
  reason: 'Need a quieter room',
  tenant: {
    first_name: 'Jane',
    last_name: 'Doe',
  },
  current_room: {
    room_number: 'A-101',
  },
  requested_room: {
    room_number: 'B-202',
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

describe('TransferRequests screen (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    PropertyService.getMyProperties.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: 'Dorm One' }],
    });

    PropertyService.getTransferRequests.mockResolvedValue({
      success: true,
      data: [pendingRequest],
    });

    PropertyService.getTransferProration.mockResolvedValue({
      success: true,
      data: {
        remaining_days: 14,
        old_room_unused_value: 2500,
        suggested_adjustment: 150,
        quoted_transfer_fee: 300,
      },
    });

    PropertyService.handleTransferRequest.mockResolvedValue({
      success: true,
    });

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('blocks rejection when landlord note is empty', async () => {
    renderWithQueryClient(<TransferRequests navigation={mockNavigation} />);

    await screen.findByText('Jane Doe');

    fireEvent.press(screen.getByText('Reject'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please provide a reason before rejecting this request.',
      );
    });

    expect(PropertyService.handleTransferRequest).not.toHaveBeenCalled();
  });

  it('rejects transfer when landlord note is provided', async () => {
    renderWithQueryClient(<TransferRequests navigation={mockNavigation} />);

    await screen.findByText('Jane Doe');

    fireEvent.changeText(
      screen.getByPlaceholderText('Landlord Notes / Rejection Reason'),
      'Requested transfer is outside policy',
    );

    fireEvent.press(screen.getByText('Reject'));

    await waitFor(() => {
      expect(PropertyService.handleTransferRequest).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          action: 'reject',
          landlord_notes: 'Requested transfer is outside policy',
        }),
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Transfer request rejectd successfully');
  });

  it('approves transfer with proration fields and note payload', async () => {
    renderWithQueryClient(<TransferRequests navigation={mockNavigation} />);

    await screen.findByText('Jane Doe');

    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() => {
      expect(PropertyService.getTransferProration).toHaveBeenCalledWith(10);
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('Landlord Notes'),
      'Approved after inspection',
    );

    fireEvent.press(screen.getByText('Confirm Approval'));

    await waitFor(() => {
      expect(PropertyService.handleTransferRequest).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          action: 'approve',
          landlord_notes: 'Approved after inspection',
          transfer_fee: 300,
          prorated_adjustment: 150,
        }),
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Transfer request approved successfully');
  });

  it('blocks approval when damage charge has no description', async () => {
    renderWithQueryClient(<TransferRequests navigation={mockNavigation} />);

    await screen.findByText('Jane Doe');

    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() => {
      expect(PropertyService.getTransferProration).toHaveBeenCalledWith(10);
    });

    fireEvent.changeText(screen.getByPlaceholderText('Optional'), '250');

    fireEvent.press(screen.getByText('Confirm Approval'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Damage description is required when damage charge is set.',
      );
    });

    expect(PropertyService.handleTransferRequest).not.toHaveBeenCalled();
  });
});
