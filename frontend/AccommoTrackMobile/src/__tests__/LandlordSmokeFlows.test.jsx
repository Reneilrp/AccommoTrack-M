import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AddProperty from '../features/landlord/screens/Properties/AddProperty.jsx';
import Caretakers from '../features/landlord/screens/Settings/Account/Caretakers.jsx';
import ManualPaymentSettings from '../features/landlord/screens/Settings/ManualPaymentSettings.jsx';
import ProfileService from '../services/ProfileService.js';
import PropertyService from '../services/PropertyService.js';
import CaretakerService from '../services/CaretakerService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccess } from '../utils/toast.js';

const mockTheme = {
  isDark: false,
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
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
    brand100: '#dbeafe',
    brand200: '#bfdbfe',
    brand700: '#1d4ed8',
    brand900: '#1e3a8a',
  },
};

const mockHookNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};

const mockPropNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockHookNavigation,
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, [callback]);
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => <Text {...props}>{name}</Text>,
  };
});

jest.mock('react-native-webview', () => ({
  WebView: (props) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View testID="mock-webview" {...props} />;
  },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: {
    Images: 'images',
    Videos: 'videos',
  },
}));

jest.mock('../services/ProfileService.js', () => ({
  __esModule: true,
  default: {
    getVerificationStatus: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getValidIdTypes: jest.fn(),
    resubmitVerification: jest.fn(),
    registerAsLandlord: jest.fn(),
  },
}));

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    reverseGeocode: jest.fn(),
    createProperty: jest.fn(),
  },
}));

