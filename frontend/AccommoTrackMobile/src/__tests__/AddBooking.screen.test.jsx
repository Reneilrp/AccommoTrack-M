import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AddBooking from '../features/landlord/screens/Bookings/AddBooking.jsx';
import PropertyService from '../services/PropertyService.js';
import BookingService from '../services/BookingService.js';
import { showError, showSuccess } from '../utils/toast.js';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

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
        background: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        error: '#ef4444',
      },
    },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, [callback]);
  },
}));

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

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('../styles/Landlord/AddBooking.js', () => ({
  getStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    getMyProperties: jest.fn(),
    getRooms: jest.fn(),
  },
}));

jest.mock('../services/BookingService.js', () => ({
  __esModule: true,
  default: {
    searchGuests: jest.fn(),
    createBooking: jest.fn(),
  },
}));

jest.mock('../utils/toast.js', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
  hideToast: jest.fn(),
}));

const singleBedRooms = [
  {
    id: 11,
    room_number: 'A-101',
    type_label: 'Bed Spacer',
    room_type: 'bedspacer',
    status: 'available',
    monthly_rate: 5500,
    available_slots: 1,
    capacity: 1,
    gender_restriction: 'mixed',
  },
];

const twoBedRooms = [
  {
    id: 12,
    room_number: 'A-102',
    type_label: 'Bed Spacer',
    room_type: 'bedspacer',
    status: 'available',
    monthly_rate: 5500,
    available_slots: 2,
    capacity: 2,
    gender_restriction: 'mixed',
  },
];

const renderScreen = () => {
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
    <QueryClientProvider client={queryClient}>
      <AddBooking navigation={mockNavigation} />
    </QueryClientProvider>,
  );
};

const waitForInitialLoad = async () => {
  await waitFor(() => {
    expect(PropertyService.getMyProperties).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(PropertyService.getRooms).toHaveBeenCalled();
  });
};

describe('AddBooking mobile smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    PropertyService.getMyProperties.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: 'Dorm One' }],
    });

    PropertyService.getRooms.mockResolvedValue({
      success: true,
      data: singleBedRooms,
    });

    BookingService.searchGuests.mockResolvedValue({
      success: true,
      data: [],
    });

    BookingService.createBooking.mockResolvedValue({
      success: true,
      data: { id: 9001 },
    });
  });

  it('shows toast when required fields are missing', async () => {
    renderScreen();
    await waitForInitialLoad();

    fireEvent.press(screen.getByTestId('add-booking-submit-button'));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Validation', 'Please fill in all required fields.');
    });

    expect(BookingService.createBooking).not.toHaveBeenCalled();
  });

  it('shows toast when check-out is not after check-in', async () => {
    renderScreen();
    await waitForInitialLoad();

    fireEvent.changeText(
      screen.getByPlaceholderText('Search existing tenant or enter new name'),
      'Walk-in Guest',
    );

    fireEvent.press(screen.getByTestId('add-booking-checkout-button'));

    const sameDayAtMidnight = new Date();
    sameDayAtMidnight.setHours(0, 0, 0, 0);
    fireEvent(
      screen.getByTestId('add-booking-checkout-picker'),
      'onChange',
      { type: 'set' },
      sameDayAtMidnight,
    );

    fireEvent.press(screen.getByTestId('add-booking-submit-button'));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Validation', 'Check-out date must be after check-in date.');
    });

    expect(BookingService.createBooking).not.toHaveBeenCalled();
  });

  it('shows static 1 Bed info and submits bed_count=1 when room capacity is 1', async () => {
    renderScreen();
    await waitForInitialLoad();

    expect(screen.getByTestId('add-booking-bed-count-static')).toBeTruthy();
    expect(screen.queryByTestId('add-booking-bed-count-picker')).toBeNull();

    fireEvent.changeText(
      screen.getByPlaceholderText('Search existing tenant or enter new name'),
      'Single Bed Guest',
    );

    fireEvent.press(screen.getByTestId('add-booking-submit-button'));

    await waitFor(() => {
      expect(BookingService.createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = BookingService.createBooking.mock.calls[0][0];
    expect(payload.bed_count).toBe(1);
    expect(showSuccess).toHaveBeenCalledWith('Success', 'Booking created successfully!');
  });

  it('shows bed dropdown for 2-bed room and submits selected bed_count', async () => {
    PropertyService.getRooms.mockResolvedValueOnce({
      success: true,
      data: twoBedRooms,
    });

    renderScreen();
    await waitForInitialLoad();

    expect(screen.getByTestId('add-booking-bed-count-picker')).toBeTruthy();

    fireEvent(screen.getByTestId('add-booking-bed-count-picker'), 'valueChange', 2);
    fireEvent.changeText(
      screen.getByPlaceholderText('Search existing tenant or enter new name'),
      'Two Bed Guest',
    );

    fireEvent.press(screen.getByTestId('add-booking-submit-button'));

    await waitFor(() => {
      expect(BookingService.createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = BookingService.createBooking.mock.calls[0][0];
    expect(payload.bed_count).toBe(2);
  });
});
