import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MyBookings from '../features/tenant/screens/Bookings/MyBookings.jsx';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUpdateData = jest.fn();
const mockInvalidateData = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#16a34a',
        primaryLight: '#dcfce7',
        text: '#0f172a',
        textSecondary: '#475569',
        textTertiary: '#94a3b8',
        textInverse: '#ffffff',
        surface: '#ffffff',
        background: '#f8fafc',
        backgroundSecondary: '#e2e8f0',
        backgroundTertiary: '#cbd5e1',
        border: '#e2e8f0',
        danger: '#dc2626',
        error: '#ef4444',
      },
    },
  }),
}));

jest.mock('../contexts/UIStateContext.jsx', () => ({
  useUIState: () => ({
    uiState: {
      bookings: { activeTab: 'current' },
      data: {},
    },
    updateData: mockUpdateData,
    invalidateData: mockInvalidateData,
  }),
}));

jest.mock('../components/Skeletons/index.jsx', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    BookingCardSkeleton: () => <Text>Loading...</Text>,
  };
});

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    myBookingsBundle: () => ['tenantMyBookingsBundle'],
  },
  useTenantFocusRefetch: jest.fn(),
  useTenantRefreshHandler: () => async () => {},
}));

jest.mock('../services/BookingService.js', () => ({
  __esModule: true,
  default: {
    getMyBookings: jest.fn(),
    cancelBooking: jest.fn(),
    requestMoveOut: jest.fn(),
  },
}));

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    getPublicProperty: jest.fn(),
  },
}));

jest.mock('../services/TenantService.js', () => ({
  __esModule: true,
  default: {
    getCurrentStay: jest.fn(),
    getHistory: jest.fn(),
    getTransferRequests: jest.fn(),
    getTransferOptions: jest.fn(),
    getTransferPreview: jest.fn(),
    requestTransfer: jest.fn(),
    requestExtension: jest.fn(),
    submitReview: jest.fn(),
    submitMaintenanceRequest: jest.fn(),
    submitReport: jest.fn(),
    requestAddon: jest.fn(),
    cancelTransferRequest: jest.fn(),
  },
}));

const BookingService = jest.requireMock('../services/BookingService.js').default;
const TenantService = jest.requireMock('../services/TenantService.js').default;

const buildIsoDate = (offsetDays) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

const buildStay = () => ({
  booking: {
    id: 321,
    startDate: buildIsoDate(-8),
    endDate: buildIsoDate(10),
    monthlyRent: 8000,
    unit_price: 8000,
    contract_mode: 'monthly',
    contractMode: 'monthly',
    billing_policy: 'monthly',
    reservation_policy: null,
    status: 'active',
    paymentStatus: 'paid',
    daysStayed: 8,
    daysRemaining: 10,
    hasReview: false,
    has_review: false,
    totalMonths: 1,
  },
  room: {
    id: 45,
    roomNumber: 'A-101',
    room_number: 'A-101',
    daily_rate: 320,
  },
  property: {
    id: 654,
    title: 'Dorm Prime',
    address: '123 Main Street',
    image: null,
  },
  landlord: {
    id: 99,
    name: 'Owner Prime',
  },
  addons: {
    active: [],
    pending: [],
    available: [],
    monthlyTotal: 0,
  },
});

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

describe('MyBookings transfer/extend submit flows (mobile)', () => {
  let mockStay;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStay = buildStay();

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    TenantService.getCurrentStay.mockResolvedValue({
      success: true,
      data: {
        stays: [mockStay],
        pendingCheckIns: [],
        upcomingBooking: null,
      },
    });

    BookingService.getMyBookings.mockResolvedValue({
      success: true,
      data: [],
    });

    TenantService.getHistory.mockResolvedValue({
      success: true,
      data: { bookings: [] },
    });

    TenantService.getTransferRequests.mockResolvedValue({
      success: true,
      data: [],
    });

    TenantService.getTransferOptions.mockResolvedValue({
      success: true,
      data: [
        {
          id: 900,
          room_number: 'B-202',
          type_label: 'Standard',
          monthly_rate: 9000,
        },
      ],
      message: 'Select your preferred room.',
    });

    TenantService.getTransferPreview.mockResolvedValue({
      success: true,
      data: {
        current_room_rate: 8000,
        new_room_rate: 9000,
        remaining_days: 10,
        old_room_unused_value: 2000,
        new_room_cost: 3000,
        transfer_fee: 100,
        credit_available: 1900,
        suggested_adjustment: 1100,
        has_payment_this_period: true,
      },
    });

    TenantService.requestExtension.mockResolvedValue({ success: true, data: {} });
    TenantService.requestTransfer.mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('submits extension request from Extend action', async () => {
    renderWithQueryClient(<MyBookings />);

    await screen.findByText('Extend');

    fireEvent.press(screen.getByText('Extend'));

    const extensionPrompt = Alert.alert.mock.calls.find((call) => call[0] === 'Request Extension');
    expect(extensionPrompt).toBeTruthy();

    const buttons = extensionPrompt[2] || [];
    const sevenDaysOption = buttons.find((button) => button.text === '7 Days');
    expect(sevenDaysOption).toBeTruthy();

    await act(async () => {
      await sevenDaysOption.onPress();
    });

    await waitFor(() => {
      expect(TenantService.requestExtension).toHaveBeenCalledTimes(1);
    });

    const expectedDate = new Date(mockStay.booking.endDate);
    expectedDate.setDate(expectedDate.getDate() + 7);

    expect(TenantService.requestExtension).toHaveBeenCalledWith(321, {
      extension_type: 'daily',
      requested_end_date: expectedDate.toISOString().split('T')[0],
    });
  });

  it('submits transfer request from transfer modal', async () => {
    renderWithQueryClient(<MyBookings />);

    await screen.findByText('Transfer');

    fireEvent.press(screen.getByText('Transfer'));

    await waitFor(() => {
      expect(TenantService.getTransferOptions).toHaveBeenCalledWith(321, 654);
    });

    await screen.findByText('Request Room Transfer');

    fireEvent.changeText(
      screen.getByPlaceholderText('Provide your reason'),
      'Need quieter room for work schedule.',
    );

    fireEvent.press(screen.getByText('Send Request'));

    await waitFor(() => {
      expect(TenantService.requestTransfer).toHaveBeenCalledWith({
        booking_id: 321,
        property_id: 654,
        requested_room_id: 900,
        reason: 'Need quieter room for work schedule.',
      });
    });
  });
});