jest.mock('../services/CaretakerService.js', () => ({
  __esModule: true,
  default: {
    getCaretakers: jest.fn(),
    createCaretaker: jest.fn(),
    updateCaretaker: jest.fn(),
    deleteCaretaker: jest.fn(),
    resetPassword: jest.fn(),
  },
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

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

const caretakerFixture = {
  id: 9,
  caretaker: {
    id: 101,
    first_name: 'Cara',
    middle_name: '',
    last_name: 'Taker',
    email: 'cara@example.com',
    phone: '09123456789',
    date_of_birth: '1990-01-01',
  },
  permissions: {
    bookings: true,
    messages: false,
    tenants: true,
    rooms: false,
    properties: false,
  },
  assigned_properties: [{ id: 1, name: 'Dorm One' }],
  assigned_property_ids: [1],
};

describe('Landlord smoke flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    PropertyService.reverseGeocode.mockResolvedValue({ success: false });
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('AddProperty enforces verification and blocks online payment toggle when PayMongo is not verified', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'pending', user: { is_verified: false } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'pending' }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Account Verification Required');

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Sunrise Residences'),
      'Sunrise Residences',
    );

    const { Picker } = require('@react-native-picker/picker');
    const pickers = screen.UNSAFE_getAllByType(Picker);
    fireEvent(pickers[0], 'valueChange', 'dormitory');

    fireEvent.press(screen.getByText('Next Step'));

    fireEvent(
      screen.getByTestId('mock-webview'),
      'onMessage',
      {
        nativeEvent: {
          data: JSON.stringify({ type: 'location', lat: 6.921, lon: 122.079 }),
        },
      },
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., 123 Maria Clara St.'),
      '123 Maria Clara St.',
    );
    fireEvent.changeText(screen.getByPlaceholderText('City'), 'Zamboanga City');

    fireEvent.press(screen.getByText('Next Step'));

    await screen.findByText('Accepted Payment Methods');
    fireEvent.press(screen.getByText('Online (GCash, Maya, GrabPay)'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'PayMongo Not Verified',
        expect.stringContaining('complete PayMongo verification'),
        [{ text: 'OK' }],
      );
    });
  });

  it('AddProperty blocks final submission for unverified accounts', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'pending', user: { is_verified: false } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'pending' }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Account Verification Required');

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Sunrise Residences'),
      'Sunrise Residences',
    );

    const { Picker } = require('@react-native-picker/picker');
    const pickers = screen.UNSAFE_getAllByType(Picker);
    fireEvent(pickers[0], 'valueChange', 'dormitory');

    fireEvent.press(screen.getByText('Next Step'));

    fireEvent(
      screen.getByTestId('mock-webview'),
      'onMessage',
      {
        nativeEvent: {
          data: JSON.stringify({ type: 'location', lat: 6.921, lon: 122.079 }),
        },
      },
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., 123 Maria Clara St.'),
      '123 Maria Clara St.',
    );
    fireEvent.changeText(screen.getByPlaceholderText('City'), 'Zamboanga City');

    fireEvent.press(screen.getByText('Next Step'));
    fireEvent.press(screen.getByText('Next Step'));

    await screen.findByText('Submit Property');
    fireEvent.press(screen.getByText('Submit Property'));

    expect(PropertyService.createProperty).not.toHaveBeenCalled();
  });

  it('Caretaker create flow submits payload and refreshes list', async () => {
    CaretakerService.getCaretakers.mockResolvedValue({
      success: true,
      data: {
        caretakers: [],
        landlord_properties: [{ id: 1, name: 'Dorm One' }],
      },
    });
    CaretakerService.createCaretaker.mockResolvedValue({
      success: true,
      data: { temporary_password: 'Temp1234' },
    });

    renderWithQueryClient(<Caretakers />);

    await screen.findByText('No caretakers yet');
    fireEvent.press(screen.getByText('Add First Caretaker'));

    await screen.findByText('Add New Caretaker');

    fireEvent.changeText(screen.getByPlaceholderText('e.g. John'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Doe'), 'Doe');
    fireEvent.changeText(
      screen.getByPlaceholderText('caretaker@example.com'),
      'john@example.com',
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordFields[0], 'StrongPass1!');
    fireEvent.changeText(passwordFields[1], 'StrongPass1!');

    fireEvent.press(screen.getByText('Dorm One'));
    fireEvent.press(screen.getByText('Confirm & Add Caretaker'));

    await waitFor(() => {
      expect(CaretakerService.createCaretaker).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          property_ids: [1],
        }),
      );
    });

    expect(showSuccess).toHaveBeenCalled();
  });

  it('Caretaker edit flow updates assignment and revoke flow deletes assignment', async () => {
    CaretakerService.getCaretakers.mockResolvedValue({
      success: true,
      data: {
        caretakers: [caretakerFixture],
        landlord_properties: [{ id: 1, name: 'Dorm One' }],
      },
    });
    CaretakerService.updateCaretaker.mockResolvedValue({
      success: true,
      data: {},
    });
    CaretakerService.deleteCaretaker.mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithQueryClient(<Caretakers />);

    await screen.findByText('Cara Taker');

    fireEvent.press(screen.getByText('create-outline'));
    await screen.findByText('Edit Permissions');

    fireEvent.press(screen.getByText('Update Permissions'));

    await waitFor(() => {
      expect(CaretakerService.updateCaretaker).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          property_ids: [1],
        }),
      );
    });

    fireEvent.press(screen.getByText('trash-outline'));
    await screen.findByText('Revoke Access');

    fireEvent.changeText(
      screen.getByPlaceholderText('Reason for Revocation (e.g. End of contract)'),
      'Contract ended',
    );
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(CaretakerService.deleteCaretaker).toHaveBeenCalledWith(9);
    });

    expect(showSuccess).toHaveBeenCalled();
  });

  it('Manual payment settings save persists profile payment detail changes', async () => {
    ProfileService.getProfile.mockResolvedValue({
      success: true,
      data: {
        payment_methods_settings: {
          allowed: ['cash', 'online'],
          details: {
            gcash_info: 'old gcash',
            bank_info: 'old bank',
            other_info: 'old other',
          },
        },
      },
    });
    ProfileService.updateProfile.mockResolvedValue({ success: true, data: {} });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ id: 88, payment_methods_settings: {} }),
    );
    AsyncStorage.setItem.mockResolvedValue();

    renderWithQueryClient(
      <ManualPaymentSettings navigation={mockPropNavigation} />,
    );

    await screen.findByDisplayValue('old gcash');

    fireEvent.changeText(
      screen.getByDisplayValue('old gcash'),
      'Juan Dela Cruz - 09171234567',
    );
    fireEvent.changeText(
      screen.getByDisplayValue('old bank'),
      'BDO Juan Dela Cruz 123456789012',
    );
    fireEvent.changeText(
      screen.getByDisplayValue('old other'),
      'Pay at office from 9AM to 5PM',
    );

    fireEvent.press(screen.getByText('Save Payment Details'));

    await waitFor(() => {
      expect(ProfileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_methods_settings: {
            allowed: ['cash', 'online'],
            details: {
              gcash_info: 'Juan Dela Cruz - 09171234567',
              bank_info: 'BDO Juan Dela Cruz 123456789012',
              other_info: 'Pay at office from 9AM to 5PM',
            },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    expect(mockPropNavigation.goBack).toHaveBeenCalled();
  });
});
