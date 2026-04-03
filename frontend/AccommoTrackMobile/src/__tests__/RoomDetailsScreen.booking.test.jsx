import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import RoomDetailsScreen from '../features/tenant/screens/Explore/RoomDetailsScreen.jsx';
import BookingService from '../services/BookingService.js';
import PropertyService from '../services/PropertyService.js';
import PaymentService from '../services/PaymentService.js';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => false),
  getParent: jest.fn(() => ({ setOptions: jest.fn() })),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#059669',
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

jest.mock('../styles/Tenant/RoomDetailsScreen.js', () => ({
  getStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../styles/Tenant/HomePage.js', () => ({}));

jest.mock('../navigation/RootNavigation.js', () => ({
  triggerForcedLogout: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../services/BookingService.js', () => ({
  __esModule: true,
  default: {
    createBooking: jest.fn(),
  },
}));

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    getRoomPaymentOptions: jest.fn(),
    getRoomPricing: jest.fn(),
    getPublicProperty: jest.fn(),
  },
}));

jest.mock('../services/PaymentService.js', () => ({
  __esModule: true,
  default: {
    generateCashInvoice: jest.fn(),
    createPaymentLink: jest.fn(),
  },
}));

const originalFormData = global.FormData;

class MockFormData {
  constructor() {
    this.fields = [];
  }

  append(key, value) {
    this.fields.push([key, value]);
  }
}

const room = {
  id: 11,
  room_number: 'B-201',
  status: 'available',
  is_available: true,
  available_slots: 2,
  capacity: 2,
  billing_policy: 'monthly',
  pricing_model: 'per_bed',
  monthly_rate: 7000,
  floor: 2,
  room_type: 'single',
  images: [],
  amenities: [],
  description: 'Test room',
};

const property = {
  id: 77,
  rules: [],
  reservation_fee: 0,
};

const waitForInitialQueries = async () => {
  await waitFor(() => {
    expect(PropertyService.getRoomPaymentOptions).toHaveBeenCalled();
    expect(PropertyService.getRoomPricing).toHaveBeenCalled();
  });
};

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
      <RoomDetailsScreen
        route={{ params: { room, property } }}
        isGuest={false}
        onAuthRequired={jest.fn()}
      />
    </QueryClientProvider>,
  );
};

describe('RoomDetailsScreen proxy booking', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.FormData = MockFormData;

    PropertyService.getRoomPaymentOptions.mockResolvedValue({
      success: true,
      data: {
        methods: ['cash'],
        is_paymongo_ready: false,
      },
    });

    PropertyService.getRoomPricing.mockResolvedValue({
      success: true,
      data: {
        total: 7000,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });

    BookingService.createBooking.mockResolvedValue({
      success: true,
      data: {
        booking: { booking_reference: 'BK-TEST-1' },
      },
    });

    PaymentService.generateCashInvoice.mockResolvedValue({ success: true });

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    global.FormData = originalFormData;
    Alert.alert.mockRestore();
  });

  it('blocks proxy submit when occupants are missing', async () => {
    renderScreen();
    await waitForInitialQueries();

    fireEvent.press(screen.getByText('Book This Room'));
    fireEvent.press(screen.getByText('Proxy'));
    fireEvent.press(screen.getByText('Submit Booking'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Information',
        'Proxy booking requires at least one occupant.',
      );
    });

    expect(BookingService.createBooking).not.toHaveBeenCalled();
  });

  it('submits booking_mode and occupant fields for valid proxy booking', async () => {
    renderScreen();
    await waitForInitialQueries();

    fireEvent.press(screen.getByText('Book This Room'));
    fireEvent.press(screen.getByText('Proxy'));

    fireEvent.changeText(screen.getByPlaceholderText('Full name*'), 'Jane Proxy');
    fireEvent.changeText(screen.getByPlaceholderText('Date of birth (YYYY-MM-DD)*'), '2011-06-01');
    fireEvent.changeText(screen.getByPlaceholderText('Gender (male/female/other/prefer_not_to_say)*'), 'female');
    fireEvent.changeText(screen.getByPlaceholderText('Relationship to booker*'), 'child');

    fireEvent.press(screen.getByText('Submit Booking'));

    await waitFor(() => {
      expect(BookingService.createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = BookingService.createBooking.mock.calls[0][0];
    expect(payload.fields).toEqual(
      expect.arrayContaining([
        ['booking_mode', 'proxy'],
        ['occupants[0][full_name]', 'Jane Proxy'],
        ['occupants[0][date_of_birth]', '2011-06-01'],
        ['occupants[0][gender]', 'female'],
        ['occupants[0][relationship_to_booker]', 'child'],
      ]),
    );
  });
});
